import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, RefreshCw, Wifi, Clock, IndianRupee } from 'lucide-react';
import { brokerService } from '@/lib/broker';
import { useToast } from '@/components/shared/Toast';
import { formatCurrency } from '@/lib/utils';

const formatSyncTime = (raw) => {
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return null; }
};

const IP_WHITELIST_BROKERS = ['GROWW', 'FYERS', 'DHAN', 'ANGELONE'];

const DematConnected = () => {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const { addToast }    = useToast();

  const [status, setStatus]               = useState('loading'); // 'loading' | 'success' | 'error'
  const [accountDetails, setAccountDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [retrying, setRetrying]           = useState(false);

  const accountId = searchParams.get('accountId') || searchParams.get('account_id');
  const selectedBroker = {
    brokerId: accountDetails?.account?.broker || accountDetails?.broker || accountDetails?.profile?.broker || '',
    name: accountDetails?.account?.broker || accountDetails?.broker || accountDetails?.profile?.broker || '',
  };
  const requiresWhitelist = IP_WHITELIST_BROKERS.includes(String(selectedBroker?.brokerId || '').toUpperCase());

  const verifyConnection = async () => {
    const requestToken = searchParams.get('request_token');
    const authCode     = searchParams.get('auth_code');
    const code         = searchParams.get('code');
    const tokenId      = searchParams.get('tokenId') || searchParams.get('token_id');
    const brokerCode   = requestToken || authCode || code || tokenId;

    try {
      if (!accountId) {
        setStatus('success');
        return;
      }
      if (brokerCode) {
        const oauthData  = await brokerService.getOAuthUrl(accountId);
        const loginField = oauthData?.loginField ||
          (requestToken ? 'requestToken' : authCode || tokenId ? 'authCode' : 'code');
        const loginPayload = { [loginField]: brokerCode };
        // Dhan requires clientId at login time — pass it if present in URL params
        const dhanClientId = searchParams.get('clientId') || searchParams.get('client_id') || searchParams.get('dhanClientId');
        if (dhanClientId) loginPayload.clientId = dhanClientId;
        await brokerService.loginAccount(accountId, loginPayload);
      } else {
        await brokerService.getAccountStatus(accountId);
      }
      setStatus('success');
    } catch (error) {
      setStatus('error');
      addToast(error.message || 'Unable to verify broker connection', 'error');
    }
  };

  const fetchDetails = async () => {
    if (!accountId) return;
    setDetailsLoading(true);
    try {
      const data = await brokerService.getDashboard(accountId);
      setAccountDetails(data);
    } catch {
      // non-critical — the connection was already verified, don't surface this error
    }
    finally { setDetailsLoading(false); }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      await verifyConnection();
      if (mounted) fetchDetails();
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    setStatus('loading');
    await verifyConnection();
    await fetchDetails();
    setRetrying(false);
  };

  /* ── Loading spinner ── */
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Verifying broker connection…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-card p-8 sm:p-10 text-center max-w-sm w-full">

        {status === 'success' ? (
          <>
            {/* Success icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>

            <h2 className="text-xl font-bold mb-1">Broker Connected</h2>
            <p className="text-sm text-muted-foreground mb-6">Your broker account has been linked and verified successfully.</p>

            {requiresWhitelist && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/30 bg-amber-500/8 text-sm mb-4">
                <span className="text-amber-500 font-bold text-base shrink-0">⚠</span>
                <div>
                  <p className="font-semibold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wide mb-0.5">
                    IP Whitelist Required
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {selectedBroker?.name || 'This broker'} requires you to whitelist our server IP in your broker developer portal before API calls will work.
                  </p>
                  <p className="font-mono text-xs font-bold mt-1 text-foreground select-all">
                    Server IP: 13.53.246.13
                  </p>
                </div>
              </div>
            )}

            {/* Account info */}
            {detailsLoading ? (
              <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Fetching account details…
              </div>
            ) : accountDetails ? (
              <div className="mb-6 space-y-2.5">
                {/* Connection Status */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                    Connection Status
                  </div>
                  <span className="text-xs font-semibold text-emerald-500">Connected & Verified</span>
                </div>

                {/* Profile name */}
                {accountDetails.profile?.name && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <span className="text-xs text-muted-foreground">Account Holder</span>
                    <span className="text-xs font-medium">{accountDetails.profile.name}</span>
                  </div>
                )}

                {/* Available Balance */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IndianRupee className="w-3.5 h-3.5" />
                    Available Balance
                  </div>
                  <span className="text-sm font-bold">
                    {formatCurrency(accountDetails.margin?.availableMargin ?? accountDetails.account?.margin ?? accountDetails.margin ?? 0)}
                  </span>
                </div>

                {/* Total Funds */}
                {accountDetails.margin?.totalFunds > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <span className="text-xs text-muted-foreground">Total Funds</span>
                    <span className="text-xs font-medium">{formatCurrency(accountDetails.margin.totalFunds)}</span>
                  </div>
                )}

                {/* Account / Client ID */}
                {(accountDetails.account?.clientId || accountDetails.clientId || accountDetails.userId) && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <span className="text-xs text-muted-foreground">Client ID</span>
                    <span className="text-xs font-medium font-mono">
                      {accountDetails.account?.clientId || accountDetails.clientId || accountDetails.userId}
                    </span>
                  </div>
                )}

                {/* Open Positions count */}
                {accountDetails.positions?.length > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/4 dark:bg-white/4 border border-border/50">
                    <span className="text-xs text-muted-foreground">Open Positions</span>
                    <span className="text-xs font-medium">{accountDetails.positions.length}</span>
                  </div>
                )}

                {/* Last Synced */}
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

            <button onClick={() => navigate('/')}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(90deg,#00C896,#00A878)', boxShadow: '0 2px 10px rgba(0,200,150,0.28)' }}>
              Continue to Dashboard
            </button>
          </>
        ) : (
          <>
            {/* Error icon */}
            <div className="w-16 h-16 rounded-full bg-red-500/12 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-xl font-bold mb-1 text-red-500">Connection Failed</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We couldn't verify your broker connection. This may be due to an expired or invalid token.
            </p>

            <div className="space-y-2">
              <button onClick={handleRetry} disabled={retrying}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(90deg,#00C896,#00A878)', boxShadow: '0 2px 10px rgba(0,200,150,0.22)' }}>
                <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
                {retrying ? 'Retrying…' : 'Retry Connection'}
              </button>
              <button onClick={() => navigate(-1)}
                className="w-full py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
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
