var GROUP_SIZE = 4;
var TIMEOUT_MS = 20000;

/* Public "Play online" queue. As soon as 4 players are waiting, they're
 * grouped into a room and started immediately. If fewer than 4 show up
 * within TIMEOUT_MS of the first person joining an empty queue, whoever's
 * there gets a room with the remaining seats bot-filled, so nobody waits
 * forever. Reuses the exact same Room/RoomManager a private "Play vs
 * friends" room uses — matchmaking only decides *who* ends up together and
 * *when* the room auto-starts, not how the room itself works.
 */
function MatchmakingQueue(roomManager, registry, io){
  this.roomManager = roomManager;
  this.registry = registry;
  this.io = io;
  this.waiting = []; // {clientId, name, socketId}
  this.timer = null;
}

MatchmakingQueue.prototype.join = function(clientId, name, socketId, avatar){
  this.leave(socketId); // guard against double-join from the same socket
  this.waiting.push({ clientId: clientId, name: name, socketId: socketId, avatar: avatar });
  if(this.waiting.length===1){
    var self = this;
    this.timer = setTimeout(function(){ self._popAndStart(true); }, TIMEOUT_MS);
  }
  if(this.waiting.length>=GROUP_SIZE){
    this._popAndStart(false);
  }
};

MatchmakingQueue.prototype.leave = function(socketId){
  var before = this.waiting.length;
  this.waiting = this.waiting.filter(function(e){ return e.socketId!==socketId; });
  if(this.waiting.length===0 && this.timer){
    clearTimeout(this.timer);
    this.timer = null;
  }
  return this.waiting.length!==before;
};

MatchmakingQueue.prototype._popAndStart = function(fillRestWithBots){
  if(this.timer){ clearTimeout(this.timer); this.timer = null; }
  if(this.waiting.length===0) return;
  var group = this.waiting.splice(0, GROUP_SIZE);
  var room = this.roomManager.createRoom();
  room.isMatchmade = true;
  var self = this;
  group.forEach(function(entry){
    var seat = room.addHuman(entry.clientId, entry.name, entry.socketId, entry.avatar);
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
    room.startGame(room.hostSeat);
    room.broadcastRoomUpdate();
    room.broadcastState();
    room.advanceBotsIfNeeded();
  }
};

module.exports = MatchmakingQueue;
