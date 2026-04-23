import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Eye,
  Link,
  Link2Off,
  Trash2,
  CheckSquare,
  Zap,
  RotateCcw,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Users,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import { useToast } from '@/components/shared/Toast';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { useMasterChildren, useMasterSubscriptions } from '@/hooks/useMaster';
import { masterService } from '@/lib/master';
import { engineService } from '@/lib/engine';
import { connectChannel } from '@/lib/websocket';
import { formatCurrency } from '@/lib/utils';

const ACTIVE_MASTER_STORAGE_KEY = 'ascentra_active_master_account';

const RESULT_CFG = {
  SUCCESS: {
    row: 'border-l-emerald-500 bg-emerald-500/8',
    badge: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle2,
    iconCls: 'text-emerald-500',
    label: 'Success',
  },
  SKIPPED: {
    row: 'border-l-amber-500 bg-amber-500/10',
    badge: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
    icon: SkipForward,
    iconCls: 'text-amber-500',
    label: 'Skipped',
  },
  FAILED: {
    row: 'border-l-rose-500 bg-rose-500/8',
    badge: 'bg-rose-500/12 text-rose-600 dark:text-rose-400',
    icon: AlertCircle,
    iconCls: 'text-rose-500',
    label: 'Failed',
  },
};

const getResultCfg = (status) => RESULT_CFG[String(status || '').toUpperCase()] || RESULT_CFG.FAILED;

const getModeBadgeClass = (mode = '') => {
  const normalized = String(mode).toLowerCase();
  if (normalized === 'manual') return 'bg-brand-blue/12 text-brand-blue';
  if (normalized === 'polling') return 'bg-amber-500/12 text-amber-600 dark:text-amber-400';
  if (normalized === 'postback') return 'bg-brand-teal/12 text-brand-teal';
  if (normalized === 'websocket') return 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400';
  return 'bg-slate-500/10 text-slate-500 dark:text-slate-400';
};

const getDetectionBadgeClass = (method = '') => {
  const normalized = String(method).toLowerCase();
  if (normalized.includes('websocket') || normalized.includes('postback')) {
    return 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400';
  }
  if (normalized.includes('polling')) {
    return 'bg-amber-500/12 text-amber-600 dark:text-amber-400';
  }
  return 'bg-slate-500/10 text-slate-500 dark:text-slate-400';
};

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
    multiplier: Number(child.multiplier || child.scalingFactor || 1),
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

