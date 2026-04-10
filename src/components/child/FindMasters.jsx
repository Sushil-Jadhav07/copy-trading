import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, UserPlus, Star, Sliders, CheckSquare, Clock, CheckCircle2, PauseCircle, XCircle } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import SlideOver from '@/components/shared/SlideOver';
import Modal from '@/components/shared/Modal';
import LineChart from '@/components/charts/LineChart';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useChildMasters, useChildSubscriptions } from '@/hooks/useChild';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { childService } from '@/lib/child';
import { formatNumber } from '@/lib/utils';
import { useToast } from '@/components/shared/Toast';

const MULTIPLIER_STEPS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 5.0];

/* ── Status pill ── */
const SUB_STATUS = {
  ACTIVE:           { label: 'Copying',           cls: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',  icon: CheckCircle2 },
  PENDING_APPROVAL: { label: 'Awaiting Approval',  cls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',        icon: Clock },
  PAUSED:           { label: 'Paused',              cls: 'bg-slate-500/12 text-slate-500 dark:text-slate-400',        icon: PauseCircle },
  REJECTED:         { label: 'Rejected',            cls: 'bg-red-500/12 text-red-600 dark:text-red-400',              icon: XCircle },
};

const SubStatusPill = ({ status }) => {
  const meta = SUB_STATUS[status] || { label: 'Subscribed', cls: 'bg-black/8 dark:bg-white/8 text-muted-foreground', icon: CheckCircle2 };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.cls}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  );
};

