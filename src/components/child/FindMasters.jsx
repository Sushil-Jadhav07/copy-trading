import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, UserPlus, Check, Star, Sliders } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SlideOver from '@/components/shared/SlideOver';
import Modal from '@/components/shared/Modal';
import LineChart from '@/components/charts/LineChart';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildMasters, useChildSubscriptions } from '@/hooks/useChild';
import { childService } from '@/lib/child';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];

const FindMasters = () => {
  const { addToast } = useToast();
  const { masters, loading, refetch, error } = useChildMasters();
  const { subscriptions } = useChildSubscriptions();
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [following, setFollowing] = useState([]);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [subscribeModal, setSubscribeModal] = useState(false);
  const [subscribeMaster, setSubscribeMaster] = useState(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [allocation, setAllocation] = useState('');

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  useEffect(() => {
    setFollowing(
      subscriptions.map((item) => item.id || item.masterId).filter(Boolean)
    );
  }, [subscriptions]);

  const normalizedMasters = useMemo(() => masters.map((m) => ({
    id: m.id || m.masterId,
    name: m.name || m.masterName || 'Unknown',
    initials: (m.name || m.masterName || 'UN').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    winRate: m.winRate || m.win_rate || 0,
    return30d: m.return30d || m.monthlyReturn || 0,
    returnYTD: m.returnYTD || m.yearlyReturn || 0,
    followers: m.followers || m.followerCount || 0,
    riskLevel: m.riskLevel || m.risk || 'Medium',
    markets: Array.isArray(m.markets) ? m.markets : [m.market || 'Equity'],
    description: m.description || m.bio || '',
    equityCurve: m.equityCurve || m.performanceChart || [],
    verified: Boolean(m.verified),
    totalTrades: m.totalTrades || m.tradeCount || 0,
    bestTrade: m.bestTrade || 'N/A',
    worstTrade: m.worstTrade || 'N/A',
    ...m,
  })), [masters]);

  const filteredMasters = normalizedMasters.filter((master) => {
    if (searchQuery && !master.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (riskFilter !== 'All' && master.riskLevel !== riskFilter) return false;
    return true;
  });

  const openSubscribe = async (e, master) => {
    e.stopPropagation();
    if (following.includes(master.id)) {
      try {
        await childService.unsubscribe(master.id || master.masterId);
        setFollowing((prev) => prev.filter((f) => f !== master.id));
        addToast(`Unsubscribed from ${master.name}`, 'info');
        refetch();
      } catch (error) {
        addToast(error.message, 'error');
      }
      return;
    }
    setSubscribeMaster(master);
    setMultiplier(1.0);
    setAllocation('');
    setSubscribeModal(true);
  };

  const confirmSubscribe = async () => {
    if (!allocation || Number(allocation) <= 0) {
      addToast('Enter valid allocation amount', 'error');
      return;
    }
    try {
      await childService.subscribe({
        masterId: subscribeMaster.id || subscribeMaster.masterId,
        multiplier,
        allocationAmount: Number(allocation),
      });
      setFollowing((prev) => [...prev, subscribeMaster.id]);
      setSubscribeModal(false);
      addToast('Subscribed successfully', 'success');
      refetch();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Masters</h1>
        <p className="text-muted-foreground">Discover top-performing traders and subscribe to copy their trades</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search masters..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {['All', 'Low', 'Medium', 'High'].map((r) => (
            <button key={r} onClick={() => setRiskFilter(r)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${riskFilter === r ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>{r}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMasters.map((master) => (
            <GlassCard key={master.id} noPadding className="hover-lift cursor-pointer" onClick={() => { setSelectedMaster(master); setSlideOverOpen(true); }}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                      <span className="text-lg font-bold text-foreground">{master.initials}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-foreground">{master.name}</h3>
                        {master.verified && <Star className="w-4 h-4 text-warning fill-warning" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{formatNumber(master.followers)} followers</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${master.riskLevel === 'Low' ? 'bg-success/20 text-success' : master.riskLevel === 'Medium' ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'}`}>{master.riskLevel}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                  {[['30D Return', `+${master.return30d}%`, 'text-success'], ['Win Rate', `${master.winRate}%`, ''], ['YTD', `+${master.returnYTD}%`, 'text-success']].map(([k, v, c]) => (
                    <div key={k} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">{k}</p>
                      <p className={`text-sm font-bold mt-0.5 ${c}`}>{v}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1 mb-4">
                  {master.markets.map((m) => <span key={m} className="px-2 py-0.5 bg-brand-purple/10 text-brand-purple text-xs rounded">{m}</span>)}
                </div>

                <button onClick={(e) => openSubscribe(e, master)} className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${following.includes(master.id) ? 'bg-success/20 text-success border border-success/30' : 'bg-brand-purple hover:bg-brand-purple/90 text-white'}`}>
                  {following.includes(master.id) ? <><Check className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Subscribe</>}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <SlideOver isOpen={slideOverOpen} onClose={() => setSlideOverOpen(false)} title={selectedMaster?.name} size="md">
        {selectedMaster && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{selectedMaster.initials}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">{selectedMaster.name}</h2>
                  {selectedMaster.verified && <span className="px-2 py-0.5 bg-warning/20 text-warning text-xs rounded-full">Verified</span>}
                </div>
                <p className="text-muted-foreground text-sm">{selectedMaster.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[['30D Return', `+${selectedMaster.return30d}%`, 'text-success'], ['Win Rate', `${selectedMaster.winRate}%`, ''], ['Total Trades', formatNumber(selectedMaster.totalTrades), ''], ['Followers', formatNumber(selectedMaster.followers), ''], ['Best Trade', selectedMaster.bestTrade, 'text-success'], ['Worst Trade', selectedMaster.worstTrade, 'text-danger']].map(([k, v, c]) => (
                <div key={k} className="p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className={`font-bold mt-0.5 ${c}`}>{v}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Equity Curve</h3>
              <LineChart data={(selectedMaster.equityCurve || []).map((v, i) => ({ month: `M${i + 1}`, value: typeof v === 'number' ? v : v.value || 0 }))} xKey="month" yKey="value" height={180} />
            </div>

            <button onClick={(e) => { openSubscribe(e, selectedMaster); setSlideOverOpen(false); }} className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${following.includes(selectedMaster.id) ? 'bg-success/20 text-success' : 'bg-brand-purple hover:bg-brand-purple/90 text-foreground'}`}>
              {following.includes(selectedMaster.id) ? 'Following — Click to Unsubscribe' : 'Subscribe to Copy Trades'}
            </button>
          </div>
        )}
      </SlideOver>

      <Modal isOpen={subscribeModal} onClose={() => setSubscribeModal(false)} title={`Subscribe — ${subscribeMaster?.name}`} size="md">
        {subscribeMaster && (
          <div className="space-y-5">
            <div className="p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-foreground">{subscribeMaster.initials}</span>
              </div>
              <div>
                <p className="font-semibold">{subscribeMaster.name}</p>
                <p className="text-xs text-muted-foreground">+{subscribeMaster.return30d}% last 30 days · {subscribeMaster.winRate}% win rate</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-white/80">Capital Allocation (₹) *</label>
              <input type="number" value={allocation} onChange={(e) => setAllocation(e.target.value)} placeholder="e.g. 100000" className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50 text-foreground transition-all" />
              {allocation && <p className="text-xs text-brand-purple mt-1.5 font-medium">{formatCurrency(Number(allocation))} will be allocated</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-white/80"><Sliders className="w-4 h-4 text-brand-purple" />Scaling Factor (Multiplier)</label>
              <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
                <button onClick={() => { const i = MULTIPLIER_STEPS.indexOf(multiplier); if (i > 0) setMultiplier(MULTIPLIER_STEPS[i - 1]); }} className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-lg font-bold transition-all border border-black/10 dark:border-white/10 text-foreground flex items-center justify-center">−</button>
                <div className="flex-1 text-center"><span className="text-4xl font-black bg-gradient-to-r from-brand-purple to-brand-blue bg-clip-text text-transparent">{multiplier}x</span></div>
                <button onClick={() => { const i = MULTIPLIER_STEPS.indexOf(multiplier); if (i < MULTIPLIER_STEPS.length - 1) setMultiplier(MULTIPLIER_STEPS[i + 1]); }} className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-lg font-bold transition-all border border-black/10 dark:border-white/10 text-foreground flex items-center justify-center">+</button>
              </div>
            </div>

            {allocation && <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 space-y-2"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Example Scenario</p><p className="text-sm text-white/90 leading-relaxed">If the master trades <span className="text-foreground font-bold underline decoration-brand-purple/40">₹1,00,000</span> of capital, you will execute a trade worth <span className="text-brand-purple font-bold">{formatCurrency(Math.round(Number(allocation) * multiplier))}</span> automatically.</p></div>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setSubscribeModal(false)} className="flex-1 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
              <button onClick={confirmSubscribe} className="flex-1 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">Start Copying</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FindMasters;
