var ShelemEngine = require('../../../shared/shelem-engine.js');
var WagerTiers = require('../../../shared/wagerTiers.js');
var buildStateForSeat = require('../net/stateSerializer.js');
var pool = require('../db/pool.js');

var ROOM_PHASES = { WAITING: 'waiting', IN_PROGRESS: 'in-progress', ENDED: 'ended' };
var BOT_NAMES = ['Bot Leila', 'Bot Kian', 'Bot Neda', 'Bot Arman'];
var botNameCursor = 0;
function nextBotName(){
  var n = BOT_NAMES[botNameCursor % BOT_NAMES.length];
  botNameCursor++;
  return n;
}

/* One private/public room: 4 seats, at most one ShelemGame in flight at a
 * time. Phase 1 scope: human seats only (no bot-fill yet — that's Phase 2),
 * no reconnect grace period (that's Phase 4) — a socket that disconnects just
 * marks its seat disconnected for now.
 */
function Room(code, io){
  this.code = code;
  this.io = io;
  this.roomPhase = ROOM_PHASES.WAITING;
  this.seats = [null, null, null, null]; // {type:'human', clientId, name, socketId, connected}
  this.hostSeat = 0;
  this.game = null;
  this.isMatchmade = false; // true for rooms formed by public matchmaking — no manual host controls
  this.statsRecorded = false; // guards against double-crediting stats if GAME_COMPLETE is observed more than once
}

Room.PHASES = ROOM_PHASES;

Room.prototype.channel = function(){ return 'room:' + this.code; };

Room.prototype.emptySeatIndex = function(){
  for(var i=0;i<4;i++){ if(!this.seats[i]) return i; }
  return -1;
};

Room.prototype.isFull = function(){
  return this.seats.every(function(s){ return !!s; });
};

Room.prototype.isEmpty = function(){
  return this.seats.every(function(s){ return !s; });
};

Room.prototype.addHuman = function(clientId, name, socketId, avatar, userId){
  var seatIdx = this.emptySeatIndex();
  if(seatIdx===-1) throw new Error('room is full');
  this.seats[seatIdx] = { type: 'human', clientId: clientId, name: name, socketId: socketId, connected: true, avatar: avatar || '🙂', userId: userId || null };
  return seatIdx;
};

/* Lets a player move to a different seat (and thus a different team, since
 * teams are fixed by seat parity) before the game starts — swaps with
 * whoever/whatever was in the target seat. Only meaningful pre-game.
 */
Room.prototype.chooseSeat = function(currentSeat, targetSeat){
  if(this.roomPhase!==ROOM_PHASES.WAITING) throw new Error('game already started');
  if(typeof targetSeat!=='number' || targetSeat<0 || targetSeat>3) throw new Error('invalid seat');
  if(targetSeat===currentSeat) return null;
  var mover = this.seats[currentSeat];
  var occupant = this.seats[targetSeat];
  this.seats[targetSeat] = mover;
  this.seats[currentSeat] = occupant;
  if(this.hostSeat===currentSeat) this.hostSeat = targetSeat;
  else if(this.hostSeat===targetSeat) this.hostSeat = currentSeat;
  return { movedFrom: currentSeat, movedTo: targetSeat, displaced: occupant };
};

Room.prototype.markDisconnected = function(seat){
  if(this.seats[seat]) this.seats[seat].connected = false;
};

Room.prototype.fillWithBots = function(requestingSeat){
  if(this.roomPhase!==ROOM_PHASES.WAITING) throw new Error('game already started');
  if(requestingSeat!==this.hostSeat) throw new Error('only the host can fill with bots');
  for(var i=0;i<4;i++){
    if(!this.seats[i]){
      this.seats[i] = { type: 'bot', clientId: null, name: nextBotName(), socketId: null, connected: true, avatar: '🤖' };
    }
  }
};

var VALID_TARGET_SCORES = [250, 500, 750, 1000];

/* Charges a flat entry fee to every human seat, atomically, and returns the
 * list of userIds actually charged (bots don't pay — the pot is only ever
 * as big as what the charged humans put in). Throws (and charges nobody) if
 * any human seat is a guest (no linked account) or can't afford it. */
