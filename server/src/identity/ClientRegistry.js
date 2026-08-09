/* Maps a connected socket to the room/seat it occupies. This is the security
 * boundary for turn actions: the server always resolves "which seat is this
 * socket allowed to act as" from here, never from a client-supplied seat
 * number, so one player can't spoof another's move.
 *
 * Phase 1 scope: socket <-> {clientId, roomCode, seat} bookkeeping only.
 * Reconnect grace-period / bot-takeover-on-timeout logic is added in Phase 4,
 * on top of this same map (keyed by clientId so a reconnecting browser can be
 * matched back to its seat).
 */
class ClientRegistry{
  constructor(){
    this._bySocketId = new Map();   // socketId -> {clientId, name, roomCode, seat}
    this._byClientId = new Map();   // clientId -> socketId (most recent)
  }

  bind(socketId, clientId, name, roomCode, seat){
    this._bySocketId.set(socketId, { clientId: clientId, name: name, roomCode: roomCode, seat: seat });
    this._byClientId.set(clientId, socketId);
  }

  get(socketId){
    return this._bySocketId.get(socketId) || null;
  }

  findByClientId(clientId){
    var socketId = this._byClientId.get(clientId);
    if(!socketId) return null;
    var entry = this._bySocketId.get(socketId);
    return entry ? Object.assign({ socketId: socketId }, entry) : null;
  }

  unbind(socketId){
    var entry = this._bySocketId.get(socketId);
    this._bySocketId.delete(socketId);
    if(entry && this._byClientId.get(entry.clientId)===socketId){
      this._byClientId.delete(entry.clientId);
    }
    return entry || null;
  }
}

module.exports = ClientRegistry;
