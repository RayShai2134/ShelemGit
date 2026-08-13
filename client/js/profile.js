/* Local player profile + persistent client identity.
 * Replaces the old window.storage.get/set calls (an artifact-sandbox-only API that
 * silently no-ops on a normal website) with plain localStorage.
 */
var AVATAR_OPTIONS = ['🦁','🐯','🦅','🐺','🦊','🐻','🐨','🦉','🐸','🦋'];

var profile = { name:'Player', avatar:AVATAR_OPTIONS[0], unlockedAvatars:[], coins:0, targetScore:500, language:'en' };
var gameStarted = false;

function loadProfile(){
  try{
    var raw = localStorage.getItem('shelemProfile');
    if(raw){
      var loaded = JSON.parse(raw);
      profile.name = loaded.name || profile.name;
      // Older saves stored a free-avatar index instead of the emoji itself;
      // premium avatars can't be represented that way, so migrate forward.
      if(typeof loaded.avatar==='string' && loaded.avatar) profile.avatar = loaded.avatar;
      else if(typeof loaded.avatarIndex==='number') profile.avatar = AVATAR_OPTIONS[loaded.avatarIndex] || AVATAR_OPTIONS[0];
      profile.unlockedAvatars = Array.isArray(loaded.unlockedAvatars) ? loaded.unlockedAvatars : [];
      profile.coins = typeof loaded.coins==='number' ? loaded.coins : 0;
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
  document.getElementById('profile-avatar-circle').textContent = profile.avatar;
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
