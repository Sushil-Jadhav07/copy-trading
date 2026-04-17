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

  async getExposure() {
    try {
      const res = await api.get('/api/v1/risk/exposure');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch risk exposure'));
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
