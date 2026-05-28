import api from '@/lib/api';
import { normalizePosition } from '@/lib/broker';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.error ||
  error?.response?.data?.message ||
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

const toNumber = (...values) => {
  for (const value of values) {
    if (value == null || value === '') continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const expandChildRecords = (rawList = []) =>
  rawList.flatMap((entry = {}) => {
    const subs = Array.isArray(entry.subscriptions)
      ? entry.subscriptions
      : Array.isArray(entry.subscriptionDetails)
      ? entry.subscriptionDetails
      : [];

    if (!subs.length) return [entry];

    return subs.map((sub) => ({
      ...entry,
      ...sub,
      child: entry.child || entry.user || entry.profile || null,
    }));
  });

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
      'INACTIVE'
  ).toUpperCase();

  return {
    id: childId,
    childId,
    subscriptionId: raw.subscriptionId || raw.id || '',
    userId: raw.userId || source.userId || source.id || childId,
    brokerAccountId:
      raw.brokerAccountId ||
      raw.accountId ||
      raw.linkedBrokerAccountId ||
      source.brokerAccountId ||
      source.accountId ||
      '',
    clientId: raw.clientId || source.clientId || source.username || '',
    name,
    childName: name,
    nickname: raw.nickname || source.nickname || name,
    email: raw.email || source.email || '',
    broker: raw.broker || raw.brokerName || source.broker || source.brokerName || '',
    brokerName: raw.brokerName || source.brokerName || raw.broker || source.broker || '',
    multiplier: Number(raw.multiplier ?? raw.scalingFactor ?? raw.scale ?? 1),
    allocation: Number(raw.allocation || raw.allocationAmount || raw.capitalAllocation || 0),
    allocationAmount: Number(raw.allocationAmount || raw.allocation || raw.capitalAllocation || 0),
    totalPnL: Number(raw.totalPnL || raw.pnl || raw.profitLoss || 0),
    pnl: Number(raw.pnl || raw.totalPnL || raw.profitLoss || 0),
    tradesCopied: Number(raw.tradesCopied || raw.tradeCount || raw.copiedTrades || 0),
    tradeCount: Number(raw.tradeCount || raw.tradesCopied || raw.copiedTrades || 0),
    margin: Number(
      raw.margin ??
      raw.marginAvailable ??
      raw.availableMargin ??
      raw.available_margin ??
      source.margin ??
      source.marginAvailable ??
      source.availableMargin ??
      source.available_margin ??
      0
    ),
    pnlToday: Number(
      raw.pnlToday ??
      raw.pnl ??
      raw.todayPnL ??
      raw.netPnL ??
      raw.dailyPnL ??
      0
    ),
    positions: Number(raw.pos ?? raw.openPositionsCount ?? raw.positions ?? raw.openPositions ?? raw.positionCount ?? 0),
    lowMargin: Boolean(raw.lowMargin ?? source.lowMargin ?? false),
    sessionActive: raw.sessionActive != null ? Boolean(raw.sessionActive) : (source.sessionActive != null ? Boolean(source.sessionActive) : true),
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
  id: raw.id || raw.tradeId || `trade-${index}`,
  // API returns type (REPLICATED/MANUAL), not instrument/symbol
  instrument: raw.symbol || raw.instrument || raw.tradingSymbol || raw.reference || 'N/A',
  symbol: raw.symbol || raw.instrument || raw.tradingSymbol || raw.reference || 'N/A',
  type: String(raw.type || raw.side || raw.action || 'REPLICATED').toUpperCase(),
  qty: Number(raw.qty || raw.quantity || 0),
  entryPrice: Number(raw.entryPrice || raw.entry || raw.avgEntryPrice || raw.price || 0),
  exitPrice: Number(raw.exitPrice || raw.exit || raw.currentPrice || raw.ltp || 0),
  pnl: Number(raw.pnl || raw.netPnL || raw.profitLoss || 0),
  // API returns status (EXECUTED/FAILED), message, broker, reference, masterId, childId
  status: raw.status || raw.tradeStatus || 'EXECUTED',
  broker: raw.broker || raw.brokerName || '',
  message: raw.message || '',
  reference: raw.reference || raw.brokerOrderId || '',
  masterId: raw.masterId || '',
  childId: raw.childId || '',
  market: raw.segment || raw.market || '',
  date: raw.date || raw.tradeDate || raw.createdAt || '',
  copiedBy: raw.copiedBy || raw.children || [],
  children: raw.children || raw.copiedBy || [],
  raw,
});

