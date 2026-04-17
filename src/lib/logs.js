import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const logsService = {
  async getUserTradeLogs() {
    try {
      const res = await api.get('/api/v1/logs/trades');
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch trade logs'));
    }
  },

  async getBrokerErrors(brokerAccountId) {
    try {
      const res = await api.get('/api/v1/logs/broker-errors', {
        params: brokerAccountId ? { brokerAccountId } : {},
      });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch broker error logs'));
    }
  },

  async adminTradeLogs(params = {}) {
    try {
      const res = await api.get('/api/v1/admin/logs/trades', { params });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch admin trade logs'));
    }
  },

  async adminSystemLogs() {
    try {
      const res = await api.get('/api/v1/admin/logs/system');
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch system logs'));
    }
  },

  async adminBrokerErrors(brokerId) {
    try {
      const res = await api.get('/api/v1/admin/logs/broker-errors', {
        params: brokerId ? { brokerId } : {},
      });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch admin broker error logs'));
    }
  },
};
