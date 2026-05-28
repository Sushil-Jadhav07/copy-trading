import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const logsService = {
  async getUserTradeLogs() {
    try {
      const res = await api.get('/api/v1/master/trade-logs');
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (error) {
      try {
        const fallback = await api.get('/api/v1/child/copied-trades');
        const raw = fallback.data?.data || fallback.data;
        return Array.isArray(raw?.trades) ? raw.trades : Array.isArray(raw) ? raw : [];
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Failed to fetch trade logs'));
      }
    }
  },

  async getBrokerErrors(brokerAccountId) {
    try {
      const res = await api.get('/api/v1/master/copy/logs');
      const raw = res.data?.data || res.data;
      const logs = Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
      return logs.filter((item) => {
        const status = String(item?.childStatus || item?.status || '').toUpperCase();
        const accountMatches = !brokerAccountId || !item?.brokerAccountId || item.brokerAccountId === brokerAccountId;
        return accountMatches && (status === 'FAILED' || Boolean(item?.errorMessage));
      });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch broker error logs'));
    }
  },

  async adminTradeLogs(params = {}) {
    try {
      const res = await api.get('/api/v1/admin/trade-logs', { params });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch admin trade logs'));
    }
  },

  async adminSystemLogs() {
    try {
      const res = await api.get('/api/v1/admin/system-health');
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.logs) ? raw.logs : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch system logs'));
    }
  },

  async adminBrokerErrors(brokerId) {
    try {
      const res = await api.get('/api/v1/admin/brokers/status', {
        params: brokerId ? { brokerId } : {},
      });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.brokers) ? raw.brokers : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch admin broker error logs'));
    }
  },
};
