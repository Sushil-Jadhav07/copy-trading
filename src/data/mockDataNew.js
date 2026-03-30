// ─── NEW MOCK DATA ADDITIONS ───────────────────────────────────────────────
// Add these exports to your existing mockData.js

// Broker Accounts (User Management)
export const brokerAccounts = [
  {
    id: 1,
    broker: 'zerodha',
    brokerLabel: 'Zerodha',
    userId: 'ZR1234',
    nickname: 'Main Account',
    mobile: '9876543210',
    email: 'rahul@example.com',
    margin: 250000,
    usedMargin: 82000,
    pnl: 18450,
    pnlPct: 7.38,
    positions: 5,
    orders: 3,
    status: 'connected',
    lastSync: '2 min ago',
  },
  {
    id: 2,
    broker: 'angelone',
    brokerLabel: 'Angel One',
    userId: 'AN5678',
    nickname: 'F&O Account',
    mobile: '9876543211',
    email: 'rahul.fno@example.com',
    margin: 500000,
    usedMargin: 310000,
    pnl: -12300,
    pnlPct: -2.46,
    positions: 8,
    orders: 6,
    status: 'connected',
    lastSync: '5 min ago',
  },
  {
    id: 3,
    broker: 'aliceblue',
    brokerLabel: 'Alice Blue',
    userId: 'AB9012',
    nickname: 'Commodity Acc',
    mobile: '9876543212',
    email: 'rahul.comm@example.com',
    margin: 150000,
    usedMargin: 45000,
    pnl: 5200,
    pnlPct: 3.47,
    positions: 2,
    orders: 1,
    status: 'disconnected',
    lastSync: '2 hours ago',
  },
  {
    id: 4,
    broker: 'fyers',
    brokerLabel: 'Fyers',
    userId: 'FY3456',
    nickname: 'Swing Trading',
    mobile: '9876543213',
    email: 'rahul.swing@example.com',
    margin: 300000,
    usedMargin: 120000,
    pnl: 9800,
    pnlPct: 3.27,
    positions: 4,
    orders: 2,
    status: 'connected',
    lastSync: '1 min ago',
  },
  {
    id: 5,
    broker: 'shoonya',
    brokerLabel: 'Shoonya',
    userId: 'SH7890',
    nickname: 'Scalping',
    mobile: '9876543214',
    email: 'rahul.scalp@example.com',
    margin: 100000,
    usedMargin: 0,
    pnl: 0,
    pnlPct: 0,
    positions: 0,
    orders: 0,
    status: 'disconnected',
    lastSync: 'Never',
  },
];

