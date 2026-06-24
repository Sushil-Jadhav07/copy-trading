import api from '@/lib/api';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.details ||
  error?.message ||
  fallback;

const asArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const toFiniteNumberOrNull = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const toDateLabel = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleDateString('en-IN');
};

const pickRole = (role) => {
  const normalized = String(role || '').trim().toLowerCase();

  if (normalized === 'admin' || normalized === 'administrator') {
    return 'Admin';
  }

  if (normalized === 'master' || normalized === 'provider') {
    return 'Master';
  }

  return 'Child';
};

export const normalizeAdminUser = (payload = {}) => ({
  id: payload.userId || payload.id || payload._id || '',
  userId: payload.userId || payload.id || payload._id || '',
  name: payload.name || payload.fullName || 'User',
  email: payload.email || '',
  phone: payload.phone || '',
  role: pickRole(payload.role || payload.userType),
  status: String(payload.status || 'ACTIVE').toUpperCase(),
  joinedDate: toDateLabel(payload.createdAt || payload.created_at),
  createdAt: payload.createdAt || payload.created_at || null,
  twoFactorEnabled: Boolean(payload.twoFactorEnabled),
  brokerAccounts: asArray(payload.brokerAccounts),
  brokersCount: Number(payload.brokers) || asArray(payload.brokerAccounts).length || 0,
  raw: payload,
});

const extractCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.users)) {
    return payload.users;
  }

  if (Array.isArray(payload?.subscriptions)) {
    return payload.subscriptions;
  }

  if (Array.isArray(payload?.logs)) {
    return payload.logs;
  }

  const candidates = Object.values(payload || {}).filter(Array.isArray);
  return candidates[0] || [];
};

const extractMeta = (payload = {}) => ({
  total:
    payload.total ||
    payload.totalElements ||
    payload.totalCount ||
    payload.count ||
    null,
  page: payload.page || payload.currentPage || 1,
  limit: payload.limit || payload.pageSize || 20,
});

const normalizeTradeLog = (log = {}, index = 0) => {
  // API returns: { id, masterId, childId, type, status, message, broker, reference, createdAt }
  const type = String(log.type || log.eventType || 'REPLICATED').toUpperCase();
  const status = String(log.status || log.executionStatus || 'EXECUTED').toUpperCase();

  return {
    id: log.id || `log-${index}`,
    type,
    // API has masterId not masterName — show masterId as identifier
    master: log.masterName || log.master || log.masterId || 'Unknown',
    // API has reference for order/trade reference, no symbol field
    symbol: log.symbol || log.instrument || log.reference || log.ticker || 'N/A',
    // API has type field (REPLICATED/MANUAL), not action/side
    action: log.action || log.side || log.orderSide || type,
    qty: log.qty || log.quantity || 0,
    price: log.price || log.entryPrice || log.avgPrice || 0,
    broker: log.broker || log.brokerName || 'N/A',
    childName: log.childName || log.child || log.childId || '',
    timestamp: log.timestamp || log.createdAt || log.time || '',
    children: log.children || log.followers || log.copiedAccounts || 0,
    latency: log.latency || 0,
    message: log.message || '',
    reference: log.reference || '',
    error: log.error || log.reason || '',
    status:
      status === 'FAILED' || type === 'ERROR'
        ? 'error'
        : status === 'CANCELLED'
        ? 'warning'
        : 'success',
    raw: log,
  };
};

const normalizeSubscription = (subscription = {}, index = 0) => ({
  id: subscription.id || subscription.subscriptionId || `${subscription.masterId || 'subscription'}-${index}`,
  user: subscription.userName || subscription.masterName || subscription.name || 'Unknown',
  email: subscription.email || '',
  role: pickRole(subscription.role || 'MASTER'),
  plan: subscription.planName || subscription.plan || 'Subscription',
  status: String(subscription.status || 'ACTIVE')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase()),
  startDate: toDateLabel(subscription.startDate || subscription.createdAt),
  nextBilling: toDateLabel(subscription.nextBillingDate || subscription.renewalDate),
  amount: Number(subscription.amount || subscription.price || subscription.subscriptionAmount || 0),
  masterId: subscription.masterId || subscription.userId || '',
  raw: subscription,
});

