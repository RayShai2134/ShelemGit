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
}

function openProfileModal(){
  var avatarsHtml = AVATAR_OPTIONS.map(function(a, i){
    return '<div class="avatar-choice' + (i===profile.avatarIndex ? ' selected' : '') + '" data-idx="'+i+'">'+a+'</div>';
  }).join('');
  openModal(
    '<h2>'+t('editProfile')+'</h2>' +
    '<input type="text" id="name-input" maxlength="18" value="'+profile.name.replace(/"/g,'')+'" placeholder="'+t('yourName')+'">' +
    '<p class="muted" style="margin-top:-8px;">'+t('chooseAvatar')+'</p>' +
    '<div class="avatar-grid" id="avatar-grid">'+avatarsHtml+'</div>' +
    '<div class="modal-actions">' +
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
}

function openFriendsModal(){
  renderFriendsModalContent();
}
function renderFriendsModalContent(){
  var listHtml = profile.friends.length===0
    ? '<p class="muted">'+t('noFriendsYet')+'</p>'
    : '<div class="friends-list">' + profile.friends.map(function(f, i){
        return '<div class="friend-row"><span>' + f + '</span><button data-remove="'+i+'" style="padding:4px 10px;font-size:12px;">'+t('remove')+'</button></div>';
      }).join('') + '</div>';
  openModal(
    '<h2>'+t('friends')+'</h2>' +
    '<p class="muted">'+t('friendsHint')+'</p>' +
    '<input type="text" id="friend-input" maxlength="18" placeholder="'+t('friendNamePlaceholder')+'">' +
    listHtml +
    '<div class="modal-actions">' +
      '<button id="friends-close-btn">'+t('close')+'</button>' +
      '<button class="primary" id="friend-add-btn">'+t('addFriend')+'</button>' +
    '</div>'
  );
  document.getElementById('friends-close-btn').onclick = closeModal;
  document.getElementById('friend-add-btn').onclick = function(){
    var val = document.getElementById('friend-input').value.trim();
    if(val.length===0) return;
    profile.friends.push(val);
    saveProfile();
    renderFriendsModalContent();
  };
  document.querySelectorAll('[data-remove]').forEach(function(btn){
    btn.onclick = function(){
      profile.friends.splice(parseInt(btn.getAttribute('data-remove'),10), 1);
      saveProfile();
      renderFriendsModalContent();
    };
  });
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
