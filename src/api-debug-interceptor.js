// ============================================================
// ASCENTRA — DEEP API DEBUG INTERCEPTOR
// ============================================================
// WHERE THIS FILE LIVES:  src/api-debug-interceptor.js
//
// HOW TO ACTIVATE — add ONE line at the TOP of src/main.jsx:
//
//   import './api-debug-interceptor.js'  // REMOVE BEFORE DEPLOY
//   import { StrictMode } from 'react'
//   ...
//
// HOW TO DEACTIVATE — delete that one import line.
// This file itself can stay in the repo (it does nothing unless imported).
// ============================================================

// ─── COPY TRADE FAILURE REASONS ─────────────────────────────────────────────
// When master trades and a child fails, this explains exactly WHY
// based on the error message/status the backend returns in results[].
const COPY_FAIL_REASONS = [
  {
    match: /401|unauthorized|session.*expir|token.*expir|expir.*token/i,
    who: 'CHILD BROKER',
    why: "Child's broker session has expired. The broker rejected the order with 401.",
    fix: "Child must re-login to their broker. Go to Demat Accounts → find the child's broker → click Re-login.",
    yourFault: false,
  },
  {
    match: /insufficient.*margin|margin.*insufficient|not enough.*fund|fund.*insufficient|insufficient.*fund/i,
    who: 'CHILD BROKER',
    why: "Child's broker account does not have enough margin/funds to place the order.",
    fix: "Child needs to add funds to their broker account. Check child's margin via GET /brokers/accounts/{id}/margin.",
    yourFault: false,
  },
  {
    match: /scaling.*zero|qty.*zero|zero.*qty|quantity.*0\b|0.*quantity/i,
    who: 'COPY ENGINE',
    why: "Scaled quantity rounded down to 0. Master qty × child's scalingFactor = 0.",
    fix: "Increase master trade qty OR increase child's scalingFactor above 0.01. Check via GET /master/children/{id}/scaling.",
    yourFault: false,
  },
  {
    match: /paused|copying.*paused|subscription.*paused/i,
    who: 'SUBSCRIPTION',
    why: "Child's copying is PAUSED — engine intentionally skipped this child.",
    fix: "Resume copying for this child: POST /master/children/{childId}/resume.",
    yourFault: false,
  },
  {
    match: /not.*active|inactive|status.*inactive/i,
    who: 'SUBSCRIPTION',
    why: "Child's subscription status is not ACTIVE. Possibly PENDING_APPROVAL or PAUSED.",
    fix: "Approve the child first or resume copying. Check status via GET /master/children.",
    yourFault: false,
  },
  {
    match: /no.*broker|broker.*not.*linked|account.*not.*found|no.*account/i,
    who: 'CHILD SETUP',
    why: "Child has no broker account linked for this subscription.",
    fix: "Child must link a broker account and subscribe again with a valid brokerAccountId.",
    yourFault: false,
  },
  {
    match: /symbol.*not.*found|invalid.*symbol|unknown.*symbol|instrument.*not.*found/i,
    who: 'SYMBOL TRANSLATION',
    why: "Backend could not translate the master's symbol to the child's broker format.",
    fix: "Check if the symbol exists on the child's broker. The instrument master file may not have it. Backend issue.",
    yourFault: false,
  },
  {
    match: /rate.*limit|too.*many.*request|429/i,
    who: 'BROKER API',
    why: "Child's broker rate-limited the order request.",
    fix: "Too many orders in a short time. Backend should implement retry with backoff. Backend issue.",
    yourFault: false,
  },
  {
    match: /market.*closed|outside.*trading|trading.*hour|market.*not.*open/i,
    who: 'MARKET',
    why: "Order placed outside market hours.",
    fix: "Trade during NSE market hours: Mon–Fri 9:15 AM – 3:30 PM IST.",
    yourFault: false,
  },
  {
    match: /lot.*size|invalid.*quantity|minimum.*qty|qty.*invalid/i,
    who: 'F&O LOT SIZE',
    why: "Order quantity is not a valid lot size for this F&O instrument.",
    fix: "Ensure masterQty × scalingFactor = a valid lot size. NIFTY = 75, BANKNIFTY = 30.",
    yourFault: false,
  },
  {
    match: /network|timeout|connection|econnrefused|econnreset/i,
    who: 'NETWORK',
    why: "Backend could not reach the child's broker API — network timeout or connection refused.",
    fix: "EC2 server cannot reach the broker's API. Check if IP whitelist is configured for this broker.",
    yourFault: false,
  },
  {
    match: /duplicate|already.*placed|order.*exists/i,
    who: 'DUPLICATE',
    why: "Duplicate order detected — same order may have already been placed.",
    fix: "Polling cache may have stale entries. Try POST /engine/polling/reset to clear the cache.",
    yourFault: false,
  },
];

