import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const pnlService = {
  async getRealizedPnl({ from, to } = {}) {
    try {
      const res = await api.get('/api/v1/pnl/realized', { params: { from, to } });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch realized P&L'));
    }
  },

  async getUnrealizedPnl(brokerAccountId) {
    try {
      const res = await api.get('/api/v1/pnl/unrealized', {
        params: brokerAccountId ? { brokerAccountId } : {},
      });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch unrealized P&L'));
    }
  },

  async getSummary(period = 'DAILY') {
    try {
      const res = await api.get('/api/v1/pnl/summary', { params: { period } });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.summary) ? raw.summary : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch P&L summary'));
    }
  },

  async getChildVsMaster(masterId) {
    try {
      const res = await api.get('/api/v1/pnl/child-vs-master', {
        params: masterId ? { masterId } : {},
      });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch child vs master P&L'));
    }
  },

  async getAllPnl() {
    try {
      const res = await api.get('/api/v1/admin/pnl/all');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch platform P&L'));
    }
  },
};
