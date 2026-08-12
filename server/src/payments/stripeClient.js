if(!process.env.STRIPE_SECRET_KEY){
  console.warn('[payments] STRIPE_SECRET_KEY not set — coin purchases will fail until it is configured.');
}
module.exports = require('stripe')(process.env.STRIPE_SECRET_KEY);
