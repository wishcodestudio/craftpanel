import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  if (socket?.connected) return socket;
  if (socket) socket.disconnect();
  socket = io('/', {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}

export default { getSocket, disconnectSocket };
