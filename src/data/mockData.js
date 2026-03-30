// TradePilot Mock Data
// Indian Stock Market Copy Trading Platform

// Format currency in Indian numbering system
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-IN').format(num);
};

export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Mock Instruments
export const instruments = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', market: 'Equity', price: 2456.75, change: 1.25 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', market: 'Equity', price: 3892.50, change: -0.45 },
  { symbol: 'INFY', name: 'Infosys Ltd', market: 'Equity', price: 1678.25, change: 0.85 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', market: 'Equity', price: 1523.80, change: 0.65 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', market: 'Equity', price: 987.45, change: -0.30 },
  { symbol: 'NIFTY50 FUT', name: 'NIFTY 50 Futures', market: 'F&O', price: 22456.00, change: 0.55 },
  { symbol: 'BANKNIFTY CE', name: 'BANK NIFTY Call', market: 'F&O', price: 245.50, change: 12.5 },
  { symbol: 'CRUDEOIL FUT', name: 'Crude Oil Futures', market: 'Commodity', price: 6543.00, change: -1.20 },
  { symbol: 'USDINR FUT', name: 'USD/INR Futures', market: 'Currency', price: 83.25, change: 0.15 },
];

// Mock Masters
export const masters = [
  {
    id: 1,
    name: 'Rahul Mehta',
    initials: 'RM',
    avatar: null,
    verified: true,
    winRate: 73.4,
    return30d: 18.5,
    returnYTD: 64.2,
    followers: 248,
    riskLevel: 'Medium',
    markets: ['Equity', 'F&O'],
    description: 'Technical analyst with 10+ years experience in Indian equity markets.',
    totalTrades: 1247,
    avgHoldingTime: '3.2 days',
    bestTrade: '+?45,230',
    worstTrade: '-?12,450',
    equityCurve: [100000, 105000, 108500, 106200, 112400, 118600, 115800, 122000, 128400, 135200, 142000, 148500],
  },
  {
    id: 2,
    name: 'Priya Sharma',
    initials: 'PS',
    avatar: null,
    verified: true,
    winRate: 68.2,
    return30d: 12.8,
    returnYTD: 48.6,
    followers: 186,
    riskLevel: 'Low',
    markets: ['Equity', 'Commodity'],
    description: 'Fundamental investor focusing on long-term wealth creation.',
    totalTrades: 892,
    avgHoldingTime: '12.5 days',
    bestTrade: '+?32,100',
    worstTrade: '-?8,200',
    equityCurve: [100000, 102500, 104800, 106200, 108500, 110200, 112800, 115400, 118200, 121000, 124500, 128600],
  },
  {
    id: 3,
    name: 'Arjun Patel',
    initials: 'AP',
    avatar: null,
    verified: true,
    winRate: 81.2,
    return30d: 24.5,
    returnYTD: 92.4,
    followers: 324,
    riskLevel: 'High',
    markets: ['F&O', 'Currency'],
    description: 'Options specialist with expertise in volatility trading.',
    totalTrades: 2156,
    avgHoldingTime: '0.8 days',
    bestTrade: '+?78,500',
    worstTrade: '-?25,300',
    equityCurve: [100000, 108000, 115500, 112000, 125000, 138000, 132000, 148000, 162000, 155000, 172000, 185400],
  },
  {
    id: 4,
    name: 'Sneha Gupta',
    initials: 'SG',
    avatar: null,
    verified: false,
    winRate: 62.5,
    return30d: 8.4,
    returnYTD: 32.8,
    followers: 94,
    riskLevel: 'Medium',
    markets: ['Equity'],
    description: 'Swing trader focusing on mid-cap stocks.',
    totalTrades: 567,
    avgHoldingTime: '5.6 days',
    bestTrade: '+?28,400',
    worstTrade: '-?15,600',
    equityCurve: [100000, 102000, 104500, 103200, 106800, 109500, 108200, 112000, 115400, 118200, 121500, 124800],
  },
  {
    id: 5,
    name: 'Vikram Das',
    initials: 'VD',
    avatar: null,
    verified: true,
    winRate: 77.0,
    return30d: 15.2,
    returnYTD: 58.4,
    followers: 276,
    riskLevel: 'Medium',
    markets: ['Equity', 'F&O', 'Commodity'],
    description: 'Multi-asset trader with systematic approach.',
    totalTrades: 1567,
    avgHoldingTime: '2.8 days',
    bestTrade: '+?52,800',
    worstTrade: '-?18,400',
    equityCurve: [100000, 104500, 108200, 112000, 116500, 121000, 118500, 125000, 131000, 138500, 145000, 151200],
  },
  {
    id: 6,
    name: 'Ananya Reddy',
    initials: 'AR',
    avatar: null,
    verified: false,
    winRate: 70.5,
    return30d: 14.8,
    returnYTD: 42.6,
    followers: 142,
    riskLevel: 'Low',
    markets: ['Equity', 'Currency'],
    description: 'Conservative trader focusing on blue-chip stocks.',
    totalTrades: 723,
    avgHoldingTime: '8.4 days',
    bestTrade: '+?35,200',
    worstTrade: '-?9,800',
    equityCurve: [100000, 102800, 105200, 107500, 110200, 113000, 115800, 118500, 121200, 124000, 127500, 131200],
  },
];