function _explainCopyFail(message, status) {
  const text = String(message || status || '');
  for (const reason of COPY_FAIL_REASONS) {
    if (reason.match.test(text)) return reason;
  }
  return {
    who: 'UNKNOWN',
    why: `Backend returned: "${text || 'no message'}"`,
    fix: 'Check the backend server logs for the full error stack trace at this exact timestamp.',
    yourFault: null,
  };
}

// ─── ENDPOINT REGISTRY ───────────────────────────────────────────────────────
const _EP = [
  // AUTH
  { method: 'POST', pattern: /\/auth\/login$/, label: 'Login', doc: true, expectKeys: ['accessToken', 'refreshToken', 'user'], notes: 'If requires2FA:true → show OTP screen. accessToken expires in 15 min.' },
  { method: 'POST', pattern: /\/auth\/register$/, label: 'Register', doc: true, expectKeys: ['userId', 'message'] },
  { method: 'POST', pattern: /\/auth\/send-otp$/, label: 'Send OTP', doc: true },
  { method: 'POST', pattern: /\/auth\/verify-otp$/, label: 'Verify OTP', doc: true, expectKeys: ['accessToken'], notes: 'Token may be nested under data.accessToken.' },
  { method: 'POST', pattern: /\/auth\/logout$/, label: 'Logout', doc: true },
  { method: 'POST', pattern: /\/auth\/refresh-token$/, label: 'Refresh Token', doc: true, expectKeys: ['accessToken', 'refreshToken'], notes: 'Auto-called when token expires. If this 401s → user gets logged out.' },
  { method: 'POST', pattern: /\/auth\/forgot-password$/, label: 'Forgot Password', doc: true },
  { method: 'POST', pattern: /\/auth\/reset-password$/, label: 'Reset Password', doc: true },
  { method: 'GET', pattern: /\/auth\/me$/, label: 'Get My Profile', doc: true, expectKeys: ['userId', 'name', 'email', 'role'], notes: 'Called on every page load to restore session. Slow here = slow app load.' },
  { method: 'PUT', pattern: /\/auth\/me$/, label: 'Update Profile', doc: true },
  { method: 'POST', pattern: /\/auth\/2fa\/enable$/, label: '2FA Enable', doc: true, expectKeys: ['qrCodeUri', 'secret'] },
  { method: 'POST', pattern: /\/auth\/2fa\/verify$/, label: '2FA Verify', doc: true, expectKeys: ['accessToken'] },
  { method: 'DELETE', pattern: /\/auth\/2fa\/disable$/, label: '2FA Disable', doc: true },

  // BROKER
  { method: 'GET', pattern: /\/api\/v1\/brokers$/, label: 'List Brokers', doc: true, expectKeys: ['brokers'], notes: 'Should return 6: GROWW ZERODHA FYERS UPSTOX DHAN ANGELONE.' },
  { method: 'GET', pattern: /\/brokers\/accounts$/, label: 'List Broker Accounts', doc: true, expectKeys: ['accounts'], notes: 'Empty array = user has not connected any broker yet.' },
  { method: 'POST', pattern: /\/brokers\/accounts$/, label: 'Link Broker Account', doc: true, expectKeys: ['accountId', 'status'] },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+$/, label: 'Get Broker Account', doc: true },
  { method: 'PUT', pattern: /\/brokers\/accounts\/[^/]+$/, label: 'Update Broker Account', doc: true },
  { method: 'DELETE', pattern: /\/brokers\/accounts\/[^/]+$/, label: 'Delete Broker Account', doc: true },
  { method: 'POST', pattern: /\/brokers\/accounts\/[^/]+\/login$/, label: 'Broker Login', doc: true, expectKeys: ['status'], notes: 'status should be SESSION_ACTIVE. Anything else = broker rejected credentials.' },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/oauth-url$/, label: 'Get OAuth URL', doc: true, expectKeys: ['oauthUrl'] },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/status$/, label: 'Broker Account Status', doc: true, expectKeys: ['sessionActive', 'status'], notes: 'sessionActive:false → OpenPositions + OrderBook tabs will show empty. See Bug 1 in BUGS_AND_FIXES.md.' },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/test$/, label: 'Test Broker Connection', doc: true },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/margin$/, label: 'Get Margin', doc: true, expectKeys: ['availableMargin'] },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/positions$/, label: 'Get Positions', doc: true, expectKeys: ['positions'], notes: 'Empty array is valid if no open positions. Check session is active first.' },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/orders$/, label: 'Get Orders', doc: true, expectKeys: ['orders'] },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/trades$/, label: 'Get Trades', doc: true, expectKeys: ['trades'] },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/holdings$/, label: 'Get Holdings', doc: true, expectKeys: ['holdings'] },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/dashboard$/, label: 'Broker Dashboard', doc: true, expectKeys: ['margin', 'positions', 'orders'], notes: 'Single call replaces margin + positions + orders + holdings.' },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/signal$/, label: 'Connection Signal', doc: true, expectKeys: ['signal', 'quality'] },
  { method: 'GET', pattern: /\/brokers\/accounts\/[^/]+\/balance-alert$/, label: 'Balance Alert', doc: true, expectKeys: ['level'], notes: 'level: OK / LOW / WARNING / CRITICAL.' },
  { method: 'POST', pattern: /\/brokers\/accounts\/[^/]+\/orders\/close-position$/, label: 'Close Position', doc: true },
  { method: 'DELETE', pattern: /\/brokers\/accounts\/[^/]+\/orders\/[^/]+$/, label: 'Cancel Order', doc: true },
  { method: 'GET', pattern: /\/brokers\/callback/, label: 'OAuth Callback', doc: true },

  // MASTER
  { method: 'GET', pattern: /\/master\/children$/, label: 'List Children', doc: true, expectKeys: ['children'], notes: 'Used in CopyTrading.jsx to build the children table.' },
  { method: 'GET', pattern: /\/master\/children\/pending$/, label: 'Pending Approvals', doc: true, expectKeys: ['pendingApprovals'] },
  { method: 'POST', pattern: /\/master\/children\/bulk-link$/, label: 'Bulk Link Children', doc: true, expectKeys: ['results'] },
  { method: 'POST', pattern: /\/master\/children\/[^/]+\/link$/, label: 'Link Child', doc: true },
  { method: 'DELETE', pattern: /\/master\/children\/[^/]+\/unlink$/, label: 'Unlink Child', doc: true },
  { method: 'POST', pattern: /\/master\/children\/[^/]+\/approve$/, label: 'Approve Child', doc: true },
  { method: 'POST', pattern: /\/master\/children\/[^/]+\/reject$/, label: 'Reject Child', doc: true },
  { method: 'POST', pattern: /\/master\/children\/[^/]+\/decline$/, label: 'Decline Child ⚠ WRONG', doc: false, undocReason: 'WRONG ENDPOINT — API only has /reject not /decline. Fix: use rejectChild() everywhere in master.js and remove declineChild().' },
  { method: 'POST', pattern: /\/master\/children\/[^/]+\/pause$/, label: 'Pause Child', doc: true },
  { method: 'POST', pattern: /\/master\/children\/[^/]+\/resume$/, label: 'Resume Child', doc: true },
  { method: 'GET', pattern: /\/master\/children\/[^/]+\/scaling$/, label: 'Get Child Scaling', doc: true, expectKeys: ['scalingFactor'] },
  { method: 'PUT', pattern: /\/master\/children\/[^/]+\/scaling$/, label: 'Set Child Scaling', doc: true },
  { method: 'GET', pattern: /\/master\/active-account$/, label: 'Get Active Account', doc: true, expectKeys: ['brokerAccountId'], notes: 'If brokerAccountId is empty → auto-copy will NOT work. Poller has nothing to watch.' },
  { method: 'POST', pattern: /\/master\/active-account$/, label: 'Set Active Account', doc: true, notes: 'REQUIRED before auto-copy works. Must be set after linking broker.' },
  { method: 'DELETE', pattern: /\/master\/active-account$/, label: 'Clear Active Account', doc: true },
  { method: 'GET', pattern: /\/master\/analytics$/, label: 'Master Analytics', doc: true, expectKeys: ['totalPnl', 'winRate', 'totalTrades'], notes: 'Does NOT return totalChildren directly — derive from childPerformance array length.' },
  { method: 'GET', pattern: /\/master\/trade-history$/, label: 'Master Trade History', doc: true, expectKeys: ['trades'] },
  { method: 'GET', pattern: /\/master\/copy\/logs$/, label: 'Master Copy Logs', doc: true, expectKeys: ['logs'] },
  { method: 'GET', pattern: /\/master\/earnings$/, label: 'Master Earnings', doc: true, expectKeys: ['totalEarnings', 'thisMonth'] },
  { method: 'GET', pattern: /\/master\/payouts$/, label: 'Master Payouts', doc: true, expectKeys: ['payouts'] },

  // CHILD
  { method: 'GET', pattern: /\/child\/masters$/, label: 'Browse Masters', doc: true, expectKeys: ['masters'], notes: 'If empty → no masters have registered on the platform yet.' },
  { method: 'GET', pattern: /\/child\/subscriptions$/, label: 'My Subscriptions', doc: true, expectKeys: ['subscriptions'] },
  { method: 'POST', pattern: /\/child\/subscriptions$/, label: 'Subscribe to Master', doc: true, expectKeys: ['subscriptionId', 'status'], notes: 'status=PENDING_APPROVAL for new subs, ACTIVE if previously approved.' },
  { method: 'DELETE', pattern: /\/child\/subscriptions\/[^/]+$/, label: 'Unsubscribe from Master', doc: true },
  { method: 'PUT', pattern: /\/child\/subscriptions\/broker$/, label: 'Switch Broker Account', doc: true, expectKeys: ['brokerAccountId', 'brokerId'] },
  { method: 'GET', pattern: /\/child\/scaling$/, label: 'Get Scaling', doc: true, expectKeys: ['scalingFactor'] },
  { method: 'PUT', pattern: /\/child\/scaling$/, label: 'Set Scaling', doc: true },
  { method: 'POST', pattern: /\/child\/copying\/pause$/, label: 'Pause Copying', doc: true },
  { method: 'POST', pattern: /\/child\/copying\/resume$/, label: 'Resume Copying', doc: true },
  { method: 'GET', pattern: /\/child\/copied-trades$/, label: 'Copied Trades', doc: true, expectKeys: ['trades'], notes: 'Each trade should have: id, master, instrument, type, masterQty, myQty, pnl, time, status.' },
  { method: 'GET', pattern: /\/child\/analytics$/, label: 'Child Analytics', doc: true, expectKeys: ['totalPnl', 'copiedTrades', 'failedReplications'], notes: 'API does NOT return portfolioValue — frontend derives from totalPnl.' },
  { method: 'GET', pattern: /\/child\/copy\/logs$/, label: 'Child Copy Logs', doc: true, expectKeys: ['logs'] },

  // ENGINE
  { method: 'POST', pattern: /\/engine\/copy-trade$/, label: 'Manual Copy Trade', doc: true, expectKeys: ['success', 'failed', 'results'], isCopyTrade: true, notes: 'results[] has per-child outcome — expand below to see each child.' },
  { method: 'GET', pattern: /\/engine\/status$/, label: 'Engine Status', doc: true, expectKeys: ['engineStatus', 'pollingEnabled'], notes: 'pollingEnabled:false = auto-copy is OFF.' },
  { method: 'POST', pattern: /\/engine\/polling$/, label: 'Toggle Polling', doc: true, expectKeys: ['pollingEnabled'] },
  { method: 'POST', pattern: /\/engine\/polling\/reset$/, label: 'Reset Polling Cache', doc: true },
  { method: 'GET', pattern: /\/engine\/polling\/status$/, label: 'Polling Status', doc: true, expectKeys: ['pollingEnabled', 'lastResetAt'] },

  // ADMIN
  { method: 'GET', pattern: /\/admin\/users$/, label: 'Admin List Users', doc: true, expectKeys: ['users'] },
  { method: 'GET', pattern: /\/admin\/users\/[^/]+$/, label: 'Admin Get User', doc: true },
  { method: 'PUT', pattern: /\/admin\/users\/[^/]+$/, label: 'Admin Update User', doc: true },
  { method: 'DELETE', pattern: /\/admin\/users\/[^/]+$/, label: 'Admin Delete User', doc: true },
  { method: 'POST', pattern: /\/admin\/users\/master$/, label: 'Admin Create Master', doc: true },
  { method: 'POST', pattern: /\/admin\/users\/child$/, label: 'Admin Create Child', doc: true },
  { method: 'PATCH', pattern: /\/admin\/users\/[^/]+\/activate$/, label: 'Admin Activate User', doc: true },
  { method: 'PATCH', pattern: /\/admin\/users\/[^/]+\/deactivate$/, label: 'Admin Deactivate User', doc: true },
  { method: 'GET', pattern: /\/admin\/analytics$/, label: 'Admin Analytics', doc: true, expectKeys: ['totalUsers', 'totalTrades', 'activeSubscriptions'] },
  { method: 'GET', pattern: /\/admin\/system-health$/, label: 'System Health', doc: true, expectKeys: ['cpuUsage', 'memoryUsage'] },
  { method: 'GET', pattern: /\/admin\/subscriptions$/, label: 'Admin Subscriptions', doc: true, expectKeys: ['subscriptions'] },
  { method: 'GET', pattern: /\/admin\/trade-logs$/, label: 'Admin Trade Logs', doc: true, expectKeys: ['logs'] },
  { method: 'GET', pattern: /\/admin\/brokers\/accounts$/, label: 'Admin Broker Accounts', doc: true, expectKeys: ['accounts'] },
  { method: 'GET', pattern: /\/admin\/brokers\/status$/, label: 'Admin Broker Status', doc: true, expectKeys: ['brokers'] },

  // ── UNDOCUMENTED — in frontend but NOT in API spec ─────────────────────────
  { method: 'GET', pattern: /\/pnl\/summary/, label: 'PnL Summary', doc: false, undocReason: 'pnlService.getSummary() in pnl.js → PnLAnalytics.jsx + useRiskPnl hook. NOT in API spec → PnL charts blank on 404.' },
  { method: 'GET', pattern: /\/pnl\/realized/, label: 'Realized PnL', doc: false, undocReason: 'pnlService.getRealizedPnl() in pnl.js → PnLAnalytics date range. NOT in API spec.' },
  { method: 'GET', pattern: /\/pnl\/unrealized/, label: 'Unrealized PnL', doc: false, undocReason: 'pnlService.getUnrealizedPnl() in pnl.js → PnLAnalytics broker tab. NOT in API spec.' },
  { method: 'GET', pattern: /\/pnl\/child-vs-master/, label: 'Child vs Master PnL', doc: false, undocReason: 'pnlService.getChildVsMaster() in pnl.js → ChildPnLAnalytics.jsx. NOT in API spec.' },
  { method: 'GET', pattern: /\/admin\/pnl\/all/, label: 'Admin PnL All', doc: false, undocReason: 'NOT in API spec. AdminPnL.jsx already self-fixed. If you see this an old code path is still firing.' },
  { method: 'GET', pattern: /\/api\/v1\/notifications$/, label: 'Notifications List', doc: false, undocReason: 'notificationService.getNotifications() in notifications.js. NOT in API spec → bell icon shows 0.' },
  { method: 'PATCH', pattern: /\/notifications\/[^/]+\/read$/, label: 'Mark Notification Read', doc: false, undocReason: 'NOT in API spec. Hook skips this for synthetic WS notifications (ids starting with ws-).' },
  { method: 'POST', pattern: /\/notifications\/read-all$/, label: 'Mark All Read', doc: false, undocReason: 'NOT in API spec.' },
  { method: 'GET', pattern: /\/api\/v1\/copy\/logs$/, label: 'Generic Copy Logs', doc: false, undocReason: 'copyLogService.getAll() in copyLogs.js. NOT in API spec. Use /master/copy/logs or /child/copy/logs.' },
  { method: 'GET', pattern: /\/logs\/trades$/, label: 'User Trade Logs', doc: false, undocReason: 'logsService.getUserTradeLogs() in logs.js. NOT in API spec. Use /master/trade-history or /child/copied-trades.' },
  { method: 'GET', pattern: /\/logs\/broker-errors$/, label: 'User Broker Errors', doc: false, undocReason: 'logsService.getBrokerErrors() in logs.js. NOT in API spec.' },
  { method: 'GET', pattern: /\/admin\/logs\/trades$/, label: 'Admin Logs Trades', doc: false, undocReason: 'logsService.adminTradeLogs() in logs.js. NOT in API spec. Documented: /admin/trade-logs (no /logs/ prefix).' },
  { method: 'GET', pattern: /\/admin\/logs\/system$/, label: 'Admin Logs System', doc: false, undocReason: 'logsService.adminSystemLogs() in logs.js → SystemLogs.jsx admin panel. NOT in API spec.' },
  { method: 'GET', pattern: /\/admin\/logs\/broker-errors$/, label: 'Admin Logs Broker Errors', doc: false, undocReason: 'logsService.adminBrokerErrors() in logs.js. NOT in API spec.' },
  { method: 'GET', pattern: /\/risk\/rules$/, label: 'Risk Rules', doc: false, undocReason: 'riskService.getRules() in risk.js → AdminRiskRules.jsx page. NOT in API spec → whole Risk Rules page fails.' },
  { method: 'GET', pattern: /\/risk\/exposure$/, label: 'Risk Exposure', doc: false, undocReason: 'riskService.getExposure() in risk.js. NOT in API spec.' },
  { method: 'GET', pattern: /\/risk\/margin-check$/, label: 'Risk Margin Check', doc: false, undocReason: 'riskService.checkMargin() in risk.js. NOT in API spec.' },
  { method: 'PUT', pattern: /\/admin\/risk\/rules\/[^/]+$/, label: 'Admin Set Risk Rules', doc: false, undocReason: 'riskService.setRulesForUser() in risk.js → AdminRiskRules.jsx save. NOT in API spec.' },
  { method: 'POST', pattern: /\/trades\/execute$/, label: 'Execute Trade', doc: false, undocReason: 'tradeService.executeTrade() via useTradeEngine hook. NOT in API spec. Use /engine/copy-trade instead.' },
  { method: 'GET', pattern: /\/api\/v1\/trades$/, label: 'List Trades', doc: false, undocReason: 'tradeService.listTrades() in trades.js. NOT in API spec. Use /master/trade-history or /child/copied-trades.' },
  { method: 'GET', pattern: /\/trades\/open-positions$/, label: 'Open Positions via Trades', doc: false, undocReason: 'tradeService.getOpenPositions() in trades.js. NOT in API spec. Use /brokers/accounts/{id}/positions.' },
  { method: 'POST', pattern: /\/trades\/basket$/, label: 'Basket Trade', doc: false, undocReason: 'tradeService.placeBasketOrder() in trades.js. NOT in API spec. No documented equivalent.' },
];

