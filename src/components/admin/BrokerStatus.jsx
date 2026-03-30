import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';

const BROKERS = [
  { id: 1, name: 'Zerodha', code: 'zerodha', activeUsers: 1245, ordersToday: 8920, uptime: '99.8%' },
  { id: 2, name: 'Groww', code: 'groww', activeUsers: 430, ordersToday: 2100, uptime: '99.2%' },
  { id: 3, name: 'Angel One', code: 'angelone', activeUsers: 678, ordersToday: 4350, uptime: '97.5%' },
  { id: 4, name: 'Upstox', code: 'upstox', activeUsers: 892, ordersToday: 5670, uptime: '99.5%' },
  { id: 5, name: 'Dhan', code: 'dhan', activeUsers: 321, ordersToday: 1890, uptime: '98.9%' },
];

const INITIAL_STATUSES = {
  zerodha: { status: 'Online', latency: 45, trend: [] },
  groww: { status: 'Online', latency: 58, trend: [] },
  angelone: { status: 'Degraded', latency: 245, trend: [] },
  upstox: { status: 'Online', latency: 62, trend: [] },
  dhan: { status: 'Online', latency: 71, trend: [] },
};

const StatusDot = ({ status }) => {
  const cfg = {
    Online: 'bg-success animate-pulse',
    Degraded: 'bg-warning animate-pulse',
    Offline: 'bg-danger',
  };
  return <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg[status] || 'bg-muted'}`} />;
};

const LatencyBar = ({ latency }) => {
  const pct = Math.min((latency / 300) * 100, 100);
  const color = latency < 80 ? 'bg-success' : latency < 150 ? 'bg-warning' : 'bg-danger';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-semibold w-12 text-right ${latency < 80 ? 'text-success' : latency < 150 ? 'text-warning' : 'text-danger'}`}>
        {latency}ms
      </span>
    </div>
  );
};

const BrokerStatus = () => {
  const { addToast } = useToast();
  const [statuses, setStatuses] = useState(INITIAL_STATUSES);
  const [refreshing, setRefreshing] = useState({});
  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString('en-IN'));

  // Simulate live latency updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStatuses((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((k) => {
          const base = INITIAL_STATUSES[k].latency;
          const jitter = (Math.random() - 0.4) * 30;
          const newLat = Math.max(20, Math.round(base + jitter));
          const newStatus = newLat > 200 ? 'Degraded' : newLat > 400 ? 'Offline' : 'Online';
          updated[k] = {
            ...updated[k],
            latency: newLat,
            status: k === 'angelone' && Math.random() > 0.7 ? 'Degraded' : newStatus,
            trend: [...(updated[k].trend || []).slice(-9), newLat],
          };
        });
        return updated;
      });
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async (code) => {
    setRefreshing((p) => ({ ...p, [code]: true }));
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing((p) => ({ ...p, [code]: false }));
    addToast(`${code} API status refreshed`, 'success');
  };

  const handleRefreshAll = async () => {
    Object.keys(statuses).forEach((k) => setRefreshing((p) => ({ ...p, [k]: true })));
    await new Promise((r) => setTimeout(r, 1500));
    Object.keys(statuses).forEach((k) => setRefreshing((p) => ({ ...p, [k]: false })));
    addToast('All broker statuses refreshed', 'success');
  };

  const onlineCount = Object.values(statuses).filter((s) => s.status === 'Online').length;
  const avgLatency = Math.round(Object.values(statuses).reduce((s, v) => s + v.latency, 0) / Object.values(statuses).length);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Broker Status</h1>
          <p className="text-muted-foreground">Real-time API health monitoring for all brokers</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Last updated: {lastRefresh}</span>
          <button onClick={handleRefreshAll}
            className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Brokers', value: BROKERS.length, icon: Server },
          { label: 'Online', value: onlineCount, icon: CheckCircle2, color: 'text-success' },
          { label: 'Avg Latency', value: `${avgLatency}ms`, icon: Wifi, color: avgLatency < 100 ? 'text-success' : 'text-warning' },
          { label: 'Issues', value: Object.values(statuses).filter((s) => s.status !== 'Online').length, icon: AlertTriangle, color: 'text-warning' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <s.icon className={`w-5 h-5 ${s.color || 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold ${s.color || ''}`}>{s.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Broker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {BROKERS.map((broker, idx) => {
          const st = statuses[broker.code] || { status: 'Unknown', latency: 0 };
          return (
            <motion.div key={broker.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.07 }}
              className="glass-card p-5 hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-purple/20 flex items-center justify-center">
                    <Server className="w-5 h-5 text-brand-purple" />
                  </div>
                  <div>
                    <p className="font-bold">{broker.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusDot status={st.status} />
                      <span className={`text-xs font-medium ${
                        st.status === 'Online' ? 'text-success' :
                        st.status === 'Degraded' ? 'text-warning' : 'text-danger'
                      }`}>{st.status}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleRefresh(broker.code)}
                  className="p-1.5 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors">
                  <RefreshCw className={`w-4 h-4 text-muted-foreground ${refreshing[broker.code] ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>API Latency</span>
                    <span>Target: &lt;100ms</span>
                  </div>
                  <LatencyBar latency={st.latency} />
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/30">
                  {[
                    ['Active Users', broker.activeUsers.toLocaleString()],
                    ['Orders Today', broker.ordersToday.toLocaleString()],
                    ['Uptime', broker.uptime],
                  ].map(([k, v]) => (
                    <div key={k} className="text-center">
                      <p className="text-sm font-bold">{v}</p>
                      <p className="text-xs text-muted-foreground">{k}</p>
                    </div>
                  ))}
                </div>

                {/* Mini latency trend */}
                {st.trend?.length > 1 && (
                  <div className="flex items-end gap-0.5 h-8 pt-1">
                    {st.trend.map((val, i) => {
                      const h = Math.min((val / 300) * 100, 100);
                      const col = val < 80 ? 'bg-success/60' : val < 150 ? 'bg-warning/60' : 'bg-danger/60';
                      return <div key={i} className={`flex-1 rounded-sm ${col} transition-all duration-300`} style={{ height: `${h}%` }} />;
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Latency Target Info */}
      <GlassCard>
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-success" /><span className="text-muted-foreground">&lt; 80ms — Excellent</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-warning" /><span className="text-muted-foreground">80–200ms — Acceptable</span></div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-danger" /><span className="text-muted-foreground">&gt; 200ms — Degraded</span></div>
          <div className="ml-auto text-muted-foreground text-xs">PRD target: total system latency &lt; 100ms</div>
        </div>
      </GlassCard>
    </div>
  );
};

export default BrokerStatus;