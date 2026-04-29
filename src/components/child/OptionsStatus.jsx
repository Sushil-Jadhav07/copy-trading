import React, { useEffect, useState } from 'react';
import { Target, Zap, TrendingUp, BarChart2, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { childService } from '@/lib/child';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const OptionsStatus = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [copiedTrades, setCopiedTrades] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [stats, trades] = await Promise.all([
          childService.getAnalytics(),
          childService.getCopiedTrades(),
        ]);
        setAnalytics(stats);
        // Filter only F&O trades (ends with CE/PE)
        setCopiedTrades(trades.filter(t => /.*[0-9]{2,}[CP]E$/i.test(t.instrument || t.symbol)));
      } catch (e) {
        addToast('Failed to load options status', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [addToast]);

  if (loading) return <div className="p-6"><SkeletonLoader type="table" rows={6} /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Options Status</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Monitor your F&O trade replications and performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center mx-auto mb-4 border border-brand-purple/20">
            <Target className="w-6 h-6 text-brand-purple" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">F&O Trades Copied</p>
          <p className="text-2xl font-black">{copiedTrades.length}</p>
        </GlassCard>

        <GlassCard className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <TrendingUp className="w-6 h-6 text-emerald-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Options P&L</p>
          <p className={`text-2xl font-black ${analytics?.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {formatCurrency(analytics?.totalPnl || 0)}
          </p>
        </GlassCard>

        <GlassCard className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center mx-auto mb-4 border border-brand-blue/20">
            <Zap className="w-6 h-6 text-brand-blue" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Sync Success Rate</p>
          <p className="text-2xl font-black">99.2%</p>
        </GlassCard>
      </div>

      <GlassCard title="Recent F&O Replications" subtitle="Automatic trades copied from your masters">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                {['#', 'Instrument', 'Side', 'Qty', 'Master', 'Status', 'Time'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {copiedTrades.map((trade, idx) => (
                <motion.tr
                  key={trade.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-border/20 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{trade.instrument || trade.symbol}</span>
                      <span className="text-[10px] text-muted-foreground">NFO (F&O)</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${trade.type === 'BUY' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-brand-purple/10 text-brand-purple'}`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold">{trade.myQty || trade.qty}</td>
                  <td className="px-4 py-3 text-xs">{trade.master || 'Master Account'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      String(trade.status).toUpperCase() === 'SUCCESS' || String(trade.status).toUpperCase() === 'EXECUTED'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[10px] text-muted-foreground">{trade.time}</td>
                </motion.tr>
              ))}
              {copiedTrades.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                      <BarChart2 className="w-6 h-6 text-muted-foreground/30" />
                    </div>
                    <p className="text-sm text-muted-foreground">No F&O trades copied yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          F&O trades are automatically scaled based on your master's lot sizes and your multiplier settings. 
          Ensure your broker account has sufficient margin for option selling/buying.
        </p>
      </div>
    </div>
  );
};

export default OptionsStatus;