const normalizeMasterAnalytics = (raw = {}) => ({
  // API returns: { totalPnl, winRate, totalTrades, totalReplications, childPerformance }
  totalPnl: toNumber(raw.totalPnl, raw.totalPnL),
  totalPnL: toNumber(raw.totalPnL, raw.totalPnl),
  winRate: toNumber(raw.winRate),
  totalTrades: toNumber(raw.totalTrades),
  totalReplications: toNumber(raw.totalReplications),
  // API does not return totalChildren directly — derive from childPerformance array length
  totalChildren: toNumber(raw.totalChildren, raw.totalFollowers, Array.isArray(raw.childPerformance) ? raw.childPerformance.length : 0),
  totalFollowers: toNumber(raw.totalFollowers, raw.totalChildren, Array.isArray(raw.childPerformance) ? raw.childPerformance.length : 0),
  revenue: toNumber(raw.revenue, raw.totalEarnings),
  totalEarnings: toNumber(raw.totalEarnings, raw.revenue),
  subscriptionRevenue: toNumber(raw.subscriptionRevenue),
  performanceBonus: toNumber(raw.performanceBonus),
  portfolioValue: toNumber(raw.portfolioValue, raw.totalValue),
  earningsBreakdown: Array.isArray(raw.earningsBreakdown)
    ? raw.earningsBreakdown.map((item) => ({
        name: item.name || 'Unknown',
        value: toNumber(item.value),
      }))
    : [],
  performanceChart: Array.isArray(raw.performanceChart)
    ? raw.performanceChart.map((point, index) => ({
        date: point.date || point.time || `Point ${index + 1}`,
        value: toNumber(point.value),
      }))
    : [],
  pnl: Array.isArray(raw.pnl) ? raw.pnl : [],
  // API returns childPerformance: [{ childId, scalingFactor, copyingStatus }]
  childPerformance: (Array.isArray(raw.childPerformance) ? raw.childPerformance : []).map((child, index) => ({
    childId: child.childId || child.id || `child-${index}`,
    scalingFactor: toNumber(child.scalingFactor, child.multiplier, 1),
    copyingStatus: String(child.copyingStatus || child.status || 'ACTIVE').toUpperCase(),
    pnl: toNumber(child.pnl, child.totalPnL),
    tradesCopied: toNumber(child.tradesCopied, child.tradeCount),
  })),
  raw,
});

const normalizeEarnings = (raw = {}) => ({
  totalEarnings: toNumber(raw.totalEarnings),
  thisMonth: toNumber(raw.thisMonth),
  lastMonth: toNumber(raw.lastMonth),
  pendingPayout: toNumber(raw.pendingPayout),
  currency: raw.currency || 'INR',
  monthlyBreakdown: (Array.isArray(raw.monthlyBreakdown) ? raw.monthlyBreakdown : []).map((entry, index) => ({
    id: entry.month || `month-${index}`,
    month: entry.month || 'N/A',
    subscribers: toNumber(entry.subscribers),
    subscriptionFee: toNumber(entry.subscriptionFee),
    performanceBonus: toNumber(entry.performanceBonus),
    total: toNumber(entry.total, toNumber(entry.subscriptionFee) + toNumber(entry.performanceBonus)),
  })),
  payouts: (Array.isArray(raw.payouts) ? raw.payouts : []).map((payout, index) => ({
    id: payout.id || `${payout.date || 'payout'}-${index}`,
    date: payout.date || payout.createdAt || '',
    amount: toNumber(payout.amount),
    method: payout.method || payout.mode || 'N/A',
    status: payout.status || 'Pending',
  })),
  raw,
});