// Mock Children
export const children = [
  { id: 1, name: 'Amit Kumar', email: 'amit.kumar@email.com', portfolioValue: 245000, mastersCopying: 3, joinedDate: '15/01/2024', status: 'Active' },
  { id: 2, name: 'Deepika Singh', email: 'deepika.s@email.com', portfolioValue: 189500, mastersCopying: 2, joinedDate: '22/02/2024', status: 'Active' },
  { id: 3, name: 'Rajesh Verma', email: 'rajesh.v@email.com', portfolioValue: 456000, mastersCopying: 4, joinedDate: '05/12/2023', status: 'Active' },
  { id: 4, name: 'Neha Sharma', email: 'neha.sharma@email.com', portfolioValue: 125000, mastersCopying: 1, joinedDate: '18/03/2024', status: 'Active' },
  { id: 5, name: 'Sanjay Gupta', email: 'sanjay.g@email.com', portfolioValue: 678000, mastersCopying: 5, joinedDate: '10/11/2023', status: 'Suspended' },
  { id: 6, name: 'Pooja Patel', email: 'pooja.p@email.com', portfolioValue: 312000, mastersCopying: 2, joinedDate: '28/01/2024', status: 'Active' },
  { id: 7, name: 'Karan Malhotra', email: 'karan.m@email.com', portfolioValue: 198000, mastersCopying: 2, joinedDate: '14/02/2024', status: 'Active' },
  { id: 8, name: 'Ritu Desai', email: 'ritu.d@email.com', portfolioValue: 425000, mastersCopying: 3, joinedDate: '03/01/2024', status: 'Active' },
];

// Mock Trades
export const trades = [
  { id: 1, instrument: 'RELIANCE', market: 'Equity', type: 'BUY', qty: 50, entryPrice: 2420.50, exitPrice: 2456.75, pnl: 1812.50, date: '16/03/2024', status: 'Closed' },
  { id: 2, instrument: 'TCS', market: 'Equity', type: 'SELL', qty: 25, entryPrice: 3920.00, exitPrice: 3892.50, pnl: 687.50, date: '15/03/2024', status: 'Closed' },
  { id: 3, instrument: 'NIFTY50 FUT', market: 'F&O', type: 'BUY', qty: 100, entryPrice: 22300.00, exitPrice: 22456.00, pnl: 15600.00, date: '15/03/2024', status: 'Closed' },
  { id: 4, instrument: 'BANKNIFTY CE', market: 'F&O', type: 'BUY', qty: 500, entryPrice: 220.00, exitPrice: 245.50, pnl: 12750.00, date: '14/03/2024', status: 'Closed' },
  { id: 5, instrument: 'INFY', market: 'Equity', type: 'BUY', qty: 100, entryPrice: 1650.00, exitPrice: 1678.25, pnl: 2825.00, date: '14/03/2024', status: 'Closed' },
  { id: 6, instrument: 'HDFCBANK', market: 'Equity', type: 'SELL', qty: 75, entryPrice: 1540.00, exitPrice: 1523.80, pnl: 1215.00, date: '13/03/2024', status: 'Closed' },
  { id: 7, instrument: 'CRUDEOIL FUT', market: 'Commodity', type: 'SELL', qty: 10, entryPrice: 6620.00, exitPrice: 6543.00, pnl: 7700.00, date: '13/03/2024', status: 'Closed' },
  { id: 8, instrument: 'ICICIBANK', market: 'Equity', type: 'BUY', qty: 200, entryPrice: 980.00, exitPrice: 987.45, pnl: 1490.00, date: '12/03/2024', status: 'Closed' },
  { id: 9, instrument: 'USDINR FUT', market: 'Currency', type: 'BUY', qty: 1000, entryPrice: 83.10, exitPrice: 83.25, pnl: 1500.00, date: '12/03/2024', status: 'Closed' },
  { id: 10, instrument: 'RELIANCE', market: 'Equity', type: 'SELL', qty: 30, entryPrice: 2480.00, exitPrice: 2456.75, pnl: -697.50, date: '11/03/2024', status: 'Closed' },
];