function _match(method, url) {
  const path = url.split('?')[0].replace(/https?:\/\/[^/]+/, '');
  for (const ep of _EP) {
    if (ep.method === method && ep.pattern.test(path)) return ep;
  }
  return null;
}

function _missingKeys(ep, data) {
  if (!ep?.expectKeys || !data || typeof data !== 'object') return [];
  const flat = Array.isArray(data) ? (data[0] || {}) : (data.data || data);
  return ep.expectKeys.filter(k => !(k in flat));
}

// ─── COPY TRADE DEEP TRACER ──────────────────────────────────────────────────
function _traceCopyTrade(reqBody, resData, status) {
  console.group('%c📋 COPY TRADE DEEP TRACE', 'color:#a78bfa;font-size:12px;font-weight:700');

  console.group('%c▶ What master sent', 'color:#67e8f9;font-weight:600');
  console.table({
    Symbol: reqBody?.symbol || '—',
    Side: reqBody?.side || '—',
    Qty: reqBody?.qty || '—',
    Product: reqBody?.product || '—',
    OrderType: reqBody?.orderType || '—',
    Exchange: reqBody?.exchange || '—',
    Price: reqBody?.price ?? '—',
  });
  console.groupEnd();

  if (status !== 200 && status !== 201) {
    console.error(`%c✗ Engine rejected the request entirely (${status})`, 'color:#ef4444;font-weight:600');
    const msg = resData?.error || resData?.message || '';
    if (msg) {
      const r = _explainCopyFail(msg, status);
      console.error(`Reason (${r.who}): ${r.why}`);
      console.info(`Fix: ${r.fix}`);
    }
    console.groupEnd();
    return;
  }

  const total = resData?.childrenTotal ?? 0;
  const success = resData?.success ?? 0;
  const failed = resData?.failed ?? 0;
  const results = Array.isArray(resData?.results) ? resData.results : [];

  console.group(`%c📊 Summary — ${total} children total`, 'color:#67e8f9;font-weight:600');
  console.log(
    `%c✅ Success: ${success}   ❌ Failed: ${failed}`,
    success > 0 && failed === 0 ? 'color:#22c55e;font-weight:700' :
    failed > 0 && success === 0 ? 'color:#ef4444;font-weight:700' :
    'color:#f59e0b;font-weight:700'
  );
  console.groupEnd();

  if (results.length === 0) {
    console.warn('⚠️  No results[] array in response — cannot show per-child breakdown.\n   Ask backend to always include results[] in the copy-trade response.');
    console.groupEnd();
    return;
  }

  console.group('%c👥 Per-child breakdown', 'color:#67e8f9;font-weight:600');
  results.forEach((r, i) => {
    const s = String(r.status || '').toUpperCase();
    const isOk = s === 'SUCCESS' || s === 'EXECUTED';
    const isSkipped = s === 'SKIPPED';
    const icon = isOk ? '✅' : isSkipped ? '⏭' : '❌';
    const header = `${icon} Child ${i + 1}  |  Broker: ${r.broker || '—'}  |  childId: ${r.childId || '—'}  |  Qty placed: ${r.scaledQty ?? '—'}`;

    if (isOk) {
      console.group(`%c${header}`, 'color:#22c55e;font-weight:600');
      console.log('✅ Order placed successfully on broker.');
      if (r.message) console.log('Broker response:', r.message);
      console.groupEnd();
    } else if (isSkipped) {
      console.group(`%c${header}`, 'color:#f59e0b;font-weight:600');
      console.log('⏭ Skipped — child was not eligible (PAUSED or PENDING_APPROVAL).');
      if (r.message) console.log('Reason:', r.message);
      console.groupEnd();
    } else {
      console.group(`%c${header}`, 'color:#ef4444;font-weight:700');
      console.log('%c❌ FAILED', 'color:#ef4444;font-weight:700');
      console.log('Raw error from backend:', r.message || '(no message returned)');

      const reason = _explainCopyFail(r.message, r.status);
      console.group('%c🔍 Why it failed', 'color:#fbbf24;font-weight:600');
      console.log(`%c● Who failed: %c${reason.who}`, 'color:#9ca3af', 'color:#f87171;font-weight:700');
      console.log(`%c● Why:\n  ${reason.why}`, 'color:#fca5a5');
      console.log(`%c● How to fix:\n  ${reason.fix}`, 'color:#86efac');
      if (reason.yourFault === false) {
        console.log('%c→ NOT your frontend code. This is a broker / backend / child-setup issue.', 'color:#67e8f9;font-style:italic');
      } else if (reason.yourFault === true) {
        console.log('%c→ Might be a frontend bug — check what you are sending in the request body.', 'color:#fca5a5;font-style:italic');
      } else {
        console.log('%c→ Unknown cause. Check EC2 server logs at this exact timestamp.', 'color:#9ca3af;font-style:italic');
      }
      console.groupEnd();
      console.groupEnd();
    }
  });
  console.groupEnd();
  console.groupEnd();
}

