/* Farsi/English text switching for UI chrome. Card ranks/suits and the table
 * layout itself stay as-is in both languages (only vocabulary changes, no
 * RTL mirroring of the board) — the ambiguity of mirroring a card table
 * isn't worth the layout risk for what's fundamentally a text preference.
 */
var STRINGS = {
  en: {
    appSubtitle: 'A Persian card game platform',
    playOnline: 'Play online', playFriends: 'Play vs friends', playBots: 'Play vs bots',
    readyToPlay: 'Ready to play', tapToEdit: 'Tap to edit',
    menuBack: '← Menu', options: 'Options', youPartner: 'You & partner', opponents: 'Opponents', target: 'Target',
    sortHand: 'Sort your hand', weakToStrong: 'Weak → strong', strongToWeak: 'Strong → weak',
    turnDirection: 'Turn direction', clockwise: 'Clockwise', counterclockwise: 'Counterclockwise',
    showLog: 'Show game log', hideLog: 'Hide game log',
    editProfile: 'Edit profile', yourName: 'Your name', chooseAvatar: 'Choose an avatar', cancel: 'Cancel', save: 'Save',
    friends: 'Friends', noFriendsYet: 'No friends added yet.',
    close: 'Close', addFriend: 'Add friend', remove: 'Remove',
    buyCoins: 'Buy coins', coins: 'coins',
    moreAvatars: 'Shop for more avatars', avatarShop: 'Avatar shop', equip: 'Equip', equipped: 'Equipped',
    coinBalance: function(n){ return 'You have ' + n + ' coins'; },
    purchaseSuccess: 'Purchase complete — coins added!', purchaseCancelled: 'Purchase cancelled.',
    entryFeeLabel: 'Choose a buy-in — charged to every seated player, winning team splits the pot',
    wagerTierLabel: function(fee, maxWin){ return fee + ' 🪙 buy-in <span class="muted">— win up to ' + maxWin + ' 🪙</span>'; },
    mustPickWager: 'Choose a buy-in first.',
    gotIt: 'Got it', settings: 'Settings', settingsTargetLabel: 'Winning target score (for new games)',
    settingsCustomPlaceholder: 'Custom target (multiple of 5)',
    settingsFooter: 'Sound, sort order, and turn direction can be found inside a game under Options.',
    language: 'Language', custom: 'Custom',
    howToPlayTitle: 'How to play Shelem',
    rulesBasicsTitle: 'The basics', rulesBasicsBody: 'Shelem is a 4-player trick-taking card game played in two partnerships — you and the player across from you versus the two players on either side.',
    rulesDealingTitle: 'Dealing', rulesDealingBody: 'Each player gets 12 cards. The last 4 cards form the widow, set aside in the middle.',
    rulesBiddingTitle: 'Bidding', rulesBiddingBody: 'Starting to the dealer\'s left, players bid in multiples of 5 (minimum 100) for the right to pick up the widow, or pass. The highest bidder becomes the declarer.',
    rulesWidowTitle: 'The widow and trump', rulesWidowBody: 'The declarer picks up the widow, then discards 4 cards face down (these count toward their team\'s score). The declarer leads the first card of play — whatever suit that card is becomes trump for the whole hand.',
    rulesTricksTitle: 'Playing tricks', rulesTricksBody: 'Follow the suit that was led if you can. If you can\'t, you may play any card, including trump. The highest trump played wins the trick; if no trump was played, the highest card of the suit led wins. The winner leads the next trick.',
    rulesScoringTitle: 'Scoring', rulesScoringBody: 'Aces and tens are worth 10 points, fives are worth 5, and every trick is worth 5 more. If the declarer\'s team captures at least as many points as they bid, they score those points. If not, they lose points equal to their bid. The defending team always scores whatever they captured.',
    rulesWinningTitle: 'Winning', rulesWinningBody: 'Hands are played until one team reaches the target score.',
    playVsFriendsTitle: 'Play vs friends', playVsFriendsHint: 'Create a room and share the code, or join one a friend sent you.',
    createRoom: 'Create room', roomCodePlaceholder: 'Room code', joinRoom: 'Join room',
    roomCodeLabel: 'Room code', emptySeat: 'Empty seat', disconnectedTag: ' (disconnected)', botTag: ' (bot)', hostTag: ' — host',
    fillWithBots: 'Fill remaining seats with bots', startGame: 'Start game', waitingForHost: 'Waiting for the host to start...',
    leaveRoomBtn: 'Leave room',
    bid: 'Bid', pass: 'Pass', discardSelected: 'Discard selected', continueNextHand: 'Continue to next hand', newGame: 'New game',
    yourTeam: 'Your team', yourTricks: 'Your tricks', oppTricks: 'Opp tricks',
    discardSelect: function(n){ return 'Select 4 cards to discard (' + n + '/4)'; },
    waitingFor: function(name){ return 'Waiting for ' + name + '...'; },
    isDiscarding: function(name){ return name + ' is discarding...'; },
    biddingMinimum: 'Bidding<br>minimum 100',
    currentBidBy: function(amount, name){ return 'Current bid<br><b>'+amount+'</b> by '+name; },
    wonBidPickup: function(name, amount){ return name+' won the bid<br>at <b>'+amount+'</b>, picking up the widow'; },
    needsToWin: function(name, amount){ return name+'\'s team needs <b>'+amount+'</b> to win the hand'; },
    thisHand: function(mine, opp){ return 'This hand — You: <b>'+mine+'</b>, Opponents: <b>'+opp+'</b>'; },
    handResultTitle: function(n){ return 'Hand ' + n + ' result'; },
    declaredBid: function(name, amount){ return name+' declared and bid <b>'+amount+'</b>'; },
    captured: function(team, pts){ return team+' captured <b>'+pts+'</b> points'; },
    madeBid: function(team, pts){ return team+' made the bid, scoring '+pts+' points'; },
    wasSet: function(team, amount){ return team+' were set, losing '+amount+' points'; },
    gameOverTitle: 'Game over', gameOverResult: function(team, a, b){ return '<b>'+team+' win</b>, '+a+' - '+b; },
    bidValidation: function(min, step){ return 'Bid must be ' + min + ' or more, in steps of ' + step + '.'; },
    youAreDeclarer: 'You are the declarer', declarerLabel: 'Declarer', passedLabel: 'Passed',
    trumpLabel: function(s){ return 'Trump: ' + s; },
    leftLabel: 'Left', partnerLabel: 'Partner', rightLabel: 'Right', youLabel: 'You',
    disconnectedFromServer: 'Disconnected from server.',
    logNewGameStart: function(target){ return 'New game started — first to ' + target + ' wins'; },
    logDealerBidding: function(dealer, bidder){ return 'Dealer: '+dealer+'. Bidding begins with '+bidder; },
    logYouBid: function(amount){ return 'You bid ' + amount; },
    logYouPassed: 'You passed',
    logYouDiscarded: function(pts){ return 'You discarded 4 cards; your team collects ' + pts + ' points from the widow'; },
    logHandBegins: function(n, dealer){ return '--- Hand ' + n + ' begins, dealer: ' + dealer + ' ---'; },
    logNewGame: 'New game started',
    logAllPassed: 'All players passed — reshuffling and dealing again',
    logPlaysCard: function(name, rank, suit){ return name + ' plays ' + rank + ' of ' + suit; },
    logWinsTrick: function(name){ return name + ' wins the trick'; },
    logBids: function(name, amount){ return name + ' bids ' + amount; },
    logPasses: function(name){ return name + ' passes'; },
    logDiscards: function(name){ return name + ' discards 4 cards from the widow'; },
    findingPlayers: 'Finding players… this may take up to 20 seconds.',
    matchStarting: 'Match found — starting…',
    teamA: 'Team A', teamB: 'Team B', tapToSit: 'Tap a seat to change teams',
    friendsLoginPrompt: 'Sign in with a real account to add friends, and to save your name, avatar, and coins across devices.',
    logInSignUp: 'Log in / Sign up', loading: 'Loading…',
    incomingRequests: 'Friend requests', yourFriends: 'Your friends', outgoingRequests: 'Sent requests',
    pending: 'Pending', addByUsername: "Add by username", requestSent: 'Friend request sent.',
    accept: 'Accept', decline: 'Decline',
    signUp: 'Sign up', logIn: 'Log in', username: 'Username', email: 'Email', password: 'Password',
    haveAccount: 'Already have an account?', needAccount: "Don't have an account?",
    welcomeBack: 'Welcome!', logOut: 'Log out', loggedInAs: function(u){ return 'Signed in as @'+u; },
    online: 'Online', offline: 'Offline',
    statGames: 'Games', statWins: 'Wins', statLosses: 'Losses', statWinRate: 'Win rate',
    showChat: 'Show chat', hideChat: 'Hide chat', send: 'Send', typeMessage: 'Type a message…'
  },
  fa: {
    appSubtitle: 'یک بازی ورق ایرانی',
    playOnline: 'بازی آنلاین', playFriends: 'بازی با دوستان', playBots: 'بازی با ربات‌ها',
    readyToPlay: 'آماده بازی', tapToEdit: 'برای ویرایش بزنید',
    menuBack: '← منو', options: 'تنظیمات', youPartner: 'شما و هم‌تیمی', opponents: 'حریفان', target: 'هدف',
    sortHand: 'چیدمان دست شما', weakToStrong: 'ضعیف ← قوی', strongToWeak: 'قوی ← ضعیف',
    turnDirection: 'جهت نوبت', clockwise: 'ساعت‌گرد', counterclockwise: 'پادساعت‌گرد',
    showLog: 'نمایش گزارش بازی', hideLog: 'پنهان کردن گزارش',
    editProfile: 'ویرایش پروفایل', yourName: 'نام شما', chooseAvatar: 'یک آواتار انتخاب کنید', cancel: 'انصراف', save: 'ذخیره',
    friends: 'دوستان', noFriendsYet: 'هنوز دوستی اضافه نشده.',
    close: 'بستن', addFriend: 'افزودن دوست', remove: 'حذف',
    buyCoins: 'خرید سکه', coins: 'سکه',
    moreAvatars: 'خرید آواتار بیشتر', avatarShop: 'فروشگاه آواتار', equip: 'استفاده', equipped: 'در حال استفاده',
    coinBalance: function(n){ return 'موجودی شما: ' + n + ' سکه'; },
    purchaseSuccess: 'خرید انجام شد — سکه‌ها اضافه شد!', purchaseCancelled: 'خرید لغو شد.',
    entryFeeLabel: 'یک ورودی انتخاب کنید — از همه بازیکنان نشسته کسر می‌شود، تیم برنده کل مبلغ را می‌برد',
    wagerTierLabel: function(fee, maxWin){ return fee + ' 🪙 ورودی <span class="muted">— تا ' + maxWin + ' 🪙 ببرید</span>'; },
    mustPickWager: 'ابتدا یک ورودی انتخاب کنید.',
    gotIt: 'متوجه شدم', settings: 'تنظیمات', settingsTargetLabel: 'امتیاز هدف برد (برای بازی‌های جدید)',
    settingsCustomPlaceholder: 'عدد دلخواه (مضرب ۵)',
    settingsFooter: 'صدا، ترتیب چیدمان و جهت نوبت را می‌توانید داخل بازی از بخش تنظیمات پیدا کنید.',
    language: 'زبان', custom: 'دلخواه',
    howToPlayTitle: 'قوانین شلم',
    rulesBasicsTitle: 'اصول بازی', rulesBasicsBody: 'شلم یک بازی ورق چهار نفره با روند بردن دست است که به‌صورت دو تیمی بازی می‌شود — شما و بازیکن روبروی‌تان در برابر دو بازیکن کناری.',
    rulesDealingTitle: 'پخش ورق', rulesDealingBody: 'به هر بازیکن ۱۲ ورق داده می‌شود. ۴ ورق آخر به‌عنوان «حکم وسط» کنار گذاشته می‌شود.',
    rulesBiddingTitle: 'حراج', rulesBiddingBody: 'از سمت چپ دست‌دهنده شروع می‌شود، بازیکنان با مضرب ۵ (حداقل ۱۰۰) برای گرفتن حکم وسط پیشنهاد می‌دهند یا پاس می‌دهند. بالاترین پیشنهاددهنده حاکم می‌شود.',
    rulesWidowTitle: 'حکم وسط و خال حکم', rulesWidowBody: 'حاکم حکم وسط را برمی‌دارد، سپس ۴ ورق را رو به پایین دور می‌ریزد (این ورق‌ها به امتیاز تیمش اضافه می‌شود). حاکم اولین کارت بازی را می‌زند — خال آن کارت، خال حکم کل دست می‌شود.',
    rulesTricksTitle: 'بازی دست‌ها', rulesTricksBody: 'اگر می‌توانید، باید هم‌خال کارت اول بازی کنید. اگر نمی‌توانید، هر کارتی از جمله حکم می‌توانید بزنید. بالاترین حکم بازی‌شده دست را می‌برد؛ اگر حکمی زده نشده باشد، بالاترین کارت از خال زده‌شده برنده است. برنده، دست بعدی را شروع می‌کند.',
    rulesScoringTitle: 'امتیازدهی', rulesScoringBody: 'آس و ده هرکدام ۱۰ امتیاز، پنج ۵ امتیاز، و هر دست بردن ۵ امتیاز اضافه دارد. اگر تیم حاکم به اندازه پیشنهادش امتیاز بگیرد، همان امتیاز را کسب می‌کند؛ در غیر این صورت به اندازه پیشنهادش امتیاز کم می‌کند. تیم مدافع همیشه امتیازی که گرفته را کسب می‌کند.',
    rulesWinningTitle: 'برد بازی', rulesWinningBody: 'دست‌ها تا زمانی که یک تیم به امتیاز هدف برسد ادامه پیدا می‌کند.',
    playVsFriendsTitle: 'بازی با دوستان', playVsFriendsHint: 'یک اتاق بسازید و کد آن را به اشتراک بگذارید، یا با کدی که دوستتان فرستاده وارد شوید.',
    createRoom: 'ساخت اتاق', roomCodePlaceholder: 'کد اتاق', joinRoom: 'ورود به اتاق',
    roomCodeLabel: 'کد اتاق', emptySeat: 'صندلی خالی', disconnectedTag: ' (قطع شده)', botTag: ' (ربات)', hostTag: ' — میزبان',
    fillWithBots: 'پر کردن صندلی‌های خالی با ربات', startGame: 'شروع بازی', waitingForHost: 'در انتظار شروع بازی توسط میزبان...',
    leaveRoomBtn: 'ترک اتاق',
    bid: 'پیشنهاد', pass: 'پاس', discardSelected: 'دور ریختن انتخاب‌شده‌ها', continueNextHand: 'ادامه به دست بعد', newGame: 'بازی جدید',
    yourTeam: 'تیم شما', yourTricks: 'دست‌های شما', oppTricks: 'دست‌های حریف',
    discardSelect: function(n){ return 'چهار کارت برای دور ریختن انتخاب کنید (' + n + '/۴)'; },
    waitingFor: function(name){ return 'در انتظار ' + name + '...'; },
    isDiscarding: function(name){ return name + ' در حال دور ریختن است...'; },
    biddingMinimum: 'حراج<br>حداقل ۱۰۰',
    currentBidBy: function(amount, name){ return 'پیشنهاد فعلی<br><b>'+amount+'</b> توسط '+name; },
    wonBidPickup: function(name, amount){ return name+' برنده حراج شد<br>با <b>'+amount+'</b>، و حکم وسط را برمی‌دارد'; },
    needsToWin: function(name, amount){ return 'تیم '+name+' برای بردن این دست به <b>'+amount+'</b> امتیاز نیاز دارد'; },
    thisHand: function(mine, opp){ return 'این دست — شما: <b>'+mine+'</b>، حریفان: <b>'+opp+'</b>'; },
    handResultTitle: function(n){ return 'نتیجه دست ' + n; },
    declaredBid: function(name, amount){ return name+' حاکم شد و <b>'+amount+'</b> پیشنهاد داد'; },
    captured: function(team, pts){ return team+' <b>'+pts+'</b> امتیاز گرفت'; },
    madeBid: function(team, pts){ return team+' به پیشنهادش رسید و '+pts+' امتیاز گرفت'; },
    wasSet: function(team, amount){ return team+' نتوانست به پیشنهادش برسد و '+amount+' امتیاز از دست داد'; },
    gameOverTitle: 'پایان بازی', gameOverResult: function(team, a, b){ return '<b>'+team+' برنده شد</b>، '+a+' - '+b; },
    bidValidation: function(min, step){ return 'پیشنهاد باید حداقل ' + min + ' و مضربی از ' + step + ' باشد.'; },
    youAreDeclarer: 'شما حاکم هستید', declarerLabel: 'حاکم', passedLabel: 'پاس داد',
    trumpLabel: function(s){ return 'حکم: ' + s; },
    leftLabel: 'چپ', partnerLabel: 'هم‌تیمی', rightLabel: 'راست', youLabel: 'شما',
    disconnectedFromServer: 'ارتباط با سرور قطع شد.',
    logNewGameStart: function(target){ return 'بازی جدید شروع شد — اولین تیمی که به ' + target + ' برسد برنده است'; },
    logDealerBidding: function(dealer, bidder){ return 'دست‌دهنده: '+dealer+'. حراج با '+bidder+' شروع می‌شود'; },
    logYouBid: function(amount){ return 'شما ' + amount + ' پیشنهاد دادید'; },
    logYouPassed: 'شما پاس دادید',
    logYouDiscarded: function(pts){ return 'شما ۴ کارت دور ریختید؛ تیم شما ' + pts + ' امتیاز از حکم وسط می‌گیرد'; },
    logHandBegins: function(n, dealer){ return '--- دست ' + n + ' شروع شد، دست‌دهنده: ' + dealer + ' ---'; },
    logNewGame: 'بازی جدید شروع شد',
    logAllPassed: 'همه پاس دادند — ورق‌ها دوباره پخش می‌شود',
    logPlaysCard: function(name, rank, suit){ return name + ' کارت ' + rank + ' ' + suit + ' را بازی کرد'; },
    logWinsTrick: function(name){ return name + ' این دست را برد'; },
    logBids: function(name, amount){ return name + ' ' + amount + ' پیشنهاد داد'; },
    logPasses: function(name){ return name + ' پاس داد'; },
    logDiscards: function(name){ return name + ' چهار کارت از حکم وسط دور ریخت'; },
    findingPlayers: 'در حال یافتن بازیکن… ممکن است تا ۲۰ ثانیه طول بکشد.',
    matchStarting: 'بازی پیدا شد — در حال شروع…',
    teamA: 'تیم آ', teamB: 'تیم ب', tapToSit: 'برای تغییر تیم روی یک صندلی بزنید',
    friendsLoginPrompt: 'برای افزودن دوست و ذخیره نام، آواتار و سکه‌هایتان در همه دستگاه‌ها، با یک حساب واقعی وارد شوید.',
    logInSignUp: 'ورود / ثبت‌نام', loading: 'در حال بارگذاری…',
    incomingRequests: 'درخواست‌های دوستی', yourFriends: 'دوستان شما', outgoingRequests: 'درخواست‌های ارسالی',
    pending: 'در انتظار', addByUsername: 'افزودن با نام کاربری', requestSent: 'درخواست دوستی ارسال شد.',
    accept: 'پذیرفتن', decline: 'رد کردن',
    signUp: 'ثبت‌نام', logIn: 'ورود', username: 'نام کاربری', email: 'ایمیل', password: 'رمز عبور',
    haveAccount: 'قبلاً حساب دارید؟', needAccount: 'حساب ندارید؟',
    welcomeBack: 'خوش آمدید!', logOut: 'خروج', loggedInAs: function(u){ return 'وارد شده به‌عنوان @'+u; },
    online: 'آنلاین', offline: 'آفلاین',
    statGames: 'بازی‌ها', statWins: 'بردها', statLosses: 'باخت‌ها', statWinRate: 'درصد برد',
    showChat: 'نمایش گفتگو', hideChat: 'پنهان کردن گفتگو', send: 'ارسال', typeMessage: 'پیام بنویسید…'
  }
};

function currentLang(){ return (profile && profile.language==='fa') ? 'fa' : 'en'; }

function t(key){
  var dict = STRINGS[currentLang()] || STRINGS.en;
  var val = dict[key];
  if(val===undefined) val = STRINGS.en[key];
  if(typeof val==='function'){
    var args = Array.prototype.slice.call(arguments, 1);
    return val.apply(null, args);
  }
  return val;
}

function applyStaticTranslations(){
  document.querySelectorAll('[data-i18n]').forEach(function(el){
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el){
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
}

/* profile.js (loaded just before this file) already read the persisted
 * language by this point, so applying translations here reflects it from
 * the very first paint instead of only after a manual language switch. */
applyStaticTranslations();
if(typeof renderProfileBar==='function') renderProfileBar(); // profile-subtext has no data-i18n (login-state-aware), needs its own refresh