const normalizeAdminPosition = (pos = {}, index = 0) => {
  const qty = Number(pos.qty || pos.quantity || pos.netQty || pos.netQuantity || 0);
  return {
    id: pos.id || pos.positionId || `pos-${index}`,
    masterId: pos.masterId || '',
    masterName: pos.masterName || pos.master || 'Unknown',
    name: pos.name || pos.contractDisplayName || pos.tradingsymbol || pos.trading_symbol || pos.symbol || 'N/A',
    symbol: pos.tradingsymbol || pos.trading_symbol || pos.symbol || pos.instrument || pos.tradingSymbol || 'N/A',
    exchange: pos.exchange || 'NSE',
    side: String(pos.side || pos.positionType || pos.direction || (qty >= 0 ? 'BUY' : 'SELL')).toUpperCase(),
    qty: qty,
    avgPrice: Number(pos.avgPrice || pos.averagePrice || pos.average_price || pos.entryPrice || pos.buy_price || pos.sell_price || pos.buyPrice || pos.sellPrice || pos.buyAvgPrice || pos.sellAvgPrice || pos.netPrice || 0),
    ltp: Number(pos.ltp || pos.lastPrice || pos.last_price || pos.currentPrice || 0),
    pnl: Number(pos.pnl || pos.unrealizedPnl || pos.mtm || 0),
    pnlPct: Number(pos.pnlPct || pos.pnlPercent || pos.changePercent || 0),
    product: String(pos.product || pos.productType || 'MIS').toUpperCase(),
    broker: pos.broker || pos.brokerName || 'N/A',
    children: Number(pos.children || pos.childCount || pos.copiedCount || 0),
    raw: pos,
  };
};

const normalizeMasterChildMap = (entry = {}, index = 0) => {
  const children = Array.isArray(entry.children) ? entry.children : [];

  return {
    id: entry.masterId || `master-map-${index}`,
    masterId: entry.masterId || `master-map-${index}`,
    masterName: entry.masterName || entry.name || 'Unknown',
    masterEmail: entry.masterEmail || entry.email || '',
    children: children.map((child, childIndex) => ({
      id: child.childId || `child-${childIndex}`,
      childId: child.childId || `child-${childIndex}`,
      name: child.name || child.childName || 'Unknown',
      email: child.email || '',
      status: String(child.status || 'UNKNOWN').toUpperCase(),
      scalingFactor: Number(child.scalingFactor ?? child.multiplier ?? 1),
      raw: child,
    })),
    childCount: children.length,
    raw: entry,
  };
};

