import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.masters)) return data.masters;
  if (Array.isArray(data?.subscriptions)) return data.subscriptions;
  if (Array.isArray(data?.trades)) return data.trades;
  const candidates = Object.values(data || {}).filter(Array.isArray);
  return candidates[0] || [];
};

const toNumber = (...values) => {
  for (const value of values) {
    if (value == null || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeMaster = (raw = {}, index = 0) => ({
  id: raw.masterId || raw.userId || raw.id || `master-${index}`,
  masterId: raw.masterId || raw.userId || raw.id || `master-${index}`,
  name: raw.name || raw.masterName || raw.fullName || 'Unknown',
  email: raw.email || '',
  winRate: Number(raw.winRate ?? raw.win_rate ?? 0),
  totalTrades: Number(raw.totalTrades ?? raw.tradeCount ?? 0),
  avgPnl: Number(raw.avgPnl ?? raw.averagePnl ?? raw.avgPnL ?? 0),
  subscribers: Number(raw.subscribers ?? raw.subscriberCount ?? raw.childCount ?? 0),
  return30d: Number(raw.return30d ?? raw.monthlyReturn ?? 0),
  returnYTD: Number(raw.returnYTD ?? raw.yearlyReturn ?? 0),
  riskLevel: raw.riskLevel || raw.risk || 'Medium',
  bestTrade: raw.bestTrade || 'N/A',
  worstTrade: raw.worstTrade || 'N/A',
  verified: Boolean(raw.verified),
  description: raw.description || raw.bio || '',
  markets: Array.isArray(raw.markets) ? raw.markets : [raw.market || 'Equity'],
  equityCurve: Array.isArray(raw.equityCurve) ? raw.equityCurve : [],
  raw,
});

const SUBSCRIPTION_ALLOCATION_CACHE_KEY = 'Ascentra Capital_child_subscription_allocations';

const readAllocationCache = () => {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(SUBSCRIPTION_ALLOCATION_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeAllocationCache = (cache) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SUBSCRIPTION_ALLOCATION_CACHE_KEY, JSON.stringify(cache));
};

const cacheSubscriptionAllocation = (masterId, allocationAmount) => {
  if (!masterId || allocationAmount == null) return;
  const cache = readAllocationCache();
  cache[String(masterId)] = Number(allocationAmount) || 0;
  writeAllocationCache(cache);
};

const removeSubscriptionAllocation = (masterId) => {
  if (!masterId) return;
  const cache = readAllocationCache();
  delete cache[String(masterId)];
  writeAllocationCache(cache);
};

const normalizeSubscription = (raw = {}) => {
  const subscriptionId = raw.id || '';
  const masterId = raw.masterId || raw.id || '';
  const cachedAllocation = readAllocationCache()[String(masterId)];
  const resolvedAllocation =
    raw.allocation ??
    raw.allocationAmount ??
    raw.capitalAllocation ??
    raw.allocatedAmount ??
    raw.capitalAllocated ??
    raw.investedAmount ??
    raw.amount ??
    cachedAllocation ??
    0;
  const status = String(
    raw.status ||
    raw.copyingStatus ||
    raw.subscriptionStatus ||
    (raw.tradingEnabled ? 'ACTIVE' : 'PAUSED') ||
    'INACTIVE'
  ).toUpperCase();

  return {
    id: masterId,
    subscriptionId,
    masterId,
    masterName: raw.masterName || raw.name || raw.master?.name || raw.master?.fullName || 'Unknown',
    name: raw.name || raw.masterName || raw.master?.name || raw.master?.fullName || 'Unknown',
    multiplier: toNumber(raw.multiplier, raw.scalingFactor, raw.scale, 1),
    scalingFactor: toNumber(raw.scalingFactor, raw.multiplier, raw.scale, 1),
    allocation: toNumber(resolvedAllocation),
    allocationAmount: toNumber(resolvedAllocation),
    pnl: toNumber(raw.pnl, raw.totalPnL, raw.netPnL, raw.profitLoss),
    totalPnL: toNumber(raw.totalPnL, raw.totalPnl, raw.pnl, raw.netPnL, raw.profitLoss),
    tradesCopiedToday: toNumber(raw.tradestoday, raw.tradesCopiedToday, raw.tradeCountToday),
    status,
    copyingStatus: status,
    tradingEnabled: status === 'ACTIVE',
    brokerAccountId: raw.brokerAccountId || '',
    subscribedAt: raw.subscribedAt || raw.createdAt || null,
    raw,
  };
};

export const normalizeCopiedTrade = (raw = {}, index = 0) => ({
  // API returns: { id, masterId, childId, type, status, message, broker, reference, createdAt }
  id: raw.id || raw.tradeId || `trade-${index}`,
  master: raw.master || raw.masterName || raw.masterId || 'Unknown',
  // Prefer instrument/symbol; fallback to reference.
  instrument: raw.instrument || raw.symbol || raw.tradingSymbol || raw.reference || 'N/A',
  // API "type" = REPLICATED/MANUAL, not BUY/SELL
  type: String(raw.type || raw.side || raw.action || 'REPLICATED').toUpperCase(),
  masterQty: toNumber(raw.masterQty, raw.quantity, raw.masterQuantity),
  myQty: toNumber(raw.myQty, raw.childQty, raw.quantityCopied),
  entry: toNumber(raw.entry, raw.entryPrice, raw.avgPrice),
  current: toNumber(raw.current, raw.ltp, raw.currentPrice, raw.exitPrice),
  ltp: toNumber(raw.ltp, raw.current, raw.currentPrice, raw.exitPrice),
  pnl: toNumber(raw.pnl, raw.netPnL, raw.profitLoss),
  time: raw.time || raw.timestamp || raw.createdAt || '',
  status: String(raw.status || raw.tradeStatus || 'EXECUTED').toUpperCase(),
  // Extra fields from actual API response
  broker: raw.broker || raw.brokerName || '',
  message: raw.message || '',
  reference: raw.reference || '',
  masterId: raw.masterId || '',
  childId: raw.childId || '',
  raw,
});

const normalizeChartPoint = (point = {}, index = 0) => ({
  time: point.time || point.date || point.label || `Point ${index + 1}`,
  personal: toNumber(point.personal),
  copied: toNumber(point.copied),
});

const normalizeTradeListItem = (trade = {}, index = 0) => ({
  id: trade.id || trade.tradeId || `personal-trade-${index}`,
  instrument: trade.instrument || trade.symbol || trade.tradingSymbol || 'N/A',
  type: String(trade.type || trade.side || trade.action || 'BUY').toUpperCase(),
  qty: toNumber(trade.qty, trade.quantity),
  date: trade.date || trade.time || trade.createdAt || '',
  pnl: toNumber(trade.pnl, trade.netPnL, trade.profitLoss),
});

const normalizeChildAnalytics = (raw = {}) => {
  // API returns: { totalPnl, copiedTrades, failedReplications, masterPnlComparison: {} }
  const masterComparison = raw.masterPnlComparison || raw.masterComparison || {};
  const historySource = Array.isArray(raw.pnlHistory)
    ? raw.pnlHistory
    : Array.isArray(raw.chartData)
      ? raw.chartData
      : [];

  return {
    totalPnl: toNumber(raw.totalPnl, raw.totalPnL),
    totalPnL: toNumber(raw.totalPnL, raw.totalPnl),
    personalPnL: toNumber(raw.personalPnL),
    copiedPnL: toNumber(raw.copiedPnL, raw.totalPnL, raw.totalPnl),
    masterPnL: toNumber(raw.masterPnL, masterComparison.masterPnl),
    personalTrades: toNumber(raw.personalTrades),
    // API returns copiedTrades (not copiedCount)
    copiedTrades: toNumber(raw.copiedTrades, raw.copiedCount),
    // API returns failedReplications
    failedReplications: toNumber(raw.failedReplications, raw.failedCount),
    portfolioValue: toNumber(raw.portfolioValue, raw.portfolioAmount, raw.totalAssets, raw.totalPnl, raw.totalPnL),
    winRate: toNumber(raw.winRate),
    activeMasters: toNumber(raw.activeMasters),
    pnlHistory: historySource.map(normalizeChartPoint),
    personalTradesList: (Array.isArray(raw.personalTradesList) ? raw.personalTradesList : []).map(normalizeTradeListItem),
    masterPnlComparison: {
      // API returns masterPnlComparison as an object (may be empty {})
      masterPnl: toNumber(masterComparison.masterPnl, raw.masterPnL),
      childPnl: toNumber(masterComparison.childPnl, raw.copiedPnL, raw.totalPnL, raw.totalPnl),
      replicationAccuracy: toNumber(masterComparison.replicationAccuracy),
      failedReplications: toNumber(masterComparison.failedReplications, raw.failedReplications),
    },
    raw,
  };
};

export const childService = {
  async getMasters() {
    try {
      const res = await api.get('/api/v1/child/masters');
      const list =
        Array.isArray(res.data?.masters) ? res.data.masters :
        Array.isArray(res.data?.data?.masters) ? res.data.data.masters :
        extractList(res.data);
      return list.map(normalizeMaster);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load masters'));
    }
  },

  async getSubscriptions() {
    try {
      const res = await api.get('/api/v1/child/subscriptions');
      return extractList(res.data).map(normalizeSubscription);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load subscriptions'));
    }
  },

  async subscribe(body) {
    if (!body?.brokerAccountId) {
      throw new Error('Please select a broker account before subscribing. Go to Demat Accounts and connect your broker first.');
    }
    try {
      const payload = {
        masterId: body?.masterId,
        brokerAccountId: body?.brokerAccountId,
        scalingFactor: body?.scalingFactor ?? 1.0,
      };
      const res = await api.post('/api/v1/child/subscriptions', payload);
      cacheSubscriptionAllocation(body?.masterId, body?.allocationAmount || body?.allocation);
      return normalizeSubscription(res.data?.data || res.data || body);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to subscribe'));
    }
  },

  async unsubscribe(masterId) {
    try {
      const res = await api.delete(`/api/v1/child/subscriptions/${masterId}`);
      removeSubscriptionAllocation(masterId);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to unsubscribe'));
    }
  },

  async pauseCopying(body) {
    try {
      const res = await api.post('/api/v1/child/copying/pause', body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to pause copying'));
    }
  },

  async resumeCopying(body) {
    try {
      const res = await api.post('/api/v1/child/copying/resume', body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to resume copying'));
    }
  },

  async getScaling(masterId) {
    try {
      const params = masterId ? { masterId } : {};
      const res = await api.get('/api/v1/child/scaling', { params });
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load scaling'));
    }
  },

  async updateScaling(body) {
    try {
      const numericMultiplier = Number(body?.multiplier ?? body?.scalingFactor ?? 1);
      const safeMultiplier = Math.min(10, Math.max(0.01, Number.isFinite(numericMultiplier) ? numericMultiplier : 1));
      const payload = {
        masterId: body?.masterId,
        scalingFactor: safeMultiplier,
      };
      const res = await api.put('/api/v1/child/scaling', payload);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update scaling'));
    }
  },

  async switchBrokerAccount({ masterId, brokerAccountId }) {
    if (!masterId) throw new Error('masterId is required');
    if (!brokerAccountId) throw new Error('Please select a broker account');
    try {
      const res = await api.put('/api/v1/child/subscriptions/broker', {
        masterId,
        brokerAccountId,
      });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to switch broker account'));
    }
  },

  async getCopiedTrades() {
    try {
      const res = await api.get('/api/v1/child/copied-trades');
      const list =
        Array.isArray(res.data?.trades) ? res.data.trades :
        Array.isArray(res.data?.data?.trades) ? res.data.data.trades :
        extractList(res.data);
      return list.map(normalizeCopiedTrade);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load copied trades'));
    }
  },

  async getAnalytics() {
    try {
      const res = await api.get('/api/v1/child/analytics');
      return normalizeChildAnalytics(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load analytics'));
    }
  },

  async getCopyLogs() {
    try {
      const res = await api.get('/api/v1/child/copy/logs');
      return res.data?.logs || res.data || [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load copy logs'));
    }
  },
};
