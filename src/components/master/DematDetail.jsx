import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Wifi, WifiOff, AlertTriangle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { formatCurrency } from '@/lib/utils';

// ── Signal bars component ────────────────────────────────────────────────────
const SignalBars = ({ signal }) => {
  if (!signal) return null;
  const { bars, maxBars = 4, quality, color } = signal;
  const colorClass = color === 'green' ? 'bg-success' : color === 'yellow' ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-1.5" title={`Connection: ${quality} (${bars}/${maxBars} bars)`}>
      {Array.from({ length: maxBars }).map((_, i) => (
        <div
          key={i}
          className={`rounded-sm transition-colors ${i < bars ? colorClass : 'bg-border/40'}`}
          style={{ width: 4, height: 6 + i * 3 }}
        />
      ))}
      <span className={`text-xs ml-0.5 ${color === 'green' ? 'text-success' : color === 'yellow' ? 'text-warning' : 'text-danger'}`}>
        {quality}
      </span>
    </div>
  );
};

// ── Balance alert badge ──────────────────────────────────────────────────────
const BalanceAlertBadge = ({ alert }) => {
  if (!alert || alert.level === 'OK') return null;
  const cfg = {
    CRITICAL: { cls: 'bg-danger/15 text-danger border-danger/30', Icon: AlertCircle },
    WARNING:  { cls: 'bg-warning/15 text-warning border-warning/30', Icon: AlertTriangle },
    LOW:      { cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30', Icon: AlertTriangle },
  };
  const { cls, Icon } = cfg[alert.level] || cfg.WARNING;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${cls}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      {alert.message || `Balance ${alert.level.toLowerCase()}`}
    </div>
  );
};

const TABS = ['Positions', 'Holdings', 'Orders', 'Trades'];

