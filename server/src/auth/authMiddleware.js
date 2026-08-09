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

module.exports = { requireAuth: requireAuth, signToken: signToken };
