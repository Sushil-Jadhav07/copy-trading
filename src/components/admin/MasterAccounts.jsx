import { useEffect, useMemo, useState } from 'react';
import { Eye, LoaderCircle, Pause, Play, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import SlideOver from '@/components/shared/SlideOver';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

// ADM-2: Pause/Resume copying for a specific master
// Endpoints needed (separate from activate/deactivate — master stays logged in):
//   PATCH /api/v1/admin/masters/{id}/pause   → { copyingPaused: true }
//   PATCH /api/v1/admin/masters/{id}/resume  → { copyingPaused: false }
// Until those exist: the copyingPaused column shows — and Pause/Resume buttons are disabled.

const StatusBadge = ({ status }) => {
  const upper = String(status || '').toUpperCase();
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${
        upper === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'
      }`}
    >
      {upper === 'ACTIVE' ? 'Active' : upper || 'Unknown'}
    </span>
  );
};

const CopyingBadge = () => (
  <span className="inline-flex rounded-full border border-slate-200/80 bg-slate-100/60 px-2.5 py-0.5 text-xs font-semibold text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-600">
    —
  </span>
);

const MasterAccounts = () => {
  const { addToast } = useToast();
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { users } = await adminService.getUsers({ role: 'MASTER' });
      setMasters(users);
    } catch (err) {
      addToast(err.message || 'Unable to load master accounts', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return masters;
    return masters.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.phone.toLowerCase().includes(q),
    );
  }, [search, masters]);

  const stats = useMemo(
    () => [
      { label: 'Total Masters', value: masters.length, color: 'text-foreground' },
      { label: 'Active', value: masters.filter((m) => m.status === 'ACTIVE').length, color: 'text-emerald-400' },
      { label: 'Inactive', value: masters.filter((m) => m.status !== 'ACTIVE').length, color: 'text-rose-400' },
      { label: 'Copy-Paused', value: '—', color: 'text-amber-400' },
    ],
    [masters],
  );

  const openDetail = async (master) => {
    setSelected(master);
    setPanelOpen(true);
    try {
      const latest = await adminService.getUser(master.userId);
      setSelected(latest);
    } catch (err) {
      addToast(err.message || 'Unable to load master details', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[2rem] font-semibold tracking-[-0.05em] text-slate-900 dark:text-foreground">
            Master Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-400 dark:text-muted-foreground">
            Live master list with copy-trading pause controls.
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="self-start rounded-xl border border-border bg-black/5 px-4 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-5 py-3 text-xs text-amber-600 dark:text-amber-400">
        Pause/Resume buttons are disabled until{' '}
        <code className="rounded bg-black/5 px-1 py-0.5 font-mono dark:bg-white/5">
          PATCH /api/v1/admin/masters/{'{id}'}/pause|resume
        </code>{' '}
        endpoints are available. Pausing copying is separate from account deactivation.
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`mt-1 text-2xl font-bold ${s.color}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, email, phone…"
          className="w-full rounded-xl border border-border bg-black/5 py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none dark:bg-white/5"
        />
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-black/[0.03] dark:bg-white/[0.03]">
                {['#', 'Master', 'Account Status', 'Copying', 'Phone', 'Brokers', 'Joined', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16">
                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading masters…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    {masters.length === 0 ? 'No master accounts yet.' : 'No masters match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((master, idx) => (
                  <motion.tr
                    key={master.userId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.025 }}
                    className="border-b border-border/30 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-bold text-white">
                          {master.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{master.name}</p>
                          <p className="text-xs text-muted-foreground">{master.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={master.status} />
                    </td>
                    <td className="px-4 py-3">
                      <CopyingBadge />
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{master.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {Array.isArray(master.brokerAccounts) ? master.brokerAccounts.length : 0}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
                      {master.joinedDate}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openDetail(master)}
                          title="View details"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/5 transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          disabled
                          title="Not yet connected to backend"
                          className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg bg-amber-500/10 opacity-50"
                        >
                          <Pause className="h-3.5 w-3.5 text-amber-400" />
                        </button>
                        <button
                          disabled
                          title="Not yet connected to backend"
                          className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg bg-emerald-500/10 opacity-50"
                        >
                          <Play className="h-3.5 w-3.5 text-emerald-400" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <SlideOver isOpen={panelOpen} onClose={() => setPanelOpen(false)} title="Master Details" size="md">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-2xl font-bold text-white">
                {selected.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <p className="text-sm text-muted-foreground">{selected.email}</p>
                <div className="mt-1">
                  <StatusBadge status={selected.status} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ['User ID', selected.userId],
                ['Phone', selected.phone || '—'],
                ['Account Status', selected.status],
                ['Copying Status', '—'],
                ['Joined', selected.joinedDate],
                ['Broker Accounts', Array.isArray(selected.brokerAccounts) ? selected.brokerAccounts.length : 0],
                ['Two-Factor Auth', selected.twoFactorEnabled ? 'Enabled' : 'Disabled'],
              ].map(([key, value]) => (
                <div key={key} className="rounded-xl bg-black/5 p-3 dark:bg-white/5">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="mt-0.5 break-all text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
              Pause/Resume requires{' '}
              <code className="font-mono">PATCH /api/v1/admin/masters/{'{id}'}/pause|resume</code>. Currently disabled.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                disabled
                title="Not yet connected to backend"
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-amber-500/10 py-3 text-sm font-medium text-amber-400 opacity-60"
              >
                <Pause className="h-4 w-4" />
                Pause Copying
              </button>
              <button
                disabled
                title="Not yet connected to backend"
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-emerald-500/10 py-3 text-sm font-medium text-emerald-400 opacity-60"
              >
                <Play className="h-4 w-4" />
                Resume Copying
              </button>
            </div>
          </div>
        )}
      </SlideOver>
    </div>
  );
};

export default MasterAccounts;
