import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  TrendingUp,
  Activity,
  BarChart2,
  RefreshCw,
  Wifi,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { masterService } from '@/lib/master';
import { formatCurrency } from '@/lib/utils';

const normalizeSymbol = (value = '') =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/^.*[:|]/, '')
    .replace(/\s+/g, '');

const isOptionSymbol = (value = '') =>
  /(?:\d{2}[A-Z]{3}\d+|[A-Z]+)\d+(?:CE|PE)$/.test(normalizeSymbol(value));

const getSymbol = (item = {}) => item.symbol || item.instrument || item.tradingSymbol || '';
const isOptionRecord = (item = {}) => {
  const symbol = getSymbol(item);
  if (isOptionSymbol(symbol)) return true;
  const exchange = String(item.exchange || item.raw?.exchange || '').toUpperCase();
  const segment = String(item.segment || item.market || item.raw?.segment || '').toUpperCase();
  const instrumentType = String(
    item.instrumentType ||
    item.raw?.instrumentType ||
    item.raw?.instrument_type ||
    item.raw?.instrument ||
    ''
  ).toUpperCase();
  if (exchange.includes('NFO') || exchange.includes('BFO') || exchange.includes('FO')) return true;
  if (segment.includes('OPT') || segment.includes('OPTION')) return true;
  if (instrumentType.includes('OPT') || instrumentType.includes('CE') || instrumentType.includes('PE')) return true;
  return false;
};

const toMs = (value) => {
  const ms = new Date(value || '').getTime();
  return Number.isFinite(ms) ? ms : 0;
};

