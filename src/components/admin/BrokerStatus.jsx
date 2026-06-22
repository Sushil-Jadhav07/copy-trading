import { useEffect, useState } from 'react';
import { AlertTriangle, Link2, RefreshCw } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import RefreshButton from '@/components/shared/RefreshButton';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const fmtDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const statusMeta = (value) => {
  const normalized = String(value || '').toUpperCase();
  if (['UP', 'OK', 'CONNECTED', 'ACTIVE'].includes(normalized)) {
    return { dot: 'bg-emerald-500', label: normalized };
  }
  if (['UNKNOWN', 'DISABLED'].includes(normalized)) {
    return { dot: 'bg-slate-400', label: normalized || 'UNKNOWN' };
  }
  return { dot: 'bg-rose-500', label: normalized || 'DOWN' };
};

const InfoRow = ({ label, value }) => (
  <div className="flex items-center justify-between gap-4">
    <span className="text-slate-500 dark:text-muted-foreground">{label}</span>
    <span className="font-semibold text-slate-900 dark:text-foreground">{value || '—'}</span>
  </div>
);

const BrokerCard = ({ broker }) => {
  const meta = statusMeta(broker.status);
  return (
    <article className={`${panelClass} p-5`}>
      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-foreground">{broker.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-400 dark:text-muted-foreground">
                <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                <span>{meta.label}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <InfoRow label="Account" value={broker.account} />
          <InfoRow label="Token Expiry" value={fmtDateTime(broker.tokenExpiry)} />
          <InfoRow label="Last Sync" value={fmtDateTime(broker.lastSync)} />
          <InfoRow label="Ping" value={broker.ping != null ? `${broker.ping}ms` : '—'} />
        </div>
      </div>
    </article>
  );
};

const BrokerStatus = () => {
  const { addToast } = useToast();
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    try {
      const data = await adminService.getBrokerStatus();
      setBrokers(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (error) {
      setBrokers([]);
      setLoadError(error.message || 'Unable to load broker status');
      addToast(error.message || 'Unable to load broker status', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  return (
    <div className="space-y-6">
      <section className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
            Broker Status
          </h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
            Per-broker connection status, token expiry, and last sync details.
          </p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
      </section>

      {loadError ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-600 dark:text-rose-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <GlassCard key={item} className="min-h-[220px] animate-pulse" />
          ))}
        </div>
      ) : brokers.length === 0 ? (
        <div className="rounded-2xl border border-border bg-black/5 px-5 py-10 text-center text-sm text-muted-foreground dark:bg-white/5">
          No broker status rows returned by the backend.
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {brokers.map((broker) => (
            <BrokerCard key={broker.id} broker={broker} />
          ))}
        </section>
      )}
    </div>
  );
};

export default BrokerStatus;
