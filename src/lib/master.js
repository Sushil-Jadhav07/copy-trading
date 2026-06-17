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

const deriveOrderSegment = (order = {}) => {
  const explicitSegment = String(order.segment || order.market || '').trim().toUpperCase();
  if (explicitSegment) return explicitSegment;

  const exchange = String(
    order.exchange ||
    order.exchangeSegment ||
    order.exchange_segment ||
    ''
  ).trim().toUpperCase();
  const symbol = String(
    order.tradingSymbol ||
    order.tradingsymbol ||
    order.trading_symbol ||
    order.symbol ||
    ''
  ).trim().toUpperCase();

  if (
    ['NFO', 'BFO', 'FO', 'NSE_FNO', 'BSE_FNO'].includes(exchange) ||
    /(?:CE|PE)$/.test(symbol)
  ) {
    return 'FNO';
  }

  if (exchange.includes('NSE') || exchange.includes('BSE')) return exchange.endsWith('_EQ') ? 'EQ' : 'EQ';
  if (exchange.includes('CDS') || exchange.includes('BCD') || exchange.includes('CURR')) return 'CDS';
  if (exchange.startsWith('MCX')) return 'COMMODITY';
  return '';
};

const normalizeOpenBookOrder = (order = {}, index = 0) => ({
  id: order.order_id || order.orderId || order.exchangeOrderId || order.id || `order-${index}`,
  orderId: order.orderId || order.order_id || '',
  exchangeOrderId: order.exchangeOrderId || order.exchange_order_id || '',
  correlationId: order.correlationId || order.correlation_id || '',
  symbol: order.tradingSymbol || order.tradingsymbol || order.trading_symbol || order.symbol || 'N/A',
  exchange: order.exchange || String(order.exchangeSegment || order.exchange_segment || '').split('_')[0] || 'NSE',
  exchangeSegment: order.exchangeSegment || order.exchange_segment || '',
  segment: deriveOrderSegment(order),
  orderType: order.orderType || order.order_type || 'MARKET',
  type: String(order.transactionType || order.transaction_type || order.type || order.side || 'BUY').toUpperCase(),
  qty: Number(order.quantity ?? order.qty ?? order.filledQty ?? order.filled_quantity ?? 0),
  filledQty: Number(order.filledQty ?? order.filled_quantity ?? order.quantity ?? order.qty ?? 0),
  remainingQty: Number(order.remainingQuantity ?? order.remaining_quantity ?? 0),
  price: Number(order.averageTradedPrice ?? order.average_fill_price ?? order.average_price ?? order.averagePrice ?? order.price ?? 0),
  limitPrice: Number(order.price ?? 0),
  triggerPrice: Number(order.triggerPrice ?? order.trigger_price ?? 0),
  status: String(order.orderStatus || order.order_status || order.status || 'UNKNOWN').toUpperCase(),
  validity: order.validity || '',
  product: order.product || order.productType || '',
  latencyMs: order.latencyMs != null ? Number(order.latencyMs) : (order.totalExecutionMs != null ? Number(order.totalExecutionMs) : null),
  statusMessage: order.statusMessage || order.status_message || order.omsErrorDescription || '',
  reason: order.reason || order.rejectReason || order.rejection_reason || '',
  message: order.message || order.omsErrorDescription || '',
  createTime: order.createTime || order.order_timestamp || null,
  updateTime: order.updateTime || order.exchange_update_timestamp || null,
  exchangeTime: order.exchangeTime || order.exchange_timestamp || null,
  orderTime: order.createTime || order.updateTime || order.exchangeTime || order.order_timestamp || null,
  tradedAt: order.exchangeTime || order.updateTime || null,
  brokerClientId: order.dhanClientId || order.clientId || '',
  securityId: order.securityId || '',
  raw: order,
});

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

