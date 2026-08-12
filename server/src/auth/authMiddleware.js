var jwt = require('jsonwebtoken');

var SECRET = process.env.JWT_SECRET;
if(!SECRET){
  console.warn('[auth] JWT_SECRET not set — signup/login will fail until it is configured.');
}

function requireAuth(req, res, next){
  var header = req.headers.authorization || '';
  var token = header.indexOf('Bearer ')===0 ? header.slice(7) : null;
  if(!token) return res.status(401).json({ error: 'Not signed in.' });
  try{
    var payload = jwt.verify(token, SECRET);
    req.userId = payload.userId;
    next();
  }catch(e){
    return res.status(401).json({ error: 'Your session has expired — please sign in again.' });
  }
}

function signToken(userId){
  return jwt.sign({ userId: userId }, SECRET, { expiresIn: '90d' });
}

/* Returns the userId for a valid token, or null — used where a hard 401
 * isn't appropriate (e.g. the Socket.io handshake, which is fine without
 * a token for guest play). */
function verifyToken(token){
  if(!token) return null;
  try{ return jwt.verify(token, SECRET).userId; }
  catch(e){ return null; }
}

module.exports = { requireAuth: requireAuth, signToken: signToken, verifyToken: verifyToken };
