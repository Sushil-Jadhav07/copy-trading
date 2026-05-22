import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

// Map notification types to UI actions (from API spec)
export const NOTIFICATION_TYPE_MAP = {
  TRADE_COPIED: { label: 'Trade Copied', action: 'success', icon: 'check' },
  TRADE_FAILED: { label: 'Trade Failed', action: 'error', icon: 'x' },
  MARKET_CLOSED: { label: 'Market Closed', action: 'warning', icon: 'clock' },
  SESSION_EXPIRED: { label: 'Session Expired', action: 'error', icon: 'alert', requiresLogin: true },
  SESSION_EXPIRING: { label: 'Session Expiring', action: 'warning', icon: 'alert' },
  SESSION_REMINDER: { label: 'Session Reminder', action: 'info', icon: 'bell' },
};

export const notificationService = {
  async getNotifications() {
    try {
      const res = await api.get('/api/v1/notifications');
      return res.data?.notifications || res.data?.data || [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load notifications'));
    }
  },

  async markAsRead(id) {
    try {
      await api.patch(`/api/v1/notifications/${id}/read`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to mark notification as read'));
    }
  },

  async markAllAsRead() {
    try {
      await api.post('/api/v1/notifications/read-all');
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to mark all notifications as read'));
    }
  },

  async deleteNotification(id) {
    try {
      await api.delete(`/api/v1/notifications/${id}`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to delete notification'));
    }
  },
};
