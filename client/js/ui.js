/* Rendering: hand/table/controls. Reads a `view` object from the global
 * `getView()` (defined in local-game.js for offline, reassigned by online.js
 * for networked games) — never reaches into a raw ShelemGame instance
 * directly, so the same render code works for both modes.
 *
 * `view.mySeat` is the absolute seat (0-3) this browser is playing. Table
 * positions are always relative to that: position 0 = bottom/me, 1 = left,
 * 2 = top/partner, 3 = right. relSeat() converts an absolute seat to its
 * screen position for the viewer sitting at `mySeat`.
 */
function SEAT_NAMES(){ return [t('youLabel'), t('leftLabel'), t('partnerLabel'), t('rightLabel')]; }
var logEntries = [];

function relSeat(actualSeat){
  return (actualSeat - mySeat + 4) % 4;
}

/* The name to display for an absolute seat: the real player/room name when
 * one's available (online games — server-supplied via view.players), else
 * the translated screen-position label (offline vs-bots mode, where there
 * are no real names, just Left/Partner/Right opponents). */
function displayName(view, seat){
  if(view.players && view.players[seat]) return view.players[seat];
  return SEAT_NAMES()[relSeat(seat)];
}

/* Real chosen avatar emoji for online games (server-supplied via
 * view.avatars); offline bots just get a generic robot. */
function displayAvatar(view, seat){
  if(view.avatars && view.avatars[seat]) return view.avatars[seat];
  return '🤖';
}

function log(msg){
  logEntries.push(msg);
  if(logEntries.length>200) logEntries.shift();
  var panel = document.getElementById('log-panel');
  var div = document.createElement('div');
  div.textContent = msg;
  panel.appendChild(div);
  panel.scrollTop = panel.scrollHeight;
}

function sortHand(hand){
  var order = ['spades','hearts','clubs','diamonds'];
  return hand.slice().sort(function(a,b){
    var s = order.indexOf(a.suit) - order.indexOf(b.suit);
    if(s!==0) return s;
    return ShelemEngine.rankIndex(a.rank) - ShelemEngine.rankIndex(b.rank);
  });
}

function applyFanLayout(containerEl){
  var cards = Array.prototype.slice.call(containerEl.children);
  var n = cards.length;
  if(n===0) return;
  var containerWidth = containerEl.clientWidth || 480;
  var cardWidth = cards[0].offsetWidth || 46;
  var maxSpacing = cardWidth * 0.4;
  var spacing = n>1 ? Math.max(9, Math.min(maxSpacing, (containerWidth-cardWidth)/(n-1))) : 0;
  var maxAngle = Math.min(20, n*1.7);
  cards.forEach(function(el, i){
    var t = n>1 ? (i/(n-1)) : 0.5;
    var angle = (t-0.5) * maxAngle;
    var arc = -Math.pow(1-Math.abs(t-0.5)*2, 2) * 10;
    el.style.marginLeft = i===0 ? '0px' : (-(cardWidth-spacing)+'px');
    el.style.setProperty('--rot', angle.toFixed(1)+'deg');
    el.style.setProperty('--arc', arc.toFixed(1)+'px');
    el.style.zIndex = i;
    el.style.transformOrigin = '50% 120%';
  });
}

function cardEl(card, opts){
  opts = opts || {};
  var el = document.createElement('div');
  el.className = 'card' + (opts.mini ? ' mini' : '') + ' ' + ShelemEngine.SUIT_COLOR[card.suit];
  if(opts.playable) el.className += ' playable';
  if(opts.disabled) el.className += ' disabled';
  if(opts.selected) el.className += ' selected';
  var rank = document.createElement('div');
  rank.className = 'rank';
  rank.textContent = card.rank;
  var suit = document.createElement('div');
  suit.className = 'suit';
  suit.textContent = ShelemEngine.SUIT_SYMBOL[card.suit];
  el.appendChild(rank);
  el.appendChild(suit);
  return el;
}

var wasMyTurn = false;
function playTurnSound(){
  try{
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if(!Ctx) return;
    var ctx = new Ctx();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = function(){ ctx.close(); };
  }catch(e){}
}

function renderTrickPile(elId, count){
  var el = document.getElementById(elId);
  el.innerHTML = '';
  var shown = Math.min(count, 8);
  for(var i=0;i<shown;i++){
    var cb = document.createElement('div');
    cb.className = 'cardback';
    cb.style.top = (-i*2)+'px';
    el.appendChild(cb);
  }
}

