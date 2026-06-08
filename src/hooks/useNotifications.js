import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { notificationService } from '@/lib/notifications';
import { connectChannel } from '@/lib/websocket';

const HIDDEN_NOTIFICATION_TYPES = new Set([
  'SESSION_EXPIRED',
  'BROKER_DISCONNECTED',
  'BROKER_RECONNECT_REQUIRED',
]);

const isVisibleNotification = (notification) => {
  const normalizedType = String(notification?.type || '').toUpperCase();
  return !HIDDEN_NOTIFICATION_TYPES.has(normalizedType);
};

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(Array.isArray(data) ? data.filter(isVisibleNotification) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    const sub = connectChannel(
      'notifications',
      (event, data) => {
        const normalizedType = String(data?.type || event || '').toUpperCase();
        if (HIDDEN_NOTIFICATION_TYPES.has(normalizedType)) {
          return;
        }

        if (event === 'NOTIFICATION' || event === 'NEW_NOTIFICATION') {
          fetchNotifications();
        }
      },
      null,
      (err) => console.warn('WS notifications error', err),
    );

    wsRef.current = sub;
    return () => sub.close();
  }, [fetchNotifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = async (id) => {
    try {
      if (!String(id).startsWith('ws-')) {
        await notificationService.markAsRead(id);
      }
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      setError(err.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteNotification = async (id) => {
    try {
      if (!String(id).startsWith('ws-')) {
        await notificationService.deleteNotification(id);
      }
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};