const normalizeTradePnl = (raw = {}) => {
  const payload = raw?.data || raw || {};
  const summary = payload.summary || {};
  return {
    summary: {
      totalRealisedPnl: toNumber(summary.totalRealisedPnl, summary.totalRealizedPnl, summary.realisedPnl, summary.realizedPnl),
      totalUnrealisedPnl: toNumber(summary.totalUnrealisedPnl, summary.totalUnrealizedPnl, summary.unrealisedPnl, summary.unrealizedPnl),
      todayPnl: toNumber(summary.todayPnl, summary.todayPnL, summary.dailyPnl),
      totalTrades: toNumber(summary.totalTrades, summary.tradeCount),
      winRate: toNumber(summary.winRate),
    },
    trades: Array.isArray(payload.trades) ? payload.trades.map(normalizeTrade) : [],
    raw: payload,
  };
};

const normalizePositionsPayload = (raw = {}) => {
  const payload = raw?.data || raw || {};
  const positions = Array.isArray(payload.positions) ? payload.positions : [];
  return {
    positions: positions.map(normalizePosition),
    totalPnl: toNumber(payload.totalPnl, payload.totalPnL),
    count: toNumber(payload.count, positions.length),
    brokerAccountId: payload.brokerAccountId || '',
    brokerId: payload.brokerId || '',
    error: payload.error || '',
    errorCode: payload.errorCode || null,
    action: payload.action || null,
    raw: payload,
  };
};