// Demat Positions
export const dematPositions = {
  1: [
    { id: 1, symbol: 'RELIANCE', exchange: 'NSE', qty: 50, avgPrice: 2420.50, ltp: 2456.75, pnl: 1812.50, pnlPct: 1.50, type: 'Long' },
    { id: 2, symbol: 'TCS', exchange: 'NSE', qty: 25, avgPrice: 3920.00, ltp: 3892.50, pnl: -687.50, pnlPct: -0.70, type: 'Long' },
    { id: 3, symbol: 'NIFTY50 FUT', exchange: 'NFO', qty: 50, avgPrice: 22300.00, ltp: 22456.00, pnl: 7800.00, pnlPct: 0.70, type: 'Long' },
    { id: 4, symbol: 'BANKNIFTY CE', exchange: 'NFO', qty: 500, avgPrice: 220.00, ltp: 245.50, pnl: 12750.00, pnlPct: 11.59, type: 'Long' },
    { id: 5, symbol: 'INFY', exchange: 'NSE', qty: 100, avgPrice: 1690.00, ltp: 1678.25, pnl: -1175.00, pnlPct: -0.70, type: 'Long' },
  ],
  2: [
    { id: 1, symbol: 'BANKNIFTY FUT', exchange: 'NFO', qty: 25, avgPrice: 47500.00, ltp: 47892.65, pnl: 9816.25, pnlPct: 0.83, type: 'Long' },
    { id: 2, symbol: 'NIFTY PE', exchange: 'NFO', qty: 1500, avgPrice: 85.00, ltp: 62.50, pnl: -33750.00, pnlPct: -26.47, type: 'Long' },
    { id: 3, symbol: 'HDFC CE', exchange: 'NFO', qty: 200, avgPrice: 45.00, ltp: 58.75, pnl: 2750.00, pnlPct: 30.56, type: 'Long' },
  ],
  3: [
    { id: 1, symbol: 'CRUDEOIL FUT', exchange: 'MCX', qty: 100, avgPrice: 6400.00, ltp: 6543.00, pnl: 14300.00, pnlPct: 2.23, type: 'Long' },
    { id: 2, symbol: 'GOLD FUT', exchange: 'MCX', qty: 10, avgPrice: 62000.00, ltp: 61800.00, pnl: -2000.00, pnlPct: -0.32, type: 'Long' },
  ],
  4: [
    { id: 1, symbol: 'RELIANCE', exchange: 'NSE', qty: 75, avgPrice: 2410.00, ltp: 2456.75, pnl: 3506.25, pnlPct: 1.94, type: 'Long' },
    { id: 2, symbol: 'HDFCBANK', exchange: 'NSE', qty: 60, avgPrice: 1540.00, ltp: 1523.80, pnl: -972.00, pnlPct: -1.05, type: 'Long' },
    { id: 3, symbol: 'ICICIBANK', exchange: 'NSE', qty: 150, avgPrice: 975.00, ltp: 987.45, pnl: 1867.50, pnlPct: 1.28, type: 'Long' },
    { id: 4, symbol: 'TATAMOTORS', exchange: 'NSE', qty: 200, avgPrice: 920.00, ltp: 952.40, pnl: 6480.00, pnlPct: 3.52, type: 'Long' },
  ],
  5: [],
};

// Demat Orders
export const dematOrders = {
  1: [
    { id: 1, symbol: 'RELIANCE', exchange: 'NSE', qty: 50, price: 2420.50, type: 'BUY', orderType: 'LIMIT', status: 'Completed', time: '10:30 AM' },
    { id: 2, symbol: 'TCS', exchange: 'NSE', qty: 25, price: 3920.00, type: 'SELL', orderType: 'MARKET', status: 'Completed', time: '11:15 AM' },
    { id: 3, symbol: 'INFY', exchange: 'NSE', qty: 100, price: 1695.00, type: 'BUY', orderType: 'LIMIT', status: 'Pending', time: '01:30 PM' },
  ],
  2: [
    { id: 1, symbol: 'BANKNIFTY FUT', exchange: 'NFO', qty: 25, price: 47500.00, type: 'BUY', orderType: 'MARKET', status: 'Completed', time: '09:20 AM' },
    { id: 2, symbol: 'NIFTY PE', exchange: 'NFO', qty: 1500, price: 85.00, type: 'BUY', orderType: 'LIMIT', status: 'Completed', time: '09:45 AM' },
    { id: 3, symbol: 'HDFC CE', exchange: 'NFO', qty: 200, price: 45.00, type: 'BUY', orderType: 'LIMIT', status: 'Completed', time: '10:00 AM' },
    { id: 4, symbol: 'NIFTY CE', exchange: 'NFO', qty: 500, price: 120.00, type: 'BUY', orderType: 'LIMIT', status: 'Rejected', time: '11:30 AM' },
    { id: 5, symbol: 'BANKNIFTY PE', exchange: 'NFO', qty: 1000, price: 95.00, type: 'BUY', orderType: 'MARKET', status: 'Pending', time: '02:15 PM' },
  ],
  3: [
    { id: 1, symbol: 'CRUDEOIL FUT', exchange: 'MCX', qty: 100, price: 6400.00, type: 'BUY', orderType: 'LIMIT', status: 'Completed', time: '10:05 AM' },
    { id: 2, symbol: 'GOLD FUT', exchange: 'MCX', qty: 10, price: 62000.00, type: 'BUY', orderType: 'LIMIT', status: 'Completed', time: '10:20 AM' },
  ],
  4: [
    { id: 1, symbol: 'RELIANCE', exchange: 'NSE', qty: 75, price: 2410.00, type: 'BUY', orderType: 'LIMIT', status: 'Completed', time: '09:30 AM' },
    { id: 2, symbol: 'HDFCBANK', exchange: 'NSE', qty: 60, price: 1540.00, type: 'BUY', orderType: 'LIMIT', status: 'Completed', time: '10:45 AM' },
    { id: 3, symbol: 'ICICIBANK', exchange: 'NSE', qty: 150, price: 975.00, type: 'BUY', orderType: 'MARKET', status: 'Completed', time: '11:00 AM' },
    { id: 4, symbol: 'TATAMOTORS', exchange: 'NSE', qty: 200, price: 920.00, type: 'BUY', orderType: 'LIMIT', status: 'Completed', time: '12:30 PM' },
  ],
  5: [],
};

