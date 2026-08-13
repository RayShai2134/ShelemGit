var express = require('express');
var pool = require('../db/pool.js');
var stripe = require('./stripeClient.js');
var authMiddleware = require('../auth/authMiddleware.js');
var Avatars = require('../../../shared/avatars.js');

var router = express.Router();

// One coin = one cent, except the bundle discounts below.
var COIN_PACKAGES = {
  '100': { coins: 100, amountCents: 99 },
  '500': { coins: 500, amountCents: 400 },
  '1000': { coins: 1000, amountCents: 700 },
  '5000': { coins: 5000, amountCents: 2500 }
};

router.get('/coins/packages', function(req, res){
  res.json({ packages: COIN_PACKAGES });
});

router.post('/coins/checkout', authMiddleware.requireAuth, async function(req, res){
  try{
    var pkgKey = ((req.body && req.body.package) || '').toString();
    var pkg = COIN_PACKAGES[pkgKey];
    if(!pkg) return res.status(400).json({ error: 'Invalid coin package.' });

    var origin = req.headers.origin || (req.protocol + '://' + req.get('host'));
    var session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Coins are virtual currency, not a taxable physical good — Managed
      // Payments otherwise demands a product tax code we have no use for.
      managed_payments: { enabled: false },
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: pkg.coins + ' Shelem coins' },
          unit_amount: pkg.amountCents
        },
        quantity: 1
      }],
      metadata: { userId: String(req.userId), coins: String(pkg.coins) },
      success_url: origin + '/?purchase=success',
      cancel_url: origin + '/?purchase=cancelled'
    });

    await pool.query(
      'INSERT INTO coin_purchases (user_id, stripe_session_id, coins, amount_cents) VALUES ($1,$2,$3,$4)',
      [req.userId, session.id, pkg.coins, pkg.amountCents]
    );

    res.json({ url: session.url });
  }catch(e){
    console.error('[payments] checkout error', e);
    res.status(500).json({ error: 'Could not start checkout.' });
  }
});

router.get('/shop/avatars', authMiddleware.requireAuth, async function(req, res){
  try{
    var result = await pool.query('SELECT unlocked_avatars FROM users WHERE id=$1', [req.userId]);
    res.json({ premium: Avatars.PREMIUM_AVATARS, owned: result.rows[0].unlocked_avatars });
  }catch(e){
    console.error('[shop] list error', e);
    res.status(500).json({ error: 'Could not load shop.' });
  }
});

router.post('/shop/avatars/buy', authMiddleware.requireAuth, async function(req, res){
  var client = await pool.connect();
  try{
    var emoji = ((req.body && req.body.emoji) || '').toString();
    var price = Avatars.premiumPriceOf(emoji);
    if(!price) return res.status(400).json({ error: 'Not a purchasable avatar.' });

    await client.query('BEGIN');
    var userRes = await client.query('SELECT coins, unlocked_avatars FROM users WHERE id=$1 FOR UPDATE', [req.userId]);
    var user = userRes.rows[0];
    if(user.unlocked_avatars.indexOf(emoji)!==-1){
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You already own this avatar.' });
    }
    if(user.coins < price){
      await client.query('ROLLBACK');
      return res.status(402).json({ error: 'Not enough coins.' });
    }
    var updated = await client.query(
      'UPDATE users SET coins = coins - $1, unlocked_avatars = array_append(unlocked_avatars, $2) WHERE id=$3 RETURNING coins, unlocked_avatars',
      [price, emoji, req.userId]
    );
    await client.query('COMMIT');
    res.json({ coins: updated.rows[0].coins, owned: updated.rows[0].unlocked_avatars });
  }catch(e){
    await client.query('ROLLBACK');
    console.error('[shop] buy error', e);
    res.status(500).json({ error: 'Could not complete purchase.' });
  }finally{
    client.release();
  }
});

module.exports = router;
module.exports.COIN_PACKAGES = COIN_PACKAGES;
