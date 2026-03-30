import React, { useState } from 'react';
import { Zap, Info } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import { useToast } from '@/components/shared/Toast';

const BROKERS = ['zerodha', 'groww', 'angelone', 'upstox', 'dhan'];
const ORDER_TYPES = ['MARKET', 'LIMIT', 'STOPLOSS', 'STOPLOSS_MARKET'];
const PRODUCTS = ['INTRADAY', 'DELIVERY'];
const INSTRUMENTS = [
  { symbol: 'RELIANCE', exchange: 'NSE', ltp: 2456.75 },
  { symbol: 'TCS', exchange: 'NSE', ltp: 3892.50 },
  { symbol: 'INFY', exchange: 'NSE', ltp: 1678.25 },
  { symbol: 'HDFCBANK', exchange: 'NSE', ltp: 1523.80 },
  { symbol: 'NIFTY 50 FUT', exchange: 'NFO', ltp: 22456.00 },
  { symbol: 'BANKNIFTY FUT', exchange: 'NFO', ltp: 47892.65 },
  { symbol: 'SBIN', exchange: 'NSE', ltp: 745.60 },
  { symbol: 'TATAMOTORS', exchange: 'NSE', ltp: 952.40 },
];

const ChildTradeExecution = () => {
  const { addToast } = useToast();
  const [form, setForm] = useState({ broker: '', symbol: '', instrumentSearch: '', exchange: 'NSE', transType: 'BUY', orderType: 'MARKET', product: 'INTRADAY', qty: '', price: '', triggerPrice: '' });
  const [results, setResults] = useState([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [myOrders, setMyOrders] = useState([]);

  const selectedInst = INSTRUMENTS.find((i) => i.symbol === form.symbol);

  const handleSearch = (q) => {
    setForm((f) => ({ ...f, instrumentSearch: q, symbol: '' }));
    setResults(q.length > 0 ? INSTRUMENTS.filter((i) => i.symbol.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : []);
  };

  const handleSubmit = () => {
    if (!form.broker) { addToast('Select a broker', 'error'); return; }
    if (!form.symbol) { addToast('Select an instrument', 'error'); return; }
    if (!form.qty || form.qty <= 0) { addToast('Enter valid quantity', 'error'); return; }
    setConfirmModal(true);
  };

  const confirmOrder = () => {
    const order = {
      id: Date.now(), symbol: form.symbol, type: form.transType, qty: Number(form.qty),
      price: form.orderType === 'MARKET' ? selectedInst?.ltp : Number(form.price),
      orderType: form.orderType, product: form.product, status: 'Executed',
      time: new Date().toLocaleTimeString('en-IN'), broker: form.broker,
    };
    setMyOrders((p) => [order, ...p]);
    setConfirmModal(false);
    setSuccessModal(true);
    setForm((f) => ({ ...f, symbol: '', instrumentSearch: '', qty: '', price: '' }));
  };

  const needsPrice = ['LIMIT', 'STOPLOSS', 'STOPLOSS_MARKET'].includes(form.orderType);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Place Order</h1>
        <p className="text-muted-foreground">Execute personal trades — independent from copy trading</p>
      </div>

      <div className="flex items-start gap-2 p-3 bg-brand-blue/10 border border-brand-blue/20 rounded-lg text-sm">
        <Info className="w-4 h-4 text-brand-blue mt-0.5 flex-shrink-0" />
        <p className="text-muted-foreground">These are <strong className="text-foreground">your personal trades</strong> and are not linked to any master. They won't be copied to others.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard title="Order Form">
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
                <input value={form.instrumentSearch} onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search symbol..."
                  className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
                {results.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 glass-card border border-border/50 rounded-lg overflow-hidden">
                    {results.map((inst) => (
                      <button key={inst.symbol} onClick={() => { setForm((f) => ({ ...f, symbol: inst.symbol, instrumentSearch: inst.symbol, exchange: inst.exchange })); setResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-black/10 dark:bg-white/10 transition-colors flex justify-between text-sm">
                        <span className="font-semibold">{inst.symbol}</span>
                        <span className="text-muted-foreground">₹{inst.ltp}</span>
                      </button>
                    ))}
                  </div>
                )}
                {form.symbol && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <span className="text-brand-purple font-bold">{form.symbol}</span>
                    <span>LTP: ₹{selectedInst?.ltp.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1.5">Transaction Type</label>
                <div className="flex gap-2">
                  {['BUY', 'SELL'].map((t) => (
                    <button key={t} onClick={() => setForm((f) => ({ ...f, transType: t }))}
                      className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-colors ${form.transType === t ? (t === 'BUY' ? 'bg-success text-foreground' : 'bg-danger text-foreground') : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Order Type</label>
                <select value={form.orderType} onChange={(e) => setForm((f) => ({ ...f, orderType: e.target.value }))}
                  className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                  {ORDER_TYPES.map((t) => <option key={t} value={t} className="bg-background">{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Product</label>
                <select value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                  className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none">
                  {PRODUCTS.map((p) => <option key={p} value={p} className="bg-background">{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Quantity *</label>
                <input type="number" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))}
                  placeholder="Enter quantity" min="1"
                  className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
              </div>

              {needsPrice && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1.5">Price *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    placeholder="Enter price" step="0.05"
                    className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/50" />
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-border/40">
              <button onClick={handleSubmit}
                className={`w-full py-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 text-foreground ${form.transType === 'BUY' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'}`}>
                <Zap className="w-4 h-4" />
                Place {form.transType} Order
              </button>
            </div>
          </GlassCard>
        </div>

        {/* My orders today */}
        <div>
          <GlassCard title="My Orders Today" subtitle={`${myOrders.length} orders`}>
            {myOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No orders placed yet</p>
            ) : (
              <div className="space-y-2">
                {myOrders.slice(0, 6).map((o) => (
                  <div key={o.id} className="p-2.5 bg-black/5 dark:bg-white/5 rounded-lg text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">{o.symbol}</span>
                      <span className={`text-xs font-bold ${o.type === 'BUY' ? 'text-success' : 'text-danger'}`}>{o.type}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Qty: {o.qty} @ ₹{o.price?.toFixed(2)}</span>
                      <span>{o.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      <Modal isOpen={confirmModal} onClose={() => setConfirmModal(false)} title="Confirm Order" size="sm">
        <div className="space-y-4">
          <div className={`p-4 rounded-lg border text-center ${form.transType === 'BUY' ? 'bg-success/10 border-success/30' : 'bg-danger/10 border-danger/30'}`}>
            <p className="text-lg font-bold">
              <span className={form.transType === 'BUY' ? 'text-success' : 'text-danger'}>{form.transType}</span> {form.qty} × {form.symbol}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{form.orderType} order via {form.broker}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setConfirmModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={confirmOrder}
              className={`flex-1 py-2 rounded-lg text-sm font-bold text-foreground transition-colors ${form.transType === 'BUY' ? 'bg-success hover:bg-success/90' : 'bg-danger hover:bg-danger/90'}`}>
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={successModal} onClose={() => setSuccessModal(false)} title="Order Executed!" size="sm">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-success/20 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-7 h-7 text-success" />
          </div>
          <p className="text-muted-foreground text-sm">Your personal order has been placed successfully.</p>
          <button onClick={() => setSuccessModal(false)} className="w-full py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">Done</button>
        </div>
      </Modal>
    </div>
  );
};

export default ChildTradeExecution;