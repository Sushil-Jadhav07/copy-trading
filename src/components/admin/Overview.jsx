import React, { useEffect, useMemo, useState } from 'react';
import { Activity, IndianRupee, Server, TrendingUp, Users } from 'lucide-react';
import StatCard from '@/components/shared/StatCard';
import GlassCard from '@/components/shared/GlassCard';
import LineChart from '@/components/charts/LineChart';
import DataTable from '@/components/shared/DataTable';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const fallbackGrowth = [
  { date: 'Week 1', totalUsers: 0 },
  { date: 'Week 2', totalUsers: 0 },
  { date: 'Week 3', totalUsers: 0 },
  { date: 'Week 4', totalUsers: 0 },
];

const normalizeChartData = (growth = []) => {
  if (!Array.isArray(growth) || !growth.length) {
    return fallbackGrowth;
  }

  return growth.map((point, index) => ({
    date: point.date || point.label || point.day || `Point ${index + 1}`,
    totalUsers: Number(point.totalUsers || point.value || point.users || 0),
  }));
};

const Overview = () => {
  const { addToast } = useToast();
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    activeMasters: 0,
    volumeToday: 0,
    revenueMtd: 0,
    userGrowth: fallbackGrowth,
    topMasters: [],
  });
  const [health, setHealth] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadOverview = async () => {
      setLoading(true);

      try {
        const [analyticsResponse, healthResponse, logsResponse] = await Promise.all([
          adminService.getAnalytics(),
          adminService.getSystemHealth(),
          adminService.getTradeLogs(),
        ]);

        if (!isMounted) {
          return;
        }

        setAnalytics({
          ...analyticsResponse,
          userGrowth: normalizeChartData(analyticsResponse.userGrowth),
        });
        setHealth(healthResponse);
        setLogs(logsResponse.slice(0, 5));
      } catch (error) {
        if (isMounted) {
          addToast(error.message || 'Unable to load admin overview', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const tradeColumns = useMemo(
    () => [
      { header: 'Type', accessor: 'type' },
      { header: 'Master', accessor: 'master' },
      { header: 'Instrument', accessor: 'symbol' },
      { header: 'Qty', accessor: 'qty' },
      { header: 'Value', accessor: 'price', cell: (row) => formatCurrency((row.price || 0) * (row.qty || 0)) },
      { header: 'Time', accessor: 'timestamp' },
    ],
    [],
  );

  const topMasters = analytics.topMasters?.length
    ? analytics.topMasters
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">Platform analytics and operational monitoring</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={analytics.totalUsers} icon={Users} changeLabel="from /admin/analytics" />
        <StatCard
          title="Active Masters"
          value={analytics.activeMasters}
          icon={TrendingUp}
          gradient="from-cyan-500 to-teal-500"
          changeLabel="live master count"
        />
        <StatCard
          title="Volume Today"
          value={analytics.volumeToday}
          prefix="Rs."
          isCurrency
          icon={IndianRupee}
          gradient="from-emerald-500 to-teal-500"
          changeLabel="today's trade volume"
        />
        <StatCard
          title="Revenue MTD"
          value={analytics.revenueMtd}
          prefix="Rs."
          isCurrency
          icon={Activity}
          gradient="from-teal-500 to-cyan-500"
          changeLabel="month-to-date"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <GlassCard title="User Growth" subtitle="Live data from /api/v1/admin/analytics">
          <LineChart data={analytics.userGrowth} xKey="date" yKey="totalUsers" height={250} />
        </GlassCard>

        <GlassCard title="System Health" subtitle="Live data from /api/v1/admin/system-health">
          <div className="space-y-3">
            {health.length ? (
              health.map((service) => (
                <div key={service.id} className="flex items-center justify-between rounded-lg bg-black/5 p-3 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <span>{service.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {service.metric || (service.latency ? `${service.latency}ms` : service.uptime)}
                    </span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        String(service.status).toLowerCase().includes('online') || String(service.status).toLowerCase().includes('healthy')
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : String(service.status).toLowerCase().includes('degraded')
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {service.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-black/5 p-6 text-center text-sm text-muted-foreground dark:bg-white/5">
                No system health data available
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Recent Trade Activity" subtitle="Latest rows from /api/v1/admin/trade-logs">
        <DataTable columns={tradeColumns} data={logs} pagination={false} />
      </GlassCard>

      <GlassCard title="Top Masters" subtitle="Derived from /api/v1/admin/analytics when available">
        {topMasters.length ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {topMasters.map((master, index) => (
              <div key={master.id || master.masterId || index} className="rounded-lg bg-black/5 p-4 dark:bg-white/5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg font-bold text-emerald-400">#{index + 1}</span>
                  <span className="font-medium">{master.name || master.masterName || 'Master'}</span>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(master.volume || master.tradeVolume || 0)}</p>
                <p className="text-sm text-muted-foreground">
                  {master.trades || master.tradeCount || 0} trades
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-black/5 p-6 text-center text-sm text-muted-foreground dark:bg-white/5">
            No ranked master analytics available yet
          </div>
        )}
      </GlassCard>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading live admin overview...</div>
      )}
    </div>
  );
};

export default Overview;
