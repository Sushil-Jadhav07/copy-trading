import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { pendingOrders, formatCurrency } from '@/data/mockData';
import { useToast } from '@/components/shared/Toast';

// Copy status per order — how many children had this order copied
const ORDER_COPY_STATUS = {
  1: { copied: 4, failed: 0, pending: 1 },
  2: { copied: 3, failed: 1, pending: 0 },
  3: { copied: 5, failed: 0, pending: 0 },
  4: { copied: 4, failed: 0, pending: 0 },
  5: { copied: 2, failed: 2, pending: 0 },
};

const OrderBook = () => {
  const { addToast } = useToast();
  const [orders, setOrders] = useState(pendingOrders);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const confirmCancel = () => {
    setOrders((prev) => prev.map((o) => o.id === selectedOrder.id ? { ...o, status: 'Cancelled' } : o));
    setCancelModal(false);
    addToast(`Order for ${selectedOrder.instrument} cancelled`, 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Order Book</h1>
        <p className="text-muted-foreground">Your orders and their copy status across all followers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Orders', value: orders.length },
          { label: 'Pending', value: orders.filter((o) => o.status === 'Pending').length, color: 'text-warning' },
          { label: 'Executed', value: orders.filter((o) => o.status === 'Executed').length, color: 'text-success' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="border-b border-border/50">
                {['#', 'Instrument', 'Order Type', 'Type', 'Qty', 'Price', 'Status', 'Copy Status', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => {
                const cs = ORDER_COPY_STATUS[order.id] || { copied: 0, failed: 0, pending: 0 };
                return (
                  <motion.tr key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{order.instrument}</td>
                    <td className="px-4 py-3 text-sm">{order.orderType}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${order.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>
                        {order.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.qty}</td>
                    <td className="px-4 py-3 text-sm">{order.price ? `₹${order.price.toLocaleString('en-IN')}` : 'MARKET'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        order.status === 'Executed' ? 'bg-success/20 text-success' :
                        order.status === 'Pending' ? 'bg-warning/20 text-warning' :
                        'bg-danger/20 text-danger'}`}>
                        {order.status}
                      </span>
                    </td>
                    {/* Copy Status */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center gap-1 text-success font-semibold">
                          ✓ {cs.copied}
                        </span>
                        {cs.failed > 0 && (
                          <span className="flex items-center gap-1 text-danger font-semibold">
                            ✗ {cs.failed}
                          </span>
                        )}
                        {cs.pending > 0 && (
                          <span className="flex items-center gap-1 text-warning font-semibold">
                            ⏳ {cs.pending}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {order.status === 'Pending' && (
                        <button onClick={() => { setSelectedOrder(order); setCancelModal(true); }}
                          className="p-1.5 hover:bg-danger/20 rounded-lg transition-colors">
                          <X className="w-4 h-4 text-danger" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Order" size="sm">
        {selectedOrder && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Cancel <span className="font-semibold text-foreground">{selectedOrder.type} {selectedOrder.qty} {selectedOrder.instrument}</span>?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Keep</button>
              <button onClick={confirmCancel} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Cancel Order</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default OrderBook;
