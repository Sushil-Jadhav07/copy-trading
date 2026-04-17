import { getAccessToken } from '@/lib/api';

const WS_BASE = 'wss://copy-trading-production-3981.up.railway.app/ws';

const connections = {};

export const connectChannel = (channel, onMessage, onOpen, onError) => {
  if (connections[channel]) {
    connections[channel].close();
    delete connections[channel];
  }

  const token = getAccessToken();
  const url = `${WS_BASE}/${channel}?token=${encodeURIComponent(token || '')}`;
  const ws = new WebSocket(url);

  ws.onopen = () => {
    if (onOpen) onOpen();
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
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
    delete connections[channel];
  };

  connections[channel] = ws;

  return {
    close: () => {
      ws.close();
      delete connections[channel];
    },
  };
};

export const disconnectAll = () => {
  Object.values(connections).forEach((ws) => ws.close());
  Object.keys(connections).forEach((key) => delete connections[key]);
};
