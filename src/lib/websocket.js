import { getAccessToken } from '@/lib/api';

const REST_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const WS_BASE = REST_BASE.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws';

const connections = {};

export const connectChannel = (channel, onMessage, onOpen, onError) => {
  if (connections[channel]) {
    connections[channel].close();
    delete connections[channel];
  }

  let reconnectTimer = null;
  let pingTimer = null;
  let destroyed = false;

  const connect = () => {
    if (destroyed) return;

    const token = getAccessToken();
    const url = `${WS_BASE}/${channel}?token=${encodeURIComponent(token || '')}`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      if (onOpen) onOpen();
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'pong' || payload.event === 'pong') return;
        const eventName = payload.event || payload.type || 'MESSAGE';
        onMessage(eventName, payload.data ?? payload);
      } catch {
        onMessage('RAW', event.data);
      }
    };

    ws.onerror = (error) => {
      if (onError) onError(error);
    };

    ws.onclose = () => {
      clearInterval(pingTimer);
      delete connections[channel];
      if (!destroyed) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    connections[channel] = ws;
  };

  connect();

  return {
    close: () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      clearInterval(pingTimer);
      if (connections[channel]) {
        connections[channel].close();
        delete connections[channel];
      }
    },
  };
};

export const disconnectAll = () => {
  Object.values(connections).forEach((ws) => ws.close());
  Object.keys(connections).forEach((key) => delete connections[key]);
};