// Demat Trades
export const dematTrades = {
  1: [
    { id: 1, symbol: 'RELIANCE', exchange: 'NSE', qty: 50, price: 2456.75, action: 'BUY', time: '10:30 AM', value: 122837.50 },
    { id: 2, symbol: 'TCS', exchange: 'NSE', qty: 25, price: 3892.50, action: 'SELL', time: '11:15 AM', value: 97312.50 },
    { id: 3, symbol: 'NIFTY50 FUT', exchange: 'NFO', qty: 50, price: 22456.00, action: 'BUY', time: '12:00 PM', value: 1122800.00 },
    { id: 4, symbol: 'BANKNIFTY CE', exchange: 'NFO', qty: 500, price: 245.50, action: 'BUY', time: '01:30 PM', value: 122750.00 },
    { id: 5, symbol: 'INFY', exchange: 'NSE', qty: 100, price: 1678.25, action: 'BUY', time: '02:10 PM', value: 167825.00 },
  ],
  2: [
    { id: 1, symbol: 'BANKNIFTY FUT', exchange: 'NFO', qty: 25, price: 47892.65, action: 'BUY', time: '09:20 AM', value: 1197316.25 },
    { id: 2, symbol: 'NIFTY PE', exchange: 'NFO', qty: 1500, price: 62.50, action: 'BUY', time: '09:45 AM', value: 93750.00 },
    { id: 3, symbol: 'HDFC CE', exchange: 'NFO', qty: 200, price: 58.75, action: 'BUY', time: '10:00 AM', value: 11750.00 },
  ],
  3: [
    { id: 1, symbol: 'CRUDEOIL FUT', exchange: 'MCX', qty: 100, price: 6543.00, action: 'BUY', time: '10:05 AM', value: 654300.00 },
    { id: 2, symbol: 'GOLD FUT', exchange: 'MCX', qty: 10, price: 61800.00, action: 'BUY', time: '10:20 AM', value: 618000.00 },
  ],
  4: [
    { id: 1, symbol: 'RELIANCE', exchange: 'NSE', qty: 75, price: 2456.75, action: 'BUY', time: '09:30 AM', value: 184256.25 },
    { id: 2, symbol: 'HDFCBANK', exchange: 'NSE', qty: 60, price: 1523.80, action: 'BUY', time: '10:45 AM', value: 91428.00 },
    { id: 3, symbol: 'ICICIBANK', exchange: 'NSE', qty: 150, price: 987.45, action: 'BUY', time: '11:00 AM', value: 148117.50 },
    { id: 4, symbol: 'TATAMOTORS', exchange: 'NSE', qty: 200, price: 952.40, action: 'BUY', time: '12:30 PM', value: 190480.00 },
  ],
  5: [],
};

// Copy Trading Config
export const copyTradingConfig = {
  masterAccount: { id: 1, label: 'ZR1234 — Main Account (Zerodha)' },
  children: [
    { id: 1, userId: 'AN5678', nickname: 'F&O Account', broker: 'Angel One', multiplier: 1.0, tradingEnabled: true, placeRejected: false, pnlToday: 8450, tradesCopied: 12 },
    { id: 2, userId: 'AB9012', nickname: 'Commodity Acc', broker: 'Alice Blue', multiplier: 0.5, tradingEnabled: false, placeRejected: false, pnlToday: -1200, tradesCopied: 4 },
    { id: 3, userId: 'FY3456', nickname: 'Swing Trading', broker: 'Fyers', multiplier: 2.0, tradingEnabled: true, placeRejected: true, pnlToday: 15600, tradesCopied: 8 },
    { id: 4, userId: 'SH7890', nickname: 'Scalping', broker: 'Shoonya', multiplier: 1.5, tradingEnabled: true, placeRejected: false, pnlToday: 0, tradesCopied: 0 },
  ],
};

