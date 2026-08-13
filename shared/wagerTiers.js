(function(root, factory){
  if(typeof module==='object' && module.exports){
    module.exports = factory();
  } else {
    root.WagerTiers = factory();
  }
})(typeof self!=='undefined' ? self : this, function(){

// Fixed buy-in tiers for online games — players choose one, never a custom
// amount, so the client can show the exact payout for each option up front.
var TIERS = [20, 50, 100, 200, 500, 1000];

// Winning team splits this fraction of the pot; the rest is the house's cut
// and isn't credited to anyone.
var POT_SHARE = 0.95;

// What a full 4-human table would pay each winner at this buy-in, for
// showing "win up to N coins" on the tier picker. Real games with bot
// seats collect a smaller pot (bots don't pay in), so the actual payout
// can be less than this — it's an upper bound, not a promise.
function maxPayoutPerWinner(fee){
  var fullPot = fee * 4;
  return Math.floor((fullPot * POT_SHARE) / 2);
}

return {
  TIERS: TIERS,
  POT_SHARE: POT_SHARE,
  maxPayoutPerWinner: maxPayoutPerWinner
};

});
