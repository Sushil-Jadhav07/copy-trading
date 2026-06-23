import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Link2, RefreshCw, TrendingUp, UserCheck, Users, Search, Crown, User } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import RefreshButton from '@/components/shared/RefreshButton';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
];

const statusBadge = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  PAUSED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  PENDING_APPROVAL: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

const MasterChildMap = () => {
  const { addToast } = useToast();
  const [masters, setMasters] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [masterFilter, setMasterFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getMasterChildMap();
      const list = response.masters || [];
      setMasters(list);
      if (list.length <= 3) setExpandedIds(new Set(list.map((m) => m.masterId)));
    } catch (error) {
      addToast(error.message || 'Unable to load master-child map', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);
  const handleRefresh = async () => { setRefreshing(true); await load(); };

  const toggle = (id) => setExpandedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const expandAll = () => setExpandedIds(new Set(masters.map((m) => m.masterId)));
  const collapseAll = () => setExpandedIds(new Set());

  const masterOptions = useMemo(() => [
    { value: 'ALL', label: 'All Masters' },
    ...masters.map((m) => ({ value: m.masterId, label: m.masterName })),
  ], [masters]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const st = statusFilter.toUpperCase();
    return masters
      .filter((m) => masterFilter === 'ALL' || String(m.masterId) === String(masterFilter))
      .map((m) => ({
        ...m,
        children: (m.children || []).filter((c) => {
          if (st !== 'ALL' && String(c.status || '').toUpperCase() !== st) return false;
          if (q && !c.name.toLowerCase().includes(q) && !(c.email || '').toLowerCase().includes(q)) return false;
          return true;
        }),
      }))
      .filter((m) => {
        if (q && m.masterName.toLowerCase().includes(q)) return true;
        if (q && (m.masterEmail || '').toLowerCase().includes(q)) return true;
        return m.children.length > 0 || !q;
      });
  }, [masters, masterFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const tm = filtered.length;
    const tc = filtered.reduce((s, m) => s + m.children.length, 0);
    const al = filtered.reduce((s, m) => s + m.children.filter((c) => c.status === 'ACTIVE').length, 0);
    const avg = tc ? (filtered.reduce((s, m) => s + m.children.reduce((cs, c) => cs + Number(c.scalingFactor || 0), 0), 0) / tc).toFixed(1) : '0';
    return { masters: tm, children: tc, active: al, avgScale: avg };
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Master-Child Map</h1>
          <p className="text-sm text-muted-foreground">Visual overview of master-follower relationships.</p>
        </div>
        <RefreshButton onClick={handleRefresh} loading={refreshing || loading} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Masters', value: stats.masters, icon: Crown, color: 'text-brand-purple', bg: 'bg-brand-purple/10' },
          { label: 'Linked Children', value: stats.children, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Active Links', value: stats.active, icon: Link2, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
          { label: 'Avg Multiplier', value: `${stats.avgScale}x`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{loading ? '…' : s.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email…"
            className="w-full rounded-xl border border-border bg-black/5 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground/50 focus:border-brand-purple focus:outline-none dark:bg-white/5" />
        </div>
        <DivSelect value={masterFilter} onChange={setMasterFilter} includeEmptyOption={false} options={masterOptions}
          triggerClassName="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm dark:bg-white/5" />
        <DivSelect value={statusFilter} onChange={setStatusFilter} includeEmptyOption={false} options={STATUS_OPTIONS}
          triggerClassName="rounded-xl border border-border bg-black/5 px-3 py-2 text-sm dark:bg-white/5" />
        <div className="flex gap-1.5 ml-auto">
          <button onClick={expandAll} className="rounded-lg bg-black/5 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10">Expand All</button>
          <button onClick={collapseAll} className="rounded-lg bg-black/5 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10">Collapse All</button>
        </div>
      </div>

      {/* Tree */}
      {loading ? (
        <GlassCard><p className="py-12 text-center text-sm text-muted-foreground">Loading relationships…</p></GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard><p className="py-12 text-center text-sm text-muted-foreground">No relationships match these filters.</p></GlassCard>
      ) : (
        <div className="space-y-4">
          {filtered.map((master) => {
            const isOpen = expandedIds.has(master.masterId);
            return (
              <GlassCard key={master.masterId} noPadding>
                {/* Master header */}
                <button type="button" onClick={() => toggle(master.masterId)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10">
                    <Crown className="h-4.5 w-4.5 text-brand-purple" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold truncate">{master.masterName}</p>
                      <span className="shrink-0 rounded-full bg-black/5 dark:bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {master.children.length} child{master.children.length !== 1 ? 'ren' : ''}
                      </span>
                    </div>
                    {master.masterEmail && <p className="text-xs text-muted-foreground truncate">{master.masterEmail}</p>}
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Children grid */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/40 bg-black/[0.02] dark:bg-white/[0.02] px-5 py-4">
                        {master.children.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No children match the current filters.</p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {master.children.map((child) => {
                              const st = String(child.status || '').toUpperCase();
                              const badge = statusBadge[st] || 'bg-black/5 text-muted-foreground border-border dark:bg-white/5';
                              return (
                                <div key={child.childId}
                                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3.5 py-3 transition-colors hover:border-border">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-semibold truncate">{child.name}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className={`inline-flex rounded-full border px-1.5 py-px text-[9px] font-bold ${badge}`}>
                                        {st.replace(/_/g, ' ')}
                                      </span>
                                      <span className="text-[10px] font-semibold text-muted-foreground">{Number(child.scalingFactor || 1).toFixed(1)}x</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MasterChildMap;