// Trade Logs
export const tradeLogs = [
  {
    date: '2024-03-16',
    count: 12,
    trades: [
      { id: 1, symbol: 'RELIANCE', exchange: 'NSE', qty: 50, action: 'BUY', price: 2420.50, time: '10:30:12 AM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 50, price: 2420.65 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Success', qty: 100, price: 2420.80 },
        { child: 'Commodity Acc', userId: 'AB9012', status: 'Skipped', qty: 0, price: 0 },
      ]},
      { id: 2, symbol: 'TCS', exchange: 'NSE', qty: 25, action: 'SELL', price: 3892.50, time: '11:15:30 AM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 25, price: 3892.40 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Success', qty: 50, price: 3892.55 },
        { child: 'Commodity Acc', userId: 'AB9012', status: 'Skipped', qty: 0, price: 0 },
      ]},
      { id: 3, symbol: 'NIFTY50 FUT', exchange: 'NFO', qty: 50, action: 'BUY', price: 22300.00, time: '12:00:05 PM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 50, price: 22302.00 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Rejected', qty: 0, price: 0 },
        { child: 'Commodity Acc', userId: 'AB9012', status: 'Skipped', qty: 0, price: 0 },
      ]},
      { id: 4, symbol: 'BANKNIFTY CE', exchange: 'NFO', qty: 500, action: 'BUY', price: 220.00, time: '01:30:45 PM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 500, price: 220.50 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Success', qty: 1000, price: 220.60 },
        { child: 'Commodity Acc', userId: 'AB9012', status: 'Skipped', qty: 0, price: 0 },
      ]},
      { id: 5, symbol: 'INFY', exchange: 'NSE', qty: 100, action: 'BUY', price: 1690.00, time: '02:10:22 PM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 100, price: 1690.20 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Success', qty: 200, price: 1690.30 },
        { child: 'Commodity Acc', userId: 'AB9012', status: 'Skipped', qty: 0, price: 0 },
      ]},
    ],
  },
  {
    date: '2024-03-15',
    count: 8,
    trades: [
      { id: 1, symbol: 'HDFCBANK', exchange: 'NSE', qty: 60, action: 'BUY', price: 1540.00, time: '09:45:10 AM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 60, price: 1540.15 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Success', qty: 120, price: 1540.20 },
      ]},
      { id: 2, symbol: 'ICICIBANK', exchange: 'NSE', qty: 150, action: 'BUY', price: 975.00, time: '10:20:33 AM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 150, price: 975.10 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Rejected', qty: 0, price: 0 },
      ]},
      { id: 3, symbol: 'TATAMOTORS', exchange: 'NSE', qty: 200, action: 'SELL', price: 952.40, time: '01:05:18 PM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 200, price: 952.35 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Success', qty: 400, price: 952.30 },
      ]},
    ],
  },
  {
    date: '2024-03-14',
    count: 15,
    trades: [
      { id: 1, symbol: 'ADANIENT', exchange: 'NSE', qty: 30, action: 'BUY', price: 3100.00, time: '09:30:00 AM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 30, price: 3100.20 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Success', qty: 60, price: 3100.40 },
      ]},
      { id: 2, symbol: 'WIPRO', exchange: 'NSE', qty: 200, action: 'BUY', price: 512.50, time: '11:00:00 AM', childOrders: [
        { child: 'F&O Account', userId: 'AN5678', status: 'Success', qty: 200, price: 512.60 },
        { child: 'Swing Trading', userId: 'FY3456', status: 'Success', qty: 400, price: 512.70 },
      ]},
    ],
  },
  { date: '2024-03-13', count: 5, trades: [] },
  { date: '2024-03-12', count: 9, trades: [] },
  { date: '2024-03-11', count: 11, trades: [] },
  { date: '2024-03-10', count: 3, trades: [] },
  { date: '2024-03-09', count: 7, trades: [] },
  { date: '2024-03-08', count: 14, trades: [] },
];
