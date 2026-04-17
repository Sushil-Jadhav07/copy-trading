import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const tradeService = {
  async executeTrade(body) {
    try {
      const res = await api.post('/api/v1/trades/execute', body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to execute trade'));
    }
  },

  async listTrades(params = {}) {
    try {
      const res = await api.get('/api/v1/trades', { params });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.trades) ? raw.trades : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch trades'));
    }
  },

  async getTradeDetail(tradeId) {
    try {
      const res = await api.get(`/api/v1/trades/${tradeId}`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch trade detail'));
    }
  },

  async cancelTrade(tradeId) {
    try {
      const res = await api.delete(`/api/v1/trades/${tradeId}/cancel`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to cancel trade'));
    }
  },

  async getTradeReplications(tradeId) {
    try {
      const res = await api.get(`/api/v1/trades/${tradeId}/replications`);
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.replications) ? raw.replications : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch replications'));
    }
  },

  async getOpenPositions(brokerAccountId) {
    try {
      const res = await api.get('/api/v1/trades/open-positions', {
        params: brokerAccountId ? { brokerAccountId } : {},
      });
      const raw = res.data?.data || res.data;
      return Array.isArray(raw?.positions) ? raw.positions : Array.isArray(raw) ? raw : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch open positions'));
    }
  },

  async placeBasketOrder(body) {
    try {
      const res = await api.post('/api/v1/trades/basket', body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to place basket order'));
    }
  },
};
