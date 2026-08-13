var express = require('express');
var http = require('http');
var path = require('path');
var { Server } = require('socket.io');

var RoomManager = require('./rooms/RoomManager.js');
var ClientRegistry = require('./identity/ClientRegistry.js');
var Room = require('./rooms/Room.js');
var MatchmakingQueue = require('./matchmaking/MatchmakingQueue.js');
var authRoutes = require('./auth/authRoutes.js');
var friendsRoutes = require('./friends/friendsRoutes.js');
var messagesRoutes = require('./messages/messagesRoutes.js');
var paymentsRoutes = require('./payments/paymentsRoutes.js');
var webhookRoute = require('./payments/webhookRoute.js');
var authMiddleware = require('./auth/authMiddleware.js');
var presence = require('./presence/OnlinePresence.js');
var pool = require('./db/pool.js');

var app = express();
var server = http.createServer(app);
var io = new Server(server, { cors: { origin: '*' } });

// Mounted before express.json() — Stripe needs the raw body to verify signatures.
app.use('/api/stripe/webhook', webhookRoute);

app.use(express.json());
app.use('/api', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api', paymentsRoutes);

var CLIENT_DIR = path.join(__dirname, '..', '..', 'client');
var SHARED_DIR = path.join(__dirname, '..', '..', 'shared');
app.use('/shared', express.static(SHARED_DIR));
app.use('/', express.static(CLIENT_DIR));

var roomManager = new RoomManager(io);
var registry = new ClientRegistry();
var matchmakingQueue = new MatchmakingQueue(roomManager, registry, io);

io.on('connection', function(socket){
  var auth = socket.handshake.auth || {};
  var clientId = auth.clientId || socket.id;
  var defaultName = (auth.name || 'Player').toString().slice(0, 24);
  var defaultAvatar = (auth.avatar || '🙂').toString().slice(0, 8);
  var presenceUserId = authMiddleware.verifyToken(auth.token);
  if(presenceUserId){
    presence.markOnline(presenceUserId);
    socket.join('user:' + presenceUserId); // lets us target all of this account's connections (multi-tab/device) by userId
  }

  function nameFrom(payload){
    var n = (payload && payload.name) ? payload.name.toString().trim().slice(0, 24) : '';
    return n.length>0 ? n : defaultName;
  }
  function avatarFrom(payload){
    var a = (payload && payload.avatar) ? payload.avatar.toString().slice(0, 8) : '';
    return a.length>0 ? a : defaultAvatar;
  }

  socket.on('createRoom', function(payload){
    var name = nameFrom(payload);
    var room = roomManager.createRoom();
    var seat = room.addHuman(clientId, name, socket.id, avatarFrom(payload), presenceUserId);
    registry.bind(socket.id, clientId, name, room.code, seat);
    socket.join(room.channel());
    socket.emit('roomCreated', { roomCode: room.code, seat: seat });
    room.broadcastRoomUpdate();
  });

  socket.on('joinRoom', function(payload){
    var name = nameFrom(payload);
    var code = ((payload && payload.roomCode) || '').toString().toUpperCase();
    var room = roomManager.get(code);
    if(!room){ socket.emit('joinError', { message: 'Room not found.' }); return; }
    if(room.roomPhase!==Room.PHASES.WAITING){ socket.emit('joinError', { message: 'That game has already started.' }); return; }
    var seat;
    try{ seat = room.addHuman(clientId, name, socket.id, avatarFrom(payload), presenceUserId); }
    catch(e){ socket.emit('joinError', { message: e.message }); return; }
    registry.bind(socket.id, clientId, name, room.code, seat);
    socket.join(room.channel());
    socket.emit('roomJoined', { roomCode: room.code, seat: seat });
    room.broadcastRoomUpdate();
  });

  socket.on('joinMatchmaking', function(payload){
    if(!presenceUserId){ socket.emit('joinError', { message: 'Sign in to play for coins.' }); return; }
    try{
      matchmakingQueue.join(clientId, nameFrom(payload), socket.id, avatarFrom(payload), presenceUserId, payload && payload.tier);
    }catch(e){
      socket.emit('joinError', { message: e.message });
    }
  });

  socket.on('sendRoomChat', function(payload){
    var entry = registry.get(socket.id);
    if(!entry) return;
    var room = roomManager.get(entry.roomCode);
    if(!room) return;
    var body = ((payload && payload.body) || '').toString().trim().slice(0, 300);
    if(body.length===0) return;
    room.broadcastChat(entry.seat, body);
  });

  socket.on('sendDirectMessage', async function(payload){
    if(!presenceUserId){ socket.emit('actionError', { message: 'Sign in to message friends.' }); return; }
    var toUserId = payload && payload.toUserId;
    var body = ((payload && payload.body) || '').toString().trim().slice(0, 500);
    if(!toUserId || body.length===0) return;
    try{
      var friendCheck = await pool.query(
        "SELECT 1 FROM friendships WHERE status='accepted' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))",
        [presenceUserId, toUserId]
      );
      if(friendCheck.rows.length===0){ socket.emit('actionError', { message: 'You are not friends with this user.' }); return; }
      var insertResult = await pool.query(
        'INSERT INTO messages (sender_id, recipient_id, body) VALUES ($1,$2,$3) RETURNING id, created_at',
        [presenceUserId, toUserId, body]
      );
      var msg = { id: insertResult.rows[0].id, senderId: presenceUserId, recipientId: toUserId, body: body, at: insertResult.rows[0].created_at };
      io.to('user:' + presenceUserId).to('user:' + toUserId).emit('directMessage', msg);
    }catch(e){
      console.error('[messages] send error', e);
      socket.emit('actionError', { message: 'Could not send message.' });
    }
  });

  socket.on('chooseSeat', function(payload){
    var entry = registry.get(socket.id);
    if(!entry) return;
    var room = roomManager.get(entry.roomCode);
    if(!room) return;
    try{
      var result = room.chooseSeat(entry.seat, payload && payload.targetSeat);
      if(result){
        registry.bind(socket.id, entry.clientId, entry.name, room.code, result.movedTo);
        socket.emit('seatChanged', { seat: result.movedTo });
        if(result.displaced && result.displaced.type==='human' && result.displaced.socketId){
          var displacedEntry = registry.get(result.displaced.socketId);
          if(displacedEntry){
            registry.bind(result.displaced.socketId, displacedEntry.clientId, displacedEntry.name, room.code, result.movedFrom);
          }
          var displacedSocket = io.sockets.sockets.get(result.displaced.socketId);
          if(displacedSocket) displacedSocket.emit('seatChanged', { seat: result.movedFrom });
        }
        room.broadcastRoomUpdate();
      }
    }catch(e){
      socket.emit('actionError', { message: e.message });
    }
  });

  socket.on('leaveMatchmaking', function(){
    matchmakingQueue.leave(socket.id);
  });

  socket.on('fillWithBots', function(){
    var entry = registry.get(socket.id);
    if(!entry) return;
    var room = roomManager.get(entry.roomCode);
    if(!room) return;
    try{
      room.fillWithBots(entry.seat);
      room.broadcastRoomUpdate();
    }catch(e){
      socket.emit('actionError', { message: e.message });
    }
  });

  socket.on('startGame', async function(payload){
    var entry = registry.get(socket.id);
    if(!entry) return;
    var room = roomManager.get(entry.roomCode);
    if(!room) return;
    try{
      await room.startGame(entry.seat, payload && payload.targetScore, payload && payload.entryFee);
      room.broadcastRoomUpdate();
      room.broadcastState();
      room.advanceBotsIfNeeded();
    }catch(e){
      socket.emit('actionError', { message: e.message });
    }
  });

  socket.on('action', function(action){
    var entry = registry.get(socket.id);
    if(!entry) return;
    var room = roomManager.get(entry.roomCode);
    if(!room) return;
    try{
      room.applyAction(entry.seat, action || {});
      room.broadcastState();
      room.advanceBotsIfNeeded();
    }catch(e){
      socket.emit('actionError', { message: e.message });
    }
  });

  socket.on('leaveRoom', function(){
    var entry = registry.get(socket.id);
    if(!entry) return;
    var room = roomManager.get(entry.roomCode);
    if(!room) return;
    if(room.roomPhase===Room.PHASES.WAITING){
      room.seats[entry.seat] = null;
    } else {
      room.markDisconnected(entry.seat);
    }
    socket.leave(room.channel());
    registry.unbind(socket.id);
    room.broadcastRoomUpdate();
    roomManager.removeIfEmpty(room.code);
  });

  socket.on('disconnect', function(){
    if(presenceUserId) presence.markOffline(presenceUserId);
    matchmakingQueue.leave(socket.id);
    var entry = registry.unbind(socket.id);
    if(!entry) return;
    var room = roomManager.get(entry.roomCode);
    if(!room) return;
    room.markDisconnected(entry.seat);
    room.broadcastRoomUpdate();
  });
});

var PORT = process.env.PORT || 3000;
server.listen(PORT, function(){
  console.log('Shelem server listening on http://localhost:' + PORT);
});