const normalizeSystemHealthEntries = (payload = {}) => {
  // API returns a flat object: { status, database, kafka, redis, uptime }
  // NOT an array — handle the flat shape first, then fall back to array shape
  const source = payload?.data || payload;

  const isFlatObject =
    typeof source === 'object' &&
    !Array.isArray(source) &&
    !Array.isArray(source.data) &&
    !Array.isArray(source.content);

  if (isFlatObject) {
    const { uptime, status: overallStatus, ...rest } = source;
    const metricKeys = Object.keys(rest).filter((k) => {
      const v = rest[k];
      return typeof v === 'number' || typeof v === 'string' || (typeof v === 'object' && v !== null && !Array.isArray(v));
    });
    if (metricKeys.length > 0) {
      return metricKeys.map((key, index) => {
        const value = rest[key];
        const isObjectValue = value && typeof value === 'object' && !Array.isArray(value);
        const displayName = key.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, (c) => c.toUpperCase());
        const isLatency = /latency/i.test(key);
        const isUsers = /user|connection|socket/i.test(key);
        const isOrders = /order|trade/i.test(key);
        const numericValue = typeof value === 'number' ? value : null;
        return {
          id: key || `service-${index}`,
          name: displayName,
          status: overallStatus || 'UP',
          latency: isLatency ? numericValue : (isObjectValue ? toFiniteNumberOrNull(value.latency) : null),
          uptime: uptime || 'N/A',
          activeUsers: isUsers ? numericValue : null,
          ordersToday: isOrders ? numericValue : null,
          metric: isObjectValue
            ? [value.used, value.max].filter(Boolean).join(' / ') || String(value.status || 'N/A')
            : String(value ?? 'N/A'),
          raw: { key, value },
        };
      });
    }
  }

  // Array shape fallback
  const entries = extractCollection(source);
  if (entries.length) {
    return entries.map((entry, index) => ({
      id: entry.id || entry.name || `system-${index}`,
      name: entry.name || entry.service || entry.broker || `Service ${index + 1}`,
      status: entry.status || entry.health || 'UNKNOWN',
      latency: toFiniteNumberOrNull(entry.latency, entry.responseTime, entry.latencyMs),
      uptime: entry.uptime || entry.availability || 'N/A',
      activeUsers: toFiniteNumberOrNull(entry.activeUsers, entry.connectedUsers),
      ordersToday: toFiniteNumberOrNull(entry.ordersToday, entry.requestsToday, entry.todayTrades),
      metric:
        entry.metric ||
        entry.value ||
        entry.currentValue ||
        (toFiniteNumberOrNull(entry.latency, entry.responseTime, entry.latencyMs) != null
          ? `${toFiniteNumberOrNull(entry.latency, entry.responseTime, entry.latencyMs)}ms`
          : entry.uptime || entry.availability || 'N/A'),
      raw: entry,
    }));
  }

  return [];
};

const normalizeFailedCopy = (entry = {}, index = 0) => ({
  id: entry.id || entry.copyId || `failed-copy-${index}`,
  masterName: entry.masterName || entry.mastername || entry.master || entry.masterId || 'Unknown',
  childName: entry.childName || entry.childname || entry.child || entry.childId || 'Unknown',
  broker: entry.broker || entry.brokerName || entry.brokername || 'N/A',
  symbol: entry.symbol || entry.instrument || entry.reference || 'N/A',
  status: String(entry.status || entry.copyStatus || 'FAILED').toUpperCase(),
  reason: entry.reason || entry.message || entry.error || entry.failureReason || 'N/A',
  latencyMs: Number(entry.latencyMs ?? entry.latency ?? entry.totalExecutionMs ?? 0),
  timestamp: entry.timestamp || entry.createdAt || entry.time || null,
  raw: entry,
});

const parseParams = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return {}; }
};

const normalizeAuditEntry = (entry = {}, index = 0) => {
  const params = parseParams(entry.parameters || entry.params);
  return {
    id: entry.id || `audit-${index}`,
    adminName: entry.adminName || entry.admin || entry.actorName || entry.userName || entry.userEmail || 'Admin',
    action: String(entry.action || entry.eventType || 'UNKNOWN').toUpperCase(),
    entityType: String(entry.entityType || entry.targetType || 'SYSTEM').toUpperCase(),
    entityId: entry.entityId || entry.targetId || entry.reference || params.userId || params.targetId || 'N/A',
    entityName: entry.entityName || '',
    before: entry.before || entry.oldValue || entry.previous || {},
    after: entry.after || entry.newValue || entry.current || {},
    reason: entry.reason || entry.message || entry.description || '',
    parameters: params,
    timestamp: entry.timestamp || entry.createdAt || entry.time || null,
    raw: entry,
  };
};