function render(){
  var PHASES = ShelemEngine.PHASES;
  var view = getView();
  var myTeam = ShelemEngine.teamOf(view.mySeat);
  var oppTeam = 1 - myTeam;

  document.getElementById('score0').textContent = view.teamScores[myTeam];
  document.getElementById('score1').textContent = view.teamScores[oppTeam];
  document.getElementById('score0').className = 'score-val' + (view.teamScores[myTeam]>view.teamScores[oppTeam] ? ' lead':'');
  document.getElementById('score1').className = 'score-val' + (view.teamScores[oppTeam]>view.teamScores[myTeam] ? ' lead':'');
  document.getElementById('target').textContent = view.targetScore;

  var isMyTurn = (view.phase===PHASES.BIDDING && view.seatToBid===view.mySeat) ||
                 (view.phase===PHASES.DISCARDING && view.declarer===view.mySeat) ||
                 (view.phase===PHASES.PLAYING && view.seatToPlay===view.mySeat);
  document.getElementById('seat0-info').classList.toggle('active', isMyTurn);
  document.getElementById('hand-row').classList.toggle('my-turn-glow', isMyTurn);
  if(isMyTurn && !wasMyTurn) playTurnSound();
  wasMyTurn = isMyTurn;

  [0,1,2,3].filter(function(seat){ return seat!==view.mySeat; }).forEach(function(seat){
    var pos = relSeat(seat);
    var info = document.getElementById('seat'+pos+'-info');
    var active = (view.phase===PHASES.BIDDING && view.seatToBid===seat) ||
                 (view.phase===PHASES.PLAYING && view.seatToPlay===seat) ||
                 (view.phase===PHASES.DISCARDING && view.declarer===seat);
    info.className = 'seat-info' + (active ? ' active' : '');
    document.getElementById('seat'+pos+'-name').textContent = displayName(view, seat);
    document.getElementById('seat'+pos+'-avatar').textContent = displayAvatar(view, seat);
    var subText = '';
    if(view.declarer===seat) subText = t('declarerLabel');
    if(view.phase===PHASES.BIDDING && view.passedSeats[seat]) subText = t('passedLabel');
    document.getElementById('seat'+pos+'-sub').textContent = subText;
    var cardsWrap = document.getElementById('seat'+pos+'-cards');
    cardsWrap.innerHTML = '';
    var n = view.handCounts[seat] || 0;
    var showN = Math.min(n, 8);
    for(var i=0;i<showN;i++){
      var cb = document.createElement('div');
      cb.className = 'cardback';
      cardsWrap.appendChild(cb);
    }
  });

  var seat0sub = '';
  if(view.declarer===view.mySeat) seat0sub = t('youAreDeclarer');
  document.getElementById('seat0-sub').textContent = seat0sub;

  var trickGrid = document.getElementById('trick-grid');
  trickGrid.innerHTML = '';
  var trickToShow = uiState.lastTrickCards || view.currentTrick;
  trickToShow.forEach(function(play){
    var slot = document.createElement('div');
    slot.className = 'trick-slot s'+relSeat(play.seat);
    slot.appendChild(cardEl(play.card, {mini:true}));
    trickGrid.appendChild(slot);
  });

  var myTricks = view.tricksWonByTeam[myTeam];
  var oppTricks = view.tricksWonByTeam[oppTeam];
  document.getElementById('my-tricks-count').textContent = myTricks;
  document.getElementById('opp-tricks-count').textContent = oppTricks;
  renderTrickPile('my-tricks-pile', myTricks);
  renderTrickPile('opp-tricks-pile', oppTricks);

  var trumpBadge = document.getElementById('trump-badge');
  if(view.trumpSuit){
    trumpBadge.style.visibility = 'visible';
    document.getElementById('trump-suit-symbol').textContent = ShelemEngine.SUIT_SYMBOL[view.trumpSuit];
    document.getElementById('trump-suit-symbol').style.color = ShelemEngine.SUIT_COLOR[view.trumpSuit]==='red' ? '#e07a8f' : '#e8e4d8';
    document.getElementById('trump-suit-label').textContent = t('trumpLabel', view.trumpSuit);
  } else {
    trumpBadge.style.visibility = 'hidden';
  }

  var bidInfo = document.getElementById('bid-info');
  var bidStatusBox = document.getElementById('bid-status-box');
  if(view.phase===PHASES.BIDDING){
    bidInfo.innerHTML = view.currentBid>0
      ? t('currentBidBy', view.currentBid, displayName(view, view.currentBidder))
      : t('biddingMinimum');
    bidStatusBox.style.display = 'block';
  } else if(view.phase===PHASES.DISCARDING){
    bidInfo.innerHTML = t('wonBidPickup', displayName(view, view.declarer), view.currentBid);
    bidStatusBox.style.display = 'block';
  } else if(view.phase===PHASES.PLAYING || view.phase===PHASES.HAND_COMPLETE){
    bidInfo.innerHTML = t('needsToWin', displayName(view, view.declarer), view.currentBid) + '<br>' +
      t('thisHand', view.capturedPointsByTeam[myTeam], view.capturedPointsByTeam[oppTeam]);
    bidStatusBox.style.display = 'block';
  } else {
    bidInfo.innerHTML = '';
    bidStatusBox.style.display = 'none';
  }

  renderHandAndControls(view);
}

