import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const engineService = {
  async manualCopyTrade(body) {
    try {
      const res = await api.post('/api/v1/engine/copy-trade', body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to copy trade'));
    }
  },

  async getStatus() {
    try {
      const res = await api.get('/api/v1/engine/status');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch engine status'));
    }
  },

  // getPollingStatus — reads pollingEnabled from the engine status response
  // GET /api/v1/engine/status returns { engineStatus, pollingEnabled, pollingIntervalSeconds, ... }
  async getPollingStatus() {
    try {
      const res = await api.get('/api/v1/engine/status');
      const data = res.data?.data || res.data || {};
      return {
        enabled: Boolean(data.pollingEnabled),
        intervalSeconds: Number(data.pollingIntervalSeconds || 3),
        engineStatus: data.engineStatus || 'UNKNOWN',
      };
    } catch (error) {
      // fail silently — not critical
      return null;
    }
  },

  async togglePolling(enabled) {
    try {
      const res = await api.post('/api/v1/engine/polling', { enabled });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to toggle polling'));
    }
  },

  async resetPollingCache() {
    try {
      const res = await api.post('/api/v1/engine/polling/reset');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to reset polling cache'));
    }
  },
};