Room.prototype._chargeEntryFee = async function(fee){
  var humanSeats = this.seats.filter(function(s){ return s && s.type==='human'; });
  var missingAccount = humanSeats.filter(function(s){ return !s.userId; })[0];
  if(missingAccount) throw new Error(missingAccount.name + ' must be signed in to play for coins.');

  var client = await pool.connect();
  try{
    await client.query('BEGIN');
    var userIds = humanSeats.map(function(s){ return s.userId; });
    var res = await client.query('SELECT id, coins FROM users WHERE id = ANY($1) FOR UPDATE', [userIds]);
    var byId = {};
    res.rows.forEach(function(r){ byId[r.id] = r; });
    var poorSeat = humanSeats.filter(function(s){ return !byId[s.userId] || byId[s.userId].coins < fee; })[0];
    if(poorSeat){
      throw new Error(poorSeat.name + ' doesn\'t have enough coins to play (' + fee + ' needed).');
    }
    await client.query('UPDATE users SET coins = coins - $1 WHERE id = ANY($2)', [fee, userIds]);
    await client.query('COMMIT');
    return userIds;
  }catch(e){
    await client.query('ROLLBACK').catch(function(){});
    throw e;
  }finally{
    client.release();
  }
};

/* Both private rooms (host-started) and public matchmaking (auto-started,
 * once the queue for a tier fills or times out) must supply one of the
 * fixed wager tiers — there's no free option, the whole point is to get
 * people buying coins. Matchmaking validates the tier again on join (each
 * queue is per-tier), so by the time this runs it's already trustworthy. */
Room.prototype.startGame = async function(requestingSeat, targetScore, entryFee){
  if(this.roomPhase!==ROOM_PHASES.WAITING) throw new Error('game already started');
  if(requestingSeat!==this.hostSeat) throw new Error('only the host can start the game');
  if(!this.isFull()) throw new Error('room is not full yet');
  var isValidCustom = typeof targetScore==='number' && targetScore>=50 && targetScore<=100000 && targetScore%5===0;
  this.targetScore = (VALID_TARGET_SCORES.indexOf(targetScore)!==-1 || isValidCustom) ? targetScore : 500;

  if(WagerTiers.TIERS.indexOf(entryFee)===-1) throw new Error('Choose a buy-in to start.');
  var fee = entryFee;
  var payingUserIds = await this._chargeEntryFee(fee);
  this.entryFee = fee;
  this.pot = fee * payingUserIds.length;
  this.payingUserIds = payingUserIds;
  this.potSettled = false;

  var names = this.seats.map(function(s){ return s.name; });
  this.game = new ShelemEngine.ShelemGame(names, { targetScore: this.targetScore, direction: 1 });
  this.roomPhase = ROOM_PHASES.IN_PROGRESS;
  this.statsRecorded = false;
};

/* Credits games_played/games_won for every human seat with a linked account,
 * once per completed game. Fire-and-forget — a DB hiccup here shouldn't take
 * the room down, just logs and moves on. */
Room.prototype.recordStatsIfComplete = function(){
  if(!this.game || this.game.phase!==ShelemEngine.PHASES.GAME_COMPLETE) return;
  if(this.statsRecorded) return;
  this.statsRecorded = true;
  var winningTeam = this.game.gameWinner;
  this.seats.forEach(function(seat, idx){
    if(!seat || seat.type!=='human' || !seat.userId) return;
    var won = ShelemEngine.teamOf(idx)===winningTeam;
    pool.query(
      'UPDATE users SET games_played=games_played+1, games_won=games_won+$1 WHERE id=$2',
      [won ? 1 : 0, seat.userId]
    ).catch(function(e){ console.error('[stats] failed to record for user', seat.userId, e.message); });
  });
};

/* Pays out the pot once a wagered game finishes: 95% split evenly among the
 * winning team's human seats, 5% kept as the house cut (never credited to
 * anyone). If the winning team has no paying humans (e.g. bots won), the pot
 * is simply not paid out — there's no one to pay. Fire-and-forget like stats. */
Room.prototype.payOutPotIfComplete = function(){
  var self = this;
  if(!this.game || this.game.phase!==ShelemEngine.PHASES.GAME_COMPLETE) return;
  if(this.potSettled) return;
  this.potSettled = true;
  if(!this.pot || this.pot<=0) return;
  var winningTeam = this.game.gameWinner;
  var winningUserIds = [];
  this.seats.forEach(function(seat, idx){
    if(seat && seat.type==='human' && seat.userId && ShelemEngine.teamOf(idx)===winningTeam){
      winningUserIds.push(seat.userId);
    }
  });
  if(winningUserIds.length===0) return;
  var totalPayout = Math.floor(this.pot * WagerTiers.POT_SHARE);
  var share = Math.floor(totalPayout / winningUserIds.length);
  if(share<=0) return;
  pool.query('UPDATE users SET coins = coins + $1 WHERE id = ANY($2)', [share, winningUserIds])
    .catch(function(e){ console.error('[wager] payout failed for room', self.code, e.message); });
};

