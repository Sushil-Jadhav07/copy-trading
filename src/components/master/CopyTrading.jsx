import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Link, Link2Off, Trash2, ChevronDown, CheckSquare, Zap, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import { useToast } from '@/components/shared/Toast';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { useMasterChildren, useMasterSubscriptions } from '@/hooks/useMaster';
import { masterService } from '@/lib/master';
import { engineService } from '@/lib/engine';
import { connectChannel } from '@/lib/websocket';
import { formatCurrency } from '@/lib/utils';

const ACTIVE_MASTER_STORAGE_KEY = 'ascentra_active_master_account';

const normalizeChildRow = (child) => {
  const hasStatus = child.status != null && String(child.status).trim() !== '';
  const status = String(child.status || '').toUpperCase();

  return {
    id: child.id || child.childId,
    accountId: child.brokerAccountId || child.accountId || '',
    brokerAccountId: child.brokerAccountId || child.accountId || '',
    userId: child.clientId || child.userId || child.childId,
    nickname: child.nickname || child.name || child.childName || 'Unknown',
    broker: child.broker || child.brokerName || 'Broker',
    multiplier: child.multiplier || child.scalingFactor || 1,
    status,
    tradingEnabled: hasStatus ? status === 'ACTIVE' : Boolean(child.enabled || child.tradingEnabled),
    pnlToday: Number(child.pnlToday || child.pnl || 0),
    tradesCopied: Number(child.tradesCopied || child.tradeCount || 0),
    margin: Number(child.margin || child.availableMargin || 0),
    positions: Number(child.positions || child.positionCount || 0),
    isLinked: Boolean(child.isLinked),
    isSubscribedOnly: Boolean(child.isSubscribedOnly),
  };
};

