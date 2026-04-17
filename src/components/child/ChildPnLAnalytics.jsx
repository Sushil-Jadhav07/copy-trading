import React, { useEffect, useState } from 'react';
import { BarChart2, Percent, TrendingDown, TrendingUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import StatCard from '@/components/shared/StatCard';
import PnLAnalytics from '@/components/master/PnLAnalytics';
import { childService } from '@/lib/child';
import { pnlService } from '@/lib/pnl';
import { useToast } from '@/components/shared/Toast';

const ChildPnLAnalytics = () => {
  const { addToast } = useToast();
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const subscriptions = await childService.getSubscriptions();
        const firstActive = subscriptions.find((item) => String(item.status || '').toUpperCase() === 'ACTIVE') || subscriptions[0];
        if (!firstActive?.masterId) return;
        const result = await pnlService.getChildVsMaster(firstActive.masterId);
        if (active) setComparison(result);
      } catch (error) {
        addToast(error.message, 'error');
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [addToast]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Child P&L Analytics</h1>
        <p className="text-sm text-muted-foreground">Your copied performance with direct comparison against the master.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Master P&L" value={comparison?.masterPnl || 0} icon={TrendingUp} isCurrency />
        <StatCard title="My P&L" value={comparison?.childPnl || 0} icon={BarChart2} isCurrency gradient="from-brand-blue to-brand-teal" />
        <StatCard title="Replication Accuracy" value={comparison?.replicationAccuracy || 0} suffix="%" icon={Percent} gradient="from-brand-teal to-success" />
        <StatCard title="Failed Replications" value={comparison?.failedReplications || 0} icon={TrendingDown} gradient="from-brand-purple to-brand-blue" />
      </div>

      <GlassCard title="Child vs Master">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs text-muted-foreground">Master P&L</p>
            <p className="mt-1 text-lg font-semibold">{comparison?.masterPnl ?? 0}</p>
          </div>
          <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
            <p className="text-xs text-muted-foreground">My P&L</p>
            <p className="mt-1 text-lg font-semibold">{comparison?.childPnl ?? 0}</p>
          </div>
        </div>
      </GlassCard>

      <PnLAnalytics />
    </div>
  );
};

export default ChildPnLAnalytics;
