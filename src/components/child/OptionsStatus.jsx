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
  CalendarDays,
} from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import RefreshButton from '@/components/shared/RefreshButton';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { childService } from '@/lib/child';
import { formatCurrency } from '@/lib/utils';

const DATE_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
];

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
  if (item.isOption === true) return true;
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

const getTradeTimestamp = (trade = {}) =>
  trade.childPlacedAt || trade.createdAt || trade.masterPlacedAt || trade.time || null;

const getTradeTypeLabel = (trade = {}) => {
  const instrumentType = String(
    trade.instrumentType ||
    trade.raw?.instrumentType ||
    trade.raw?.instrument_type ||
    ''
  ).toUpperCase();

  if (instrumentType) return instrumentType;
  if (trade.isOption === true || trade.raw?.isOption === true) return 'OPTION';
  if (trade.isFuture === true || trade.raw?.isFuture === true) return 'FUTURE';
  return '—';
};

const getTradeClassLabel = (trade = {}) => {
  if (trade.isOption === true || trade.raw?.isOption === true) return 'OPTION';
  if (trade.isFuture === true || trade.raw?.isFuture === true) return 'FUTURE';
  return '—';
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }) + `.${String(date.getMilliseconds()).padStart(3, '0')}`;
};

const matchesDateFilter = (value, filterKey) => {
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (filterKey === 'today') {
    return date >= startOfToday;
  }

  if (filterKey === 'yesterday') {
    const start = new Date(startOfToday);
    start.setDate(start.getDate() - 1);
    return date >= start && date < startOfToday;
  }

  if (filterKey === 'week') {
    const day = startOfToday.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const weekStart = new Date(startOfToday);
    weekStart.setDate(weekStart.getDate() - diff);
    return date >= weekStart;
  }

  if (filterKey === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= monthStart;
  }

  return true;
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
      label: value || 'SUCCESS',
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
  const [dateFilter, setDateFilter] = useState('today');

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
        .filter((item) => matchesDateFilter(getTradeTimestamp(item), dateFilter))
        .sort((a, b) => toMs(getTradeTimestamp(b)) - toMs(getTradeTimestamp(a))),
    [trades, dateFilter],
  );

  const totalOpenQty = optionPositions.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalOptionsPnl = optionPositions.reduce((sum, item) => sum + Number(item.unrealizedPnl || item.pnl || 0), 0);
  const showSessionWarning = sessionActive === false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Options Status</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track child option positions and copied option executions.</p>
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
          <RefreshButton
            onClick={() => {
              setRefreshing(true);
              loadData(selectedAccountId, true);
            }}
            loading={loading || refreshing}
          />
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
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filtered Option Trades</p>
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

      <GlassCard title="Taken Option Trades" subtitle="Only the necessary copied option trade fields">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-black/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground dark:bg-white/5">
            <CalendarDays className="h-3.5 w-3.5" />
            Date Filter
          </div>
          {DATE_FILTERS.map((item) => (
            <button
              key={item.key}
              onClick={() => setDateFilter(item.key)}
              className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-colors ${
                dateFilter === item.key
                  ? 'bg-brand-purple text-white'
                  : 'bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonLoader type="table" rows={6} columns={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['#', 'Symbol', 'Type', 'Side', 'Qty', 'Status', 'Order ID', 'Latency', 'Date & Time'].map((header) => (
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
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{trade.copyGroupId ? trade.copyGroupId.slice(0, 8) : '—'}</span>
                          <span className="rounded-full border border-border/40 px-2 py-0.5 font-semibold uppercase tracking-wide text-foreground/80">
                            {getTradeClassLabel(trade)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                      {getTradeTypeLabel(trade)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex min-w-[3.75rem] items-center justify-center rounded px-2 py-1 text-[10px] font-black tracking-wide ${getSideClass(trade.side)}`}>
                        {trade.side || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{trade.childQty ?? trade.qty ?? '—'}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const meta = getStatusMeta(trade.childStatus || trade.status);
                        const StatusIcon = meta.icon;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${meta.className}`}>
                            <StatusIcon className="h-3 w-3" />
                            {meta.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{trade.childBrokerOrderId || trade.orderId || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {trade.latencyMs != null ? `${trade.latencyMs} ms` : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(getTradeTimestamp(trade))}
                    </td>
                  </motion.tr>
                ))}
                {optionTrades.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No option trades found for the selected date range
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
