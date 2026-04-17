import React, { useEffect, useState } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { brokerService } from '@/lib/broker';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const OrderBook = () => {
  const { addToast } = useToast();
  const { accounts } = useBrokerAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (accounts.length && !selectedAccountId) {
      setSelectedAccountId(accounts[0]?.accountId || '');
    }
  }, [accounts, selectedAccountId]);

  useEffect(() => {
    if (!selectedAccountId) return;
    let isMounted = true;
    setLoading(true);
    brokerService.getOrders(selectedAccountId)
      .then((data) => { if (isMounted) setOrders(data); })
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [selectedAccountId, addToast]);

  const handleRefresh = () => {
    if (!selectedAccountId) return;
    setLoading(true);
    brokerService.getOrders(selectedAccountId)
      .then(setOrders)
      .catch((e) => addToast(e.message, 'error'))
      .finally(() => setLoading(false));
  };

  const confirmCancel = async () => {
    if (!selectedOrder) return;
    setCancelling(true);
    try {
      await brokerService.cancelOrder(selectedAccountId, selectedOrder.id);
      setOrders((prev) => prev.filter((o) => o.id !== selectedOrder.id));
      addToast(`Order cancelled`, 'success');
    } catch (e) {
      addToast(e.message || 'Cancel failed', 'error');
    } finally {
      setCancelling(false);
      setCancelModal(false);
    }
  };

  const pending = orders.filter((o) => ['PENDING', 'OPEN', 'TRIGGER PENDING'].includes(String(o.status).toUpperCase()));
  const executed = orders.filter((o) => String(o.status).toUpperCase() === 'COMPLETE');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Order Book</h1>
          <p className="text-sm text-muted-foreground">Today's orders for this broker account</p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 1 && (
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple"
            >
              {accounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {a.broker} — {a.userId} {a.nickname ? `(${a.nickname})` : ''}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 bg-black/5 dark:bg-white/5 rounded-lg hover:bg-black/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {[
          { label: 'Total Orders', value: orders.length },
          { label: 'Pending', value: pending.length, color: 'text-warning' },
          { label: 'Executed', value: executed.length, color: 'text-success' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard noPadding>
        {loading ? (
          <div className="p-4"><SkeletonLoader type="table" rows={5} columns={7} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'Symbol', 'Type', 'Qty', 'Price', 'Status', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{order.symbol}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${order.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.qty}</td>
                    <td className="px-4 py-3 text-sm">{order.price ? formatCurrency(order.price) : 'MARKET'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        String(order.status).toUpperCase() === 'COMPLETE' ? 'bg-success/20 text-success' :
                        ['PENDING', 'OPEN'].includes(String(order.status).toUpperCase()) ? 'bg-warning/20 text-warning' :
                        'bg-danger/20 text-danger'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {['PENDING', 'OPEN'].includes(String(order.status).toUpperCase()) && (
                        <button
                          onClick={() => { setSelectedOrder(order); setCancelModal(true); }}
                          className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors"
                          title="Cancel order"
                        >
                          <X className="w-4 h-4 text-danger" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
                {!orders.length && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No orders found for today</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Order" size="sm">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 text-sm">
              {[['Symbol', selectedOrder.symbol], ['Type', selectedOrder.type], ['Qty', selectedOrder.qty], ['Price', selectedOrder.price ? formatCurrency(selectedOrder.price) : 'MARKET']].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">This will cancel the pending order immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 rounded-lg text-sm transition-colors">Keep Order</button>
              <button onClick={confirmCancel} disabled={cancelling} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {cancelling ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderBook;
