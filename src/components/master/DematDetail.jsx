import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { formatCurrency } from '@/lib/utils';

const TABS = ['Positions', 'Orders', 'Trades'];

const getMarginValue = (marginData, fallback = 0) =>
  marginData?.availableMargin ?? marginData?.available ?? marginData?.net ?? fallback;

const getErrorText = (error, fallback) => error?.message || fallback;

const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const TransBadge = ({ type }) => (
  <span
    className={`px-2.5 py-0.5 rounded text-xs font-bold ${
      type === 'BUY' || type === 'CARRYFORWARD'
        ? 'bg-success/20 text-success border border-success/30'
        : 'bg-danger/20 text-danger border border-danger/30'
    }`}
  >
    {type}
  </span>
);

const StatusBadge = ({ status }) => {
  const cfg = {
    Completed: 'bg-success/20 text-success border-success/30',
    Pending: 'bg-warning/20 text-warning border-warning/30',
    Rejected: 'bg-danger/20 text-danger border-danger/30',
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
        cfg[status] || 'bg-black/10 dark:bg-white/10 text-foreground border-black/10 dark:border-white/10'
      }`}
    >
      {status}
    </span>
  );
};

const DematDetail = ({ accountId, onBack, scope = 'master' }) => {
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
  const [loadingData, setLoadingData] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [positionsError, setPositionsError] = useState('');
  const [marginError, setMarginError] = useState('');
  const isChildScope = scope === 'child';

  const resolvedBack = onBack || (() => navigate('/master/user-management'));

  useEffect(() => {
    if (!accountId) return;
    let isMounted = true;

    const loadData = async () => {
      setLoadingData(true);
      setPositionsError('');
      setMarginError('');

      const requests = [brokerService.getAccount(accountId)];

      if (!isChildScope) {
        requests.push(brokerService.getPositions(accountId));
        requests.push(brokerService.getMargin(accountId));
      }

      const results = await Promise.allSettled(requests);
      const accountResult = results[0];
      const positionsResult = isChildScope ? null : results[1];
      const marginResult = isChildScope ? null : results[2];

      if (!isMounted) return;

      if (accountResult.status === 'fulfilled') {
        const acct = accountResult.value;
        const marginValue =
          marginResult?.status === 'fulfilled'
            ? getMarginValue(marginResult.value, toNumber(acct.margin))
            : toNumber(acct.margin);

        setAccount({
          broker: acct.brokerName || acct.brokerId || '',
          userId: acct.clientId || '',
          nickname: acct.nickname || '',
          margin: marginValue,
          sessionActive: acct.sessionActive,
          status: acct.status,
          linkedAt: acct.linkedAt || null,
        });
      } else {
        addToast(getErrorText(accountResult.reason, 'Unable to load account'), 'error');
      }

      if (isChildScope) {
        setPositions([]);
        setPositionsError('Live positions are not available for child demat accounts with the current API.');
      } else if (positionsResult.status === 'fulfilled') {
        setPositions(positionsResult.value);
      } else {
        const message = getErrorText(positionsResult.reason, 'Unable to load positions');
        setPositions([]);
        setPositionsError(message);
        addToast(message, 'error');
      }

      if (isChildScope) {
        setMarginError('Live margin is not exposed for child demat accounts with the current API.');
      } else if (marginResult.status === 'fulfilled') {
        const marginValue = getMarginValue(marginResult.value, 0);
        setMarginError('');
        setAccount((prev) => (prev ? { ...prev, margin: marginValue } : prev));
      } else {
        const message = getErrorText(marginResult.reason, 'Unable to load margin');
        setMarginError(message);
        addToast(message, 'error');
      }

      setOrders([]);
      setTrades([]);
      setLoadingData(false);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [accountId, addToast]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setPositionsError('');
    setMarginError('');

    try {
      if (isChildScope) {
        const acct = await brokerService.getAccount(accountId);
        setAccount((prev) => ({
          ...(prev || {}),
          broker: acct.brokerName || acct.brokerId || prev?.broker || '',
          userId: acct.clientId || prev?.userId || '',
          nickname: acct.nickname || prev?.nickname || '',
          sessionActive: acct.sessionActive,
          status: acct.status,
          linkedAt: acct.linkedAt || prev?.linkedAt || null,
          margin: prev?.margin || toNumber(acct.margin),
        }));
        addToast('Account details refreshed', 'success');
        return;
      }

      const [positionsResult, marginResult] = await Promise.allSettled([
        brokerService.getPositions(accountId),
        brokerService.getMargin(accountId),
      ]);

      let refreshed = false;

      if (positionsResult.status === 'fulfilled') {
        setPositions(positionsResult.value);
        refreshed = true;
      } else {
        const message = getErrorText(positionsResult.reason, 'Unable to load positions');
        setPositionsError(message);
        addToast(message, 'error');
      }

      if (marginResult.status === 'fulfilled') {
        const marginValue = getMarginValue(marginResult.value, toNumber(account?.margin));
        setAccount((prev) => (prev ? { ...prev, margin: marginValue } : prev));
        refreshed = true;
      } else {
        const message = getErrorText(marginResult.reason, 'Unable to load margin');
        setMarginError(message);
        addToast(message, 'error');
      }

      if (refreshed) {
        addToast('Refreshed', 'success');
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      await brokerService.getAccountStatus(accountId);
      if (isChildScope) {
        setTestResult({ state: 'success', message: 'Connection successful.' });
      } else {
        const marginData = await brokerService.getMargin(accountId);
        const balance = getMarginValue(marginData, 0);
        setMarginError('');
        setTestResult({ state: 'success', message: `Connection successful. Balance: ${formatCurrency(balance)}` });
        setAccount((prev) => (prev ? { ...prev, margin: balance } : prev));
      }
    } catch (e) {
      setTestResult({ state: 'error', message: `Connection failed. ${e.message}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const confirmSquareOff = () => {
    setPositions((p) => p.filter((x) => x.id !== selectedPos.id));
    setSquareOffModal(false);
    addToast(`${selectedPos.symbol} squared off`, 'success');
  };

  const getRelativeTime = (date) => {
    if (!date) return 'Last synced: -';
    const ts = new Date(date).getTime();
    if (!Number.isFinite(ts)) return 'Last synced: -';

    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'Last synced: just now';
    if (mins < 60) return `Last synced: ${mins} min${mins === 1 ? '' : 's'} ago`;

    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Last synced: ${hrs} hr${hrs === 1 ? '' : 's'} ago`;

    const days = Math.floor(hrs / 24);
    return `Last synced: ${days} day${days === 1 ? '' : 's'} ago`;
  };

  if (!account && !loadingData) {
    return (
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center gap-4">
          <button onClick={resolvedBack} className="p-2 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Demat Account</h1>
        </div>
        <p className="text-sm text-danger">Unable to load account details for this demat account.</p>
      </div>
    );
  }

  const totalPnL = positions.reduce((sum, position) => sum + toNumber(position.pnl), 0);
  const statusValue = String(account?.status || (account?.sessionActive ? 'ACTIVE' : 'INACTIVE')).toUpperCase();
  const statusMeta = (() => {
    if (statusValue === 'ACTIVE') return { cls: 'connected', label: 'Connected & Verified' };
    if (statusValue === 'PENDING' || statusValue === 'PENDING_APPROVAL') return { cls: 'pending', label: 'Pending' };
    if (statusValue === 'FAILED' || statusValue === 'ERROR') return { cls: 'failed', label: 'Connection Failed' };
    return { cls: 'inactive', label: 'Inactive' };
  })();

  const filteredPositions = positions.filter((p) => !search || String(p.symbol || '').toLowerCase().includes(search.toLowerCase()));
  const filteredOrders = orders.filter((o) => !search || String(o.symbol || '').toLowerCase().includes(search.toLowerCase()));
  const filteredTrades = trades.filter((t) => !search || String(t.symbol || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="glass-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={resolvedBack} className="p-2 hover:bg-black/10 dark:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold uppercase tracking-wide">
            {account?.broker?.toUpperCase()} - {account?.userId} - {account?.nickname?.toUpperCase()}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xl font-bold">{formatCurrency(account?.margin)}</span>
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

      <div className="glass-card p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`status-dot ${statusMeta.cls}`} />
            <span className="text-sm font-semibold">{statusMeta.label}</span>
          </div>
          <div className="text-xs text-muted-foreground">{getRelativeTime(account?.linkedAt)}</div>
          <div className="text-xs text-muted-foreground">Balance: {formatCurrency(account?.margin)}</div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {testResult && (
            <span className={`text-xs ${testResult.state === 'success' ? 'text-success' : 'text-danger'}`}>
              {testResult.message}
            </span>
          )}
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 rounded-lg border border-border/70 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 text-sm transition-colors disabled:opacity-60"
          >
            {testingConnection ? 'Testing...' : 'Test Connection'}
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex border-b border-border/50">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearch('');
              }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-black/10 dark:bg-white/10 text-foreground border-b-2 border-brand-purple'
                  : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4 border-b border-border/30 flex justify-end">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-56 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
          />
        </div>

        {activeTab === 'Positions' && positionsError && (
          <div className="px-4 py-3 border-b border-border/30 text-sm text-danger bg-danger/10">
            {positionsError}
          </div>
        )}

        {marginError && (
          <div className="px-4 py-3 border-b border-border/30 text-sm text-warning bg-warning/10">
            {marginError}
          </div>
        )}

        <div className="overflow-x-auto">
          {activeTab === 'Positions' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Type', 'Qty', 'P&L', 'LTP', 'Avg Price', 'Trans', 'Square Off'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPositions.map((pos, idx) => {
                  const pnl = toNumber(pos.pnl);
                  const ltp = toNumber(pos.ltp);
                  const avgPrice = toNumber(pos.avgPrice);

                  return (
                    <motion.tr
                      key={pos.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.04 }}
                      className="border-b border-border/30 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-sm">{pos.symbol}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{pos.type}</td>
                      <td className="px-4 py-3 text-sm">{pos.qty}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {pnl >= 0 ? '+' : ''}
                          {pnl.toFixed(2)} {pnl >= 0 ? '↑' : '↓'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{ltp.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{avgPrice > 0 ? avgPrice.toFixed(2) : '0'}</td>
                      <td className="px-4 py-3">
                        <button className="px-2.5 py-1 bg-success/20 border border-success/30 text-success rounded text-xs font-bold hover:bg-success/30 transition-colors">
                          SELL
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedPos(pos);
                            setSquareOffModal(true);
                          }}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                            pnl >= 0 ? 'bg-success hover:bg-success/90 text-foreground' : 'bg-danger hover:bg-danger/90 text-foreground'
                          }`}
                        >
                          Square OFF
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
                {filteredPositions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {loadingData ? 'Loading positions...' : positionsError ? 'Positions are unavailable' : 'No positions found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'Orders' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Trans', 'Product', 'Type', 'Qty', 'Price', 'Time', 'Order Id', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((ord, idx) => (
                  <motion.tr
                    key={ord.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{ord.symbol}</td>
                    <td className="px-4 py-3">
                      <TransBadge type={ord.type} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">CARRYFORW...</td>
                    <td className="px-4 py-3 text-sm">{ord.orderType}</td>
                    <td className="px-4 py-3 text-sm">{ord.qty}</td>
                    <td className="px-4 py-3 text-sm">{toNumber(ord.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{ord.time}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">2307120{String(ord.id).padStart(8, '0')}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={ord.status} />
                    </td>
                  </motion.tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'Trades' && (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Symbol', 'Order ID', 'Product', 'Trans', 'Price', 'Time'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTrades.map((tr, idx) => (
                  <motion.tr
                    key={tr.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="border-b border-border/30 hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-sm">{tr.symbol}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">2307120{String(tr.id).padStart(8, '0')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">CARRYFORWARD</td>
                    <td className="px-4 py-3">
                      <TransBadge type={tr.action} />
                    </td>
                    <td className="px-4 py-3 text-sm">{toNumber(tr.price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tr.time}</td>
                  </motion.tr>
                ))}
                {filteredTrades.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No trades found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-4 py-3 border-t border-border/30 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Rows per page: 10 &nbsp;|&nbsp;
            {activeTab === 'Positions' && `1-${filteredPositions.length} of ${filteredPositions.length}`}
            {activeTab === 'Orders' && `1-${filteredOrders.length} of ${filteredOrders.length}`}
            {activeTab === 'Trades' && `1-${filteredTrades.length} of ${filteredTrades.length}`}
          </span>
        </div>
      </div>

      <Modal isOpen={squareOffModal} onClose={() => setSquareOffModal(false)} title="Square Off Position" size="sm">
        {selectedPos && (
          <div className="space-y-4">
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-lg space-y-2 text-sm">
              {[
                ['Symbol', selectedPos.symbol],
                ['Qty', selectedPos.qty],
                ['LTP', `Rs ${toNumber(selectedPos.ltp).toFixed(2)}`],
                ['Unrealized P&L', `${toNumber(selectedPos.pnl) >= 0 ? '+' : ''}${formatCurrency(toNumber(selectedPos.pnl))}`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-muted-foreground">{k}</span>
                  <span
                    className={
                      k === 'Unrealized P&L'
                        ? toNumber(selectedPos.pnl) >= 0
                          ? 'text-success font-semibold'
                          : 'text-danger font-semibold'
                        : 'font-medium'
                    }
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">This will place a market order to exit this position immediately.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setSquareOffModal(false)}
                className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSquareOff}
                className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors"
              >
                Confirm Square Off
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DematDetail;
