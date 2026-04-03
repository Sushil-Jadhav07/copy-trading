import React, { useEffect, useMemo, useState } from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const OrderFeed = () => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      setLoading(true);

      try {
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

  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()),
    [orders],
  );

  const getStatusColor = (type) => {
    switch (type) {
      case 'CANCELLED':
        return 'bg-red-500/10 text-red-400';
      case 'EXECUTED':
      case 'REPLICATED':
        return 'bg-emerald-500/10 text-emerald-400';
      default:
        return 'bg-amber-500/10 text-amber-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Order Book</h1>
        <p className="text-muted-foreground">Order stream derived from admin trade logs.</p>
      </div>

      <div className="glass-card overflow-x-auto p-0">
        <table className="min-w-full divide-y divide-border/50">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              {['Instrument', 'Type', 'Order Type', 'Qty', 'Price', 'Status', 'User'].map((header) => (
                <th key={header} className="px-3 py-3.5 text-left text-sm font-semibold">
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
                    {order.action}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{order.type}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatNumber(order.qty || 0)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatCurrency(order.price || 0)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.type)}`}>
                    {order.type}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{order.master}</td>
              </tr>
            ))}
            {!sortedOrders.length && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  {loading ? 'Loading order feed...' : 'No order data available'}
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