const StatusLabel = ({ status }) => {
  const normalized = String(status || '').toUpperCase();
  const cls =
    normalized === 'ACTIVE'
      ? 'text-emerald-500'
      : normalized === 'PAUSED'
      ? 'text-amber-500'
      : 'text-muted-foreground';

  return <span className={`text-[10px] font-bold uppercase tracking-wide ${cls}`}>{normalized || 'UNKNOWN'}</span>;
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
  const [settingActive, setSettingActive] = useState(false);
  const [selectedChild, setSelectedChild] = useState('');
  const [childMultiplier, setChildMultiplier] = useState('1');
  const [refreshing, setRefreshing] = useState({});
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [search, setSearch] = useState('');
  const [scalingMap, setScalingMap] = useState({});
  const [selectedBulkChildren, setSelectedBulkChildren] = useState([]);

  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);
  const [pollingStatus, setPollingStatus] = useState(null);
  const [togglingPolling, setTogglingPolling] = useState(false);
  const [togglingChildren, setTogglingChildren] = useState({});
  const [resettingCache, setResettingCache] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      refetch();
      refetchSubscriptions();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refetch, refetchSubscriptions]);

  useEffect(() => {
    let isMounted = true;

    masterService.getActiveAccount().then((res) => {
      const activeId = res?.brokerAccountId || res?.accountId || '';
      const resolvedId = activeId || window.localStorage.getItem(ACTIVE_MASTER_STORAGE_KEY) || '';
      if (!resolvedId || !isMounted) return;
      const acc = accounts.find((item) => item.accountId === resolvedId);
      setMasterAccountId(resolvedId);
      if (acc) {
        setMasterInfo(acc);
        setMasterConnected(true);
      }
      if (!activeId && resolvedId) {
        masterService.setActiveAccount(resolvedId).catch(() => {});
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [accounts]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([engineService.getStatus(), engineService.getPollingStatus()]).then(([status, polling]) => {
      if (!isMounted) return;
      setEngineStatus(status);
      setPollingEnabled(Boolean(status?.pollingEnabled ?? status?.isPolling));
      setPollingStatus(polling);
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const sub = connectChannel(
      'trades',
      (event, data) => {
        if (event === 'TRADE_COPIED' || event === 'copy_trade') {
          addToast(`Trade copied to ${data?.childName || 'follower'} - ${data?.symbol || ''} ${data?.qty || ''}`, 'success');
          refetch();
        }
        if (event === 'TRADE_COPY_FAILED' || event === 'copy_trade_failed') {
          addToast(`Copy failed for ${data?.childName || 'follower'}: ${data?.reason || 'unknown error'}`, 'error');
        }
      },
      null,
      (error) => console.error('WS master trades error', error),
    );

    return () => sub.close();
  }, [addToast, refetch]);

  const connectedRows = useMemo(() => children.map(normalizeChildRow), [children]);
  const subscribedRows = useMemo(() => subscriptions.map(normalizeChildRow), [subscriptions]);
  const linkedRows = useMemo(() => connectedRows.filter((row) => ['ACTIVE', 'PAUSED'].includes(row.status)), [connectedRows]);

  const availableChildRows = useMemo(() => {
    const map = new Map();

    [...connectedRows, ...subscribedRows].forEach((child) => {
      const key = String(child.id || child.accountId || child.userId);
      if (!key) return;
      map.set(key, { ...map.get(key), ...child });
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

    return () => {
      isMounted = false;
    };
  }, [connectedRows]);

  const childOptions = availableChildRows.filter(
    (child) =>
      String(child.id) !== String(masterAccountId) &&
      !linkedRows.some((row) => String(row.id) === String(child.id)),
  );

  const handleConnectMaster = () => {
    if (!masterAccountId) {
      addToast('Please select a master account', 'error');
      return;
    }

    if (masterConnected) {
      masterService.clearActiveAccount().catch(() => {});
      window.localStorage.removeItem(ACTIVE_MASTER_STORAGE_KEY);
      setMasterConnected(false);
      setMasterInfo(null);
      addToast('Master disconnected', 'warning');
      return;
    }

    const acc = accounts.find((item) => item.accountId === masterAccountId);
    setMasterInfo(acc);
    setMasterConnected(true);
    masterService.setActiveAccount(masterAccountId).catch(() => {});
    window.localStorage.setItem(ACTIVE_MASTER_STORAGE_KEY, masterAccountId);
    addToast('Master connected successfully', 'success');
  };

  const handleSetActiveAccount = async (accountId) => {
    if (!accountId) return;
    setSettingActive(true);
    try {
      await masterService.setActiveAccount(accountId);
      addToast('Active trading account updated', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to set active account', 'error');
    } finally {
      setSettingActive(false);
    }
  };

  const handleAddChild = async () => {
    if (!selectedChild) {
      addToast('Please select a child account', 'error');
      return;
    }

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
                : item,
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
        return;
      }
      addToast(message, 'error');
    }
  };

  const handleBulkLink = async () => {
    if (!selectedBulkChildren.length) {
      addToast('Select at least one child for bulk connect', 'error');
      return;
    }

    try {
      await masterService.bulkLinkChildren(
        selectedBulkChildren.map((childId) => ({
          childId,
          scalingFactor: Number(childMultiplier) || 1,
        })),
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
    setChildren((prev) =>
      prev.map((item) =>
        (item.id || item.childId) === id ? { ...item, status: next ? 'ACTIVE' : 'PAUSED', enabled: next } : item,
      ),
    );

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
    setRefreshing((prev) => ({ ...prev, [id]: true }));
    try {
      const data = await masterService.getChildScaling(id);
      setScalingMap((prev) => ({ ...prev, [id]: data }));
      addToast('Refreshed', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setRefreshing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleMultiplierChange = async (id, value) => {
    setChildren((prev) =>
      prev.map((item) => ((item.id || item.childId) === id ? { ...item, multiplier: value } : item)),
    );
    try {
      await masterService.updateChildScaling(id, { ...(scalingMap[id] || {}), scalingFactor: value });
    } catch (error) {
      addToast(error.message, 'error');
      refetch();
    }
  };

  const handleTogglePolling = async () => {
    setTogglingPolling(true);
    try {
      await engineService.togglePolling(!pollingEnabled);
      setPollingEnabled((prev) => !prev);
      addToast(`Auto-polling ${!pollingEnabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      addToast(error.message || 'Failed to toggle polling', 'error');
    } finally {
      setTogglingPolling(false);
    }
  };

  const handleResetPollingCache = async () => {
    if (!window.confirm('Reset the polling cache now?')) return;

    setResettingCache(true);
    try {
      await engineService.resetPollingCache();
      const nextStatus = await engineService.getPollingStatus();
      setPollingStatus(nextStatus);
      addToast('Polling cache reset - engine will re-scan all orders', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to reset cache', 'error');
    } finally {
      setResettingCache(false);
    }
  };

  const filtered = linkedRows.filter((child) =>
    !search || `${child.broker} ${child.userId} ${child.nickname}`.toLowerCase().includes(search.toLowerCase()),
  );
  const detectionMethods = engineStatus?.detectionMethod || {};
  const brokerList = Object.keys(detectionMethods).length > 0 ? Object.keys(detectionMethods) : engineStatus?.supportedBrokers || [];
  const engineActive = String(engineStatus?.engineStatus || engineStatus?.status || '').toUpperCase() === 'ACTIVE';
  const pollingInterval = engineStatus?.pollingIntervalSeconds || 10;
  const modeList = (Array.isArray(engineStatus?.modes) ? engineStatus.modes : [engineStatus?.modes]).filter(Boolean);
  const lastResetLabel = pollingStatus?.lastResetAt
    ? new Date(pollingStatus.lastResetAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not reset yet';
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Copy Trading</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Manage master-child connections and trade replication engine.</p>
      </div>

      <GlassCard
        title="Engine Status"
        subtitle="Real-time trade engine state"
        action={
          <button
            onClick={handleResetPollingCache}
            disabled={resettingCache}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60 hover:border-brand-purple/30"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${resettingCache ? 'animate-spin text-brand-purple' : ''}`} />
            Reset Polling Cache
          </button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/30 bg-black/4 p-4 dark:bg-white/4">
            <div className="mb-3 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Engine</p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 ${engineActive ? 'border-emerald-500/20 bg-emerald-500/8' : 'border-rose-500/20 bg-rose-500/8'}`}>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${engineActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}
                  style={engineActive ? { boxShadow: '0 0 0 4px rgba(16,185,129,0.2)' } : {}}
                />
                <span className={`text-base font-black uppercase tracking-tight ${engineActive ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {engineStatus?.engineStatus || engineStatus?.status || 'UNKNOWN'}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {engineActive ? 'Engine is actively processing replication events.' : 'Engine is currently idle.'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-black/4 p-4 dark:bg-white/4">
            <div className="mb-3 flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Auto-poll</p>
            </div>
            <div className="mb-2 flex items-center gap-3">
              <ToggleSwitch checked={pollingEnabled} disabled={togglingPolling} onChange={handleTogglePolling} />
              <span className={`text-xs font-bold ${pollingEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                {pollingEnabled ? `Every ${pollingInterval}s` : 'Off'}
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-foreground">
              <Clock className="mt-0.5 h-3 w-3 flex-shrink-0" />
              <span>
                Last reset: {lastResetLabel}
                {pollingStatus?.autoResetEnabled && <span className="ml-1 font-semibold text-brand-purple">• Auto reset enabled</span>}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-black/4 p-4 dark:bg-white/4">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Modes</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {modeList.map((mode) => (
                <span key={mode} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${getModeBadgeClass(mode)}`}>
                  {mode}
                </span>
              ))}
              {!modeList.length && <span className="text-xs text-muted-foreground">N/A</span>}
            </div>
          </div>

          <div className="rounded-xl border border-border/30 bg-black/4 p-4 dark:bg-white/4">
            <div className="mb-3 flex items-center gap-2">
              <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Broker Detection</p>
            </div>
            <div className="space-y-2">
              {brokerList.map((broker) => {
                const method = detectionMethods[broker] || 'polling';
                return (
                  <div key={broker} className="rounded-xl border border-border/30 bg-black/4 px-3 py-2 dark:bg-white/4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{broker}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${getDetectionBadgeClass(method)}`}>
                        {method}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">Detection path: {String(method).replace(/_/g, ' ')}</p>
                  </div>
                );
              })}
              {!brokerList.length && <span className="text-xs text-muted-foreground">No brokers detected yet</span>}
            </div>
          </div>
        </div>
      </GlassCard>

      {masterAccountId && (
        <div
          className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{
            background: 'rgba(0,200,150,0.06)',
            borderColor: 'rgba(0,200,150,0.22)',
            boxShadow: '0 0 24px rgba(0,200,150,0.10)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: '0 0 0 4px rgba(16,185,129,0.2)' }} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Trading Account</p>
              <p className="text-sm font-bold text-foreground">
                {accounts.find((item) => item.accountId === masterAccountId)?.broker || 'Unknown'} -{' '}
                {accounts.find((item) => item.accountId === masterAccountId)?.userId || masterAccountId}
              </p>
            </div>
          </div>
          {accounts.length > 1 && (
            <DivSelect
              value={masterAccountId}
              onChange={handleSetActiveAccount}
              disabled={settingActive}
              includeEmptyOption={false}
              options={accounts.map((account) => ({
                value: account.accountId,
                label: `${account.broker} - ${account.userId}${account.nickname ? ` (${account.nickname})` : ''}`,
              }))}
              triggerClassName="rounded-xl border border-border bg-black/5 px-3 py-1.5 text-xs focus:border-brand-purple disabled:opacity-50 dark:bg-white/5"
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard>
          {!masterConnected ? (
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Master Account</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <DivSelect
                    value={masterAccountId}
                    onChange={setMasterAccountId}
                    placeholder="Select Master Account"
                    options={accounts.map((account) => ({
                      value: account.accountId,
                      label: `${account.broker} - ${account.userId}${account.nickname ? ` (${account.nickname})` : ''}`,
                    }))}
                    triggerClassName="w-full rounded-xl border border-border bg-black/5 px-3 py-2.5 text-sm focus:border-brand-purple dark:bg-white/5"
                  />
                </div>
                <button onClick={handleConnectMaster} className="btn-primary-gradient w-full px-6 sm:w-auto">
                  Connect
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" style={{ boxShadow: '0 0 0 4px rgba(16,185,129,0.2)' }} />
                <span className="gradient-text break-all text-base font-black uppercase sm:text-lg">
                  {masterInfo?.broker?.toUpperCase()}-{masterInfo?.userId}-{masterInfo?.nickname?.toUpperCase()}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <button
                  onClick={handleConnectMaster}
                  className="w-full rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger/90 sm:w-auto"
                >
                  Disconnect
                </button>
                <div className="flex flex-wrap items-center gap-4">
                  <ToggleSwitch checked={tradingEnabled} onChange={() => setTradingEnabled((prev) => !prev)} label="Trading" showStateText />
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Child Accounts</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="min-w-full flex-1 sm:min-w-[200px]">
              <DivSelect
                value={selectedChild}
                onChange={setSelectedChild}
                placeholder="Select Child Account"
                options={childOptions.map((child) => ({
                  value: child.id,
                  label: `${child.broker} - ${child.userId} (${child.nickname})`,
                }))}
                triggerClassName="w-full rounded-xl border border-border bg-black/5 px-3 py-2.5 text-sm focus:border-brand-purple dark:bg-white/5"
              />
            </div>
            <div className="w-full sm:w-28">
              <input
                type="number"
                value={childMultiplier}
                onChange={(event) => setChildMultiplier(event.target.value)}
                placeholder="Multiplier"
                min="0.1"
                step="0.1"
                className="w-full rounded-xl border border-border bg-black/5 px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple dark:bg-white/5"
              />
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <button
                onClick={handleAddChild}
                className="flex-1 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue/90 sm:flex-none"
              >
                Connect
              </button>
              <button
                onClick={handleBulkLink}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-purple/90 sm:flex-none"
              >
                <CheckSquare className="h-4 w-4" />
                Bulk Connect
              </button>
              <button
                onClick={handleBulkUnlink}
                className="w-full rounded-xl bg-danger px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danger/90 sm:w-auto"
              >
                Disconnect All
              </button>
            </div>
          </div>
          {childOptions.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {childOptions.map((child) => {
                const checked = selectedBulkChildren.includes(child.id);
                return (
                  <label
                    key={child.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                      checked
                        ? 'border-brand-purple bg-brand-purple/8'
                        : 'border-border bg-black/4 hover:border-brand-purple/40 dark:bg-white/4'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedBulkChildren((prev) => (prev.includes(child.id) ? prev.filter((id) => id !== child.id) : [...prev, child.id]))
                      }
                      className="accent-brand-purple"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {child.broker} - {child.userId}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
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

      {masterConnected && (
        <GlassCard>
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Trade Copy Engine</p>
              <p className="text-xs text-muted-foreground">Manual copy or auto-poll master orders every {pollingInterval}s</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleSwitch checked={pollingEnabled} disabled={togglingPolling} onChange={handleTogglePolling} label="Auto-poll" showStateText />
              <button
                onClick={handleResetPollingCache}
                disabled={resettingCache}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-black/5 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-black/8 disabled:opacity-60 dark:bg-white/5"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${resettingCache ? 'animate-spin text-brand-purple' : ''}`} />
                Reset Cache
              </button>
            </div>
          </div>

          <AnimatePresence>
            {pollingEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative overflow-hidden rounded-xl px-4 py-2.5"
                style={{ background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)' }}
              >
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={{ backgroundPositionX: ['0%', '200%'] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
                  style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(0,200,150,0.22), transparent)', backgroundSize: '200% 100%' }}
                />
                <div className="relative flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand-purple animate-pulse" />
                  <span className="text-xs font-semibold text-brand-purple">Auto-polling active</span>
                  <span className="text-xs text-muted-foreground">— syncing every {pollingInterval}s</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      )}

      <GlassCard noPadding>
        <div className="flex items-center justify-between gap-3 border-b border-border/50 p-4">
          <p className="text-sm font-bold text-foreground">
            {linkedRows.length} linked child{linkedRows.length !== 1 ? 's' : ''}
          </p>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search..."
            className="w-48 rounded-xl border border-border bg-black/5 px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple dark:bg-white/5"
          />
        </div>
        {loading || accountsLoading || subscriptionsLoading ? (
          <div className="p-4">
            <SkeletonLoader type="table" rows={5} columns={11} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-black/3 dark:bg-white/3">
                  {['#', 'Broker / Account', 'Margin', 'P&L', 'Pos', 'Multiplier', 'Trading', 'Refresh', 'Demat', 'Connect', ''].map((header) => (
                    <th key={header} className="whitespace-nowrap px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((child, index) => {
                  const isActive = child.status === 'ACTIVE';
                  const isPaused = child.status === 'PAUSED';
                  const lowMargin = child.margin < 5000;
                  const marginBarWidth = `${Math.min(100, Math.max(10, (child.margin / 25000) * 100))}%`;

                  return (
                    <motion.tr
                      key={child.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={`border-b border-l-2 border-border/20 transition-colors hover:bg-black/3 dark:hover:bg-white/2 ${
                        isActive ? 'border-l-emerald-500' : isPaused ? 'border-l-amber-500' : 'border-l-slate-400'
                      }`}
                    >
                      <td className="px-3 py-3 text-xs font-bold text-muted-foreground">{index + 1}</td>
                      <td className="px-3 py-3">
                        <div>
                          <p className="text-sm font-bold">{child.broker}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {child.userId} · {child.nickname}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="min-w-[112px]">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-semibold ${lowMargin ? 'text-rose-500' : 'text-foreground'}`}>
                              {formatCurrency(child.margin || 0)}
                            </span>
                            {lowMargin && <span className="text-[9px] font-black text-rose-500">LOW</span>}
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/6 dark:bg-white/8">
                            <div
                              className={`h-full rounded-full ${lowMargin ? 'bg-rose-500' : child.margin < 12000 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: marginBarWidth }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className={`inline-flex items-center gap-1 text-sm font-bold ${child.pnlToday >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          <motion.span
                            animate={child.pnlToday >= 0 ? { y: [0, -1.5, 0] } : false}
                            transition={child.pnlToday >= 0 ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
                          >
                            {child.pnlToday >= 0 ? '↑' : '↓'}
                          </motion.span>
                          <span>{child.pnlToday >= 0 ? '+' : ''}{formatCurrency(child.pnlToday)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm font-semibold">{child.positions || 0}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMultiplierChange(child.id, Math.max(0.25, child.multiplier - 0.25))}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/8 text-xs font-black transition-colors hover:bg-brand-purple/15 dark:bg-white/8"
                          >
                            -
                          </button>
                          <span className="w-16 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-center text-base font-black text-amber-500">
                            {child.multiplier}x
                          </span>
                          <button
                            onClick={() => handleMultiplierChange(child.id, child.multiplier + 0.25)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-black/8 text-xs font-black transition-colors hover:bg-brand-purple/15 dark:bg-white/8"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <ToggleSwitch
                            checked={child.tradingEnabled}
                            disabled={Boolean(togglingChildren[child.id]) || !['ACTIVE', 'PAUSED'].includes(child.status)}
                            onChange={() => {
                              if (!['ACTIVE', 'PAUSED'].includes(child.status)) {
                                addToast('Only ACTIVE/PAUSED subscriptions can be toggled', 'warning');
                                return;
                              }
                              handleToggleTrading(child.id);
                            }}
                          />
                          <StatusLabel status={child.status} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleRefresh(child.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-purple/20 bg-brand-purple/10 transition-colors hover:bg-brand-purple/20"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 text-brand-purple ${refreshing[child.id] ? 'animate-spin' : ''}`} />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => {
                            if (!child.brokerAccountId && !child.accountId) {
                              addToast('Broker account not available', 'warning');
                              return;
                            }
                            navigate(`/master/demat/${child.brokerAccountId || child.accountId}`);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-blue/20 bg-brand-blue/10 transition-colors hover:bg-brand-blue/20"
                        >
                          <Eye className="h-3.5 w-3.5 text-brand-blue" />
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
                            title="Disconnect"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-warning/20 bg-warning/10 transition-colors hover:bg-warning/20"
                          >
                            <Link2Off className="h-3.5 w-3.5 text-warning" />
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
                            title="Connect"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-success/20 bg-success/10 transition-colors hover:bg-success/20"
                          >
                            <Link className="h-3.5 w-3.5 text-success" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => {
                            setSelectedRow(child);
                            setDeleteModal(true);
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-danger/20 bg-danger/10 transition-colors hover:bg-danger/20"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-4 py-14 text-center">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5">
                        <Users className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground">No child accounts linked yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>


      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Remove Child Account" size="sm">
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-500/15 bg-rose-500/6 p-3">
            <p className="text-sm text-muted-foreground">
              Remove <span className="font-bold text-foreground">{selectedRow?.nickname}</span> from copy trading? Their subscription will be set to inactive.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteModal(false)}
              className="flex-1 rounded-xl bg-black/5 py-2.5 text-sm font-semibold transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await masterService.unlinkChild(selectedRow.id);
                  addToast('Removed', 'success');
                  refetch();
                } catch (error) {
                  addToast(error.message, 'error');
                }
                setDeleteModal(false);
              }}
              className="flex-1 rounded-xl bg-danger py-2.5 text-sm font-black text-white transition-colors hover:bg-danger/90"
            >
              Remove
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CopyTrading;

