/* Thin Socket.io client wrapper. `io` is provided by the server at
 * /socket.io/socket.io.js — only available when served by server/src/index.js,
 * not under plain static hosting or file://. Online buttons are the only
 * things that touch this, so offline play is unaffected either way.
 */
var Network = (function(){
  var socket = null;
  var handlers = {};

  function on(event, cb){
    (handlers[event] = handlers[event] || []).push(cb);
  }
  function fire(event, payload){
    (handlers[event] || []).forEach(function(cb){ cb(payload); });
  }

  function connect(){
    if(socket) return socket;
    socket = io({ auth: { clientId: getClientId(), name: profile.name } });
    ['roomCreated','roomJoined','joinError','roomUpdate','state','actionError','connect','disconnect'].forEach(function(evt){
      socket.on(evt, function(payload){ fire(evt, payload); });
    });
    return socket;
  }

  function createRoom(){ connect(); socket.emit('createRoom', { name: profile.name }); }
  function joinRoom(code){ connect(); socket.emit('joinRoom', { roomCode: code, name: profile.name }); }
  function joinMatchmaking(){ connect(); socket.emit('joinMatchmaking', { name: profile.name }); }
  function leaveMatchmaking(){ socket && socket.emit('leaveMatchmaking'); }
  function startGame(targetScore){ socket && socket.emit('startGame', { targetScore: targetScore }); }
  function fillWithBots(){ socket && socket.emit('fillWithBots'); }
  function sendAction(action){ socket && socket.emit('action', action); }
  function leaveRoom(){ socket && socket.emit('leaveRoom'); }
  function disconnectSocket(){ if(socket){ socket.disconnect(); socket = null; } }

  return {
    on: on, connect: connect, createRoom: createRoom, joinRoom: joinRoom,
    joinMatchmaking: joinMatchmaking, leaveMatchmaking: leaveMatchmaking,
    startGame: startGame, fillWithBots: fillWithBots, sendAction: sendAction,
    leaveRoom: leaveRoom, disconnect: disconnectSocket
  };
})();