function renderHandAndControls(view){
  var PHASES = ShelemEngine.PHASES;
  view = view || getView();
  var handRow = document.getElementById('hand-row');
  var controls = document.getElementById('controls');
  var summaryArea = document.getElementById('summary-area');
  handRow.innerHTML = '';
  controls.innerHTML = '';
  summaryArea.innerHTML = '';

  var hand = sortHand(view.myHand || []);
  if(uiState.sortDescending) hand.reverse();

  if(view.phase===PHASES.BIDDING){
    hand.forEach(function(c){ handRow.appendChild(cardEl(c)); });
    if(view.seatToBid===view.mySeat){
      var minAllowed = view.currentBid===0 ? ShelemEngine.MIN_BID : view.currentBid+ShelemEngine.BID_INCREMENT;
      var step = ShelemEngine.BID_INCREMENT;
      var panel = document.createElement('div');
      panel.className = 'bidding-panel';

      var stepperRow = document.createElement('div');
      stepperRow.className = 'bid-stepper-row';
      var minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'bid-stepper-btn';
      minusBtn.textContent = '−';
      var amountInput = document.createElement('input');
      amountInput.type = 'number';
      amountInput.id = 'bid-amount-input';
      amountInput.step = step;
      amountInput.min = minAllowed;
      amountInput.value = minAllowed;
      var plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'bid-stepper-btn';
      plusBtn.textContent = '+';
      minusBtn.onclick = function(){
        var v = Math.max(minAllowed, (parseInt(amountInput.value,10)||minAllowed) - step);
        amountInput.value = v;
      };
      plusBtn.onclick = function(){
        amountInput.value = (parseInt(amountInput.value,10)||minAllowed) + step;
      };
      stepperRow.appendChild(minusBtn);
      stepperRow.appendChild(amountInput);
      stepperRow.appendChild(plusBtn);
      panel.appendChild(stepperRow);

      var actionRow = document.createElement('div');
      actionRow.className = 'bid-action-row';
      var bidBtn = document.createElement('button');
      bidBtn.className = 'primary';
      bidBtn.textContent = 'Bid';
      bidBtn.onclick = function(){
        var v = parseInt(amountInput.value, 10);
        if(isNaN(v) || v<minAllowed || (v-minAllowed)%step!==0){
          showToast(t('bidValidation', minAllowed, step));
          return;
        }
        submitBid(v);
      };
      var passBtn = document.createElement('button');
      passBtn.textContent = t('pass');
      passBtn.onclick = function(){ submitPass(); };
      actionRow.appendChild(bidBtn);
      actionRow.appendChild(passBtn);
      panel.appendChild(actionRow);

      controls.appendChild(panel);
    } else {
      var waitMsg = document.createElement('div');
      waitMsg.style.color = 'var(--muted)';
      waitMsg.style.fontSize = '13px';
      waitMsg.textContent = t('waitingFor', displayName(view, view.seatToBid));
      controls.appendChild(waitMsg);
    }
  }

  else if(view.phase===PHASES.DISCARDING){
    if(view.declarer===view.mySeat){
      hand.forEach(function(c){
        var selected = uiState.selectedDiscard.some(function(sc){ return ShelemEngine.cardsEqual(sc,c); });
        var el = cardEl(c, {playable:true, selected:selected});
        el.onclick = function(card){ return function(){ toggleDiscardSelect(card); }; }(c);
        handRow.appendChild(el);
      });
      var info = document.createElement('div');
      info.style.cssText = 'width:100%;text-align:center;font-size:13px;color:var(--muted);margin-bottom:6px;';
      info.textContent = t('discardSelect', uiState.selectedDiscard.length);
      controls.appendChild(info);
      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'primary';
      confirmBtn.textContent = t('discardSelected');
      confirmBtn.disabled = uiState.selectedDiscard.length !== 4;
      confirmBtn.onclick = function(){ submitDiscard(uiState.selectedDiscard); };
      controls.appendChild(confirmBtn);
    } else {
      hand.forEach(function(c){ handRow.appendChild(cardEl(c)); });
      var waitMsg2 = document.createElement('div');
      waitMsg2.style.color = 'var(--muted)';
      waitMsg2.style.fontSize = '13px';
      waitMsg2.textContent = t('isDiscarding', displayName(view, view.declarer));
      controls.appendChild(waitMsg2);
    }
  }

  else if(view.phase===PHASES.PLAYING){
    var legal = view.seatToPlay===view.mySeat ? (view.legalPlaysForMe || []) : [];
    hand.forEach(function(c){
      var isLegal = view.seatToPlay===view.mySeat && legal.some(function(lc){ return ShelemEngine.cardsEqual(lc,c); });
      var el = cardEl(c, {playable:isLegal, disabled: view.seatToPlay===view.mySeat && !isLegal});
      if(isLegal){
        el.onclick = function(card, cardEl){ return function(){
          if(uiState.locked) return;
          uiState.locked = true;
          cardEl.classList.add('playing-out');
          setTimeout(function(){ uiState.locked = false; submitPlay(card); }, 170);
        }; }(c, el);
      }
      handRow.appendChild(el);
    });
    if(view.seatToPlay!==view.mySeat){
      var waitMsg3 = document.createElement('div');
      waitMsg3.style.color = 'var(--muted)';
      waitMsg3.style.fontSize = '13px';
      waitMsg3.textContent = t('waitingFor', displayName(view, view.seatToPlay));
      controls.appendChild(waitMsg3);
    }
  }

  else if(view.phase===PHASES.HAND_COMPLETE){
    var r = view.lastHandResult;
    var myTeam = ShelemEngine.teamOf(view.mySeat);
    var card = document.createElement('div');
    card.className = 'summary-card';
    var teamLabel = r.declarerTeam===myTeam ? t('yourTeam') : t('opponents');
    card.innerHTML =
      '<h3>' + t('handResultTitle', view.handNumber) + '</h3>' +
      '<p>' + t('declaredBid', displayName(view, r.declarer), r.bid) + '</p>' +
      '<p>' + t('captured', teamLabel, r.declarerPoints) + '</p>' +
      '<p class="' + (r.madeBid ? 'result-made' : 'result-set') + '">' +
        (r.madeBid ? t('madeBid', teamLabel, r.declarerPoints) : t('wasSet', teamLabel, r.bid)) +
      '</p>';
    summaryArea.appendChild(card);
    var nextBtn = document.createElement('button');
    nextBtn.className = 'primary';
    nextBtn.textContent = t('continueNextHand');
    nextBtn.onclick = function(){ submitNextHand(); };
    controls.appendChild(nextBtn);
  }

  else if(view.phase===PHASES.GAME_COMPLETE){
    var myTeam2 = ShelemEngine.teamOf(view.mySeat);
    var winnerLabel = view.gameWinner===myTeam2 ? t('yourTeam') : t('opponents');
    var card2 = document.createElement('div');
    card2.className = 'summary-card';
    card2.innerHTML =
      '<h3>' + t('gameOverTitle') + '</h3>' +
      '<p>' + t('gameOverResult', winnerLabel, view.teamScores[myTeam2], view.teamScores[1-myTeam2]) + '</p>';
    summaryArea.appendChild(card2);
    var newGameBtn = document.createElement('button');
    newGameBtn.className = 'primary';
    newGameBtn.textContent = t('newGame');
    newGameBtn.onclick = function(){ submitNewGame(); };
    controls.appendChild(newGameBtn);
  }

  applyFanLayout(handRow);
}