// Open Positions
export const openPositions = [
  { id: 1, instrument: 'RELIANCE', type: 'BUY', qty: 100, avgPrice: 2435.50, ltp: 2456.75, unrealizedPnl: 2125.00, change: 0.87 },
  { id: 2, instrument: 'TCS', type: 'BUY', qty: 50, avgPrice: 3910.25, ltp: 3892.50, unrealizedPnl: -887.50, change: -0.45 },
  { id: 3, instrument: 'NIFTY50 FUT', type: 'BUY', qty: 200, avgPrice: 22380.00, ltp: 22456.00, unrealizedPnl: 15200.00, change: 0.34 },
  { id: 4, instrument: 'BANKNIFTY CE', type: 'BUY', qty: 300, avgPrice: 235.00, ltp: 245.50, unrealizedPnl: 3150.00, change: 4.47 },
  { id: 5, instrument: 'INFY', type: 'SELL', qty: 150, avgPrice: 1690.00, ltp: 1678.25, unrealizedPnl: 1762.50, change: -0.70 },
];

// Pending Orders
export const pendingOrders = [
  { id: 1, instrument: 'HDFCBANK', orderType: 'LIMIT', type: 'BUY', qty: 100, price: 1510.00, status: 'Pending' },
  { id: 2, instrument: 'ICICIBANK', orderType: 'STOPLOSS', type: 'SELL', qty: 200, price: 975.00, status: 'Pending' },
  { id: 3, instrument: 'CRUDEOIL FUT', orderType: 'LIMIT', type: 'BUY', qty: 5, price: 6500.00, status: 'Pending' },
  { id: 4, instrument: 'RELIANCE', orderType: 'MARKET', type: 'BUY', qty: 50, price: null, status: 'Executed' },
  { id: 5, instrument: 'TCS', orderType: 'LIMIT', type: 'SELL', qty: 25, price: 3950.00, status: 'Cancelled' },
];

// Holdings
export const holdings = [
  { id: 1, symbol: 'RELIANCE', name: 'Reliance Industries', qty: 150, avgBuyPrice: 2418.50, currentPrice: 2456.75, currentValue: 368512.50, dayChange: 1.25, totalReturn: 5737.50 },
  { id: 2, symbol: 'TCS', name: 'Tata Consultancy Services', qty: 75, avgBuyPrice: 3905.00, currentPrice: 3892.50, currentValue: 291937.50, dayChange: -0.45, totalReturn: -937.50 },
  { id: 3, symbol: 'INFY', name: 'Infosys Ltd', qty: 200, avgBuyPrice: 1665.00, currentPrice: 1678.25, currentValue: 335650.00, dayChange: 0.85, totalReturn: 2650.00 },
  { id: 4, symbol: 'HDFCBANK', name: 'HDFC Bank', qty: 120, avgBuyPrice: 1535.20, currentPrice: 1523.80, currentValue: 182856.00, dayChange: 0.65, totalReturn: -1368.00 },
  { id: 5, symbol: 'ICICIBANK', name: 'ICICI Bank', qty: 300, avgBuyPrice: 982.50, currentPrice: 987.45, currentValue: 296235.00, dayChange: -0.30, totalReturn: 1485.00 },
];

