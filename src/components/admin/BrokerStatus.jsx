import { useEffect, useState } from 'react';
import { AlertTriangle, ChevronDown, Link2, Wifi, WifiOff } from 'lucide-react';
import RefreshButton from '@/components/shared/RefreshButton';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const fmtDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const isActive = (status) =>
  ['UP', 'OK', 'CONNECTED', 'ACTIVE'].includes(String(status || '').toUpperCase());

const BrokerIcon = ({ name, active }) => {
  const initials = String(name || '?').slice(0, 2).toUpperCase();
  return (
    <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold tracking-wide transition-colors ${
      active
        ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
        : 'bg-white/5 text-muted-foreground ring-1 ring-white/10'
    }`}>
      {initials}
    </div>
  );
};

const StatusPill = ({ active, count }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
    active
      ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
      : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-400' : 'bg-rose-400'} animate-pulse`} />
    {active ? `${count} Active` : 'Inactive'}
  </span>
);

const AccountRow = ({ account }) => {
  const active = isActive(account.status);
  const userName = account.raw?.userName || account.account || '—';
  const accountType = account.raw?.accountType || 'CHILD';

  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.025] px-4 py-3 transition-colors hover:bg-white/[0.04]">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${active ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{userName}</p>
          <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground/60">{account.account}</p>
        </div>
        <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          accountType === 'MASTER'
            ? 'bg-brand-purple/10 text-brand-purple'
            : 'bg-white/5 text-muted-foreground'
        }`}>
          {accountType}
        </span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-5 text-xs text-muted-foreground">
        <div className="hidden text-right sm:block">
          <p className="text-[10px] uppercase tracking-wide opacity-60">Expiry</p>
          <p className="mt-0.5 font-medium text-foreground">{fmtDateTime(account.tokenExpiry)}</p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-[10px] uppercase tracking-wide opacity-60">Last Sync</p>
          <p className="mt-0.5 font-medium text-foreground">{fmtDateTime(account.lastSync)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide opacity-60">Ping</p>
          <p className={`mt-0.5 font-semibold ${
            account.ping == null ? 'text-muted-foreground' :
            account.ping < 100 ? 'text-emerald-400' :
            account.ping < 300 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {account.ping != null ? `${account.ping}ms` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

const BrokerCard = ({ brokerName, accounts }) => {
  const [expanded, setExpanded] = useState(false);
  const activeCount = accounts.filter(a => isActive(a.status)).length;
  const totalCount = accounts.length;
  const allActive = activeCount === totalCount;
  const noneActive = activeCount === 0;
  const activePct = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  const masters = accounts.filter(a => a.raw?.accountType === 'MASTER');
  const children = accounts.filter(a => a.raw?.accountType !== 'MASTER');
  const avgPing = (() => {
    const pings = accounts.map(a => a.ping).filter(p => p != null);
    return pings.length ? Math.round(pings.reduce((s, v) => s + v, 0) / pings.length) : null;
  })();

  return (
    <article className="glass-card overflow-hidden p-0">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left focus:outline-none"
      >
        <div className="flex items-center justify-between gap-4 px-5 py-5 transition-colors hover:bg-white/[0.02]">
          <div className="flex min-w-0 items-center gap-4">
            <BrokerIcon name={brokerName} active={!noneActive} />
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                  {brokerName}
                </h2>
                <StatusPill active={!noneActive} count={activeCount} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {totalCount} account{totalCount !== 1 ? 's' : ''} · {masters.length} master{masters.length !== 1 ? 's' : ''} · {children.length} child{children.length !== 1 ? 'ren' : ''}
              </p>
            </div>
          </div>

          {/* Right stats */}
          <div className="flex flex-shrink-0 items-center gap-6">
            <div className="hidden flex-col items-end gap-1.5 sm:flex">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{activeCount}/{totalCount} active</span>
                <span className={`text-xs font-semibold ${allActive ? 'text-emerald-400' : noneActive ? 'text-rose-400' : 'text-amber-400'}`}>
                  {activePct}%
                </span>
              </div>
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${allActive ? 'bg-emerald-500' : noneActive ? 'bg-rose-500' : 'bg-amber-500'}`}
                  style={{ width: `${activePct}%` }}
                />
              </div>
            </div>

            {avgPing != null && (
              <div className="hidden flex-col items-end sm:flex">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">Avg Ping</p>
                <p className={`text-sm font-semibold ${avgPing < 100 ? 'text-emerald-400' : avgPing < 300 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {avgPing}ms
                </p>
              </div>
            )}

            <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-foreground/50 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Active ratio bar at card bottom edge */}
        <div className="h-[2px] w-full bg-white/5">
          <div
            className={`h-full transition-all duration-500 ${allActive ? 'bg-emerald-500/60' : noneActive ? 'bg-rose-500/60' : 'bg-amber-500/60'}`}
            style={{ width: `${activePct}%` }}
          />
        </div>
      </button>

      {/* Expanded accounts */}
      {expanded && (
        <div className="border-t border-white/[0.06] bg-black/[0.03] dark:bg-white/[0.015] px-5 py-5 space-y-5">
          {masters.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                <span className="h-px flex-1 bg-white/[0.06]" />
                Masters
                <span className="h-px flex-1 bg-white/[0.06]" />
              </p>
              <div className="space-y-1.5">
                {masters.map(a => <AccountRow key={a.id} account={a} />)}
              </div>
            </div>
          )}
          {children.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                <span className="h-px flex-1 bg-white/[0.06]" />
                Children
                <span className="h-px flex-1 bg-white/[0.06]" />
              </p>
              <div className="space-y-1.5">
                {children.map(a => <AccountRow key={a.id} account={a} />)}
              </div>
            </div>
          )}
        </div>
      )}
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

  useEffect(() => { load(); }, []);
  const handleRefresh = async () => { setRefreshing(true); await load(); };

  const groupedBrokers = Object.entries(
    brokers.reduce((acc, b) => {
      const key = b.brokerId || b.name || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {})
  ).map(([name, accounts]) => ({ name, accounts }));

  const totalAccounts = brokers.length;
  const totalActive = brokers.filter(b => isActive(b.status)).length;
  const totalBrokers = groupedBrokers.length;

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Summary strip */}
      {!loading && brokers.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Link2, label: 'Brokers', value: totalBrokers, color: 'text-brand-purple', bg: 'bg-brand-purple/10' },
            { icon: Wifi, label: 'Active Accounts', value: totalActive, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: WifiOff, label: 'Inactive', value: totalAccounts - totalActive, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="glass-card flex items-center gap-4 px-5 py-4">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {loadError && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-600 dark:text-rose-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card h-[76px] animate-pulse" />
          ))}
        </div>
      ) : brokers.length === 0 ? (
        <div className="glass-card px-5 py-10 text-center text-sm text-muted-foreground">
          No broker status data returned by the backend.
        </div>
      ) : (
        <div className="space-y-3">
          {groupedBrokers.map(({ name, accounts }) => (
            <BrokerCard key={name} brokerName={name} accounts={accounts} />
          ))}
        </div>
      )}
    </div>
  );
};

export default BrokerStatus;
