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
  const candidates = Object.values(data || {}).filter(Array.isArray);
  return candidates[0] || [];
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
    'PAUSED'
  ).toUpperCase();

  return {
    id: masterId,
    subscriptionId,
    masterId,
    masterName: raw.masterName || raw.name || raw.master?.name || raw.master?.fullName || 'Unknown',
    name: raw.name || raw.masterName || raw.master?.name || raw.master?.fullName || 'Unknown',
    multiplier: Number(raw.multiplier || raw.scalingFactor || raw.scale || 1),
    scalingFactor: Number(raw.scalingFactor || raw.multiplier || raw.scale || 1),
    allocation: Number(resolvedAllocation),
    allocationAmount: Number(resolvedAllocation),
    pnl: Number(raw.pnl || raw.totalPnL || raw.netPnL || raw.profitLoss || 0),
    totalPnL: Number(raw.totalPnL || raw.pnl || raw.netPnL || raw.profitLoss || 0),
    tradesCopiedToday: Number(raw.tradestoday || raw.tradesCopiedToday || raw.tradeCountToday || 0),
    status,
    copyingStatus: status,
    tradingEnabled: status === 'ACTIVE',
    brokerAccountId: raw.brokerAccountId || '',
    raw,
  };
};

const normalizeCopiedTrade = (raw = {}, index = 0) => ({
  id: raw.id || raw.tradeId || `${raw.masterName || raw.master || 'trade'}-${index}`,
  master: raw.master || raw.masterName || raw.name || 'Unknown',
  instrument: raw.instrument || raw.symbol || raw.tradingSymbol || 'N/A',
  type: String(raw.type || raw.side || raw.action || 'BUY').toUpperCase(),
  masterQty: Number(raw.masterQty || raw.quantity || raw.masterQuantity || 0),
  myQty: Number(raw.myQty || raw.childQty || raw.quantityCopied || 0),
  entry: Number(raw.entry || raw.entryPrice || raw.avgPrice || 0),
  current: Number(raw.current || raw.ltp || raw.currentPrice || raw.exitPrice || 0),
  pnl: Number(raw.pnl || raw.netPnL || raw.profitLoss || 0),
  time: raw.time || raw.timestamp || raw.createdAt || '',
  raw,
});

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

  async bulkSubscribe(masters) {
    try {
      const res = await api.post('/api/v1/child/subscriptions/bulk', {
        masters,
      });
      masters.forEach((master) => {
        cacheSubscriptionAllocation(
          master?.masterId,
          master?.allocationAmount || master?.allocation
        );
      });
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to bulk subscribe'));
    }
  },

  async bulkUnsubscribe(masterIds) {
    try {
      const res = await api.post('/api/v1/child/subscriptions/bulk-unsubscribe', {
        masterIds,
      });
      (masterIds || []).forEach(removeSubscriptionAllocation);
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to bulk unsubscribe'));
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
      return res.data?.data || res.data || {};
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