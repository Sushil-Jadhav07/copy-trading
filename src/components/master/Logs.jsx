import React, { useEffect, useMemo, useState } from 'react';
import { Eye, CalendarDays } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { adminService } from '@/lib/admin';

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

const Logs = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [search, setSearch] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [rawLogs, setRawLogs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    adminService.getTradeLogs().then((data) => {
      if (!isMounted) return;
      setRawLogs(data);
      setSelectedDate(formatDate(data[0]?.timestamp || new Date().toISOString()));
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const tradeLogs = useMemo(() => {
    const grouped = rawLogs.reduce((acc, log) => {
      const date = formatDate(log.timestamp || new Date().toISOString());
      if (!acc[date]) acc[date] = [];
      acc[date].push(log);
      return acc;
    }, {});
    return Object.entries(grouped).map(([date, trades]) => ({
      date,
      count: trades.length,
      trades: trades.map((trade) => ({
        id: trade.id,
        symbol: trade.symbol,
        exchange: trade.raw?.exchange || 'N/A',
        qty: trade.qty,
        action: trade.action,
        price: trade.price,
        time: trade.timestamp,
        childOrders: Array.isArray(trade.children) ? trade.children : [],
      })),
    }));
  }, [rawLogs]);

  const currentLog = tradeLogs.find((l) => l.date === selectedDate) || tradeLogs[0];
  const allChildOrders = selectedTrade ? selectedTrade.childOrders.map((o, i) => ({ ...o, idx: i + 1 })) : currentLog?.trades.flatMap((t) => t.childOrders.map((o, i) => ({ ...o, symbol: t.symbol, idx: i + 1 }))) || [];
  const filteredTrades = (currentLog?.trades || []).filter((t) => !search || t.symbol.toLowerCase().includes(search.toLowerCase()));
  const filteredChildOrders = allChildOrders.filter((o) => !childSearch || (o.child || o.name || '').toLowerCase().includes(childSearch.toLowerCase()));

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-bold sm:text-2xl">Logs</h1></div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <GlassCard noPadding>
            <div className="p-3 border-b border-border/50"><input placeholder="Search" className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" /></div>
            <div className="py-1">
              <div className="px-4 py-2 border-b border-border/30"><div className="grid grid-cols-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide"><span>Id</span><span>Date - Count</span></div></div>
              {tradeLogs.map((log, idx) => <button key={log.date} onClick={() => { setSelectedDate(log.date); setSelectedTrade(null); }} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-black/5 dark:bg-white/5 transition-colors ${selectedDate === log.date ? 'bg-brand-purple/15 border-l-2 border-brand-purple' : ''}`}><span className="text-xs text-muted-foreground w-4">{idx + 1}</span><span className={`text-xs px-2 py-1 rounded font-mono ${selectedDate === log.date ? 'bg-brand-purple text-foreground' : 'bg-black/10 dark:bg-white/10 text-muted-foreground'}`}>{formatDate(log.date)} - {log.count}</span></button>)}
            </div>
          </GlassCard>
        </div>
        <div className="lg:col-span-3 space-y-6">
          <GlassCard noPadding>
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between"><div><h3 className="font-semibold">Trade Log</h3><p className="text-xs text-muted-foreground mt-0.5">{selectedDate} · {currentLog?.count || 0} trades</p></div><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-full sm:w-48 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" /></div>
            {filteredTrades.length > 0 ? <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border/50">{['Id', 'Type', 'Symbol', 'Exchange', 'Qty', 'Action', 'Price', 'Time', 'Child Order'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{filteredTrades.map((trade, idx) => <motion.tr key={trade.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }} onClick={() => setSelectedTrade(selectedTrade?.id === trade.id ? null : trade)} className={`border-b border-border/30 hover:bg-white/3 transition-colors cursor-pointer ${selectedTrade?.id === trade.id ? 'bg-brand-purple/10' : ''}`}><td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td><td className="px-4 py-3 text-xs text-muted-foreground">copytrading</td><td className="px-4 py-3 font-semibold text-sm">{trade.symbol}</td><td className="px-4 py-3 text-xs text-muted-foreground">{trade.exchange}</td><td className="px-4 py-3 text-sm">{trade.qty}</td><td className="px-4 py-3">{trade.action}</td><td className="px-4 py-3 text-sm">{Number(trade.price || 0).toFixed(2)}</td><td className="px-4 py-3 text-sm text-muted-foreground">{trade.time}</td><td className="px-4 py-3"><button onClick={(e) => { e.stopPropagation(); setSelectedTrade(selectedTrade?.id === trade.id ? null : trade); }} className="w-8 h-8 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors"><Eye className="w-4 h-4 text-foreground" /></button></td></motion.tr>)}</tbody></table></div> : <div className="py-12 text-center text-muted-foreground"><CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-20" /><p className="text-sm">No trade data for this date</p></div>}
          </GlassCard>
          <GlassCard noPadding>
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between"><h3 className="font-semibold">Child Orders</h3><input value={childSearch} onChange={(e) => setChildSearch(e.target.value)} placeholder="Search" className="w-full sm:w-48 bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" /></div>
            <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-border/50">{['Id', 'Qty', 'Time', 'Status', 'Order ID'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr></thead><tbody>{filteredChildOrders.map((o, idx) => <motion.tr key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }} className="border-b border-border/30 hover:bg-white/3 transition-colors"><td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td><td className="px-4 py-3 text-sm">{o.qty > 0 ? o.qty : '—'}</td><td className="px-4 py-3 text-sm text-muted-foreground">{selectedTrade?.time || '08:54:01'}</td><td className="px-4 py-3 text-sm">{o.status || 'Success'}</td><td className="px-4 py-3 text-xs font-mono text-muted-foreground">{`23071200${(idx + 9570000 + idx * 3).toString().slice(-7)}`}</td></motion.tr>)}{filteredChildOrders.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{selectedTrade ? 'No child orders for this trade' : 'Click a trade row above to see child orders'}</td></tr>}</tbody></table></div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default Logs;