const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatReason = (value) => {
  if (!value) return '-';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getStatusClass = (status) => {
  const value = String(status || '').toUpperCase();
  if (['SUCCESS', 'EXECUTED', 'COMPLETE', 'TRADED'].includes(value)) {
    return 'bg-emerald-500/10 text-emerald-500';
  }
  if (['SKIPPED', 'FAILED', 'REJECTED', 'ERROR'].includes(value)) {
    return 'bg-rose-500/10 text-rose-500';
  }
  return 'bg-amber-500/10 text-amber-500';
};

const getSideClass = (side) => {
  const value = String(side || '').toUpperCase();
  if (value === 'BUY') return 'bg-emerald-500/10 text-emerald-500';
  if (value === 'SELL') return 'bg-rose-500/10 text-rose-500';
  return 'bg-amber-500/10 text-amber-500';
};

const getStatusMeta = (status) => {
  const value = String(status || '').toUpperCase();
  if (['SUCCESS', 'EXECUTED', 'COMPLETE', 'TRADED'].includes(value)) {
    return {
      className: 'bg-emerald-500/10 text-emerald-500',
      icon: CheckCircle2,
      label: value || 'EXECUTED',
    };
  }
  if (['SKIPPED', 'FAILED', 'REJECTED', 'ERROR'].includes(value)) {
    return {
      className: 'bg-amber-500/10 text-amber-500',
      icon: AlertTriangle,
      label: value || 'SKIPPED',
    };
  }
  return {
    className: 'bg-amber-500/10 text-amber-500',
    icon: AlertTriangle,
    label: value || 'UNKNOWN',
  };
};

const OptionsStatus = () => {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sessionActive, setSessionActive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [allAccounts, activeAcc] = await Promise.all([
          brokerService.getAccounts(),
          masterService.getActiveAccount().catch(() => null),
        ]);
        setAccounts(allAccounts);
        const activeId = activeAcc?.brokerAccountId || activeAcc?.accountId || '';
        const fallbackId = allAccounts[0]?.accountId || allAccounts[0]?.id || '';
        setSelectedAccountId(activeId || fallbackId);
      } catch (error) {
        addToast(error.message || 'Failed to load broker accounts', 'error');
      }
    };
    loadAccounts();
  }, [addToast]);

  const loadData = async (accountId, silent = false) => {
    if (!accountId) return;
    if (!silent) setLoading(true);
    try {
      const [openOptions, optionStatus] = await Promise.all([
        masterService.getOpenOptions(),
        masterService.getOptionStatus(),
      ]);
      const active = !openOptions?.errorCode;
      setSessionActive(active);

      if (!active) {
        setPositions([]);
        setOrders([]);
        setTrades([]);
        return;
      }
      setPositions(Array.isArray(openOptions?.positions) ? openOptions.positions : []);
      setOrders([]);
      setTrades(Array.isArray(optionStatus?.items) ? optionStatus.items : []);
    } catch (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('session') || msg.includes('login')) {
        setSessionActive(false);
      } else {
        addToast(error.message || 'Failed to load options data', 'error');
      }
      setPositions([]);
      setOrders([]);
      setTrades([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (selectedAccountId) loadData(selectedAccountId);
  }, [selectedAccountId]);

  const selectedAccount = accounts.find((item) => (item.accountId || item.id) === selectedAccountId);

  const optionPositions = useMemo(
    () => positions.filter((item) => isOptionRecord(item)),
    [positions],
  );
  const optionOrders = useMemo(
    () => orders.filter((item) => isOptionRecord(item)),
    [orders],
  );
  const optionTrades = useMemo(
    () =>
      trades
        .filter((item) => isOptionRecord(item))
        .sort((a, b) => toMs(b.time || b.date) - toMs(a.time || a.date)),
    [trades],
  );

  const totalOpenQty = optionPositions.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalOptionsPnl = optionPositions.reduce((sum, item) => sum + Number(item.unrealizedPnl || item.pnl || 0), 0);

  const showSessionWarning = sessionActive === false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Options Status</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track option positions, order flow, and taken option trades for master account.</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
            <DivSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeEmptyOption={false}
              options={accounts.map((a) => ({
                value: a.accountId || a.id,
                label: `${a.broker} - ${a.nickname || a.clientId || a.userId}`,
              }))}
              triggerClassName="w-full sm:w-auto bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm"
            />
          )}
          <button
            onClick={() => {
              setRefreshing(true);
              loadData(selectedAccountId, true);
            }}
            disabled={loading || refreshing}
            className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || refreshing) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {sessionActive === true && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Wifi className="w-3.5 h-3.5" />
          <span>Live - reading options from {selectedAccount?.broker || 'broker'} {selectedAccount?.clientId ? `(${selectedAccount.clientId})` : ''}</span>
        </div>
      )}

      {showSessionWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Broker session expired. Reconnect in Demat Accounts to see live options trades.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-brand-purple" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Open Option Positions</p>
          </div>
          <p className="text-xl font-black">{optionPositions.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-brand-blue" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Option Orders</p>
          </div>
          <p className="text-xl font-black">{optionOrders.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-brand-teal" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Taken Option Trades</p>
          </div>
          <p className="text-xl font-black">{optionTrades.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-4 h-4 ${totalOptionsPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unrealized Option P&L</p>
          </div>
          <p className={`text-xl font-black ${totalOptionsPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(totalOptionsPnl)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Open Qty: {totalOpenQty}</p>
        </GlassCard>
      </div>

      <GlassCard title="Taken Option Trades" subtitle="Executed option trades for selected master broker account">
        {loading ? (
          <SkeletonLoader type="table" rows={6} columns={12} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['#', 'Instrument', 'Group', 'Side', 'Qty', 'Master Qty', 'Child Qty', 'Status', 'Child Status', 'Master Status', 'Skip/Failure', 'Latency', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {optionTrades.map((trade, idx) => (
                  <motion.tr
                    key={trade.id || `${trade.symbol}-${idx}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{trade.symbol || trade.instrument || '-'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {trade.instrumentType || '-'}
                          {' '}
                          {trade.isOption ? 'Option' : trade.isFuture ? 'Future' : ''}
                          {trade.copyGroupId ? ` · ${trade.copyGroupId.slice(0, 8)}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {trade.copyGroupId || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex min-w-[3.75rem] items-center justify-center rounded px-2 py-1 text-[10px] font-black tracking-wide ${getSideClass(trade.side || trade.type)}`}>
                        {String(trade.side || trade.type || 'UNKNOWN').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{trade.qty}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{trade.masterQty ?? '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{trade.childQty ?? '-'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const meta = getStatusMeta(trade.status);
                        const StatusIcon = meta.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${meta.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const meta = getStatusMeta(trade.childStatus);
                        const StatusIcon = meta.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${meta.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const meta = getStatusMeta(trade.masterStatus);
                        const StatusIcon = meta.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${meta.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground">
                      {(() => {
                        const reason = formatReason(trade.skipReason || trade.failureReason);
                        const tooltipParts = [reason, trade.errorMessage].filter(Boolean);
                        const tooltip = tooltipParts.length ? tooltipParts.join(' | ') : 'No skip or failure reason';
                        return (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-black/5 cursor-help dark:bg-white/95"
                            title={tooltip}
                            aria-label={tooltip}
                          >
                            <Info className="h-3 w-3" />
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {trade.latencyMs != null ? `${trade.latencyMs} ms` : '-'}
                    </td>
                    <td className="px-4 py-3 text-[10px] text-muted-foreground whitespace-nowrap">{formatTime(trade.time || trade.date || trade.createdAt)}</td>
                  </motion.tr>
                ))}
                {optionTrades.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No taken option trades found for this account
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default OptionsStatus;
