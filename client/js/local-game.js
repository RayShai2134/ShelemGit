/* Offline "Play vs bots" mode: runs ShelemGame entirely in-browser, no server
 * involved. Exposes the mode-agnostic surface ui.js renders against:
 *   - getView(): returns a redacted view object (same shape the server sends
 *     for online games), rebuilt fresh from `game` on every call.
 *   - submitBid/submitPass/submitDiscard/submitPlay/submitNextHand/submitNewGame:
 *     swappable action entry points. Defined here as direct local-engine
 *     mutations; online.js reassigns them to network sends when a multiplayer
 *     game starts, and resetToLocalMode() restores these originals when
 *     returning to offline play.
 */
var mySeat = 0;
var game = new ShelemEngine.ShelemGame(['You','Left','Partner','Right'], {targetScore: profile.targetScore || 500, direction:1});
var uiState = { lastTrickCards:null, selectedDiscard:[], sortDescending:false, locked:false, direction:1 };

function getView(){
  return ShelemEngine.buildStateForSeat(game, mySeat);
}

function toggleDiscardSelect(card){
  var idx = uiState.selectedDiscard.findIndex(function(c){ return ShelemEngine.cardsEqual(c,card); });
  if(idx>=0){ uiState.selectedDiscard.splice(idx,1); }
  else if(uiState.selectedDiscard.length<4){ uiState.selectedDiscard.push(card); }
  render();
}

function localSubmitBid(amount){
  game.bid(mySeat, amount);
  log(t('logYouBid', amount));
  render(); tick();
}
function localSubmitPass(){
  game.pass(mySeat);
  log(t('logYouPassed'));
  render(); tick();
}
function localSubmitDiscard(cards){
  game.discard(mySeat, cards);
  log(t('logYouDiscarded', (cards.reduce(function(s,c){return s+ShelemEngine.cardPoints(c);},0)+ShelemEngine.TRICK_VALUE)));
  uiState.selectedDiscard = [];
  render(); tick();
}
function localSubmitPlay(card){
  playAndAdvance(mySeat, card);
}
function localSubmitNextHand(){
  game.startNextHand();
  log(t('logHandBegins', game.handNumber, SEAT_NAMES()[relSeat(game.dealerSeat)]));
  render(); tick();
}
function localSubmitNewGame(){
  game = new ShelemEngine.ShelemGame(['You','Left','Partner','Right'], {targetScore: profile.targetScore || 500, direction: uiState.direction});
  uiState.lastTrickCards = null;
  uiState.selectedDiscard = [];
  log(t('logNewGame'));
  render(); tick();
}

var submitBid = localSubmitBid;
var submitPass = localSubmitPass;
var submitDiscard = localSubmitDiscard;
var submitPlay = localSubmitPlay;
var submitNextHand = localSubmitNextHand;
var submitNewGame = localSubmitNewGame;

function resetToLocalMode(){
  mySeat = 0;
  submitBid = localSubmitBid;
  submitPass = localSubmitPass;
  submitDiscard = localSubmitDiscard;
  submitPlay = localSubmitPlay;
  submitNextHand = localSubmitNextHand;
  submitNewGame = localSubmitNewGame;
}

function playAndAdvance(seat, card){
  var wasCompleting = game.currentTrick.length===3;
  var snapshot = wasCompleting ? game.currentTrick.concat([{seat:seat, card:card}]) : null;
  var result = game.playCard(seat, card);
  log(t('logPlaysCard', SEAT_NAMES()[relSeat(seat)], card.rank, card.suit));

  if(result.trickComplete){
    uiState.lastTrickCards = snapshot;
    render();
    log(t('logWinsTrick', SEAT_NAMES()[relSeat(result.trickWinner)]));
    setTimeout(function(){
      var tg = document.getElementById('trick-grid');
      tg.style.opacity = '0';
      setTimeout(function(){
        uiState.lastTrickCards = null;
        render();
        var tg2 = document.getElementById('trick-grid');
        tg2.style.opacity = '0';
        requestAnimationFrame(function(){ tg2.style.opacity = '1'; });
        tick();
      }, 200);
    }, 850);
  } else {
    render();
    tick();
  }
}

function doBotBid(seat){
  var decision = ShelemEngine.botDecideBid(game, seat);
  if(decision.action==='bid'){
    game.bid(seat, decision.amount);
    log(t('logBids', SEAT_NAMES()[relSeat(seat)], decision.amount));
  } else {
    game.pass(seat);
    log(t('logPasses', SEAT_NAMES()[relSeat(seat)]));
  }
}

function doBotDiscard(){
  var seat = game.declarer;
  var toDiscard = ShelemEngine.botChooseDiscard(game.hands[seat]);
  game.discard(seat, toDiscard);
  log(t('logDiscards', SEAT_NAMES()[relSeat(seat)]));
}

function tick(){
  var PHASES = ShelemEngine.PHASES;
  if(game.phase===PHASES.GAME_COMPLETE || game.phase===PHASES.HAND_COMPLETE){
    render();
    return;
  }
  if(game.phase===PHASES.BIDDING){
    var prevHandNumber = game.handNumber;
    if(game.seatToBid!==mySeat){
      setTimeout(function(){
        doBotBid(game.seatToBid);
        if(game.handNumber!==prevHandNumber) log(t('logAllPassed'));
        render();
        tick();
      }, 650);
    } else { render(); }
  } else if(game.phase===PHASES.DISCARDING){
    if(game.declarer!==mySeat){
      setTimeout(function(){
        doBotDiscard();
        render();
        tick();
      }, 650);
    } else { render(); }
  } else if(game.phase===PHASES.PLAYING){
    if(game.seatToPlay!==mySeat){
      setTimeout(function(){
        var seat = game.seatToPlay;
        var card = ShelemEngine.botChoosePlay(game, seat);
        playAndAdvance(seat, card);
      }, 650);
    } else { render(); }
  }
}
