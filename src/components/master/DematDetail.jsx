import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertTriangle, AlertCircle, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import RefreshButton from '@/components/shared/RefreshButton';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

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

const TABS = ['Positions', 'Orders', 'Options'];

const getMarginValue = (marginData, fallback = 0) =>
  marginData?.availableMargin ?? marginData?.available ?? marginData?.net ?? fallback;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const buildProxyFormState = (source = {}) => ({
  proxyHost: String(source.proxyHost || '').trim(),
  proxyPort: source.proxyPort ? String(source.proxyPort) : '',
  proxyUser: String(source.proxyUser || '').trim(),
  proxyPass: '',
});

const validateProxyForm = (values = {}) => {
  const proxyHost = String(values.proxyHost || '').trim();
  const rawProxyPort = String(values.proxyPort || '').trim();
  const proxyUser = String(values.proxyUser || '').trim();
  const proxyPass = String(values.proxyPass || '').trim();

  if (!proxyHost && !rawProxyPort && !proxyUser && !proxyPass) {
    return {};
  }

  const errors = {};
  if (!proxyHost) errors.proxyHost = 'Proxy host is required';

  const port = Number(rawProxyPort);
  if (!rawProxyPort) {
    errors.proxyPort = 'Proxy port is required';
  } else if (!Number.isInteger(port) || port <= 0) {
    errors.proxyPort = 'Enter a valid port number';
  }

  return errors;
};

