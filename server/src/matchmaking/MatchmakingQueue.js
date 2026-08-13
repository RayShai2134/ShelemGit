var WagerTiers = require('../../../shared/wagerTiers.js');

var GROUP_SIZE = 4;
var TIMEOUT_MS = 20000;

/* Public "Play online" queue. Players choose a wager tier before joining —
 * each tier runs its own independent queue, so a room only ever forms
 * between players who agreed to the same buy-in. As soon as 4 players are
 * waiting in a tier, they're grouped into a room and started immediately.
 * If fewer than 4 show up within TIMEOUT_MS of the first person joining an
 * empty tier queue, whoever's there gets a room with the remaining seats
 * bot-filled, so nobody waits forever. Reuses the exact same Room/RoomManager
 * a private "Play vs friends" room uses — matchmaking only decides *who*
 * ends up together and *when* the room auto-starts, not how the room itself
 * works.
 */
function MatchmakingQueue(roomManager, registry, io){
  this.roomManager = roomManager;
  this.registry = registry;
  this.io = io;
  this.waitingByTier = {}; // tier -> [{clientId, name, socketId, avatar, userId}]
  this.timers = {}; // tier -> timeout handle
}

MatchmakingQueue.prototype.join = function(clientId, name, socketId, avatar, userId, tier){
  if(WagerTiers.TIERS.indexOf(tier)===-1) throw new Error('Choose a buy-in to find a match.');
  this.leave(socketId); // guard against double-join from the same socket (any tier)
  var queue = this.waitingByTier[tier] || (this.waitingByTier[tier] = []);
  queue.push({ clientId: clientId, name: name, socketId: socketId, avatar: avatar, userId: userId });
  if(queue.length===1){
    var self = this;
    this.timers[tier] = setTimeout(function(){ self._popAndStart(tier, true); }, TIMEOUT_MS);
  }
  if(queue.length>=GROUP_SIZE){
    this._popAndStart(tier, false);
  }
};

MatchmakingQueue.prototype.leave = function(socketId){
  var self = this;
  var removedAny = false;
  Object.keys(this.waitingByTier).forEach(function(tier){
    var queue = self.waitingByTier[tier];
    var before = queue.length;
    self.waitingByTier[tier] = queue.filter(function(e){ return e.socketId!==socketId; });
    if(self.waitingByTier[tier].length!==before) removedAny = true;
    if(self.waitingByTier[tier].length===0 && self.timers[tier]){
      clearTimeout(self.timers[tier]);
      delete self.timers[tier];
    }
  });
  return removedAny;
};

MatchmakingQueue.prototype._popAndStart = function(tier, fillRestWithBots){
  if(this.timers[tier]){ clearTimeout(this.timers[tier]); delete this.timers[tier]; }
  var queue = this.waitingByTier[tier] || [];
  if(queue.length===0) return;
  var group = queue.splice(0, GROUP_SIZE);
  var room = this.roomManager.createRoom();
  room.isMatchmade = true;
  var self = this;
  group.forEach(function(entry){
    var seat = room.addHuman(entry.clientId, entry.name, entry.socketId, entry.avatar, entry.userId);
    self.registry.bind(entry.socketId, entry.clientId, entry.name, room.code, seat);
    var socket = self.io.sockets.sockets.get(entry.socketId);
    if(socket){
      socket.join(room.channel());
      socket.emit('roomJoined', { roomCode: room.code, seat: seat });
    }
  });
  if(fillRestWithBots && !room.isFull()){
    room.fillWithBots(room.hostSeat);
  }
  room.broadcastRoomUpdate();
  if(room.isFull()){
    room.startGame(room.hostSeat, undefined, tier).then(function(){
      room.broadcastRoomUpdate();
      room.broadcastState();
      room.advanceBotsIfNeeded();
    }).catch(function(e){
      console.error('[matchmaking] failed to start room', room.code, e.message);
      // Most likely someone's coin balance changed between queueing and the
      // match forming — surface it instead of leaving players stuck on
      // "Finding players..." with no explanation.
      self.io.to(room.channel()).emit('actionError', { message: e.message });
    });
  }
};

module.exports = MatchmakingQueue;
