import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Link, Link2Off, Trash2, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import { brokerAccounts, copyTradingConfig, formatCurrency } from '@/data/mockData';

const MASTER_OPTIONS = brokerAccounts.map((a) => ({
  value: a.id,
  label: `${a.broker}-${a.userId}-${a.nickname}`,
}));

const CopyTrading = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [masterAccountId, setMasterAccountId] = useState('');
  const [masterConnected, setMasterConnected] = useState(false);
  const [masterInfo, setMasterInfo] = useState(null);
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [placeRejected, setPlaceRejected] = useState(false);
  const [selectedChild, setSelectedChild] = useState('');
  const [childMultiplier, setChildMultiplier] = useState('1');
  const [children, setChildren] = useState(copyTradingConfig.children);
  const [refreshing, setRefreshing] = useState({});
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [search, setSearch] = useState('');

  const childOptions = brokerAccounts.filter((a) => a.id !== masterAccountId);

  const handleConnectMaster = () => {
    if (!masterAccountId) { addToast('Please select a master account', 'error'); return; }
    if (masterConnected) {
      setMasterConnected(false);
      setMasterInfo(null);
      addToast('Master disconnected', 'warning');
    } else {
      const acc = brokerAccounts.find((a) => a.id === Number(masterAccountId));
      setMasterInfo(acc);
      setMasterConnected(true);
      addToast('Master connected successfully', 'success');
    }
  };

  const handleAddChild = () => {
    if (!selectedChild) { addToast('Please select a child account', 'error'); return; }
    const acc = brokerAccounts.find((a) => a.id === Number(selectedChild));
    if (!acc) return;
    if (children.find((c) => c.userId === acc.userId)) { addToast('Already added', 'warning'); return; }
    setChildren((p) => [...p, {
      id: Date.now(), userId: acc.userId, nickname: acc.nickname, broker: acc.brokerLabel,
      multiplier: Number(childMultiplier) || 1, tradingEnabled: true, placeRejected: false,
      pnlToday: 0, tradesCopied: 0, margin: acc.margin, positions: acc.positions,
    }]);
    setSelectedChild('');
    setChildMultiplier('1');
    addToast(`${acc.nickname} added as child`, 'success');
  };

  const handleToggleTrading = (id) => {
    setChildren((p) => p.map((c) => c.id === id ? { ...c, tradingEnabled: !c.tradingEnabled } : c));
  };

  const handleRefresh = async (id) => {
    setRefreshing((p) => ({ ...p, [id]: true }));
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing((p) => ({ ...p, [id]: false }));
    addToast('Refreshed', 'success');
  };

  const handleMultiplierChange = (id, val) => {
    setChildren((p) => p.map((c) => c.id === id ? { ...c, multiplier: val } : c));
  };

  const filtered = children.filter((c) =>
    !search || `${c.broker} ${c.userId} ${c.nickname}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Copy Trading</h1>
      </div>

      {/* Master Account Panel */}
      <GlassCard>
        {!masterConnected ? (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3">Master Account</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <select value={masterAccountId} onChange={(e) => setMasterAccountId(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                  <option value="" className="bg-background">Select Master Account</option>
                  {MASTER_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-background">{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <button onClick={handleConnectMaster}
                className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-foreground rounded-lg text-sm font-medium transition-colors">
                Connect
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <span className="font-bold text-lg uppercase">
                {masterInfo?.broker?.toUpperCase()}-{masterInfo?.userId}-{masterInfo?.nickname?.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <button onClick={handleConnectMaster}
                className="px-4 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">
                Disconnect
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setTradingEnabled((p) => !p)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${tradingEnabled ? 'bg-brand-purple' : 'bg-white/20'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tradingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium">Trading ON / OFF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setPlaceRejected((p) => !p)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${placeRejected ? 'bg-brand-purple' : 'bg-white/20'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${placeRejected ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium">Place Rejected Order Also</span>
              </label>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Child Accounts Panel */}
      <GlassCard>
        <p className="text-sm font-semibold text-muted-foreground mb-3">Child Accounts</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
              <option value="" className="bg-background">Select User Broker Child's</option>
              {childOptions.map((a) => (
                <option key={a.id} value={a.id} className="bg-background">
                  {a.broker}-{a.userId}-{a.nickname}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="w-32">
            <input type="number" value={childMultiplier} onChange={(e) => setChildMultiplier(e.target.value)}
              placeholder="Multiplier" min="0.1" step="0.1"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple" />
          </div>
          <button onClick={handleAddChild}
            className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-foreground rounded-lg text-sm font-medium transition-colors">
            Connect
          </button>
        </div>
      </GlassCard>

      {/* Children Table */}
      <GlassCard noPadding>
        <div className="p-4 border-b border-border/50 flex justify-end">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
            className="w-56 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['Id', 'Broker - User Id - User', 'Margin', 'P&L', 'Pos', 'Multiplier', 'Trading', 'Refresh', 'Demat', 'Connection', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((child, idx) => (
                <motion.tr key={child.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  className="border-b border-border/30 hover:bg-white/3 transition-colors">
                  <td className="px-3 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-3 text-sm font-medium">
                    {child.broker} - {child.userId} - {child.nickname}
                  </td>
                  <td className="px-3 py-3 text-sm">{formatCurrency(child.margin || 0)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-sm font-semibold ${child.pnlToday >= 0 ? 'text-success' : 'text-danger'}`}>
                      {child.pnlToday >= 0 ? '+' : ''}{formatCurrency(child.pnlToday)} {child.pnlToday >= 0 ? '↑' : '↓'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm">{child.positions || 0}</td>

                  {/* Multiplier with coin icon style */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => {
                        const steps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5];
                        const i = steps.indexOf(child.multiplier);
                        if (i > 0) handleMultiplierChange(child.id, steps[i - 1]);
                      }} className="w-5 h-5 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors flex items-center justify-center">−</button>
                      <span className="w-12 text-center text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-1 py-0.5">
                        {child.multiplier}
                      </span>
                      <button onClick={() => {
                        const steps = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 5];
                        const i = steps.indexOf(child.multiplier);
                        if (i < steps.length - 1) handleMultiplierChange(child.id, steps[i + 1]);
                      }} className="w-5 h-5 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors flex items-center justify-center">+</button>
                    </div>
                  </td>

                  {/* Trading Toggle */}
                  <td className="px-3 py-3">
                    <div onClick={() => handleToggleTrading(child.id)} className="cursor-pointer">
                      <div className={`relative w-11 h-6 rounded-full transition-colors ${child.tradingEnabled ? 'bg-brand-purple' : 'bg-white/20'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${child.tradingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </div>
                  </td>

                  {/* Refresh */}
                  <td className="px-3 py-3">
                    <button onClick={() => handleRefresh(child.id)}
                      className="w-8 h-8 bg-brand-purple/80 hover:bg-brand-purple rounded-lg flex items-center justify-center transition-colors">
                      <RefreshCw className={`w-3.5 h-3.5 text-white ${refreshing[child.id] ? 'animate-spin' : ''}`} />
                    </button>
                  </td>

                  {/* Demat */}
                  <td className="px-3 py-3">
                    <button onClick={() => navigate(`/master/demat/${child.id}`)}
                      className="w-8 h-8 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors">
                      <Eye className="w-3.5 h-3.5 text-foreground" />
                    </button>
                  </td>

                  {/* Connection */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button className="w-8 h-8 bg-warning/80 hover:bg-warning rounded-lg flex items-center justify-center transition-colors" title="Disconnect">
                        <Link2Off className="w-3.5 h-3.5 text-foreground" />
                      </button>
                      <button className="w-8 h-8 bg-success/80 hover:bg-success rounded-lg flex items-center justify-center transition-colors" title="Connect">
                        <Link className="w-3.5 h-3.5 text-foreground" />
                      </button>
                    </div>
                  </td>

                  {/* Delete */}
                  <td className="px-3 py-3">
                    <button onClick={() => { setSelectedRow(child); setDeleteModal(true); }}
                      className="w-8 h-8 bg-danger/80 hover:bg-danger rounded-lg flex items-center justify-center transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-foreground" />
                    </button>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">No child accounts added yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Remove Child Account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Remove <span className="font-semibold text-foreground">{selectedRow?.nickname}</span> from copy trading?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={() => { setChildren((p) => p.filter((c) => c.id !== selectedRow.id)); setDeleteModal(false); addToast('Removed', 'success'); }}
              className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CopyTrading;