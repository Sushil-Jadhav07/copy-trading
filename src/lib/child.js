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

const deriveOrderSegment = (order = {}) => {
  const explicitSegment = String(order.segment || order.market || '').trim().toUpperCase();
  if (explicitSegment) return explicitSegment;

  const exchangeSegment = String(order.exchangeSegment || order.exchange_segment || '').trim().toUpperCase();
  if (exchangeSegment.endsWith('_FNO') || exchangeSegment.endsWith('_FO')) return 'FNO';
  if (exchangeSegment.endsWith('_EQ')) return 'EQ';
  if (exchangeSegment.endsWith('_CD')) return 'CDS';
  if (exchangeSegment.startsWith('MCX')) return 'COMMODITY';

  const exchange = String(order.exchange || '').trim().toUpperCase();
  const symbol = String(
    order.tradingSymbol || order.tradingsymbol || order.trading_symbol || order.symbol || ''
  ).trim().toUpperCase();

  if (
    ['NFO', 'BFO', 'FO'].includes(exchange) ||
    /(?:CE|PE)$/.test(symbol)
  ) {
    return 'FNO';
  }

  if (['NSE', 'BSE'].includes(exchange)) return 'EQ';
  if (['CDS', 'BCD'].includes(exchange)) return 'CDS';
  if (exchange.startsWith('MCX')) return 'COMMODITY';
  return '';
};

const clampPriceTolerance = (value, fallback = 2) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(10, Math.max(0, parsed));
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
    copySides: raw.copySides || raw.copy_sides || 'BUY_ONLY',
    allowShortSelling: Boolean(raw.allowShortSelling ?? raw.allow_short_selling ?? false),
    priceTolerancePct: clampPriceTolerance(raw.priceTolerancePct ?? raw.price_tolerance_pct, 2),
    raw,
  };
};

export const normalizeCopiedTrade = (raw = {}, index = 0) => ({
  // API returns: { id, masterId, childId, type, status, message, broker, reference, createdAt }
  id: raw.id || raw.tradeId || `trade-${index}`,
  master: raw.master || raw.masterName || raw.masterId || 'Unknown',
  masterName: raw.masterName || raw.master || '',
  // Prefer instrument/symbol; fallback to reference.
  instrument: raw.instrument || raw.symbol || raw.tradingSymbol || raw.reference || 'N/A',
  // Prefer side/action for table direction; API "type" can be REPLICATED/MANUAL.
  type: String(raw.side || raw.action || raw.tradeSide || raw.type || raw.tradeType || 'BUY').toUpperCase(),
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
  copyGroupId: raw.copyGroupId || raw.copy_group_id || '',
  skipReason: raw.skipReason || raw.skip_reason || null,
  masterId: raw.masterId || '',
  childId: raw.childId || '',
  // Latency & timing fields (added May 2026 API update)
  latencyMs: raw.latencyMs != null ? Number(raw.latencyMs) : raw.totalChildLatencyMs != null ? Number(raw.totalChildLatencyMs) : null,
  engineReceivedAt: raw.engineReceivedAt || raw.engine_received_at || null,
  childPlacedAt: raw.childPlacedAt || raw.child_placed_at || null,
  placedAt: raw.childPlacedAt || raw.placedAt || raw.time || null,
  masterTriggeredAt: raw.masterTriggeredAt || raw.masterPlacedAt || raw.triggeredAt || null,
  masterOrderTime: raw.masterOrderTime || raw.rawMaster?.order_timestamp || raw.rawMaster?.orderTime || raw.rawMaster?.timestamp || null,
  exchange: raw.exchange || '',
  segment: raw.segment || '',
  product: raw.product || '',
  orderType: raw.orderType || '',
  price: toNumber(raw.price, raw.entryPrice, raw.entry, raw.avgPrice),
  triggerPrice:
    raw.triggerPrice != null || raw.trigger_price != null || raw.stopPrice != null || raw.triggerprice != null
      ? toNumber(raw.triggerPrice, raw.trigger_price, raw.stopPrice, raw.triggerprice)
      : null,
  raw,
});

