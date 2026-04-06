import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, UserPlus, Check, Star, Sliders, CheckSquare } from 'lucide-react';
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

const FindMasters = () => {
  const { addToast } = useToast();
  const { masters, loading, refetch, error } = useChildMasters();
  const { subscriptions } = useChildSubscriptions();
  const { accounts: brokerAccounts, loading: accountsLoading } = useBrokerAccounts();
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [slideOverOpen, setSlideOverOpen] = useState(false);
  const [subscribeModal, setSubscribeModal] = useState(false);
  const [subscribeMaster, setSubscribeMaster] = useState(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [selectedBrokerAccountId, setSelectedBrokerAccountId] = useState('');
  const [selectedMasters, setSelectedMasters] = useState([]);
  const [bulkSubscribeModal, setBulkSubscribeModal] = useState(false);

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error, addToast]);

  const subscriptionMap = useMemo(
    () =>
      subscriptions.reduce((acc, item) => {
        acc[String(item.masterId || item.id)] = item;
        return acc;
      }, {}),
    [subscriptions]
  );

  const normalizedMasters = useMemo(
    () =>
      masters.map((m) => ({
        id: m.id || m.masterId,
        name: m.name || m.masterName || 'Unknown',
        initials: (m.name || m.masterName || 'UN')
          .split(' ')
          .map((part) => part[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
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
    () => brokerAccounts.filter((account) => account.accountId && account.sessionActive),
    [brokerAccounts]
  );

  const filteredMasters = normalizedMasters.filter((master) => {
    if (searchQuery && !master.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (riskFilter !== 'All' && master.riskLevel !== riskFilter) return false;
    return true;
  });

  const isFollowing = (masterId) => Boolean(subscriptionMap[String(masterId)]);
  const getSubscriptionStatus = (masterId) =>
    String(subscriptionMap[String(masterId)]?.copyingStatus || subscriptionMap[String(masterId)]?.status || '').toUpperCase();

  const toggleMasterSelection = (masterId) => {
    setSelectedMasters((prev) =>
      prev.includes(masterId) ? prev.filter((id) => id !== masterId) : [...prev, masterId]
    );
  };

  const openSubscribe = async (e, master) => {
    e.stopPropagation();
    if (isFollowing(master.id)) {
      try {
        await childService.unsubscribe(master.id || master.masterId);
        addToast(`Subscription removed for ${master.name}`, 'info');
        refetch();
      } catch (subscribeError) {
        addToast(subscribeError.message, 'error');
      }
      return;
    }

    setSubscribeMaster(master);
    setMultiplier(1.0);
    setSelectedBrokerAccountId(activeBrokerAccounts[0]?.accountId || '');
    setSubscribeModal(true);
  };

  const openBulkSubscribe = () => {
    if (!selectedMasters.length) {
      addToast('Select at least one master for bulk subscribe', 'error');
      return;
    }

    if (!activeBrokerAccounts.length) {
      addToast('Connect a child broker account with an active session first', 'error');
      return;
    }

    setSelectedBrokerAccountId(activeBrokerAccounts[0]?.accountId || '');
    setMultiplier(1.0);
    setBulkSubscribeModal(true);
  };

  const confirmSubscribe = async () => {
    if (!selectedBrokerAccountId) {
      addToast('Connect and select a child broker account first', 'error');
      return;
    }

    try {
      const response = await childService.subscribe({
        masterId: subscribeMaster.id || subscribeMaster.masterId,
        brokerAccountId: selectedBrokerAccountId,
        scalingFactor: multiplier,
      });

      const responseStatus = String(response?.copyingStatus || response?.status || '').toUpperCase();
      setSubscribeModal(false);
      addToast(
        responseStatus === 'PENDING_APPROVAL'
          ? 'Subscription request sent. Waiting for master approval'
          : 'Subscribed successfully',
        responseStatus === 'PENDING_APPROVAL' ? 'warning' : 'success'
      );
      refetch();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const confirmBulkSubscribe = async () => {
    if (!selectedBrokerAccountId) {
      addToast('Select a child broker account first', 'error');
      return;
    }

    try {
      const response = await childService.bulkSubscribe(
        selectedMasters.map((masterId) => ({
          masterId,
          brokerAccountId: selectedBrokerAccountId,
          scalingFactor: multiplier,
        }))
      );
      const results = Array.isArray(response?.results) ? response.results : [];
      const pendingCount = results.filter((item) => String(item.status).toUpperCase() === 'PENDING_APPROVAL').length;
      setBulkSubscribeModal(false);
      setSelectedMasters([]);
      addToast(
        pendingCount
          ? `${results.length || selectedMasters.length} requests submitted. ${pendingCount} pending approval`
          : `${results.length || selectedMasters.length} masters subscribed successfully`,
        pendingCount ? 'warning' : 'success'
      );
      refetch();
    } catch (error) {
      addToast(error.message, 'error');
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
          <input
            type="text"
            placeholder="Search masters..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black/5 dark:bg-white/5 border border-border rounded-lg text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {['All', 'Low', 'Medium', 'High'].map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                riskFilter === r
                  ? 'bg-brand-purple text-foreground'
                  : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'
              }`}
            >
              {r}
            </button>
          ))}
          <button
            onClick={openBulkSubscribe}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors bg-brand-purple hover:bg-brand-purple/90 text-white inline-flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            Bulk Subscribe
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonLoader type="card" count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMasters.map((master) => {
            const status = getSubscriptionStatus(master.id);

            return (
              <GlassCard
                key={master.id}
                noPadding
                className="hover-lift cursor-pointer"
                onClick={() => {
                  setSelectedMaster(master);
                  setSlideOverOpen(true);
                }}
              >
                <div className="p-5">
                  <div className="flex justify-end mb-2">
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedMasters.includes(master.id)}
                        onChange={() => toggleMasterSelection(master.id)}
                        className="accent-brand-purple"
                      />
                      Select
                    </label>
                  </div>
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        master.riskLevel === 'Low'
                          ? 'bg-success/20 text-success'
                          : master.riskLevel === 'Medium'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-danger/20 text-danger'
                      }`}
                    >
                      {master.riskLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                    {[
                      ['30D Return', `+${master.return30d}%`, 'text-success'],
                      ['Win Rate', `${master.winRate}%`, ''],
                      ['YTD', `+${master.returnYTD}%`, 'text-success'],
                    ].map(([k, v, c]) => (
                      <div key={k} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground">{k}</p>
                        <p className={`text-sm font-bold mt-0.5 ${c}`}>{v}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {master.markets.map((m) => (
                      <span key={m} className="px-2 py-0.5 bg-brand-purple/10 text-brand-purple text-xs rounded">
                        {m}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={(e) => openSubscribe(e, master)}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      isFollowing(master.id)
                        ? status === 'PENDING_APPROVAL'
                          ? 'bg-warning/20 text-warning border border-warning/30'
                          : 'bg-success/20 text-success border border-success/30'
                        : 'bg-brand-purple hover:bg-brand-purple/90 text-white'
                    }`}
                  >
                    {isFollowing(master.id) ? (
                      <>
                        <Check className="w-4 h-4" />
                        {status === 'PENDING_APPROVAL' ? 'Pending Approval' : 'Following'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Subscribe
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            );
          })}
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
              {[
                ['30D Return', `+${selectedMaster.return30d}%`, 'text-success'],
                ['Win Rate', `${selectedMaster.winRate}%`, ''],
                ['Total Trades', formatNumber(selectedMaster.totalTrades), ''],
                ['Followers', formatNumber(selectedMaster.followers), ''],
                ['Best Trade', selectedMaster.bestTrade, 'text-success'],
                ['Worst Trade', selectedMaster.worstTrade, 'text-danger'],
              ].map(([k, v, c]) => (
                <div key={k} className="p-3 bg-black/5 dark:bg-white/5 rounded-lg border border-black/5 dark:border-white/5">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className={`font-bold mt-0.5 ${c}`}>{v}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Equity Curve</h3>
              <LineChart
                data={(selectedMaster.equityCurve || []).map((v, i) => ({
                  month: `M${i + 1}`,
                  value: typeof v === 'number' ? v : v.value || 0,
                }))}
                xKey="month"
                yKey="value"
                height={180}
              />
            </div>

            <button
              onClick={(e) => {
                openSubscribe(e, selectedMaster);
                setSlideOverOpen(false);
              }}
              className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isFollowing(selectedMaster.id)
                  ? getSubscriptionStatus(selectedMaster.id) === 'PENDING_APPROVAL'
                    ? 'bg-warning/20 text-warning'
                    : 'bg-success/20 text-success'
                  : 'bg-brand-purple hover:bg-brand-purple/90 text-foreground'
              }`}
            >
              {isFollowing(selectedMaster.id)
                ? getSubscriptionStatus(selectedMaster.id) === 'PENDING_APPROVAL'
                  ? 'Pending Approval - Click to Cancel'
                  : 'Following - Click to Unsubscribe'
                : 'Subscribe to Copy Trades'}
            </button>
          </div>
        )}
      </SlideOver>

      <Modal isOpen={subscribeModal} onClose={() => setSubscribeModal(false)} title={`Subscribe - ${subscribeMaster?.name}`} size="md">
        {subscribeMaster && (
          <div className="space-y-5">
            <div className="p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-foreground">{subscribeMaster.initials}</span>
              </div>
              <div>
                <p className="font-semibold">{subscribeMaster.name}</p>
                <p className="text-xs text-muted-foreground">
                  +{subscribeMaster.return30d}% last 30 days · {subscribeMaster.winRate}% win rate
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-white/80">Child Broker Account *</label>
              <select
                value={selectedBrokerAccountId}
                onChange={(e) => setSelectedBrokerAccountId(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple text-foreground transition-all"
              >
                <option value="">Select broker account</option>
                {activeBrokerAccounts.map((account) => (
                  <option key={account.accountId} value={account.accountId}>
                    {account.brokerName} - {account.clientId} - {account.nickname}
                  </option>
                ))}
              </select>
              {!activeBrokerAccounts.length && !accountsLoading && (
                <p className="text-xs text-warning mt-1.5 font-medium">
                  Connect a child broker account with an active session before subscribing.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-white/80">
                <Sliders className="w-4 h-4 text-brand-purple" />
                Scaling Factor (Multiplier)
              </label>
              <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
                <button
                  onClick={() => {
                    const i = MULTIPLIER_STEPS.indexOf(multiplier);
                    if (i > 0) setMultiplier(MULTIPLIER_STEPS[i - 1]);
                  }}
                  className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-lg font-bold transition-all border border-black/10 dark:border-white/10 text-foreground flex items-center justify-center"
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-black bg-gradient-to-r from-brand-purple to-brand-blue bg-clip-text text-transparent">
                    {multiplier}x
                  </span>
                </div>
                <button
                  onClick={() => {
                    const i = MULTIPLIER_STEPS.indexOf(multiplier);
                    if (i < MULTIPLIER_STEPS.length - 1) setMultiplier(MULTIPLIER_STEPS[i + 1]);
                  }}
                  className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-lg font-bold transition-all border border-black/10 dark:border-white/10 text-foreground flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {selectedBrokerAccountId && (
              <div className="p-4 bg-black/5 dark:bg-white/5 rounded-xl border border-black/5 dark:border-white/5 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Approval Flow</p>
                <p className="text-sm text-white/90 leading-relaxed">
                  New subscriptions may stay in <span className="text-warning font-bold">Pending Approval</span> until the master accepts them.
                  Previously approved subscriptions can become active immediately.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSubscribeModal(false)}
                className="flex-1 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubscribe}
                className="flex-1 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors"
              >
                Start Copying
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={bulkSubscribeModal} onClose={() => setBulkSubscribeModal(false)} title={`Bulk Subscribe - ${selectedMasters.length} Masters`} size="md">
        <div className="space-y-5">
          <div className="p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-lg">
            <p className="font-semibold">{selectedMasters.length} master(s) selected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Bulk subscribe uses the same child broker account and scaling factor for all selected masters.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-white/80">Child Broker Account *</label>
            <select
              value={selectedBrokerAccountId}
              onChange={(e) => setSelectedBrokerAccountId(e.target.value)}
              className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple text-foreground transition-all"
            >
              <option value="">Select broker account</option>
              {activeBrokerAccounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  {account.brokerName} - {account.clientId} - {account.nickname}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-white/80">
              <Sliders className="w-4 h-4 text-brand-purple" />
              Scaling Factor (Multiplier)
            </label>
            <div className="flex items-center gap-4 bg-black/5 dark:bg-white/5 p-4 rounded-xl border border-black/5 dark:border-white/5">
              <button
                onClick={() => {
                  const i = MULTIPLIER_STEPS.indexOf(multiplier);
                  if (i > 0) setMultiplier(MULTIPLIER_STEPS[i - 1]);
                }}
                className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-lg font-bold transition-all border border-black/10 dark:border-white/10 text-foreground flex items-center justify-center"
              >
                -
              </button>
              <div className="flex-1 text-center">
                <span className="text-4xl font-black bg-gradient-to-r from-brand-purple to-brand-blue bg-clip-text text-transparent">
                  {multiplier}x
                </span>
              </div>
              <button
                onClick={() => {
                  const i = MULTIPLIER_STEPS.indexOf(multiplier);
                  if (i < MULTIPLIER_STEPS.length - 1) setMultiplier(MULTIPLIER_STEPS[i + 1]);
                }}
                className="w-10 h-10 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-lg font-bold transition-all border border-black/10 dark:border-white/10 text-foreground flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setBulkSubscribeModal(false)}
              className="flex-1 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmBulkSubscribe}
              className="flex-1 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors"
            >
              Confirm Bulk Subscribe
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FindMasters;
