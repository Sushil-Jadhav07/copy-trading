import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Users } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { openPositions, followers, formatCurrency } from '@/data/mockData';
import { useToast } from '@/components/shared/Toast';

// How many active followers are copying each position
const CHILD_COPY_MAP = {
  1: [{ init: 'AK', name: 'Amit Kumar', multiplier: 1.0, qty: 100 }, { init: 'RV', name: 'Rajesh Verma', multiplier: 2.0, qty: 200 }, { init: 'SG', name: 'Sanjay Gupta', multiplier: 0.5, qty: 50 }],
  2: [{ init: 'DS', name: 'Deepika Singh', multiplier: 1.0, qty: 50 }, { init: 'NS', name: 'Neha Sharma', multiplier: 0.5, qty: 25 }],
  3: [{ init: 'AK', name: 'Amit Kumar', multiplier: 1.0, qty: 200 }, { init: 'RV', name: 'Rajesh Verma', multiplier: 2.0, qty: 400 }, { init: 'DS', name: 'Deepika Singh', multiplier: 1.0, qty: 200 }, { init: 'SG', name: 'Sanjay Gupta', multiplier: 1.0, qty: 200 }],
  4: [{ init: 'AK', name: 'Amit Kumar', multiplier: 0.5, qty: 150 }, { init: 'RV', name: 'Rajesh Verma', multiplier: 1.0, qty: 300 }],
  5: [{ init: 'SG', name: 'Sanjay Gupta', multiplier: 1.5, qty: 225 }, { init: 'DS', name: 'Deepika Singh', multiplier: 1.0, qty: 150 }],
};

const OpenPositions = () => {
  const { addToast } = useToast();
  const [positions, setPositions] = useState(openPositions);
  const [closeModal, setCloseModal] = useState(false);
  const [selectedPos, setSelectedPos] = useState(null);
  const [childDetailModal, setChildDetailModal] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [selectedInstrument, setSelectedInstrument] = useState('');

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) =>
        prev.map((pos) => {
          const change = (Math.random() - 0.48) * 1.5;
          const newLtp = +(pos.ltp + change).toFixed(2);
          const newUnrealized = +((newLtp - pos.avgPrice) * pos.qty).toFixed(2);
          const newChange = +(((newLtp - pos.avgPrice) / pos.avgPrice) * 100).toFixed(2);
          return { ...pos, ltp: newLtp, unrealizedPnl: newUnrealized, change: newChange };
        })
      );
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const confirmClose = () => {
    setPositions((prev) => prev.filter((p) => p.id !== selectedPos.id));
    setCloseModal(false);
    addToast(`${selectedPos.instrument} position closed`, 'success');
  };

  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const activeFollowers = followers.filter((f) => f.status === 'Active').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Open Positions</h1>
        <p className="text-muted-foreground">Your live positions — followers are copying these in real-time</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open Positions', value: positions.length },
          { label: 'Unrealized P&L', value: formatCurrency(Math.abs(totalUnrealized)), color: totalUnrealized >= 0 ? 'text-success' : 'text-danger' },
          { label: 'Followers Copying', value: activeFollowers, color: 'text-brand-purple' },
          { label: 'Total Child Positions', value: Object.values(CHILD_COPY_MAP).reduce((s, arr) => s + arr.length, 0), color: 'text-brand-blue' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['#', 'Instrument', 'Type', 'Qty', 'Avg Price', 'LTP', 'Unrealized P&L', 'Change%', 'Children Copying', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, idx) => {
                const childList = CHILD_COPY_MAP[pos.id] || [];
                return (
                  <motion.tr key={pos.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{pos.instrument}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${pos.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>
                        {pos.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{pos.qty}</td>
                    <td className="px-4 py-3 text-sm">₹{pos.avgPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-mono font-medium">
                      ₹{pos.ltp.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${pos.unrealizedPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {pos.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${pos.change >= 0 ? 'text-success' : 'text-danger'}`}>
                        {pos.change >= 0 ? '+' : ''}{pos.change.toFixed(2)}%
                      </span>
                    </td>

                    {/* Children Copying column */}
                    <td className="px-4 py-3">
                      {childList.length > 0 ? (
                        <button onClick={() => { setSelectedChildren(childList); setSelectedInstrument(pos.instrument); setChildDetailModal(true); }}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                          <div className="flex -space-x-1">
                            {childList.slice(0, 3).map((c) => (
                              <div key={c.init} className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue border border-background flex items-center justify-center">
                                <span className="text-foreground font-bold" style={{ fontSize: '7px' }}>{c.init}</span>
                              </div>
                            ))}
                            {childList.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-white/20 border border-background flex items-center justify-center">
                                <span className="text-foreground text-xs">+{childList.length - 3}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-brand-purple font-medium">{childList.length}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <button onClick={() => { setSelectedPos(pos); setCloseModal(true); }}
                        className="px-3 py-1 bg-danger/20 hover:bg-danger/30 border border-danger/30 text-danger rounded text-xs font-bold transition-colors">
                        Close
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
              {positions.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">No open positions</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Close Position Modal */}
      <Modal isOpen={closeModal} onClose={() => setCloseModal(false)} title="Close Position" size="sm">
        {selectedPos && (
          <div className="space-y-4">
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 text-sm">
              {[
                ['Instrument', selectedPos.instrument],
                ['Type', selectedPos.type],
                ['Qty', selectedPos.qty],
                ['LTP', `₹${selectedPos.ltp.toFixed(2)}`],
                ['Unrealized P&L', (selectedPos.unrealizedPnl >= 0 ? '+' : '') + formatCurrency(selectedPos.unrealizedPnl)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            {(CHILD_COPY_MAP[selectedPos.id] || []).length > 0 && (
              <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                ⚠️ {CHILD_COPY_MAP[selectedPos.id].length} follower(s) are copying this position. Closing will NOT automatically close their positions.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setCloseModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={confirmClose} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Close Position</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Children Detail Modal */}
      <Modal isOpen={childDetailModal} onClose={() => setChildDetailModal(false)} title={`Children copying ${selectedInstrument}`} size="md">
        <div className="space-y-3">
          {selectedChildren.map((c, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                  <span className="text-xs font-bold text-foreground">{c.init}</span>
                </div>
                <span className="text-sm font-medium">{c.name}</span>
              </div>
              <div className="text-right text-sm">
                <p className="text-amber-400 font-bold">{c.multiplier}x multiplier</p>
                <p className="text-muted-foreground text-xs">Qty: {c.qty}</p>
              </div>
            </div>
          ))}
          <button onClick={() => setChildDetailModal(false)} className="w-full py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors mt-2">Close</button>
        </div>
      </Modal>
    </div>
  );
};

export default OpenPositions;
