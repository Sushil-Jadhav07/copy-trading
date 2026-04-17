import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const notificationService = {
  async getNotifications() {
    try {
      const res = await api.get('/api/v1/notifications');
      return res.data?.notifications || [];
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
