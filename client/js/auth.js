/* Real accounts: email+password against the server's REST API. Guest play
 * still works with zero friction (profile stays localStorage-only) — signing
 * in additionally syncs name/avatar/target score/language to the account and
 * unlocks real friends. `currentUser` is null when playing as a guest.
 */
var currentUser = null;

function authToken(){
  try{ return localStorage.getItem('shelemAuthToken'); }catch(e){ return null; }
}
function setAuthToken(token){
  try{
    if(token) localStorage.setItem('shelemAuthToken', token);
    else localStorage.removeItem('shelemAuthToken');
  }catch(e){}
}

function apiFetch(path, options){
  options = options || {};
  var headers = { 'Content-Type': 'application/json' };
  var token = authToken();
  if(token) headers.Authorization = 'Bearer ' + token;
  return fetch(path, {
    method: options.method || 'GET',
    headers: headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  }).then(function(res){
    return res.json().catch(function(){ return {}; }).then(function(data){
      if(!res.ok) throw new Error(data.error || 'Request failed.');
      return data;
    });
  });
}

function isLoggedIn(){ return !!currentUser; }

function applyUserToProfile(user){
  currentUser = user;
  profile.name = user.displayName;
  var idx = AVATAR_OPTIONS.indexOf(user.avatar);
  profile.avatarIndex = idx>=0 ? idx : 0;
  profile.coins = user.coins;
  profile.targetScore = user.targetScore;
  profile.language = user.language;
  saveProfile();
  applyStaticTranslations();
  /* Open a background connection so friends can see we're online even before
   * we've joined any game — reconnects are cheap/no-op if already connected. */
  if(typeof Network!=='undefined') Network.connect();
}

function signup(email, username, password, displayName){
  return apiFetch('/api/signup', {
    method: 'POST',
    body: { email: email, username: username, password: password, displayName: displayName, avatar: AVATAR_OPTIONS[profile.avatarIndex] }
  }).then(function(data){ setAuthToken(data.token); applyUserToProfile(data.user); return data.user; });
}

function login(email, password){
  return apiFetch('/api/login', { method: 'POST', body: { email: email, password: password } })
    .then(function(data){ setAuthToken(data.token); applyUserToProfile(data.user); return data.user; });
}

function logout(){
  setAuthToken(null);
  currentUser = null;
  if(typeof Network!=='undefined') Network.disconnect();
}

/* Called at boot: if a saved session token exists, validate it and refresh
 * the local profile from the account (so edits made elsewhere show up). */
function tryResumeSession(){
  if(!authToken()) return;
  apiFetch('/api/me').then(function(data){ applyUserToProfile(data.user); })
    .catch(function(){ setAuthToken(null); });
}

/* Pushes the current local profile up to the account, when logged in. Safe
 * to call unconditionally — no-ops for guests. */
function syncProfileToAccount(){
  if(!isLoggedIn()) return;
  apiFetch('/api/me', {
    method: 'PUT',
    body: { displayName: profile.name, avatar: AVATAR_OPTIONS[profile.avatarIndex], targetScore: profile.targetScore, language: profile.language }
  }).then(function(data){ currentUser = data.user; }).catch(function(){});
}

tryResumeSession();
