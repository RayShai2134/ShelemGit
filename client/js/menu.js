/* Menu-screen modals: profile editor, friends list, buy coins, settings, rules. */

function showToast(msg){
  var toastEl = document.getElementById('toast');
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(function(){ toastEl.classList.remove('show'); }, 2400);
}

function openModal(html){
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('open');
  activeChatFriendId = null;
}

function openProfileModal(){
  var avatarsHtml = AVATAR_OPTIONS.map(function(a, i){
    return '<div class="avatar-choice' + (i===profile.avatarIndex ? ' selected' : '') + '" data-idx="'+i+'">'+a+'</div>';
  }).join('');
  openModal(
    '<h2>'+t('editProfile')+'</h2>' +
    (isLoggedIn() ? '<p class="muted" style="margin-top:-8px;">'+t('loggedInAs', currentUser.username)+'</p>' : '') +
    (isLoggedIn() ? '<div class="stats-row">' +
      '<div class="stat-tile"><div class="stat-val">'+currentUser.stats.gamesPlayed+'</div><div class="stat-lbl">'+t('statGames')+'</div></div>' +
      '<div class="stat-tile"><div class="stat-val">'+currentUser.stats.gamesWon+'</div><div class="stat-lbl">'+t('statWins')+'</div></div>' +
      '<div class="stat-tile"><div class="stat-val">'+currentUser.stats.gamesLost+'</div><div class="stat-lbl">'+t('statLosses')+'</div></div>' +
      '<div class="stat-tile"><div class="stat-val">'+currentUser.stats.winPercentage+'%</div><div class="stat-lbl">'+t('statWinRate')+'</div></div>' +
    '</div>' : '') +
    '<input type="text" id="name-input" maxlength="18" value="'+profile.name.replace(/"/g,'')+'" placeholder="'+t('yourName')+'">' +
    '<p class="muted" style="margin-top:-8px;">'+t('chooseAvatar')+'</p>' +
    '<div class="avatar-grid" id="avatar-grid">'+avatarsHtml+'</div>' +
    '<div class="modal-actions">' +
      (isLoggedIn() ? '<button id="profile-logout-btn">'+t('logOut')+'</button>' : '') +
      '<button id="profile-cancel-btn">'+t('cancel')+'</button>' +
      '<button class="primary" id="profile-save-btn">'+t('save')+'</button>' +
    '</div>'
  );
  var chosenIdx = profile.avatarIndex;
  document.querySelectorAll('.avatar-choice').forEach(function(el){
    el.onclick = function(){
      document.querySelectorAll('.avatar-choice').forEach(function(x){ x.classList.remove('selected'); });
      el.classList.add('selected');
      chosenIdx = parseInt(el.getAttribute('data-idx'), 10);
    };
  });
  document.getElementById('profile-cancel-btn').onclick = closeModal;
  document.getElementById('profile-save-btn').onclick = function(){
    var newName = document.getElementById('name-input').value.trim();
    profile.name = newName.length>0 ? newName : 'Player';
    profile.avatarIndex = chosenIdx;
    saveProfile();
    closeModal();
  };
  var logoutBtn = document.getElementById('profile-logout-btn');
  if(logoutBtn) logoutBtn.onclick = function(){ logout(); renderProfileBar(); closeModal(); };
}

function openFriendsModal(){
  if(!isLoggedIn()){
    openModal(
      '<h2>'+t('friends')+'</h2>' +
      '<p class="muted">'+t('friendsLoginPrompt')+'</p>' +
      '<div class="modal-actions" style="justify-content:center;">' +
        '<button class="primary" id="friends-login-btn">'+t('logInSignUp')+'</button>' +
      '</div>'
    );
    document.getElementById('friends-login-btn').onclick = function(){ openAuthModal('login'); };
    return;
  }
  loadAndRenderFriends();
}

function loadAndRenderFriends(){
  openModal('<h2>'+t('friends')+'</h2><p class="muted">'+t('loading')+'</p>');
  apiFetch('/api/friends').then(function(data){
    renderFriendsModalContent(data);
  }).catch(function(e){ showToast(e.message); closeModal(); });
}

function renderFriendsModalContent(data){
  var html = '<h2>'+t('friends')+'</h2>';
  if(data.incoming.length>0){
    html += '<p class="muted" style="margin-bottom:6px;">'+t('incomingRequests')+'</p><div class="friends-list">' +
      data.incoming.map(function(f){
        return '<div class="friend-row"><span>'+f.avatar+' '+f.displayName+' <span class="muted">@'+f.username+'</span></span>' +
          '<span><button data-accept="'+f.friendshipId+'" style="padding:4px 10px;font-size:12px;">'+t('accept')+'</button> ' +
          '<button data-decline="'+f.friendshipId+'" style="padding:4px 10px;font-size:12px;">'+t('decline')+'</button></span></div>';
      }).join('') + '</div>';
  }
  html += '<p class="muted" style="margin-bottom:6px;">'+t('yourFriends')+'</p>';
  html += data.friends.length===0
    ? '<p class="muted">'+t('noFriendsYet')+'</p>'
    : '<div class="friends-list">' + data.friends.map(function(f){
        var dot = '<span class="presence-dot' + (f.online ? ' online' : '') + '" title="' + (f.online ? t('online') : t('offline')) + '"></span>';
        return '<div class="friend-row"><span>'+dot+f.avatar+' '+f.displayName+' <span class="muted">@'+f.username+'</span></span>' +
          '<span><button data-chat="'+f.userId+'" data-chat-name="'+f.displayName.replace(/"/g,'')+'" data-chat-avatar="'+f.avatar+'" style="padding:4px 10px;font-size:12px;">💬</button> ' +
          '<button data-remove="'+f.friendshipId+'" style="padding:4px 10px;font-size:12px;">'+t('remove')+'</button></span></div>';
      }).join('') + '</div>';
  if(data.outgoing.length>0){
    html += '<p class="muted" style="margin-bottom:6px;">'+t('outgoingRequests')+'</p><div class="friends-list">' +
      data.outgoing.map(function(f){
        return '<div class="friend-row"><span>'+f.avatar+' '+f.displayName+' <span class="muted">@'+f.username+'</span></span>' +
          '<span class="muted">'+t('pending')+'</span></div>';
      }).join('') + '</div>';
  }
  html += '<input type="text" id="friend-username-input" maxlength="20" placeholder="'+t('addByUsername')+'">' +
    '<div class="modal-actions">' +
      '<button id="friends-close-btn">'+t('close')+'</button>' +
      '<button class="primary" id="friend-add-btn">'+t('addFriend')+'</button>' +
    '</div>';
  openModal(html);
  document.getElementById('friends-close-btn').onclick = closeModal;
  document.getElementById('friend-add-btn').onclick = function(){
    var username = document.getElementById('friend-username-input').value.trim();
    if(username.length===0) return;
    apiFetch('/api/friends/request', { method:'POST', body:{ username: username } })
      .then(function(){ showToast(t('requestSent')); loadAndRenderFriends(); })
      .catch(function(e){ showToast(e.message); });
  };
  document.querySelectorAll('[data-accept]').forEach(function(btn){
    btn.onclick = function(){
      apiFetch('/api/friends/'+btn.getAttribute('data-accept')+'/accept', { method:'POST' })
        .then(loadAndRenderFriends).catch(function(e){ showToast(e.message); });
    };
  });
  document.querySelectorAll('[data-decline]').forEach(function(btn){
    btn.onclick = function(){
      apiFetch('/api/friends/'+btn.getAttribute('data-decline')+'/decline', { method:'POST' })
        .then(loadAndRenderFriends).catch(function(e){ showToast(e.message); });
    };
  });
  document.querySelectorAll('[data-remove]').forEach(function(btn){
    btn.onclick = function(){
      apiFetch('/api/friends/'+btn.getAttribute('data-remove'), { method:'DELETE' })
        .then(loadAndRenderFriends).catch(function(e){ showToast(e.message); });
    };
  });
  document.querySelectorAll('[data-chat]').forEach(function(btn){
    btn.onclick = function(){
      openChatModal(parseInt(btn.getAttribute('data-chat'), 10), btn.getAttribute('data-chat-name'), btn.getAttribute('data-chat-avatar'));
    };
  });
}

function openAuthModal(mode){
  mode = mode || 'login';
  var isSignup = mode==='signup';
  openModal(
    '<h2>'+(isSignup ? t('signUp') : t('logIn'))+'</h2>' +
    (isSignup ? '<input type="text" id="auth-displayname" maxlength="24" placeholder="'+t('yourName')+'">' : '') +
    (isSignup ? '<input type="text" id="auth-username" maxlength="20" placeholder="'+t('username')+'">' : '') +
    '<input type="email" id="auth-email" placeholder="'+t('email')+'">' +
    '<input type="password" id="auth-password" placeholder="'+t('password')+'">' +
    '<div class="modal-actions" style="justify-content:center;">' +
      '<button class="primary" id="auth-submit-btn">'+(isSignup ? t('signUp') : t('logIn'))+'</button>' +
    '</div>' +
    '<p class="muted" style="text-align:center;font-size:12.5px;">' +
      (isSignup ? t('haveAccount') : t('needAccount')) + ' ' +
      '<a href="#" id="auth-toggle-link">'+(isSignup ? t('logIn') : t('signUp'))+'</a>' +
    '</p>'
  );
  document.getElementById('auth-toggle-link').onclick = function(e){ e.preventDefault(); openAuthModal(isSignup ? 'login' : 'signup'); };
  document.getElementById('auth-submit-btn').onclick = function(){
    var email = document.getElementById('auth-email').value.trim();
    var password = document.getElementById('auth-password').value;
    var action = isSignup
      ? signup(email, document.getElementById('auth-username').value.trim(), password, document.getElementById('auth-displayname').value.trim())
      : login(email, password);
    action.then(function(){
      showToast(t('welcomeBack'));
      loadAndRenderFriends();
    }).catch(function(e){ showToast(e.message); });
  };
}

function openBuyCoinsModal(){
  openModal(
    '<h2>'+t('buyCoins')+'</h2>' +
    '<p>'+t('buyCoinsBody')+'</p>' +
    '<div class="modal-actions"><button class="primary" id="coins-close-btn">'+t('gotIt')+'</button></div>'
  );
  document.getElementById('coins-close-btn').onclick = closeModal;
}

var TARGET_SCORE_PRESETS = [250, 500, 750, 1000];

function openSettingsModal(){
  var isCustom = TARGET_SCORE_PRESETS.indexOf(profile.targetScore)===-1;
  var presetsHtml = TARGET_SCORE_PRESETS.map(function(v){
    return '<button class="seg-btn target-score-choice' + (profile.targetScore===v ? ' active' : '') + '" data-value="'+v+'">'+v+'</button>';
  }).join('') + '<button class="seg-btn target-score-choice' + (isCustom ? ' active' : '') + '" data-value="custom">'+t('custom')+'</button>';
  var lang = currentLang();
  openModal(
    '<h2>'+t('settings')+'</h2>' +
    '<p class="muted">'+t('settingsTargetLabel')+'</p>' +
    '<div class="segmented" id="target-score-segmented" style="flex-wrap:wrap;margin-bottom:10px;">' + presetsHtml + '</div>' +
    '<input type="text" inputmode="numeric" id="target-score-custom-input" placeholder="'+t('settingsCustomPlaceholder')+'" style="display:'+(isCustom?'block':'none')+';" value="'+(isCustom?profile.targetScore:'')+'">' +
    '<p class="muted">'+t('language')+'</p>' +
    '<div class="segmented" style="margin-bottom:10px;">' +
      '<button class="seg-btn lang-choice' + (lang==='en' ? ' active' : '') + '" data-lang="en">English</button>' +
      '<button class="seg-btn lang-choice' + (lang==='fa' ? ' active' : '') + '" data-lang="fa">فارسی</button>' +
    '</div>' +
    '<p class="muted">'+t('settingsFooter')+'</p>' +
    '<div class="modal-actions"><button class="primary" id="settings-close-btn">'+t('close')+'</button></div>'
  );
  var customInput = document.getElementById('target-score-custom-input');
  function applyTargetScore(v){
    if(v>=50 && v<=100000 && v%5===0){
      profile.targetScore = v;
      saveProfile();
    }
  }
  document.querySelectorAll('.target-score-choice').forEach(function(btn){
    btn.onclick = function(){
      document.querySelectorAll('.target-score-choice').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      var val = btn.getAttribute('data-value');
      if(val==='custom'){
        customInput.style.display = 'block';
        customInput.focus();
      } else {
        customInput.style.display = 'none';
        applyTargetScore(parseInt(val, 10));
      }
    };
  });
  customInput.oninput = function(){
    var v = parseInt(customInput.value, 10);
    if(!isNaN(v)) applyTargetScore(v);
  };
  document.querySelectorAll('.lang-choice').forEach(function(btn){
    btn.onclick = function(){
      profile.language = btn.getAttribute('data-lang');
      saveProfile();
      applyStaticTranslations();
      if(document.getElementById('game-screen').style.display!=='none') render();
      openSettingsModal();
    };
  });
  document.getElementById('settings-close-btn').onclick = closeModal;
}

function ruleSection(titleKey, bodyKey){
  return '<div class="rule-section"><h3>'+t(titleKey)+'</h3><p>'+t(bodyKey)+'</p></div>';
}

function openHowToPlayModal(){
  openModal(
    '<h2>'+t('howToPlayTitle')+'</h2>' +
    ruleSection('rulesBasicsTitle','rulesBasicsBody') +
    ruleSection('rulesDealingTitle','rulesDealingBody') +
    ruleSection('rulesBiddingTitle','rulesBiddingBody') +
    ruleSection('rulesWidowTitle','rulesWidowBody') +
    ruleSection('rulesTricksTitle','rulesTricksBody') +
    ruleSection('rulesScoringTitle','rulesScoringBody') +
    ruleSection('rulesWinningTitle','rulesWinningBody') +
    '<div class="modal-actions"><button class="primary" id="rules-close-btn">'+t('gotIt')+'</button></div>'
  );
  document.getElementById('rules-close-btn').onclick = closeModal;
}
