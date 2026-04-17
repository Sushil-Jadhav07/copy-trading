import React, { useEffect, useMemo, useState } from 'react';
import GlassCard from '@/components/shared/GlassCard';
import DataTable from '@/components/shared/DataTable';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { pnlService } from '@/lib/pnl';
import { useToast } from '@/components/shared/Toast';

const normalizeRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return payload ? [payload] : [];
};

const AdminPnL = () => {
  const { addToast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await pnlService.getAllPnl();
        setRows(normalizeRows(data));
      } catch (error) {
        addToast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [addToast]);

  const columns = useMemo(() => {
    const sample = rows[0] || {};
    return Object.keys(sample).map((key) => ({
      header: key.replace(/([A-Z])/g, ' $1').replace(/^./, (value) => value.toUpperCase()),
      accessor: key,
    }));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Platform P&L</h1>
        <p className="text-sm text-muted-foreground">Admin-wide profit and loss payload rendered as a table.</p>
      </div>

      <GlassCard title="Admin P&L Overview">
        {loading ? <SkeletonLoader type="table" rows={6} columns={6} /> : <DataTable columns={columns} data={rows} searchable emptyMessage="No platform P&L data returned" />}
      </GlassCard>
    </div>
  );
};

export default AdminPnL;
