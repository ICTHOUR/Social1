import { io, Socket } from 'socket.io-client';
import { getApiBaseUrl } from './nativeInit.ts';

let socketInstance: Socket | null = null;

export function getSocket(token?: string | null, userId?: string): Socket {
  const currentToken = token || localStorage.getItem('nixo_token') || localStorage.getItem('nixo_token');

  if (!socketInstance) {
    socketInstance = io(getApiBaseUrl(), {
      auth: {
        token: currentToken || undefined,
        userId: userId || undefined,
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
      transports: ['websocket', 'polling'], // prefer websocket, fallback to polling if needed
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Socket.IO connected:', socketInstance?.id);
      if (userId) {
        socketInstance?.emit('join_user_room', userId);
      }
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });
  } else if (currentToken && socketInstance.auth && (socketInstance.auth as any).token !== currentToken) {
    (socketInstance.auth as any).token = currentToken;
    if (userId) (socketInstance.auth as any).userId = userId;
    socketInstance.disconnect().connect();
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
