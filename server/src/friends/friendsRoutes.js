var express = require('express');
var pool = require('../db/pool.js');
var authMiddleware = require('../auth/authMiddleware.js');

var router = express.Router();

function friendRow(row){
  return { friendshipId: row.id, userId: row.other_id, username: row.other_username, displayName: row.other_display_name, avatar: row.other_avatar };
}

router.get('/', authMiddleware.requireAuth, async function(req, res){
  try{
    var myId = req.userId;
    var accepted = await pool.query(
      "SELECT f.id, u.id as other_id, u.username as other_username, u.display_name as other_display_name, u.avatar as other_avatar " +
      "FROM friendships f JOIN users u ON u.id = (CASE WHEN f.requester_id=$1 THEN f.addressee_id ELSE f.requester_id END) " +
      "WHERE (f.requester_id=$1 OR f.addressee_id=$1) AND f.status='accepted'",
      [myId]
    );
    var incoming = await pool.query(
      "SELECT f.id, u.id as other_id, u.username as other_username, u.display_name as other_display_name, u.avatar as other_avatar " +
      "FROM friendships f JOIN users u ON u.id = f.requester_id " +
      "WHERE f.addressee_id=$1 AND f.status='pending'",
      [myId]
    );
    var outgoing = await pool.query(
      "SELECT f.id, u.id as other_id, u.username as other_username, u.display_name as other_display_name, u.avatar as other_avatar " +
      "FROM friendships f JOIN users u ON u.id = f.addressee_id " +
      "WHERE f.requester_id=$1 AND f.status='pending'",
      [myId]
    );
    res.json({
      friends: accepted.rows.map(friendRow),
      incoming: incoming.rows.map(friendRow),
      outgoing: outgoing.rows.map(friendRow)
    });
  }catch(e){
    console.error('[friends] list error', e);
    res.status(500).json({ error: 'Could not load friends.' });
  }
});

router.post('/request', authMiddleware.requireAuth, async function(req, res){
  try{
    var username = (req.body.username || '').trim();
    var target = await pool.query('SELECT id FROM users WHERE username=$1', [username]);
    if(target.rows.length===0) return res.status(404).json({ error: 'No user with that username.' });
    var targetId = target.rows[0].id;
    if(targetId===req.userId) return res.status(400).json({ error: "You can't add yourself." });

    var existing = await pool.query(
      'SELECT * FROM friendships WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)',
      [req.userId, targetId]
    );
    if(existing.rows.length>0){
      var status = existing.rows[0].status;
      return res.status(409).json({ error: status==='accepted' ? 'You are already friends.' : 'A friend request is already pending.' });
    }

    await pool.query("INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1,$2,'pending')", [req.userId, targetId]);
    res.status(201).json({ ok: true });
  }catch(e){
    console.error('[friends] request error', e);
    res.status(500).json({ error: 'Could not send friend request.' });
  }
});

router.post('/:id/accept', authMiddleware.requireAuth, async function(req, res){
  try{
    var result = await pool.query(
      "UPDATE friendships SET status='accepted' WHERE id=$1 AND addressee_id=$2 AND status='pending' RETURNING *",
      [req.params.id, req.userId]
    );
    if(result.rows.length===0) return res.status(404).json({ error: 'Request not found.' });
    res.json({ ok: true });
  }catch(e){
    console.error('[friends] accept error', e);
    res.status(500).json({ error: 'Could not accept request.' });
  }
});

router.post('/:id/decline', authMiddleware.requireAuth, async function(req, res){
  try{
    await pool.query("DELETE FROM friendships WHERE id=$1 AND addressee_id=$2 AND status='pending'", [req.params.id, req.userId]);
    res.json({ ok: true });
  }catch(e){
    console.error('[friends] decline error', e);
    res.status(500).json({ error: 'Could not decline request.' });
  }
});

router.delete('/:id', authMiddleware.requireAuth, async function(req, res){
  try{
    await pool.query('DELETE FROM friendships WHERE id=$1 AND (requester_id=$2 OR addressee_id=$2)', [req.params.id, req.userId]);
    res.json({ ok: true });
  }catch(e){
    console.error('[friends] remove error', e);
    res.status(500).json({ error: 'Could not remove.' });
  }
});

module.exports = router;
