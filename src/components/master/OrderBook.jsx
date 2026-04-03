import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useMasterTradeHistory } from '@/hooks/useMaster';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const OrderBook = () => {
  const { addToast } = useToast();
  const { trades, loading, error } = useMasterTradeHistory();
  const [orders, setOrders] = useState([]);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  useEffect(() => {
    setOrders(trades.filter((order) => ['PENDING', 'OPEN'].includes(String(order.status || '').toUpperCase())));
  }, [trades]);

  const confirmCancel = () => {
    setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, status: 'Cancelled' } : o));
    setCancelModal(false);
    addToast(`Order for ${selectedOrder.instrument} cancelled`, 'success');
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Order Book</h1><p className="text-muted-foreground">Your orders and their copy status across all followers</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[{ label: 'Total Orders', value: orders.length }, { label: 'Pending', value: orders.filter((o) => String(o.status).toUpperCase() === 'PENDING').length, color: 'text-warning' }, { label: 'Executed', value: orders.filter((o) => String(o.status).toUpperCase() === 'EXECUTED').length, color: 'text-success' }].map((s) => <GlassCard key={s.label}><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p></GlassCard>)}
      </div>
      <GlassCard noPadding>
        {loading ? <div className="p-4"><SkeletonLoader type="table" rows={5} columns={9} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead><tr className="border-b border-border/50">{['#', 'Instrument', 'Order Type', 'Type', 'Qty', 'Price', 'Status', 'Copy Status', 'Action'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {orders.map((order, idx) => (
                  <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{order.instrument}</td>
                    <td className="px-4 py-3 text-sm">{order.orderType || order.status}</td>
                    <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${order.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>{order.type}</span></td>
                    <td className="px-4 py-3 text-sm">{order.qty}</td>
                    <td className="px-4 py-3 text-sm">{order.price ? `₹${Number(order.price).toLocaleString('en-IN')}` : 'MARKET'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${String(order.status).toUpperCase() === 'EXECUTED' ? 'bg-success/20 text-success' : String(order.status).toUpperCase() === 'PENDING' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>{order.status}</span></td>
                    <td className="px-4 py-3"><div className="flex items-center gap-2 text-xs"><span className="flex items-center gap-1 text-success font-semibold">✓ {Array.isArray(order.children) ? order.children.length : 0}</span></div></td>
                    <td className="px-4 py-3">{String(order.status).toUpperCase() === 'PENDING' && <button onClick={() => { setSelectedOrder(order); setCancelModal(true); }} className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors"><X className="w-4 h-4 text-danger" /></button>}</td>
                  </motion.tr>
                ))}
                {!orders.length && <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No data available</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Order" size="sm">
        {selectedOrder && <div className="space-y-4"><p className="text-muted-foreground text-sm">Cancel <span className="font-semibold text-foreground">{selectedOrder.type} {selectedOrder.qty} {selectedOrder.instrument}</span>?</p><div className="flex gap-3"><button onClick={() => setCancelModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Keep</button><button onClick={confirmCancel} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Cancel Order</button></div></div>}
      </Modal>
    </div>
  );
};

export default OrderBook;
