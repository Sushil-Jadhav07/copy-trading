import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.details ||
  error?.message ||
  fallback;

const normalizeBrokerAccount = (raw = {}) => {
  const sessionActive = Boolean(raw.sessionActive);
  const status = String(raw.status || (sessionActive ? 'ACTIVE' : 'INACTIVE')).toUpperCase();

  return {
    id: raw.accountId || raw.id || '',
    accountId: raw.accountId || raw.id || '',
    brokerId: raw.brokerId || '',
    brokerName: raw.brokerName || raw.brokerId || '',
    broker: raw.brokerName || raw.brokerId || '',
    clientId: raw.clientId || '',
    userId: raw.clientId || '',
    nickname: raw.nickname || raw.accountNickname || '',
    status,
    sessionActive,
    linkedAt: raw.linkedAt || null,
    margin: Number(raw.margin || raw.availableMargin || raw.available || raw.net || 0),
    pnl: Number(raw.pnl || raw.totalPnL || raw.dayPnL || 0),
    positions: Number(raw.positions || raw.positionCount || 0),
    orders: Number(raw.orders || raw.orderCount || 0),
    raw,
  };
};

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.positions)) return data.positions;
  const candidates = Object.values(data || {}).filter(Array.isArray);
  return candidates[0] || [];
};

const normalizePosition = (raw = {}, index = 0) => ({
  id: raw.id || raw.positionId || `${raw.symbol || raw.instrument || 'position'}-${index}`,
  symbol: raw.symbol || raw.instrument || raw.tradingSymbol || 'N/A',
  instrument: raw.instrument || raw.symbol || raw.tradingSymbol || 'N/A',
  type: String(raw.type || raw.side || raw.transactionType || raw.action || 'BUY').toUpperCase(),
  qty: Number(raw.qty || raw.quantity || raw.netQuantity || raw.positionQty || 0),
  pnl: Number(raw.pnl || raw.unrealizedPnl || raw.mtM || 0),
  unrealizedPnl: Number(raw.unrealizedPnl || raw.pnl || raw.mtM || 0),
  ltp: Number(raw.ltp || raw.lastPrice || raw.currentPrice || 0),
  avgPrice: Number(raw.avgPrice || raw.averagePrice || raw.entryPrice || 0),
  entry: Number(raw.entry || raw.entryPrice || raw.averagePrice || 0),
  current: Number(raw.current || raw.ltp || raw.lastPrice || raw.currentPrice || 0),
  change: Number(raw.change || raw.changePct || raw.pnlPercent || 0),
  market: raw.market || raw.segment || '',
  children: raw.children || raw.copiedAccounts || [],
  raw,
});

export const brokerService = {
  async getBrokers() {
    try {
      const res = await api.get('/api/v1/brokers');
      return extractList(res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load brokers'));
    }
  },

  async getAccounts() {
    try {
      const res = await api.get('/api/v1/brokers/accounts');
      return extractList(res.data).map(normalizeBrokerAccount);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker accounts'));
    }
  },

  async getAccount(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}`);
      return normalizeBrokerAccount(res.data?.data || res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load account'));
    }
  },

  async addAccount(body) {
    try {
      const res = await api.post('/api/v1/brokers/accounts', body);
      return normalizeBrokerAccount(res.data?.data || res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to add broker account'));
    }
  },

  async updateAccount(accountId, body) {
    try {
      const res = await api.put(`/api/v1/brokers/accounts/${accountId}`, body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update account'));
    }
  },

  async deleteAccount(accountId) {
    try {
      await api.delete(`/api/v1/brokers/accounts/${accountId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to delete account'));
    }
  },

  async getOAuthUrl(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/oauth-url`);
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker login url'));
    }
  },

  async handleCallback(params = {}) {
    try {
      const res = await api.get('/api/v1/brokers/callback', { params });
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to complete broker callback'));
    }
  },

  async loginAccount(accountId, payload = {}) {
    try {
      const res = await api.post(`/api/v1/brokers/accounts/${accountId}/login`, payload || {});
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Broker login failed'));
    }
  },

  async getAccountStatus(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/status`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to get account status'));
    }
  },

  async getPositions(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/positions`);
      return extractList(res.data).map(normalizePosition);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load positions'));
    }
  },

  async getMargin(accountId) {
    try {
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/margin`);
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load margin'));
    }
  },

  async getAdminBrokerStatus() {
    try {
      const res = await api.get('/api/v1/admin/brokers/status');
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) return data;
      return Object.entries(data || {}).map(([k, v]) => ({ name: k, ...v }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker status'));
    }
  },

  async getAdminBrokerAccounts(params = {}) {
    try {
      const res = await api.get('/api/v1/admin/brokers/accounts', { params });
      return extractList(res.data).map(normalizeBrokerAccount);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load broker accounts'));
    }
  },

  async bulkLinkChildren(children) {
    try {
      const res = await api.post('/api/v1/master/children/bulk-link', {
        children,
      });
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to bulk link children'));
    }
  },
};
