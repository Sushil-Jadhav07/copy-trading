import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { pendingOrders, formatCurrency, formatNumber, formatDate } from '@/data/mockData';

const OrderFeed = () => {
  const orders = useMemo(() => {
    // In a real app, this would be a stream of live data
    return pendingOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'Executed': return 'bg-green-500/10 text-green-500';
      case 'Cancelled': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Live Order Book</h1>
        <p className="text-muted-foreground">A real-time stream of all pending, executed, and cancelled orders.</p>
      </div>

      <div className="overflow-x-auto glass-card p-0">
        <table className="min-w-full divide-y divide-border/50">
          <thead className="bg-black/5 dark:bg-white/5">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold sm:pl-6">Instrument</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Type</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Order Type</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Qty</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Price</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">Status</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {orders.map((order) => (
              <motion.tr 
                key={order.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="hover:bg-black/5 dark:bg-white/5 transition-colors"
              >
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-6">{order.instrument}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`font-semibold ${
                    order.type === 'BUY' ? 'text-success' : 'text-danger'
                  }`}>
                    {order.type}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{order.orderType}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{formatNumber(order.qty)}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">{order.price ? formatCurrency(order.price) : 'Market'}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">User #{order.id}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderFeed;
