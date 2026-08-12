var express = require('express');
var pool = require('../db/pool.js');
var stripe = require('./stripeClient.js');

var router = express.Router();

/* Stripe requires the raw, unparsed request body to verify the signature —
 * this router must be mounted BEFORE the app-wide express.json() middleware.
 * This is the authoritative moment coins get credited: never trust the
 * client-side success redirect alone, since that can be spoofed or skipped. */
router.post('/', express.raw({ type: 'application/json' }), async function(req, res){
  var sig = req.headers['stripe-signature'];
  var event;
  try{
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  }catch(e){
    console.error('[stripe webhook] signature verification failed:', e.message);
    return res.status(400).send('Webhook signature verification failed.');
  }

  if(event.type==='checkout.session.completed'){
    var session = event.data.object;
    var client = await pool.connect();
    try{
      await client.query('BEGIN');
      var existing = await client.query("SELECT status FROM coin_purchases WHERE stripe_session_id=$1 FOR UPDATE", [session.id]);
      if(existing.rows.length>0 && existing.rows[0].status==='pending'){
        await client.query("UPDATE coin_purchases SET status='paid' WHERE stripe_session_id=$1", [session.id]);
        await client.query('UPDATE users SET coins = coins + $1 WHERE id=$2', [
          parseInt(session.metadata.coins, 10), parseInt(session.metadata.userId, 10)
        ]);
        console.log('[stripe webhook] credited', session.metadata.coins, 'coins to user', session.metadata.userId);
      }
      await client.query('COMMIT');
    }catch(e){
      await client.query('ROLLBACK');
      console.error('[stripe webhook] processing error', e);
      client.release();
      return res.status(500).send('Webhook processing error.');
    }
    client.release();
  }

  res.json({ received: true });
});

module.exports = router;
