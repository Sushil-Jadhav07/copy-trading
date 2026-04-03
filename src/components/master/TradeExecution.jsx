import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, AlertTriangle, Users, ChevronDown, Plus, Trash2 } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';
import { formatCurrency } from '@/lib/utils';
import { useBrokerAccounts } from '@/hooks/useBroker';
import { useMasterChildren } from '@/hooks/useMaster';

const EXCHANGES = ['NSE', 'BSE', 'NFO', 'MCX', 'CDS'];
const ORDER_TYPES = ['MARKET', 'LIMIT', 'STOPLOSS', 'STOPLOSS_MARKET', 'TRAILING_STOP'];
const PRODUCTS = ['INTRADAY', 'DELIVERY', 'CARRYFORWARD'];

const INSTRUMENTS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE', ltp: 2456.75 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', ltp: 3892.50 },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', ltp: 1678.25 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE', ltp: 1523.80 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE', ltp: 987.45 },
  { symbol: 'NIFTY 50 FUT', name: 'Nifty 50 Futures', exchange: 'NFO', ltp: 22456.00 },
  { symbol: 'BANKNIFTY FUT', name: 'Bank Nifty Futures', exchange: 'NFO', ltp: 47892.65 },
  { symbol: 'NIFTY CE 22500', name: 'Nifty Call 22500', exchange: 'NFO', ltp: 245.50 },
  { symbol: 'NIFTY PE 22000', name: 'Nifty Put 22000', exchange: 'NFO', ltp: 185.20 },
  { symbol: 'CRUDEOIL FUT', name: 'Crude Oil Futures', exchange: 'MCX', ltp: 6543.00 },
  { symbol: 'GOLD FUT', name: 'Gold Futures', exchange: 'MCX', ltp: 62450.00 },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', ltp: 745.60 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', exchange: 'NSE', ltp: 952.40 },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', exchange: 'NSE', ltp: 3124.80 },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', ltp: 512.50 },
];

// Basket Order Row
const BasketRow = ({ row, idx, onChange, onRemove, instruments }) => (
  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-center p-2 bg-white/3 rounded-lg">
    <div className="sm:col-span-2">
      <select value={row.symbol} onChange={(e) => onChange(idx, 'symbol', e.target.value)}
        className="w-full bg-black/5 dark:bg-white/5 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-purple">
        <option value="">Select</option>
        {instruments.map((i) => <option key={i.symbol} value={i.symbol} className="bg-background">{i.symbol}</option>)}
      </select>
    </div>
    <select value={row.type} onChange={(e) => onChange(idx, 'type', e.target.value)}
      className="bg-black/5 dark:bg-white/5 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-purple">
      <option value="BUY" className="bg-background">BUY</option>
      <option value="SELL" className="bg-background">SELL</option>
    </select>
    <input type="number" value={row.qty} onChange={(e) => onChange(idx, 'qty', e.target.value)}
      placeholder="Qty" min="1"
      className="bg-black/5 dark:bg-white/5 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-purple" />
    <select value={row.orderType} onChange={(e) => onChange(idx, 'orderType', e.target.value)}
      className="bg-black/5 dark:bg-white/5 border border-border rounded px-2 py-1.5 text-sm focus:outline-none focus:border-brand-purple">
      {['MARKET', 'LIMIT'].map((t) => <option key={t} value={t} className="bg-background">{t}</option>)}
    </select>
    <button onClick={() => onRemove(idx)} className="p-1.5 hover:bg-danger/20 rounded text-danger transition-colors sm:mx-auto">
      <Trash2 className="w-4 h-4" />
    </button>
  </div>
);

