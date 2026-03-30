import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Users, TrendingUp, CheckCircle2, XCircle, Plus, Trash2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import { formatCurrency } from '@/data/mockData';

const INITIAL_PLANS = [
  { id: 1, name: 'Starter', price: 999, maxChildren: 3, features: ['3 child accounts', 'Basic analytics', 'Email support'], active: true, subscribers: 48 },
  { id: 2, name: 'Pro', price: 2499, maxChildren: 10, features: ['10 child accounts', 'Advanced analytics', 'Priority support', 'Basket orders'], active: true, subscribers: 112 },
  { id: 3, name: 'Enterprise', price: 4999, maxChildren: 50, features: ['50 child accounts', 'Full analytics', 'Dedicated support', 'All order types', 'API access'], active: true, subscribers: 34 },
];

const SUBSCRIPTIONS = [
  { id: 1, user: 'Rahul Mehta', email: 'rahul@example.com', role: 'Master', plan: 'Pro', status: 'Active', startDate: '01/01/2024', nextBilling: '01/04/2024', amount: 2499 },
  { id: 2, user: 'Priya Sharma', email: 'priya@example.com', role: 'Master', plan: 'Starter', status: 'Active', startDate: '15/02/2024', nextBilling: '15/05/2024', amount: 999 },
  { id: 3, user: 'Arjun Patel', email: 'arjun@example.com', role: 'Master', plan: 'Enterprise', status: 'Active', startDate: '01/03/2024', nextBilling: '01/06/2024', amount: 4999 },
  { id: 4, user: 'Vikram Das', email: 'vikram@example.com', role: 'Master', plan: 'Pro', status: 'Cancelled', startDate: '10/01/2024', nextBilling: '—', amount: 2499 },
  { id: 5, user: 'Sneha Gupta', email: 'sneha@example.com', role: 'Master', plan: 'Starter', status: 'Expired', startDate: '01/11/2023', nextBilling: '—', amount: 999 },
];

const Subscriptions = () => {
  const { addToast } = useToast();
  const [plans, setPlans] = useState(INITIAL_PLANS);
  const [subs, setSubs] = useState(SUBSCRIPTIONS);
  const [tab, setTab] = useState('subscriptions');
  const [planModal, setPlanModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', maxChildren: '', features: '' });

  const totalRevenue = subs.filter((s) => s.status === 'Active').reduce((sum, s) => sum + s.amount, 0);
  const activeCount = subs.filter((s) => s.status === 'Active').length;

  const handleSavePlan = () => {
    if (!newPlan.name || !newPlan.price) { addToast('Fill required fields', 'error'); return; }
    if (editPlan) {
      setPlans((p) => p.map((pl) => pl.id === editPlan.id ? { ...pl, name: newPlan.name, price: Number(newPlan.price), maxChildren: Number(newPlan.maxChildren) } : pl));
      addToast('Plan updated', 'success');
    } else {
      setPlans((p) => [...p, {
        id: Date.now(), name: newPlan.name, price: Number(newPlan.price),
        maxChildren: Number(newPlan.maxChildren), active: true, subscribers: 0,
        features: newPlan.features.split(',').map((f) => f.trim()).filter(Boolean),
      }]);
      addToast('Plan created', 'success');
    }
    setPlanModal(false);
    setEditPlan(null);
    setNewPlan({ name: '', price: '', maxChildren: '', features: '' });
  };

  const handleCancelSub = () => {
    setSubs((p) => p.map((s) => s.id === selectedSub.id ? { ...s, status: 'Cancelled', nextBilling: '—' } : s));
    setCancelModal(false);
    addToast(`Subscription cancelled for ${selectedSub.user}`, 'success');
  };

  const statusColor = { Active: 'text-success bg-success/20', Cancelled: 'text-danger bg-danger/20', Expired: 'text-muted-foreground bg-black/10 dark:bg-white/10' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage subscription plans and user subscriptions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Subscriptions', value: activeCount, icon: Users, color: 'text-brand-purple' },
          { label: 'Monthly Revenue', value: formatCurrency(totalRevenue), icon: CreditCard, color: 'text-success' },
          { label: 'Total Plans', value: plans.length, icon: TrendingUp, color: 'text-brand-blue' },
          { label: 'Cancelled', value: subs.filter((s) => s.status === 'Cancelled').length, icon: XCircle, color: 'text-danger' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ key: 'subscriptions', label: 'User Subscriptions' }, { key: 'plans', label: 'Manage Plans' }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* User Subscriptions Table */}
      {tab === 'subscriptions' && (
        <GlassCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'User', 'Plan', 'Status', 'Start Date', 'Next Billing', 'Amount', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subs.map((sub, idx) => (
                  <motion.tr key={sub.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold">{sub.user}</p>
                      <p className="text-xs text-muted-foreground">{sub.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-brand-purple/20 text-brand-purple">{sub.plan}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[sub.status]}`}>{sub.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sub.startDate}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{sub.nextBilling}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{formatCurrency(sub.amount)}/mo</td>
                    <td className="px-4 py-3">
                      {sub.status === 'Active' && (
                        <button onClick={() => { setSelectedSub(sub); setCancelModal(true); }}
                          className="px-2 py-1 text-xs bg-danger/20 hover:bg-danger/30 text-danger rounded transition-colors">
                          Cancel
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Plans */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => { setEditPlan(null); setNewPlan({ name: '', price: '', maxChildren: '', features: '' }); setPlanModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Add Plan
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan, idx) => (
              <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                className="glass-card p-5 hover-lift">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditPlan(plan); setNewPlan({ name: plan.name, price: plan.price, maxChildren: plan.maxChildren, features: plan.features.join(', ') }); setPlanModal(true); }}
                      className="text-xs px-2 py-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded transition-colors">Edit</button>
                    <button onClick={() => { setPlans((p) => p.filter((pl) => pl.id !== plan.id)); addToast('Plan deleted', 'success'); }}
                      className="p-1 hover:bg-danger/20 rounded transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-danger" />
                    </button>
                  </div>
                </div>
                <p className="text-3xl font-bold text-brand-purple mb-1">{formatCurrency(plan.price)}<span className="text-sm text-muted-foreground font-normal">/mo</span></p>
                <p className="text-sm text-muted-foreground mb-3">{plan.subscribers} active subscribers</p>
                <div className="space-y-1.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Modal */}
      <Modal isOpen={planModal} onClose={() => setPlanModal(false)} title={editPlan ? 'Edit Plan' : 'Create Plan'} size="sm">
        <div className="space-y-4">
          {[
            { key: 'name', label: 'Plan Name', placeholder: 'e.g. Pro' },
            { key: 'price', label: 'Price (₹/month)', placeholder: 'e.g. 2499' },
            { key: 'maxChildren', label: 'Max Child Accounts', placeholder: 'e.g. 10' },
            { key: 'features', label: 'Features (comma separated)', placeholder: '10 children, Advanced analytics' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-muted-foreground mb-1.5">{label}</label>
              <input value={newPlan[key]} onChange={(e) => setNewPlan((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setPlanModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleSavePlan} className="flex-1 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">
              {editPlan ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Sub Modal */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Subscription" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Cancel <span className="font-semibold text-foreground">{selectedSub?.user}</span>'s {selectedSub?.plan} subscription?</p>
          <div className="flex gap-3">
            <button onClick={() => setCancelModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Keep</button>
            <button onClick={handleCancelSub} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Cancel Sub</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Subscriptions;