// Monthly P&L Data
export const monthlyPnL = [
  { month: 'Apr 2023', trades: 45, win: 32, loss: 13, netPnL: 48500, winRate: 71.1 },
  { month: 'May 2023', trades: 52, win: 38, loss: 14, netPnL: 67200, winRate: 73.1 },
  { month: 'Jun 2023', trades: 48, win: 34, loss: 14, netPnL: 52300, winRate: 70.8 },
  { month: 'Jul 2023', trades: 55, win: 41, loss: 14, netPnL: 78900, winRate: 74.5 },
  { month: 'Aug 2023', trades: 50, win: 36, loss: 14, netPnL: 61200, winRate: 72.0 },
  { month: 'Sep 2023', trades: 58, win: 43, loss: 15, netPnL: 84500, winRate: 74.1 },
  { month: 'Oct 2023', trades: 62, win: 46, loss: 16, netPnL: 92300, winRate: 74.2 },
  { month: 'Nov 2023', trades: 54, win: 39, loss: 15, netPnL: 68700, winRate: 72.2 },
  { month: 'Dec 2023', trades: 49, win: 35, loss: 14, netPnL: 56400, winRate: 71.4 },
  { month: 'Jan 2024', trades: 56, win: 42, loss: 14, netPnL: 79800, winRate: 75.0 },
  { month: 'Feb 2024', trades: 51, win: 37, loss: 14, netPnL: 71200, winRate: 72.5 },
  { month: 'Mar 2024', trades: 38, win: 28, loss: 10, netPnL: 56520, winRate: 73.7 },
];

// Followers Data
export const followers = [
  { id: 1, name: 'Amit Kumar', initials: 'AK', joinedDate: '15/01/2024', allocation: 150000, tradesCopied: 47, totalPnL: 28450, status: 'Active' },
  { id: 2, name: 'Deepika Singh', initials: 'DS', joinedDate: '22/02/2024', allocation: 100000, tradesCopied: 28, totalPnL: 15200, status: 'Active' },
  { id: 3, name: 'Rajesh Verma', initials: 'RV', joinedDate: '05/12/2023', allocation: 300000, tradesCopied: 89, totalPnL: 67800, status: 'Active' },
  { id: 4, name: 'Neha Sharma', initials: 'NS', joinedDate: '18/03/2024', allocation: 75000, tradesCopied: 12, totalPnL: 4200, status: 'Paused' },
  { id: 5, name: 'Sanjay Gupta', initials: 'SG', joinedDate: '10/11/2023', allocation: 250000, tradesCopied: 112, totalPnL: 89200, status: 'Active' },
];

// Follow Requests
export const followRequests = [
  { id: 1, name: 'Manish Joshi', email: 'manish.j@email.com', requestedDate: '15/03/2024', proposedAllocation: 200000 },
  { id: 2, name: 'Sunita Patel', email: 'sunita.p@email.com', requestedDate: '14/03/2024', proposedAllocation: 125000 },
  { id: 3, name: 'Rohit Khanna', email: 'rohit.k@email.com', requestedDate: '13/03/2024', proposedAllocation: 350000 },
];

// Earnings Data
export const earningsData = [
  { month: 'Apr 2023', subscribers: 32, subscriptionFee: 32000, performanceBonus: 8500, total: 40500 },
  { month: 'May 2023', subscribers: 38, subscriptionFee: 38000, performanceBonus: 12400, total: 50400 },
  { month: 'Jun 2023', subscribers: 42, subscriptionFee: 42000, performanceBonus: 9800, total: 51800 },
  { month: 'Jul 2023', subscribers: 48, subscriptionFee: 48000, performanceBonus: 15600, total: 63600 },
  { month: 'Aug 2023', subscribers: 52, subscriptionFee: 52000, performanceBonus: 13200, total: 65200 },
  { month: 'Sep 2023', subscribers: 58, subscriptionFee: 58000, performanceBonus: 18900, total: 76900 },
  { month: 'Oct 2023', subscribers: 64, subscriptionFee: 64000, performanceBonus: 21500, total: 85500 },
  { month: 'Nov 2023', subscribers: 72, subscriptionFee: 72000, performanceBonus: 19800, total: 91800 },
  { month: 'Dec 2023', subscribers: 78, subscriptionFee: 78000, performanceBonus: 16500, total: 94500 },
  { month: 'Jan 2024', subscribers: 86, subscriptionFee: 86000, performanceBonus: 23400, total: 109400 },
  { month: 'Feb 2024', subscribers: 92, subscriptionFee: 92000, performanceBonus: 25600, total: 117600 },
  { month: 'Mar 2024', subscribers: 98, subscriptionFee: 98000, performanceBonus: 28900, total: 126900 },
];

