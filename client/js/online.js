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
  document.getElementById('room-chat-toggle-wrap').style.display = 'flex';
  document.getElementById('room-chat-messages').innerHTML = '';
}

function exitOnlineMode(){
  if(onlineRoomCode){ Network.leaveRoom(); }
  onlineView = null;
  onlineRoomCode = null;
  onlineHostSeat = null;
  resetToLocalMode();
  document.getElementById('room-chat-toggle-wrap').style.display = 'none';
  document.getElementById('room-chat-panel').classList.remove('open');
  document.getElementById('room-chat-toggle-btn').textContent = t('showChat');
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
  // Matchmaking is always wagered now, and wagers need a real account (coins
  // are tied to one) — guests can't be grouped into a room that can't start.
  if(!isLoggedIn()){
    openModal(
      '<h2>'+t('playOnline')+'</h2>' +
      '<p class="muted">'+t('friendsLoginPrompt')+'</p>' +
      '<div class="modal-actions" style="justify-content:center;">' +
        '<button class="primary" id="mm-login-btn">'+t('logInSignUp')+'</button>' +
      '</div>'
    );
    document.getElementById('mm-login-btn').onclick = function(){ openAuthModal('login'); };
    return;
  }
  openModal(
    '<h2>'+t('playOnline')+'</h2>' +
    '<input type="text" id="mm-name-input" maxlength="18" placeholder="'+t('yourName')+'" value="'+profile.name.replace(/"/g,'')+'">' +
    '<p class="muted">'+t('entryFeeLabel')+'</p>' +
    '<div id="mm-wager-tiers" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;"></div>' +
    '<div class="modal-actions"><button id="mm-cancel-btn">'+t('cancel')+'</button></div>'
  );
  var nameInput = document.getElementById('mm-name-input');
  nameInput.oninput = function(){
    var val = nameInput.value.trim();
    if(val.length>0 && val!==profile.name){ profile.name = val; saveProfile(); }
  };
  var tierWrap = document.getElementById('mm-wager-tiers');
  WagerTiers.TIERS.forEach(function(tier){
    var btn = document.createElement('button');
    btn.style.cssText = 'width:100%;text-align:left;padding:8px 12px;';
    btn.innerHTML = t('wagerTierLabel', tier, WagerTiers.maxPayoutPerWinner(tier));
    btn.onclick = function(){ startFindingPlayers(tier); };
    tierWrap.appendChild(btn);
  });
  document.getElementById('mm-cancel-btn').onclick = closeModal;
}

function startFindingPlayers(tier){
  openModal(
    '<h2>'+t('playOnline')+'</h2>' +
    '<p class="muted">'+t('findingPlayers')+'</p>' +
    '<div class="modal-actions"><button id="mm-cancel-btn">'+t('cancel')+'</button></div>'
  );
  document.getElementById('mm-cancel-btn').onclick = function(){
    Network.leaveMatchmaking();
    closeModal();
  };
  Network.joinMatchmaking(tier);
}

function renderWaitingRoom(payload){
  onlineRoomCode = payload.roomCode;
  onlineHostSeat = payload.hostSeat;
  document.getElementById('wr-room-code').textContent = payload.roomCode;
  var list = document.getElementById('wr-seat-list');
  list.innerHTML = '';
  var canChooseSeat = !payload.matchmaking && payload.roomPhase==='waiting';
  [0,1].forEach(function(teamIdx){
    var col = document.createElement('div');
    col.className = 'team-column';
    var label = document.createElement('div');
    label.className = 'team-column-label';
    label.textContent = teamIdx===0 ? t('teamA') : t('teamB');
    col.appendChild(label);
    [teamIdx, teamIdx+2].forEach(function(seatIdx){
      var s = payload.seats[seatIdx];
      var row = document.createElement('div');
      row.className = 'seat-slot-row' + (s ? '' : ' empty') + (seatIdx===mySeat ? ' me' : '');
      var avatarSpan = document.createElement('span');
      avatarSpan.className = 'slot-avatar';
      avatarSpan.textContent = s ? (s.avatar || '🤖') : '·';
      var textSpan = document.createElement('span');
      var labelText = s ? (s.name + (s.connected ? '' : t('disconnectedTag'))) : t('emptySeat');
      if(s && s.type==='bot') labelText += t('botTag');
      if(!payload.matchmaking && seatIdx===payload.hostSeat && s) labelText += t('hostTag');
      textSpan.textContent = labelText;
      row.appendChild(avatarSpan);
      row.appendChild(textSpan);
      if(canChooseSeat && seatIdx!==mySeat){
        row.classList.add('clickable');
        row.onclick = function(){ Network.chooseSeat(seatIdx); };
      }
      col.appendChild(row);
    });
    list.appendChild(col);
  });
  var existingHint = document.getElementById('wr-tap-hint');
  if(existingHint) existingHint.remove();
  if(canChooseSeat){
    var hint = document.createElement('p');
    hint.id = 'wr-tap-hint';
    hint.className = 'muted';
    hint.style.cssText = 'text-align:center;font-size:12px;margin:0 0 4px;';
    hint.textContent = t('tapToSit');
    list.parentNode.insertBefore(hint, list);
  }
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
    var feeLabel = document.createElement('p');
    feeLabel.className = 'muted';
    feeLabel.style.cssText = 'font-size:12px;margin:6px 0 4px;';
    feeLabel.textContent = t('entryFeeLabel');
    hostControls.appendChild(feeLabel);
    var tierWrap = document.createElement('div');
    tierWrap.id = 'wr-wager-tiers';
    tierWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-bottom:10px;';
    var chosenTier = null;
    WagerTiers.TIERS.forEach(function(tier){
      var tierBtn = document.createElement('button');
      tierBtn.className = 'wager-tier-choice';
      tierBtn.style.cssText = 'width:100%;text-align:left;padding:8px 12px;';
      tierBtn.innerHTML = t('wagerTierLabel', tier, WagerTiers.maxPayoutPerWinner(tier));
      tierBtn.onclick = function(){
        chosenTier = tier;
        tierWrap.querySelectorAll('.wager-tier-choice').forEach(function(b){
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = 'var(--gold-bright)';
        });
        tierBtn.classList.add('active');
        tierBtn.style.background = 'var(--gold)';
        tierBtn.style.color = '#3a2e05';
        startBtn.disabled = !isFull;
      };
      tierWrap.appendChild(tierBtn);
    });
    hostControls.appendChild(tierWrap);
    var startBtn = document.createElement('button');
    startBtn.className = 'primary';
    startBtn.textContent = t('startGame');
    startBtn.disabled = true;
    startBtn.onclick = function(){
      if(!chosenTier){ showToast(t('mustPickWager')); return; }
      Network.startGame(profile.targetScore || 500, chosenTier);
    };
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
Network.on('seatChanged', function(payload){
  mySeat = payload.seat;
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
Network.on('roomChat', function(msg){
  var text = (msg.seat===mySeat) ? msg.body : (msg.avatar+' '+msg.name+': '+msg.body);
  appendChatMessage(document.getElementById('room-chat-messages'), { mine: msg.seat===mySeat, text: text });
});

document.getElementById('wr-leave-btn').onclick = function(){
  exitOnlineMode();
  showScreen('menu-screen');
};

document.getElementById('room-chat-toggle-btn').onclick = function(){
  var panel = document.getElementById('room-chat-panel');
  panel.classList.toggle('open');
  this.textContent = panel.classList.contains('open') ? t('hideChat') : t('showChat');
};
function sendRoomChatFromInput(){
  var input = document.getElementById('room-chat-input');
  var body = input.value.trim();
  if(body.length===0) return;
  Network.sendRoomChat(body);
  input.value = '';
}
document.getElementById('room-chat-send-btn').onclick = sendRoomChatFromInput;
document.getElementById('room-chat-input').onkeydown = function(e){ if(e.key==='Enter') sendRoomChatFromInput(); };
