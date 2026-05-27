import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const telegramService = {
  async getBotConfig() {
    try {
      const res = await api.get('/api/v1/notifications/telegram/bot', { skipAuthRefresh: true });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to load Telegram bot config'));
    }
  },

  // Step 1: Generate 6-digit link code
  async generateLinkToken() {
    try {
      const res = await api.post('/api/v1/notifications/telegram/generate-link-token');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to generate Telegram link token'));
    }
  },

  // Step 2: Check link status
  async getStatus() {
    try {
      const res = await api.get('/api/v1/notifications/telegram/status');
      return res.data?.data || res.data || { linked: false };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch Telegram status'));
    }
  },

  // Step 3: Update preferences
  async updatePreferences(prefs) {
    try {
      const res = await api.put('/api/v1/notifications/telegram/preferences', prefs);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update Telegram preferences'));
    }
  },

  // Step 4: Send test message
  async sendTest() {
    try {
      const res = await api.post('/api/v1/notifications/telegram/test');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to send test message'));
    }
  },

  // Step 5: Unlink
  async unlink() {
    try {
      const res = await api.post('/api/v1/notifications/telegram/unlink');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to unlink Telegram'));
    }
  },
};