const normalizeTraceChild = (entry = {}, index = 0) => ({
  id: entry.id || entry.childId || `trace-child-${index}`,
  child: entry.child || entry.childName || entry.childUser || entry.childId || 'Unknown',
  broker: entry.broker || entry.brokerName || entry.childBroker || 'N/A',
  scaleFactor: Number(entry.scaleFactor ?? entry.scalingFactor ?? entry.multiplier ?? 1),
  qtyCopied: Number(entry.qtyCopied ?? entry.quantityCopied ?? entry.childQty ?? entry.qty ?? entry.quantity ?? 0),
  orderId: entry.orderId || entry.brokerOrderId || entry.childOrderId || entry.reference || '—',
  status: String(entry.status || entry.childStatus || 'UNKNOWN').toUpperCase(),
  executedAt: entry.executedAt || entry.childPlacedAt || entry.completedAt || entry.timestamp || null,
  price: Number(entry.price ?? entry.avgPrice ?? entry.averagePrice ?? entry.executedPrice ?? 0),
  latencyMs: Number(entry.latencyMs ?? entry.childLatencyMs ?? entry.totalLatencyMs ?? 0),
  slippagePct: Number(entry.slippagePct ?? entry.slippagePercent ?? entry.slippage ?? 0),
  reason: entry.reason || entry.message || entry.errorMessage || entry.skipReason || '',
  raw: entry,
});

const normalizeOrderTrace = (payload = {}) => {
  const source = payload?.data || payload || {};
  const childCopies = asArray(source.childCopies || source.children || source.results || source.replications).map(normalizeTraceChild);
  const succeeded = childCopies.filter((entry) => ['SUCCESS', 'EXECUTED', 'COMPLETED'].includes(entry.status)).length;
  const failedOrSkipped = childCopies.filter((entry) => !['SUCCESS', 'EXECUTED', 'COMPLETED'].includes(entry.status)).length;
  const latencies = childCopies.map((entry) => entry.latencyMs).filter((value) => Number.isFinite(value) && value > 0);

  return {
    traceId: source.traceId || source.id || source.copyGroupId || source.reference || '',
    masterOrder: {
      traceId: source.traceId || source.id || source.copyGroupId || source.reference || '',
      masterOrderId: source.masterOrderId || source.orderId || source.reference || '',
      masterUser: source.masterUser || source.masterName || source.masterId || 'Unknown',
      masterBroker: source.masterBroker || source.broker || source.brokerName || 'N/A',
      symbol: source.symbol || source.instrument || 'N/A',
      side: String(source.side || source.action || source.type || '—').toUpperCase(),
      quantity: Number(source.quantity ?? source.qty ?? source.masterQty ?? 0),
      orderType: source.orderType || '—',
      product: source.product || '—',
      exchange: source.exchange || '—',
      triggerTime: source.triggerTime || source.masterTriggeredAt || source.createdAt || null,
      placedTime: source.placedTime || source.masterPlacedAt || source.updatedAt || null,
      averagePrice: Number(source.averagePrice ?? source.avgPrice ?? source.price ?? 0),
      executionStatus: String(source.executionStatus || source.status || 'UNKNOWN').toUpperCase(),
    },
    summary: {
      childCopies: Number(source.childCopies ?? source.childrenTotal ?? childCopies.length),
      succeeded: Number(source.succeeded ?? source.success ?? succeeded),
      failedOrSkipped: Number(source.failedOrSkipped ?? source.failed ?? source.skipped ?? failedOrSkipped),
      averageLatencyMs: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null,
      fastestLatencyMs: latencies.length ? Math.min(...latencies) : null,
      slowestLatencyMs: latencies.length ? Math.max(...latencies) : null,
      failureRate:
        childCopies.length > 0
          ? `${Math.round((failedOrSkipped / childCopies.length) * 100)}%`
          : '0%',
      lastBackendSync: source.lastBackendSync || source.updatedAt || source.timestamp || null,
      lookupStatus: childCopies.length > 0 ? 'Available' : 'Partial',
    },
    riskChecks: {
      riskCheckPassed: source.riskCheckPassed ?? source.riskPassed ?? null,
      sellGuardPassed: source.sellGuardPassed ?? source.sellGuard ?? null,
      failedRule: source.failedRule || source.ruleFailure || '',
    },
    childCopies,
    raw: source,
  };
};