const TransBadge = ({ type }) => (
  <span
    className={`px-2.5 py-0.5 rounded text-xs font-bold text-white ${
      type === 'BUY' || type === 'CARRYFORWARD' ? 'bg-emerald-500' : 'bg-rose-500'
    }`}
  >
    {type}
  </span>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    Completed: 'bg-emerald-500 text-white',
    Pending:   'bg-amber-500 text-white',
    Rejected:  'bg-rose-500 text-white',
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
        cfg[status] || 'bg-slate-500 text-white'
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
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
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
  const [proxyForm, setProxyForm] = useState(buildProxyFormState());
  const [proxyErrors, setProxyErrors] = useState({});
  const [proxySaving, setProxySaving] = useState(false);
  const [proxyRemoving, setProxyRemoving] = useState(false);
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

      try {
        const data = await brokerService.getDashboard(accountId);

        if (!isMounted) return;

        if (data.signal) setSignal(data.signal);
        if (data.balanceAlert) setBalanceAlert(data.balanceAlert);
        const nextAccount = {
          broker: data.account.brokerName || data.account.brokerId || '',
          userId: data.account.clientId || '',
          nickname: data.account.nickname || '',
          margin: data.margin?.availableMargin ?? data.account.margin ?? 0,
          sessionActive: data.account.sessionActive,
          status: data.account.status,
          linkedAt: data.account.linkedAt || null,
          proxyHost: data.account.proxyHost || '',
          proxyPort: data.account.proxyPort || 0,
          proxyUser: data.account.proxyUser || '',
          proxyConfigured: Boolean(data.account.proxyConfigured),
        };
        setAccount(nextAccount);
        setProxyForm(buildProxyFormState(nextAccount));
        setProxyErrors({});

        if (data.errors?.positions) {
          setPositionsError(data.errors.positions);
          setPositions([]);
          addToast(data.errors.positions, 'error');
        } else {
          setPositions(data.positions || []);
        }

        if (data.errors?.margin) {
          setMarginError(data.errors.margin);
          addToast(data.errors.margin, 'error');
        }

        if (data.errors.margin || !data.margin) {
          try {
            const marginData = await brokerService.getMargin(accountId);
            const marginValue = getMarginValue(marginData, data.account?.margin ?? 0);
            setAccount((prev) => (prev ? { ...prev, margin: marginValue } : prev));
          } catch (e) {
            // keep existing margin
          }
        }

        const ordersResult = await Promise.allSettled([brokerService.getOrders(accountId)]);

        if (isMounted) {
          if (ordersResult[0]?.status === 'fulfilled') {
            setOrders(ordersResult[0].value);
          } else {
            setOrders([]);
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
      let refreshedAccount = null;
      setAccount((prev) => {
        refreshedAccount = {
          ...(prev || {}),
          broker: data.account.brokerName || data.account.brokerId || prev?.broker || '',
          userId: data.account.clientId || prev?.userId || '',
          nickname: data.account.nickname || prev?.nickname || '',
          margin: data.margin?.availableMargin ?? prev?.margin ?? 0,
          sessionActive: data.account.sessionActive,
          status: data.account.status,
          linkedAt: data.account.linkedAt || prev?.linkedAt || null,
          proxyHost: data.account.proxyHost || '',
          proxyPort: data.account.proxyPort || 0,
          proxyUser: data.account.proxyUser || '',
          proxyConfigured: Boolean(data.account.proxyConfigured),
        };
        return refreshedAccount;
      });
      if (refreshedAccount) {
        setProxyForm(buildProxyFormState(refreshedAccount));
        setProxyErrors({});
      }

      if (data.errors?.positions) {
        setPositionsError(data.errors.positions);
        setPositions([]);
        addToast(data.errors.positions, 'error');
      } else {
        setPositions(data.positions || []);
      }
      if (data.errors?.margin) {
        setMarginError(data.errors.margin);
        addToast(data.errors.margin, 'error');
      }

      if (data.errors.margin || !data.margin) {
        try {
          const marginData = await brokerService.getMargin(accountId);
          const marginValue = getMarginValue(marginData, data.account?.margin ?? 0);
          setAccount((prev) => (prev ? { ...prev, margin: marginValue } : prev));
        } catch (e) {
          // keep existing margin
        }
      }

      const [ordersRefresh] = await Promise.allSettled([brokerService.getOrders(accountId)]);
      if (ordersRefresh.status === 'fulfilled') setOrders(ordersRefresh.value);

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
      let loginField = 'accessToken';
      try {
        const oauthData = await brokerService.getOAuthUrl(accountId);
        if (oauthData?.loginField) {
          loginField = oauthData.loginField;
        }
      } catch {
        // Keep accessToken fallback when oauth-url is unavailable for token-based brokers.
      }
      await brokerService.loginAccount(accountId, { [loginField]: token });
      setGrowwReAuthToken('');
      addToast('Groww session refreshed successfully', 'success');
      // Reload dashboard data after re-auth
      const data = await brokerService.getDashboard(accountId);
      if (data.signal) setSignal(data.signal);
      if (data.balanceAlert) setBalanceAlert(data.balanceAlert);
      let refreshedAccount = null;
      setAccount((prev) => {
        refreshedAccount = {
          ...(prev || {}),
          sessionActive: data.account.sessionActive,
          margin: data.margin?.availableMargin ?? prev?.margin ?? 0,
          proxyHost: data.account.proxyHost || '',
          proxyPort: data.account.proxyPort || 0,
          proxyUser: data.account.proxyUser || '',
          proxyConfigured: Boolean(data.account.proxyConfigured),
        };
        return refreshedAccount;
      });
      if (refreshedAccount) {
        setProxyForm(buildProxyFormState(refreshedAccount));
        setProxyErrors({});
      }
      setPositions(data.positions || []);
      setOrders(data.orders || []);
    } catch (e) {
      addToast(e.message || 'Re-authentication failed. Check your token and try again.', 'error');
    } finally {
      setGrowwReAuthLoading(false);
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

  const handleProxyFieldChange = (field, value) => {
    setProxyForm((prev) => ({ ...prev, [field]: value }));
    setProxyErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSaveProxy = async () => {
    const errors = validateProxyForm(proxyForm);
    setProxyErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setProxySaving(true);
    try {
      await brokerService.updateAccount(accountId, {
        proxyHost: proxyForm.proxyHost.trim(),
        proxyPort: Number(proxyForm.proxyPort),
        proxyUser: proxyForm.proxyUser.trim(),
        proxyPass: proxyForm.proxyPass,
      });
      await handleRefresh();
      setProxyForm((prev) => ({ ...prev, proxyPass: '' }));
      addToast('Proxy settings updated', 'success');
    } catch (e) {
      addToast(e.message || 'Unable to update proxy settings', 'error');
    } finally {
      setProxySaving(false);
    }
  };

  const handleRemoveProxy = async () => {
    setProxyRemoving(true);
    try {
      await brokerService.updateAccount(accountId, { proxyHost: '', proxyPort: 0, proxyUser: '', proxyPass: '' });
      await handleRefresh();
      setProxyForm(buildProxyFormState());
      setProxyErrors({});
      addToast('Proxy removed. Broker is back on direct routing.', 'success');
    } catch (e) {
      addToast(e.message || 'Unable to remove proxy', 'error');
    } finally {
      setProxyRemoving(false);
    }
  };

  if (!account && !loadingData) {
    return (
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center gap-4">
          <button onClick={resolvedBack} className="btn-icon" aria-label="Go back">
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

  const isOption = (symbol) => /.*[0-9]{2,}[CP]E$/i.test(String(symbol || ''));

  const filteredPositions = positions.filter((p) => {
    if (activeTab === 'Options') return isOption(p.symbol);
    if (!search) return true;
    return String(p.symbol || '').toLowerCase().includes(search.toLowerCase());
  });

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'Options') return isOption(o.symbol);
    if (!search) return true;
    return String(o.symbol || '').toLowerCase().includes(search.toLowerCase());
  });

  const headerTitle = (() => {
    const nickname = String(account?.nickname || '').trim();
    const broker = String(account?.broker || '').trim();
    const userId = String(account?.userId || '').trim();
    const parts = [nickname, broker, userId].filter(Boolean);
    return parts.length ? parts.join(' - ').toUpperCase() : 'DEMAT ACCOUNT';
  })();
  const proxyActive = Boolean(account?.proxyConfigured && account?.proxyHost && Number(account?.proxyPort) > 0);

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={resolvedBack} className="btn-icon" aria-label="Go back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wide">{headerTitle}</h1>
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
          <RefreshButton onClick={handleRefresh} loading={refreshing} />
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
                  aria-label="Groww access token"
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
                  className="btn-warning px-4 py-2 text-sm"
                >
                  {growwReAuthLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {growwReAuthLoading ? 'Refreshing…' : 'Refresh Token'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card p-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-brand-purple" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide">Proxy Routing</h2>
              <p className="text-xs text-muted-foreground">
                Optional. Use this when your broker requires a whitelisted source IP.
              </p>
            </div>
          </div>
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${proxyActive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-border bg-black/5 text-muted-foreground dark:bg-white/5'}`}>
            {proxyActive ? `Active: ${account?.proxyHost}:${account?.proxyPort}` : 'Direct connection'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Proxy Host</label>
            <input
              value={proxyForm.proxyHost}
              onChange={(e) => handleProxyFieldChange('proxyHost', e.target.value)}
              placeholder="127.0.0.1"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
            />
            {proxyErrors.proxyHost && <p className="text-danger text-xs">{proxyErrors.proxyHost}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Proxy Port</label>
            <input
              value={proxyForm.proxyPort}
              onChange={(e) => handleProxyFieldChange('proxyPort', e.target.value.replace(/[^\d]/g, ''))}
              placeholder="8889"
              inputMode="numeric"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
            />
            {proxyErrors.proxyPort && <p className="text-danger text-xs">{proxyErrors.proxyPort}</p>}
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Username</label>
            <input
              value={proxyForm.proxyUser}
              onChange={(e) => handleProxyFieldChange('proxyUser', e.target.value)}
              placeholder="Optional"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Password</label>
            <input
              type="password"
              value={proxyForm.proxyPass}
              onChange={(e) => handleProxyFieldChange('proxyPass', e.target.value)}
              placeholder={proxyActive ? 'Enter only when changing password' : 'Optional'}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Leave all fields empty for direct routing. Proxy passwords are not returned by the API, so only re-enter them when changing credentials.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRemoveProxy}
              disabled={proxyRemoving || proxySaving || !proxyActive}
              className="px-4 py-2 rounded-lg border border-border/70 bg-black/5 text-sm transition-colors hover:bg-black/10 disabled:opacity-50 dark:bg-white/5 dark:hover:bg-white/10"
            >
              {proxyRemoving ? 'Removing...' : 'Remove Proxy'}
            </button>
            <button
              onClick={handleSaveProxy}
              disabled={proxySaving || proxyRemoving}
              className="px-4 py-2 rounded-lg bg-brand-purple text-sm font-medium text-white transition-colors hover:bg-brand-purple/90 disabled:opacity-60"
            >
              {proxySaving ? 'Saving...' : 'Save Proxy'}
            </button>
          </div>
        </div>
      </div>

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
            aria-label="Search positions and orders"
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
                  {['Id', 'Symbol', 'Type', 'Qty', 'P&L', 'LTP', 'Avg Price', 'Trans'].map((h) => (
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
                    </motion.tr>
                  );
                })}
                {filteredPositions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {loadingData ? 'Loading positions...' : positionsError ? 'Positions are unavailable' : 'No positions found'}
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
                  <motion.tr key={ord.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                    className="border-b border-border/30 hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold">{ord.symbol}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{ord.exchange || 'NSE'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <TransBadge type={ord.type} />
                    </td>
                    <td className="px-4 py-3 text-xs">{ord.product || 'MIS'}</td>
                    <td className="px-4 py-3 text-xs">{ord.orderType || 'MARKET'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{ord.qty}</td>
                    <td className="px-4 py-3 text-sm font-medium">{formatCurrency(ord.price)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(ord.time)}</td>
                    <td className="px-4 py-3 text-xs font-mono">{ord.id}</td>
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

          {activeTab === 'Options' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Type', 'Qty', 'P&L', 'LTP', 'Avg Price', 'Status'].map((h) => (
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
                      <td className="px-4 py-3 font-semibold text-sm">
                        <div className="flex flex-col">
                          <span>{pos.symbol}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{pos.exchange || 'NFO'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pos.type === 'BUY' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                          {pos.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{pos.qty}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ltp.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{avgPrice > 0 ? avgPrice.toFixed(2) : '0'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={pos.status || 'ACTIVE'} />
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredPositions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No active options positions found
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
            {activeTab === 'Orders' && `1-${filteredOrders.length} of ${filteredOrders.length}`}
            {activeTab === 'Options' && `1-${filteredPositions.length} of ${filteredPositions.length}`}
          </span>
        </div>
      </div>

    </div>
  );
};

export default DematDetail;
