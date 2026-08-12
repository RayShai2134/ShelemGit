/* Friend DM chat (persistent, one thread per friend pair) and delivery for
 * in-room chat messages (rendering lives in online.js since it's tied to
 * room/seat state; this file just owns the shared append/render helpers and
 * the friend-chat modal).
 */
var activeChatFriendId = null;

function appendChatMessage(container, opts){
  if(!container) return;
  var div = document.createElement('div');
  div.className = 'chat-msg' + (opts.mine ? ' mine' : '');
  var bubble = document.createElement('span');
  bubble.className = 'chat-bubble';
  bubble.textContent = opts.text;
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function openChatModal(friendUserId, friendName, friendAvatar){
  openModal(
    '<h2>'+friendAvatar+' '+friendName+'</h2>' +
    '<div class="chat-messages" id="dm-messages"></div>' +
    '<div class="chat-input-row">' +
      '<input type="text" id="dm-input" maxlength="500" placeholder="'+t('typeMessage')+'">' +
      '<button class="primary" id="dm-send-btn">'+t('send')+'</button>' +
    '</div>'
  );
  activeChatFriendId = friendUserId;
  var messagesEl = document.getElementById('dm-messages');
  apiFetch('/api/messages/'+friendUserId).then(function(data){
    data.messages.forEach(function(m){
      appendChatMessage(messagesEl, { mine: m.senderId===currentUser.id, text: m.body });
    });
  }).catch(function(e){ showToast(e.message); });

  function send(){
    var input = document.getElementById('dm-input');
    var body = input.value.trim();
    if(body.length===0) return;
    Network.sendDirectMessage(friendUserId, body);
    input.value = '';
  }
  document.getElementById('dm-send-btn').onclick = send;
  document.getElementById('dm-input').onkeydown = function(e){ if(e.key==='Enter') send(); };
}

Network.on('directMessage', function(msg){
  if(!isLoggedIn()) return;
  var otherPartyId = msg.senderId===currentUser.id ? msg.recipientId : msg.senderId;
  if(activeChatFriendId===otherPartyId){
    appendChatMessage(document.getElementById('dm-messages'), { mine: msg.senderId===currentUser.id, text: msg.body });
  } else if(msg.senderId!==currentUser.id){
    showToast('💬 ' + msg.body.slice(0, 60));
  }
});