const normalizeBrokerStatusEntry = (entry = {}, index = 0) => ({
  id: entry.id || entry.brokerId || entry.broker || entry.name || `broker-status-${index}`,
  name: entry.name || entry.brokerName || entry.broker || entry.brokerId || 'Broker',
  brokerId: entry.brokerId || entry.broker || entry.name || '',
  account: entry.account || entry.clientId || entry.nickname || entry.userId || '—',
  active: entry.active ?? null,
  tokenExpiry: entry.tokenExpiry || entry.tokenExpiresAt || entry.expiresAt || null,
  lastSync: entry.lastSync || entry.lastSyncedAt || entry.lastChecked || null,
  ping: toFiniteNumberOrNull(entry.ping, entry.latency, entry.latencyMs),
  status: String(entry.status || entry.apiStatus || entry.health || 'UNKNOWN').toUpperCase(),
  raw: entry,
});

const normalizePlatformPnl = (payload = {}) => {
  const source = payload?.data || payload || {};
  return {
    summary: {
      totalPnl: Number(source.totalPnl ?? source.pnl ?? 0),
      totalTrades: Number(source.totalTrades ?? 0),
      totalVolume: Number(source.totalVolume ?? source.volume ?? 0),
      revenue: Number(source.revenue ?? source.totalRevenue ?? 0),
    },
    perMaster: asArray(source.perMaster || source.masters || source.masterBreakdown).map((entry, index) => ({
      id: entry.id || entry.masterId || `master-pnl-${index}`,
      master: entry.master || entry.masterName || entry.name || 'Unknown',
      totalTrades: Number(entry.totalTrades ?? entry.tradeCount ?? 0),
      volume: Number(entry.volume ?? entry.totalVolume ?? 0),
      realisedPnl: Number(entry.realisedPnl ?? entry.realizedPnl ?? entry.pnl ?? 0),
      children: Number(entry.children ?? entry.childCount ?? 0),
      subscriptionRevenue: Number(entry.subscriptionRevenue ?? entry.revenue ?? 0),
      raw: entry,
    })),
    perChild: asArray(source.perChild || source.children || source.childBreakdown).map((entry, index) => ({
      id: entry.id || entry.childId || `child-pnl-${index}`,
      child: entry.child || entry.childName || entry.name || 'Unknown',
      master: entry.master || entry.masterName || 'Unknown',
      copiesExecuted: Number(entry.copiesExecuted ?? entry.executed ?? entry.success ?? 0),
      copiesFailed: Number(entry.copiesFailed ?? entry.failed ?? entry.errors ?? 0),
      realisedPnl: Number(entry.realisedPnl ?? entry.realizedPnl ?? entry.pnl ?? 0),
      avgSlippagePct: Number(entry.avgSlippagePct ?? entry.slippagePct ?? entry.avgSlippage ?? 0),
      raw: entry,
    })),
    topGainers: asArray(source.topGainers || source.gainers).map((entry, index) => ({
      id: entry.id || entry.masterId || `gainer-${index}`,
      master: entry.master || entry.masterName || entry.name || 'Unknown',
      pnl: Number(entry.pnl ?? entry.realisedPnl ?? entry.value ?? 0),
      raw: entry,
    })),
    topLosers: asArray(source.topLosers || source.losers).map((entry, index) => ({
      id: entry.id || entry.masterId || `loser-${index}`,
      master: entry.master || entry.masterName || entry.name || 'Unknown',
      pnl: Number(entry.pnl ?? entry.realisedPnl ?? entry.value ?? 0),
      raw: entry,
    })),
    raw: source,
  };
};