const getMarginValue = (marginData, fallback = 0) =>
  marginData?.availableMargin ?? marginData?.available ?? marginData?.net ?? fallback;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const TransBadge = ({ type }) => (
  <span
    className={`px-2.5 py-0.5 rounded text-xs font-bold ${
      type === 'BUY' || type === 'CARRYFORWARD'
        ? 'bg-success/20 text-success border border-success/30'
        : 'bg-danger/20 text-danger border border-danger/30'
    }`}
  >
    {type}
  </span>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    Completed: 'bg-success/20 text-success border-success/30',
    Pending: 'bg-warning/20 text-warning border-warning/30',
    Rejected: 'bg-danger/20 text-danger border-danger/30',
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
        cfg[status] || 'bg-black/10 dark:bg-white/10 text-foreground border-black/10 dark:border-white/10'
      }`}
    >
      {status}
    </span>
  );
};

const DematDetail = ({ accountId, onBack, scope = 'master' }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Positions');
  const [squareOffModal, setSquareOffModal] = useState(false);
  const [selectedPos, setSelectedPos] = useState(null);
  const [positions, setPositions] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [account, setAccount] = useState(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [positionsError, setPositionsError] = useState('');
  const [marginError, setMarginError] = useState('');
  const [signal, setSignal] = useState(null);
  const [balanceAlert, setBalanceAlert] = useState(null);
  const [growwReAuthToken, setGrowwReAuthToken] = useState('');
  const [growwReAuthLoading, setGrowwReAuthLoading] = useState(false);
  const isChildScope = scope === 'child';

  const resolvedBack = onBack || (() => navigate('/master/user-management'));

  useEffect(() => {
    if (!accountId) return;
    let isMounted = true;

    const loadData = async () => {
      setLoadingData(true);
      setPositionsError('');
      setMarginError('');
      setOrders([]);
      setTrades([]);
      setHoldings([]);

      try {
        const data = await brokerService.getDashboard(accountId);

        if (!isMounted) return;

        if (data.signal) setSignal(data.signal);
        if (data.balanceAlert) setBalanceAlert(data.balanceAlert);
        setAccount({
          broker: data.account.brokerName || data.account.brokerId || '',
          userId: data.account.clientId || '',
          nickname: data.account.nickname || '',
          margin: data.margin?.availableMargin ?? data.account.margin ?? 0,
          sessionActive: data.account.sessionActive,
          status: data.account.status,
          linkedAt: data.account.linkedAt || null,
        });

        if (isChildScope) {
          setPositions([]);
          setPositionsError('Live positions are not available for child demat accounts with the current API.');
        } else if (data.errors.positions) {
          setPositionsError(data.errors.positions);
          setPositions([]);
          addToast(data.errors.positions, 'error');
        } else {
          setPositions(data.positions);
        }

        if (isChildScope) {
          setMarginError('Live margin is not exposed for child demat accounts with the current API.');
        } else if (data.errors.margin) {
          setMarginError(data.errors.margin);
          addToast(data.errors.margin, 'error');
        }

        if (!isChildScope && (data.errors.margin || !data.margin)) {
          try {
            const marginData = await brokerService.getMargin(accountId);
            const marginValue = getMarginValue(marginData, data.account?.margin ?? 0);
            setAccount((prev) => (prev ? { ...prev, margin: marginValue } : prev));
          } catch (e) {
            // keep existing margin
          }
        }

        if (data.errors.holdings) {
          setHoldings([]);
        } else {
          setHoldings(data.holdings);
        }

        const [ordersResult, tradesResult] = await Promise.allSettled([
          brokerService.getOrders(accountId),
          brokerService.getTrades(accountId),
        ]);

        if (isMounted) {
          if (ordersResult.status === 'fulfilled') {
            setOrders(ordersResult.value);
          } else {
            setOrders([]);
          }

          if (tradesResult.status === 'fulfilled') {
            setTrades(tradesResult.value);
          } else {
            setTrades([]);
          }

          setLoadingData(false);
        }
      } catch (e) {
        if (!isMounted) return;
        addToast(e.message || 'Unable to load account', 'error');
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [accountId, addToast, isChildScope]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPositionsError('');
    setMarginError('');

    try {
      const data = await brokerService.getDashboard(accountId);

      if (data.signal) setSignal(data.signal);
      if (data.balanceAlert) setBalanceAlert(data.balanceAlert);
      setAccount((prev) => ({
        ...(prev || {}),
        broker: data.account.brokerName || data.account.brokerId || prev?.broker || '',
        userId: data.account.clientId || prev?.userId || '',
        nickname: data.account.nickname || prev?.nickname || '',
        margin: data.margin?.availableMargin ?? prev?.margin ?? 0,
        sessionActive: data.account.sessionActive,
        status: data.account.status,
        linkedAt: data.account.linkedAt || prev?.linkedAt || null,
      }));

      if (isChildScope) {
        setPositions([]);
        setPositionsError('Live positions are not available for child demat accounts with the current API.');
        setMarginError('Live margin is not exposed for child demat accounts with the current API.');
      } else {
        if (data.errors.positions) {
          setPositionsError(data.errors.positions);
          setPositions([]);
          addToast(data.errors.positions, 'error');
        } else {
          setPositions(data.positions);
        }
        if (data.errors.margin) {
          setMarginError(data.errors.margin);
          addToast(data.errors.margin, 'error');
        }
      }

      if (!isChildScope && (data.errors.margin || !data.margin)) {
        try {
          const marginData = await brokerService.getMargin(accountId);
          const marginValue = getMarginValue(marginData, data.account?.margin ?? 0);
          setAccount((prev) => (prev ? { ...prev, margin: marginValue } : prev));
        } catch (e) {
          // keep existing margin
        }
      }

      if (data.errors.holdings) {
        setHoldings([]);
      } else {
        setHoldings(data.holdings);
      }

      const [ordersRefresh, tradesRefresh] = await Promise.allSettled([
        brokerService.getOrders(accountId),
        brokerService.getTrades(accountId),
      ]);
      if (ordersRefresh.status === 'fulfilled') setOrders(ordersRefresh.value);
      if (tradesRefresh.status === 'fulfilled') setTrades(tradesRefresh.value);

      addToast('Refreshed', 'success');
    } catch (e) {
      addToast(e.message || 'Refresh failed', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      await brokerService.getAccountStatus(accountId);
      if (isChildScope) {
        setTestResult({ state: 'success', message: 'Connection successful.' });
      } else {
        const marginData = await brokerService.getMargin(accountId);
        const balance = getMarginValue(marginData, 0);
        setMarginError('');
        setTestResult({ state: 'success', message: `Connection successful. Balance: ${formatCurrency(balance)}` });
        setAccount((prev) => (prev ? { ...prev, margin: balance } : prev));
      }
    } catch (e) {
      setTestResult({ state: 'error', message: `Connection failed. ${e.message}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleGrowwReAuth = async () => {
    const token = growwReAuthToken.trim();
    if (!token) { addToast('Please paste your new Groww access token', 'error'); return; }
    setGrowwReAuthLoading(true);
    try {
      await brokerService.loginAccount(accountId, { accessToken: token });
      setGrowwReAuthToken('');
      addToast('Groww session refreshed successfully', 'success');
      // Reload dashboard data after re-auth
      const data = await brokerService.getDashboard(accountId);
      if (data.signal) setSignal(data.signal);
      if (data.balanceAlert) setBalanceAlert(data.balanceAlert);
      setAccount((prev) => ({ ...prev, sessionActive: data.account.sessionActive, margin: data.margin?.availableMargin ?? prev?.margin ?? 0 }));
      setPositions(data.positions || []);
      setHoldings(data.holdings || []);
      setOrders(data.orders || []);
    } catch (e) {
      addToast(e.message || 'Re-authentication failed. Check your token and try again.', 'error');
    } finally {
      setGrowwReAuthLoading(false);
    }
  };

  const confirmSquareOff = async () => {
    if (!selectedPos) return;
    try {
      await brokerService.closePosition(accountId, {
        symbol: selectedPos.symbol,
        qty: selectedPos.qty,
        type: 'SELL',
        product: selectedPos.market || 'MIS',
      });
      setPositions((p) => p.filter((x) => x.id !== selectedPos.id));
      setSquareOffModal(false);
      addToast(`${selectedPos.symbol} squared off`, 'success');
    } catch (e) {
      addToast(e.message || 'Square off failed', 'error');
      setSquareOffModal(false);
    }
  };

  const getRelativeTime = (date) => {
    if (!date) return 'Last synced: -';
    const ts = new Date(date).getTime();
    if (!Number.isFinite(ts)) return 'Last synced: -';

    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Last synced: just now';
    if (mins < 60) return `Last synced: ${mins} min${mins === 1 ? '' : 's'} ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Last synced: ${hrs} hr${hrs === 1 ? '' : 's'} ago`;

    const days = Math.floor(hrs / 24);
    return `Last synced: ${days} day${days === 1 ? '' : 's'} ago`;
  };

  if (!account && !loadingData) {
    return (
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center gap-4">
          <button onClick={resolvedBack} className="p-2 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Demat Account</h1>
        </div>
        <p className="text-sm text-danger">Unable to load account details for this demat account.</p>
      </div>
    );
  }

  const totalPnL = positions.reduce((sum, position) => sum + toNumber(position.pnl), 0);
  const statusValue = String(account?.status || (account?.sessionActive ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
  const statusMeta = (() => {
    if (statusValue === 'ACTIVE') return { cls: 'connected', label: 'Connected & Verified' };
    if (statusValue === 'PENDING' || statusValue === 'PENDING_APPROVAL') return { cls: 'pending', label: 'Pending' };
    if (statusValue === 'FAILED' || statusValue === 'ERROR') return { cls: 'failed', label: 'Connection Failed' };
    return { cls: 'inactive', label: 'Inactive' };
  })();

  const filteredPositions = positions.filter((p) => !search || String(p.symbol || '').toLowerCase().includes(search.toLowerCase()));
  const filteredHoldings = holdings.filter((h) => !search || String(h.symbol || '').toLowerCase().includes(search.toLowerCase()));
  const filteredOrders = orders.filter((o) => !search || String(o.symbol || '').toLowerCase().includes(search.toLowerCase()));
  const filteredTrades = trades.filter((t) => !search || String(t.symbol || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={resolvedBack} className="p-2 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wide">
            {account?.broker?.toUpperCase()} - {account?.userId} - {account?.nickname?.toUpperCase()}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xl font-bold">{formatCurrency(account?.margin)}</span>
            <span className="text-sm text-muted-foreground ml-2">Margin</span>
          </div>
          <div className="text-right">
            <span className={`text-xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
              {(totalPnL >= 0 ? '+' : '') + formatCurrency(Math.abs(totalPnL))}
            </span>
            <span className={`text-sm ml-1 ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>{totalPnL >= 0 ? '↑' : '↓'}</span>
            <span className="text-sm text-muted-foreground ml-1">PnL</span>
          </div>
          <button onClick={handleRefresh} className="w-9 h-9 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors">
            <RefreshCw className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`status-dot ${statusMeta.cls}`} />
            <span className="text-sm font-semibold">{statusMeta.label}</span>
          </div>
          <div className="text-xs text-muted-foreground">{getRelativeTime(account?.linkedAt)}</div>
          <div className="text-xs text-muted-foreground">Balance: {formatCurrency(account?.margin)}</div>
          <SignalBars signal={signal} />
          <BalanceAlertBadge alert={balanceAlert} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {testResult && (
            <span className={`text-xs ${testResult.state === 'success' ? 'text-success' : 'text-danger'}`}>
              {testResult.message}
            </span>
          )}
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 rounded-lg border border-border/70 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 text-sm transition-colors disabled:opacity-60"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      {/* ── Groww expired token banner ── */}
      {account && !account.sessionActive && String(account.broker || '').toLowerCase() === 'groww' && (
        <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-500">Groww session expired</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Groww access tokens reset every day at <span className="font-medium text-foreground">6:00 AM IST</span>.
                Get your new token from Groww app/web → Profile → Access Token, then paste it below.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={growwReAuthToken}
                  onChange={(e) => setGrowwReAuthToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGrowwReAuth()}
                  placeholder="Paste new Groww access token…"
                  className="flex-1 px-3 py-2 rounded-lg bg-black/10 dark:bg-white/10 border border-border/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
                <button
                  onClick={handleGrowwReAuth}
                  disabled={growwReAuthLoading || !growwReAuthToken.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                >
                  {growwReAuthLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {growwReAuthLoading ? 'Refreshing…' : 'Refresh Token'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-border/50">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearch('');
              }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-black/10 dark:bg-white/10 text-foreground border-b-2 border-brand-purple'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-border/30 flex justify-end">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-56 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
          />
        </div>

        {activeTab === 'Positions' && positionsError && (
          <div className="px-4 py-3 border-b border-border/30 text-sm text-danger bg-danger/10">
            {positionsError}
          </div>
        )}

        {marginError && (
          <div className="px-4 py-3 border-b border-border/30 text-sm text-warning bg-warning/10">
            {marginError}
          </div>
        )}

        <div className="overflow-x-auto">
          {activeTab === 'Positions' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Type', 'Qty', 'P&L', 'LTP', 'Avg Price', 'Trans', 'Square Off'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((pos, idx) => {
                  const pnl = toNumber(pos.pnl);
                  const ltp = toNumber(pos.ltp);
                  const avgPrice = toNumber(pos.avgPrice);

                  return (
                    <motion.tr
                      key={pos.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="border-b border-border/30 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-sm">{pos.symbol}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{pos.type}</td>
                      <td className="px-4 py-3 text-sm">{pos.qty}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pnl >= 0 ? '+' : ''}
                          {pnl.toFixed(2)} {pnl >= 0 ? '↑' : '↓'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ltp.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{avgPrice > 0 ? avgPrice.toFixed(2) : '0'}</td>
                      <td className="px-4 py-3">
                        <button className="px-2.5 py-1 bg-success/20 border border-success/30 text-success rounded text-xs font-bold hover:bg-success/30 transition-colors">
                          SELL
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedPos(pos);
                            setSquareOffModal(true);
                          }}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                            pnl >= 0 ? 'bg-success hover:bg-success/90 text-white' : 'bg-danger hover:bg-danger/90 text-white'
                          }`}
                        >
                          Square OFF
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredPositions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {loadingData ? 'Loading positions...' : positionsError ? 'Positions are unavailable' : 'No positions found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'Holdings' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'Symbol', 'Qty', 'Avg Price', 'LTP', 'P&L'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredHoldings.map((h, idx) => (
                  <motion.tr
                    key={h.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{h.symbol}</td>
                    <td className="px-4 py-3 text-sm">{h.quantity}</td>
                    <td className="px-4 py-3 text-sm">{h.avgPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{h.lastPrice.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${h.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {h.pnl >= 0 ? '+' : ''}
                        {h.pnl.toFixed(2)}
                      </span>
                    </td>
                  </motion.tr>
                ))}
                {filteredHoldings.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {loadingData ? 'Loading holdings...' : 'No holdings found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'Orders' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Trans', 'Product', 'Type', 'Qty', 'Price', 'Time', 'Order Id', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, idx) => (
                  <motion.tr
                    key={ord.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{ord.symbol}</td>
                    <td className="px-4 py-3">
                      <TransBadge type={ord.type} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">CARRYFORW...</td>
                    <td className="px-4 py-3 text-sm">{ord.orderType}</td>
                    <td className="px-4 py-3 text-sm">{ord.qty}</td>
                    <td className="px-4 py-3 text-sm">{toNumber(ord.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{ord.time}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">2307120{String(ord.id).padStart(8, '0')}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ord.status} />
                    </td>
                    <td className="px-4 py-3">
                      {(ord.status === 'PENDING' || ord.status === 'OPEN' || ord.raw?.status === 'TRIGGER PENDING') && (
                        <button
                          onClick={async () => {
                            try {
                              await brokerService.cancelOrder(accountId, ord.id);
                              setOrders((prev) => prev.filter((o) => o.id !== ord.id));
                              addToast(`Order ${ord.id} cancelled`, 'success');
                            } catch (e) {
                              addToast(e.message || 'Cancel failed', 'error');
                            }
                          }}
                          className="px-3 py-1 rounded text-xs font-bold bg-danger hover:bg-danger/90 text-white transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'Trades' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Order ID', 'Product', 'Trans', 'Price', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((tr, idx) => (
                  <motion.tr
                    key={tr.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{tr.symbol}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">2307120{String(tr.id).padStart(8, '0')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">CARRYFORWARD</td>
                    <td className="px-4 py-3">
                      <TransBadge type={tr.action} />
                    </td>
                    <td className="px-4 py-3 text-sm">{toNumber(tr.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tr.time}</td>
                  </motion.tr>
                ))}
                {filteredTrades.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No trades found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Rows per page: 10 &nbsp;|&nbsp;
            {activeTab === 'Positions' && `1-${filteredPositions.length} of ${filteredPositions.length}`}
            {activeTab === 'Holdings' && `1-${holdings.length} of ${holdings.length}`}
            {activeTab === 'Orders' && `1-${filteredOrders.length} of ${filteredOrders.length}`}
            {activeTab === 'Trades' && `1-${filteredTrades.length} of ${filteredTrades.length}`}
          </span>
        </div>
      </div>

      <Modal isOpen={squareOffModal} onClose={() => setSquareOffModal(false)} title="Square Off Position" size="sm">
        {selectedPos && (
          <div className="space-y-4">
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 text-sm">
              {[
                ['Symbol', selectedPos.symbol],
                ['Qty', selectedPos.qty],
                ['LTP', `Rs ${toNumber(selectedPos.ltp).toFixed(2)}`],
                ['Unrealized P&L', `${toNumber(selectedPos.pnl) >= 0 ? '+' : ''}${formatCurrency(toNumber(selectedPos.pnl))}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span
                    className={
                      k === 'Unrealized P&L'
                        ? toNumber(selectedPos.pnl) >= 0
                          ? 'text-success font-semibold'
                          : 'text-danger font-semibold'
                        : 'font-medium'
                    }
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">This will place a market order to exit this position immediately.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setSquareOffModal(false)}
                className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSquareOff}
                className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Confirm Square Off
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DematDetail;