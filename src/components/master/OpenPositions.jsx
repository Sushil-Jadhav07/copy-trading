import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { brokerService } from '@/lib/broker';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';
import { connectChannel } from '@/lib/websocket';

const OpenPositions = () => {
  const { addToast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [positions, setPositions] = useState([]);
  const [closeModal, setCloseModal] = useState(false);
  const [selectedPos, setSelectedPos] = useState(null);
  const [childDetailModal, setChildDetailModal] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [selectedInstrument, setSelectedInstrument] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    brokerService.getAccounts().then((data) => {
      setAccounts(data);
      setSelectedAccountId(data[0]?.accountId || '');
    }).catch((error) => addToast(error.message, 'error'));
  }, [addToast]);

  useEffect(() => {
    if (!selectedAccountId) return;
    let isMounted = true;
    setLoading(true);
    brokerService.getPositions(selectedAccountId).then((data) => {
      if (isMounted) setPositions(data);
    }).catch((error) => addToast(error.message, 'error')).finally(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [selectedAccountId, addToast]);

  useEffect(() => {
    const sub = connectChannel(
      'positions',
      (event, data) => {
        if (event === 'POSITION_UPDATE' || event === 'position_update' || event === 'MESSAGE') {
          setPositions((prev) =>
            prev.map((position) =>
              position.symbol === data.symbol ? { ...position, ...data } : position
            )
          );
        }
      },
      null,
      null,
    );

    return () => sub.close();
  }, []);

  const confirmClose = async () => {
    if (!selectedPos) return;
    try {
      await brokerService.closePosition(selectedAccountId, {
        symbol: selectedPos.symbol || selectedPos.instrument,
        qty: selectedPos.qty,
        type: 'SELL',
        product: selectedPos.market || 'MIS',
      });
      setPositions((prev) => prev.filter((p) => p.id !== selectedPos.id));
      setCloseModal(false);
      addToast(`${selectedPos.instrument} position closed`, 'success');
    } catch (e) {
      addToast(e.message || 'Failed to close position', 'error');
      setCloseModal(false);
    }
  };

  const totalUnrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Open Positions</h1>
          <p className="text-sm text-muted-foreground">Your live positions — followers are copying these in real-time</p>
        </div>
        {accounts.length > 1 && (
          <select 
            value={selectedAccountId} 
            onChange={(e) => setSelectedAccountId(e.target.value)} 
            className="w-full sm:w-auto bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple"
          >
            {accounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.broker} - {account.nickname}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[{ label: 'Open Positions', value: positions.length }, { label: 'Unrealized P&L', value: formatCurrency(Math.abs(totalUnrealized)), color: totalUnrealized >= 0 ? 'text-success' : 'text-danger' }, { label: 'Followers Copying', value: positions.reduce((sum, pos) => sum + (Array.isArray(pos.children) ? pos.children.length : 0), 0), color: 'text-brand-purple' }, { label: 'Total Child Positions', value: positions.reduce((sum, pos) => sum + (Array.isArray(pos.children) ? pos.children.length : 0), 0), color: 'text-brand-blue' }].map((s) => <GlassCard key={s.label}><p className="text-xs text-muted-foreground">{s.label}</p><p className={`text-xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p></GlassCard>)}
      </div>

      <GlassCard noPadding>
        {loading ? <div className="p-4"><SkeletonLoader type="table" rows={5} columns={10} /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border/50">{['#', 'Instrument', 'Type', 'Qty', 'Avg Price', 'LTP', 'Unrealized P&L', 'Change%', 'Children Copying', 'Action'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>
                {positions.map((pos, idx) => {
                  const childList = Array.isArray(pos.children) ? pos.children : [];
                  return (
                    <motion.tr key={pos.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} className="border-b border-border/30 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-sm">{pos.instrument}</td>
                      <td className="px-4 py-3"><span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${pos.type === 'BUY' ? 'bg-success/20 text-success border-success/30' : 'bg-danger/20 text-danger border-danger/30'}`}>{pos.type}</span></td>
                      <td className="px-4 py-3 text-sm">{pos.qty}</td>
                      <td className="px-4 py-3 text-sm">₹{pos.avgPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium">₹{pos.ltp.toFixed(2)}</td>
                      <td className="px-4 py-3"><span className={`text-sm font-semibold ${pos.unrealizedPnl >= 0 ? 'text-success' : 'text-danger'}`}>{pos.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(pos.unrealizedPnl)}</span></td>
                      <td className="px-4 py-3"><span className={`text-sm font-semibold ${pos.change >= 0 ? 'text-success' : 'text-danger'}`}>{pos.change >= 0 ? '+' : ''}{pos.change.toFixed(2)}%</span></td>
                      <td className="px-4 py-3">{childList.length > 0 ? <button onClick={() => { setSelectedChildren(childList); setSelectedInstrument(pos.instrument); setChildDetailModal(true); }} className="text-xs text-brand-purple font-medium">{childList.length}</button> : <span className="text-xs text-muted-foreground">None</span>}</td>
                      <td className="px-4 py-3"><button onClick={() => { setSelectedPos(pos); setCloseModal(true); }} className="px-3 py-1 bg-danger/20 hover:bg-danger/30 border border-danger/30 text-danger rounded text-xs font-bold transition-colors">Close</button></td>
                    </motion.tr>
                  );
                })}
                {positions.length === 0 && <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">No open positions</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal isOpen={closeModal} onClose={() => setCloseModal(false)} title="Close Position" size="sm">
        {selectedPos && <div className="space-y-4"><div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 text-sm">{[['Instrument', selectedPos.instrument], ['Type', selectedPos.type], ['Qty', selectedPos.qty], ['LTP', `₹${selectedPos.ltp.toFixed(2)}`], ['Unrealized P&L', (selectedPos.unrealizedPnl >= 0 ? '+' : '') + formatCurrency(selectedPos.unrealizedPnl)]].map(([k, v]) => <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>)}</div><div className="flex gap-3"><button onClick={() => setCloseModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button><button onClick={confirmClose} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">Close Position</button></div></div>}
      </Modal>

      <Modal isOpen={childDetailModal} onClose={() => setChildDetailModal(false)} title={`Children copying ${selectedInstrument}`} size="md">
        <div className="space-y-3">
          {selectedChildren.map((c, idx) => <div key={idx} className="flex items-center justify-between p-3 bg-black/5 dark:bg-white/5 rounded-lg"><span className="text-sm font-medium">{c.name || c.childName || `Child ${idx + 1}`}</span><div className="text-right text-sm"><p className="text-amber-400 font-bold">{c.multiplier || 1}x multiplier</p><p className="text-muted-foreground text-xs">Qty: {c.qty || 0}</p></div></div>)}
          <button onClick={() => setChildDetailModal(false)} className="w-full py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors mt-2">Close</button>
        </div>
      </Modal>
    </div>
  );
};

export default OpenPositions;
