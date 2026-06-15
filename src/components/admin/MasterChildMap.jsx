import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Link2, RefreshCw, TrendingUp, UserCheck, Users } from 'lucide-react';
import DivSelect from '@/components/shared/DivSelect';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
];

const panelClass = 'glass-card relative overflow-hidden rounded-[22px]';

const statusBadgeClass = {
  ACTIVE: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  PAUSED: 'border-amber-500/15 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  PENDING_APPROVAL: 'border-brand-purple/20 bg-brand-purple/10 text-brand-purple',
};

const getStatusLabel = (value) => String(value || '').replace(/_/g, ' ');

const MasterChildMap = () => {
  const { addToast } = useToast();
  const [masters, setMasters] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [masterFilter, setMasterFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedMasterId, setExpandedMasterId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.getMasterChildMap();
      const nextMasters = response.masters || [];
      setMasters(nextMasters);
      setExpandedMasterId((current) => current || nextMasters[0]?.masterId || null);
    } catch (error) {
      addToast(error.message || 'Unable to load master-child map', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const masterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Masters' },
      ...masters.map((master) => ({
        value: master.masterId,
        label: master.masterName,
      })),
    ],
    [masters],
  );

  const filteredMasters = useMemo(() => {
    const statusNormalized = statusFilter.toUpperCase();

    return masters
      .filter((master) => masterFilter === 'ALL' || String(master.masterId) === String(masterFilter))
      .map((master) => ({
        ...master,
        children:
          statusNormalized === 'ALL'
            ? master.children || []
            : (master.children || []).filter((child) => String(child.status || '').toUpperCase() === statusNormalized),
      }))
      .filter((master) => master.children.length > 0);
  }, [masters, masterFilter, statusFilter]);

  const stats = useMemo(() => {
    const totalMasters = filteredMasters.length;
    const totalChildren = filteredMasters.reduce((sum, master) => sum + master.children.length, 0);
    const activeLinks = filteredMasters.reduce(
      (sum, master) => sum + master.children.filter((child) => String(child.status || '').toUpperCase() === 'ACTIVE').length,
      0,
    );
    const avgScaling = totalChildren
      ? (
          filteredMasters.reduce(
            (sum, master) => sum + master.children.reduce((childSum, child) => childSum + Number(child.scalingFactor || 0), 0),
            0,
          ) / totalChildren
        ).toFixed(2)
      : '0.00';

    return [
      { label: 'Masters', value: totalMasters, icon: Users, tone: 'neutral' },
      { label: 'Linked Children', value: totalChildren, icon: UserCheck, tone: 'positive' },
      { label: 'Active Links', value: activeLinks, icon: Link2, tone: 'positive' },
      { label: 'Avg Scaling', value: `${avgScaling}x`, icon: TrendingUp, tone: 'warning' },
    ];
  }, [filteredMasters]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[1.65rem] font-semibold tracking-[-0.04em] text-slate-900 dark:text-foreground">Master-Child Map</h1>
          <p className="mt-1 text-xs text-slate-400 dark:text-muted-foreground">Browse relationships master-wise with child status and scaling visibility.</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <DivSelect
            value={masterFilter}
            onChange={setMasterFilter}
            includeEmptyOption={false}
            options={masterOptions}
            triggerClassName="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/[0.05]"
          />
          <DivSelect
            value={statusFilter}
            onChange={setStatusFilter}
            includeEmptyOption={false}
            options={STATUS_OPTIONS}
            triggerClassName="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/[0.05]"
          />
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.05] dark:text-foreground dark:hover:bg-white/[0.08]"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing || loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 pt-1 xl:grid-cols-4">
        {stats.map((stat) => (
          <article key={stat.label} className={`${panelClass} min-h-[88px] p-4`}>
            <div className="relative z-10 flex h-full items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  stat.tone === 'positive'
                    ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                    : stat.tone === 'warning'
                    ? 'bg-amber-500/12 text-amber-600 dark:text-amber-300'
                    : 'bg-brand-purple/10 text-brand-purple'
                }`}
              >
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-muted-foreground">{stat.label}</div>
                <div className="mt-1 text-[1.45rem] font-semibold leading-none tracking-[-0.03em] text-slate-900 dark:text-foreground">{stat.value}</div>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className={`${panelClass} p-0`}>
        <div className="relative z-10 border-b border-slate-200/70 px-4 py-3 dark:border-white/[0.06]">
          <h2 className="text-base font-semibold text-slate-900 dark:text-foreground">Masters</h2>
          <p className="mt-0.5 text-xs text-slate-400 dark:text-muted-foreground">Click a master to expand or collapse linked children.</p>
        </div>

        <div className="relative z-10 max-h-[680px] overflow-y-auto">
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">Loading relationships...</div>
          ) : filteredMasters.length ? (
            filteredMasters.map((master) => {
              const isExpanded = String(master.masterId) === String(expandedMasterId);

              return (
                <div
                  key={master.masterId}
                  className={`border-b border-slate-100/80 dark:border-white/[0.04] ${
                    isExpanded ? 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.04]' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedMasterId((current) =>
                        String(current) === String(master.masterId) ? null : master.masterId,
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className={`truncate text-[0.95rem] font-semibold ${isExpanded ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-foreground'}`}>
                          {master.masterName}
                        </div>
                        <span className="shrink-0 rounded-full border border-slate-200/80 bg-black/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-muted-foreground">
                          {master.children.length} child{master.children.length === 1 ? '' : 'ren'}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-muted-foreground">{master.masterEmail || '-'}</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-muted-foreground'}`} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-200/60 bg-black/[0.02] px-0 py-0 dark:border-white/[0.05] dark:bg-white/[0.02]">
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead className="bg-black/[0.02] dark:bg-white/[0.02]">
                            <tr className="border-b border-slate-200/70 dark:border-white/[0.06]">
                              {['Child', 'Child Email', 'Status', 'Scaling'].map((header) => (
                                <th
                                  key={header}
                                  className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 dark:text-muted-foreground/75"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {master.children.map((child, index) => (
                              <tr
                                key={`${master.masterId}-${child.childId}-inline`}
                                className={`border-b border-slate-100/80 transition-colors hover:bg-black/[0.02] dark:border-white/[0.04] dark:hover:bg-white/[0.03] ${
                                  index % 2 === 1 ? 'bg-black/[0.015] dark:bg-white/[0.02]' : ''
                                }`}
                              >
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-slate-900 dark:text-foreground">{child.name}</div>
                                </td>
                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-300">{child.email || '-'}</td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass[child.status] || 'border-slate-200/80 bg-black/5 text-slate-500 dark:border-white/10 dark:bg-white/[0.05] dark:text-muted-foreground'}`}>
                                    {getStatusLabel(child.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-xs font-semibold text-slate-900 dark:text-foreground">
                                  {Number(child.scalingFactor || 0).toFixed(2)}x
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-5 py-16 text-center text-sm text-slate-400 dark:text-muted-foreground">No relationships available for this filter.</div>
          )}
        </div>
      </section>
    </div>
  );
};

export default MasterChildMap;