const FindMasters = () => {
  const { addToast } = useToast();
  const { masters, loading, refetch, error } = useChildMasters();
  const { subscriptions }                    = useChildSubscriptions();
  const { accounts: brokerAccounts, loading: accountsLoading } = useBrokerAccounts();

  const [searchQuery, setSearchQuery]   = useState('');
  const [riskFilter, setRiskFilter]     = useState('All');
  const [selectedMaster, setSelectedMaster]   = useState(null);
  const [slideOverOpen, setSlideOverOpen]     = useState(false);
  const [subscribeModal, setSubscribeModal]   = useState(false);
  const [subscribeMaster, setSubscribeMaster] = useState(null);
  const [multiplier, setMultiplier]           = useState(1.0);
  const [selectedBrokerAccountId, setSelectedBrokerAccountId] = useState('');
  const [selectedMasters, setSelectedMasters] = useState([]);
  const [bulkSubscribeModal, setBulkSubscribeModal] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess]     = useState(false);
  const [subscribing, setSubscribing]               = useState(false);

  useEffect(() => { if (error) addToast(error, 'error'); }, [error, addToast]);

  const subscriptionMap = useMemo(
    () => subscriptions.reduce((acc, item) => { acc[String(item.masterId || item.id)] = item; return acc; }, {}),
    [subscriptions]
  );

  const normalizedMasters = useMemo(
    () => masters.map((m) => ({
      id: m.id || m.masterId,
      name: m.name || m.masterName || 'Unknown',
      initials: (m.name || m.masterName || 'UN').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase(),
      winRate: m.winRate || m.win_rate || 0,
      return30d: m.return30d || m.monthlyReturn || 0,
      returnYTD: m.returnYTD || m.yearlyReturn || 0,
      followers: m.followers || m.followerCount || m.subscribers || 0,
      riskLevel: m.riskLevel || m.risk || 'Medium',
      markets: Array.isArray(m.markets) ? m.markets : [m.market || 'Equity'],
      description: m.description || m.bio || '',
      equityCurve: m.equityCurve || m.performanceChart || [],
      verified: Boolean(m.verified),
      totalTrades: m.totalTrades || m.tradeCount || 0,
      bestTrade: m.bestTrade || 'N/A',
      worstTrade: m.worstTrade || 'N/A',
      ...m,
    })),
    [masters]
  );

  const activeBrokerAccounts = useMemo(
    () => brokerAccounts.filter((a) => a.accountId && a.sessionActive),
    [brokerAccounts]
  );

  const filteredMasters = normalizedMasters.filter((m) => {
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (riskFilter !== 'All' && m.riskLevel !== riskFilter) return false;
    return true;
  });

  const isFollowing        = (id) => Boolean(subscriptionMap[String(id)]);
  const getSubStatus       = (id) => String(subscriptionMap[String(id)]?.copyingStatus || subscriptionMap[String(id)]?.status || '').toUpperCase();
  const toggleSelection    = (id) => setSelectedMasters((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const openSubscribe = (e, master) => {
    e?.stopPropagation();
    if (isFollowing(master.id)) return;
    setSubscribeMaster(master);
    setMultiplier(1.0);
    setSelectedBrokerAccountId(activeBrokerAccounts[0]?.accountId || '');
    setSubscribeSuccess(false);
    setSubscribeModal(true);
  };

  const openBulkSubscribe = () => {
    if (!selectedMasters.length) { addToast('Select at least one master', 'error'); return; }
    if (!activeBrokerAccounts.length) { addToast('Connect a broker account with an active session first', 'error'); return; }
    setSelectedBrokerAccountId(activeBrokerAccounts[0]?.accountId || '');
    setMultiplier(1.0);
    setBulkSubscribeModal(true);
  };

  const confirmSubscribe = async () => {
    if (!selectedBrokerAccountId) { addToast('Select a broker account first', 'error'); return; }
    setSubscribing(true);
    try {
      await childService.subscribe({
        masterId: subscribeMaster.id || subscribeMaster.masterId,
        brokerAccountId: selectedBrokerAccountId,
        scalingFactor: multiplier,
      });
      setSubscribeSuccess(true);
      refetch();
      setTimeout(() => setSubscribeModal(false), 2200);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const confirmBulkSubscribe = async () => {
    if (!selectedBrokerAccountId) { addToast('Select a broker account first', 'error'); return; }
    setSubscribing(true);
    try {
      await childService.bulkSubscribe(selectedMasters.map((masterId) => ({ masterId, brokerAccountId: selectedBrokerAccountId, scalingFactor: multiplier })));
      setBulkSubscribeModal(false);
      setSelectedMasters([]);
      addToast(`${selectedMasters.length} subscription request${selectedMasters.length > 1 ? 's' : ''} sent — awaiting master approval`, 'success');
      refetch();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const MultiplierControl = () => (
    <div>
      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
        <Sliders className="w-4 h-4 text-brand-purple" /> Scaling Factor
      </label>
      <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-border/40">
        <button type="button"
          onClick={() => { const i = MULTIPLIER_STEPS.indexOf(multiplier); if (i > 0) setMultiplier(MULTIPLIER_STEPS[i - 1]); }}
          className="w-9 h-9 bg-black/8 dark:bg-white/8 hover:bg-black/12 dark:hover:bg-white/12 rounded-lg text-lg font-bold transition-all border border-border flex items-center justify-center">
          −
        </button>
        <div className="flex-1 text-center">
          <span className="text-3xl font-black bg-gradient-to-r from-brand-purple to-brand-blue bg-clip-text text-transparent">
            {multiplier}x
          </span>
        </div>
        <button type="button"
          onClick={() => { const i = MULTIPLIER_STEPS.indexOf(multiplier); if (i < MULTIPLIER_STEPS.length - 1) setMultiplier(MULTIPLIER_STEPS[i + 1]); }}
          className="w-9 h-9 bg-black/8 dark:bg-white/8 hover:bg-black/12 dark:hover:bg-white/12 rounded-lg text-lg font-bold transition-all border border-border flex items-center justify-center">
          +
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Find Masters</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Discover top-performing traders and subscribe to copy their trades.</p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search masters..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-black/5 dark:bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
          </div>
          <button onClick={openBulkSubscribe} disabled={!selectedMasters.length}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm bg-brand-purple hover:bg-brand-purple/90 text-white inline-flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors">
            <CheckSquare className="w-4 h-4" /> Bulk Subscribe {selectedMasters.length > 0 && `(${selectedMasters.length})`}
          </button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {['All', 'Low', 'Medium', 'High'].map((r) => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm transition-colors ${riskFilter === r ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/8'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Master cards */}
      {loading ? (
        <SkeletonLoader type="card" count={6} />
      ) : filteredMasters.length === 0 ? (
        <GlassCard>
          <div className="text-center py-16">
            <p className="text-muted-foreground">No masters found matching your filters.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMasters.map((master) => {
            const status    = getSubStatus(master.id);
            const following = isFollowing(master.id);
            return (
              <GlassCard key={master.id} noPadding className="hover-lift cursor-pointer" onClick={() => { setSelectedMaster(master); setSlideOverOpen(true); }}>
                <div className="p-5">
                  {/* Select checkbox */}
                  <div className="flex justify-end mb-2">
                    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedMasters.includes(master.id)} onChange={() => toggleSelection(master.id)} className="accent-brand-purple rounded" />
                      Select
                    </label>
                  </div>

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                        <span className="text-base font-bold text-white">{master.initials}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-foreground text-sm">{master.name}</h3>
                          {master.verified && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{formatNumber(master.followers)} followers</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${master.riskLevel === 'Low' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : master.riskLevel === 'Medium' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-red-500/12 text-red-600 dark:text-red-400'}`}>
                      {master.riskLevel}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {[['30D Return', `+${master.return30d}%`, 'text-emerald-500'], ['Win Rate', `${master.winRate}%`, ''], ['YTD', `+${master.returnYTD}%`, 'text-emerald-500']].map(([k, v, c]) => (
                      <div key={k} className="p-2 bg-black/4 dark:bg-white/4 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground">{k}</p>
                        <p className={`text-xs font-bold mt-0.5 ${c}`}>{v}</p>
                      </div>
                    ))}
                  </div>

                  {/* Markets */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {master.markets.map((m) => (
                      <span key={m} className="px-1.5 py-0.5 bg-brand-purple/10 text-brand-purple text-[10px] rounded font-medium">{m}</span>
                    ))}
                  </div>

                  {/* Subscribe button + status */}
                  {following ? (
                    <div className="flex flex-col gap-2 items-center">
                      <div className="w-full py-2 rounded-lg text-xs font-medium text-center bg-black/6 dark:bg-white/6 border border-border/40 text-muted-foreground cursor-default">
                        Already Subscribed
                      </div>
                      <SubStatusPill status={status} />
                    </div>
                  ) : (
                    <button onClick={(e) => openSubscribe(e, master)}
                      className="w-full py-2.5 rounded-lg text-sm font-medium bg-brand-purple hover:bg-brand-purple/90 text-white transition-colors flex items-center justify-center gap-2">
                      <UserPlus className="w-4 h-4" /> Subscribe
                    </button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* SlideOver — master detail */}
      <SlideOver isOpen={slideOverOpen} onClose={() => setSlideOverOpen(false)} title={selectedMaster?.name} size="md">
        {selectedMaster && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-white">{selectedMaster.initials}</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold">{selectedMaster.name}</h2>
                  {selectedMaster.verified && <span className="px-2 py-0.5 bg-amber-500/15 text-amber-500 text-xs rounded-full font-medium">Verified</span>}
                </div>
                <p className="text-muted-foreground text-sm">{selectedMaster.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['30D Return', `+${selectedMaster.return30d}%`, 'text-emerald-500'], ['Win Rate', `${selectedMaster.winRate}%`, ''], ['Total Trades', formatNumber(selectedMaster.totalTrades), ''], ['Followers', formatNumber(selectedMaster.followers), ''], ['Best Trade', selectedMaster.bestTrade, 'text-emerald-500'], ['Worst Trade', selectedMaster.worstTrade, 'text-red-500']].map(([k, v, c]) => (
                <div key={k} className="p-3 bg-black/4 dark:bg-white/4 rounded-lg border border-border/30">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className={`font-bold mt-0.5 text-sm ${c}`}>{v}</p>
                </div>
              ))}
            </div>
            {selectedMaster.equityCurve?.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-sm">Equity Curve</h3>
                <LineChart data={selectedMaster.equityCurve.map((v, i) => ({ month: `M${i + 1}`, value: typeof v === 'number' ? v : v.value || 0 }))} xKey="month" yKey="value" height={180} />
              </div>
            )}
            <button onClick={(e) => { openSubscribe(e, selectedMaster); setSlideOverOpen(false); }}
              disabled={isFollowing(selectedMaster.id) && ['ACTIVE', 'PENDING_APPROVAL'].includes(getSubStatus(selectedMaster.id))}
              className="w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/90 text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {isFollowing(selectedMaster.id) ? getSubStatus(selectedMaster.id) === 'PENDING_APPROVAL' ? 'Awaiting Approval' : 'Copying' : 'Subscribe to Copy Trades'}
            </button>
          </div>
        )}
      </SlideOver>

      {/* Subscribe modal */}
      <Modal isOpen={subscribeModal} onClose={() => setSubscribeModal(false)} title={`Subscribe — ${subscribeMaster?.name}`} size="md">
        {subscribeMaster && (
          <div className="space-y-4">
            {subscribeSuccess ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center mx-auto">
                  <Clock className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold">Request Sent!</h3>
                <p className="text-sm text-muted-foreground">
                  Your request has been sent to <strong>{subscribeMaster.name}</strong>. You'll start copying trades once they approve your subscription.
                </p>
              </div>
            ) : (
              <>
                {/* Master preview */}
                <div className="p-3 bg-brand-purple/8 border border-brand-purple/18 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">{subscribeMaster.initials}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{subscribeMaster.name}</p>
                    <p className="text-xs text-muted-foreground">+{subscribeMaster.return30d}% 30d · {subscribeMaster.winRate}% win rate</p>
                  </div>
                </div>

                {/* Broker account */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Broker Account <span className="text-red-500">*</span></label>
                  <select value={selectedBrokerAccountId} onChange={(e) => setSelectedBrokerAccountId(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple text-foreground">
                    <option value="">Select broker account</option>
                    {activeBrokerAccounts.map((a) => (
                      <option key={a.accountId} value={a.accountId}>{a.brokerName} — {a.clientId} — {a.nickname}</option>
                    ))}
                  </select>
                  {!activeBrokerAccounts.length && !accountsLoading && (
                    <p className="text-xs text-amber-500 mt-1.5">Connect and activate a broker account first before subscribing.</p>
                  )}
                </div>

                <MultiplierControl />

                {/* Approval flow info */}
                <div className="p-3 bg-amber-500/8 border border-amber-500/18 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5">Approval Required</p>
                      <p className="text-xs text-muted-foreground">
                        Your request will be sent to {subscribeMaster.name} for approval. Trading will start automatically once they accept. You can cancel anytime.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button onClick={() => setSubscribeModal(false)} className="flex-1 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
                  <button onClick={confirmSubscribe} disabled={subscribing || !selectedBrokerAccountId}
                    className="flex-1 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {subscribing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    {subscribing ? 'Sending…' : 'Send Request'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Bulk subscribe modal */}
      <Modal isOpen={bulkSubscribeModal} onClose={() => setBulkSubscribeModal(false)} title={`Bulk Subscribe — ${selectedMasters.length} Masters`} size="md">
        <div className="space-y-4">
          <div className="p-3 bg-brand-purple/8 border border-brand-purple/18 rounded-xl">
            <p className="font-semibold text-sm">{selectedMasters.length} master{selectedMasters.length > 1 ? 's' : ''} selected</p>
            <p className="text-xs text-muted-foreground mt-0.5">All requests require master approval before trades are copied.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Broker Account <span className="text-red-500">*</span></label>
            <select value={selectedBrokerAccountId} onChange={(e) => setSelectedBrokerAccountId(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple text-foreground">
              <option value="">Select broker account</option>
              {activeBrokerAccounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>{a.brokerName} — {a.clientId} — {a.nickname}</option>
              ))}
            </select>
          </div>
          <MultiplierControl />
          <div className="flex gap-3 pt-1">
            <button onClick={() => setBulkSubscribeModal(false)} className="flex-1 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={confirmBulkSubscribe} disabled={subscribing || !selectedBrokerAccountId}
              className="flex-1 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {subscribing ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              {subscribing ? 'Sending…' : 'Send Requests'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FindMasters;