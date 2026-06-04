import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Search,
  Info,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import ToggleSwitch from '@/components/shared/ToggleSwitch';
import MultiSelect from '@/components/shared/MultiSelect';
import { useToast } from '@/components/shared/Toast';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { useMasterChildren, useMasterSubscriptions } from '@/hooks/useMaster';
import { masterService } from '@/lib/master';
import { engineService } from '@/lib/engine';
import { brokerService } from '@/lib/broker';
import { connectChannel } from '@/lib/websocket';
import { formatCurrency } from '@/lib/utils';
import TradeLatencyCard from '@/components/master/TradeLatencyCard';
import TradeTimeline from '@/components/master/TradeTimeline';

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

const getLatencyClass = (latencyMs) => {
  if (latencyMs == null || latencyMs <= 0) return 'text-muted-foreground';
  if (latencyMs < 200) return 'text-emerald-500';
  if (latencyMs < 500) return 'text-amber-500';
  return 'text-rose-500';
};

const shortId = (value) => {
  if (!value) return '';
  const text = String(value);
  return text.length > 14 ? `${text.slice(0, 8)}...${text.slice(-4)}` : text;
};

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

const isUuidLike = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());

const normalizeChildRow = (child) => {
  const hasStatus = child.status != null && String(child.status).trim() !== '';
  const status = String(child.status || '').toUpperCase();
  const inferredAccountId =
    child.brokerAccountId ||
    child.accountId ||
    child.linkedBrokerAccountId ||
    (isUuidLike(child.userId) ? child.userId : '') ||
    '';
  const brokerAccountId = inferredAccountId;
  const rowId = child.subscriptionId
    ? `sub-${child.subscriptionId}`
    : `${child.id || child.childId}-${brokerAccountId || 'no-account'}`;

  return {
    id: rowId,
    childId: child.childId || child.id,
    subscriptionId: child.subscriptionId || null,
    accountId: brokerAccountId,
    brokerAccountId,
    userId: child.clientId || child.userId || child.childId,
    nickname: child.nickname || child.name || child.childName || 'Unknown',
    broker: child.broker || child.brokerName || 'Broker',
    multiplier: Number(child.multiplier ?? child.scalingFactor ?? 1),
    status,
    tradingEnabled: hasStatus ? status === 'ACTIVE' : Boolean(child.enabled || child.tradingEnabled),
    pnlToday: Number(child.pnlToday ?? child.pnl ?? 0),
    tradesCopied: Number(child.tradesCopied || child.tradeCount || 0),
    margin: Number(child.margin ?? child.marginAvailable ?? child.availableMargin ?? 0),
    positions: Number(child.pos ?? child.openPositionsCount ?? child.positions ?? child.positionCount ?? 0),
    sessionActive: child.sessionActive != null ? Boolean(child.sessionActive) : true,
    lowMargin: Boolean(child.lowMargin),
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

  // Manual Trigger State
  const [manualTrade, setManualTrade] = useState({
    symbol: '',
    qty: '',
    side: 'BUY',
    product: 'NRML',
    orderType: 'MARKET',
    exchange: 'NSE',
    price: 0,
    triggerPrice: 0,
  });
  const [triggeringManual, setTriggeringManual] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  const [pollingEnabled, setPollingEnabled] = useState(false);
  const [engineStatus, setEngineStatus] = useState(null);
  const [pollingStatus, setPollingStatus] = useState(null);
  const [togglingPolling, setTogglingPolling] = useState(false);
  const [togglingChildren, setTogglingChildren] = useState({});
  const [resettingCache, setResettingCache] = useState(false);
  const [liveTrades, setLiveTrades] = useState([]);
  const [copyResultModal, setCopyResultModal] = useState(false);
  const [copyResult, setCopyResult] = useState(null);
  const [copyResultHistory, setCopyResultHistory] = useState([]);
  const [liveChildMetrics, setLiveChildMetrics] = useState({});
  const [pollingIntervalMs, setPollingIntervalMs] = useState(3000);
  const [usingCopyTradingEndpoint, setUsingCopyTradingEndpoint] = useState(false);

  const loadCopyTradingData = useCallback(async () => {
    try {
      const data = await masterService.getCopyTradingData();
      const copyChildren = Array.isArray(data?.children) ? data.children : [];
      setChildren(copyChildren);
      setUsingCopyTradingEndpoint(true);

      const activeId = data?.activeAccount?.brokerAccountId || data?.activeAccount?.accountId || '';
      if (activeId) {
        const acc = accounts.find((item) => item.accountId === activeId);
        setMasterAccountId(activeId);
        setMasterConnected(true);
        if (acc) setMasterInfo(acc);
      }

      if (data?.pollingIntervalMs) {
        setPollingIntervalMs(Math.max(Number(data.pollingIntervalMs) || 3000, 500));
      } else {
        engineService.getConfig()
          .then((cfg) => {
            if (cfg?.pollingIntervalMs) {
              setPollingIntervalMs(Math.max(Number(cfg.pollingIntervalMs) || 3000, 500));
            }
          })
          .catch(() => {});
      }

      const nextMetrics = {};
      copyChildren.forEach((child) => {
        const accountId = String(child.brokerAccountId || child.accountId || '');
        if (!accountId) return;
        nextMetrics[accountId] = {
          margin: Number(child.margin ?? child.marginAvailable ?? 0),
          pnl: Number(child.pnlToday ?? child.pnl ?? 0),
          positions: Number(child.pos ?? child.openPositionsCount ?? child.positions ?? 0),
          sessionActive: child.sessionActive != null ? Boolean(child.sessionActive) : true,
          lowMargin: Boolean(child.lowMargin),
        };
      });
      setLiveChildMetrics(nextMetrics);
      return true;
    } catch {
      setUsingCopyTradingEndpoint(false);
      return false;
    }
  }, [accounts, setChildren]);

  // ── Load historical latency data ──────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    const loadLatencyHistory = async () => {
      try {
        const logs = await masterService.getCopyLogs();
        if (!isMounted || !Array.isArray(logs)) return;

        // Group flat logs into executions (prefer backend copyGroupId, then older fallbacks).
        const executionsMap = new Map();

        logs.forEach((log) => {
          const key = log.copyGroupId || log.masterTradeId || log.createdAt || log.time;
          if (!key) return;

          if (!executionsMap.has(key)) {
            // Extract master order time from raw data if it's an external trade
            const rawMaster = log.rawMaster || log.raw || {};
            const masterOrderTime = 
              rawMaster.order_timestamp || // Zerodha
              rawMaster.orderTime ||       // Dhan
              rawMaster.timestamp ||       // Generic
              rawMaster.time || 
              log.masterOrderTime || 
              null;

            executionsMap.set(key, {
              copyGroupId: log.copyGroupId,
              symbol: log.symbol,
              side: log.side || (log.masterStatus?.includes('BUY') ? 'BUY' : 'SELL'),
              exchange: log.exchange,
              segment: log.segment,
              product: log.product,
              orderType: log.orderType,
              masterQty: log.qty,
              masterTriggeredAt: log.masterTriggeredAt || log.createdAt,
              masterOrderTime,
              completedAt: log.completedAt || log.createdAt,
              totalExecutionMs: log.totalExecutionMs,
              childrenTotal: 0,
              success: 0,
              failed: 0,
              skipped: 0,
              results: [],
            });
          }

          const exec = executionsMap.get(key);
          const normalizedStatus = String(log.childStatus || '').toUpperCase();
          const status = ['EXECUTED', 'SUCCESS', 'COMPLETE', 'COMPLETED'].includes(normalizedStatus)
            ? 'SUCCESS'
            : normalizedStatus === 'SKIPPED'
              ? 'SKIPPED'
              : 'FAILED';
          
          exec.results.push({
              childId: log.childId,
              copyGroupId: log.copyGroupId,
              status,
              message: log.errorMessage || log.childStatus,
              broker: log.broker || log.brokerName,
              scaledQty: log.qty,
              latencyMs: log.latencyMs,
              engineReceivedAt: log.engineReceivedAt,
              childPlacedAt: log.childPlacedAt,
              placedAt: log.childPlacedAt || log.createdAt || log.placedAt,
              skipReason: log.skipReason,
              orderKey: log.orderKey,
            });

            exec.childrenTotal += 1;
            if (status === 'SUCCESS') exec.success += 1;
            else if (status === 'SKIPPED') exec.skipped += 1;
            else exec.failed += 1;

            // Update top-level if missing
            if (log.exchange && !exec.exchange) exec.exchange = log.exchange;
            if (log.segment && !exec.segment) exec.segment = log.segment;
            if (log.product && !exec.product) exec.product = log.product;
            if (log.orderType && !exec.orderType) exec.orderType = log.orderType;
            if (log.totalExecutionMs && !exec.totalExecutionMs) exec.totalExecutionMs = log.totalExecutionMs;
            if (log.completedAt && !exec.completedAt) exec.completedAt = log.completedAt;
        });

        const history = Array.from(executionsMap.values())
          .sort((a, b) => new Date(b.masterTriggeredAt) - new Date(a.masterTriggeredAt))
          .slice(0, 10);

        setCopyResultHistory(history);
      } catch (err) {
        console.warn('Failed to load latency history', err);
      }
    };

    loadLatencyHistory();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    loadCopyTradingData().then((ok) => {
      if (!isMounted) return;
      if (!ok) {
        refetch();
        refetchSubscriptions();
      }
    });
    return () => {
      isMounted = false;
    };
  }, [loadCopyTradingData, refetch, refetchSubscriptions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadCopyTradingData().then((ok) => {
        if (!ok) {
          refetch();
          refetchSubscriptions();
        }
      });
    }, pollingIntervalMs);
    return () => window.clearInterval(intervalId);
  }, [pollingIntervalMs, loadCopyTradingData, refetch, refetchSubscriptions]);

  useEffect(() => {
    const onFocus = () => {
      loadCopyTradingData().then((ok) => {
        if (!ok) {
          refetch();
          refetchSubscriptions();
        }
      });
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadCopyTradingData, refetch, refetchSubscriptions]);

  useEffect(() => {
    let isMounted = true;

    masterService.getActiveAccount().then((res) => {
      if (!isMounted) return;
      const activeId = res?.brokerAccountId || res?.accountId || '';
      
      if (activeId) {
        const acc = accounts.find((item) => item.accountId === activeId);
        if (acc) {
          setMasterAccountId(activeId);
          setMasterInfo(acc);
          setMasterConnected(true);
          window.localStorage.setItem(ACTIVE_MASTER_STORAGE_KEY, activeId);
        }
      } else {
        // No active account on server, check local storage for preference but don't mark as connected
        const localId = window.localStorage.getItem(ACTIVE_MASTER_STORAGE_KEY) || '';
        if (localId) {
          const acc = accounts.find((item) => item.accountId === localId);
          if (acc) setMasterAccountId(localId);
        }
        setMasterConnected(false);
        setMasterInfo(null);
      }
    }).catch(() => {
      if (isMounted) {
        setMasterConnected(false);
      }
    });

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
          
          // Show the result modal with timing and latency data
          if (data?.results || data?.childrenTotal != null || data?.success != null || data?.failed != null) {
            // Enrich data with masterOrderTime if external
            const rawMaster = data?.rawMaster || data?.raw || {};
            const enrichedData = {
              ...data,
              masterOrderTime: data.masterOrderTime || rawMaster.order_timestamp || rawMaster.orderTime || rawMaster.timestamp || rawMaster.time || null
            };
            setCopyResult(enrichedData);
            setCopyResultHistory((prev) => {
              const newHistory = [...prev, enrichedData];
              return newHistory.slice(-10);
            });
            setCopyResultModal(true);
          }
          
          // Refresh all data on copy trading page
          refetch();
          refetchSubscriptions();
        }
        
        if (event === 'TRADE_COPY_FAILED' || event === 'copy_trade_failed') {
          addToast(`Copy failed for ${data?.childName || 'follower'}: ${data?.reason || 'unknown error'}`, 'error');
          refetch();
        }

        if (event === 'TRADE_DETECTED' || event === 'trade_detected') {
          const trade = {
            id: `${Date.now()}-${Math.random()}`,
            symbol: data?.symbol || data?.instrument || 'Unknown',
            side: String(data?.side || data?.action || 'BUY').toUpperCase(),
            qty: data?.qty || data?.quantity || '',
            product: data?.product || '',
            time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            raw: data,
          };
          setLiveTrades((prev) => [trade, ...prev].slice(0, 20));
          
          // Auto-refresh stats when a new trade is detected from master
          refetch();
        }
      },
      null,
      (error) => console.error('WS master trades error', error),
    );

    return () => sub.close();
  }, [addToast, refetch, refetchSubscriptions]);

  const connectedRows = useMemo(() => children.map(normalizeChildRow), [children]);
  const subscribedRows = useMemo(() => subscriptions.map(normalizeChildRow), [subscriptions]);
  const mergedRows = useMemo(() => {
    const map = new Map();
    const getMergeKey = (row) =>
      `${row.childId || row.id}-${row.brokerAccountId || row.accountId || 'no-account'}`;

    [...subscribedRows, ...connectedRows].forEach((row) => {
      const key = getMergeKey(row);
      map.set(String(key), { ...map.get(String(key)), ...row });
    });
    return Array.from(map.values());
  }, [connectedRows, subscribedRows]);
  const accountMap = useMemo(() => {
    const map = new Map();
    accounts.forEach((acc) => {
      const id = acc.accountId || acc.id;
      if (id) map.set(String(id), acc);
    });
    return map;
  }, [accounts]);
  const accountByClientMap = useMemo(() => {
    const map = new Map();
    accounts.forEach((acc) => {
      const client = acc.clientId || acc.userId || '';
      if (client) map.set(String(client), acc);
    });
    return map;
  }, [accounts]);
  const accountByNicknameMap = useMemo(() => {
    const map = new Map();
    accounts.forEach((acc) => {
      const nickname = acc.nickname || '';
      if (nickname) map.set(String(nickname).trim().toLowerCase(), acc);
    });
    return map;
  }, [accounts]);
  const resolvedRows = useMemo(
    () =>
      mergedRows.map((row) => {
        const acc =
          (row.brokerAccountId ? accountMap.get(String(row.brokerAccountId)) : null) ||
          (row.userId ? accountByClientMap.get(String(row.userId)) : null) ||
          (row.nickname ? accountByNicknameMap.get(String(row.nickname).trim().toLowerCase()) : null);
        return {
          ...row,
          broker: row.broker !== 'Broker' ? row.broker : (acc?.broker || acc?.brokerName || row.broker),
          userId: row.userId || acc?.clientId || acc?.userId || row.brokerAccountId || row.childId,
          brokerAccountId: row.brokerAccountId || acc?.accountId || acc?.id || '',
          accountId: row.accountId || acc?.accountId || acc?.id || '',
        };
      }),
    [mergedRows, accountMap, accountByClientMap, accountByNicknameMap],
  );

  const linkedRows = useMemo(
    () => resolvedRows.filter((row) => ['ACTIVE', 'PAUSED', 'PENDING_APPROVAL', 'APPROVED'].includes(row.status)),
    [resolvedRows],
  );

  useEffect(() => {
    if (usingCopyTradingEndpoint) return () => {};
    let cancelled = false;
    const targets = linkedRows
      .map((row) => row.brokerAccountId || row.accountId)
      .filter(Boolean)
      .map(String);
    const uniqueTargets = Array.from(new Set(targets));
    if (!uniqueTargets.length) return () => {};

    Promise.allSettled(
      uniqueTargets.map(async (accountId) => {
        // Fallback to getAccount if dashboard fails
        try {
          const data = await brokerService.getDashboard(accountId);
          return {
            accountId,
            margin: Number(data?.margin?.availableMargin ?? data?.account?.margin ?? 0),
            pnl: Number(data?.account?.pnl ?? data?.margin?.pnl ?? 0),
            positions: Array.isArray(data?.positions) ? data.positions.length : 0,
          };
        } catch {
          const acc = await brokerService.getAccount(accountId);
          return {
            accountId,
            margin: Number(acc.margin || 0),
            pnl: Number(acc.pnl || 0),
            positions: Number(acc.positions || 0),
          };
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const next = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value?.accountId) {
          next[result.value.accountId] = {
            margin: result.value.margin,
            pnl: result.value.pnl,
            positions: result.value.positions,
          };
        }
      });
      if (Object.keys(next).length) {
        setLiveChildMetrics((prev) => ({ ...prev, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [linkedRows, usingCopyTradingEndpoint]);

  const availableChildRows = useMemo(() => {
    const map = new Map();

    resolvedRows.forEach((child) => {
      const key = String(child.id || child.accountId || child.userId);
      if (!key) return;
      map.set(key, { ...map.get(key), ...child });
    });

    return Array.from(map.values());
  }, [resolvedRows]);

  useEffect(() => {
    let isMounted = true;

    connectedRows.forEach((child) => {
      masterService.getChildScaling(child.childId).then((data) => {
        if (isMounted) {
          setScalingMap((prev) => ({ ...prev, [child.childId]: data }));
        }
      }).catch(() => {});
    });

    return () => {
      isMounted = false;
    };
  }, [connectedRows]);

  const childOptions = availableChildRows.filter(
    (child) =>
      String(child.childId) !== String(masterAccountId) &&
      !linkedRows.some((row) => String(row.childId) === String(child.childId)),
  );

  const handleManualCopyTrade = async () => {
    if (!manualTrade.symbol || !manualTrade.qty) {
      addToast('Please fill in symbol and quantity', 'error');
      return;
    }

    if (['SL', 'SL-M'].includes(manualTrade.orderType) && !Number(manualTrade.triggerPrice || 0)) {
      addToast('Please enter a trigger price for SL orders', 'error');
      return;
    }

    setTriggeringManual(true);
    try {
      const res = await engineService.manualCopyTrade({
        ...manualTrade,
        qty: Number(manualTrade.qty),
        price: Number(manualTrade.price || 0),
        triggerPrice: ['SL', 'SL-M'].includes(manualTrade.orderType) ? Number(manualTrade.triggerPrice || 0) : 0,
      });

      if (res?.duplicate) {
        addToast('Trade already processed', 'info');
        setCopyResult(res);
        setCopyResultModal(true);
        return;
      }
      
      setCopyResult(res);
      setCopyResultModal(true);
      setCopyResultHistory((prev) => [res, ...prev].slice(0, 10));
      addToast('Manual copy trade triggered', 'success');
      
      // Reset form but keep some defaults
      setManualTrade(prev => ({ ...prev, symbol: '', qty: '', price: 0, triggerPrice: 0 }));
      setShowManualForm(false);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setTriggeringManual(false);
    }
  };

  const handleConnectMaster = async () => {
    if (!masterAccountId && !masterConnected) {
      addToast('Please select a master account', 'error');
      return;
    }

    if (masterConnected) {
      try {
        await masterService.clearActiveAccount();
        window.localStorage.removeItem(ACTIVE_MASTER_STORAGE_KEY);
        setMasterConnected(false);
        setMasterInfo(null);
        setMasterAccountId('');
        addToast('Master disconnected', 'warning');
      } catch (error) {
        // Even if API fails, clear local state for better UX
        window.localStorage.removeItem(ACTIVE_MASTER_STORAGE_KEY);
        setMasterConnected(false);
        setMasterInfo(null);
        setMasterAccountId('');
        addToast('Master disconnected locally', 'warning');
      }
      return;
    }

    const acc = accounts.find((item) => item.accountId === masterAccountId);
    if (!acc) {
      addToast('Selected account not found', 'error');
      return;
    }

    try {
      await masterService.setActiveAccount(masterAccountId);
      setMasterInfo(acc);
      setMasterConnected(true);
      window.localStorage.setItem(ACTIVE_MASTER_STORAGE_KEY, masterAccountId);
      addToast('Master connected successfully', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to connect master', 'error');
    }
  };

  const handleSetActiveAccount = async (accountId) => {
    if (!accountId) return;
    setSettingActive(true);
    try {
      await masterService.setActiveAccount(accountId);
      const acc = accounts.find((item) => item.accountId === accountId);
      setMasterAccountId(accountId);
      setMasterInfo(acc);
      window.localStorage.setItem(ACTIVE_MASTER_STORAGE_KEY, accountId);
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
    const targetChildId = selectedChildRow?.childId || selectedChild;
    const scalingFactor = Number(childMultiplier) || 1;

    try {
      await masterService.linkChild(targetChildId, scalingFactor);
      if (selectedChildRow) {
        setChildren((prev) => {
          const exists = prev.some((item) => String(item.id || item.childId) === String(targetChildId));
          if (exists) {
            return prev.map((item) =>
              String(item.id || item.childId) === String(targetChildId)
                ? { ...item, multiplier: scalingFactor, status: 'ACTIVE', enabled: true, isLinked: true, isSubscribedOnly: false }
                : item,
            );
          }

          return [
            ...prev,
            {
              ...selectedChildRow,
              childId: targetChildId,
              id: targetChildId,
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
        selectedBulkChildren.map((rowId) => ({
          childId: childOptions.find((child) => String(child.id) === String(rowId))?.childId || rowId,
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

    if (!window.confirm(`Disconnect all ${linkedRows.length} linked children?`)) return;

    try {
      await Promise.allSettled(linkedRows.map((child) => masterService.unlinkChild(child.childId)));
      setChildren(prev => prev.filter(item => {
        const id = item.id || item.childId;
        return !linkedRows.some(lr => lr.childId === id);
      }));
      addToast('All linked children disconnected', 'success');
      await Promise.all([refetch(), refetchSubscriptions()]);
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleToggleTrading = async (id) => {
    if (togglingChildren[id]) return;

    const child =
      connectedRows.find((item) => item.id === id) ||
      linkedRows.find((item) => item.id === id) ||
      connectedRows.find((item) => String(item.childId) === String(id)) ||
      linkedRows.find((item) => String(item.childId) === String(id));
    if (!child) return;
    const targetChildId = child.childId;

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
        (item.id || item.childId) === targetChildId ? { ...item, status: next ? 'ACTIVE' : 'PAUSED', enabled: next } : item,
      ),
    );

    try {
      if (next) {
        await masterService.resumeChild(child.childId);
      } else {
        await masterService.pauseChild(child.childId);
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
      const child = connectedRows.find((item) => item.id === id);
      if (!child) return;
      const data = await masterService.getChildScaling(child.childId);
      setScalingMap((prev) => ({ ...prev, [child.childId]: data }));
      addToast('Refreshed', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setRefreshing((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleMultiplierChange = async (id, value) => {
    const child = connectedRows.find((item) => item.id === id);
    if (!child) return;
    const targetChildId = child.childId;
    setChildren((prev) =>
      prev.map((item) => ((item.id || item.childId) === targetChildId ? { ...item, multiplier: value } : item)),
    );
    try {
      await masterService.updateChildScaling(child.childId, { ...(scalingMap[child.childId] || {}), scalingFactor: value });
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

  const handleVerifyEngine = async () => {
    setResettingCache(true);
    try {
      await engineService.resetPollingCache();
      const status = await engineService.getStatus();
      setEngineStatus(status);
      addToast('Trade engine re-verified for F&O and Equity', 'success');
    } catch (e) {
      addToast('Engine verification failed', 'error');
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
  const pollingInterval = Math.max(0.5, Number(pollingIntervalMs || 3000) / 1000);
  const modeList = (Array.isArray(engineStatus?.modes) ? engineStatus.modes : [engineStatus?.modes]).filter(Boolean);
  const lastResetLabel = pollingStatus?.lastResetAt
    ? new Date(pollingStatus.lastResetAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not reset yet';

  const tradeBlockers = useMemo(() => {
    const issues = [];
    if (masterConnected && !pollingEnabled) {
      issues.push({ severity: 'warning', msg: 'Auto-polling is OFF. Enable it so the engine detects master trades.' });
    }
    if (linkedRows.length === 0) {
      issues.push({ severity: 'warning', msg: 'No child accounts linked. Link at least one child to start copying.' });
    }
    linkedRows.forEach((child) => {
      const live = liveChildMetrics[String(child.brokerAccountId || child.accountId)] || {};
      const marginValue = Number.isFinite(Number(live.margin)) ? Number(live.margin) : Number(child.margin || 0);
      if (child.status === 'PAUSED') {
        issues.push({ severity: 'info', msg: `Child "${child.nickname || child.userId}" is PAUSED and will not receive copied trades.` });
      }
      if (marginValue < 5000) {
        issues.push({ severity: 'error', msg: `Child "${child.nickname || child.userId}" has low margin (${formatCurrency(marginValue)}). Orders may be rejected.` });
      }
    });
    return issues;
  }, [masterConnected, pollingEnabled, linkedRows, liveChildMetrics]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl uppercase">Copy Trading</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage master-child connections and real-time trade replication engine.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleVerifyEngine}
            disabled={resettingCache}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-purple/30 bg-brand-purple/5 text-brand-purple hover:bg-brand-purple/10 transition-all text-xs font-bold"
          >
            <Zap className={`w-3.5 h-3.5 ${resettingCache ? 'animate-spin' : ''}`} />
            Verify Engine
          </button>
          <button
            onClick={handleResetPollingCache}
            disabled={resettingCache}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold transition-all hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-60"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${resettingCache ? 'animate-spin' : ''}`} />
            Reset Cache
          </button>
        </div>
      </div>

      {/* Main Status Grid */}
      <div className="space-y-6">
        {/* Engine Control Panel (Always at top) */}
        <div className="space-y-6">
          <GlassCard className="relative overflow-hidden border-brand-purple/10">
            <div className="absolute top-0 right-0 p-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${engineActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${engineActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {engineStatus?.engineStatus || engineStatus?.status || 'UNKNOWN'}
              </div>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-lg font-bold">Trade Engine</h3>
                  <p className="text-xs text-muted-foreground">Replicating trades from master to all active followers</p>
                </div>

                <div className="flex flex-wrap gap-8">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Auto-Poll Status</p>
                    <div className="flex items-center gap-3">
                      <ToggleSwitch checked={pollingEnabled} disabled={togglingPolling} onChange={handleTogglePolling} />
                      <span className={`text-sm font-bold ${pollingEnabled ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {pollingEnabled ? `Active (${pollingInterval}s)` : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Modes</p>
                    <div className="flex gap-1.5">
                      {modeList.map((mode) => (
                        <span key={mode} className={`rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-tight ${getModeBadgeClass(mode)}`}>
                          {mode}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-px h-16 bg-border/50 hidden md:block" />

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Broker Detection</p>
                <div className="flex flex-wrap gap-2">
                  {brokerList.slice(0, 4).map((broker) => {
                    const method = detectionMethods[broker] || 'polling';
                    return (
                      <div key={broker} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/5 dark:bg-white/5 border border-border/40">
                        <span className="text-[10px] font-bold uppercase">{broker}</span>
                        <span className={`h-1 w-1 rounded-full ${method ? 'bg-emerald-500' : 'bg-muted'}`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

      </div>

      {/* Latency card — visible once master is connected */}
      {masterConnected && (
        <TradeLatencyCard copyResults={copyResultHistory} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard title="Master Setup" subtitle="Select the primary account to poll trades from">
          {!masterConnected ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                  <DivSelect
                    value={masterAccountId}
                    onChange={setMasterAccountId}
                    placeholder="Select Master Trading Account"
                    options={accounts.map((account) => ({
                      value: account.accountId,
                      label: `${account.broker} - ${account.userId || account.accountId.slice(0, 8)}${account.nickname ? ` (${account.nickname})` : ''}`,
                    }))}
                    triggerClassName="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm font-bold focus:border-brand-purple dark:bg-white/5"
                  />
                </div>
                <button
                  onClick={handleConnectMaster}
                  className="rounded-xl bg-emerald-500 px-8 py-3 font-black text-sm text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all uppercase tracking-widest"
                >
                  Connect Master
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground bg-black/5 dark:bg-white/5 p-3 rounded-lg border border-border/30">
                Tip: The engine will monitor this account for new order executions and replicate them to all linked children based on their multipliers.
              </p>
            </div>
          ) : (
            <div className="relative flex flex-col gap-5 rounded-2xl border p-5 sm:p-6"
              style={{ background: 'linear-gradient(135deg, rgba(0,200,150,0.1) 0%, rgba(0,200,150,0.04) 100%)', borderColor: 'rgba(0,200,150,0.25)' }}>
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 mt-0.5">
                  <Wifi className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">Master Account Active</p>
                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <p className="mt-1 text-2xl font-black tracking-tight text-foreground uppercase leading-tight break-words">
                    {accounts.find((item) => item.accountId === masterAccountId)?.broker || 'Unknown'}
                    <span className="mx-1 text-emerald-500/70">•</span>
                    <span className="text-emerald-500">
                      {accounts.find((item) => item.accountId === masterAccountId)?.nickname || accounts.find((item) => item.accountId === masterAccountId)?.userId || 'MASTER'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center">
                  <ToggleSwitch checked={pollingEnabled} disabled={togglingPolling} onChange={handleTogglePolling} label="Trading" showStateText />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
                {accounts.length > 1 && (
                  <DivSelect
                    value={masterAccountId}
                    onChange={handleSetActiveAccount}
                    disabled={settingActive}
                    includeEmptyOption={false}
                    options={accounts.map((account) => ({
                      value: account.accountId,
                      label: `${account.broker} - ${account.userId || account.accountId.slice(0, 8)}`,
                    }))}
                    triggerClassName="w-full sm:w-auto rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-xs font-bold text-emerald-500 focus:ring-0"
                  />
                )}
                <button
                  onClick={handleConnectMaster}
                  className="w-full sm:w-auto rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-black text-white transition-all hover:bg-rose-600 shadow-lg shadow-rose-500/20 uppercase tracking-widest"
                >
                  Disconnect
                </button>
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard title="Connect Followers" subtitle="Link child accounts to your master feed">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Follower Accounts</label>
                <MultiSelect
                  value={selectedBulkChildren}
                  onChange={setSelectedBulkChildren}
                  placeholder="Select children to link..."
                  options={childOptions.map((child) => ({
                    value: child.id,
                    label: `${child.broker} - ${child.nickname || child.userId}`,
                  }))}
                />
              </div>
              <div className="w-full sm:w-32 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Multiplier</label>
                <div className="relative">
                  <input
                    type="number"
                    value={childMultiplier}
                    onChange={(event) => setChildMultiplier(event.target.value)}
                    placeholder="1.0"
                    min="0.1"
                    step="0.1"
                    className="w-full rounded-xl border border-border bg-black/5 pl-4 pr-8 py-3 text-sm font-black focus:outline-none focus:border-brand-purple dark:bg-white/5"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">x</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-border/30">
              <button
                onClick={handleBulkLink}
                disabled={selectedBulkChildren.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 py-3 text-sm font-black text-white transition-all hover:bg-brand-purple/90 disabled:opacity-50 disabled:grayscale shadow-lg shadow-brand-purple/20"
              >
                <Link className="h-4 w-4" />
                Connect {selectedBulkChildren.length > 0 ? `(${selectedBulkChildren.length})` : 'Selected'}
              </button>
              <button
                onClick={handleBulkUnlink}
                className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-6 py-3 text-sm font-black text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
              >
                Disconnect All
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {tradeBlockers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tradeBlockers.map((issue, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-xs font-medium ${
                issue.severity === 'error'
                  ? 'border-rose-500/20 bg-rose-500/5 text-rose-500'
                  : issue.severity === 'warning'
                  ? 'border-amber-500/20 bg-amber-500/5 text-amber-500'
                  : 'border-brand-blue/20 bg-brand-blue/5 text-brand-blue'
              }`}
            >
              <AlertCircle className="shrink-0 h-4 w-4" />
              <span>{issue.msg}</span>
            </motion.div>
          ))}
        </div>
      )}

      {masterConnected && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/3 border border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Replication Active</p>
                {engineStatus?.detectionMethod && (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {Object.entries(engineStatus.detectionMethod).map(([broker, method]) => (
                      <span key={broker} className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${getDetectionBadgeClass(method)}`}>
                        {broker}: {method}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                  showManualForm 
                    ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/20' 
                    : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${showManualForm ? 'fill-current' : ''}`} />
                Manual Trigger
              </button>
              <div className="h-6 w-px bg-border/40" />
              <ToggleSwitch checked={pollingEnabled} disabled={togglingPolling} onChange={handleTogglePolling} label="Auto-poll Engine" showStateText />
              <button
                onClick={handleResetPollingCache}
                disabled={resettingCache}
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-brand-purple transition-colors"
              >
                Reset Cache
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showManualForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <GlassCard className="border-brand-purple/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Symbol</label>
                      <input
                        type="text"
                        value={manualTrade.symbol}
                        onChange={(e) => setManualTrade({ ...manualTrade, symbol: e.target.value.toUpperCase() })}
                        placeholder="e.g. NIFTY2651225000CE"
                        className="w-full rounded-xl border border-border bg-black/5 px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-brand-purple dark:bg-white/5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Quantity</label>
                      <input
                        type="number"
                        value={manualTrade.qty}
                        onChange={(e) => setManualTrade({ ...manualTrade, qty: e.target.value })}
                        placeholder="Lot size"
                        className="w-full rounded-xl border border-border bg-black/5 px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-brand-purple dark:bg-white/5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Side</label>
                      <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40">
                        {['BUY', 'SELL'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setManualTrade({ ...manualTrade, side: s })}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              manualTrade.side === s 
                                ? s === 'BUY' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Exchange</label>
                      <div className="flex p-1 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40">
                        {['NSE', 'BSE'].map((e) => (
                          <button
                            key={e}
                            onClick={() => setManualTrade({ ...manualTrade, exchange: e })}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                              manualTrade.exchange === e ? 'bg-brand-blue text-white' : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Product</label>
                      <DivSelect
                        value={manualTrade.product}
                        onChange={(v) => setManualTrade({ ...manualTrade, product: v })}
                        options={[
                          { value: 'CNC', label: 'CNC (Delivery)' },
                          { value: 'MIS', label: 'MIS (Intraday)' },
                          { value: 'NRML', label: 'NRML (F&O)' },
                        ]}
                        triggerClassName="w-full rounded-xl border border-border bg-black/5 px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-brand-purple dark:bg-white/5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Order Type</label>
                      <DivSelect
                        value={manualTrade.orderType}
                        onChange={(v) => setManualTrade({ ...manualTrade, orderType: v })}
                        options={[
                          { value: 'MARKET', label: 'MARKET' },
                          { value: 'LIMIT', label: 'LIMIT' },
                          { value: 'SL', label: 'SL' },
                          { value: 'SL-M', label: 'SL-M' },
                        ]}
                        triggerClassName="w-full rounded-xl border border-border bg-black/5 px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-brand-purple dark:bg-white/5"
                      />
                    </div>
                    {['LIMIT', 'SL'].includes(manualTrade.orderType) && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Price</label>
                        <input
                          type="number"
                          step="0.05"
                          value={manualTrade.price}
                          onChange={(e) => setManualTrade({ ...manualTrade, price: e.target.value })}
                          className="w-full rounded-xl border border-border bg-black/5 px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-brand-purple dark:bg-white/5"
                        />
                      </div>
                    )}
                    {['SL', 'SL-M'].includes(manualTrade.orderType) && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Trigger Price</label>
                        <input
                          type="number"
                          step="0.05"
                          value={manualTrade.triggerPrice}
                          onChange={(e) => setManualTrade({ ...manualTrade, triggerPrice: e.target.value })}
                          className="w-full rounded-xl border border-border bg-black/5 px-4 py-2.5 text-sm font-bold focus:outline-none focus:border-brand-purple dark:bg-white/5"
                        />
                      </div>
                    )}
                    <div className="flex items-end lg:col-start-4">
                      <button
                        onClick={handleManualCopyTrade}
                        disabled={triggeringManual || !manualTrade.symbol || !manualTrade.qty}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-purple px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-brand-purple/90 disabled:opacity-50 disabled:grayscale shadow-lg shadow-brand-purple/20"
                      >
                        {triggeringManual ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                        Trigger Copy
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <GlassCard noPadding>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 p-6">
          <div>
            <h3 className="text-lg font-black tracking-tight uppercase">Follower Management</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{linkedRows.length} active child subscriptions</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter followers..."
              className="w-full sm:w-64 rounded-xl border border-border bg-black/5 pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:border-brand-purple dark:bg-white/5"
            />
          </div>
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
                  {['#', 'Follower / Account', 'Margin', 'P&L Today', 'Pos', 'Multiplier', 'Status', 'Actions'].map((header) => (
                    <th key={header} className="whitespace-nowrap px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((child, index) => {
                  const live = liveChildMetrics[String(child.brokerAccountId || child.accountId)] || {};
                  const effectiveMargin = Number.isFinite(Number(live.margin)) ? Number(live.margin) : Number(child.margin || 0);
                  const effectivePnl = Number.isFinite(Number(live.pnl)) ? Number(live.pnl) : Number(child.pnlToday || 0);
                  const effectivePositions = Number.isFinite(Number(live.positions)) ? Number(live.positions) : Number(child.positions || 0);
                  const effectiveSessionActive = live.sessionActive != null ? Boolean(live.sessionActive) : Boolean(child.sessionActive ?? true);
                  const effectiveLowMargin = live.lowMargin != null ? Boolean(live.lowMargin) : Boolean(child.lowMargin);
                  const isActive = child.status === 'ACTIVE';
                  const isPaused = child.status === 'PAUSED';
                  const lowMargin = effectiveLowMargin || effectiveMargin < 5000;

                  return (
                    <motion.tr
                      key={child.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group border-b border-border/20 transition-all hover:bg-black/5 dark:hover:bg-white/2"
                    >
                      <td className="px-6 py-4 text-xs font-bold text-muted-foreground">{index + 1}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : isPaused ? 'bg-amber-500' : 'bg-slate-400'}`} />
                          <div>
                            <p className="text-sm font-black uppercase tracking-tight">{child.nickname || child.userId || 'Child'}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">
                              {child.broker} <span className="mx-1">•</span> {child.userId}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="min-w-[120px]">
                          {effectiveMargin === 0 && !effectiveSessionActive ? (
                            <p className="text-xs text-amber-500 font-bold">Session expired</p>
                          ) : (
                            <p className={`text-sm font-black ${lowMargin ? 'text-rose-500' : 'text-foreground'}`}>
                              {formatCurrency(effectiveMargin)}
                            </p>
                          )}
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10 dark:bg-white/10 w-24">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${lowMargin ? 'bg-rose-500' : effectiveMargin < 12000 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, (effectiveMargin / 50000) * 100)}%` }}
                            />
                          </div>
                          {!effectiveSessionActive && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold mt-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Session expired</span>
                              <button
                                onClick={() => navigate(`/master/demat/${child.brokerAccountId || child.accountId}`)}
                                className="underline hover:no-underline text-amber-600"
                              >
                                Re-login -
                              </button>
                            </div>
                          )}
                          {effectiveLowMargin && (
                            <span className="text-xs text-rose-500 font-bold">Low margin</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-black ${effectivePnl >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {effectivePnl >= 0 ? '+' : ''}{formatCurrency(effectivePnl)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-black">{effectivePositions || 0}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleMultiplierChange(child.id, Math.max(0.25, child.multiplier - 0.25))}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-black/5 dark:bg-white/5 hover:bg-brand-purple hover:text-white transition-all text-[10px] font-black"
                          >
                            -
                          </button>
                          <span className="w-12 text-center text-sm font-black text-brand-purple">
                            {child.multiplier}x
                          </span>
                          <button
                            onClick={() => handleMultiplierChange(child.id, child.multiplier + 0.25)}
                            className="w-6 h-6 flex items-center justify-center rounded-md bg-black/5 dark:bg-white/5 hover:bg-brand-purple hover:text-white transition-all text-[10px] font-black"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ToggleSwitch
                            checked={child.tradingEnabled}
                            disabled={Boolean(togglingChildren[child.childId]) || !['ACTIVE', 'PAUSED'].includes(child.status)}
                            onChange={() => handleToggleTrading(child.childId)}
                          />
                          <StatusLabel status={child.status} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRefresh(child.id)}
                            title="Refresh Stats"
                            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-brand-purple hover:bg-brand-purple/10 transition-all"
                          >
                            <RefreshCw className={`w-4 h-4 ${refreshing[child.id] ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => navigate(`/master/demat/${child.brokerAccountId || child.accountId}`)}
                            title="View Details"
                            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-brand-blue hover:bg-brand-blue/10 transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRow(child);
                              setDeleteModal(true);
                            }}
                            title="Remove Follower"
                            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5">
                        <Users className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No active followers found</p>
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
          <div className="rounded-xl border border-rose-500/15 bg-rose-500/6 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Remove <span className="font-black text-foreground uppercase">{selectedRow?.nickname}</span> from your copy trading feed. This child account will no longer replicate your trades.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteModal(false)}
              className="flex-1 rounded-xl bg-black/5 py-3 text-xs font-black uppercase tracking-widest transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  await masterService.unlinkChild(selectedRow.childId);
                  addToast('Removed', 'success');
                  refetch();
                } catch (error) {
                  addToast(error.message, 'error');
                }
                setDeleteModal(false);
              }}
              className="flex-1 rounded-xl bg-rose-500 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-rose-500/90 shadow-lg shadow-rose-500/20"
            >
              Remove
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={copyResultModal}
        onClose={() => setCopyResultModal(false)}
        title="Copy Trade Results"
        size="md"
      >
        {copyResult && (
          <div className="space-y-5">
            {/* Trade info row */}
            {(copyResult.symbol || copyResult.exchange || copyResult.segment) && (
              <div className="flex flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-border/40">
                {copyResult.symbol && (
                  <span className="text-sm font-black uppercase tracking-tight">{copyResult.symbol}</span>
                )}
                {copyResult.side && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${copyResult.side === 'BUY' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'}`}>
                    {copyResult.side}
                  </span>
                )}
                {copyResult.exchange && (
                  <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-border/30 uppercase">{copyResult.exchange}</span>
                )}
                {copyResult.segment && (
                  <span className="text-[10px] font-bold text-brand-blue px-2 py-0.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 uppercase">{copyResult.segment}</span>
                )}
                {copyResult.product && (
                  <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-border/30 uppercase">{copyResult.product}</span>
                )}
                {copyResult.orderType && (
                  <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/5 border border-border/30 uppercase">{copyResult.orderType}</span>
                )}
                {copyResult.copyGroupId && (
                  <span
                    className="ml-auto text-[10px] font-mono font-bold text-brand-purple px-2 py-0.5 rounded-full bg-brand-purple/10 border border-brand-purple/20"
                    title={copyResult.copyGroupId}
                  >
                    Trade ID: {shortId(copyResult.copyGroupId)}
                  </span>
                )}
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-border/40">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Total</p>
                <p className="text-2xl font-black">{copyResult.childrenTotal ?? 0}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1.5">Success</p>
                <p className="text-2xl font-black text-emerald-500">{copyResult.success ?? 0}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1.5">Failed</p>
                <p className="text-2xl font-black text-rose-500">{copyResult.failed ?? 0}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1.5">Skipped</p>
                <p className="text-2xl font-black text-amber-500">{copyResult.skipped ?? 0}</p>
              </div>
            </div>

            {/* Timing summary */}
            {copyResult.totalExecutionMs != null && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brand-purple/5 border border-brand-purple/15">
                <Clock className="w-4 h-4 text-brand-purple shrink-0" />
                <div className="flex flex-1 items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-purple/70">Total Execution</p>
                    <p className="text-lg font-black text-brand-purple">{copyResult.totalExecutionMs}ms</p>
                  </div>
                  {copyResult.masterTriggeredAt && (
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Triggered</p>
                      <p className="text-xs font-bold text-foreground">
                        {new Date(copyResult.masterTriggeredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                      </p>
                    </div>
                  )}
                  {copyResult.completedAt && (
                    <div className="text-right">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Completed</p>
                      <p className="text-xs font-bold text-foreground">
                        {new Date(copyResult.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trade Timeline */}
            <div className="px-1">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Execution Timeline</h4>
              </div>
              <TradeTimeline data={copyResult} />
            </div>

            {/* Per-child results list (now secondary to timeline) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Detailed Results</h4>
              </div>
              {Array.isArray(copyResult.results) && copyResult.results.length > 0 && (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                  {copyResult.results.map((r, i) => {
                    const cfg = getResultCfg(r.status);
                    const Icon = cfg.icon;
                    return (
                      <div key={r.childId || i} className={`flex items-center gap-3 px-3 py-2 rounded-xl border-l-2 bg-black/5 dark:bg-white/5 ${cfg.row}`}>
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${cfg.badge}`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-black uppercase tracking-tight truncate">{r.broker || r.childId || 'Child'}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {r.latencyMs != null && r.latencyMs > 0 && (
                                <span className={`text-[9px] font-black tabular-nums ${getLatencyClass(Number(r.latencyMs))}`}>
                                  {r.latencyMs}ms
                                </span>
                              )}
                              <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                              {(r.skipReason || r.message) && String(r.status).toUpperCase() !== 'SUCCESS' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                                        <Info className="h-3 w-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-[220px] text-[10px] font-bold leading-relaxed">
                                      {r.skipReason === 'NO_POSITION'
                                        ? "SELL skipped because this child did not have a copied BUY position for this instrument."
                                        : r.skipReason || r.message}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                          {(r.copyGroupId || r.orderKey) && (
                            <p className="mt-0.5 text-[9px] font-mono text-muted-foreground truncate">
                              {r.copyGroupId ? `Trade ID ${shortId(r.copyGroupId)}` : `Order ${r.orderKey}`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={() => setCopyResultModal(false)}
              className="w-full py-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-xs font-black uppercase tracking-widest transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CopyTrading;
