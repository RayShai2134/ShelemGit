(function(root, factory){
  if(typeof module==='object' && module.exports){
    module.exports = factory();
  } else {
    root.Avatars = factory();
  }
})(typeof self!=='undefined' ? self : this, function(){

var FREE_AVATARS = ['🦁','🐯','🦅','🐺','🦊','🐻','🐨','🦉','🐸','🦋'];

// Cosmetic, bought with coins (not real money). Price is per-avatar in coins.
var PREMIUM_AVATARS = [
  { emoji: '🐉', price: 100 },
  { emoji: '🦄', price: 100 },
  { emoji: '🐙', price: 100 },
  { emoji: '🦖', price: 150 },
  { emoji: '🦩', price: 150 },
  { emoji: '🦈', price: 150 },
  { emoji: '🐢', price: 200 },
  { emoji: '🦥', price: 200 }
];

function isValidAvatarFor(emoji, unlockedAvatars){
  if(emoji==='🙂') return true; // generic default/fallback, not a real cosmetic choice
  if(FREE_AVATARS.indexOf(emoji)!==-1) return true;
  return Array.isArray(unlockedAvatars) && unlockedAvatars.indexOf(emoji)!==-1;
}

function premiumPriceOf(emoji){
  var found = PREMIUM_AVATARS.filter(function(a){ return a.emoji===emoji; })[0];
  return found ? found.price : null;
}

return {
  FREE_AVATARS: FREE_AVATARS,
  PREMIUM_AVATARS: PREMIUM_AVATARS,
  isValidAvatarFor: isValidAvatarFor,
  premiumPriceOf: premiumPriceOf
};

});