const normalizeCopyLog = (raw = {}, index = 0) => ({
  ...raw,
  id: raw.id || `copy-log-${index}`,
  latencyMs: raw.latencyMs != null ? Number(raw.latencyMs) : null,
  totalExecutionMs: raw.totalExecutionMs != null ? Number(raw.totalExecutionMs) : null,
  product: raw.product || '',
  orderType: raw.orderType || '',
  price: raw.price != null ? Number(raw.price) : null,
  triggerPrice: raw.triggerPrice != null ? Number(raw.triggerPrice) : null,
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
      // Backend may not support DELETE on this endpoint — fall back to POST
      if (error?.response?.status === 405) {
        try {
          const res = await api.post(`/api/v1/master/children/${childId}/unlink`);
          return res.data?.data || res.data;
        } catch (postError) {
          throw new Error(getErrorMessage(postError, 'Unable to unlink child'));
        }
      }
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
        Array.isArray(res.data?.tradeLogs) ? res.data.tradeLogs :
        Array.isArray(res.data?.copyLogs) ? res.data.copyLogs :
        Array.isArray(res.data?.masterTrades) ? res.data.masterTrades :
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
          Array.isArray(fallback.data?.tradeLogs) ? fallback.data.tradeLogs :
          Array.isArray(fallback.data?.copyLogs) ? fallback.data.copyLogs :
          Array.isArray(fallback.data?.masterTrades) ? fallback.data.masterTrades :
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

  async setActiveAccounts(brokerAccountIds) {
    try {
      const ids = Array.isArray(brokerAccountIds)
        ? brokerAccountIds.filter(Boolean)
        : [brokerAccountIds].filter(Boolean);
      const res = await api.post('/api/v1/master/active-accounts', { brokerAccountIds: ids });
      return res.data?.data || res.data;
    } catch (error) {
      if (error?.response?.status === 500) {
        return { brokerAccountIds };
      }
      throw new Error(getErrorMessage(error, 'Unable to set active accounts'));
    }
  },

  async getActiveAccounts() {
    try {
      const res = await api.get('/api/v1/master/active-accounts');
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to get active accounts'));
    }
  },

  async clearActiveAccounts() {
    try {
      const res = await api.delete('/api/v1/master/active-accounts');
      return res.data?.data || res.data;
    } catch (error) {
      if (error?.response?.status === 500) return {};
      // Backend may not support DELETE — fall back to POST with empty list
      if (error?.response?.status === 405) {
        try {
          const res = await api.post('/api/v1/master/active-accounts', { brokerAccountIds: [] });
          return res.data?.data || res.data;
        } catch (postError) {
          if (postError?.response?.status === 500) return {};
          throw new Error(getErrorMessage(postError, 'Unable to clear active accounts'));
        }
      }
      throw new Error(getErrorMessage(error, 'Unable to clear active accounts'));
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
      const raw = res.data?.logs || res.data?.tradeLogs || res.data?.copyLogs || res.data?.trades || res.data || [];
      return Array.isArray(raw) ? raw.map(normalizeCopyLog) : [];
    } catch (error) {
      try {
        const fallback = await api.get('/api/v1/master/copy/logs');
        const raw = fallback.data?.logs || fallback.data?.tradeLogs || fallback.data?.copyLogs || fallback.data || [];
        return Array.isArray(raw) ? raw.map(normalizeCopyLog) : [];
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to load copy logs'));
      }
    }
  },

  async getPositions(accountId) {
    try {
      if (!accountId) {
        throw new Error('Account ID is required to load positions');
      }
      const res = await api.get(`/api/v1/brokers/accounts/${accountId}/positions`);
      return normalizePositionsPayload(res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load positions'));
    }
  },

  async getOpenBook() {
    try {
      const res = await api.get('/api/v1/master/open-book');
      const payload = res.data?.data || res.data || {};
      const rawOrders = Array.isArray(payload.orders) ? payload.orders : [];
      const orders = rawOrders.map(normalizeOpenBookOrder);
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
      const rawPositions = Array.isArray(payload.positions) ? payload.positions : [];
      const positions = rawPositions.map((pos, index) => ({
        id: pos.id || `${pos.symbol || pos.instrument || pos.tradingSymbol || pos.tradingsymbol || 'option'}-${index}`,
        symbol: pos.symbol || pos.instrument || pos.tradingSymbol || pos.tradingsymbol || 'N/A',
        qty: Number(pos.qty ?? pos.quantity ?? pos.netQuantity ?? 0),
        avgPrice: Number(pos.avgPrice ?? pos.averagePrice ?? pos.average_price ?? 0),
        ltp: Number(pos.ltp ?? pos.lastPrice ?? pos.last_price ?? 0),
        pnl: Number(pos.unrealizedPnl ?? pos.unrealized_pnl ?? pos.pnl ?? pos.m2m ?? 0),
        unrealizedPnl: Number(pos.unrealizedPnl ?? pos.unrealized_pnl ?? pos.pnl ?? pos.m2m ?? 0),
        product: pos.product || '',
        exchange: pos.exchange || '',
        type: String(pos.type || pos.side || pos.transaction_type || 'BUY').toUpperCase(),
        raw: pos,
      }));
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
      const rawItems = Array.isArray(payload.items) ? payload.items : [];
      const items = rawItems.map((item, index) => ({
        id: item.id || `option-status-${index}`,
        copyGroupId: item.copyGroupId || '',
        symbol: item.symbol || 'N/A',
        side: String(item.side || item.tradeType || 'BUY').toUpperCase(),
        type: String(item.side || item.tradeType || 'BUY').toUpperCase(),
        qty: Number(item.qty ?? item.childQty ?? 0),
        masterQty: Number(item.masterQty ?? item.qty ?? 0),
        status: String(item.status || item.childStatus || 'UNKNOWN').toUpperCase(),
        masterStatus: item.masterStatus || '',
        errorMessage: item.errorMessage || null,
        skipReason: item.skipReason || null,
        failureReason: item.failureReason || null,
        latencyMs: item.latencyMs != null ? Number(item.latencyMs) : null,
        masterId: item.masterId || '',
        childId: item.childId || '',
        orderId: item.orderId || '',
        childBrokerOrderId: item.childBrokerOrderId || '',
        createdAt: item.createdAt || null,
        childPlacedAt: item.childPlacedAt || null,
        masterPlacedAt: item.masterPlacedAt || null,
        instrumentType: String(item.instrumentType || '').toUpperCase(),
        isOption: Boolean(item.isOption),
        isFuture: Boolean(item.isFuture),
        time: item.createdAt || item.childPlacedAt || null,
        raw: item,
      }));
      const success = items.filter((i) => ['SUCCESS', 'EXECUTED'].includes(i.status)).length;
      const failed = items.filter((i) => i.status === 'FAILED').length;
      const skipped = items.filter((i) => i.status === 'SKIPPED').length;
      return {
        items,
        total: Number(payload.total ?? items.length),
        success: Number(payload.success ?? success),
        failed: Number(payload.failed ?? failed),
        skipped: Number(payload.skipped ?? skipped),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load option status'));
    }
  },

};
