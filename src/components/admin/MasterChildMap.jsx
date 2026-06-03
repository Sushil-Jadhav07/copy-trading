import React, { useEffect, useMemo, useState } from 'react';
import { Link2, TrendingUp, UserCheck, Users } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import DivSelect from '@/components/shared/DivSelect';
import { useToast } from '@/components/shared/Toast';
import { adminService } from '@/lib/admin';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
];

const statusClass = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-400',
  PAUSED: 'bg-amber-500/15 text-amber-400',
  PENDING_APPROVAL: 'bg-brand-blue/15 text-brand-blue',
};

const MasterChildMap = () => {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const response = await adminService.getMasterChildMap();
        if (isMounted) {
          setRows(response.masters || []);
        }
      } catch (error) {
        if (isMounted) {
          addToast(error.message || 'Unable to load master-child map', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [addToast]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'ALL') return rows;

    return rows
      .map((master) => ({
        ...master,
        children: master.children.filter((child) => String(child.status || '').toUpperCase() === statusFilter),
      }))
      .filter((master) => master.children.length > 0);
  }, [rows, statusFilter]);

  const stats = useMemo(() => {
    const masters = filteredRows.length;
    const children = filteredRows.reduce((sum, master) => sum + master.children.length, 0);
    const activeLinks = filteredRows.reduce(
      (sum, master) => sum + master.children.filter((child) => child.status === 'ACTIVE').length,
      0
    );
    const avgScaling = children
      ? (
          filteredRows.reduce(
            (sum, master) => sum + master.children.reduce((childSum, child) => childSum + Number(child.scalingFactor || 0), 0),
            0
          ) / children
        ).toFixed(2)
      : '0.00';

    return [
      { label: 'Masters', value: masters, icon: Users, color: 'text-foreground' },
      { label: 'Linked Children', value: children, icon: UserCheck, color: 'text-emerald-400' },
      { label: 'Active Links', value: activeLinks, icon: Link2, color: 'text-brand-blue' },
      { label: 'Avg Scaling', value: `${avgScaling}x`, icon: TrendingUp, color: 'text-amber-400' },
    ];
  }, [filteredRows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Master-Child Map</h1>
          <p className="text-sm text-muted-foreground">All current master-child relationships from the admin API.</p>
        </div>
        <DivSelect
          value={statusFilter}
          onChange={setStatusFilter}
          includeEmptyOption={false}
          options={STATUS_OPTIONS}
          triggerClassName="rounded-lg border border-border bg-black/5 px-3 py-2 text-sm focus:border-brand-purple dark:bg-white/5"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <GlassCard key={stat.label}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['Master', 'Email', 'Child', 'Child Email', 'Status', 'Scaling'].map((header) => (
                  <th key={header} className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-sm text-muted-foreground">
                    Loading relationships...
                  </td>
                </tr>
              ) : filteredRows.length ? (
                filteredRows.map((master) => (
                  <React.Fragment key={master.masterId}>
                    {master.children.map((child, index) => (
                      <tr key={`${master.masterId}-${child.childId}`} className="border-b border-border/30 transition-colors hover:bg-white/3">
                        <td className="px-4 py-3 align-top">
                          {index === 0 && (
                            <div>
                              <p className="text-sm font-semibold">{master.masterName}</p>
                              <p className="text-xs text-muted-foreground">
                                {master.children.length} linked child{master.children.length === 1 ? '' : 'ren'}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-sm text-muted-foreground">
                          {index === 0 ? master.masterEmail || '-' : ''}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">{child.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{child.email || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[child.status] || 'bg-white/10 text-muted-foreground'}`}>
                            {child.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">{Number(child.scalingFactor || 0).toFixed(2)}x</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No relationships available for this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default MasterChildMap;
