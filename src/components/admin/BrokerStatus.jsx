import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Server, Wifi } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';

const StatusDot = ({ status }) => {
  const value = String(status || '').toLowerCase();
  const classes = value.includes('online') || value.includes('healthy')
    ? 'bg-emerald-400 animate-pulse'
    : value.includes('degraded')
    ? 'bg-amber-400 animate-pulse'
    : 'bg-red-400';

  return <span className={`h-2.5 w-2.5 rounded-full ${classes}`} />;
};

const BrokerStatus = () => {
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');

  const loadBrokerStatus = async () => {
    setLoading(true);

    try {
      const response = await brokerService.getAdminBrokerStatus();
      setServices(
        response.map((service, index) => ({
          id: service.id || service.name || `broker-${index}`,
          name: service.name || service.brokerName || service.broker || `Broker ${index + 1}`,
          status: service.status || service.health || 'UNKNOWN',
          latency: Number(service.latency || service.responseTime || 0),
          uptime: service.uptime || service.availability || 'N/A',
          ordersToday: Number(service.ordersToday || service.requestsToday || 0),
        }))
      );
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    } catch (error) {
      addToast(error.message || 'Unable to load broker status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrokerStatus();
  }, []);

  const summary = useMemo(() => {
    const online = services.filter((service) => {
      const status = String(service.status || '').toLowerCase();
      return status.includes('online') || status.includes('healthy');
    }).length;

    const avgLatency = services.length
      ? Math.round(services.reduce((sum, service) => sum + (service.latency || 0), 0) / services.length)
      : 0;

    return {
      total: services.length,
      online,
      avgLatency,
      issues: Math.max(services.length - online, 0),
    };
  }, [services]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Broker Status</h1>
          <p className="text-muted-foreground">Live broker and system health from the admin API</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Last updated: {lastRefresh || 'Not yet'}</span>
          <button
            onClick={loadBrokerStatus}
            className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Services', value: summary.total, icon: Server },
          { label: 'Online', value: summary.online, icon: CheckCircle2, color: 'text-emerald-400' },
          { label: 'Avg Latency', value: `${summary.avgLatency}ms`, icon: Wifi, color: 'text-cyan-400' },
          { label: 'Issues', value: summary.issues, icon: AlertTriangle, color: 'text-amber-400' },
        ].map((item) => (
          <GlassCard key={item.label}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                <item.icon className={`h-5 w-5 ${item.color || 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-xl font-bold ${item.color || ''}`}>{item.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.length ? (
          services.map((service) => (
            <div key={service.id} className="glass-card p-5 hover-lift">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Server className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-bold">{service.name}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <StatusDot status={service.status} />
                      <span className="text-xs font-medium text-muted-foreground">{service.status}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5">
                  <p className="text-xs text-muted-foreground">Latency</p>
                  <p className="mt-1 text-lg font-semibold text-cyan-400">
                    {service.latency ? `${service.latency}ms` : 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5">
                    <p className="text-xs text-muted-foreground">Uptime</p>
                    <p className="mt-1 text-sm font-semibold">{service.uptime || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg bg-black/5 p-3 dark:bg-white/5">
                    <p className="text-xs text-muted-foreground">Orders Today</p>
                    <p className="mt-1 text-sm font-semibold">{service.ordersToday || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <GlassCard className="xl:col-span-3">
            <div className="py-10 text-center text-sm text-muted-foreground">
              {loading ? 'Loading system health...' : 'No broker status data available'}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default BrokerStatus;
