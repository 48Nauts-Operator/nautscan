import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export function useWebSocket(channel: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No authentication token found');
      return () => {};
    }

    const ws = new WebSocket(`ws://localhost:8001/ws/${channel}?token=${token}`);

    ws.onopen = () => {
      console.log(`Connected to ${channel} channel`);
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log(`Disconnected from ${channel} channel`);
      setIsConnected(false);
      // Try to reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message].slice(-100)); // Keep last 100 messages
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [channel]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    isConnected,
    messages,
    sendMessage,
  };
} 