const normalizeAnalytics = (payload = {}) => {
  const source = payload?.data && !Array.isArray(payload.data) ? payload.data : payload;

  // Equity curve: try multiple field names, normalize to {label, equity, followers}
  const rawCurve = asArray(
    source.equityCurve || source.dailyStats || source.performanceChart || source.chartData,
  );
  const equityCurve = rawCurve.map((pt, i) => ({
    label: pt.label || pt.date || pt.day || `Day ${i + 1}`,
    equity: Number(pt.equity || pt.totalPnl || pt.pnl || pt.value || 0),
    followers: Number(pt.followerPnl || pt.followersValue || pt.followers || 0),
  }));

  return {
    totalUsers: Number(source.totalUsers ?? source.users ?? source.userCount ?? 0),
    activeMasters: Number(source.totalMasters ?? source.activeMasters ?? source.masterCount ?? 0),
    totalMasters: Number(source.totalMasters ?? source.activeMasters ?? 0),
    totalChildren: Number(source.totalChildren ?? source.childCount ?? 0),
    totalAdmins: Number(source.totalAdmins ?? 0),
    volumeToday: Number(source.totalTrades ?? source.volumeToday ?? source.todayVolume ?? 0),
    totalTrades: Number(source.totalTrades ?? 0),
    activeSubscriptions: Number(source.activeSubscriptions ?? 0),
    revenueMtd: Number(source.revenueMtd ?? source.monthlyRevenue ?? source.revenue ?? 0),
    // Child performance breakdown
    profitableChildren: Number(source.profitableChildren ?? source.profitable ?? 0),
    losingChildren: Number(source.losingChildren ?? source.lossMaking ?? source.losing ?? 0),
    pausedChildren: Number(source.pausedChildren ?? source.paused ?? 0),
    // Trade direction split
    buyOrders: Number(source.buyOrders ?? source.buys ?? source.buyCount ?? 0),
    sellOrders: Number(source.sellOrders ?? source.sells ?? source.sellCount ?? 0),
    // Other live fields
    openPositions: source.openPositions != null ? Number(source.openPositions) : null,
    todayPnl: source.todayPnl != null ? Number(source.todayPnl) : null,
    latency: source.latency != null ? Number(source.latency) : null,
    equityCurve,
    userGrowth: asArray(source.userGrowth || source.userGrowthData || source.growth),
    topMasters: asArray(source.topMasters || source.topPerformers || source.mastersByVolume),
    raw: source,
  };
};