export const masterService = {
  // IMPORTANT: All master endpoints require /api/v1/master/ prefix AND JWT.
  // Do NOT use /api/v1/dashboard or /api/v1/trades for master data.
  async getChildren() {
    try {
      const res = await api.get('/api/v1/master/children');
      const list = expandChildRecords(extractList(res.data));
      return list.map(normalizeChild);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load children'));
    }
  },

  async getSubscriptionsByMaster(masterId) {
    try {
      const res = await api.get('/api/v1/master/children');
      const list = expandChildRecords(extractList(res.data));
      return list.map((raw, index) => ({
        ...normalizeChild(raw, index),
        id: raw.childId || raw.id || `child-${index}`,
        childId: raw.childId || raw.id || `child-${index}`,
        subscriptionId: raw.subscriptionId || raw.id || '',
        brokerAccountId:
          raw.brokerAccountId ||
          raw.accountId ||
          raw.linkedBrokerAccountId ||
          '',
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

  async bulkLinkChildren(children) {
    try {
      const res = await api.post('/api/v1/master/children/bulk-link', {
        children: (children || []).map((child) => ({
          childId: child.childId || child.id,
          ...(child.scalingFactor != null ? { scalingFactor: child.scalingFactor } : {}),
        })),
      });
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to bulk link children'));
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

  async pauseChild(childId) {
    try {
      const res = await api.post(`/api/v1/master/children/${childId}/pause`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to pause child'));
    }
  },

  async resumeChild(childId) {
    try {
      const res = await api.post(`/api/v1/master/children/${childId}/resume`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to resume child'));
    }
  },

  async getAnalytics() {
    try {
      const res = await api.get('/api/v1/master/dashboard');
      return normalizeMasterAnalytics(res.data?.data || res.data || {});
    } catch (error) {
      try {
        const fallback = await api.get('/api/v1/master/analytics');
        return normalizeMasterAnalytics(fallback.data?.data || fallback.data || {});
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to load analytics'));
      }
    }
  },

  async getCopyTradingData() {
    try {
      const res = await api.get('/api/v1/master/copy-trading');
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load copy trading data'));
    }
  },

  async getPnlAnalytics() {
    try {
      const res = await api.get('/api/v1/master/pnl-analytics');
      return res.data?.data || res.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load P&L analytics'));
    }
  },

  async getTradeHistory() {
    try {
      const res = await api.get('/api/v1/master/trade-logs');
      const list =
        Array.isArray(res.data?.logs) ? res.data.logs :
        Array.isArray(res.data?.trades) ? res.data.trades :
        Array.isArray(res.data?.data?.logs) ? res.data.data.logs :
        Array.isArray(res.data?.data?.trades) ? res.data.data.trades :
        extractList(res.data);
      return list.map(normalizeTrade);
    } catch (error) {
      try {
        const fallback = await api.get('/api/v1/master/trade-history');
        const list =
          Array.isArray(fallback.data?.logs) ? fallback.data.logs :
          Array.isArray(fallback.data?.trades) ? fallback.data.trades :
          Array.isArray(fallback.data?.data?.logs) ? fallback.data.data.logs :
          Array.isArray(fallback.data?.data?.trades) ? fallback.data.data.trades :
          extractList(fallback.data);
        return list.map(normalizeTrade);
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to load trade history'));
      }
    }
  },

  async getTradePnl() {
    try {
      const res = await api.get('/api/v1/master/trade-pnl');
      return normalizeTradePnl(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load trade P&L'));
    }
  },

  async subscribeToChild(childId, scalingFactor) {
    try {
      const body = scalingFactor == null ? undefined : { scalingFactor };
      const res = await api.post(`/api/v1/master/children/${childId}/link`, body);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to link child'));
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

  async declineChild(childId) {
    try {
      const res = await api.post(`/api/v1/master/children/${childId}/decline`);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to decline child'));
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

  async getActiveAccount() {
    try {
      const res = await api.get('/api/v1/master/active-account');
      return res.data?.data || res.data;
    } catch (error) {
      if (error?.response?.status === 500) {
        return { brokerAccountId: '' };
      }
      throw new Error(getErrorMessage(error, 'Unable to get active account'));
    }
  },

  async setActiveAccount(brokerAccountId) {
    try {
      const res = await api.post('/api/v1/master/active-account', { brokerAccountId });
      return res.data?.data || res.data;
    } catch (error) {
      if (error?.response?.status === 500) {
        return { brokerAccountId };
      }
      throw new Error(getErrorMessage(error, 'Unable to set active account'));
    }
  },

  async clearActiveAccount() {
    try {
      const res = await api.delete('/api/v1/master/active-account');
      return res.data?.data || res.data;
    } catch (error) {
      if (error?.response?.status === 500) {
        return { brokerAccountId: '' };
      }
      throw new Error(getErrorMessage(error, 'Unable to clear active account'));
    }
  },

  async getEarnings() {
    try {
      const res = await api.get('/api/v1/master/earnings');
      return normalizeEarnings(res.data?.data || res.data || {});
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load earnings'));
    }
  },

  async getPayouts() {
    try {
      const res = await api.get('/api/v1/master/payouts');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load payouts'));
    }
  },

  async getCopyLogs() {
    try {
      const res = await api.get('/api/v1/master/trade-logs');
      return res.data?.logs || res.data?.trades || res.data || [];
    } catch (error) {
      try {
        const fallback = await api.get('/api/v1/master/copy/logs');
        return fallback.data?.logs || fallback.data || [];
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to load copy logs'));
      }
    }
  },

  async getPositions() {
    try {
      const res = await api.get('/api/v1/master/positions');
      return normalizePositionsPayload(res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load positions'));
    }
  },

  async getOpenBook() {
    try {
      const res = await api.get('/api/v1/master/open-book');
      const payload = res.data?.data || res.data || {};
      const orders = Array.isArray(payload.orders) ? payload.orders : [];
      return {
        orders,
        total: Number(payload.total ?? orders.length),
        brokerAccountId: payload.brokerAccountId || '',
        broker: payload.broker || '',
        error: payload.error || '',
        errorCode: payload.errorCode || null,
        action: payload.action || null,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load open book'));
    }
  },

  async getOpenOptions() {
    try {
      const res = await api.get('/api/v1/master/open-options');
      const payload = res.data?.data || res.data || {};
      const positions = Array.isArray(payload.positions) ? payload.positions : [];
      return {
        positions,
        total: Number(payload.total ?? positions.length),
        totalPnl: Number(payload.totalPnl ?? 0),
        brokerAccountId: payload.brokerAccountId || '',
        error: payload.error || '',
        errorCode: payload.errorCode || null,
        action: payload.action || null,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load open options'));
    }
  },

  async getOptionStatus() {
    try {
      const res = await api.get('/api/v1/master/option-status');
      const payload = res.data?.data || res.data || {};
      const items = Array.isArray(payload.items) ? payload.items : [];
      return {
        items,
        total: Number(payload.total ?? items.length),
        success: Number(payload.success ?? 0),
        failed: Number(payload.failed ?? 0),
        skipped: Number(payload.skipped ?? 0),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load option status'));
    }
  },

  async squareOffPosition({ symbol, qty, type = 'SELL', product = 'MIS' } = {}) {
    try {
      const res = await api.post('/api/v1/master/positions/square-off', { symbol, qty, type, product });
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to square off position'));
    }
  },
};
