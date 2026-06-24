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
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PAGE_SIZE = 20;
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import RefreshButton from '@/components/shared/RefreshButton';
import DownloadButton from '@/components/shared/DownloadButton';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { masterService } from '@/lib/master';
import { formatCurrency } from '@/lib/utils';
import { downloadExcelSheet, buildExportFileName } from '@/lib/excel';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'success', label: 'Success' },
  { key: 'failed', label: 'Failed' },
  { key: 'skipped', label: 'Skipped' },
];

const DATE_FILTERS = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All' },
];

const matchesDateFilter = (value, filterKey) => {
  if (filterKey === 'all') return true;
  const date = new Date(value || '');
  if (!Number.isFinite(date.getTime())) return false;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filterKey === 'today') return date >= startOfToday;
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
  trade.createdAt || trade.childPlacedAt || trade.time || trade.date || null;

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
  });
};


const getSideClass = (side) => {
  const value = String(side || '').toUpperCase();
  if (value === 'BUY') return 'bg-emerald-500 text-white';
  if (value === 'SELL') return 'bg-rose-500 text-white';
  return 'bg-amber-500 text-white';
};

const getStatusMeta = (status) => {
  const value = String(status || '').toUpperCase();
  if (['SUCCESS', 'EXECUTED', 'COMPLETE', 'TRADED'].includes(value)) {
    return {
      className: 'bg-emerald-500 text-white',
      icon: CheckCircle2,
      label: value || 'SUCCESS',
    };
  }
  if (['FAILED', 'REJECTED', 'ERROR'].includes(value)) {
    return {
      className: 'bg-rose-500 text-white',
      icon: AlertTriangle,
      label: value || 'FAILED',
    };
  }
  if (value === 'SKIPPED') {
    return {
      className: 'bg-amber-500 text-white',
      icon: AlertTriangle,
      label: 'SKIPPED',
    };
  }
  return {
    className: 'bg-amber-500 text-white',
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('today');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [statusFilter, dateFilter, search]);


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
  const optionTrades = useMemo(() => {
    const q = search.trim().toLowerCase();
    return trades
      .filter((item) => isOptionRecord(item))
      .filter((item) => matchesDateFilter(getTradeTimestamp(item), dateFilter))
      .filter((item) => {
        if (statusFilter === 'all') return true;
        const s = String(item.status || '').toUpperCase();
        if (statusFilter === 'success') return ['SUCCESS', 'EXECUTED', 'COMPLETE', 'TRADED'].includes(s);
        if (statusFilter === 'failed') return ['FAILED', 'REJECTED', 'ERROR'].includes(s);
        if (statusFilter === 'skipped') return s === 'SKIPPED';
        return true;
      })
      .filter((item) => {
        if (!q) return true;
        const sym = String(item.symbol || item.instrument || '').toLowerCase();
        const id = String(item.copyGroupId || item.orderId || '').toLowerCase();
        return sym.includes(q) || id.includes(q);
      })
      .sort((a, b) => toMs(getTradeTimestamp(b)) - toMs(getTradeTimestamp(a)));
  }, [trades, dateFilter, statusFilter, search]);

  const totalOpenQty = optionPositions.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalPages = Math.max(1, Math.ceil(optionTrades.length / PAGE_SIZE));
  const pagedTrades = optionTrades.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const showingFrom = optionTrades.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, optionTrades.length);
  const totalOptionsPnl = optionPositions.reduce((sum, item) => sum + Number(item.unrealizedPnl || item.pnl || 0), 0);
  const showSessionWarning = sessionActive === false;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Options Status</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track master option positions and executed option trades.</p>
        </div>
        <div className="flex items-center gap-2">
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
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Filtered Option Trades</p>
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

      <GlassCard title="Taken Option Trades" subtitle="Only the necessary executed option trade fields">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                statusFilter === f.key
                  ? 'bg-brand-purple text-white'
                  : 'bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-border/60" />
          {DATE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
                dateFilter === f.key
                  ? 'bg-brand-purple text-white'
                  : 'bg-black/5 text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol/ref..."
                className="h-8 rounded-lg border border-border bg-black/5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none dark:bg-white/5"
              />
            </div>
            <DownloadButton
              onClick={() => {
                try {
                  downloadExcelSheet({
                    rows: optionTrades.map((t, i) => ({
                      '#': i + 1,
                      Symbol: t.symbol || t.instrument || '—',
                      Type: getTradeTypeLabel(t),
                      Side: t.side || t.type || '—',
                      Qty: t.qty ?? '—',
                      Status: t.status || '—',
                      'Latency (ms)': t.latencyMs ?? '—',
                      'Date & Time': formatDateTime(getTradeTimestamp(t)),
                    })),
                    sheetName: 'Option Trades',
                    fileName: buildExportFileName('Master Option Trades'),
                  });
                } catch {}
              }}
              disabled={optionTrades.length === 0}
              label="Export Excel"
            />
          </div>
        </div>
        {loading ? (
          <SkeletonLoader type="table" rows={6} columns={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-border/40">
                  {['#', 'Symbol', 'Type', 'Side', 'Qty', 'Status', 'Latency', 'Date & Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedTrades.map((trade, idx) => (
                  <motion.tr
                    key={trade.id || `${trade.symbol}-${idx}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">{trade.symbol || trade.instrument || '—'}</p>
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getSideClass(trade.side || trade.type || 'BUY')}`}>
                        {trade.side || trade.type || 'BUY'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">{trade.qty ?? '—'}</td>
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
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {trade.latencyMs != null ? `${trade.latencyMs} ms` : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(getTradeTimestamp(trade))}
                    </td>
                  </motion.tr>
                ))}
                {pagedTrades.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No option trades found for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && optionTrades.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-sm">
            <span className="text-xs text-muted-foreground">
              Showing {showingFrom}–{showingTo} of {optionTrades.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-black/5 px-3 py-1.5 text-xs font-medium hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <span className="text-xs text-muted-foreground">Page {page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-black/5 px-3 py-1.5 text-xs font-medium hover:bg-black/10 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/5 dark:hover:bg-white/10"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default OptionsStatus;
