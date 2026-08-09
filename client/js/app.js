/* Wires up menu/game-screen buttons and boots the app. Loaded last, after
 * shelem-engine.js, profile.js, ui.js, local-game.js, menu.js.
 */
document.getElementById('settings-toggle-btn').onclick = function(){
  document.getElementById('settings-panel').classList.toggle('open');
};
document.getElementById('sort-asc-btn').onclick = function(){
  uiState.sortDescending = false;
  document.getElementById('sort-asc-btn').classList.add('active');
  document.getElementById('sort-desc-btn').classList.remove('active');
  render();
};
document.getElementById('sort-desc-btn').onclick = function(){
  uiState.sortDescending = true;
  document.getElementById('sort-desc-btn').classList.add('active');
  document.getElementById('sort-asc-btn').classList.remove('active');
  render();
};

document.getElementById('dir-cw-btn').onclick = function(){
  uiState.direction = 1;
  game.direction = 1;
  document.getElementById('dir-cw-btn').classList.add('active');
  document.getElementById('dir-ccw-btn').classList.remove('active');
  render();
};
document.getElementById('dir-ccw-btn').onclick = function(){
  uiState.direction = -1;
  game.direction = -1;
  document.getElementById('dir-ccw-btn').classList.add('active');
  document.getElementById('dir-cw-btn').classList.remove('active');
  render();
};

document.getElementById('log-toggle-btn').onclick = function(){
  var panel = document.getElementById('log-panel');
  panel.classList.toggle('open');
  this.textContent = panel.classList.contains('open') ? t('hideLog') : t('showLog');
};

document.getElementById('modal-overlay').addEventListener('click', function(e){
  if(e.target===this) closeModal();
});

document.getElementById('menu-profile-btn').onclick = openProfileModal;
document.getElementById('friends-btn').onclick = openFriendsModal;
document.getElementById('buy-coins-btn').onclick = openBuyCoinsModal;
document.getElementById('settings-btn').onclick = openSettingsModal;
document.getElementById('how-to-play-btn').onclick = openHowToPlayModal;

document.getElementById('play-online-btn').onclick = function(){
  openMatchmakingModal();
};
document.getElementById('play-friends-btn').onclick = function(){
  openFriendsPlayModal();
};
document.getElementById('play-bots-btn').onclick = function(){
  document.getElementById('menu-screen').style.display = 'none';
  document.getElementById('game-screen').style.display = 'block';
  if(!gameStarted){
    gameStarted = true;
    log(t('logNewGameStart', game.targetScore));
    log(t('logDealerBidding', SEAT_NAMES()[game.dealerSeat], SEAT_NAMES()[game.biddingOrder[0]]));
    render();
    tick();
  }
};
document.getElementById('back-to-menu-btn').onclick = function(){
  if(onlineRoomCode) exitOnlineMode();
  document.getElementById('game-screen').style.display = 'none';
  document.getElementById('menu-screen').style.display = 'block';
};

