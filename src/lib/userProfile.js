import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

// Normalize broker account from profile response
const normalizeBrokerAccountProfile = (raw = {}) => ({
  accountId: raw.accountId || '',
  broker: raw.broker || '',
  clientId: raw.clientId || '',
  fullName: raw.fullName || '',
  marginAvailable: Number(raw.marginAvailable || 0),
  marginUsed: Number(raw.marginUsed || 0),
  marginUsedPercent: Number(raw.marginUsedPercent || 0),
  fundsUtilizationStatus: raw.fundsUtilizationStatus || 'GREEN', // GREEN | YELLOW | RED
  sessionActive: Boolean(raw.sessionActive),
  tokenExpiresAt: raw.tokenExpiresAt || null,
  tokenExpiresInHours: Number(raw.tokenExpiresInHours || 0),
  isTokenExpired: Boolean(raw.isTokenExpired),
  openPositionsCount: Number(raw.openPositionsCount || 0),
  lastSyncedAt: raw.lastSyncedAt || null,
  raw,
});

// Normalize full user profile from /users/me/profile
export const normalizeUserProfile = (raw = {}) => ({
  userId: raw.userId || '',
  name: raw.name || '',
  email: raw.email || '',
  mobile: raw.mobile || '',
  role: raw.role || 'CHILD',
  createdAt: raw.createdAt || null,
  telegramLinked: Boolean(raw.telegramLinked),
  brokerAccounts: Array.isArray(raw.brokerAccounts)
    ? raw.brokerAccounts.map(normalizeBrokerAccountProfile)
    : [],
  raw,
});

export const userProfileService = {
  // NEW: GET /users/me/profile — full user + all broker account profiles
  async getProfile() {
    try {
      const res = await api.get('/api/v1/users/me/profile');
      const data = res.data?.data || res.data || {};
      return normalizeUserProfile(data);
    } catch (error) {
      // Fall back to legacy endpoint
      try {
        const res = await api.get('/api/v1/auth/me');
        return normalizeUserProfile(res.data?.data || res.data || {});
      } catch {
        throw new Error(getErrorMessage(error, 'Failed to fetch profile'));
      }
    }
  },

  // NEW: PUT /users/me/profile
  async updateProfile(body) {
    try {
      const payload = {};
      if (body?.displayName) payload.displayName = body.displayName;
      if (body?.telegramChatId) payload.telegramChatId = body.telegramChatId;
      const res = await api.put('/api/v1/users/me/profile', payload);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to update profile'));
    }
  },

  // NEW: GET /brokers/accounts/{accountId}/profile — single broker profile (cached 60s)
  async getBrokerProfile(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/profile`);
      return normalizeBrokerAccountProfile(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to fetch broker profile'));
    }
  },

  // NEW: POST /brokers/accounts/{accountId}/refresh-profile — force refresh
  async refreshBrokerProfile(accountId) {
    try {
      const res = await api.post(`/api/v1/brokers/accounts/${accountId}/refresh-profile`);
      return normalizeBrokerAccountProfile(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Failed to refresh broker profile'));
    }
  },
};
