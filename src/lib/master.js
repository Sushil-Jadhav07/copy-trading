import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.children)) return data.children;
  if (Array.isArray(data?.followers)) return data.followers;
  if (Array.isArray(data?.subscriptions)) return data.subscriptions;
  if (Array.isArray(data?.content)) return data.content;
  const candidates = Object.values(data || {}).filter(Array.isArray);
  return candidates[0] || [];
};

const normalizeChild = (raw = {}, index = 0) => {
  const source = raw.child || raw.user || raw.childUser || raw.profile || raw;
  const childId =
    raw.childId ||
    raw.id ||
    raw.userId ||
    source.childId ||
    source.userId ||
    source.id ||
    `child-${index}`;

  const name =
    raw.name ||
    raw.childName ||
    raw.userName ||
    source.name ||
    source.childName ||
    source.fullName ||
    'Unknown';

  const statusValue = String(
    raw.status ||
      raw.subscriptionStatus ||
      raw.tradingStatus ||
      source.status ||
      source.subscriptionStatus ||
      'PAUSED'
  ).toUpperCase();

  return {
    id: childId,
    childId,
    userId: raw.userId || source.userId || source.id || childId,
    clientId: raw.clientId || source.clientId || source.username || '',
    name,
    childName: name,
    nickname: raw.nickname || source.nickname || name,
    broker: raw.broker || raw.brokerName || source.broker || source.brokerName || '',
    brokerName: raw.brokerName || source.brokerName || raw.broker || source.broker || '',
    multiplier: Number(raw.multiplier || raw.scalingFactor || raw.scale || 1),
    allocation: Number(raw.allocation || raw.allocationAmount || raw.capitalAllocation || 0),
    allocationAmount: Number(raw.allocationAmount || raw.allocation || raw.capitalAllocation || 0),
    totalPnL: Number(raw.totalPnL || raw.pnl || raw.profitLoss || 0),
    pnl: Number(raw.pnl || raw.totalPnL || raw.profitLoss || 0),
    tradesCopied: Number(raw.tradesCopied || raw.tradeCount || raw.copiedTrades || 0),
    tradeCount: Number(raw.tradeCount || raw.tradesCopied || raw.copiedTrades || 0),
    tradingEnabled: Boolean(
      raw.tradingEnabled ??
        raw.enabled ??
        raw.isActive ??
        statusValue === 'ACTIVE'
    ),
    enabled: Boolean(raw.enabled ?? raw.tradingEnabled ?? raw.isActive ?? statusValue === 'ACTIVE'),
    status: statusValue,
    joinedDate: raw.joinedDate || raw.createdAt || source.createdAt || null,
    placeRejected: Boolean(raw.placeRejected),
    isLinked: true,
    isSubscribedOnly: false,
    raw,
  };
};

const normalizeTrade = (raw = {}, index = 0) => ({
  id: raw.id || raw.tradeId || `${raw.symbol || raw.instrument || 'trade'}-${index}`,
  instrument: raw.instrument || raw.symbol || raw.tradingSymbol || 'N/A',
  symbol: raw.symbol || raw.instrument || raw.tradingSymbol || 'N/A',
  type: String(raw.type || raw.side || raw.action || 'BUY').toUpperCase(),
  qty: Number(raw.qty || raw.quantity || 0),
  entryPrice: Number(raw.entryPrice || raw.entry || raw.avgEntryPrice || 0),
  exitPrice: Number(raw.exitPrice || raw.exit || raw.currentPrice || raw.ltp || 0),
  pnl: Number(raw.pnl || raw.netPnL || raw.profitLoss || 0),
  status: raw.status || raw.tradeStatus || 'Closed',
  market: raw.segment || raw.market || '',
  date: raw.date || raw.tradeDate || raw.createdAt || '',
  copiedBy: raw.copiedBy || raw.children || [],
  children: raw.children || raw.copiedBy || [],
  raw,
});

export const masterService = {
  async getChildren() {
    try {
      const res = await api.get('/api/v1/master/children');
      return extractList(res.data).map(normalizeChild);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load children'));
    }
  },

  async getSubscriptionsByMaster(masterId) {
    try {
      const res = await api.get(`/api/subscriptions/master/${masterId}`);
      return extractList(res.data).map((raw, index) => ({
        id: raw.childId || raw.id || `subscription-${index}`,
        subscriptionId: raw.id || '',
        childId: raw.childId || '',
        userId: raw.childId || '',
        clientId: raw.childId || '',
        name: raw.childName || `Child ${String(raw.childId || index + 1).slice(0, 8)}`,
        childName: raw.childName || `Child ${String(raw.childId || index + 1).slice(0, 8)}`,
        nickname: raw.childName || `Child ${String(raw.childId || index + 1).slice(0, 8)}`,
        brokerAccountId: raw.brokerAccountId || '',
        allocation: Number(raw.allocation || raw.allocationAmount || 0),
        allocationAmount: Number(raw.allocationAmount || raw.allocation || 0),
        multiplier: Number(raw.multiplier || raw.scalingFactor || 1),
        scalingFactor: Number(raw.scalingFactor || raw.multiplier || 1),
        status: String(raw.copyingStatus || raw.status || 'PAUSED').toUpperCase(),
        tradingEnabled: String(raw.copyingStatus || raw.status || '').toUpperCase() === 'ACTIVE',
        enabled: String(raw.copyingStatus || raw.status || '').toUpperCase() === 'ACTIVE',
        totalPnL: Number(raw.totalPnL || raw.pnl || 0),
        pnl: Number(raw.pnl || raw.totalPnL || 0),
        tradesCopied: Number(raw.tradesCopied || raw.tradeCount || 0),
        tradeCount: Number(raw.tradeCount || raw.tradesCopied || 0),
        joinedDate: raw.createdAt || null,
        isLinked: false,
        isSubscribedOnly: true,
        raw,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load subscriptions'));
    }
  },

  async linkChild(childId) {
    try {
      const res = await api.post(`/api/v1/master/children/${childId}/link`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to link child'));
    }
  },

  async unlinkChild(childId) {
    try {
      const res = await api.delete(`/api/v1/master/children/${childId}/unlink`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to unlink child'));
    }
  },

  async getChildScaling(childId) {
    try {
      const res = await api.get(`/api/v1/master/children/${childId}/scaling`);
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load scaling'));
    }
  },

  async updateChildScaling(childId, body) {
    try {
      const res = await api.put(`/api/v1/master/children/${childId}/scaling`, body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update scaling'));
    }
  },

  async getAnalytics() {
    try {
      const res = await api.get('/api/v1/master/analytics');
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load analytics'));
    }
  },

  async getTradeHistory() {
    try {
      const res = await api.get('/api/v1/master/trade-history');
      return extractList(res.data).map(normalizeTrade);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load trade history'));
    }
  },
};
