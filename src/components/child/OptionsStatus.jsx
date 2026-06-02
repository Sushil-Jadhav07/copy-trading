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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { childService } from '@/lib/child';
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
  if (segment.includes('OPT') || segment.includes('OPTION') || segment.includes('FNO')) return true;
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

const ChildOptionsStatus = () => {
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
        const allAccounts = await brokerService.getAccounts();
        setAccounts(allAccounts);
        setSelectedAccountId(allAccounts[0]?.accountId || allAccounts[0]?.id || '');
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
      const [openOptions, openBook, optionStatus] = await Promise.all([
        childService.getOpenOptions(),
        childService.getOpenBook(),
        childService.getOptionStatus(),
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
      setOrders(Array.isArray(openBook?.orders) ? openBook.orders : []);
      setTrades(Array.isArray(optionStatus?.items) ? optionStatus.items : []);
    } catch (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('session') || msg.includes('login')) {
        setSessionActive(false);
      } else {
        addToast(error.message || 'Failed to load child options data', 'error');
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
    if (selectedAccountId) {
      loadData(selectedAccountId);
    }
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
        .sort((a, b) => toMs(b.childPlacedAt || b.createdAt) - toMs(a.childPlacedAt || a.createdAt)),
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
          <p className="mt-0.5 text-sm text-muted-foreground">Track child option positions, order flow, and copied option executions.</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
            <DivSelect
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              includeEmptyOption={false}
              options={accounts.map((account) => ({
                value: account.accountId || account.id,
                label: `${account.broker} - ${account.nickname || account.clientId || account.userId}`,
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
          <Wifi className="h-3.5 w-3.5" />
          <span>
            Live - reading options from {selectedAccount?.broker || 'broker'}
            {selectedAccount?.clientId ? ` (${selectedAccount.clientId})` : ''}
          </span>
        </div>
      )}

      {showSessionWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-xs text-muted-foreground">
            Broker session expired. Reconnect in Demat Accounts to see live child options data.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <GlassCard>
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-brand-purple" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Open Option Positions</p>
          </div>
          <p className="text-xl font-black">{optionPositions.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-blue" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Option Orders</p>
          </div>
          <p className="text-xl font-black">{optionOrders.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="mb-2 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-brand-teal" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Taken Option Trades</p>
          </div>
          <p className="text-xl font-black">{optionTrades.length}</p>
        </GlassCard>
        <GlassCard>
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className={`h-4 w-4 ${totalOptionsPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unrealized Option P&L</p>
          </div>
          <p className={`text-xl font-black ${totalOptionsPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(totalOptionsPnl)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">Open Qty: {totalOpenQty}</p>
        </GlassCard>
      </div>

      <GlassCard title="Taken Option Trades" subtitle="Option trades copied into your child broker account">
        {loading ? (
          <SkeletonLoader type="table" rows={6} columns={13} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['#', 'Instrument', 'Group', 'Side', 'Qty', 'Master Qty', 'Child Qty', 'Status', 'Child Status', 'Master Status', 'Skip/Failure', 'Latency', 'Time'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {header}
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
                    className="border-b border-border/20 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{trade.symbol || '-'}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {trade.instrumentType || '-'}
                          {' '}
                          {trade.isOption ? 'Option' : trade.isFuture ? 'Future' : ''}
                          {trade.copyGroupId ? ` · ${trade.copyGroupId.slice(0, 8)}` : ''}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{trade.copyGroupId || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex min-w-[3.75rem] items-center justify-center rounded px-2 py-1 text-[10px] font-black tracking-wide ${getSideClass(trade.side)}`}>
                        {trade.side || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{trade.qty ?? '-'}</td>
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
                        const tooltipParts = [reason !== '-' ? reason : '', trade.errorMessage || ''].filter(Boolean);
                        const tooltip = tooltipParts.length ? tooltipParts.join(' | ') : 'No skip or failure reason';
                        return (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm ring-1 ring-black/5 dark:bg-white/95"
                                  aria-label={tooltip}
                                >
                                  <Info className="h-3 w-3" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-[240px] text-xs font-medium">
                                {tooltip}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {trade.latencyMs != null ? `${trade.latencyMs} ms` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[10px] text-muted-foreground">
                      {formatTime(trade.childPlacedAt || trade.createdAt)}
                    </td>
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

export default ChildOptionsStatus;
