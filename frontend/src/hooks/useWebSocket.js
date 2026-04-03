import { useState, useEffect, useRef, useCallback } from 'react';

const WEBSOCKET_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export default function useWebSocket() {
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef(null);
  const token = localStorage.getItem('token');

  const connect = useCallback(() => {
    if (!token) return;
    
    // Connect to WebSocket with token in path
    const wssUrl = WEBSOCKET_URL.endsWith('/') ? WEBSOCKET_URL : WEBSOCKET_URL + '/';
    const url = `${wssUrl}${token}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('WebSocket disconnected. Reconnecting in 3s...');
      setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      ws.close();
    };

    wsRef.current = ws;
  }, [token]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, [isConnected]);

  return { lastMessage, isConnected, sendMessage };
}
