/* Shelem game engine + bot AI.
 * Pure logic, no DOM/window references — usable from Node (server, via require)
 * and from the browser (client, via <script src="/shared/shelem-engine.js">, sets window.ShelemEngine).
 * This is the single source of truth for game rules: the server runs it authoritatively,
 * the client runs the exact same code for local offline vs-bots play.
 */
(function(root, factory){
  if(typeof module==='object' && module.exports){
    module.exports = factory();
  } else {
    root.ShelemEngine = factory();
  }
})(typeof self!=='undefined' ? self : this, function(){

var SUITS = ['clubs','diamonds','hearts','spades'];
var RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
var CARD_POINTS = { 'A':10, '10':10, '5':5 };
var TRICK_VALUE = 5;
var MIN_BID = 100;
var BID_INCREMENT = 5;
var PHASES = {
  BIDDING:'bidding', DISCARDING:'discarding', PLAYING:'playing',
  HAND_COMPLETE:'hand-complete', GAME_COMPLETE:'game-complete'
};
var SUIT_SYMBOL = { clubs:'♣', diamonds:'♦', hearts:'♥', spades:'♠' };
var SUIT_COLOR = { clubs:'black', diamonds:'red', hearts:'red', spades:'black' };

function rankIndex(r){ return RANKS.indexOf(r); }
function cardPoints(c){ return CARD_POINTS[c.rank] || 0; }
function cardsEqual(a,b){ return a.suit===b.suit && a.rank===b.rank; }
function cardId(c){ return c.rank+'-'+c.suit; }
function makeDeck(){
  var deck=[];
  for(var i=0;i<SUITS.length;i++){
    for(var j=0;j<RANKS.length;j++){ deck.push({suit:SUITS[i], rank:RANKS[j]}); }
  }
  return deck;
}
function shuffle(deck){
  var arr=deck.slice();
  for(var i=arr.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var t=arr[i]; arr[i]=arr[j]; arr[j]=t;
  }
  return arr;
}
function teamOf(seat){ return seat % 2; }

function ShelemGame(playerNames, options){
  options = options || {};
  this.players = playerNames;
  this.targetScore = options.targetScore || 500;
  this.direction = options.direction === -1 ? -1 : 1;
  this.teamScores = [0,0];
  this.dealerSeat = 0;
  this.handNumber = 0;
  this.gameWinner = null;
  this._startNewHand();
}

ShelemGame.prototype.nextSeat = function(seat){
  return (seat + this.direction + 4) % 4;
};

ShelemGame.prototype._startNewHand = function(){
  this.handNumber += 1;
  var deck = shuffle(makeDeck());
  this.hands = [[],[],[],[]];
  var cursor = 0;
  for(var batch=0; batch<3; batch++){
    for(var seat=0; seat<4; seat++){
      this.hands[seat] = this.hands[seat].concat(deck.slice(cursor, cursor+4));
      cursor += 4;
    }
  }
  this.widow = deck.slice(cursor, cursor+4);

  this.biddingOrder = [];
  var s = this.dealerSeat;
  for(var i=1;i<=4;i++){ s = this.nextSeat(s); this.biddingOrder.push(s); }
  this.bidTurnIndex = 0;
  this.currentBid = 0;
  this.currentBidder = null;
  this.passedSeats = {};

  this.declarer = null;
  this.trumpSuit = null;
  this.declarerDiscard = [];

  this.tricks = [];
  this.currentTrick = [];
  this.leaderSeat = null;
  this.capturedPointsByTeam = [0,0];
  this.lastHandResult = null;

  this.phase = PHASES.BIDDING;
};

Object.defineProperty(ShelemGame.prototype, 'seatToBid', {
  get:function(){
    if(this.phase !== PHASES.BIDDING) return null;
    return this.biddingOrder[this.bidTurnIndex];
  }
});
Object.defineProperty(ShelemGame.prototype, 'seatToPlay', {
  get:function(){
    if(this.phase !== PHASES.PLAYING) return null;
    return this.leaderSeat;
  }
});

ShelemGame.prototype.bid = function(seat, amount){
  if(this.phase!==PHASES.BIDDING) throw new Error('not bidding phase');
  if(seat!==this.seatToBid) throw new Error('not this seat\'s turn');
  var minAllowed = this.currentBid===0 ? MIN_BID : this.currentBid+BID_INCREMENT;
  if(amount < minAllowed) throw new Error('bid too low');
  this.currentBid = amount;
  this.currentBidder = seat;
  this._advanceBidTurn();
};

ShelemGame.prototype.pass = function(seat){
  if(this.phase!==PHASES.BIDDING) throw new Error('not bidding phase');
  if(seat!==this.seatToBid) throw new Error('not this seat\'s turn');
  this.passedSeats[seat] = true;
  this._advanceBidTurn();
};

ShelemGame.prototype._advanceBidTurn = function(){
  var self=this;
  var stillIn = this.biddingOrder.filter(function(s){ return !self.passedSeats[s]; });
  var passedCount = Object.keys(this.passedSeats).length;

  if(this.currentBidder!==null && stillIn.length===1 && stillIn[0]===this.currentBidder){
    this._finishBidding();
    return;
  }
  if(this.currentBidder===null && passedCount===4){
    this._startNewHand();
    return;
  }
  do{
    this.bidTurnIndex = (this.bidTurnIndex+1) % this.biddingOrder.length;
  } while(this.passedSeats[this.biddingOrder[this.bidTurnIndex]]);
};

ShelemGame.prototype._finishBidding = function(){
  this.declarer = this.currentBidder;
  this.hands[this.declarer] = this.hands[this.declarer].concat(this.widow);
  this.phase = PHASES.DISCARDING;
};

ShelemGame.prototype.discard = function(seat, cards){
  if(this.phase!==PHASES.DISCARDING) throw new Error('not discarding phase');
  if(seat!==this.declarer) throw new Error('only declarer discards');
  if(cards.length!==4) throw new Error('must discard exactly 4');
  var hand = this.hands[seat];
  for(var i=0;i<cards.length;i++){
    var idx = hand.findIndex(function(h){ return cardsEqual(h, cards[i]); });
    if(idx===-1) throw new Error('declarer does not hold that card');
  }
  this.hands[seat] = hand.filter(function(h){
    return !cards.some(function(c){ return cardsEqual(h,c); });
  });
  this.declarerDiscard = cards;
  var team = teamOf(this.declarer);
  var pts = cards.reduce(function(sum,c){ return sum+cardPoints(c); }, 0) + TRICK_VALUE;
  this.capturedPointsByTeam[team] += pts;
  this.leaderSeat = this.declarer;
  this.phase = PHASES.PLAYING;
};

ShelemGame.prototype.legalPlays = function(seat){
  var hand = this.hands[seat];
  if(this.currentTrick.length===0) return hand.slice();
  var ledSuit = this.currentTrick[0].card.suit;
  var canFollow = hand.some(function(c){ return c.suit===ledSuit; });
  if(canFollow) return hand.filter(function(c){ return c.suit===ledSuit; });
  return hand.slice();
};

ShelemGame.prototype.playCard = function(seat, card){
  if(this.phase!==PHASES.PLAYING) throw new Error('not playing phase');
  if(seat!==this.seatToPlay) throw new Error('not this seat\'s turn');
  var legal = this.legalPlays(seat);
  if(!legal.some(function(c){ return cardsEqual(c,card); })) throw new Error('illegal play');

  if(this.trumpSuit===null && this.tricks.length===0 && this.currentTrick.length===0){
    this.trumpSuit = card.suit;
  }
  this.hands[seat] = this.hands[seat].filter(function(c){ return !cardsEqual(c,card); });
  this.currentTrick.push({seat:seat, card:card});

  if(this.currentTrick.length<4){
    this.leaderSeat = this.nextSeat(seat);
    return {trickComplete:false};
  }
  return this._resolveTrick();
};

ShelemGame.prototype._resolveTrick = function(){
  var ledSuit = this.currentTrick[0].card.suit;
  var winning = this.currentTrick[0];
  var trump = this.trumpSuit;
  for(var i=1;i<this.currentTrick.length;i++){
    var play = this.currentTrick[i];
    var isTrump = play.card.suit===trump;
    var winIsTrump = winning.card.suit===trump;
    if(isTrump && !winIsTrump){
      winning = play;
    } else if(isTrump===winIsTrump && play.card.suit===winning.card.suit){
      if(rankIndex(play.card.rank) > rankIndex(winning.card.rank)) winning = play;
    }
  }
  var trickPoints = this.currentTrick.reduce(function(sum,p){ return sum+cardPoints(p.card); },0) + TRICK_VALUE;
  var winningTeam = teamOf(winning.seat);
  this.capturedPointsByTeam[winningTeam] += trickPoints;

  this.tricks.push({cards:this.currentTrick, winner:winning.seat, points:trickPoints});
  this.currentTrick = [];
  this.leaderSeat = winning.seat;

  if(this.tricks.length===12){
    this._finishHand();
    return {trickComplete:true, trickWinner:winning.seat, handComplete:true};
  }
  return {trickComplete:true, trickWinner:winning.seat, handComplete:false};
};

ShelemGame.prototype._finishHand = function(){
  var declarerTeam = teamOf(this.declarer);
  var defendingTeam = 1 - declarerTeam;
  var declarerPoints = this.capturedPointsByTeam[declarerTeam];
  var defendingPoints = this.capturedPointsByTeam[defendingTeam];
  var madeBid = declarerPoints >= this.currentBid;

  this.lastHandResult = {
    declarer:this.declarer, declarerTeam:declarerTeam, bid:this.currentBid,
    declarerPoints:declarerPoints, defendingPoints:defendingPoints, madeBid:madeBid
  };

  if(madeBid){ this.teamScores[declarerTeam] += declarerPoints; }
  else { this.teamScores[declarerTeam] -= this.currentBid; }
  this.teamScores[defendingTeam] += defendingPoints;

  this.phase = PHASES.HAND_COMPLETE;
  if(this.teamScores[0]>=this.targetScore || this.teamScores[1]>=this.targetScore){
    this.gameWinner = this.teamScores[0] > this.teamScores[1] ? 0 : 1;
    this.phase = PHASES.GAME_COMPLETE;
  }
};

ShelemGame.prototype.startNextHand = function(){
  if(this.phase!==PHASES.HAND_COMPLETE) throw new Error('hand not complete');
  this.dealerSeat = this.nextSeat(this.dealerSeat);
  this._startNewHand();
};

/* ---------------- Redacted per-seat view ----------------
 * Builds the state a single seat is allowed to see: their own hand in full,
 * everyone else's hands as counts only, and the undrawn widow omitted entirely.
 * Used by the server (the real security boundary, since other players are
 * untrusted over the network) and by the offline client (so the same render
 * code works for both — no other hands are visible anyway in solo play, this
 * just keeps the shapes identical).
 */
function buildStateForSeat(game, seat){
  var legalPlaysForMe = (game.phase===PHASES.PLAYING && game.seatToPlay===seat)
    ? game.legalPlays(seat)
    : null;
  var tricksWonByTeam = [0, 0];
  game.tricks.forEach(function(t){ tricksWonByTeam[teamOf(t.winner)]++; });
  return {
    mySeat: seat,
    teamScores: game.teamScores.slice(),
    targetScore: game.targetScore,
    tricksWonByTeam: tricksWonByTeam,
    direction: game.direction,
    dealerSeat: game.dealerSeat,
    handNumber: game.handNumber,
    phase: game.phase,
    biddingOrder: game.biddingOrder ? game.biddingOrder.slice() : null,
    seatToBid: game.seatToBid,
    currentBid: game.currentBid,
    currentBidder: game.currentBidder,
    passedSeats: Object.assign({}, game.passedSeats),
    declarer: game.declarer,
    trumpSuit: game.trumpSuit,
    seatToPlay: game.seatToPlay,
    currentTrick: game.currentTrick.slice(),
    capturedPointsByTeam: game.capturedPointsByTeam.slice(),
    lastHandResult: game.lastHandResult,
    gameWinner: game.gameWinner,
    myHand: game.hands[seat] ? game.hands[seat].slice() : [],
    handCounts: game.hands.map(function(h){ return h ? h.length : 0; }),
    legalPlaysForMe: legalPlaysForMe
  };
}

/* ---------------- Bot AI ---------------- */

function suitCountsOf(hand){
  var counts = {};
  hand.forEach(function(c){ counts[c.suit] = (counts[c.suit]||0)+1; });
  return counts;
}

function handStrengthEstimate(hand){
  var pointValue = 0;
  hand.forEach(function(c){ pointValue += cardPoints(c); });
  var counts = suitCountsOf(hand);
  var maxLen = 0;
  Object.keys(counts).forEach(function(s){ if(counts[s] > maxLen) maxLen = counts[s]; });
  var lengthBonus = Math.max(0, maxLen - 3) * 6;
  var highCardBonus = 0;
  hand.forEach(function(c){
    if(c.rank==='A') highCardBonus += 3;
    else if(c.rank==='K') highCardBonus += 0.5;
  });
  return Math.round(pointValue*0.4 + lengthBonus + highCardBonus);
}

function botDecideBid(game, seat){
  var strength = handStrengthEstimate(game.hands[seat]);
  var minAllowed = game.currentBid===0 ? MIN_BID : game.currentBid + BID_INCREMENT;
  var willingCeiling = MIN_BID + strength;
  if(minAllowed <= willingCeiling){
    return { action:'bid', amount: minAllowed };
  }
  return { action:'pass' };
}

function botChooseDiscard(hand){
  var counts = suitCountsOf(hand);
  var bestSuit = null, bestLen = -1;
  Object.keys(counts).forEach(function(s){
    if(counts[s] > bestLen){ bestLen = counts[s]; bestSuit = s; }
  });
  var sorted = hand.slice().sort(function(a,b){
    var aKeep = a.suit===bestSuit ? 1000 : 0;
    var bKeep = b.suit===bestSuit ? 1000 : 0;
    var aVal = aKeep + cardPoints(a)*10 + rankIndex(a.rank);
    var bVal = bKeep + cardPoints(b)*10 + rankIndex(b.rank);
    return aVal - bVal;
  });
  return sorted.slice(0,4);
}

function botChoosePlay(game, seat){
  var legal = game.legalPlays(seat);
  var trump = game.trumpSuit;
  var isDeclarerTeam = teamOf(seat) === teamOf(game.declarer);

  if(game.currentTrick.length===0){
    var trumpsInHand = legal.filter(function(c){ return c.suit===trump; });
    if(isDeclarerTeam && trumpsInHand.length>=2){
      trumpsInHand.sort(function(a,b){ return rankIndex(b.rank)-rankIndex(a.rank); });
      return trumpsInHand[0];
    }
    var counts = suitCountsOf(game.hands[seat]);
    var bestSuit = null, bestLen=-1;
    Object.keys(counts).forEach(function(s){
      if(s===trump) return;
      if(counts[s]>bestLen){ bestLen=counts[s]; bestSuit=s; }
    });
    if(bestSuit===null) bestSuit = trump;
    var candidates = legal.filter(function(c){ return c.suit===bestSuit; });
    candidates.sort(function(a,b){ return rankIndex(b.rank)-rankIndex(a.rank); });
    return candidates[0] || legal[0];
  }

  var winning = game.currentTrick[0];
  for(var i=1;i<game.currentTrick.length;i++){
    var play = game.currentTrick[i];
    var isTrump = play.card.suit===trump, winIsTrump = winning.card.suit===trump;
    if(isTrump && !winIsTrump) winning = play;
    else if(isTrump===winIsTrump && play.card.suit===winning.card.suit && rankIndex(play.card.rank)>rankIndex(winning.card.rank)) winning = play;
  }
  var partnerWinning = teamOf(winning.seat) === teamOf(seat);
  var winners = legal.filter(function(c){
    if(c.suit===trump && winning.card.suit!==trump) return true;
    if(c.suit===winning.card.suit && rankIndex(c.rank)>rankIndex(winning.card.rank)) return true;
    return false;
  });
  if(partnerWinning){
    var lowNonTrump = legal.filter(function(c){ return c.suit!==trump; });
    var pool = lowNonTrump.length>0 ? lowNonTrump : legal;
    pool = pool.slice().sort(function(a,b){ return rankIndex(a.rank)-rankIndex(b.rank); });
    return pool[0];
  }
  if(winners.length>0){
    winners.sort(function(a,b){ return rankIndex(a.rank)-rankIndex(b.rank); });
    return winners[0];
  }
  var nonPointCards = legal.filter(function(c){ return cardPoints(c)===0 && c.suit!==trump; });
  var pool2 = nonPointCards.length>0 ? nonPointCards : legal;
  pool2 = pool2.slice().sort(function(a,b){ return rankIndex(a.rank)-rankIndex(b.rank); });
  return pool2[0];
}

return {
  SUITS: SUITS, RANKS: RANKS, CARD_POINTS: CARD_POINTS, TRICK_VALUE: TRICK_VALUE,
  MIN_BID: MIN_BID, BID_INCREMENT: BID_INCREMENT, PHASES: PHASES,
  SUIT_SYMBOL: SUIT_SYMBOL, SUIT_COLOR: SUIT_COLOR,
  rankIndex: rankIndex, cardPoints: cardPoints, cardsEqual: cardsEqual, cardId: cardId,
  makeDeck: makeDeck, shuffle: shuffle, teamOf: teamOf,
  ShelemGame: ShelemGame,
  buildStateForSeat: buildStateForSeat,
  suitCountsOf: suitCountsOf, handStrengthEstimate: handStrengthEstimate,
  botDecideBid: botDecideBid, botChooseDiscard: botChooseDiscard, botChoosePlay: botChoosePlay
};

});