// ─── MAIN DIAGNOSE ────────────────────────────────────────────────────────────
function _diagnose(method, url, status, data, ms, reqBody) {
  const path = url.split('?')[0].replace(/https?:\/\/[^/]+/, '');
  const ep = _match(method, url);
  const isUndoc = ep ? !ep.doc : true;
  const label = ep ? ep.label : path;

  const icon = status === 0 ? '🔴' : status < 300 ? '✅' : status < 500 ? '🟡' : '🔴';
  const sc = status === 0 ? 'color:#f59e0b;font-weight:700' : status < 300 ? 'color:#22c55e;font-weight:700' : 'color:#ef4444;font-weight:700';
  const lc = ms > 2000 ? 'color:#ef4444' : ms > 800 ? 'color:#f59e0b' : 'color:#9ca3af';

  let sfx = '', sfxStyle = '';
  if (isUndoc && status === 404) { sfx = '  [UNDOCUMENTED + 404]'; sfxStyle = 'color:#ef4444;font-weight:700'; }
  else if (isUndoc && status >= 200 && status < 300) { sfx = '  [UNDOCUMENTED — works!]'; sfxStyle = 'color:#22c55e;font-weight:600'; }
  else if (isUndoc) { sfx = '  [UNDOCUMENTED]'; sfxStyle = 'color:#f59e0b;font-weight:600'; }

  const hArgs = [`${icon} %c${status || 'ERR'}%c  ${method} ${path}  (${label})  %c${ms}ms${sfx ? '%c' + sfx : ''}`, sc, 'color:inherit', lc];
  if (sfx) hArgs.push(sfxStyle);

  console.groupCollapsed(...hArgs);
  console.log('%cFull response:', 'color:#a78bfa;font-weight:600', data);

  if (isUndoc) {
    const r = ep?.undocReason || `${path} is not in the API documentation.`;
    if (status === 404) console.error(`🚫 UNDOCUMENTED + 404 — Backend route does not exist yet.\n   ${r}\n   Fix: Ask backend to build this route, or update frontend to call a documented alternative.`);
    else if (status >= 200 && status < 300) console.warn(`⚠️  UNDOCUMENTED but 2xx — backend built this but it is not in the docs.\n   ${r}\n   ✅ Add this endpoint to your API documentation.`);
    else console.warn(`⚠️  UNDOCUMENTED\n   ${r}`);
  }

  if (status === 0) console.error('🔴 NETWORK ERROR — Request never reached the server.\n   (1) CORS blocking  (2) Server is down  (3) Wrong base URL in .env\n   Fix: DevTools → Network tab → find this request → check for "CORS" or "ERR_CONNECTION_REFUSED".');
  if (status === 401) console.error('🔴 401 UNAUTHORIZED — Token is missing or expired. Token expires after 15 min.\n   Fix: Log in again to get a fresh accessToken.');
  if (status === 403) console.error(`🔴 403 FORBIDDEN — Wrong role for this endpoint.\n   Backend: "${data?.error || data?.message || ''}"\n   Fix: Use MASTER token for master endpoints, ADMIN token for admin endpoints.`);
  if (status === 404 && !isUndoc) console.warn(`⚠️  404 on DOCUMENTED endpoint\n   Backend: "${data?.error || data?.message || ''}"\n   (1) ID in the URL does not exist in the DB  (2) Backend route not deployed yet\n   Fix: Fetch the list endpoint first to get a valid real ID.`);
  if (status === 500) console.error(`🔴 500 INTERNAL SERVER ERROR — Backend crashed.\n   Backend: "${data?.error || data?.message || data?.details || ''}"\n   This is ALWAYS a backend bug. Check EC2 server logs at this exact timestamp.`);
  if (status === 400 || status === 422) console.warn(`⚠️  ${status} VALIDATION ERROR — Backend rejected the request body.\n   Backend: "${data?.error || data?.message || data?.details || JSON.stringify(data)}"\n   Fix: Compare your request body against the API spec.`);
  if (data?.errorCode === 'SESSION_EXPIRED') console.error(`🔴 SESSION_EXPIRED in response.\n   Broker: ${data.brokerName || data.brokerId}  |  Account: ${data.accountId}\n   Fix: POST /api/v1/brokers/accounts/${data.accountId}/login`);
  if (ms > 3000 && status !== 0) console.warn(`⏱ SLOW — ${ms}ms. Copy trading needs sub-second responses. Check broker API latency or EC2 load.`);

  if (status >= 200 && status < 300) {
    const missing = _missingKeys(ep, data);
    if (missing.length) console.warn(`⚠️  MISSING KEYS in response: [${missing.join(', ')}]\n   Expected: [${ep.expectKeys.join(', ')}]\n   Frontend will get undefined for these fields → blank/broken UI.`);

    const body = data?.data || data;
    const empty = body === null || body === undefined
      || (Array.isArray(body) && body.length === 0)
      || (typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0);
    if (empty && ep?.expectKeys?.length) console.warn(`⚠️  2xx but EMPTY response body — expected [${ep.expectKeys.join(', ')}]\n   Backend returned success but no data → UI shows blank or loads forever.`);
    if (ep?.notes) console.info(`📌 ${label}: ${ep.notes}`);
  }

  if (ep?.isCopyTrade) _traceCopyTrade(reqBody, data, status);

  console.groupEnd();
}

