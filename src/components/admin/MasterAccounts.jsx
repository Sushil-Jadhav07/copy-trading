import { useEffect, useMemo, useState } from 'react';
import { Eye, LoaderCircle, Search, Trash2, UserCheck, UserX } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SlideOver from '@/components/shared/SlideOver';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

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

const MasterAccounts = () => {
  const { addToast } = useToast();
  const [masters, setMasters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [actionTarget, setActionTarget] = useState(null);

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
        (m.phone || '').toLowerCase().includes(q),
    );
  }, [search, masters]);

  const stats = useMemo(
    () => [
      { label: 'Total Masters', value: masters.length, color: 'text-foreground' },
      { label: 'Active', value: masters.filter((m) => m.status === 'ACTIVE').length, color: 'text-emerald-400' },
      { label: 'Inactive', value: masters.filter((m) => m.status !== 'ACTIVE').length, color: 'text-rose-400' },
    ],
    [masters],
  );

  const handleStatusToggle = async () => {
    if (!actionTarget) return;
    try {
      if (actionTarget.status === 'ACTIVE') {
        await adminService.deactivateUser(actionTarget.userId);
        addToast(`${actionTarget.name} deactivated`, 'success');
      } else {
        await adminService.activateUser(actionTarget.userId);
        addToast(`${actionTarget.name} activated`, 'success');
      }
      setStatusModal(false);
      await load(true);
    } catch (err) {
      addToast(err.message || 'Unable to update status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!actionTarget) return;
    try {
      await adminService.deleteUser(actionTarget.userId);
      addToast(`${actionTarget.name} deleted`, 'success');
      setDeleteModal(false);
      setPanelOpen(false);
      setSelected(null);
      await load(true);
    } catch (err) {
      addToast(err.message || 'Unable to delete user', 'error');
    }
  };

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                {['#', 'Master', 'Status', 'Phone', 'Brokers', 'Joined', 'Actions'].map((h) => (
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
                  <td colSpan={7} className="px-4 py-16">
                    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading masters…
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
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
                          onClick={() => { setActionTarget(master); setStatusModal(true); }}
                          title={master.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                            master.status === 'ACTIVE'
                              ? 'bg-amber-500/15 hover:bg-amber-500/25'
                              : 'bg-emerald-500/15 hover:bg-emerald-500/25'
                          }`}
                        >
                          {master.status === 'ACTIVE' ? (
                            <UserX className="h-3.5 w-3.5 text-amber-400" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                        </button>
                        <button
                          onClick={() => { setActionTarget(master); setDeleteModal(true); }}
                          title="Delete"
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 transition-colors hover:bg-red-500/25"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
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
                ['Status', selected.status],
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

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setActionTarget(selected); setStatusModal(true); }}
                className={`inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-colors ${
                  selected.status === 'ACTIVE'
                    ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                    : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                }`}
              >
                {selected.status === 'ACTIVE' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                {selected.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => { setActionTarget(selected); setDeleteModal(true); }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-500/15 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/25"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        )}
      </SlideOver>

      <Modal
        isOpen={statusModal}
        onClose={() => setStatusModal(false)}
        title={actionTarget?.status === 'ACTIVE' ? 'Deactivate Master' : 'Activate Master'}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {actionTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}{' '}
            <span className="font-semibold text-foreground">{actionTarget?.name}</span>?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setStatusModal(false)}
              className="flex-1 rounded-lg bg-black/5 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusToggle}
              className={`flex-1 rounded-lg py-2 text-sm font-medium text-white ${
                actionTarget?.status === 'ACTIVE' ? 'bg-amber-500 hover:bg-amber-500/90' : 'bg-emerald-500 hover:bg-emerald-500/90'
              }`}
            >
              {actionTarget?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Master" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete <span className="font-semibold text-foreground">{actionTarget?.name}</span>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setDeleteModal(false)}
              className="flex-1 rounded-lg bg-black/5 py-2 text-sm transition-colors hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button onClick={handleDelete} className="btn-danger flex-1 py-2 text-sm">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MasterAccounts;