// Payout History
export const payoutHistory = [
  { id: 1, date: '01/03/2024', amount: 117600, status: 'Completed', method: 'Bank Transfer' },
  { id: 2, date: '01/02/2024', amount: 109400, status: 'Completed', method: 'Bank Transfer' },
  { id: 3, date: '01/01/2024', amount: 94500, status: 'Completed', method: 'Bank Transfer' },
  { id: 4, date: '01/12/2023', amount: 91800, status: 'Completed', method: 'Bank Transfer' },
  { id: 5, date: '01/11/2023', amount: 85500, status: 'Completed', method: 'Bank Transfer' },
];

// Price Alerts
export const priceAlerts = [
  { id: 1, instrument: 'RELIANCE', alertType: 'Above', targetPrice: 2500, currentPrice: 2456.75, status: 'Active' },
  { id: 2, instrument: 'TCS', alertType: 'Below', targetPrice: 3800, currentPrice: 3892.50, status: 'Active' },
  { id: 3, instrument: 'NIFTY50 FUT', alertType: 'Above', targetPrice: 22500, currentPrice: 22456.00, status: 'Triggered' },
  { id: 4, instrument: 'HDFCBANK', alertType: 'Below', targetPrice: 1500, currentPrice: 1523.80, status: 'Active' },
];

// Watchlist Instruments
export const watchlistInstruments = [
  { id: 1, symbol: 'RELIANCE', price: 2456.75, change: 1.25, sparkline: [2400, 2420, 2410, 2435, 2445, 2456.75] },
  { id: 2, symbol: 'TCS', price: 3892.50, change: -0.45, sparkline: [3920, 3910, 3905, 3895, 3890, 3892.50] },
  { id: 3, symbol: 'NIFTY50 FUT', price: 22456.00, change: 0.55, sparkline: [22300, 22350, 22380, 22400, 22430, 22456] },
  { id: 4, symbol: 'BANKNIFTY CE', price: 245.50, change: 12.5, sparkline: [220, 225, 230, 235, 240, 245.50] },
];

// Performance Analytics
export const performanceMetrics = {
  sharpeRatio: 2.34,
  maxDrawdown: -12.5,
  avgWin: 4850,
  avgLoss: -2150,
  profitFactor: 2.18,
  winLossRatio: 2.85,
};

// Strategy Stats
export const strategyStats = [
  { market: 'Equity', totalTrades: 567, winRate: 74.2, avgHoldingTime: '4.2 days', bestTrade: '+?45,230', worstTrade: '-?12,450' },
  { market: 'F&O', totalTrades: 423, winRate: 71.8, avgHoldingTime: '1.5 days', bestTrade: '+?78,500', worstTrade: '-?25,300' },
  { market: 'Commodity', totalTrades: 156, winRate: 68.5, avgHoldingTime: '3.8 days', bestTrade: '+?32,400', worstTrade: '-?15,600' },
  { market: 'Currency', totalTrades: 89, winRate: 72.3, avgHoldingTime: '2.1 days', bestTrade: '+?18,500', worstTrade: '-?8,200' },
];

// Market Indices
export const marketIndices = [
  { name: 'NIFTY 50', value: 22456.35, change: 123.45, changePercent: 0.55 },
  { name: 'SENSEX', value: 73892.18, change: 456.78, changePercent: 0.62 },
  { name: 'BANK NIFTY', value: 47892.65, change: -234.50, changePercent: -0.49 },
  { name: 'MIDCAP', value: 42567.80, change: 89.30, changePercent: 0.21 },
];

