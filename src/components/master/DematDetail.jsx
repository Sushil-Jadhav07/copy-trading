import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import { brokerAccounts, dematPositions, dematOrders, dematTrades, formatCurrency } from '@/data/mockData';

const TABS = ['Positions', 'Orders', 'Trades'];

const TransBadge = ({ type }) => (
  <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${type === 'BUY' || type === 'CARRYFORWARD' ? 'bg-success/20 text-success border border-success/30' : 'bg-danger/20 text-danger border border-danger/30'}`}>
    {type}
  </span>
);

const StatusBadge = ({ status }) => {
  const cfg = { Completed: 'bg-success/20 text-success border-success/30', Pending: 'bg-warning/20 text-warning border-warning/30', Rejected: 'bg-danger/20 text-danger border-danger/30' };
  return <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${cfg[status] || 'bg-black/10 dark:bg-white/10 text-foreground border-black/10 dark:border-white/10'}`}>{status}</span>;
};

const DematDetail = ({ accountId, onBack }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Positions');
  const [squareOffModal, setSquareOffModal] = useState(false);
  const [selectedPos, setSelectedPos] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [account, setAccount] = useState(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const resolvedBack = onBack || (() => navigate('/master/user-management'));

  useEffect(() => {
    const id = Number(accountId);
    setAccount(brokerAccounts.find((a) => a.id === id) || brokerAccounts[0]);
    setPositions(dematPositions[id] || []);
    setOrders(dematOrders[id] || []);
    setTrades(dematTrades[id] || []);
  }, [accountId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
    addToast('Refreshed', 'success');
  };

  const confirmSquareOff = () => {
    setPositions((p) => p.filter((x) => x.id !== selectedPos.id));
    setSquareOffModal(false);
    addToast(`${selectedPos.symbol} squared off`, 'success');
  };

  if (!account) return null;
  const totalPnL = positions.reduce((s, p) => s + p.pnl, 0);

  const filteredPositions = positions.filter((p) => !search || p.symbol.toLowerCase().includes(search.toLowerCase()));
  const filteredOrders = orders.filter((o) => !search || o.symbol.toLowerCase().includes(search.toLowerCase()));
  const filteredTrades = trades.filter((t) => !search || t.symbol.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header — matches Algo Delta style: BROKER - USERID - NICKNAME | Margin | PnL */}
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={resolvedBack} className="p-2 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wide">
            {account.broker.toUpperCase()} - {account.userId} - {account.nickname.toUpperCase()}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xl font-bold">{formatCurrency(account.margin)}</span>
            <span className="text-sm text-muted-foreground ml-2">Margin</span>
          </div>
          <div className="text-right">
            <span className={`text-xl font-bold ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>
              {(totalPnL >= 0 ? '+' : '') + formatCurrency(Math.abs(totalPnL))}
            </span>
            <span className={`text-sm ml-1 ${totalPnL >= 0 ? 'text-success' : 'text-danger'}`}>{totalPnL >= 0 ? '↑' : '↓'}</span>
            <span className="text-sm text-muted-foreground ml-1">PnL</span>
          </div>
          <button onClick={handleRefresh} className="w-9 h-9 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors">
            <RefreshCw className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-border/50">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setSearch(''); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'bg-black/10 dark:bg-white/10 text-foreground border-b-2 border-brand-purple' : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:bg-white/5'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border/30 flex justify-end">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search"
            className="w-56 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" />
        </div>

        <div className="overflow-x-auto">
          {/* POSITIONS TAB */}
          {activeTab === 'Positions' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Type', 'Qty', 'P&L', 'LTP', 'Avg Price', 'Trans', 'Square Off'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((pos, idx) => (
                  <motion.tr key={pos.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{pos.symbol}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{pos.type}</td>
                    <td className="px-4 py-3 text-sm">{pos.qty}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${pos.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                        {pos.pnl >= 0 ? '+' : ''}{pos.pnl.toFixed(2)} {pos.pnl >= 0 ? '↑' : '↓'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{pos.ltp.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{pos.avgPrice > 0 ? pos.avgPrice.toFixed(2) : '0'}</td>
                    <td className="px-4 py-3">
                      <button className="px-2.5 py-1 bg-success/20 border border-success/30 text-success rounded text-xs font-bold hover:bg-success/30 transition-colors">
                        SELL
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setSelectedPos(pos); setSquareOffModal(true); }}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${pos.pnl >= 0 ? 'bg-success hover:bg-success/90 text-foreground' : 'bg-danger hover:bg-danger/90 text-foreground'}`}>
                        Square OFF
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filteredPositions.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No positions found</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'Orders' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Trans', 'Product', 'Type', 'Qty', 'Price', 'Time', 'Order Id', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, idx) => (
                  <motion.tr key={ord.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{ord.symbol}</td>
                    <td className="px-4 py-3"><TransBadge type={ord.type} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">CARRYFORW...</td>
                    <td className="px-4 py-3 text-sm">{ord.orderType}</td>
                    <td className="px-4 py-3 text-sm">{ord.qty}</td>
                    <td className="px-4 py-3 text-sm">{ord.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{ord.time}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">2307120{ord.id.toString().padStart(8, '0')}</td>
                    <td className="px-4 py-3"><StatusBadge status={ord.status} /></td>
                  </motion.tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">No orders found</td></tr>
                )}
              </tbody>
            </table>
          )}

          {/* TRADES TAB */}
          {activeTab === 'Trades' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Order ID', 'Product', 'Trans', 'Price', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((tr, idx) => (
                  <motion.tr key={tr.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{tr.symbol}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">2307120{tr.id.toString().padStart(8, '0')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">CARRYFORWARD</td>
                    <td className="px-4 py-3"><TransBadge type={tr.action} /></td>
                    <td className="px-4 py-3 text-sm">{tr.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tr.time}</td>
                  </motion.tr>
                ))}
                {filteredTrades.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No trades found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination hint */}
        <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Rows per page: 10 &nbsp;|&nbsp;
            {activeTab === 'Positions' && `1–${filteredPositions.length} of ${filteredPositions.length}`}
            {activeTab === 'Orders' && `1–${filteredOrders.length} of ${filteredOrders.length}`}
            {activeTab === 'Trades' && `1–${filteredTrades.length} of ${filteredTrades.length}`}
          </span>
        </div>
      </div>

      {/* Square Off Modal */}
      <Modal isOpen={squareOffModal} onClose={() => setSquareOffModal(false)} title="Square Off Position" size="sm">
        {selectedPos && (
          <div className="space-y-4">
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 text-sm">
              {[['Symbol', selectedPos.symbol], ['Qty', selectedPos.qty], ['LTP', `₹${selectedPos.ltp.toFixed(2)}`],
                ['Unrealized P&L', (selectedPos.pnl >= 0 ? '+' : '') + formatCurrency(selectedPos.pnl)]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span className={k === 'Unrealized P&L' ? (selectedPos.pnl >= 0 ? 'text-success font-semibold' : 'text-danger font-semibold') : 'font-medium'}>{v}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">This will place a market order to exit this position immediately.</p>
            <div className="flex gap-3">
              <button onClick={() => setSquareOffModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={confirmSquareOff} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Confirm Square Off</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DematDetail;