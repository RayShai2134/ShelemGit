/* Tracks which logged-in accounts currently have an active Socket.io
 * connection. Counts sockets per user (not a boolean) so a friend with
 * two tabs/devices open doesn't flicker offline when one closes.
 */
var onlineCounts = new Map(); // userId -> active socket count

function markOnline(userId){
  onlineCounts.set(userId, (onlineCounts.get(userId) || 0) + 1);
}

function markOffline(userId){
  var n = (onlineCounts.get(userId) || 0) - 1;
  if(n<=0) onlineCounts.delete(userId);
  else onlineCounts.set(userId, n);
}

function isOnline(userId){
  return onlineCounts.has(userId);
}

module.exports = { markOnline: markOnline, markOffline: markOffline, isOnline: isOnline };