// ─── INTERCEPT fetch (axios uses this) ───────────────────────────────────────
const __origFetch = window.fetch;
window.fetch = async function (...args) {
  const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
  const method = ((args[1]?.method) || (args[0]?.method) || 'GET').toUpperCase();
  if (!url.includes('/api/v1/')) return __origFetch.apply(this, args);

  let reqBody = null;
  try { const rb = args[1]?.body; if (rb && typeof rb === 'string') reqBody = JSON.parse(rb); } catch {}

  const t0 = performance.now();
  try {
    const res = await __origFetch.apply(this, args);
    const ms = Math.round(performance.now() - t0);
    const clone = res.clone();
    let body = null;
    try { body = await clone.json(); } catch { try { body = await clone.text(); } catch {} }
    _diagnose(method, url, res.status, body, ms, reqBody);
    return res;
  } catch (err) {
    _diagnose(method, url, 0, { _error: err.message }, Math.round(performance.now() - t0), reqBody);
    throw err;
  }
};

// ─── INTERCEPT XMLHttpRequest (fallback) ─────────────────────────────────────
const __origOpen = XMLHttpRequest.prototype.open;
const __origSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (m, u, ...r) {
  this._dbgM = String(m).toUpperCase();
  this._dbgU = u;
  return __origOpen.apply(this, [m, u, ...r]);
};
XMLHttpRequest.prototype.send = function (body) {
  let reqBody = null;
  try { if (body) reqBody = JSON.parse(body); } catch {}
  const t0 = performance.now();
  this.addEventListener('loadend', () => {
    const url = this._dbgU || '';
    if (!url.includes('/api/v1/')) return;
    const ms = Math.round(performance.now() - t0);
    let data = null;
    try { data = JSON.parse(this.responseText); } catch { data = this.responseText || null; }
    _diagnose(this._dbgM || 'XHR', url, this.status, data, ms, reqBody);
  });
  return __origSend.apply(this, [body]);
};

// ─── STARTUP ─────────────────────────────────────────────────────────────────
const _docCount = _EP.filter(e => e.doc).length;
const _undocCount = _EP.filter(e => !e.doc).length;
console.log(
  '%c⚡ Ascentra API Debug Interceptor ACTIVE\n' +
  `%cTracking %c${_docCount} documented%c + %c${_undocCount} undocumented%c endpoints\n` +
  'Every /api/v1/ call logged with failure reason. Copy trade failures show per-child diagnosis.\n' +
  '%c⚠  Remove  import ./api-debug-interceptor.js  from main.jsx before deploying.',
  'color:#22c55e;font-size:13px;font-weight:700',
  'color:#9ca3af', 'color:#a78bfa;font-weight:700', 'color:#9ca3af',
  'color:#f59e0b;font-weight:700', 'color:#9ca3af',
  'color:#f59e0b;font-size:11px'
);
