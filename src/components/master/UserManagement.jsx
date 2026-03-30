import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Link, Link2Off, Trash2, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import { brokerAccounts, formatCurrency } from '@/data/mockData';

const BROKERS = ['angelone','aliceblue','shoonya','profitmart','fyers','jmfinancial','zerodha','zerodhamaster'];

const UserManagement = () => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState(brokerAccounts);
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [refreshing, setRefreshing] = useState({});
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ broker: '', nickname: '', mobile: '', email: '' });
  const [formErrors, setFormErrors] = useState({});

  const filtered = accounts.filter((a) =>
    !search || `${a.broker} ${a.userId} ${a.nickname}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleRefresh = async (id) => {
    setRefreshing((p) => ({ ...p, [id]: true }));
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing((p) => ({ ...p, [id]: false }));
    addToast('Account refreshed', 'success');
  };

  const handleToggleConnect = (id) => {
    const acc = accounts.find((a) => a.id === id);
    setAccounts((p) => p.map((a) => a.id === id ? { ...a, status: a.status === 'connected' ? 'disconnected' : 'connected' } : a));
    addToast(acc.status === 'connected' ? 'Broker disconnected' : 'Broker connected', acc.status === 'connected' ? 'warning' : 'success');
  };

  const validate = () => {
    const e = {};
    if (!form.broker) e.broker = 'Required';
    if (!form.nickname.trim()) e.nickname = 'Required';
    if (!form.mobile.match(/^[6-9]\d{9}$/)) e.mobile = 'Invalid';
    if (!form.email.includes('@')) e.email = 'Invalid';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = () => {
    if (!validate()) return;
    const newAcc = {
      id: Date.now(), broker: form.broker, brokerLabel: form.broker,
      userId: 'NEW' + Math.floor(Math.random() * 9000 + 1000),
      nickname: form.nickname, mobile: form.mobile, email: form.email,
      margin: 0, usedMargin: 0, pnl: 0, pnlPct: 0, positions: 0, orders: 0,
      status: 'disconnected', lastSync: 'Never',
    };
    setAccounts((p) => [...p, newAcc]);
    setForm({ broker: '', nickname: '', mobile: '', email: '' });
    setFormErrors({});
    addToast('Broker account added', 'success');
  };

  const handleClear = () => {
    setForm({ broker: '', nickname: '', mobile: '', email: '' });
    setFormErrors({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {/* Inline Add Form */}
      <GlassCard title="Connect User's Broker">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {/* Broker Select */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Select Broker</label>
            <div className="relative">
              <select
                value={form.broker}
                onChange={(e) => setForm((f) => ({ ...f, broker: e.target.value }))}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple appearance-none"
              >
                <option value="" className="bg-background">Select broker</option>
                {BROKERS.map((b) => <option key={b} value={b} className="bg-background capitalize">{b}</option>)}
              </select>
              {formErrors.broker && <p className="text-danger text-xs mt-1">{formErrors.broker}</p>}
            </div>
          </div>
          {/* Nickname */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nickname</label>
            <input value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              placeholder="Enter Nickname"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" />
            {formErrors.nickname && <p className="text-danger text-xs mt-1">{formErrors.nickname}</p>}
          </div>
          {/* Mobile */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Mobile No.</label>
            <input value={form.mobile} onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
              placeholder="Enter Mobile No."
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" />
            {formErrors.mobile && <p className="text-danger text-xs mt-1">{formErrors.mobile}</p>}
          </div>
          {/* Email */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Enter Email"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" />
            {formErrors.email && <p className="text-danger text-xs mt-1">{formErrors.email}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleClear} className="px-5 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">
            Clear
          </button>
          <button onClick={handleAdd} className="px-5 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">
            Add
          </button>
        </div>
      </GlassCard>

      {/* Accounts Table */}
      <GlassCard noPadding>
        {/* Search */}
        <div className="p-4 border-b border-border/50">
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full max-w-xs bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['Id', 'Broker - User Id - User', 'Margin', 'P&L', 'Positions', 'Refresh', 'Demat', 'Connection', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc, idx) => (
                <motion.tr key={acc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                  className="border-b border-border/30 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">
                      {acc.broker} - {acc.userId} - {acc.nickname}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(acc.margin)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-semibold ${acc.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {acc.pnl >= 0 ? '+' : ''}{formatCurrency(acc.pnl)}
                      {acc.pnl !== 0 && <span className="ml-1 text-xs">{acc.pnl >= 0 ? '↑' : '↓'}</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{acc.positions}</td>

                  {/* Refresh */}
                  <td className="px-4 py-3">
                    <button onClick={() => handleRefresh(acc.id)} title="Refresh"
                      className="w-8 h-8 bg-brand-purple/80 hover:bg-brand-purple rounded-lg flex items-center justify-center transition-colors">
                      <RefreshCw className={`w-4 h-4 text-white ${refreshing[acc.id] ? 'animate-spin' : ''}`} />
                    </button>
                  </td>

                  {/* Demat */}
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/master/demat/${acc.id}`)} title="View Demat"
                      className="w-8 h-8 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors">
                      <Eye className="w-4 h-4 text-foreground" />
                    </button>
                  </td>

                  {/* Connection */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleToggleConnect(acc.id)} title={acc.status === 'connected' ? 'Disconnect' : 'Connect'}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${acc.status === 'connected' ? 'bg-warning/80 hover:bg-warning' : 'bg-success/80 hover:bg-success'}`}>
                        {acc.status === 'connected'
                          ? <Link2Off className="w-4 h-4 text-foreground" />
                          : <Link className="w-4 h-4 text-foreground" />}
                      </button>
                      <button title="Re-login"
                        className="w-8 h-8 bg-teal-500/80 hover:bg-teal-500 rounded-lg flex items-center justify-center transition-colors">
                        <RefreshCw className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  </td>

                  {/* Delete */}
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedAcc(acc); setDeleteModal(true); }} title="Delete"
                      className="w-8 h-8 bg-danger/80 hover:bg-danger rounded-lg flex items-center justify-center transition-colors">
                      <Trash2 className="w-4 h-4 text-foreground" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No demat account connected yet. Please connect your demat account.</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Delete <span className="font-semibold text-foreground">{selectedAcc?.nickname}</span>? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={() => { setAccounts((p) => p.filter((a) => a.id !== selectedAcc.id)); setDeleteModal(false); addToast('Account deleted', 'success'); }}
              className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;