const TradeExecution = () => {
  const { addToast } = useToast();
  const { accounts } = useBrokerAccounts();
  const { children } = useMasterChildren();
  const [mode, setMode] = useState('single'); // single | basket | oco
  const [form, setForm] = useState({
    broker: '',
    exchange: 'NSE',
    instrumentSearch: '',
    symbol: '',
    ltp: 0,
    orderType: 'MARKET',
    transType: 'BUY',
    product: 'INTRADAY',
    qty: '',
    price: '',
    triggerPrice: '',
    trailingJump: '',
  });
  const [instrumentResults, setInstrumentResults] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [executedOrder, setExecutedOrder] = useState(null);
  const [basketRows, setBasketRows] = useState([
    { symbol: '', type: 'BUY', qty: '', orderType: 'MARKET' },
    { symbol: '', type: 'BUY', qty: '', orderType: 'MARKET' },
  ]);
  const [ocoForm, setOcoForm] = useState({ targetPrice: '', stopLossPrice: '' });

  const BROKERS = accounts.map((account) => account.broker).filter(Boolean);
  const activeFollowers = children.filter((f) => f.status === 'ACTIVE' || f.tradingEnabled).map((f) => ({
    id: f.id || f.childId,
    name: f.name || f.childName || 'Child',
    initials: (f.name || f.childName || 'CH').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
  }));
  const selectedInstrument = INSTRUMENTS.find((i) => i.symbol === form.symbol);

  const handleInstrumentSearch = (q) => {
    setForm((f) => ({ ...f, instrumentSearch: q, symbol: '' }));
    if (q.length > 0) {
      setInstrumentResults(INSTRUMENTS.filter((i) =>
        i.symbol.toLowerCase().includes(q.toLowerCase()) ||
        i.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 6));
    } else {
      setInstrumentResults([]);
    }
  };

  const selectInstrument = (inst) => {
    setForm((f) => ({ ...f, symbol: inst.symbol, ltp: inst.ltp, instrumentSearch: inst.symbol, exchange: inst.exchange }));
    setInstrumentResults([]);
  };

  const handleSubmit = () => {
    if (!form.broker) { addToast('Please select a broker', 'error'); return; }
    if (!form.symbol) { addToast('Please select an instrument', 'error'); return; }
    if (!form.qty || form.qty <= 0) { addToast('Please enter valid quantity', 'error'); return; }
    if (['LIMIT', 'STOPLOSS'].includes(form.orderType) && !form.price) {
      addToast('Please enter price for limit order', 'error'); return;
    }
    setConfirmModal(true);
  };

  const confirmExecute = () => {
    const order = {
      id: Date.now(),
      broker: form.broker,
      symbol: form.symbol,
      exchange: form.exchange,
      type: form.transType,
      orderType: form.orderType,
      qty: Number(form.qty),
      price: form.orderType === 'MARKET' ? selectedInstrument?.ltp : Number(form.price),
      product: form.product,
      copiedTo: activeFollowers.length,
      timestamp: new Date().toLocaleTimeString('en-IN'),
    };
    setExecutedOrder(order);
    setConfirmModal(false);
    setSuccessModal(true);
    addToast(`Order placed — copied to ${activeFollowers.length} children`, 'success');
    setForm((f) => ({ ...f, symbol: '', instrumentSearch: '', qty: '', price: '', triggerPrice: '' }));
  };

  const handleBasketRowChange = (idx, key, val) => {
    setBasketRows((prev) => prev.map((r, i) => i === idx ? { ...r, [key]: val } : r));
  };

  const handleBasketSubmit = () => {
    const filled = basketRows.filter((r) => r.symbol && r.qty);
    if (!form.broker) { addToast('Please select a broker', 'error'); return; }
    if (filled.length === 0) { addToast('Please fill at least one row', 'error'); return; }
    addToast(`Basket of ${filled.length} orders placed — copied to ${activeFollowers.length} children`, 'success');
  };

  const needsPrice = ['LIMIT', 'STOPLOSS', 'STOPLOSS_MARKET', 'TRAILING_STOP'].includes(form.orderType);
  const needsTrigger = ['STOPLOSS', 'STOPLOSS_MARKET', 'TRAILING_STOP'].includes(form.orderType);
  const needsTrailing = form.orderType === 'TRAILING_STOP';

  const estimatedValue = selectedInstrument && form.qty
    ? (form.orderType === 'MARKET' ? selectedInstrument.ltp : (Number(form.price) || 0)) * Number(form.qty)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Trade Execution</h1>
        <p className="text-muted-foreground">Place orders — automatically copied to all active child accounts</p>
      </div>

      {/* Active children banner */}
      <div className="flex items-start sm:items-center gap-3 p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-lg">
        <Users className="w-5 h-5 text-brand-purple" />
        <p className="text-sm">
          <span className="font-semibold text-brand-purple">{activeFollowers.length} child accounts</span> are active —
          trades placed here will be copied with their respective multipliers.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex flex-col sm:flex-row gap-2">
        {[
          { key: 'single', label: 'Single Order' },
          { key: 'basket', label: 'Basket Order' },
          { key: 'oco', label: 'OCO Order' },
        ].map((m) => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m.key ? 'bg-brand-purple text-foreground' : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {/* SINGLE ORDER */}
      {mode === 'single' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard title="Order Details">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Broker */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Broker *</label>
                  <select value={form.broker} onChange={(e) => setForm((f) => ({ ...f, broker: e.target.value }))}
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                    <option value="" className="bg-background">Select Broker</option>
                    {BROKERS.map((b) => <option key={b} value={b} className="bg-background capitalize">{b}</option>)}
                  </select>
                </div>

                {/* Exchange */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Exchange *</label>
                  <select value={form.exchange} onChange={(e) => setForm((f) => ({ ...f, exchange: e.target.value }))}
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                    {EXCHANGES.map((e) => <option key={e} value={e} className="bg-background">{e}</option>)}
                  </select>
                </div>

                {/* Instrument Search */}
                <div className="md:col-span-2 relative">
                  <label className="block text-xs text-muted-foreground mb-1.5">Instrument *</label>
                  <input value={form.instrumentSearch} onChange={(e) => handleInstrumentSearch(e.target.value)}
                    placeholder="Search symbol (e.g. RELIANCE, NIFTY...)"
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
                  {instrumentResults.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 mt-1 glass-card border border-border/50 rounded-lg overflow-hidden">
                      {instrumentResults.map((inst) => (
                        <button key={inst.symbol} onClick={() => selectInstrument(inst)}
                          className="w-full text-left px-4 py-2.5 hover:bg-black/10 dark:bg-white/10 transition-colors flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-sm">{inst.symbol}</span>
                            <span className="text-xs text-muted-foreground ml-2">{inst.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">₹{inst.ltp.toLocaleString('en-IN')}</span>
                            <span className="text-xs text-muted-foreground ml-2">{inst.exchange}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {form.symbol && (
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 bg-brand-purple/10 border border-brand-purple/20 rounded-lg">
                      <span className="text-sm font-bold text-brand-purple">{form.symbol}</span>
                      <span className="text-sm">LTP: <strong>₹{selectedInstrument?.ltp.toLocaleString('en-IN')}</strong></span>
                      <span className="text-xs text-muted-foreground">{form.exchange}</span>
                    </div>
                  )}
                </div>

                {/* BUY / SELL toggle */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1.5">Transaction Type *</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {['BUY', 'SELL'].map((t) => (
                      <button key={t} onClick={() => setForm((f) => ({ ...f, transType: t }))}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors ${
                          form.transType === t
                            ? t === 'BUY' ? 'bg-success text-foreground' : 'bg-danger text-foreground'
                            : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Order Type */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Order Type *</label>
                  <select value={form.orderType} onChange={(e) => setForm((f) => ({ ...f, orderType: e.target.value }))}
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                    {ORDER_TYPES.map((t) => <option key={t} value={t} className="bg-background">{t.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>

                {/* Product */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Product *</label>
                  <select value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                    {PRODUCTS.map((p) => <option key={p} value={p} className="bg-background">{p}</option>)}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Quantity *</label>
                  <input type="number" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                    placeholder="Enter quantity" min="1"
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
                </div>

                {/* Price (conditional) */}
                {needsPrice && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">
                      {form.orderType === 'TRAILING_STOP' ? 'Base Price' : 'Price'} *
                    </label>
                    <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                      placeholder="Enter price" step="0.05"
                      className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
                  </div>
                )}

                {/* Trigger Price (conditional) */}
                {needsTrigger && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Trigger Price *</label>
                    <input type="number" value={form.triggerPrice} onChange={(e) => setForm((f) => ({ ...f, triggerPrice: e.target.value }))}
                      placeholder="Enter trigger price" step="0.05"
                      className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
                  </div>
                )}

                {/* Trailing Jump */}
                {needsTrailing && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">Trailing Jump (₹) *</label>
                    <input type="number" value={form.trailingJump} onChange={(e) => setForm((f) => ({ ...f, trailingJump: e.target.value }))}
                      placeholder="e.g. 5" step="0.5"
                      className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-border/40">
                <button onClick={handleSubmit}
                  className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    form.transType === 'BUY'
                      ? 'bg-success hover:bg-success/90 text-foreground shadow-lg shadow-success/20'
                      : 'bg-danger hover:bg-danger/90 text-foreground shadow-lg shadow-danger/20'
                  }`}>
                  <Zap className="w-4 h-4" />
                  Place {form.transType} Order
                </button>
              </div>
            </GlassCard>
          </div>

          {/* Order Summary sidebar */}
          <div className="space-y-4">
            <GlassCard title="Order Summary">
              <div className="space-y-3 text-sm">
                {[
                  ['Broker', form.broker ? form.broker.toUpperCase() : '—'],
                  ['Instrument', form.symbol || '—'],
                  ['Exchange', form.exchange],
                  ['Type', form.transType],
                  ['Order Type', form.orderType.replace(/_/g, ' ')],
                  ['Product', form.product],
                  ['Quantity', form.qty || '—'],
                  ['Price', form.orderType === 'MARKET' ? 'MARKET' : (form.price ? `₹${form.price}` : '—')],
                  ['Est. Value', estimatedValue > 0 ? formatCurrency(estimatedValue) : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className={`font-medium ${
                      k === 'Type' ? (v === 'BUY' ? 'text-success' : 'text-danger') : ''
                    }`}>{v}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard title="Copy to Children">
              <div className="space-y-2">
                {activeFollowers.slice(0, 4).map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 bg-black/5 dark:bg-white/5 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center">
                        <span className="text-xs font-bold text-foreground" style={{ fontSize: '8px' }}>{f.initials}</span>
                      </div>
                      <span className="text-xs">{f.name.split(' ')[0]}</span>
                    </div>
                    <span className="text-xs text-brand-purple font-bold">1x</span>
                  </div>
                ))}
                {activeFollowers.length > 4 && (
                  <p className="text-xs text-center text-muted-foreground">+{activeFollowers.length - 4} more</p>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* BASKET ORDER */}
      {mode === 'basket' && (
        <GlassCard title="Basket Order" subtitle="Place multiple orders simultaneously">
          <div className="mb-4">
            <label className="block text-xs text-muted-foreground mb-1.5">Broker *</label>
            <select value={form.broker} onChange={(e) => setForm((f) => ({ ...f, broker: e.target.value }))}
              className="w-full sm:w-48 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
              <option value="" className="bg-background">Select Broker</option>
              {BROKERS.map((b) => <option key={b} value={b} className="bg-background capitalize">{b}</option>)}
            </select>
          </div>

          {/* Header */}
          <div className="hidden sm:grid grid-cols-6 gap-2 px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <div className="col-span-2">Symbol</div>
            <div>Type</div>
            <div>Qty</div>
            <div>Order Type</div>
            <div className="text-center">Del</div>
          </div>

          <div className="space-y-2">
            {basketRows.map((row, idx) => (
              <BasketRow key={idx} row={row} idx={idx}
                onChange={handleBasketRowChange}
                onRemove={(i) => setBasketRows((p) => p.filter((_, ri) => ri !== i))}
                instruments={INSTRUMENTS} />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-4 pt-4 border-t border-border/40">
            <button onClick={() => setBasketRows((p) => [...p, { symbol: '', type: 'BUY', qty: '', orderType: 'MARKET' }])}
              className="flex items-center gap-2 px-3 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">
              <Plus className="w-4 h-4" />
              Add Row
            </button>
            <button onClick={handleBasketSubmit}
              className="flex-1 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" />
              Execute Basket ({basketRows.filter((r) => r.symbol && r.qty).length} orders)
            </button>
          </div>
        </GlassCard>
      )}

      {/* OCO ORDER */}
      {mode === 'oco' && (
        <GlassCard title="OCO Order" subtitle="One Cancels Other — set both target and stop loss simultaneously">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Broker *</label>
              <select value={form.broker} onChange={(e) => setForm((f) => ({ ...f, broker: e.target.value }))}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                <option value="" className="bg-background">Select Broker</option>
                {BROKERS.map((b) => <option key={b} value={b} className="bg-background capitalize">{b}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="block text-xs text-muted-foreground mb-1.5">Instrument *</label>
              <input value={form.instrumentSearch} onChange={(e) => handleInstrumentSearch(e.target.value)}
                placeholder="Search symbol..."
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
              {instrumentResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 glass-card border border-border/50 rounded-lg overflow-hidden">
                  {instrumentResults.map((inst) => (
                    <button key={inst.symbol} onClick={() => selectInstrument(inst)}
                      className="w-full text-left px-4 py-2 hover:bg-black/10 dark:bg-white/10 transition-colors text-sm">
                      {inst.symbol} — ₹{inst.ltp}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Quantity *</label>
              <input type="number" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                placeholder="Enter quantity"
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Entry Price *</label>
              <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Entry price"
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success inline-block" /> Target Price *
              </label>
              <input type="number" value={ocoForm.targetPrice} onChange={(e) => setOcoForm((f) => ({ ...f, targetPrice: e.target.value }))}
                placeholder="Profit target"
                className="w-full bg-black/5 dark:bg-white/5 border border-success/30 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-success placeholder:text-muted-foreground/50" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-danger inline-block" /> Stop Loss Price *
              </label>
              <input type="number" value={ocoForm.stopLossPrice} onChange={(e) => setOcoForm((f) => ({ ...f, stopLossPrice: e.target.value }))}
                placeholder="Stop loss"
                className="w-full bg-black/5 dark:bg-white/5 border border-danger/30 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-danger placeholder:text-muted-foreground/50" />
            </div>
          </div>

          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            OCO: When one order (target/SL) executes, the other is automatically cancelled.
          </div>

          <button onClick={() => {
            if (!form.broker || !form.symbol || !form.qty) { addToast('Please fill all required fields', 'error'); return; }
            addToast(`OCO order placed for ${form.symbol} — copied to ${activeFollowers.length} children`, 'success');
          }}
            className="w-full mt-4 py-3 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            Place OCO Order
          </button>
        </GlassCard>
      )}

      {/* Confirm Modal */}
      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Confirm Order" size="sm">
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${form.transType === 'BUY' ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'}`}>
            <p className="text-lg font-bold text-center">
              <span className={form.transType === 'BUY' ? 'text-success' : 'text-danger'}>{form.transType}</span>
              {' '}{form.qty} × {form.symbol}
            </p>
            <p className="text-center text-sm text-muted-foreground mt-1">
              {form.orderType} @ {form.orderType === 'MARKET' ? 'Market Price' : `₹${form.price}`}
            </p>
          </div>
          <div className="p-3 bg-brand-purple/10 border border-brand-purple/20 rounded-lg text-sm text-center">
            This will be copied to <strong className="text-brand-purple">{activeFollowers.length} children</strong>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={confirmExecute}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors text-foreground ${form.transType === 'BUY' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'}`}>
              Confirm {form.transType}
            </button>
          </div>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={successModal} onClose={() => setSuccessModal(false)} title="Order Placed!" size="sm">
        {executedOrder && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-14 h-14 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-7 h-7 text-success" />
              </div>
              <p className="font-bold text-lg">{executedOrder.symbol}</p>
              <p className="text-muted-foreground text-sm">{executedOrder.type} {executedOrder.qty} @ ₹{executedOrder.price?.toLocaleString('en-IN')}</p>
            </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ['Order ID', `#${executedOrder.id.toString().slice(-6)}`],
                ['Time', executedOrder.timestamp],
                ['Copied To', `${executedOrder.copiedTo} children`],
                ['Status', 'Executed'],
              ].map(([k, v]) => (
                <div key={k} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setSuccessModal(false)} className="w-full py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">Done</button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TradeExecution;
