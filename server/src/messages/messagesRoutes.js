var express = require('express');
var pool = require('../db/pool.js');
var authMiddleware = require('../auth/authMiddleware.js');

var router = express.Router();

router.get('/:friendId', authMiddleware.requireAuth, async function(req, res){
  try{
    var friendId = parseInt(req.params.friendId, 10);
    if(!friendId) return res.status(400).json({ error: 'Invalid user.' });
    var friendCheck = await pool.query(
      "SELECT 1 FROM friendships WHERE status='accepted' AND ((requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1))",
      [req.userId, friendId]
    );
    if(friendCheck.rows.length===0) return res.status(403).json({ error: 'You are not friends with this user.' });

    var result = await pool.query(
      'SELECT id, sender_id, recipient_id, body, created_at FROM messages WHERE (sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1) ORDER BY created_at ASC LIMIT 200',
      [req.userId, friendId]
    );
    res.json({
      messages: result.rows.map(function(m){
        return { id: m.id, senderId: m.sender_id, recipientId: m.recipient_id, body: m.body, at: m.created_at };
      })
    });
  }catch(e){
    console.error('[messages] list error', e);
    res.status(500).json({ error: 'Could not load messages.' });
  }
});

module.exports = router;