// Top Gainers/Losers
export const topGainers = [
  { symbol: 'BANKNIFTY CE', price: 245.50, change: 12.5 },
  { symbol: 'ADANIENT', price: 3124.80, change: 8.45 },
  { symbol: 'TATAMOTORS', price: 952.40, change: 5.82 },
  { symbol: 'SBIN', price: 745.60, change: 4.65 },
  { symbol: 'AXISBANK', price: 1124.30, change: 3.92 },
];

export const topLosers = [
  { symbol: 'HINDUNILVR', price: 2345.60, change: -3.45 },
  { symbol: 'NESTLEIND', price: 2456.80, change: -2.89 },
  { symbol: 'ASIANPAINT', price: 3124.50, change: -2.34 },
  { symbol: 'MARUTI', price: 10234.50, change: -1.87 },
  { symbol: 'ULTRACEMCO', price: 9876.40, change: -1.56 },
];

// Broker Status
export const brokerStatus = [
  { name: 'Zerodha', status: 'Online', latency: '45ms', activeTokens: 1245, lastChecked: '2 min ago' },
  { name: 'Upstox', status: 'Online', latency: '62ms', activeTokens: 892, lastChecked: '1 min ago' },
  { name: 'Angel One', status: 'Degraded', latency: '245ms', activeTokens: 678, lastChecked: '3 min ago' },
  { name: 'Fyers', status: 'Online', latency: '38ms', activeTokens: 456, lastChecked: '2 min ago' },
];

// API Tokens
export const apiTokens = [
  { broker: 'Zerodha', status: 'Active', expiryDate: '31/12/2024', createdDate: '01/01/2024' },
  { broker: 'Upstox', status: 'Active', expiryDate: '30/06/2024', createdDate: '01/07/2023' },
  { broker: 'Angel One', status: 'Expired', expiryDate: '15/02/2024', createdDate: '15/08/2023' },
];

// Notifications
export const notifications = [
  { id: 1, type: 'trade', title: 'Trade Executed', message: 'BUY 50 RELIANCE @ ?2456.75', time: '2 min ago', read: false },
  { id: 2, type: 'alert', title: 'Price Alert Triggered', message: 'NIFTY 50 crossed 22500', time: '15 min ago', read: false },
  { id: 3, type: 'follower', title: 'New Follower', message: 'Rohit Khanna started copying your trades', time: '1 hour ago', read: false },
  { id: 4, type: 'system', title: 'System Maintenance', message: 'Scheduled maintenance tonight at 2 AM', time: '3 hours ago', read: true },
  { id: 5, type: 'earning', title: 'Earnings Credited', message: '?12,500 performance bonus credited', time: '1 day ago', read: true },
];

// Platform Stats (Admin)
export const platformStats = {
  totalUsers: 284,
  activeMasters: 42,
  volumeToday: 4820000,
  revenueMTD: 125000,
};

// User Growth Data
export const userGrowthData = [
  { date: '01/03', newUsers: 12, totalUsers: 250 },
  { date: '02/03', newUsers: 8, totalUsers: 258 },
  { date: '03/03', newUsers: 15, totalUsers: 273 },
  { date: '04/03', newUsers: 6, totalUsers: 279 },
  { date: '05/03', newUsers: 11, totalUsers: 290 },
  { date: '06/03', newUsers: 9, totalUsers: 299 },
  { date: '07/03', newUsers: 14, totalUsers: 313 },
];

// Volume Analytics
export const volumeAnalytics = [
  { date: '01/03', equity: 1200000, fno: 2100000, commodity: 450000, currency: 280000 },
  { date: '02/03', equity: 1350000, fno: 2300000, commodity: 520000, currency: 310000 },
  { date: '03/03', equity: 1180000, fno: 1950000, commodity: 380000, currency: 250000 },
  { date: '04/03', equity: 1420000, fno: 2450000, commodity: 580000, currency: 340000 },
  { date: '05/03', equity: 1560000, fno: 2680000, commodity: 620000, currency: 380000 },
];