export const adminService = {
  // ADM-12: pass through page/limit from params. Backend should honor these and
  // return total count (see extractMeta below) so the UI can stop client-side slicing.
  async getUsers(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/users', { params });
      return {
        users: extractCollection(response.data).map(normalizeAdminUser),
        meta: extractMeta(response.data),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load users'));
    }
  },

  async getUser(userId) {
    try {
      const response = await api.get(`/api/v1/admin/users/${userId}`);
      return normalizeAdminUser(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load user details'));
    }
  },

  async updateUser(userId, body) {
    try {
      const response = await api.put(`/api/v1/admin/users/${userId}`, body);
      return normalizeAdminUser(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to update user'));
    }
  },

  async deleteUser(userId) {
    try {
      await api.delete(`/api/v1/admin/users/${userId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to delete user'));
    }
  },

  async createMaster(body) {
    try {
      await api.post('/api/v1/admin/users/master', body);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to create master'));
    }
  },

  async createChild(body) {
    try {
      await api.post('/api/v1/admin/users/child', body);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to create child'));
    }
  },

  async activateUser(userId) {
    try {
      await api.patch(`/api/v1/admin/users/${userId}/activate`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to activate user'));
    }
  },

  async deactivateUser(userId) {
    try {
      await api.patch(`/api/v1/admin/users/${userId}/deactivate`);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to deactivate user'));
    }
  },

  async getTradeLogs(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/trade-logs', { params });
      return {
        logs: extractCollection(response.data).map(normalizeTradeLog),
        meta: extractMeta(response.data),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load trade logs'));
    }
  },

  async getSystemHealth() {
    try {
      const response = await api.get('/api/v1/admin/system-health');
      return normalizeSystemHealthEntries(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load system health'));
    }
  },

  async getSubscriptions(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/subscriptions', { params });
      return {
        subscriptions: extractCollection(response.data).map(normalizeSubscription),
        meta: extractMeta(response.data),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load subscriptions'));
    }
  },

  async getAnalytics() {
    try {
      const response = await api.get('/api/v1/admin/analytics');
      return normalizeAnalytics(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load analytics'));
    }
  },

  async getPositions(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/positions', { params });
      return extractCollection(response.data).map(normalizeAdminPosition);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load positions'));
    }
  },

  async getMasterChildMap() {
    try {
      const response = await api.get('/api/v1/admin/master-child-map');
      const payload = response.data?.data || response.data || {};
      const masters = Array.isArray(payload.masters) ? payload.masters : extractCollection(payload);
      return {
        masters: masters.map(normalizeMasterChildMap),
        total: Number(payload.total ?? masters.length),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load master-child map'));
    }
  },

  async getGlobalRiskSettings() {
    try {
      const response = await api.get('/api/v1/admin/settings/risk');
      // The backend returns a JSON string, which Axios parses if it's JSON.
      // If the backend returns empty string, we default to empty object.
      let data = response.data?.data || response.data || {};
      if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch (e) { data = {}; }
      }
      return data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load global risk settings'));
    }
  },

  async saveGlobalRiskSettings(settings) {
    try {
      await api.post('/api/v1/admin/settings/risk', JSON.stringify(settings), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to save global risk settings'));
    }
  },

  async getFailedCopies(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/failed-copies', { params });
      const source = response.data?.data || response.data || {};
      const copies = (Array.isArray(source.copies) ? source.copies : extractCollection(source)).map(normalizeFailedCopy);
      const stats = source.stats || response.data?.stats || {};
      const totalCount = Number(source.total ?? copies.length);
      const skippedCount = Number(stats.skipped ?? copies.filter((c) => c.status === 'SKIPPED').length);
      const rejectedCount = Number(stats.rejected ?? copies.filter((c) => c.status === 'REJECTED').length);
      const timeoutCount = Number(stats.timeout ?? copies.filter((c) => c.status === 'TIMEOUT').length);
      const failedCount = Number(stats.failed ?? copies.filter((c) => c.status === 'FAILED').length);
      return {
        copies,
        total: totalCount,
        page: Number(source.page ?? params.page ?? 1),
        limit: Number(source.limit ?? params.limit ?? 20),
        stats: {
          total: totalCount,
          skipped: skippedCount,
          rejected: rejectedCount,
          timeout: timeoutCount,
          failed: failedCount,
        },
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load failed copies'));
    }
  },

  async getAuditLog(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/audit-log', { params });
      const source = response.data?.data || response.data || {};
      const logs = (Array.isArray(source.logs) ? source.logs : extractCollection(source)).map(normalizeAuditEntry);
      return {
        logs,
        total: Number(source.total ?? logs.length),
        page: Number(source.page ?? params.page ?? 1),
        limit: Number(source.limit ?? params.limit ?? 20),
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load audit log'));
    }
  },

  async getOrderTrace(id) {
    try {
      const response = await api.get(`/api/v1/admin/trace/${id}`);
      return normalizeOrderTrace(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load order trace'));
    }
  },

  async getBrokerStatus() {
    const endpoints = ['/api/v1/admin/broker-status', '/api/v1/admin/brokers/status'];
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        const source = response.data?.data || response.data || {};
        const items = extractCollection(source).map(normalizeBrokerStatusEntry);
        return items;
      } catch (error) {
        lastError = error;
        const status = Number(error?.response?.status);
        if (status !== 404 && status !== 405) {
          throw new Error(getErrorMessage(error, 'Unable to load broker status'));
        }
      }
    }
    throw new Error(getErrorMessage(lastError, 'Unable to load broker status'));
  },

  async forceSquareOff(body) {
    try {
      const response = await api.post('/api/v1/admin/force-square-off', body);
      return response.data?.data || response.data || {};
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to force square-off'));
    }
  },

  async getPlatformPnl(params = {}) {
    try {
      const response = await api.get('/api/v1/admin/pnl', { params });
      return normalizePlatformPnl(response.data);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to load platform P&L'));
    }
  },

  async impersonateUser(userId) {
    try {
      const response = await api.post(`/api/v1/admin/impersonate/${userId}`);
      const source = response.data?.data || response.data || {};
      return {
        token: source.token || source.jwt || source.accessToken || source.sessionToken || null,
        raw: source,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to impersonate user'));
    }
  },
};
