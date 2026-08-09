/* "Play vs friends" (private room) flow. Owns the online game view and
 * swaps the global submit* functions (from local-game.js) over to network
 * sends for the duration of an online game. Public matchmaking ("Play
 * online") is not wired up yet (Phase 3).
 */
var onlineView = null;
var onlineRoomCode = null;
var onlineHostSeat = null;

function showScreen(id){
  ['menu-screen','game-screen','waiting-room-screen'].forEach(function(s){
    document.getElementById(s).style.display = (s===id) ? 'block' : 'none';
  });
}

function enterOnlineMode(seat){
  mySeat = seat;
  getView = function(){ return onlineView; };
  submitBid = function(amount){ Network.sendAction({ type:'bid', amount: amount }); };
  submitPass = function(){ Network.sendAction({ type:'pass' }); };
  submitDiscard = function(cards){ Network.sendAction({ type:'discard', cards: cards }); uiState.selectedDiscard = []; };
  submitPlay = function(card){ Network.sendAction({ type:'playCard', card: card }); };
  submitNextHand = function(){ Network.sendAction({ type:'nextHand' }); };
  submitNewGame = function(){ Network.sendAction({ type:'newGame' }); };
}

function exitOnlineMode(){
  if(onlineRoomCode){ Network.leaveRoom(); }
  onlineView = null;
  onlineRoomCode = null;
  onlineHostSeat = null;
  resetToLocalMode();
}

function saveNameFromInput(){
  var input = document.getElementById('mp-name-input');
  var val = input ? input.value.trim() : '';
  if(val.length>0 && val!==profile.name){
    profile.name = val;
    saveProfile();
  }
}

function openFriendsPlayModal(){
  openModal(
    '<h2>'+t('playVsFriendsTitle')+'</h2>' +
    '<input type="text" id="mp-name-input" maxlength="18" placeholder="'+t('yourName')+'" value="'+profile.name.replace(/"/g,'')+'">' +
    '<p class="muted">'+t('playVsFriendsHint')+'</p>' +
    '<div class="modal-actions" style="justify-content:center;margin-bottom:14px;">' +
      '<button class="primary" id="mp-create-btn">'+t('createRoom')+'</button>' +
    '</div>' +
    '<input type="text" id="mp-join-input" maxlength="4" placeholder="'+t('roomCodePlaceholder')+'">' +
    '<div class="modal-actions">' +
      '<button id="mp-cancel-btn">'+t('cancel')+'</button>' +
      '<button class="primary" id="mp-join-btn">'+t('joinRoom')+'</button>' +
    '</div>'
  );
  document.getElementById('mp-cancel-btn').onclick = closeModal;
  document.getElementById('mp-create-btn').onclick = function(){ saveNameFromInput(); Network.createRoom(); };
  document.getElementById('mp-join-btn').onclick = function(){
    saveNameFromInput();
    var code = document.getElementById('mp-join-input').value.trim();
    if(code.length===0) return;
    Network.joinRoom(code);
  };
}

function openMatchmakingModal(){
  openModal(
    '<h2>'+t('playOnline')+'</h2>' +
    '<input type="text" id="mm-name-input" maxlength="18" placeholder="'+t('yourName')+'" value="'+profile.name.replace(/"/g,'')+'">' +
    '<p class="muted">'+t('findingPlayers')+'</p>' +
    '<div class="modal-actions"><button id="mm-cancel-btn">'+t('cancel')+'</button></div>'
  );
  var nameInput = document.getElementById('mm-name-input');
  nameInput.oninput = function(){
    var val = nameInput.value.trim();
    if(val.length>0 && val!==profile.name){ profile.name = val; saveProfile(); }
  };
  document.getElementById('mm-cancel-btn').onclick = function(){
    Network.leaveMatchmaking();
    closeModal();
  };
  Network.joinMatchmaking();
}

function renderWaitingRoom(payload){
  onlineRoomCode = payload.roomCode;
  onlineHostSeat = payload.hostSeat;
  document.getElementById('wr-room-code').textContent = payload.roomCode;
  var list = document.getElementById('wr-seat-list');
  list.innerHTML = '';
  payload.seats.forEach(function(s, i){
    var row = document.createElement('div');
    row.className = 'seat-slot-row' + (s ? '' : ' empty');
    var label = s ? (s.name + (s.connected ? '' : t('disconnectedTag'))) : t('emptySeat');
    if(s && s.type==='bot') label += t('botTag');
    if(!payload.matchmaking && i===payload.hostSeat && s) label += t('hostTag');
    row.textContent = label;
    list.appendChild(row);
  });
  var hostControls = document.getElementById('wr-host-controls');
  hostControls.innerHTML = '';
  if(payload.matchmaking){
    var mmEl = document.createElement('div');
    mmEl.className = 'muted';
    mmEl.textContent = t('matchStarting');
    hostControls.appendChild(mmEl);
  } else if(mySeat===payload.hostSeat){
    var isFull = payload.seats.every(function(s){ return !!s; });
    if(!isFull){
      var fillBtn = document.createElement('button');
      fillBtn.textContent = t('fillWithBots');
      fillBtn.onclick = function(){ Network.fillWithBots(); };
      hostControls.appendChild(fillBtn);
    }
    var startBtn = document.createElement('button');
    startBtn.className = 'primary';
    startBtn.textContent = t('startGame');
    startBtn.disabled = !isFull;
    startBtn.onclick = function(){ Network.startGame(profile.targetScore || 500); };
    hostControls.appendChild(startBtn);
  } else {
    var waitEl = document.createElement('div');
    waitEl.className = 'muted';
    waitEl.textContent = t('waitingForHost');
    hostControls.appendChild(waitEl);
  }
}

Network.on('roomCreated', function(payload){
  enterOnlineMode(payload.seat);
  closeModal();
  showScreen('waiting-room-screen');
});
Network.on('roomJoined', function(payload){
  enterOnlineMode(payload.seat);
  closeModal();
  showScreen('waiting-room-screen');
});
Network.on('joinError', function(payload){
  showToast(payload.message);
});
Network.on('actionError', function(payload){
  showToast(payload.message);
});
Network.on('roomUpdate', function(payload){
  if(payload.roomPhase==='waiting'){
    renderWaitingRoom(payload);
  }
});
Network.on('state', function(view){
  onlineView = view;
  if(document.getElementById('waiting-room-screen').style.display!=='none'){
    showScreen('game-screen');
  }
  render();
});
Network.on('disconnect', function(){
  if(onlineRoomCode) showToast(t('disconnectedFromServer'));
});

document.getElementById('wr-leave-btn').onclick = function(){
  exitOnlineMode();
  showScreen('menu-screen');
};
