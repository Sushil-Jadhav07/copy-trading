import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, WifiOff, Wifi, Info, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import RefreshButton from '@/components/shared/RefreshButton';
import DownloadButton from '@/components/shared/DownloadButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { brokerService } from '@/lib/broker';
import { masterService } from '@/lib/master';
import { formatCurrency } from '@/lib/utils';
import { buildExportFileName, downloadExcelSheet } from '@/lib/excel';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';

const EXECUTED_STATUSES = ['COMPLETE', 'EXECUTED', 'SUCCESS', 'TRADED', 'FILLED'];
const PENDING_STATUSES  = ['PENDING', 'OPEN', 'TRIGGER PENDING', 'REJECT PENDING', 'AMO REQ RECEIVED', 'PUT ORDER REQ RECEIVED'];
const SKIPPED_STATUSES  = ['SKIPPED', 'CANCELLED', 'CANCELED'];

const getOrderStatusClass = (status) => {
  const s = String(status || '').toUpperCase();
  if (EXECUTED_STATUSES.includes(s)) return 'bg-emerald-500';
  if (PENDING_STATUSES.includes(s))  return 'bg-amber-500';
  if (SKIPPED_STATUSES.includes(s))  return 'bg-amber-500';
  return 'bg-rose-500';
};

const parseActive = (v) => {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const u = v.trim().toUpperCase();
    return ['TRUE', '1', 'ACTIVE', 'SESSION_ACTIVE', 'CONNECTED', 'LOGGED_IN', 'AUTHORIZED'].includes(u);
  }
  return false;
};

const TIME_FILTERS = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'week',      label: 'This Week' },
  { key: 'month',     label: 'This Month' },
  { key: 'all',       label: 'All' },
];

const STATUS_FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'executed', label: 'Executed' },
  { key: 'pending',  label: 'Pending' },
  { key: 'failed',   label: 'Failed' },
  { key: 'skipped',  label: 'Skipped' },
];

const getOrderDate = (order) => {
  const raw =
    order.orderTime ||
    order.exchangeTime ||
    order.updateTime ||
    order.createTime ||
    order.time ||
    order.timestamp ||
    order.placedAt ||
    order.createdAt ||
    order.orderTimestamp ||
    order.tradedAt;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
};

const applyTimeFilter = (orders, timeFilter) => {
  if (timeFilter === 'all') return orders;
  const now = new Date();
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const soy = new Date(sod); soy.setDate(soy.getDate() - 1);
  const eoy = new Date(sod);
  const sow = new Date(sod); sow.setDate(sow.getDate() - ((sow.getDay() + 6) % 7));
  const som = new Date(now.getFullYear(), now.getMonth(), 1);

  return orders.filter((o) => {
    const d = getOrderDate(o);
    if (!d) return timeFilter === 'today';
    switch (timeFilter) {
      case 'today':     return d >= sod;
      case 'yesterday': return d >= soy && d < eoy;
      case 'week':      return d >= sow;
      case 'month':     return d >= som;
      default:          return true;
    }
  });
};

const applyStatusFilter = (orders, statusFilter) => {
  if (statusFilter === 'all') return orders;
  return orders.filter((o) => {
    const s = String(o.status || '').toUpperCase();
    switch (statusFilter) {
      case 'executed': return EXECUTED_STATUSES.includes(s);
      case 'pending':  return PENDING_STATUSES.includes(s);
      case 'failed':   return !EXECUTED_STATUSES.includes(s) && !PENDING_STATUSES.includes(s) && !SKIPPED_STATUSES.includes(s);
      case 'skipped':  return SKIPPED_STATUSES.includes(s);
      default:         return true;
    }
  });
};