const CopyTrading = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useBrokerAccounts();
  const { children, loading, refetch, setChildren } = useMasterChildren();
  const { subscriptions, loading: subscriptionsLoading, refetch: refetchSubscriptions } = useMasterSubscriptions();
  const [masterAccountId, setMasterAccountId] = useState('');
  const [masterConnected, setMasterConnected] = useState(false);
  const [masterInfo, setMasterInfo] = useState(null);
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [placeRejected, setPlaceRejected] = useState(false);
  const [activeAccountInfo, setActiveAccountInfo] = useState(null);
  const [settingActive, setSettingActive] = useState(false);
  const [selectedChild, setSelectedChild] = useState('');
  const [childMultiplier, setChildMultiplier] = useState('1');
  const [refreshing, setRefreshing] = useState({});
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [search, setSearch] = useState('');
  const [scalingMap, setScalingMap] = useState({});
  const [selectedBulkChildren, setSelectedBulkChildren] = useState([]);

  // ── Trade Copy Engine state ────────────────────────────────────────────────
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);
  const [copyTradeModal, setCopyTradeModal] = useState(false);
  const [copyTradeForm, setCopyTradeForm] = useState({ symbol: '', qty: '', side: 'BUY', product: 'MIS', orderType: 'MARKET', price: '0' });
  const [copyTradeResult, setCopyTradeResult] = useState(null);
  const [copyingTrade, setCopyingTrade] = useState(false);
  const [togglingPolling, setTogglingPolling] = useState(false);
  const [togglingChildren, setTogglingChildren] = useState({});
  const [resettingCache, setResettingCache] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      refetch();
      refetchSubscriptions();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [refetch, refetchSubscriptions]);

  useEffect(() => {
    let isMounted = true;
    const loadActive = async () => {
      try {
        const res = await masterService.getActiveAccount();
        const activeId = res?.brokerAccountId || res?.accountId || '';
        const resolvedId = activeId || window.localStorage.getItem(ACTIVE_MASTER_STORAGE_KEY) || '';
        if (!resolvedId) return;
        const acc = accounts.find((a) => a.accountId === resolvedId);
        if (isMounted) {
          setMasterAccountId(resolvedId);
          if (acc) {
            setMasterInfo(acc);
            setMasterConnected(true);
          }
        }
        if (!activeId && resolvedId) {
          masterService.setActiveAccount(resolvedId).catch(() => {});
        }
      } catch {
        // ignore
      }
    };
    loadActive();
  }, [accounts]);

  // ── Fetch engine status on mount ───────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const status = await engineService.getStatus();
        if (isMounted) {
          setEngineStatus(status);
          setPollingEnabled(Boolean(status?.pollingEnabled ?? status?.isPolling));
        }
      } catch (err) {
        // fail silently for status, keep defaults
      }
    };
    fetchStatus();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    masterService.getActiveAccount()
      .then((data) => {
        if (data?.brokerAccountId) {
          setActiveAccountInfo(data);
          setMasterAccountId(data.brokerAccountId);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const sub = connectChannel(
      'trades',
      (event, data) => {
        if (event === 'TRADE_COPIED' || event === 'copy_trade') {
          addToast(`Trade copied to ${data?.childName || 'follower'} — ${data?.symbol || ''} ${data?.qty || ''}`, 'success');
          refetch();
        }
        if (event === 'TRADE_COPY_FAILED' || event === 'copy_trade_failed') {
          addToast(`Copy failed for ${data?.childName || 'follower'}: ${data?.reason || 'unknown error'}`, 'error');
        }
      },
      null,
      (err) => console.error('WS master trades error', err),
    );

    return () => sub.close();
  }, [addToast, refetch]);

  const masterOptions = accounts.map((a) => ({
    value: a.accountId,
    label: `${a.broker}-${a.userId}-${a.nickname}`,
  }));

  const connectedRows = useMemo(() => children.map(normalizeChildRow), [children]);
  const subscribedRows = useMemo(() => subscriptions.map(normalizeChildRow), [subscriptions]);
  const linkedRows = useMemo(
    () => connectedRows.filter((row) => ['ACTIVE', 'PAUSED'].includes(row.status)),
    [connectedRows],
  );
  const childRows = linkedRows;
  const availableChildRows = useMemo(() => {
    const map = new Map();

    [...connectedRows, ...subscribedRows].forEach((child) => {
      const key = String(child.id || child.accountId || child.userId);
      if (!key) return;

      map.set(key, {
        ...map.get(key),
        ...child,
      });
    });

    return Array.from(map.values());
  }, [connectedRows, subscribedRows]);

  useEffect(() => {
    let isMounted = true;
    connectedRows.forEach((child) => {
      masterService.getChildScaling(child.id).then((data) => {
        if (isMounted) {
          setScalingMap((prev) => ({ ...prev, [child.id]: data }));
        }
      }).catch(() => {});
    });
    return () => { isMounted = false; };
  }, [connectedRows]);

  const childOptions = availableChildRows.filter(
    (child) =>
      String(child.id) !== String(masterAccountId) &&
      !linkedRows.some((row) => String(row.id) === String(child.id))
  );

  const toggleBulkChild = (childId) => {
    setSelectedBulkChildren((prev) =>
      prev.includes(childId) ? prev.filter((id) => id !== childId) : [...prev, childId]
    );
  };

  const handleConnectMaster = () => {
    if (!masterAccountId) { addToast('Please select a master account', 'error'); return; }
    if (masterConnected) {
      masterService.clearActiveAccount().catch(() => {});
      window.localStorage.removeItem(ACTIVE_MASTER_STORAGE_KEY);
      setMasterConnected(false);
      setMasterInfo(null);
      addToast('Master disconnected', 'warning');
    } else {
      const acc = accounts.find((a) => a.accountId === masterAccountId);
      setMasterInfo(acc);
      setMasterConnected(true);
      masterService.setActiveAccount(masterAccountId).catch(() => {});
      window.localStorage.setItem(ACTIVE_MASTER_STORAGE_KEY, masterAccountId);
      addToast('Master connected successfully', 'success');
    }
  };

  const handleSetActiveAccount = async (accountId) => {
    if (!accountId) return;
    setSettingActive(true);
    try {
      await masterService.setActiveAccount(accountId);
      setActiveAccountInfo({ brokerAccountId: accountId });
      addToast('Active trading account updated', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to set active account', 'error');
    } finally {
      setSettingActive(false);
    }
  };

  const handleAddChild = async () => {
    if (!selectedChild) { addToast('Please select a child account', 'error'); return; }
    const selectedChildRow = childOptions.find((item) => String(item.id) === String(selectedChild));
    const scalingFactor = Number(childMultiplier) || 1;
    try {
      await masterService.linkChild(selectedChild, scalingFactor);
      if (selectedChildRow) {
        setChildren((prev) => {
          const exists = prev.some((item) => String(item.id || item.childId) === String(selectedChild));
          if (exists) {
            return prev.map((item) =>
              String(item.id || item.childId) === String(selectedChild)
                ? { ...item, multiplier: scalingFactor, status: 'ACTIVE', enabled: true, isLinked: true, isSubscribedOnly: false }
                : item
            );
          }

          return [
            ...prev,
            {
              ...selectedChildRow,
              childId: selectedChildRow.id,
              id: selectedChildRow.id,
              multiplier: scalingFactor,
              status: 'ACTIVE',
              enabled: true,
              isLinked: true,
              isSubscribedOnly: false,
            },
          ];
        });
      }
      setSelectedChild('');
      setChildMultiplier('1');
      addToast('Child linked successfully', 'success');
      await Promise.all([refetch(), refetchSubscriptions()]);
    } catch (error) {
      const message = error.message || 'Unable to link child';
      if (message.toLowerCase().includes('already linked')) {
        addToast('Child already linked', 'warning');
        await Promise.all([refetch(), refetchSubscriptions()]);
      } else {
        addToast(message, 'error');
      }
    }
  };

  const handleBulkLink = async () => {
    if (!selectedBulkChildren.length) {
      addToast('Select at least one child for bulk connect', 'error');
      return;
    }

    const scalingFactor = Number(childMultiplier) || 1;

    try {
      await masterService.bulkLinkChildren(
        selectedBulkChildren.map((childId) => ({
          childId,
          scalingFactor,
        }))
      );
      setSelectedBulkChildren([]);
      setSelectedChild('');
      setChildMultiplier('1');
      addToast('Children connected successfully', 'success');
      await Promise.all([refetch(), refetchSubscriptions()]);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleBulkUnlink = async () => {
    if (!linkedRows.length) {
      addToast('No linked child accounts to disconnect', 'warning');
      return;
    }

    try {
      await masterService.bulkUnlinkChildren(linkedRows.map((child) => ({ childId: child.id })));
      addToast('All linked children disconnected', 'success');
      await Promise.all([refetch(), refetchSubscriptions()]);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleToggleTrading = async (id) => {
    if (togglingChildren[id]) return;

    const child = connectedRows.find((item) => item.id === id);
    if (!child) return;
    const statusValue = String(child.status || '').toUpperCase();
    const next = !child.tradingEnabled;
    if (next && statusValue !== 'PAUSED') {
      addToast('Can only resume PAUSED subscriptions', 'warning');
      return;
    }
    if (!next && statusValue !== 'ACTIVE') {
      addToast('Can only pause ACTIVE subscriptions', 'warning');
      return;
    }
    setTogglingChildren((prev) => ({ ...prev, [id]: true }));
    setChildren((prev) => prev.map((item) => (item.id || item.childId) === id ? { ...item, status: next ? 'ACTIVE' : 'PAUSED', enabled: next } : item));
    try {
      if (next) {
        await masterService.resumeChild(id);
      } else {
        await masterService.pauseChild(id);
      }
      addToast(`Child ${next ? 'resumed' : 'paused'}`, next ? 'success' : 'warning');
    } catch (error) {
      addToast(error.message, 'error');
      refetch();
    } finally {
      setTogglingChildren((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRefresh = async (id) => {
    setRefreshing((p) => ({ ...p, [id]: true }));
    try {
      const data = await masterService.getChildScaling(id);
      setScalingMap((prev) => ({ ...prev, [id]: data }));
      addToast('Refreshed', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setRefreshing((p) => ({ ...p, [id]: false }));
    }
  };

  const handleMultiplierChange = async (id, val) => {
    setChildren((prev) => prev.map((item) => (item.id || item.childId) === id ? { ...item, multiplier: val } : item));
    try {
      await masterService.updateChildScaling(id, { ...(scalingMap[id] || {}), scalingFactor: val });
    } catch (error) {
      addToast(error.message, 'error');
      refetch();
    }
  };


  // ── Engine handlers ────────────────────────────────────────────────────────
  const handleCopyTrade = async () => {
    const { symbol, qty, side, product, orderType, price } = copyTradeForm;
    if (!symbol.trim()) { addToast('Symbol is required', 'error'); return; }
    if (!qty || Number(qty) <= 0) { addToast('Enter a valid quantity', 'error'); return; }
    setCopyingTrade(true);
    setCopyTradeResult(null);
    try {
      const result = await engineService.manualCopyTrade({
        symbol: symbol.trim().toUpperCase(),
        qty: Number(qty),
        side,
        product,
        orderType,
        price: Number(price) || 0,
      });
      setCopyTradeResult(result);
      addToast(`Trade copied: ${result.success || 0} success, ${result.failed || 0} failed`, result.failed ? 'warning' : 'success');
    } catch (error) {
      addToast(error.message || 'Trade copy failed', 'error');
    } finally {
      setCopyingTrade(false);
    }
  };

  const handleTogglePolling = async () => {
    setTogglingPolling(true);
    try {
      await engineService.togglePolling(!pollingEnabled);
      setPollingEnabled((p) => !p);
      addToast(`Auto-polling ${!pollingEnabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      addToast(error.message || 'Failed to toggle polling', 'error');
    } finally {
      setTogglingPolling(false);
    }
  };

  const handleResetPollingCache = async () => {
    if (!window.confirm('Reset the polling cache now?')) {
      return;
    }
    setResettingCache(true);
    try {
      await engineService.resetPollingCache();
      addToast('Polling cache reset — engine will re-scan all orders', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to reset cache', 'error');
    } finally {
      setResettingCache(false);
    }
  };

  const filtered = linkedRows.filter((c) => !search || `${c.broker} ${c.userId} ${c.nickname}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Copy Trading</h1>
      </div>

      <GlassCard
        title="Engine Status"
        subtitle="Current trade engine state"
        action={
          <button
            onClick={handleResetPollingCache}
            disabled={resettingCache}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resettingCache ? 'animate-spin' : ''}`} />
            Reset Polling Cache
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs text-muted-foreground">Engine Status</p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${String(engineStatus?.engineStatus || engineStatus?.status || 'INACTIVE').toUpperCase() === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
              {engineStatus?.engineStatus || engineStatus?.status || 'UNKNOWN'}
            </span>
          </div>
          <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs text-muted-foreground">Polling</p>
            <div className="mt-2 flex items-center gap-3">
              <ToggleSwitch
                checked={pollingEnabled}
                disabled={togglingPolling}
                onChange={handleTogglePolling}
              />
              <span className="text-sm font-medium">{pollingEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
          <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs text-muted-foreground">Supported Brokers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(engineStatus?.supportedBrokers || []).map((broker) => (
                <span key={broker} className="rounded-full bg-brand-blue/10 px-2 py-1 text-xs font-semibold text-brand-blue">
                  {broker}
                </span>
              ))}
              {!(engineStatus?.supportedBrokers || []).length && <span className="text-sm text-muted-foreground">No broker list</span>}
            </div>
          </div>
          <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs text-muted-foreground">Modes</p>
            <p className="mt-2 text-sm font-medium">{Array.isArray(engineStatus?.modes) ? engineStatus.modes.join(', ') : engineStatus?.modes || 'N/A'}</p>
          </div>
        </div>
      </GlassCard>

      {masterAccountId && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-brand-purple/8 border border-brand-purple/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
            <div>
              <p className="text-xs text-muted-foreground">Active trading account</p>
              <p className="text-sm font-semibold">
                {accounts.find((a) => a.accountId === masterAccountId)?.broker || 'Unknown'} —{' '}
                {accounts.find((a) => a.accountId === masterAccountId)?.userId || masterAccountId}
              </p>
            </div>
          </div>
          {accounts.length > 1 && (
            <select
              value={masterAccountId}
              onChange={(e) => handleSetActiveAccount(e.target.value)}
              disabled={settingActive}
              className="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-brand-purple disabled:opacity-50"
            >
              {accounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.broker} — {a.userId} {a.nickname ? `(${a.nickname})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard>
        {!masterConnected ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Master Account</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 relative">
                <select value={masterAccountId} onChange={(e) => setMasterAccountId(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                  <option value="" className="bg-background">Select Master Account</option>
                  {masterOptions.map((o) => <option key={o.value} value={o.value} className="bg-background">{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <button onClick={handleConnectMaster} className="w-full sm:w-auto px-6 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-sm font-medium transition-colors">Connect</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <span className="font-bold text-base sm:text-lg uppercase break-all">{masterInfo?.broker?.toUpperCase()}-{masterInfo?.userId}-{masterInfo?.nickname?.toUpperCase()}</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button onClick={handleConnectMaster} className="w-full sm:w-auto px-4 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">Disconnect</button>
              <div className="flex flex-wrap items-center gap-4">
                <ToggleSwitch
                  checked={tradingEnabled}
                  onChange={() => setTradingEnabled((p) => !p)}
                  label="Trading"
                  showStateText
                />
                <ToggleSwitch
                  checked={placeRejected}
                  onChange={() => setPlaceRejected((p) => !p)}
                  label="Place Rejected Order"
                />
              </div>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Child Accounts</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="flex-1 min-w-full sm:min-w-[200px] relative">
            <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
              <option value="" className="bg-background">Select Child Account</option>
              {childOptions.map((a) => <option key={a.id} value={a.id} className="bg-background">{a.broker}-{a.userId}-{a.nickname}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="w-full sm:w-32">
            <input type="number" value={childMultiplier} onChange={(e) => setChildMultiplier(e.target.value)} placeholder="Multiplier" min="0.1" step="0.1" className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple" />
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button onClick={handleAddChild} className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-sm font-medium transition-colors">Connect</button>
            <button onClick={handleBulkLink} className="flex-1 sm:flex-none px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Bulk Connect
            </button>
            <button onClick={handleBulkUnlink} className="w-full sm:w-auto px-5 py-2.5 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">
              Disconnect All
            </button>
          </div>
        </div>
        {childOptions.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {childOptions.map((child) => {
              const checked = selectedBulkChildren.includes(child.id);
              return (
                <label
                  key={child.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    checked ? 'border-brand-purple bg-brand-purple/10' : 'border-border bg-black/5 dark:bg-white/5'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleBulkChild(child.id)}
                    className="accent-brand-purple"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{child.broker}-{child.userId}-{child.nickname}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {String(child.status || child.copyingStatus || 'SUBSCRIBED').replaceAll('_', ' ')}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>


      {/* ── Trade Copy Engine ──────────────────────────────────────────────── */}
      {masterConnected && (
        <GlassCard>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Trade Copy Engine</p>
              <p className="text-xs text-muted-foreground">Manual copy or auto-poll master orders every 10 sec</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Auto-polling toggle */}
              <ToggleSwitch
                checked={pollingEnabled}
                disabled={togglingPolling}
                onChange={handleTogglePolling}
                label="Auto-poll"
                showStateText
              />
              {/* Reset cache */}
              <button
                onClick={handleResetPollingCache}
                disabled={resettingCache}
                title="Reset polling cache (use at start of trading day)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-xs font-medium transition-colors disabled:opacity-60"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${resettingCache ? 'animate-spin' : ''}`} />
                Reset Cache
              </button>
              {/* Manual copy trade */}
              <button
                onClick={() => { setCopyTradeModal(true); setCopyTradeResult(null); }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                Copy Trade
              </button>
            </div>
          </div>
          {pollingEnabled && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-purple/10 border border-brand-purple/20 text-xs text-brand-purple font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" />
              Auto-polling active — syncing master orders every 10 seconds
            </div>
          )}
        </GlassCard>
      )}

    <GlassCard noPadding>
        <div className="p-4 border-b border-border/50 flex justify-end">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-56 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" />
        </div>
        {loading || accountsLoading || subscriptionsLoading ? (
          <div className="p-4"><SkeletonLoader type="table" rows={5} columns={11} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Broker - User Id - User', 'Margin', 'P&L', 'Pos', 'Multiplier', 'Trading', 'Refresh', 'Demat', 'Connection', 'Action'].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((child, idx) => (
                  <motion.tr key={child.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-3 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-3 text-sm font-medium">{child.broker} - {child.userId} - {child.nickname}</td>
                    <td className="px-3 py-3 text-sm">{formatCurrency(child.margin || 0)}</td>
                    <td className="px-3 py-3"><span className={`text-sm font-semibold ${child.pnlToday >= 0 ? 'text-success' : 'text-danger'}`}>{child.pnlToday >= 0 ? '+' : ''}{formatCurrency(child.pnlToday)} {child.pnlToday >= 0 ? '↑' : '↓'}</span></td>
                    <td className="px-3 py-3 text-sm">{child.positions || 0}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleMultiplierChange(child.id, Math.max(0.25, child.multiplier - 0.25))} className="w-5 h-5 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors flex items-center justify-center">−</button>
                        <span className="w-12 text-center text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-1 py-0.5">{child.multiplier}</span>
                        <button onClick={() => handleMultiplierChange(child.id, child.multiplier + 0.25)} className="w-5 h-5 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors flex items-center justify-center">+</button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <ToggleSwitch
                        checked={child.tradingEnabled}
                        disabled={
                          Boolean(togglingChildren[child.id]) ||
                          !['ACTIVE', 'PAUSED'].includes(String(child.status || '').toUpperCase())
                        }
                        onChange={() => {
                          if (!['ACTIVE', 'PAUSED'].includes(String(child.status || '').toUpperCase())) {
                            addToast('Only ACTIVE/PAUSED subscriptions can be toggled', 'warning');
                            return;
                          }
                          handleToggleTrading(child.id);
                        }}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => handleRefresh(child.id)} className="w-8 h-8 bg-brand-purple/80 hover:bg-brand-purple rounded-lg flex items-center justify-center transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 text-white ${refreshing[child.id] ? 'animate-spin' : ''}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => {
                          if (!child.brokerAccountId && !child.accountId) {
                            addToast('Broker account details are not available for this child account yet', 'warning');
                            return;
                          }
                          navigate(`/master/demat/${child.brokerAccountId || child.accountId}`);
                        }}
                        className="w-8 h-8 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={async () => {
                            try {
                              await masterService.unlinkChild(child.id);
                              addToast('Child disconnected', 'success');
                              refetch();
                              refetchSubscriptions();
                            } catch (error) {
                              addToast(error.message, 'error');
                            }
                          }}
                          className="w-8 h-8 bg-warning/80 hover:bg-warning rounded-lg flex items-center justify-center transition-colors"
                          title="Disconnect"
                        >
                          <Link2Off className="w-3.5 h-3.5 text-white" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await masterService.linkChild(child.id, child.multiplier);
                              addToast('Child connected', 'success');
                              refetch();
                              refetchSubscriptions();
                            } catch (error) {
                              addToast(error.message, 'error');
                            }
                          }}
                          className="w-8 h-8 bg-success/80 hover:bg-success rounded-lg flex items-center justify-center transition-colors"
                          title="Connect"
                        >
                          <Link className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => { setSelectedRow(child); setDeleteModal(true); }} className="w-8 h-8 bg-danger/80 hover:bg-danger rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">No child accounts added yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>


      {/* Copy Trade Modal */}
      <Modal isOpen={copyTradeModal} onClose={() => { setCopyTradeModal(false); setCopyTradeResult(null); }} title="Manual Copy Trade" size="sm">
        <div className="space-y-4">
          {!copyTradeResult ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Symbol</label>
                  <input
                    value={copyTradeForm.symbol}
                    onChange={(e) => setCopyTradeForm((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))}
                    placeholder="e.g. RELIANCE"
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Quantity</label>
                  <input
                    type="number" min="1"
                    value={copyTradeForm.qty}
                    onChange={(e) => setCopyTradeForm((p) => ({ ...p, qty: e.target.value }))}
                    placeholder="Qty"
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Side</label>
                  <select value={copyTradeForm.side} onChange={(e) => setCopyTradeForm((p) => ({ ...p, side: e.target.value }))} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple">
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Product</label>
                  <select value={copyTradeForm.product} onChange={(e) => setCopyTradeForm((p) => ({ ...p, product: e.target.value }))} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple">
                    <option value="MIS">MIS</option>
                    <option value="CNC">CNC</option>
                    <option value="NRML">NRML</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Order Type</label>
                  <select value={copyTradeForm.orderType} onChange={(e) => setCopyTradeForm((p) => ({ ...p, orderType: e.target.value }))} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple">
                    <option value="MARKET">MARKET</option>
                    <option value="LIMIT">LIMIT</option>
                  </select>
                </div>
                {copyTradeForm.orderType === 'LIMIT' && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Price</label>
                    <input
                      type="number" min="0" step="0.05"
                      value={copyTradeForm.price}
                      onChange={(e) => setCopyTradeForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="0.00"
                      className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCopyTradeModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 rounded-lg text-sm transition-colors">Cancel</button>
                <button
                  onClick={handleCopyTrade}
                  disabled={copyingTrade}
                  className="flex-1 py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {copyingTrade ? <><RefreshCw className="w-4 h-4 animate-spin" /> Copying...</> : <><Zap className="w-4 h-4" /> Copy Trade</>}
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Symbol</span>
                <span className="font-semibold">{copyTradeResult.symbol} {copyTradeResult.side}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Master Qty</span>
                <span>{copyTradeResult.masterQty}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Children</span>
                <span className="text-success font-semibold">{copyTradeResult.success} success</span>
                {copyTradeResult.failed > 0 && <span className="text-danger font-semibold">{copyTradeResult.failed} failed</span>}
              </div>
              {Array.isArray(copyTradeResult.results) && copyTradeResult.results.length > 0 && (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {copyTradeResult.results.map((r, i) => (
                    <div key={i} className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${r.status === 'SUCCESS' ? 'bg-success/10 border border-success/20' : 'bg-danger/10 border border-danger/20'}`}>
                      <span className="font-medium">{r.broker} · qty {r.scaledQty}</span>
                      <span className={r.status === 'SUCCESS' ? 'text-success' : 'text-danger'}>{r.message}</span>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { setCopyTradeModal(false); setCopyTradeResult(null); }} className="w-full py-2 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-lg text-sm font-medium transition-colors">Done</button>
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Remove Child Account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Remove <span className="font-semibold text-foreground">{selectedRow?.nickname}</span> from copy trading?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={async () => {
              try {
                await masterService.unlinkChild(selectedRow.id);
                addToast('Removed', 'success');
                refetch();
              } catch (error) {
                addToast(error.message, 'error');
              }
              setDeleteModal(false);
            }} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CopyTrading;
