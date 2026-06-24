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

const AccountRow = ({ account }) => {
  const meta = statusMeta(account.status);
  const userName = account.raw?.userName || account.account;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${meta.dot} flex-shrink-0`} title={meta.label} />
            <div>
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground font-mono">{account.account}</p>
            </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground sm:justify-end">
            <div className="flex flex-col text-right">
                <span>Expiry</span>
                <span className="font-medium text-foreground">{fmtDateTime(account.tokenExpiry)}</span>
            </div>
            <div className="flex flex-col text-right">
                <span>Sync</span>
                <span className="font-medium text-foreground">{fmtDateTime(account.lastSync)}</span>
            </div>
            <div className="flex flex-col text-right w-16">
                <span>Ping</span>
                <span className="font-medium text-foreground">{account.ping != null ? `${account.ping}ms` : '—'}</span>
            </div>
        </div>
    </div>
  );
};

const ExpandableBrokerCard = ({ brokerName, accounts }) => {
  const [expanded, setExpanded] = useState(false);
  const masters = accounts.filter(a => a.raw?.accountType === 'MASTER');
  const children = accounts.filter(a => a.raw?.accountType !== 'MASTER');

  const upCount = accounts.filter(a => ['UP', 'OK', 'CONNECTED', 'ACTIVE'].includes(String(a.status).toUpperCase())).length;

  return (
    <article className={`${panelClass} p-0 overflow-visible col-span-1 xl:col-span-3`}>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-5 focus:outline-none transition-colors hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 flex-shrink-0">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-foreground">{brokerName}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-400 dark:text-muted-foreground">
                <span>{accounts.length} Connected Accounts ({upCount} Active)</span>
              </div>
            </div>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-border/50 p-5 bg-black/[0.02] dark:bg-white/[0.02] space-y-6">
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Masters</h3>
                {masters.length === 0 ? <p className="text-sm text-muted-foreground">No masters connected.</p> : (
                    <div className="space-y-2">
                        {masters.map(a => <AccountRow key={a.id} account={a} />)}
                    </div>
                )}
            </div>
            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/50 pb-2">Children</h3>
                {children.length === 0 ? <p className="text-sm text-muted-foreground">No children connected.</p> : (
                    <div className="space-y-2">
                        {children.map(a => <AccountRow key={a.id} account={a} />)}
                    </div>
                )}
            </div>
        </div>
      )}
    </article>
  )
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
      ) : (() => {
        const groupedBrokers = Object.entries(
          brokers.reduce((acc, b) => {
            const brokerName = b.brokerId || b.name || 'Unknown Broker';
            if (!acc[brokerName]) acc[brokerName] = [];
            acc[brokerName].push(b);
            return acc;
          }, {})
        ).map(([name, accounts]) => ({ name, accounts }));

        return (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {groupedBrokers.map(({ name, accounts }) => (
              <ExpandableBrokerCard key={name} brokerName={name} accounts={accounts} />
            ))}
          </section>
        );
      })()}
    </div>
  );
};

export default BrokerStatus;
