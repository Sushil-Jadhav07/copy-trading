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

  // Subscribe to /ws/notifications for real-time broker/session alerts.
  useEffect(() => {
    const sub = connectChannel(
      'notifications',
      (event, data) => {
        const normalizedType = String(data?.type || event || '').toUpperCase();
        if (normalizedType === 'SESSION_EXPIRED' || normalizedType === 'BROKER_DISCONNECTED' || normalizedType === 'BROKER_RECONNECT_REQUIRED') {
          const broker = data?.brokerName || data?.broker || data?.brokerId || 'Unknown';
          const accountId = data?.accountId || data?.account?.id || '';
          // Add to local session expired list for banner display
          if (accountId) {
            setSessionExpiredBrokers((prev) => {
              const alreadyExists = prev.some((b) => b.accountId === accountId);
              if (alreadyExists) return prev;
              return [...prev, { broker, accountId, childId: data?.childId }];
            });
          }
          // Also inject into notifications list so bell shows it immediately
          setNotifications((prev) => {
            const syntheticNotif = {
              id: `ws-${normalizedType.toLowerCase()}-${accountId || 'na'}-${Date.now()}`,
              type: normalizedType,
              title: normalizedType === 'SESSION_EXPIRED' ? 'Broker session expired' : 'Broker reconnect required',
              message: data?.message || `Your ${broker} session needs re-login.`,
              read: false,
              createdAt: new Date().toISOString(),
              accountId,
              brokerName: broker,
              action: data?.action || 'RECONNECT',
              loginOptionsUrl: data?.loginOptionsUrl,
            };
            return [syntheticNotif, ...prev];
          });
        }

        // Any notification push — refetch from server
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