// Risk Alerts
export const riskAlerts = [
  { id: 1, type: 'Concentration Risk', severity: 'High', user: 'Rajesh Verma', description: '80% allocation to single master', raisedAt: '16/03/2024 10:30', status: 'Active' },
  { id: 2, type: 'Drawdown Alert', severity: 'Medium', user: 'Neha Sharma', description: 'Portfolio down 15% from peak', raisedAt: '16/03/2024 09:15', status: 'Active' },
  { id: 3, type: 'Unusual Activity', severity: 'Low', user: 'Sanjay Gupta', description: '5x increase in trade frequency', raisedAt: '15/03/2024 16:45', status: 'Resolved' },
];

// Audit Log
export const auditLog = [
  { id: 1, user: 'Admin', action: 'User Suspended', entity: 'Sanjay Gupta', timestamp: '16/03/2024 11:30' },
  { id: 2, user: 'Admin', action: 'Verification Approved', entity: 'Vikram Das', timestamp: '16/03/2024 10:45' },
  { id: 3, user: 'Admin', action: 'Fee Config Updated', entity: 'Platform Settings', timestamp: '16/03/2024 09:20' },
  { id: 4, user: 'Admin', action: 'Payout Approved', entity: 'Rahul Mehta - ?117,600', timestamp: '15/03/2024 18:00' },
];

// Child's Copied Masters
export const myMasters = [
  { id: 1, masterId: 1, name: 'Rahul Mehta', allocation: 80000, multiplier: 1.0, tradesCopiedToday: 3, totalPnL: 15200, status: 'Active' },
  { id: 2, masterId: 3, name: 'Arjun Patel', allocation: 120000, multiplier: 0.5, tradesCopiedToday: 5, totalPnL: 28400, status: 'Active' },
  { id: 3, masterId: 5, name: 'Vikram Das', allocation: 60000, multiplier: 1.5, tradesCopiedToday: 2, totalPnL: 8900, status: 'Paused' },
];

// Copied Trades
export const copiedTrades = [
  { id: 1, master: 'Rahul Mehta', instrument: 'RELIANCE', type: 'BUY', masterQty: 50, myQty: 50, entry: 2420.50, current: 2456.75, pnl: 1812.50, time: '10:30 AM' },
  { id: 2, master: 'Arjun Patel', instrument: 'NIFTY50 FUT', type: 'BUY', masterQty: 100, myQty: 50, entry: 22300.00, current: 22456.00, pnl: 7800.00, time: '11:15 AM' },
  { id: 3, master: 'Rahul Mehta', instrument: 'TCS', type: 'SELL', masterQty: 25, myQty: 25, entry: 3920.00, current: 3892.50, pnl: 687.50, time: '12:00 PM' },
  { id: 4, master: 'Arjun Patel', instrument: 'BANKNIFTY CE', type: 'BUY', masterQty: 500, myQty: 250, entry: 220.00, current: 245.50, pnl: 6375.00, time: '01:30 PM' },
];

// Wallet Transactions
export const walletTransactions = [
  { id: 1, type: 'Credit', amount: 100000, description: 'Initial Deposit', date: '01/01/2024', status: 'Completed' },
  { id: 2, type: 'Credit', amount: 50000, description: 'Add Funds', date: '15/02/2024', status: 'Completed' },
  { id: 3, type: 'Debit', amount: 25000, description: 'Withdrawal', date: '01/03/2024', status: 'Completed' },
  { id: 4, type: 'Credit', amount: 15200, description: 'Trading Profit', date: '10/03/2024', status: 'Completed' },
  { id: 5, type: 'Debit', amount: 5000, description: 'Subscription Fee', date: '15/03/2024', status: 'Completed' },
];

// Ticker Data
export const tickerData = [
  { symbol: 'NIFTY 50', price: 22456.35, change: 0.55 },
  { symbol: 'SENSEX', price: 73892.18, change: 0.62 },
  { symbol: 'BANK NIFTY', price: 47892.65, change: -0.49 },
  { symbol: 'RELIANCE', price: 2456.75, change: 1.25 },
  { symbol: 'TCS', price: 3892.50, change: -0.45 },
  { symbol: 'INFY', price: 1678.25, change: 0.85 },
  { symbol: 'HDFCBANK', price: 1523.80, change: 0.65 },
  { symbol: 'ICICIBANK', price: 987.45, change: -0.30 },
  { symbol: 'ADANIENT', price: 3124.80, change: 8.45 },
  { symbol: 'TATAMOTORS', price: 952.40, change: 5.82 },
];

