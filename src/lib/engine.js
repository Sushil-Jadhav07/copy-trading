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

  async getPollingStatus() {
    try {
      const res = await api.get('/api/v1/engine/polling/status');
      return res.data?.data || res.data || {};
    } catch (error) {
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

  // NEW: Engine metadata - copySidesOptions, skipReasons, notificationTypes
  async getMetadata() {
    try {
      const res = await api.get('/api/v1/engine/metadata');
      return res.data?.data || res.data || {};
    } catch (error) {
      // Return defaults if metadata endpoint fails
      return {
        copySidesOptions: [
          { id: 'BUY_ONLY', label: 'Buy only (safe default)', description: 'Copy BUY; SELL only with copied BUY + live position' },
          { id: 'BUY_AND_SELL', label: 'Buy and sell', description: 'Copy BUY and SELL when child has live long qty' },
          { id: 'MIRROR', label: 'Mirror master', description: 'Copy all sides; optional naked short if allowShortSelling' },
        ],
        skipReasons: [
          'ZERO_QUANTITY', 'SUB_LOT_SIZE', 'RISK_LIMIT', 'MAX_CAPITAL_EXPOSURE',
          'NO_POSITION', 'INSUFFICIENT_POSITION', 'SELL_BLOCKED', 'MARKET_CLOSED',
          'SESSION_EXPIRED',
        ],
        notificationTypes: [
          'TRADE_COPIED', 'TRADE_FAILED', 'MARKET_CLOSED',
          'SESSION_EXPIRED', 'SESSION_EXPIRING', 'SESSION_REMINDER',
        ],
      };
    }
  },

  // NEW: Paginated trade history (master view)
  async getTradeHistory(params = {}) {
    try {
      const res = await api.get('/api/v1/engine/trade-history', { params });
      return res.data?.data || res.data || { content: [], totalElements: 0, page: 0, size: 20 };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch trade history'));
    }
  },

  // NEW: Single trade event detail + per-child rows
  async getTradeHistoryEvent(eventId) {
    try {
      const res = await api.get(`/api/v1/engine/trade-history/${eventId}`);
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch trade event detail'));
    }
  },

  // NEW: Latency stats (days=7 or 30)
  async getLatencyStats(days = 7) {
    try {
      const res = await api.get('/api/v1/engine/latency-stats', { params: { days } });
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch latency stats'));
    }
  },

  // NEW: Engine config
  async getConfig() {
    try {
      const res = await api.get('/api/v1/engine/config');
      return res.data?.data || res.data || {};
    } catch (error) {
      return null;
    }
  },
};
