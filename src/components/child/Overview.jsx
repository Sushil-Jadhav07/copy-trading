import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Users, IndianRupee, Percent, Pause, Play, Settings } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildAnalytics, useChildSubscriptions, useChildCopiedTrades } from '@/hooks/useChild';
import { childService } from '@/lib/child';
import { useToast } from '@/components/shared/Toast';
import { useNotifications } from '@/hooks/useNotifications';

const Overview = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { sessionExpiredBrokers, dismissSessionExpired } = useNotifications();
  const { analytics, loading: analyticsLoading, error: analyticsError } = useChildAnalytics();
  const { subscriptions, refetch } = useChildSubscriptions();
  const { trades: copiedTrades, loading: tradesLoading, error: tradesError } = useChildCopiedTrades();

  useEffect(() => {
    if (analyticsError) addToast(analyticsError, 'error');
    if (tradesError) addToast(tradesError, 'error');
  }, [analyticsError, tradesError, addToast]);

  const primarySubscription = subscriptions.find((sub) => String(sub.status || '').toUpperCase() === 'ACTIVE') || subscriptions[0] || null;
  const isPrimaryActive = String(primarySubscription?.status || '').toUpperCase() === 'ACTIVE';

  const handleToggleCopying = async () => {
    if (!primarySubscription?.masterId) {
      addToast('No master subscription found', 'error');
      return;
    }
    try {
      if (isPrimaryActive) {
        await childService.pauseCopying({ masterId: primarySubscription.masterId });
        addToast('Copying paused', 'success');
      } else {
        await childService.resumeCopying({ masterId: primarySubscription.masterId });
        addToast('Copying resumed', 'success');
      }
      refetch();
    } catch (error) {
      addToast(error.message || 'Unable to update copying state', 'error');
    }
  };

  const chartData = Array.isArray(analytics.pnlHistory)
    ? analytics.pnlHistory.map((point) => ({
        time: point.time,
        value: Number(point.personal || 0) + Number(point.copied || 0),
      }))
    : [];

  const masterTotal = Number(analytics.masterPnlComparison?.masterPnl || analytics.masterPnL || 0);
  const myTotal = Number(analytics.totalPnL || analytics.totalPnl || 0);
  const ratio = myTotal !== 0 ? masterTotal / myTotal : 1;
  const masterSeries = chartData.map((point) => ({ time: point.time, value: Number(point.value || 0) * ratio }));

  const fmtTime = (raw) => {
    if (!raw) return '-';
    try {
      return new Date(raw).toLocaleTimeString('en-IN', { hour12: false });
    } catch {
      return raw;
    }
  };

  return (
    <div className="space-y-6">
      {sessionExpiredBrokers.length > 0 && (
        <div className="space-y-2 mb-4">
          {sessionExpiredBrokers.map((item) => (
            <div
              key={item.accountId}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/8 text-sm"
            >
              <div className="flex items-center gap-2 text-rose-500">
                <span className="font-bold text-[11px] uppercase tracking-wide">Session Expired</span>
                <span className="text-foreground">
                  Your <strong>{item.broker}</strong> session has expired. Trades are not being copied.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate('/child/user-management')}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  Re-login
                </button>
                <button
                  onClick={() => dismissSessionExpired(item.accountId)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-xs"
                >
                  x
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Overview</h1>
        <p className="text-sm text-muted-foreground">Welcome back!</p>
      </div>

      <GlassCard noPadding>
        <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              Copying from: <strong className="text-foreground">{primarySubscription?.masterName || 'Not Connected'}</strong>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className="text-muted-foreground">
              Broker: <strong className="text-foreground">{primarySubscription?.raw?.brokerName || primarySubscription?.raw?.brokerId || 'N/A'}</strong>
            </span>
            <span className="hidden sm:inline text-border">|</span>
            <span className={isPrimaryActive ? 'text-success font-semibold' : 'text-warning font-semibold'}>
              {isPrimaryActive ? 'Live Copying' : 'Paused'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleCopying}
              disabled={!primarySubscription}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-black/5 dark:bg-white/5 text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {isPrimaryActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPrimaryActive ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => navigate('/child/my-masters')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-black/5 dark:bg-white/5 text-sm hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Copied P&L" value={analytics.totalPnL || 0} prefix="INR " isCurrency icon={IndianRupee} />
        <StatCard title="Total P&L" value={analytics.totalPnL || 0} prefix="INR " isCurrency icon={TrendingUp} gradient="from-brand-blue to-brand-teal" />
        <StatCard title="Win Rate" value={analytics.winRate || 0} suffix="%" decimals={1} icon={Percent} gradient="from-brand-teal to-success" />
        <StatCard title="Masters Copied" value={analytics.activeMasters ?? subscriptions.filter((s) => s.status === 'ACTIVE').length} icon={Users} gradient="from-brand-purple to-brand-teal" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GlassCard title="My P&L (30 Days)">
          {analyticsLoading ? (
            <SkeletonLoader type="chart" />
          ) : (
            <LineChart
              data={chartData}
              height={300}
              yAxisFormatter={(v) => `${Math.round(v)}`}
              tooltipFormatter={(v) => `INR ${Number(v || 0).toLocaleString('en-IN')}`}
            />
          )}
        </GlassCard>

        <GlassCard title="Master vs My P&L">
          {analyticsLoading ? (
            <SkeletonLoader type="chart" />
          ) : (
            <div className="space-y-4">
              <LineChart
                data={masterSeries}
                height={130}
                yAxisFormatter={(v) => `${Math.round(v)}`}
                tooltipFormatter={(v) => `INR ${Number(v || 0).toLocaleString('en-IN')}`}
              />
              <LineChart
                data={chartData}
                height={130}
                yAxisFormatter={(v) => `${Math.round(v)}`}
                tooltipFormatter={(v) => `INR ${Number(v || 0).toLocaleString('en-IN')}`}
              />
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard
        title="Recent Copied Trades"
        action={(
          <button onClick={() => navigate('/child/copied-trades')} className="text-sm text-brand-purple hover:underline">
            View All
          </button>
        )}
      >
        {tradesLoading ? (
          <SkeletonLoader type="table" rows={5} columns={8} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['Time', 'Instrument', 'Action', 'Qty', 'Price', 'P&L', 'Latency', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {copiedTrades.slice(0, 10).map((trade, idx) => {
                  const status = String(trade.status || '').toUpperCase();
                  const isExecuted = ['EXECUTED', 'SUCCESS'].includes(status);
                  const isFailed = status === 'FAILED';
                  const isSkipped = status === 'SKIPPED';
                  const latency = trade.latencyMs || 0;

                  return (
                    <tr key={trade.id || idx} className="border-b border-border/30 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-sm">{fmtTime(trade.time)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{trade.instrument || '-'}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {trade.exchange && (
                              <span className="text-[8px] font-bold text-muted-foreground px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 border border-border/30 uppercase">{trade.exchange}</span>
                            )}
                            {trade.segment && (
                              <span className="text-[8px] font-bold text-brand-blue px-1 py-0.5 rounded bg-brand-blue/10 border border-brand-blue/20 uppercase">{trade.segment}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${String(trade.type).toUpperCase() === 'SELL' ? 'text-danger' : 'text-success'}`}>
                        {String(trade.type || 'BUY').toUpperCase()}
                      </td>
                      <td className="px-4 py-3 text-sm">{trade.myQty || trade.masterQty || 0}</td>
                      <td className="px-4 py-3 text-sm">{trade.entry ? `₹${Number(trade.entry).toLocaleString('en-IN')}` : '-'}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${Number(trade.pnl || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {Number(trade.pnl || 0) >= 0 ? '+' : ''}₹{Number(trade.pnl || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        {latency > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-xs font-black tabular-nums ${latency < 200 ? 'text-emerald-500' : latency < 400 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {latency}ms
                            </span>
                            {trade.masterOrderTime && trade.masterTriggeredAt && (
                              <span className="text-[8px] font-bold text-amber-500 uppercase tracking-tighter">
                                Det: {Math.max(0, new Date(trade.masterTriggeredAt).getTime() - new Date(trade.masterOrderTime).getTime())}ms
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isExecuted ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          isFailed ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                          isSkipped ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                          'bg-black/10 dark:bg-white/10 border-border'
                        }`}>
                          {isExecuted ? 'SUCCESS' : isFailed ? 'FAILED' : isSkipped ? 'SKIPPED' : status || 'EXECUTED'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {copiedTrades.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No copied trades found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default Overview;

