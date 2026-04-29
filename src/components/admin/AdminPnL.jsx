import React, { useEffect, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import StatCard from '@/components/shared/StatCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { adminService } from '@/lib/admin';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { TrendingUp, Users, Activity, CreditCard } from 'lucide-react';

// FIX: Was calling pnlService.getAllPnl() → POST /api/v1/admin/pnl/all — not in spec.
// Now uses adminService.getAnalytics() (spec 6.9: GET /admin/analytics) which returns
// totalTrades, activeSubscriptions, totalMasters, totalChildren, revenueMtd.

const AdminPnL = () => {
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminService.getAnalytics();
        setAnalytics(data);
      } catch (error) {
        addToast(error.message || 'Unable to load platform P&L', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  const stats = analytics
    ? [
        {
          label: 'Total Trades',
          value: formatNumber(analytics.totalTrades ?? analytics.volumeToday ?? 0),
          icon: Activity,
          color: 'text-brand-purple',
          bg: 'bg-brand-purple/10',
        },
        {
          label: 'Active Subscriptions',
          value: formatNumber(analytics.activeSubscriptions ?? 0),
          icon: CreditCard,
          color: 'text-brand-blue',
          bg: 'bg-brand-blue/10',
        },
        {
          label: 'Active Masters',
          value: formatNumber(analytics.activeMasters ?? analytics.totalMasters ?? 0),
          icon: TrendingUp,
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
        },
        {
          label: 'Total Children',
          value: formatNumber(analytics.totalChildren ?? 0),
          icon: Users,
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Platform P&L</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide analytics from admin overview. Detailed P&L breakdowns are available per-master in Master Analytics.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GlassCard key={i}><SkeletonLoader type="stat" /></GlassCard>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <GlassCard key={stat.label}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Revenue row */}
      {!loading && analytics && (
        <GlassCard title="Revenue Overview">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Revenue MTD</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(analytics.revenueMtd ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Users</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(analytics.totalUsers ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Admins</p>
              <p className="text-xl font-bold text-foreground">{formatNumber(analytics.totalAdmins ?? 0)}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Data from <code className="font-mono text-xs bg-black/5 dark:bg-white/5 px-1 py-0.5 rounded">GET /api/v1/admin/analytics</code>.
            For granular per-master P&L, view individual master profiles.
          </p>
        </GlassCard>
      )}
    </div>
  );
};

export default AdminPnL;