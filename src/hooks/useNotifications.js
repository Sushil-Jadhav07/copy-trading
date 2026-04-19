import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { notificationService } from '@/lib/notifications';
import { connectChannel } from '@/lib/websocket';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // NEW — track SESSION_EXPIRED alerts separately for re-connect banner
  const [sessionExpiredBrokers, setSessionExpiredBrokers] = useState([]);
  const wsRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // NEW — Subscribe to /ws/notifications for real-time SESSION_EXPIRED events
  useEffect(() => {
    const sub = connectChannel(
      'notifications',
      (event, data) => {
        // Backend sends SESSION_EXPIRED when a copy trade fails due to expired broker session
        if (event === 'SESSION_EXPIRED') {
          const broker = data?.broker || 'Unknown';
          const accountId = data?.accountId || '';
          // Add to local session expired list for banner display
          setSessionExpiredBrokers((prev) => {
            const alreadyExists = prev.some((b) => b.accountId === accountId);
            if (alreadyExists) return prev;
            return [...prev, { broker, accountId, childId: data?.childId }];
          });
          // Also inject into notifications list so bell shows it immediately
          setNotifications((prev) => {
            const syntheticNotif = {
              id: `ws-session-${accountId}-${Date.now()}`,
              type: 'SESSION_EXPIRED',
              title: 'Broker session expired',
              message: `Your ${broker} session expired. Re-login to resume copy trading.`,
              read: false,
              createdAt: new Date().toISOString(),
            };
            return [syntheticNotif, ...prev];
          });
        }

        // Any other notification event — refetch from server
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

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAsRead = async (id) => {
    try {
      // Only call API for real notifications (not synthetic WS ones)
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

  // NEW — dismiss a session expired alert from the banner
  const dismissSessionExpired = useCallback((accountId) => {
    setSessionExpiredBrokers((prev) => prev.filter((b) => b.accountId !== accountId));
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    // NEW exports
    sessionExpiredBrokers,
    dismissSessionExpired,
  };
};