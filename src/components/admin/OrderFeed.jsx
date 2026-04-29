import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatNumber, formatRelativeTime } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const STATUS_OPTIONS = ['ALL', 'EXECUTED', 'FAILED', 'CANCELLED'];

const OrderFeed = () => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  // FIX: OrderFeed now lets admin filter by status, making it distinct from LiveTrades.
  // LiveTrades shows only EXECUTED/REPLICATED. OrderFeed shows everything with status filter.
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      setLoading(true);
      try {
        // Spec 6.12: GET /admin/trade-logs?status=FAILED etc.
        // Fetch all logs — let the user filter client-side via the dropdown.
        const response = await adminService.getTradeLogs();

        if (isMounted) {
          setOrders(response);
        }
      } catch (error) {
        if (isMounted) {
          addToast(error.message || 'Unable to load order feed', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const sortedOrders = useMemo(() => {
    const filtered = statusFilter === 'ALL'
      ? orders
      : orders.filter((o) => (o.type || '').toUpperCase() === statusFilter || (o.raw?.status || '').toUpperCase() === statusFilter);
    return [...filtered].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  }, [orders, statusFilter]);

  const getStatusColor = (log) => {
    const s = (log.raw?.status || log.type || '').toUpperCase();
    if (s === 'FAILED' || log.status === 'error') return 'bg-red-500/10 text-red-400';
    if (s === 'CANCELLED' || log.status === 'warning') return 'bg-amber-500/10 text-amber-400';
    return 'bg-emerald-500/10 text-emerald-400';
  };

  const getStatusLabel = (log) => {
    return log.raw?.status || log.type || 'UNKNOWN';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Order Book</h1>
          <p className="text-muted-foreground">Full order stream — all statuses. Use Live Trades for executed-only view.</p>
        </div>
        {/* Status filter — makes this page distinct from LiveTrades */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                statusFilter === s
                  ? 'bg-brand-purple text-white'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-border/50">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              {['Instrument', 'Side', 'Type', 'Qty', 'Price', 'Status', 'Time', 'Broker', 'User', 'Message'].map((header) => (
                <th key={header} className="px-3 py-3.5 text-left text-sm font-semibold whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {sortedOrders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-foreground">{order.symbol}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={order.action === 'BUY' ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>
                    {order.action || '—'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{order.type}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatNumber(order.qty || 0)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatCurrency(order.price || 0)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order)}`}>
                    {getStatusLabel(order)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-xs text-muted-foreground">
                  {formatRelativeTime(order.timestamp || order.raw?.timestamp || order.date)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{order.broker || '—'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{order.master || '—'}</td>
                <td className="px-3 py-4 text-xs text-muted-foreground max-w-[200px] truncate">{order.message || order.error || '—'}</td>
              </tr>
            ))}
            {!sortedOrders.length && (
              <tr>
                <td colSpan={9} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading order feed...' : `No orders found${statusFilter !== 'ALL' ? ` with status "${statusFilter}"` : ''}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderFeed;