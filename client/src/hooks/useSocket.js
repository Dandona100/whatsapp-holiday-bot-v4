import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

let globalSocket = null;

export function getSocket() {
  return globalSocket;
}

export function useSocket() {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    if (globalSocket) {
      globalSocket.disconnect();
    }

    const socket = io(window.location.origin, {
      auth: { token },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    globalSocket = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      if (globalSocket === socket) {
        globalSocket = null;
      }
    };
  }, []);

  return { socket: socketRef.current || globalSocket, connected };
}
