import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import logomain from '/asset/whitelogo.png';

const TICKERS = [
  { sym: 'NIFTY 50', val: '24,832.15', change: +0.42 },
  { sym: 'SENSEX',   val: '81,741.34', change: +0.31 },
  { sym: 'RELIANCE', val: '2,943.70',  change: +1.24 },
  { sym: 'TCS',      val: '4,102.45',  change: -0.18 },
  { sym: 'INFY',     val: '1,876.60',  change: +0.67 },
  { sym: 'HDFC',     val: '1,712.90',  change: -0.33 },
  { sym: 'ICICI',    val: '1,289.55',  change: +0.89 },
  { sym: 'BAJFINANCE', val: '7,231.00', change: +1.12 },
  { sym: 'WIPRO',    val: '561.40',    change: -0.44 },
  { sym: 'ADANIENT', val: '3,102.80',  change: +2.10 },
  { sym: 'TATAMOTORS', val: '987.35',  change: -0.55 },
  { sym: 'SBIN',     val: '834.20',    change: +0.78 },
];

const ROLE_META = {
  MASTER: { label: 'Master Trader',     color: '#00d7a3', glow: 'rgba(0,215,163,0.25)',  bg: 'rgba(0,215,163,0.12)'  },
  CHILD:  { label: 'Portfolio Account', color: '#7c85ff', glow: 'rgba(124,133,255,0.25)', bg: 'rgba(124,133,255,0.12)' },
  ADMIN:  { label: 'Administrator',     color: '#f59e0b', glow: 'rgba(245,158,11,0.25)',  bg: 'rgba(245,158,11,0.12)' },
};

const DURATION_MS = 2600;

const buildCandles = () => {
  const candles = [];
  let price = 120;
  for (let i = 0; i < 22; i++) {
    const open  = price;
    const move  = (Math.random() - 0.44) * 9;
    const close = open + move;
    const high  = Math.max(open, close) + Math.random() * 3.5;
    const low   = Math.min(open, close) - Math.random() * 3.5;
    candles.push({ open, close, high, low });
    price = close;
  }
  return candles;
};

const LOADING_STEPS = [
  'Connecting to market feeds…',
  'Loading your portfolio…',
  'Syncing broker accounts…',
  'Preparing dashboard…',
];

