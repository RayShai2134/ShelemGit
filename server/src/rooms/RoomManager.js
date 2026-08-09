var Room = require('./Room.js');

var CODE_CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // ambiguous chars (0/O, 1/I/L) excluded
var CODE_LENGTH = 4;

function RoomManager(io){
  this.io = io;
  this.rooms = new Map(); // code -> Room
}

RoomManager.prototype._generateCode = function(){
  var code;
  do{
    code = '';
    for(var i=0;i<CODE_LENGTH;i++){
      code += CODE_CHARSET[Math.floor(Math.random()*CODE_CHARSET.length)];
    }
  } while(this.rooms.has(code));
  return code;
};

RoomManager.prototype.createRoom = function(){
  var code = this._generateCode();
  var room = new Room(code, this.io);
  this.rooms.set(code, room);
  return room;
};

RoomManager.prototype.get = function(code){
  return this.rooms.get(code) || null;
};

RoomManager.prototype.removeIfEmpty = function(code){
  var room = this.rooms.get(code);
  if(room && room.isEmpty()){
    this.rooms.delete(code);
  }
};

module.exports = RoomManager;