// Chart Data
export const portfolioPerformanceData = {
  '1D': [
    { time: '09:15', value: 284320 },
    { time: '10:00', value: 285100 },
    { time: '11:00', value: 284800 },
    { time: '12:00', value: 286200 },
    { time: '13:00', value: 285500 },
    { time: '14:00', value: 287100 },
    { time: '15:00', value: 287500 },
    { time: '15:30', value: 287800 },
  ],
  '1W': [
    { time: 'Mon', value: 275000 },
    { time: 'Tue', value: 278500 },
    { time: 'Wed', value: 282000 },
    { time: 'Thu', value: 280500 },
    { time: 'Fri', value: 284320 },
  ],
  '1M': [
    { time: 'Week 1', value: 245000 },
    { time: 'Week 2', value: 258000 },
    { time: 'Week 3', value: 268500 },
    { time: 'Week 4', value: 284320 },
  ],
  '3M': [
    { time: 'Jan', value: 210000 },
    { time: 'Feb', value: 245000 },
    { time: 'Mar', value: 284320 },
  ],
};

// Child Portfolio Data
export const childPortfolioData = {
  '1D': [
    { time: '09:15', value: 124500 },
    { time: '10:00', value: 124800 },
    { time: '11:00', value: 125200 },
    { time: '12:00', value: 124900 },
    { time: '13:00', value: 125400 },
    { time: '14:00', value: 125600 },
    { time: '15:00', value: 125800 },
    { time: '15:30', value: 126000 },
  ],
  '1W': [
    { time: 'Mon', value: 120000 },
    { time: 'Tue', value: 121500 },
    { time: 'Wed', value: 123000 },
    { time: 'Thu', value: 122500 },
    { time: 'Fri', value: 124500 },
  ],
  '1M': [
    { time: 'Week 1', value: 110000 },
    { time: 'Week 2', value: 115000 },
    { time: 'Week 3', value: 120000 },
    { time: 'Week 4', value: 124500 },
  ],
  '3M': [
    { time: 'Jan', value: 100000 },
    { time: 'Feb', value: 110000 },
    { time: 'Mar', value: 124500 },
  ],
};

// Verification Requests
export const verificationRequests = [
  { id: 1, name: 'Karan Malhotra', email: 'karan.m@email.com', submittedDate: '14/03/2024', documents: ['PAN Card', 'Aadhaar', 'Bank Statement'] },
  { id: 2, name: 'Ritu Desai', email: 'ritu.d@email.com', submittedDate: '13/03/2024', documents: ['PAN Card', 'Aadhaar', 'Broker Statement'] },
];

// Pending Payouts
export const pendingPayouts = [
  { id: 1, master: 'Rahul Mehta', amount: 126900, period: 'Mar 2024', requestedDate: '16/03/2024' },
  { id: 2, master: 'Priya Sharma', amount: 89200, period: 'Mar 2024', requestedDate: '15/03/2024' },
  { id: 3, master: 'Arjun Patel', amount: 156700, period: 'Mar 2024', requestedDate: '14/03/2024' },
];

// Anomalies
export const anomalies = [
  { id: 1, type: 'Trade Frequency Spike', user: 'Sanjay Gupta', description: '50 trades in 1 hour (normal: 5-10)', detectedAt: '16/03/2024 14:30', severity: 'Medium' },
  { id: 2, type: 'Large Order Size', user: 'Rajesh Verma', description: 'Order size 10x normal pattern', detectedAt: '16/03/2024 11:15', severity: 'High' },
  { id: 3, type: 'API Latency Spike', user: 'System', description: 'Zerodha API latency >500ms', detectedAt: '16/03/2024 10:00', severity: 'Low' },
];
// --- NEW MOCK DATA ADDITIONS -----------------------------------------------
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