const StockMarketLoader = ({ user, onDone }) => {
  const [progress, setProgress]   = useState(0);
  const [stepIdx, setStepIdx]     = useState(0);
  const candles = useRef(buildCandles()).current;
  const role    = String(user?.role || '').toUpperCase();
  const meta    = ROLE_META[role] || ROLE_META.CHILD;

  /* ── progress bar + step text ── */
  useEffect(() => {
    const start = Date.now();
    let raf;
    const tick = () => {
      const pct = Math.min((Date.now() - start) / DURATION_MS, 1);
      setProgress(pct * 100);
      setStepIdx(Math.min(Math.floor(pct * LOADING_STEPS.length), LOADING_STEPS.length - 1));
      if (pct < 1) raf = requestAnimationFrame(tick);
      else onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  /* ── candlestick chart geometry ── */
  const W = 340, H = 110;
  const prices = candles.map((c) => (c.high + c.low) / 2);
  const minP   = Math.min(...prices);
  const maxP   = Math.max(...prices);
  const pad    = (maxP - minP) * 0.1 || 1;
  const mapY   = (v) => H - ((v - minP + pad) / (maxP - minP + pad * 2)) * H;
  const mapX   = (i) => (i / (candles.length - 1)) * W;
  const candleW = Math.max(W / candles.length - 2, 3);

  const linePts = candles.map((c, i) => `${i === 0 ? 'M' : 'L'}${mapX(i).toFixed(1)},${mapY((c.high + c.low) / 2).toFixed(1)}`).join(' ');
  const areaPath = `${linePts} L${W},${H} L0,${H} Z`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: 'linear-gradient(145deg,#030c07 0%,#061410 55%,#030907 100%)' }}
    >
      {/* subtle grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: 'linear-gradient(rgba(0,215,163,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,215,163,1) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      {/* radial glow behind content */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: `radial-gradient(ellipse 55% 45% at 50% 55%, ${meta.glow} 0%, transparent 70%)`,
      }} />

      {/* ── scrolling ticker bar ── */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden border-b border-white/[0.06] bg-black/40 py-1.5 backdrop-blur-sm">
        <motion.div
          className="flex gap-10 whitespace-nowrap"
          style={{ width: 'max-content' }}
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 font-mono text-[11px]">
              <span className="font-semibold text-white/55">{t.sym}</span>
              <span className="text-white/35">{t.val}</span>
              <span className={`font-bold ${t.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {t.change >= 0 ? '▲' : '▼'} {Math.abs(t.change).toFixed(2)}%
              </span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* ── main card ── */}
      <div className="relative flex flex-col items-center gap-7 px-6">

        {/* logo */}
        <motion.img
          src={logomain}
          alt="logo"
          className="h-10 object-contain"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.45 }}
        />

        {/* candlestick chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5 }}
          className="relative rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-sm"
          style={{ width: W + 32 }}
        >
          <svg width={W} height={H} className="overflow-visible">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={meta.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={meta.color} stopOpacity={0.01} />
              </linearGradient>
              <clipPath id="chartClip">
                <rect x={0} y={0} width={W} height={H} />
              </clipPath>
            </defs>

            {/* candles */}
            {candles.map((c, i) => {
              const x      = mapX(i);
              const isGreen = c.close >= c.open;
              const color  = isGreen ? '#00d7a3' : '#ef4444';
              const bodyT  = mapY(Math.max(c.open, c.close));
              const bodyH  = Math.max(Math.abs(mapY(c.open) - mapY(c.close)), 1.5);
              return (
                <motion.g key={i}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  transition={{ delay: 0.25 + i * 0.035, duration: 0.28, ease: 'easeOut' }}
                  style={{ transformOrigin: `${x}px ${H}px` }}
                >
                  <line x1={x} y1={mapY(c.high)} x2={x} y2={mapY(c.low)} stroke={color} strokeWidth={1} strokeOpacity={0.7} />
                  <rect x={x - candleW / 2} y={bodyT} width={candleW} height={bodyH} fill={color} rx={1.5} />
                </motion.g>
              );
            })}

            {/* filled area */}
            <motion.path
              d={areaPath}
              fill="url(#areaGrad)"
              clipPath="url(#chartClip)"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            />

            {/* line */}
            <motion.path
              d={linePts}
              fill="none"
              stroke={meta.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={W * 2}
              initial={{ strokeDashoffset: W * 2 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ delay: 0.5, duration: 1.4, ease: 'easeOut' }}
            />

            {/* pulsing dot at end */}
            <motion.circle
              cx={mapX(candles.length - 1)}
              cy={mapY((candles[candles.length - 1].high + candles[candles.length - 1].low) / 2)}
              r={4}
              fill={meta.color}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.5, 1] }}
              transition={{ delay: 1.8, duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            />
          </svg>
        </motion.div>

        {/* welcome + role badge */}
        <motion.div
          className="flex flex-col items-center gap-2.5 text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
        >
          <h2 className="text-[1.6rem] font-black tracking-tight text-white leading-tight">
            Welcome back,{' '}
            <span style={{ color: meta.color }}>{user?.name?.split(' ')[0] || 'Trader'}</span>!
          </h2>

          <div
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-black uppercase tracking-[0.1em]"
            style={{ background: meta.bg, color: meta.color }}
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: meta.color }} />
            {meta.label}
          </div>

          <motion.p
            key={stepIdx}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-1 text-xs text-white/35"
          >
            {LOADING_STEPS[stepIdx]}
          </motion.p>
        </motion.div>
      </div>

      {/* ── progress bar ── */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="h-[2px] w-full bg-white/[0.05]">
          <motion.div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${meta.color}, #7c85ff)`,
              boxShadow: `0 0 8px ${meta.color}`,
            }}
            transition={{ ease: 'linear' }}
          />
        </div>
        <p className="py-2 text-center text-[10px] font-semibold text-white/20 tracking-widest uppercase">
          {Math.round(progress)}%
        </p>
      </div>
    </motion.div>
  );
};

export default StockMarketLoader;
