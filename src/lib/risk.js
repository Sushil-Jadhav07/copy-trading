import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const riskService = {
  async getRules() {
    try {
      const res = await api.get('/api/v1/risk/rules');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch risk rules'));
    }
  },

  async getExposure(brokerAccountId) {
    try {
      const params = brokerAccountId ? { brokerAccountId } : {};
      const res = await api.get('/api/v1/risk/exposure', { params });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch risk exposure'));
    }
  },

  async updateRules(body) {
    try {
      const payload = {
        maxTradesPerDay: Number(body?.maxTradesPerDay ?? 50),
        maxOpenPositions: Number(body?.maxOpenPositions ?? 20),
        maxCapitalExposure: Number(body?.maxCapitalExposure ?? 80),
        marginCheckEnabled: Boolean(body?.marginCheckEnabled),
        ...(body?.allowedSides ? { allowedSides: body.allowedSides } : {}),
      };
      const res = await api.put('/api/v1/risk/rules', payload);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update risk rules'));
    }
  },

  async checkRisk(brokerAccountId) {
    try {
      const params = brokerAccountId ? { brokerAccountId } : {};
      const res = await api.get('/api/v1/risk/check', { params });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to check risk status'));
    }
  },

  // NEW: Full risk status dashboard card
  async getStatus(brokerAccountId) {
    try {
      const params = brokerAccountId ? { brokerAccountId } : {};
      const res = await api.get('/api/v1/risk/status', { params });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch risk status'));
    }
  },

  // NEW: Pre-check a hypothetical trade
  async checkTrade(body, brokerAccountId) {
    try {
      const params = brokerAccountId ? { brokerAccountId } : {};
      const res = await api.post('/api/v1/risk/check-trade', body, { params });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Pre-trade risk check failed'));
    }
  },

  // NEW: Emergency pause copying
  async pauseCopying(body = {}) {
    try {
      const res = await api.post('/api/v1/risk/pause', body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to pause copying'));
    }
  },

  // NEW: Resume copying
  async resumeCopying() {
    try {
      const res = await api.post('/api/v1/risk/resume');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to resume copying'));
    }
  },

  async checkMargin({ brokerAccountId, instrument, quantity, orderType }) {
    try {
      const res = await api.get('/api/v1/risk/margin-check', {
        params: { brokerAccountId, instrument, quantity, orderType },
      });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Margin check failed'));
    }
  },

  async setRulesForUser(userId, body) {
    try {
      const res = await api.put(`/api/v1/admin/risk/rules/${userId}`, body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to set risk rules'));
    }
  },
};
