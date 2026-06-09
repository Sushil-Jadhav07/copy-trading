import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, RefreshCw, Wifi, Clock, IndianRupee } from 'lucide-react';
import { brokerService } from '@/lib/broker';
import { useToast } from '@/components/shared/Toast';
import { formatCurrency } from '@/lib/utils';

const OAUTH_EXCHANGE_STORAGE_PREFIX = 'broker-oauth-exchange';

const formatSyncTime = (raw) => {
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return null;
  }
};

const IP_WHITELIST_BROKERS = ['FYERS', 'DHAN', 'ANGELONE', 'UPSTOX'];

const DematConnected = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [status, setStatus] = useState('loading');
  const [accountDetails, setAccountDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // FIX 1: useRef guard — survives StrictMode double-mount without triggering re-render.
  // Even if StrictMode is re-added later, this ensures the login API is only called once.
  const loginAttempted = useRef(false);

  const storedAccountId = typeof window !== 'undefined'
    ? window.sessionStorage.getItem('oauth-pending-account-id')
    : null;
  const accountId = searchParams.get('accountId') || searchParams.get('account_id') || storedAccountId;
  const requestToken = searchParams.get('request_token');   // Zerodha
  const authCode    = searchParams.get('auth_code');        // Fyers
  const code        = searchParams.get('code');             // Upstox — sends ?code= not ?auth_code=
  const tokenId     = searchParams.get('tokenId') || searchParams.get('token_id'); // Dhan
  const brokerCode  = requestToken || authCode || code || tokenId;

  const selectedBroker = {
    brokerId: accountDetails?.account?.broker || accountDetails?.broker || accountDetails?.profile?.broker || '',
    name: accountDetails?.account?.broker || accountDetails?.broker || accountDetails?.profile?.broker || '',
  };
  const requiresWhitelist = accountDetails?.requiresIpWhitelist
    ?? IP_WHITELIST_BROKERS.includes(String(selectedBroker?.brokerId || '').toUpperCase());

  const exchangeStorageKey = useMemo(() => {
    if (!accountId || !brokerCode) return '';
    return `${OAUTH_EXCHANGE_STORAGE_PREFIX}:${accountId}:${brokerCode}`;
  }, [accountId, brokerCode]);

  // FIX 2: Upstox OAuth callback sends ?code= but the backend login endpoint expects
  // the field named "authCode". The old code sent { code: "..." } which the backend
  // rejected silently — always derive 'authCode' when the URL param is ?code=
  const deriveLoginField = (oauthData) => {
    if (oauthData?.loginField) return oauthData.loginField;
    if (requestToken) return 'requestToken';
    if (authCode)    return 'authCode';
    if (tokenId)     return 'authCode';
    if (code)        return 'authCode'; // Upstox: URL param is ?code= but backend field is authCode
    return 'authCode';
  };

  const verifyConnection = async () => {
    try {
      if (!accountId) {
        setErrorMessage('');
        setStatus('success');
        return true;
      }

      if (brokerCode) {
        // FIX 3: Mark the code as used BEFORE the API call — not after.
        // If anything triggers a second call (StrictMode, re-render, network retry),
        // this blocks it immediately instead of letting it hit the backend.
        if (exchangeStorageKey && typeof window !== 'undefined' && window.sessionStorage.getItem(exchangeStorageKey)) {
          throw new Error('This auth code has already been used. Please login again to get a fresh code.');
        }
        if (exchangeStorageKey && typeof window !== 'undefined') {
          window.sessionStorage.setItem(exchangeStorageKey, 'used');
        }

        let oauthData = {};
        try { oauthData = await brokerService.getOAuthUrl(accountId); } catch { /* derive loginField from URL params */ }
        const loginField = deriveLoginField(oauthData);
        const loginPayload = { [loginField]: brokerCode };

        const dhanClientId = searchParams.get('clientId') || searchParams.get('client_id') || searchParams.get('dhanClientId');
        if (dhanClientId) loginPayload.clientId = dhanClientId;

        await brokerService.loginAccount(accountId, loginPayload);

        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem('oauth-pending-account-id');
          const nextUrl = `${window.location.pathname}?accountId=${encodeURIComponent(accountId)}`;
          window.history.replaceState({}, '', nextUrl);
          if (window.opener && !window.opener.closed) {
            try { window.opener.postMessage({ type: 'BROKER_LOGIN_SUCCESS', accountId }, window.location.origin); } catch { /* ignore */ }
          }
        }
      } else {
        await brokerService.getAccountStatus(accountId);
      }

      setErrorMessage('');
      setStatus('success');
      return true;
    } catch (error) {
      const nextMessage = brokerCode
        ? (error.message || 'Login failed. Auth code is single-use — please login again to get a fresh code.')
        : (error.message || 'Unable to verify broker connection.');
      setErrorMessage(nextMessage);
      setStatus('error');
      addToast(nextMessage, 'error');
      return false;
    }
  };

  const fetchDetails = async () => {
    if (!accountId) return;
    setDetailsLoading(true);
    try {
      const data = await brokerService.getDashboard(accountId);
      setAccountDetails(data);
    } catch {
      // Non-critical — connection already verified
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    // useRef guard: blocks the second StrictMode invocation from firing the login call.
    if (loginAttempted.current) return;
    loginAttempted.current = true;

    let mounted = true;
    (async () => {
      const verified = await verifyConnection();
      if (mounted && verified) await fetchDetails();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      if (brokerCode && accountId) {
        // NEVER retry with the same code — always redirect to get a fresh one
        const oauthData = await brokerService.getOAuthUrl(accountId);
        const oauthUrl = oauthData?.oauthUrl || oauthData?.loginUrl || oauthData?.url || '';
        if (!oauthUrl) throw new Error('Unable to retrieve broker login URL.');
        if (exchangeStorageKey && typeof window !== 'undefined') {
          window.sessionStorage.removeItem(exchangeStorageKey);
        }
        window.location.assign(oauthUrl);
        return;
      }
      loginAttempted.current = false;
      setStatus('loading');
      const verified = await verifyConnection();
      if (verified) await fetchDetails();
    } catch (error) {
      addToast(error.message || 'Unable to start broker login.', 'error');
    } finally {
      setRetrying(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Verifying broker connection...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card p-8 sm:p-10 text-center max-w-sm w-full">
        {status === 'success' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold mb-1">Broker Connected</h2>
            <p className="text-sm text-muted-foreground mb-6">Your broker account has been linked and verified successfully.</p>
            {requiresWhitelist && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/8 text-sm mb-4">
                <span className="text-amber-500 font-bold text-base shrink-0">!</span>
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wide mb-0.5">IP Whitelist Required</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {selectedBroker?.name || 'This broker'} requires you to whitelist our server IP in your broker developer portal before API calls will work.
                  </p>
                  {(accountDetails?.platformServerIp || accountDetails?.account?.platformServerIp) && (
                    <p className="font-mono text-xs font-bold mt-1 text-foreground select-all">
                      Server IP: {accountDetails?.platformServerIp || accountDetails?.account?.platformServerIp}
                    </p>
                  )}
                </div>
              </div>
            )}
            {detailsLoading ? (
              <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Fetching account details...
              </div>
            ) : accountDetails ? (
              <div className="mb-6 space-y-2.5">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                    Connection Status
                  </div>
                  <span className="text-xs font-semibold text-emerald-500">Connected &amp; Verified</span>
                </div>
                {accountDetails.profile?.name && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <span className="text-xs text-muted-foreground">Account Holder</span>
                    <span className="text-xs font-medium">{accountDetails.profile.name}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IndianRupee className="w-3.5 h-3.5" />
                    Available Balance
                  </div>
                  <span className="text-sm font-bold">
                    {formatCurrency(accountDetails.margin?.availableMargin ?? accountDetails.account?.margin ?? accountDetails.margin ?? 0)}
                  </span>
                </div>
                {accountDetails.margin?.totalFunds > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <span className="text-xs text-muted-foreground">Total Funds</span>
                    <span className="text-xs font-medium">{formatCurrency(accountDetails.margin.totalFunds)}</span>
                  </div>
                )}
                {(accountDetails.account?.clientId || accountDetails.clientId || accountDetails.userId) && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <span className="text-xs text-muted-foreground">Client ID</span>
                    <span className="text-xs font-medium font-mono">
                      {accountDetails.account?.clientId || accountDetails.clientId || accountDetails.userId}
                    </span>
                  </div>
                )}
                {accountDetails.positions?.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <span className="text-xs text-muted-foreground">Open Positions</span>
                    <span className="text-xs font-medium">{accountDetails.positions.length}</span>
                  </div>
                )}
                {(accountDetails.account?.linkedAt || accountDetails.linkedAt) && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      Last Synced
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatSyncTime(accountDetails.account?.linkedAt || accountDetails.linkedAt)}
                    </span>
                  </div>
                )}
              </div>
            ) : null}
            <button onClick={() => navigate('/')} className="btn-primary w-full py-2.5 text-sm font-semibold">
              Continue to Dashboard
            </button>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-red-500/12 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold mb-1 text-red-500">Connection Failed</h2>
            <p className="text-sm text-muted-foreground mb-6">
              {errorMessage || "We couldn't verify your broker connection. The auth code may have expired or already been used."}
            </p>
            <div className="space-y-2">
              <button onClick={handleRetry} disabled={retrying} className="btn-primary w-full py-2.5 text-sm font-semibold disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Redirecting to broker login...' : 'Login Again (Get Fresh Code)'}
              </button>
              <button onClick={() => navigate(-1)} className="w-full py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                Go Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DematConnected;