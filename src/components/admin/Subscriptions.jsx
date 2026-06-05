import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, TrendingUp, Users, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const statusClass = {
  Active: 'bg-emerald-500/15 text-emerald-400',
  Cancelled: 'bg-red-500/15 text-red-400',
  Expired: 'bg-white/10 text-muted-foreground',
};

const Subscriptions = () => {
  const { addToast } = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSubscriptions = async () => {
      setLoading(true);

      try {
        const response = await adminService.getSubscriptions();
        const status = statusFilter !== 'All' ? statusFilter.toUpperCase() : '';

        if (isMounted) {
          setSubscriptions(
            status ? response.filter((item) => String(item.status || '').toUpperCase() === status) : response
          );
        }
      } catch (error) {
        if (isMounted) {
          addToast(error.message || 'Unable to load subscriptions', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSubscriptions();

    return () => {
      isMounted = false;
    };
  }, [addToast, statusFilter]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">Live subscription data from the admin API</p>
        </div>
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
              ) : subscriptions.length ? (
                subscriptions.map((subscription, index) => (
                  <motion.tr
                    key={subscription.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="border-b border-border/30 transition-colors hover:bg-white/3"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
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
      </GlassCard>
    </div>
  );
};

export default Subscriptions;
