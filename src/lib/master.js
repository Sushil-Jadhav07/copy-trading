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
      raw.copyingStatus ||
      raw.subscriptionStatus ||
      raw.tradingStatus ||
      source.status ||
      source.copyingStatus ||
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
    email: raw.email || source.email || '',
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
    subscribedAt: raw.subscribedAt || raw.requestedAt || raw.createdAt || source.createdAt || null,
    joinedDate: raw.joinedDate || raw.subscribedAt || raw.requestedAt || raw.createdAt || source.createdAt || null,
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
        ...normalizeChild(raw, index),
        id: raw.childId || raw.id || `child-${index}`,
        childId: raw.childId || raw.id || `child-${index}`,
        brokerAccountId: raw.brokerAccountId || '',
        multiplier: Number(raw.scalingFactor || raw.multiplier || 1),
        scalingFactor: Number(raw.scalingFactor || raw.multiplier || 1),
        status: String(raw.copyingStatus || raw.status || 'ACTIVE').toUpperCase(),
        isLinked: false,
        isSubscribedOnly: true,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load master subscriptions'));
    }
  },

  async getPendingChildren() {
    try {
      const res = await api.get('/api/v1/master/children/pending');
      const list = res.data?.pendingApprovals || [];
      return (Array.isArray(list) ? list : extractList(res.data)).map((raw, index) => ({
        ...normalizeChild(raw, index),
        subscriptionId: raw.subscriptionId || raw.id || '',
        requestedAt: raw.requestedAt || raw.createdAt || null,
        status: 'PENDING_APPROVAL',
        tradingEnabled: false,
        enabled: false,
        isLinked: false,
        isPendingApproval: true,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load pending approvals'));
    }
  },

  async linkChild(childId, scalingFactor) {
    try {
      const body = scalingFactor == null ? undefined : { scalingFactor };
      const res = await api.post(`/api/v1/master/children/${childId}/link`, body);
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
      const numericScaling = Number(body?.scalingFactor ?? body?.multiplier ?? 1);
      const scalingFactor = Math.min(10, Math.max(0.01, Number.isFinite(numericScaling) ? numericScaling : 1));
      const res = await api.put(`/api/v1/master/children/${childId}/scaling`, { scalingFactor });
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

  async subscribeToChild(childId, scalingFactor) {
    try {
      const body = scalingFactor == null ? undefined : { scalingFactor };
      const res = await api.post(`/api/v1/master/subscribe/${childId}`, body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to subscribe to child'));
    }
  },

  async approveChild(childId) {
    try {
      const res = await api.post(`/api/v1/master/children/${childId}/approve`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to approve child'));
    }
  },

  async rejectChild(childId) {
    try {
      const res = await api.post(`/api/v1/master/children/${childId}/reject`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to reject child'));
    }
  },
};
