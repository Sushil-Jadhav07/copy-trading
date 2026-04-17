import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export const copyLogService = {
  async getAll() {
    try {
      const res = await api.get('/api/v1/copy/logs');
      return res.data?.logs || res.data || [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load copy logs'));
    }
  },
};
