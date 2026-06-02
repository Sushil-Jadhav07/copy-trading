import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Percent, IndianRupee, Zap } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import DataTable from '@/components/shared/DataTable';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { useMasterAnalytics, useMasterTradeHistory, useMasterChildren, useMasterTradePnl } from '@/hooks/useMaster';
import { useAuth } from '@/context/AuthContext';
import { brokerService } from '@/lib/broker';
import { masterService } from '@/lib/master';

const formatBrokerName = (value) => {
  const broker = String(value || '').trim();
  if (!broker || /^[\uFFFD\s-]+$/.test(broker)) return 'N/A';
  return broker;
};

const Overview = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [openPositions, setOpenPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const { analytics, error: analyticsError } = useMasterAnalytics();
  const { tradePnl } = useMasterTradePnl();
  const { trades: recentTrades, loading: tradesLoading, error: tradesError } = useMasterTradeHistory();
  const { children } = useMasterChildren();
  const pnlSummary = tradePnl?.summary || {};

  useEffect(() => {
    if (analyticsError) addToast(analyticsError, 'error');
    if (tradesError) addToast(tradesError, 'error');
  }, [analyticsError, tradesError, addToast]);

  useEffect(() => {
    let isMounted = true;
    const loadOpenPositions = async () => {
      setPositionsLoading(true);
      try {
        const [accounts, active] = await Promise.all([
          brokerService.getAccounts(),
          masterService.getActiveAccount().catch(() => null),
        ]);
        const activeId = active?.brokerAccountId || active?.accountId;
        const selectedId = activeId || accounts[0]?.accountId || accounts[0]?.id;
        if (!selectedId) {
          if (isMounted) setOpenPositions([]);
          return;
        }
        const positions = await brokerService.getPositions(selectedId);
        if (isMounted) setOpenPositions(Array.isArray(positions) ? positions : []);
      } catch {
        if (isMounted) setOpenPositions([]);
      } finally {
        if (isMounted) setPositionsLoading(false);
      }
    };
    loadOpenPositions();
    return () => {
      isMounted = false;
    };
  }, []);

  const childrenPerformance = children.map((child, index) => ({
    id: child.id || child.childId || index,
    name: child.name || child.childName || 'Unknown',
    broker: formatBrokerName(child.broker || child.brokerName),
    scaling: Number(child.multiplier || 1),
    pnl: Number(child.pnlToday ?? child.pnl ?? child.totalPnL ?? 0),
    status: String(child.status || (child.tradingEnabled ? 'ACTIVE' : 'PAUSED')).toUpperCase(),
  }));

  const activeChildren =
    children.filter((child) => String(child.status || '').toUpperCase() === 'ACTIVE' || child.tradingEnabled).length;
  const tradesCopiedToday = Number(
    analytics.todayTradesCopied ?? analytics.totalReplications ?? 0,
  );
  const todaysPnl = Number(
    pnlSummary.todayPnl ?? analytics.totalPnl ?? analytics.totalPnL ?? 0,
  );
  const portfolioValue = Number(analytics.portfolioValue ?? 0);

  const tradeColumns = [
    { header: 'Instrument', accessor: 'instrument' },
    { header: 'Type', accessor: 'type', isType: true },
    { header: 'Qty', accessor: 'qty' },
    { header: 'Entry Price', accessor: 'entryPrice' },
    { header: 'Current Price', accessor: 'exitPrice' },
    { header: 'P&L', accessor: 'pnl', isPnL: true },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Overview</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {user?.name || 'there'}!</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Portfolio Value" value={portfolioValue || analytics.totalValue || 0} isCurrency icon={TrendingUp} gradient="from-brand-purple to-brand-teal" />
        <StatCard title="Today's P&L" value={todaysPnl} isCurrency icon={IndianRupee} gradient="from-brand-blue to-brand-teal" />
        <StatCard title="Active Children" value={activeChildren} icon={Users} />
        <StatCard title="Trades Copied Today" value={tradesCopiedToday} icon={Zap} gradient="from-brand-teal to-success" />
        <StatCard title="Copy Success Rate" value={analytics.winRate || 0} suffix="%" decimals={1} icon={Percent} gradient="from-brand-teal to-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-2" title="Recent Trades" action={<button onClick={() => addToast('Export feature coming soon!', 'info')} className="text-sm text-brand-purple hover:underline">View All</button>}>
          {tradesLoading ? <SkeletonLoader type="table" rows={5} columns={7} /> : <DataTable columns={tradeColumns} data={recentTrades.slice(0, 5)} pagination={false} emptyMessage="No data available" />}
        </GlassCard>

        <GlassCard title="Children Performance">
          <div className="">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-border/50">
                  {['Name', 'Broker', 'Scaling', 'P&L Today', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {childrenPerformance.slice(0, 6).map((row) => (
                  <tr key={row.id} className="border-b border-border/30 last:border-b-0">
                    <td className="px-3 py-2 text-sm">{row.name}</td>
                    <td className="px-3 py-2 text-sm">{row.broker}</td>
                    <td className="px-3 py-2 text-sm">{row.scaling}x</td>
                    <td className={`px-3 py-2 text-sm font-medium ${row.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {row.pnl >= 0 ? '+' : ''}{formatCurrency(row.pnl)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.status === 'ACTIVE' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>
                        {row.status === 'ACTIVE' ? 'Active' : 'Paused'}
                      </span>
                    </td>
                  </tr>
                ))}
                {childrenPerformance.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">No child performance data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Open Positions">
        {positionsLoading ? (
          <SkeletonLoader type="table" rows={4} columns={9} />
        ) : (
          <div className="">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-border/50">
                  {['Instrument', 'Market', 'Action', 'Qty', 'Entry Price', 'Current Price', 'P&L', 'P&L %', 'Status'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openPositions.map((pos, idx) => {
                  const symbol = String(pos.symbol || pos.instrument || '').toUpperCase();
                  const marketLabel = String(pos.exchange || pos.market || 'NSE').toUpperCase();
                  const qty = Number(pos.qty || 0);
                  const entry = Number(pos.avgPrice || 0);
                  const current = Number(pos.ltp || 0);
                  const pnl = Number(pos.unrealizedPnl ?? pos.pnl ?? 0);
                  const base = Math.abs(entry * qty);
                  const pnlPct = base > 0 ? (pnl / base) * 100 : 0;
                  return (
                    <tr key={pos.id || `${symbol}-${idx}`} className="border-b border-border/30 last:border-b-0">
                      <td className="px-3 py-2 text-sm font-medium">{symbol || '-'}</td>
                      <td className="px-3 py-2 text-sm">{marketLabel}</td>
                      <td className={`px-3 py-2 text-sm font-semibold ${String(pos.type || '').toUpperCase() === 'BUY' ? 'text-success' : 'text-danger'}`}>
                        {String(pos.type || 'BUY').toUpperCase()}
                      </td>
                      <td className="px-3 py-2 text-sm">{qty}</td>
                      <td className="px-3 py-2 text-sm">{formatCurrency(entry)}</td>
                      <td className="px-3 py-2 text-sm">{formatCurrency(current)}</td>
                      <td className={`px-3 py-2 text-sm font-semibold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
                      </td>
                      <td className={`px-3 py-2 text-sm font-semibold ${pnlPct >= 0 ? 'text-success' : 'text-danger'}`}>
                        {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">Open</span>
                      </td>
                    </tr>
                  );
                })}
                {openPositions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">No open positions</td>
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