/* If it's currently a bot seat's turn, plays that bot's move after a short
 * delay (mirrors the offline client's pacing) and chains into the next turn
 * — so a run of consecutive bot seats all play out automatically.
 */
Room.prototype.advanceBotsIfNeeded = function(){
  var self = this;
  if(!this.game) return;
  var PHASES = ShelemEngine.PHASES;
  var phase = this.game.phase;
  var actingSeat = null;
  if(phase===PHASES.BIDDING) actingSeat = this.game.seatToBid;
  else if(phase===PHASES.DISCARDING) actingSeat = this.game.declarer;
  else if(phase===PHASES.PLAYING) actingSeat = this.game.seatToPlay;
  else return;

  var seat = this.seats[actingSeat];
  if(!seat || seat.type!=='bot') return;

  setTimeout(function(){
    if(!self.game || self.game.phase!==phase) return; // room may have moved on (e.g. hand reshuffled)
    try{
      if(phase===PHASES.BIDDING){
        var decision = ShelemEngine.botDecideBid(self.game, actingSeat);
        if(decision.action==='bid') self.game.bid(actingSeat, decision.amount);
        else self.game.pass(actingSeat);
      } else if(phase===PHASES.DISCARDING){
        var toDiscard = ShelemEngine.botChooseDiscard(self.game.hands[actingSeat]);
        self.game.discard(actingSeat, toDiscard);
      } else if(phase===PHASES.PLAYING){
        var card = ShelemEngine.botChoosePlay(self.game, actingSeat);
        self.game.playCard(actingSeat, card);
      }
      self.broadcastState();
      self.advanceBotsIfNeeded();
    }catch(e){
      console.error('[bot] error advancing seat', actingSeat, ':', e.message);
    }
  }, 650);
};

Room.prototype.applyAction = function(seat, action){
  if(!this.game) throw new Error('game has not started');
  switch(action.type){
    case 'bid': this.game.bid(seat, action.amount); break;
    case 'pass': this.game.pass(seat); break;
    case 'discard': this.game.discard(seat, action.cards); break;
    case 'playCard': this.game.playCard(seat, action.card); break;
    case 'nextHand': this.game.startNextHand(); break;
    case 'newGame':
      this.game = new ShelemEngine.ShelemGame(this.seats.map(function(s){ return s.name; }), { targetScore: this.targetScore || 500, direction: 1 });
      this.statsRecorded = false;
      // Rematches don't re-run the buy-in flow, so they're free — leaving the
      // old entryFee/pot in place would either double-pay the prior winners
      // or charge nobody for a game the server still thinks is wagered.
      this.entryFee = 0;
      this.pot = 0;
      this.payingUserIds = [];
      this.potSettled = false;
      break;
    default: throw new Error('unknown action type: ' + action.type);
  }
};

Room.prototype.roomUpdatePayload = function(){
  return {
    roomCode: this.code,
    roomPhase: this.roomPhase,
    hostSeat: this.hostSeat,
    matchmaking: this.isMatchmade,
    entryFee: this.entryFee || 0,
    pot: this.pot || 0,
    seats: this.seats.map(function(s){
      return s ? { name: s.name, type: s.type, connected: s.connected, avatar: s.avatar } : null;
    })
  };
};

Room.prototype.broadcastRoomUpdate = function(){
  this.io.to(this.channel()).emit('roomUpdate', this.roomUpdatePayload());
};

Room.prototype.broadcastState = function(){
  var self = this;
  if(!this.game) return;
  this.recordStatsIfComplete();
  this.payOutPotIfComplete();
  var players = this.seats.map(function(s){ return s ? s.name : ''; });
  var avatars = this.seats.map(function(s){ return s ? (s.avatar || '🤖') : ''; });
  this.seats.forEach(function(seat, idx){
    if(seat && seat.type==='human' && seat.connected){
      var payload = buildStateForSeat(self.game, idx);
      payload.players = players;
      payload.avatars = avatars;
      self.io.to(seat.socketId).emit('state', payload);
    }
  });
};

/* Ephemeral in-room chat — broadcast only, never persisted (the room and
 * its history disappear once the game ends, same as the rest of room state).
 * Available for the whole match, not just the result screens. */
Room.prototype.broadcastChat = function(seat, body){
  var s = this.seats[seat];
  if(!s) return;
  this.io.to(this.channel()).emit('roomChat', {
    seat: seat, name: s.name, avatar: s.avatar || '🤖', body: body, at: Date.now()
  });
};

module.exports = Room;