const normalizeTradeTimelineItem = (raw = {}, index = 0) => ({
  eventId: raw.eventId || raw.copyGroupId || raw.id || `timeline-${index}`,
  masterName: raw.masterName || raw.master || raw.masterUserName || 'Master',
  symbol: raw.symbol || raw.instrument || raw.tradingSymbol || 'UNKNOWN',
  side: String(raw.side || raw.action || raw.type || 'BUY').toUpperCase(),
  masterTriggeredAt: raw.masterTriggeredAt || raw.masterOrderTime || raw.triggeredAt || raw.createdAt || null,
  myOrderPlacedAt: raw.myOrderPlacedAt || raw.childPlacedAt || raw.placedAt || raw.orderPlacedAt || null,
  totalChildLatencyMs: raw.totalChildLatencyMs ?? raw.latencyMs ?? raw.brokerLatencyMs ?? null,
  status: String(raw.status || raw.tradeStatus || 'UNKNOWN').toUpperCase(),
  skipReason: raw.skipReason || raw.skip_reason || null,
  errorMessage: raw.errorMessage || raw.error || null,
  failureReason: raw.failureReason || raw.reason || null,
  masterStatus: raw.masterStatus || null,
  masterQty: toNumber(raw.masterQty, raw.masterQuantity),
  qty: toNumber(raw.qty, raw.quantity, raw.myQty, raw.childQty),
  orderId: raw.orderId || raw.brokerOrderId || '',
  broker: raw.broker || raw.brokerName || '',
  product: raw.product || '',
  orderType: raw.orderType || '',
  price: toNumber(raw.price, raw.entryPrice, raw.avgPrice),
  triggerPrice:
    raw.triggerPrice != null || raw.trigger_price != null || raw.stopPrice != null || raw.triggerprice != null
      ? toNumber(raw.triggerPrice, raw.trigger_price, raw.stopPrice, raw.triggerprice)
      : null,
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

const normalizeOpenBookOrder = (order = {}, index = 0) => ({
  id: order.order_id || order.orderId || order.id || `order-${index}`,
  symbol: order.tradingSymbol || order.tradingsymbol || order.trading_symbol || order.symbol || 'N/A',
  exchange: order.exchange || String(order.exchangeSegment || order.exchange_segment || '').split('_')[0] || 'NSE',
  segment: deriveOrderSegment(order),
  orderType: order.order_type || order.orderType || 'MARKET',
  type: String(order.transactionType || order.transaction_type || order.type || order.side || 'BUY').toUpperCase(),
  qty: Number(order.quantity ?? order.qty ?? order.filledQty ?? order.filled_quantity ?? 0),
  price: Number(order.averageTradedPrice ?? order.average_fill_price ?? order.average_price ?? order.price ?? 0),
  limitPrice: Number(order.price ?? 0),
  status: String(order.orderStatus || order.order_status || order.status || 'UNKNOWN').toUpperCase(),
  latencyMs: order.latencyMs != null ? Number(order.latencyMs) : null,
  statusMessage: order.statusMessage || order.status_message || order.omsErrorDescription || '',
  reason: order.reason || order.rejectReason || order.rejection_reason || '',
  message: order.message || '',
  product: order.product || order.productType || '',
  createTime: order.createTime || order.created_at || order.order_timestamp || null,
  updateTime: order.updateTime || order.exchange_update_timestamp || null,
  exchangeTime: order.exchangeTime || order.exchange_time || order.exchange_timestamp || null,
  orderTime: order.createTime || order.created_at || order.exchangeTime || order.exchange_time || order.order_timestamp || null,
  tradedAt: order.exchangeTime || order.exchange_time || order.trade_date || null,
  raw: order,
});

const normalizeOpenOptionPosition = (position = {}, index = 0) => ({
  id: position.id || `${position.symbol || 'option'}-${index}`,
  symbol: position.symbol || position.instrument || 'N/A',
  qty: Number(position.qty ?? position.quantity ?? 0),
  avgPrice: Number(position.avgPrice ?? position.averagePrice ?? 0),
  ltp: Number(position.ltp ?? position.lastPrice ?? 0),
  pnl: Number(position.pnl ?? 0),
  unrealizedPnl: Number(position.pnl ?? 0),
  side: String(position.side || position.type || 'BUY').toUpperCase(),
  product: position.product || '',
  exchange: position.exchange || '',
  raw: position,
});

const normalizeOptionStatusItem = (item = {}, index = 0) => ({
  id: item.id || `option-status-${index}`,
  copyGroupId: item.copyGroupId || '',
  symbol: item.symbol || 'N/A',
  side: String(item.side || 'BUY').toUpperCase(),
  qty: Number(item.qty ?? 0),
  childQty: item.childQty != null ? Number(item.childQty) : null,
  masterQty: Number(item.masterQty ?? item.qty ?? 0),
  status: String(item.status || 'UNKNOWN').toUpperCase(),
  childStatus: String(item.childStatus || item.status || 'UNKNOWN').toUpperCase(),
  masterStatus: String(item.masterStatus || '').toUpperCase(),
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
  raw: item,
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
    if (!body?.brokerAccountId) {
      throw new Error('Please select a broker account before subscribing. Go to Demat Accounts and connect your broker first.');
    }
    try {
      const payload = {
        masterId: body?.masterId,
        brokerAccountId: body?.brokerAccountId,
        scalingFactor: body?.scalingFactor ?? 1.0,
        ...(body?.copySides ? { copySides: body.copySides } : {}),
        ...(body?.allowShortSelling != null ? { allowShortSelling: Boolean(body.allowShortSelling) } : {}),
        ...(body?.priceTolerancePct != null ? { priceTolerancePct: clampPriceTolerance(body.priceTolerancePct) } : {}),
        ...(body?.allocationAmount != null ? { allocationAmount: Number(body.allocationAmount) } : {}),
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
      try {
        const fallback = await api.delete(`/api/v1/child/remove/${masterId}`);
        removeSubscriptionAllocation(masterId);
        return fallback.data?.data || fallback.data;
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to unsubscribe'));
      }
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
      const res = await api.get('/api/v1/child/pnl-dashboard');
      return normalizeChildAnalytics(res.data?.data || res.data || {});
    } catch (error) {
      try {
        const fallback = await api.get('/api/v1/child/analytics');
        return normalizeChildAnalytics(fallback.data?.data || fallback.data || {});
      } catch (fallbackError) {
        throw new Error(getErrorMessage(fallbackError, 'Unable to load analytics'));
      }
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

  async getPositions(accountId) {
    try {
      const params = accountId ? { accountId } : {};
      const res = await api.get('/api/v1/child/positions', { params });
      return normalizePositionsPayload(res.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load positions'));
    }
  },

  // Additions for May 2026 API update

  // NEW (May 2026): Update copy sides / allowShortSelling for an existing subscription
  async updateCopySettings(body) {
    try {
      const payload = {
        masterId: body?.masterId,
        ...(body?.copySides ? { copySides: body.copySides } : {}),
        ...(body?.allowShortSelling != null ? { allowShortSelling: Boolean(body.allowShortSelling) } : {}),
        ...(body?.priceTolerancePct != null ? { priceTolerancePct: clampPriceTolerance(body.priceTolerancePct) } : {}),
      };
      const res = await api.patch('/api/v1/child/subscriptions/copy-settings', payload);
      return res.data?.data || res.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update copy settings'));
    }
  },

  // NEW (May 2026): Child copy timeline with latency info
  async getTradeTimeline() {
    try {
      const res = await api.get('/api/v1/child/trade-timeline');
      const trades = res.data?.trades || res.data?.data?.trades || [];
      return Array.isArray(trades) ? trades.map(normalizeTradeTimelineItem) : [];
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load trade timeline'));
    }
  },

  async getOpenBook() {
    try {
      const res = await api.get('/api/v1/child/open-book');
      const payload = res.data?.data || res.data || {};
      const orders = Array.isArray(payload.orders) ? payload.orders : [];
      return {
        orders: orders.map(normalizeOpenBookOrder),
        total: Number(payload.total ?? orders.length),
        brokerAccountId: payload.brokerAccountId || '',
        broker: payload.broker || '',
        error: payload.error || '',
        errorCode: payload.errorCode || null,
        action: payload.action || null,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load child open book'));
    }
  },

  async getOpenOptions() {
    try {
      const res = await api.get('/api/v1/child/open-options');
      const payload = res.data?.data || res.data || {};
      const positions = Array.isArray(payload.positions) ? payload.positions : [];
      return {
        positions: positions.map(normalizeOpenOptionPosition),
        total: Number(payload.total ?? positions.length),
        totalPnl: Number(payload.totalPnl ?? 0),
        brokerAccountId: payload.brokerAccountId || '',
        error: payload.error || '',
        errorCode: payload.errorCode || null,
        action: payload.action || null,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load child open options'));
    }
  },

  async getOptionStatus() {
    try {
      const res = await api.get('/api/v1/child/option-status');
      const payload = res.data?.data || res.data || {};
      const items = Array.isArray(payload.items) ? payload.items : [];
      return {
        items: items.map(normalizeOptionStatusItem),
        total: Number(payload.total ?? items.length),
        success: Number(payload.success ?? 0),
        failed: Number(payload.failed ?? 0),
        skipped: Number(payload.skipped ?? 0),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load child option status'));
    }
  },
};

// Export normalizeSubscription for external use
export { normalizeSubscription };
