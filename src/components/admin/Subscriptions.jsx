import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CreditCard, TrendingUp, Users, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import RefreshButton from '@/components/shared/RefreshButton';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const statusClass = {
  Active:    'bg-emerald-500 text-white',
  Cancelled: 'bg-rose-500 text-white',
  Expired:   'bg-slate-500 text-white',
};

const Subscriptions = () => {
  const { addToast } = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const status = statusFilter !== 'All' ? statusFilter.toUpperCase() : '';
      const params = { page, limit: PAGE_SIZE };
      if (status) params.status = status;
      const data = await adminService.getSubscriptions(params);
      setSubscriptions(data.subscriptions || []);
      setTotalItems(data.meta?.total || 0);
    } catch (error) {
      addToast(error.message || 'Unable to load subscriptions', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast, statusFilter, page]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSubscriptions();
  };

  const stats = useMemo(() => {
    const active = subscriptions.filter((subscription) => subscription.status === 'Active');
    const monthlyRevenue = Math.round(active.reduce((sum, item) => sum + Number(item.amount || 0), 0) * 100) / 100;

    return [
      { label: 'Active Subscriptions', value: active.length, icon: Users, color: 'text-emerald-400' },
      { label: 'Monthly Revenue', value: formatCurrency(monthlyRevenue), icon: CreditCard, color: 'text-cyan-400' },
      { label: 'Total Subscriptions', value: subscriptions.length, icon: TrendingUp, color: 'text-foreground' },
      { label: 'Cancelled', value: subscriptions.filter((item) => item.status === 'Cancelled').length, icon: XCircle, color: 'text-red-400' },
    ];
  }, [subscriptions]);

  // ADM-12: server-side pagination integrated
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const pagedSubscriptions = subscriptions;
  const showingFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(page * PAGE_SIZE, totalItems);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Live subscription data from the admin API</p>
        </div>
        <div className="flex items-center gap-3">
          <DivSelect
            value={statusFilter}
            onChange={setStatusFilter}
            includeEmptyOption={false}
            options={[
              { value: 'All', label: 'All Status' },
              { value: 'Active', label: 'Active' },
              { value: 'Cancelled', label: 'Cancelled' },
              { value: 'Expired', label: 'Expired' },
            ]}
            triggerClassName="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:border-emerald-500 dark:bg-white/5"
          />
          <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['#', 'User', 'Plan', 'Status', 'Start Date', 'Next Billing', 'Amount'].map((header) => (
                  <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : pagedSubscriptions.length ? (
                pagedSubscriptions.map((subscription, index) => (
                  <motion.tr
                    key={subscription.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border/30 transition-colors hover:bg-white/3"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{(page - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{subscription.user}</p>
                      <p className="text-xs text-muted-foreground">{subscription.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-400">
                        {subscription.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[subscription.status] || 'bg-white/10 text-muted-foreground'}`}>
                        {subscription.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{subscription.startDate}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{subscription.nextBilling}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(subscription.amount)}</td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No subscriptions available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && subscriptions.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/40 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              Showing {showingFrom}–{showingTo} of {totalItems}
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

export default Subscriptions;
