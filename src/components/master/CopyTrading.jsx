import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Link, Link2Off, Trash2, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useToast } from '@/components/shared/Toast';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { useMasterChildren } from '@/hooks/useMaster';
import { masterService } from '@/lib/master';
import { formatCurrency } from '@/lib/utils';

const normalizeChildRow = (child) => ({
  id: child.id || child.childId,
  accountId: child.accountId || child.id || child.childId,
  userId: child.clientId || child.userId || child.childId,
  nickname: child.nickname || child.name || child.childName || 'Unknown',
  broker: child.broker || child.brokerName || 'Broker',
  multiplier: child.multiplier || child.scalingFactor || 1,
  tradingEnabled: child.status === 'ACTIVE' || child.enabled || false,
  pnlToday: Number(child.pnlToday || child.pnl || 0),
  tradesCopied: Number(child.tradesCopied || child.tradeCount || 0),
  margin: Number(child.margin || child.availableMargin || 0),
  positions: Number(child.positions || child.positionCount || 0),
  isLinked: Boolean(child.isLinked),
  isSubscribedOnly: Boolean(child.isSubscribedOnly),
});

const CopyTrading = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { accounts, loading: accountsLoading } = useBrokerAccounts();
  const { children, loading, refetch, setChildren } = useMasterChildren();
  const [masterAccountId, setMasterAccountId] = useState('');
  const [masterConnected, setMasterConnected] = useState(false);
  const [masterInfo, setMasterInfo] = useState(null);
  const [tradingEnabled, setTradingEnabled] = useState(true);
  const [placeRejected, setPlaceRejected] = useState(false);
  const [selectedChild, setSelectedChild] = useState('');
  const [childMultiplier, setChildMultiplier] = useState('1');
  const [refreshing, setRefreshing] = useState({});
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [search, setSearch] = useState('');
  const [scalingMap, setScalingMap] = useState({});
  const [manuallyConnectedIds, setManuallyConnectedIds] = useState([]);

  useEffect(() => {
    const onFocus = () => refetch();
    window.addEventListener('focus', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [refetch]);

  const masterOptions = accounts.map((a) => ({
    value: a.accountId,
    label: `${a.broker}-${a.userId}-${a.nickname}`,
  }));

  const connectedRows = useMemo(() => children.map(normalizeChildRow), [children]);
  const childRows = connectedRows;

  useEffect(() => {
    let isMounted = true;
    connectedRows.forEach((child) => {
      masterService.getChildScaling(child.id).then((data) => {
        if (isMounted) {
          setScalingMap((prev) => ({ ...prev, [child.id]: data }));
        }
      }).catch(() => {});
    });
    return () => { isMounted = false; };
  }, [connectedRows]);

  const childOptions = childRows.filter(
    (child) =>
      child.id !== masterAccountId &&
      !manuallyConnectedIds.includes(child.id)
  );

  const handleConnectMaster = () => {
    if (!masterAccountId) { addToast('Please select a master account', 'error'); return; }
    if (masterConnected) {
      setMasterConnected(false);
      setMasterInfo(null);
      addToast('Master disconnected', 'warning');
    } else {
      const acc = accounts.find((a) => a.accountId === masterAccountId);
      setMasterInfo(acc);
      setMasterConnected(true);
      addToast('Master connected successfully', 'success');
    }
  };

  const handleAddChild = async () => {
    if (!selectedChild) { addToast('Please select a child account', 'error'); return; }
    const selectedChildRow = childRows.find((item) => String(item.id) === String(selectedChild));
    try {
      await masterService.linkChild(selectedChild);
      await masterService.updateChildScaling(selectedChild, { multiplier: Number(childMultiplier) || 1 });
      if (selectedChildRow) {
        setManuallyConnectedIds((prev) => (prev.includes(selectedChildRow.id) ? prev : [...prev, selectedChildRow.id]));
        setChildren((prev) => {
          const exists = prev.some((item) => String(item.id || item.childId) === String(selectedChild));
          if (exists) {
            return prev.map((item) =>
              String(item.id || item.childId) === String(selectedChild)
                ? { ...item, multiplier: Number(childMultiplier) || 1, status: 'ACTIVE', enabled: true, isLinked: true, isSubscribedOnly: false }
                : item
            );
          }

          return [
            ...prev,
            {
              ...selectedChildRow,
              childId: selectedChildRow.id,
              id: selectedChildRow.id,
              multiplier: Number(childMultiplier) || 1,
              status: 'ACTIVE',
              enabled: true,
              isLinked: true,
              isSubscribedOnly: false,
            },
          ];
        });
      }
      setSelectedChild('');
      setChildMultiplier('1');
      addToast('Child linked successfully', 'success');
      await refetch();
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleToggleTrading = async (id) => {
    const child = connectedRows.find((item) => item.id === id);
    const next = !child.tradingEnabled;
    setChildren((prev) => prev.map((item) => (item.id || item.childId) === id ? { ...item, status: next ? 'ACTIVE' : 'PAUSED', enabled: next } : item));
    try {
      await masterService.updateChildScaling(id, { enabled: next });
    } catch (error) {
      addToast(error.message, 'error');
      refetch();
    }
  };

  const handleRefresh = async (id) => {
    setRefreshing((p) => ({ ...p, [id]: true }));
    try {
      const data = await masterService.getChildScaling(id);
      setScalingMap((prev) => ({ ...prev, [id]: data }));
      addToast('Refreshed', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    } finally {
      setRefreshing((p) => ({ ...p, [id]: false }));
    }
  };

  const handleMultiplierChange = async (id, val) => {
    setChildren((prev) => prev.map((item) => (item.id || item.childId) === id ? { ...item, multiplier: val } : item));
    try {
      await masterService.updateChildScaling(id, { ...(scalingMap[id] || {}), multiplier: val });
    } catch (error) {
      addToast(error.message, 'error');
      refetch();
    }
  };

  const filtered = connectedRows.filter((c) => !search || `${c.broker} ${c.userId} ${c.nickname}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Copy Trading</h1></div>

      <GlassCard>
        {!masterConnected ? (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3">Master Account</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <select value={masterAccountId} onChange={(e) => setMasterAccountId(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                  <option value="" className="bg-background">Select Master Account</option>
                  {masterOptions.map((o) => <option key={o.value} value={o.value} className="bg-background">{o.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              <button onClick={handleConnectMaster} className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-foreground rounded-lg text-sm font-medium transition-colors">Connect</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
              <span className="font-bold text-lg uppercase">{masterInfo?.broker?.toUpperCase()}-{masterInfo?.userId}-{masterInfo?.nickname?.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <button onClick={handleConnectMaster} className="px-4 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Disconnect</button>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setTradingEnabled((p) => !p)} className={`relative w-11 h-6 rounded-full transition-colors ${tradingEnabled ? 'bg-brand-purple' : 'bg-white/20'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${tradingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium">Trading ON / OFF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <div onClick={() => setPlaceRejected((p) => !p)} className={`relative w-11 h-6 rounded-full transition-colors ${placeRejected ? 'bg-brand-purple' : 'bg-white/20'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${placeRejected ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm font-medium">Place Rejected Order Also</span>
              </label>
            </div>
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <p className="text-sm font-semibold text-muted-foreground mb-3">Child Accounts</p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
              <option value="" className="bg-background">Select User Broker Child's</option>
              {childOptions.map((a) => <option key={a.id} value={a.id} className="bg-background">{a.broker}-{a.userId}-{a.nickname}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          <div className="w-32">
            <input type="number" value={childMultiplier} onChange={(e) => setChildMultiplier(e.target.value)} placeholder="Multiplier" min="0.1" step="0.1" className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple" />
          </div>
          <button onClick={handleAddChild} className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue/90 text-foreground rounded-lg text-sm font-medium transition-colors">Connect</button>
        </div>
        
      </GlassCard>

      <GlassCard noPadding>
        <div className="p-4 border-b border-border/50 flex justify-end">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-56 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" />
        </div>
        {loading || accountsLoading ? (
          <div className="p-4"><SkeletonLoader type="table" rows={5} columns={11} /></div>
        ) : (
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
                  <motion.tr key={child.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }} className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-3 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-3 py-3 text-sm font-medium">{child.broker} - {child.userId} - {child.nickname}</td>
                    <td className="px-3 py-3 text-sm">{formatCurrency(child.margin || 0)}</td>
                    <td className="px-3 py-3"><span className={`text-sm font-semibold ${child.pnlToday >= 0 ? 'text-success' : 'text-danger'}`}>{child.pnlToday >= 0 ? '+' : ''}{formatCurrency(child.pnlToday)} {child.pnlToday >= 0 ? '↑' : '↓'}</span></td>
                    <td className="px-3 py-3 text-sm">{child.positions || 0}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => handleMultiplierChange(child.id, Math.max(0.25, child.multiplier - 0.25))} className="w-5 h-5 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors flex items-center justify-center">−</button>
                        <span className="w-12 text-center text-sm font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded px-1 py-0.5">{child.multiplier}</span>
                        <button onClick={() => handleMultiplierChange(child.id, child.multiplier + 0.25)} className="w-5 h-5 bg-black/10 dark:bg-white/10 hover:bg-white/20 rounded text-xs font-bold transition-colors flex items-center justify-center">+</button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div onClick={() => handleToggleTrading(child.id)} className="cursor-pointer">
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${child.tradingEnabled ? 'bg-brand-purple' : 'bg-white/20'}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${child.tradingEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => handleRefresh(child.id)} className="w-8 h-8 bg-brand-purple/80 hover:bg-brand-purple rounded-lg flex items-center justify-center transition-colors">
                        <RefreshCw className={`w-3.5 h-3.5 text-white ${refreshing[child.id] ? 'animate-spin' : ''}`} />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => navigate(`/master/demat/${child.accountId || child.id}`)} className="w-8 h-8 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors">
                        <Eye className="w-3.5 h-3.5 text-foreground" />
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button className="w-8 h-8 bg-warning/80 hover:bg-warning rounded-lg flex items-center justify-center transition-colors" title="Disconnect"><Link2Off className="w-3.5 h-3.5 text-foreground" /></button>
                        <button className="w-8 h-8 bg-success/80 hover:bg-success rounded-lg flex items-center justify-center transition-colors" title="Connect"><Link className="w-3.5 h-3.5 text-foreground" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => { setSelectedRow(child); setDeleteModal(true); }} className="w-8 h-8 bg-danger/80 hover:bg-danger rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-foreground" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">No child accounts added yet</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Remove Child Account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Remove <span className="font-semibold text-foreground">{selectedRow?.nickname}</span> from copy trading?</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={async () => {
              try {
                await masterService.unlinkChild(selectedRow.id);
                addToast('Removed', 'success');
                refetch();
              } catch (error) {
                addToast(error.message, 'error');
              }
              setDeleteModal(false);
            }} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CopyTrading;
