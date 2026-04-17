import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, Shield, TrendingUp } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import StatCard from '@/components/shared/StatCard';
import { riskService } from '@/lib/risk';
import { useToast } from '@/components/shared/Toast';

const getRatio = (value, max) => {
  const safeMax = Number(max) || 0;
  if (!safeMax) return 0;
  return Math.min(100, Math.round((Number(value || 0) / safeMax) * 100));
};

const getBarTone = (ratio) => {
  if (ratio > 80) return 'bg-rose-500';
  if (ratio >= 50) return 'bg-amber-500';
  return 'bg-emerald-500';
};

const ProgressRow = ({ label, value, max }) => {
  const ratio = getRatio(value, max);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold">{value} / {max || 0}</span>
      </div>
      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10">
        <div className={`h-2 rounded-full ${getBarTone(ratio)}`} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
};

const RiskDashboard = () => {
  const { addToast } = useToast();
  const [rules, setRules] = useState(null);
  const [exposure, setExposure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const [rulesData, exposureData] = await Promise.all([riskService.getRules(), riskService.getExposure()]);
      setRules(rulesData);
      setExposure(exposureData);
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <SkeletonLoader type="card" count={2} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Risk Monitor</h1>
        <p className="text-sm text-muted-foreground">Current rule configuration and live trading exposure.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Max Trades / Day" value={rules?.maxTradesPerDay || 0} icon={Shield} />
        <StatCard title="Max Open Positions" value={rules?.maxOpenPositions || 0} icon={Activity} gradient="from-brand-blue to-brand-teal" />
        <StatCard title="Capital Exposure %" value={rules?.maxCapitalExposure || 0} suffix="%" icon={TrendingUp} gradient="from-brand-teal to-success" />
        <StatCard title="Margin Check" value={rules?.marginCheckEnabled ? 1 : 0} suffix={rules?.marginCheckEnabled ? ' ON' : ' OFF'} icon={Shield} gradient="from-brand-purple to-brand-blue" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard title="Risk Rules">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5"><p className="text-xs text-muted-foreground">Max Trades / Day</p><p className="mt-1 text-lg font-semibold">{rules?.maxTradesPerDay || 0}</p></div>
            <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5"><p className="text-xs text-muted-foreground">Max Open Positions</p><p className="mt-1 text-lg font-semibold">{rules?.maxOpenPositions || 0}</p></div>
            <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5"><p className="text-xs text-muted-foreground">Capital Exposure</p><p className="mt-1 text-lg font-semibold">{rules?.maxCapitalExposure || 0}%</p></div>
            <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5"><p className="text-xs text-muted-foreground">Margin Check</p><p className={`mt-1 text-lg font-semibold ${rules?.marginCheckEnabled ? 'text-emerald-500' : 'text-amber-500'}`}>{rules?.marginCheckEnabled ? 'Enabled' : 'Disabled'}</p></div>
          </div>
        </GlassCard>

        <GlassCard
          title="Live Exposure"
          action={
            <button type="button" onClick={() => load(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          }
        >
          <div className="space-y-4">
            <ProgressRow label="Open Positions" value={exposure?.currentOpenPositions || 0} max={exposure?.maxOpenPositions || rules?.maxOpenPositions || 0} />
            <ProgressRow label="Trades Today" value={exposure?.tradesToday || 0} max={exposure?.maxTradesPerDay || rules?.maxTradesPerDay || 0} />
            <div className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
              <p className="text-xs text-muted-foreground">Capital Exposure</p>
              <p className="mt-1 text-lg font-semibold">{exposure?.capitalExposurePct || 0}%</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default RiskDashboard;