const OrderBook = () => {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [sessionActive, setSessionActive]   = useState(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter]     = useState('today');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [allAccounts, activeAcc] = await Promise.all([
          brokerService.getAccounts(),
          masterService.getActiveAccount().catch(() => null),
        ]);
        setAccounts(allAccounts);
        const activeId = activeAcc?.brokerAccountId || activeAcc?.accountId;
        const fallbackId = allAccounts.length > 0 ? (allAccounts[0]?.accountId || allAccounts[0]?.id) : '';
        setSelectedAccountId(activeId || fallbackId);
      } catch (e) {
        addToast(e.message, 'error');
      }
    };
    loadAccounts();
  }, [addToast]);

  const loadOrders = useCallback(async (accountId, silent = false) => {
    if (!accountId) return;
    if (!silent) setLoading(true);
    setSessionLoading(true);
    try {
      const data = await masterService.getOpenBook();
      const isActive = !data?.errorCode;
      setSessionActive(isActive);
      if (!isActive) { setOrders([]); return; }
      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (e) {
      const msg = e.message || '';
      if (msg.toLowerCase().includes('session') || msg.toLowerCase().includes('login')) {
        setSessionActive(false);
      } else {
        addToast(e.message, 'error');
      }
      setOrders([]);
    } finally {
      setLoading(false);
      setSessionLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (selectedAccountId) {
      setSessionActive(null);
      setOrders([]);
      loadOrders(selectedAccountId);
    }
  }, [selectedAccountId, loadOrders]);

  useEffect(() => {
    if (!selectedAccountId) return;
    const sub = connectChannel('trades', (event) => {
      if (['TRADE_COPIED', 'copy_trade', 'TRADE_DETECTED', 'trade_detected', 'MESSAGE'].includes(event)) {
        loadOrders(selectedAccountId, true);
      }
    }, null, null);
    return () => sub.close();
  }, [selectedAccountId, loadOrders]);

  const handleRefresh = () => { setRefreshing(true); loadOrders(selectedAccountId, true); };

  const selectedAccount = accounts.find((a) => (a.accountId || a.id) === selectedAccountId);
  const showSessionWarning = sessionActive === false && !sessionLoading;

  const filteredOrders = applyStatusFilter(
    applyTimeFilter(
      orders.filter((o) => !search || String(o.symbol || '').toUpperCase().includes(search.toUpperCase())),
      timeFilter,
    ),
    statusFilter,
  );

  const pending  = filteredOrders.filter((o) => PENDING_STATUSES.includes(String(o.status).toUpperCase()));
  const executed = filteredOrders.filter((o) => EXECUTED_STATUSES.includes(String(o.status).toUpperCase()));

  const handleDownload = useCallback(() => {
    try {
      const rows = filteredOrders.map((order, idx) => {
        const orderDate = getOrderDate(order);
        return {
          '#': idx + 1,
          Symbol: order.symbol || '-',
          Exchange: order.exchange || '-',
          Segment: order.segment || order.market || '-',
          'Order Type': order.orderType || '-',
          Side: order.type || '-',
          Qty: order.qty ?? '-',
          Price: order.price ? Number(order.price) : 'MARKET',
          Status: order.status || '-',
          'Status Message': order.statusMessage || order.reason || order.message || '',
          'Order Time': orderDate ? orderDate.toISOString() : '',
          Broker: selectedAccount?.broker || '',
          'Client ID': selectedAccount?.clientId || '',
        };
      });

      downloadExcelSheet({
        rows,
        sheetName: 'Order Book',
        fileName: buildExportFileName('Master Order Book'),
      });
      addToast('Order book Excel downloaded', 'success');
    } catch (error) {
      addToast(error.message || 'Failed to download Excel sheet', 'error');
    }
  }, [addToast, filteredOrders, selectedAccount?.broker, selectedAccount?.clientId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Order Book</h1>
          <p className="text-sm text-muted-foreground">Orders for this broker account</p>
        </div>
        <div className="flex items-center gap-2">
          <DownloadButton onClick={handleDownload} disabled={filteredOrders.length === 0} label="Excel" />
          <RefreshButton onClick={handleRefresh} loading={loading || refreshing} />
        </div>
      </div>

      {/* Session expired banner */}
      {showSessionWarning && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <WifiOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-400">Broker session expired</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your {selectedAccount?.broker || 'broker'} session has expired.{' '}
              <a href="/master/demat" className="underline text-brand-purple">Reconnect broker</a> to see your orders.
            </p>
          </div>
        </div>
      )}

      {sessionActive === true && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <Wifi className="w-3.5 h-3.5" />
          <span>Live — reading orders from {selectedAccount?.broker || 'broker'}{selectedAccount?.clientId ? ` (${selectedAccount.clientId})` : ''}</span>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {[
          { label: 'Total Orders', value: filteredOrders.length },
          { label: 'Pending',      value: pending.length,  color: 'text-warning' },
          { label: 'Executed',     value: executed.length, color: 'text-success' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <GlassCard>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-4">
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/8 px-2 py-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-[0.08em] transition-all ${
                    statusFilter === f.key
                      ? 'bg-[#00d7a3] text-[#06251c] shadow-[0_8px_20px_rgba(0,215,163,0.2)]'
                      : 'text-white/60 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  {f.key === 'all' ? 'All' : f.label}
                </button>
              ))}
            </div>

            <div className="hidden h-8 w-px bg-white/8 xl:block" />

            <div className="flex flex-wrap items-center gap-2">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setTimeFilter(f.key)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    timeFilter === f.key
                      ? 'bg-[#00d7a3] text-[#06251c] shadow-[0_8px_20px_rgba(0,215,163,0.2)]'
                      : 'border border-white/8 text-white/65 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full xl:w-[280px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search symbol/master/ref..."
                className="h-10 w-full rounded-full border border-white/10 bg-transparent pl-10 pr-4 text-sm font-medium text-white placeholder:text-white/38 focus:outline-none focus:border-[#00d7a3]/55"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard noPadding>
        {(loading || sessionLoading) ? (
          <div className="p-4"><SkeletonLoader type="table" rows={5} columns={8} /></div>
        ) : showSessionWarning ? (
          <div className="py-16 text-center">
            <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm text-muted-foreground">Reconnect your broker to see orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'Time', 'Symbol', 'Exchange', 'Segment', 'Order Type', 'Type', 'Qty', 'Price', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <motion.tr
                    key={order.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 text-sm">{getOrderDate(order)?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'}) || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{order.symbol}</td>
                    <td className="px-4 py-3 text-sm">{order.exchange || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tight ${
                        (order.segment || order.market) === 'FNO'
                          ? 'bg-brand-blue/10 text-brand-blue border border-brand-blue/20'
                          : 'bg-black/5 dark:bg-white/5 text-muted-foreground border border-border/30'
                      }`}>
                        {order.segment || order.market || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.orderType || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold text-white ${order.type === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.qty}</td>
                    <td className="px-4 py-3 text-sm">{order.price ? formatCurrency(order.price) : 'MARKET'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${getOrderStatusClass(order.status)}`}>
                          {order.status}
                        </span>
                        {(order.statusMessage || order.reason || order.message) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="text-muted-foreground hover:text-foreground transition-colors">
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs text-xs font-medium break-words whitespace-normal leading-relaxed">
                                {order.statusMessage || order.reason || order.message}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filteredOrders.length === 0 && !showSessionWarning && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No orders match the selected filters
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

export default OrderBook;
