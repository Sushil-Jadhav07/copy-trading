import React, { useState } from 'react';
import { Search, Filter, Eye, UserX, Trash2, UserPlus, Link } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SlideOver from '@/components/shared/SlideOver';
import { children, masters, formatCurrency } from '@/data/mockData';
import { useToast } from '@/components/shared/Toast';

const BROKERS = ['zerodha', 'groww', 'angelone', 'upstox', 'dhan'];

const RoleBadge = ({ role }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
    role === 'Master' ? 'bg-brand-purple/20 text-brand-purple border border-brand-purple/30'
    : role === 'Admin' ? 'bg-warning/20 text-warning border border-warning/30'
    : 'bg-brand-blue/20 text-brand-blue border border-brand-blue/30'
  }`}>{role}</span>
);

const StatusBadge = ({ status }) => (
  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
    status === 'Active' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
  }`}>{status}</span>
);

const AllUsers = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState([
    ...masters.map((m) => ({ ...m, id: `m-${m.id}`, role: 'Master', broker: 'zerodha' })),
    ...children.map((c) => ({ ...c, id: `c-${c.id}`, role: 'Child', broker: 'angelone' })),
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [suspendModal, setSuspendModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [brokerModal, setBrokerModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', email: '', phone: '', role: 'Master', broker: '', password: '' });
  const [createErrors, setCreateErrors] = useState({});
  const [assignBroker, setAssignBroker] = useState('');

  const filtered = users.filter((u) => {
    if (searchQuery && !u.name.toLowerCase().includes(searchQuery.toLowerCase()) && !u.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    if (statusFilter !== 'All' && u.status !== statusFilter) return false;
    return true;
  });

  const handleSuspendToggle = () => {
    setUsers((p) => p.map((u) => u.id === selectedUser.id ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' } : u));
    setSuspendModal(false);
    addToast(`${selectedUser.name} ${selectedUser.status === 'Active' ? 'suspended' : 'activated'}`, 'success');
  };

  const handleDelete = () => {
    setUsers((p) => p.filter((u) => u.id !== selectedUser.id));
    setDeleteModal(false);
    addToast('User deleted', 'success');
  };

  const validateCreate = () => {
    const e = {};
    if (!createForm.name.trim()) e.name = 'Required';
    if (!createForm.email.includes('@')) e.email = 'Invalid email';
    if (!createForm.phone.match(/^[6-9]\d{9}$/)) e.phone = 'Invalid mobile';
    if (!createForm.broker) e.broker = 'Required';
    if (createForm.password.length < 6) e.password = 'Min 6 characters';
    setCreateErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validateCreate()) return;
    const newUser = {
      id: Date.now(),
      name: createForm.name,
      email: createForm.email,
      phone: createForm.phone,
      role: createForm.role,
      broker: createForm.broker,
      status: 'Active',
      joinedDate: new Date().toLocaleDateString('en-IN'),
      portfolioValue: 0,
      totalPnL: 0,
    };
    setUsers((p) => [...p, newUser]);
    setCreateModal(false);
    setCreateForm({ name: '', email: '', phone: '', role: 'Master', broker: '', password: '' });
    setCreateErrors({});
    addToast(`${createForm.role} account created for ${createForm.name}`, 'success');
  };

  const handleAssignBroker = () => {
    if (!assignBroker) { addToast('Select a broker first', 'error'); return; }
    setUsers((p) => p.map((u) => u.id === selectedUser.id ? { ...u, broker: assignBroker } : u));
    setBrokerModal(false);
    addToast(`${assignBroker} assigned to ${selectedUser.name}`, 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Create and manage Master & Child accounts</p>
        </div>
        <button onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">
          <UserPlus className="w-4 h-4" />
          Create Account
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length },
          { label: 'Masters', value: users.filter((u) => u.role === 'Master').length, color: 'text-brand-purple' },
          { label: 'Children', value: users.filter((u) => u.role === 'Child').length, color: 'text-brand-blue' },
          { label: 'Active', value: users.filter((u) => u.status === 'Active').length, color: 'text-success' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color || ''}`}>{s.value}</p>
          </GlassCard>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-black/5 dark:bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:border-brand-purple">
          <option value="All">All Roles</option>
          <option value="Master">Master</option>
          <option value="Child">Child</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-black/5 dark:bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:border-brand-purple">
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <GlassCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {['#', 'User', 'Role', 'Broker', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, idx) => (
                <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                  className="border-b border-border/30 hover:bg-white/3 transition-colors">
                  <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-foreground">{user.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize text-muted-foreground">{user.broker || '—'}</span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.joinedDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setSelectedUser(user); setSlideOverOpen(true); }} title="View"
                        className="w-7 h-7 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg flex items-center justify-center transition-colors">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setSelectedUser(user); setAssignBroker(user.broker || ''); setBrokerModal(true); }} title="Assign Broker"
                        className="w-7 h-7 bg-brand-blue/20 hover:bg-brand-blue/30 rounded-lg flex items-center justify-center transition-colors">
                        <Link className="w-3.5 h-3.5 text-brand-blue" />
                      </button>
                      <button onClick={() => { setSelectedUser(user); setSuspendModal(true); }} title={user.status === 'Active' ? 'Suspend' : 'Activate'}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${user.status === 'Active' ? 'bg-warning/20 hover:bg-warning/30' : 'bg-success/20 hover:bg-success/30'}`}>
                        <UserX className={`w-3.5 h-3.5 ${user.status === 'Active' ? 'text-warning' : 'text-success'}`} />
                      </button>
                      <button onClick={() => { setSelectedUser(user); setDeleteModal(true); }} title="Delete"
                        className="w-7 h-7 bg-danger/20 hover:bg-danger/30 rounded-lg flex items-center justify-center transition-colors">
                        <Trash2 className="w-3.5 h-3.5 text-danger" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* User Detail SlideOver */}
      <SlideOver isOpen={slideOverOpen} onClose={() => setSlideOverOpen(false)} title="User Details" size="md">
        {selectedUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{selectedUser.name.charAt(0)}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                <p className="text-muted-foreground text-sm">{selectedUser.email}</p>
                <div className="flex gap-2 mt-1">
                  <RoleBadge role={selectedUser.role} />
                  <StatusBadge status={selectedUser.status} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Role', selectedUser.role],
                ['Status', selectedUser.status],
                ['Joined', selectedUser.joinedDate],
                ['Broker', selectedUser.broker || 'Not assigned'],
                ['Portfolio Value', formatCurrency(selectedUser.portfolioValue || 0)],
                ['Total P&L', formatCurrency(selectedUser.totalPnL || 0)],
              ].map(([k, v]) => (
                <div key={k} className="p-3 bg-black/5 dark:bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-semibold text-sm mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SlideOver>

      {/* Create Account Modal */}
      <Modal isOpen={createModal} onClose={() => { setCreateModal(false); setCreateErrors({}); }} title="Create Account" size="md">
        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            {['Master', 'Child'].map((r) => (
              <button key={r} onClick={() => setCreateForm((f) => ({ ...f, role: r }))}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${createForm.role === r ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>
                {r}
              </button>
            ))}
          </div>

          {[
            { key: 'name', label: 'Full Name', placeholder: 'Enter full name', type: 'text' },
            { key: 'email', label: 'Email', placeholder: 'email@example.com', type: 'email' },
            { key: 'phone', label: 'Mobile No.', placeholder: '10-digit mobile', type: 'text' },
            { key: 'password', label: 'Password', placeholder: 'Min 6 characters', type: 'password' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-xs text-muted-foreground mb-1.5">{label} *</label>
              <input type={type} value={createForm[key]}
                onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
              {createErrors[key] && <p className="text-danger text-xs mt-1">{createErrors[key]}</p>}
            </div>
          ))}

          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Assign Broker *</label>
            <select value={createForm.broker} onChange={(e) => setCreateForm((f) => ({ ...f, broker: e.target.value }))}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
              <option value="" className="bg-background">Select broker</option>
              {BROKERS.map((b) => <option key={b} value={b} className="bg-background capitalize">{b}</option>)}
            </select>
            {createErrors.broker && <p className="text-danger text-xs mt-1">{createErrors.broker}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => { setCreateModal(false); setCreateErrors({}); }}
              className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleCreate}
              className="flex-1 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">
              Create {createForm.role}
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Broker Modal */}
      <Modal isOpen={brokerModal} onClose={() => setBrokerModal(false)} title={`Assign Broker — ${selectedUser?.name}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Select Broker</label>
            <select value={assignBroker} onChange={(e) => setAssignBroker(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
              <option value="" className="bg-background">Select broker</option>
              {BROKERS.map((b) => <option key={b} value={b} className="bg-background capitalize">{b}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setBrokerModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleAssignBroker} className="flex-1 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">Assign</button>
          </div>
        </div>
      </Modal>

      {/* Suspend Modal */}
      <Modal isOpen={suspendModal} onClose={() => setSuspendModal(false)} title={selectedUser?.status === 'Active' ? 'Suspend User' : 'Activate User'} size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {selectedUser?.status === 'Active' ? 'Suspend' : 'Activate'} <span className="font-semibold text-foreground">{selectedUser?.name}</span>?
          </p>
          <div className="flex gap-3">
            <button onClick={() => setSuspendModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleSuspendToggle}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors text-foreground ${selectedUser?.status === 'Active' ? 'bg-warning hover:bg-warning/90' : 'bg-success hover:bg-success/90'}`}>
              {selectedUser?.status === 'Active' ? 'Suspend' : 'Activate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete User" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Permanently delete <span className="font-semibold text-foreground">{selectedUser?.name}</span>? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleDelete} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AllUsers;