var express = require('express');
var bcrypt = require('bcryptjs');
var pool = require('../db/pool.js');
var authMiddleware = require('./authMiddleware.js');

var router = express.Router();

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function publicUser(row){
  var gamesPlayed = row.games_played || 0;
  var gamesWon = row.games_won || 0;
  return {
    id: row.id, email: row.email, username: row.username,
    displayName: row.display_name, avatar: row.avatar,
    coins: row.coins, targetScore: row.target_score, language: row.language,
    stats: {
      gamesPlayed: gamesPlayed,
      gamesWon: gamesWon,
      gamesLost: gamesPlayed - gamesWon,
      winPercentage: gamesPlayed>0 ? Math.round((gamesWon/gamesPlayed)*100) : 0
    }
  };
}

router.post('/signup', async function(req, res){
  try{
    var email = (req.body.email || '').trim().toLowerCase();
    var username = (req.body.username || '').trim();
    var password = req.body.password || '';
    var displayName = (req.body.displayName || username).toString().trim().slice(0, 24);
    var avatar = (req.body.avatar || '🙂').toString().slice(0, 8);

    if(!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if(!USERNAME_RE.test(username)) return res.status(400).json({ error: 'Username must be 3-20 letters, numbers, or underscores.' });
    if(password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if(displayName.length === 0) return res.status(400).json({ error: 'Display name is required.' });

    var hash = await bcrypt.hash(password, 10);
    var result = await pool.query(
      'INSERT INTO users (email, username, password_hash, display_name, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [email, username, hash, displayName, avatar]
    );
    var user = result.rows[0];
    res.status(201).json({ token: authMiddleware.signToken(user.id), user: publicUser(user) });
  }catch(e){
    if(e.code==='23505'){
      return res.status(409).json({ error: 'That email or username is already taken.' });
    }
    console.error('[auth] signup error', e);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
});

router.post('/login', async function(req, res){
  try{
    var email = (req.body.email || '').trim().toLowerCase();
    var password = req.body.password || '';
    var result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    var user = result.rows[0];
    if(!user) return res.status(401).json({ error: 'Incorrect email or password.' });
    var ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(401).json({ error: 'Incorrect email or password.' });
    res.json({ token: authMiddleware.signToken(user.id), user: publicUser(user) });
  }catch(e){
    console.error('[auth] login error', e);
    res.status(500).json({ error: 'Something went wrong logging in.' });
  }
});

router.get('/me', authMiddleware.requireAuth, async function(req, res){
  try{
    var result = await pool.query('SELECT * FROM users WHERE id=$1', [req.userId]);
    var user = result.rows[0];
    if(!user) return res.status(404).json({ error: 'Account not found.' });
    res.json({ user: publicUser(user) });
  }catch(e){
    console.error('[auth] me error', e);
    res.status(500).json({ error: 'Could not load account.' });
  }
});

router.put('/me', authMiddleware.requireAuth, async function(req, res){
  try{
    var fields = [];
    var values = [];
    var i = 1;
    if(typeof req.body.displayName==='string' && req.body.displayName.trim().length>0){
      fields.push('display_name=$'+(i++)); values.push(req.body.displayName.trim().slice(0,24));
    }
    if(typeof req.body.avatar==='string'){
      fields.push('avatar=$'+(i++)); values.push(req.body.avatar.slice(0,8));
    }
    if(typeof req.body.targetScore==='number' && req.body.targetScore>=50 && req.body.targetScore<=100000){
      fields.push('target_score=$'+(i++)); values.push(req.body.targetScore);
    }
    if(req.body.language==='en' || req.body.language==='fa'){
      fields.push('language=$'+(i++)); values.push(req.body.language);
    }
    if(fields.length===0) return res.status(400).json({ error: 'Nothing to update.' });
    values.push(req.userId);
    var result = await pool.query('UPDATE users SET '+fields.join(', ')+' WHERE id=$'+i+' RETURNING *', values);
    res.json({ user: publicUser(result.rows[0]) });
  }catch(e){
    console.error('[auth] update error', e);
    res.status(500).json({ error: 'Could not update account.' });
  }
});

module.exports = router;
