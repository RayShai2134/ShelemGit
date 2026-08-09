/* Local player profile + persistent client identity.
 * Replaces the old window.storage.get/set calls (an artifact-sandbox-only API that
 * silently no-ops on a normal website) with plain localStorage.
 */
var AVATAR_OPTIONS = ['🦁','🐯','🦅','🐺','🦊','🐻','🐨','🦉','🐸','🦋'];

var profile = { name:'Player', avatarIndex:0, coins:500, targetScore:500, language:'en' };
var gameStarted = false;

function loadProfile(){
  try{
    var raw = localStorage.getItem('shelemProfile');
    if(raw){
      var loaded = JSON.parse(raw);
      profile.name = loaded.name || profile.name;
      profile.avatarIndex = typeof loaded.avatarIndex==='number' ? loaded.avatarIndex : 0;
      profile.coins = typeof loaded.coins==='number' ? loaded.coins : 500;
      profile.targetScore = typeof loaded.targetScore==='number' ? loaded.targetScore : 500;
      profile.language = (loaded.language==='fa') ? 'fa' : 'en';
    }
  }catch(e){}
  renderProfileBar();
}

function saveProfile(){
  renderProfileBar();
  try{
    localStorage.setItem('shelemProfile', JSON.stringify(profile));
  }catch(e){}
  if(typeof syncProfileToAccount==='function') syncProfileToAccount();
}

function renderProfileBar(){
  document.getElementById('profile-avatar-circle').textContent = AVATAR_OPTIONS[profile.avatarIndex];
  document.getElementById('profile-name-label').textContent = profile.name;
  document.getElementById('coin-count').textContent = profile.coins;
  var subtextEl = document.getElementById('profile-subtext');
  if(subtextEl){
    var loggedIn = typeof isLoggedIn==='function' && isLoggedIn();
    if(loggedIn) subtextEl.textContent = '@' + currentUser.username;
    else if(typeof t==='function') subtextEl.textContent = t('tapToEdit');
  }
}

/* Persistent per-browser identity used later for multiplayer (matchmaking, room
 * membership, reconnect). Minted once and reused — a display name, not a login. */
function getClientId(){
  try{
    var id = localStorage.getItem('shelemClientId');
    if(!id){
      id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : ('client-' + Date.now() + '-' + Math.random().toString(16).slice(2));
      localStorage.setItem('shelemClientId', id);
    }
    return id;
  }catch(e){
    return 'client-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }
}

/* Load persisted profile immediately (before local-game.js constructs the
 * first offline ShelemGame) so a saved targetScore/language takes effect
 * from the very first game, not just after "New game". */
getClientId();
loadProfile();
