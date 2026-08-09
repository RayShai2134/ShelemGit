var ShelemEngine = require('../../../shared/shelem-engine.js');
var buildStateForSeat = require('../net/stateSerializer.js');

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

Room.prototype.addHuman = function(clientId, name, socketId){
  var seatIdx = this.emptySeatIndex();
  if(seatIdx===-1) throw new Error('room is full');
  this.seats[seatIdx] = { type: 'human', clientId: clientId, name: name, socketId: socketId, connected: true };
  return seatIdx;
};

Room.prototype.markDisconnected = function(seat){
  if(this.seats[seat]) this.seats[seat].connected = false;
};

Room.prototype.fillWithBots = function(requestingSeat){
  if(this.roomPhase!==ROOM_PHASES.WAITING) throw new Error('game already started');
  if(requestingSeat!==this.hostSeat) throw new Error('only the host can fill with bots');
  for(var i=0;i<4;i++){
    if(!this.seats[i]){
      this.seats[i] = { type: 'bot', clientId: null, name: nextBotName(), socketId: null, connected: true };
    }
  }
};

var VALID_TARGET_SCORES = [250, 500, 750, 1000];

Room.prototype.startGame = function(requestingSeat, targetScore){
  if(this.roomPhase!==ROOM_PHASES.WAITING) throw new Error('game already started');
  if(requestingSeat!==this.hostSeat) throw new Error('only the host can start the game');
  if(!this.isFull()) throw new Error('room is not full yet');
  var isValidCustom = typeof targetScore==='number' && targetScore>=50 && targetScore<=100000 && targetScore%5===0;
  this.targetScore = (VALID_TARGET_SCORES.indexOf(targetScore)!==-1 || isValidCustom) ? targetScore : 500;
  var names = this.seats.map(function(s){ return s.name; });
  this.game = new ShelemEngine.ShelemGame(names, { targetScore: this.targetScore, direction: 1 });
  this.roomPhase = ROOM_PHASES.IN_PROGRESS;
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
    seats: this.seats.map(function(s){
      return s ? { name: s.name, type: s.type, connected: s.connected } : null;
    })
  };
};

Room.prototype.broadcastRoomUpdate = function(){
  this.io.to(this.channel()).emit('roomUpdate', this.roomUpdatePayload());
};

Room.prototype.broadcastState = function(){
  var self = this;
  if(!this.game) return;
  var players = this.seats.map(function(s){ return s ? s.name : ''; });
  this.seats.forEach(function(seat, idx){
    if(seat && seat.type==='human' && seat.connected){
      var payload = buildStateForSeat(self.game, idx);
      payload.players = players;
      self.io.to(seat.socketId).emit('state', payload);
    }
  });
};

module.exports = Room;
