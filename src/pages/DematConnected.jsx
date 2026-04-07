import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { brokerService } from '@/lib/broker';
import { useToast } from '@/components/shared/Toast';

const DematConnected = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const accountId = searchParams.get('accountId') || searchParams.get('account_id');
    if (!accountId) {
      setStatus('success');
      return;
    }

    let isMounted = true;
    const requestToken = searchParams.get('request_token');
    const authCode = searchParams.get('auth_code');
    const code = searchParams.get('code');
    const tokenId = searchParams.get('tokenId') || searchParams.get('token_id');
    const brokerCode = requestToken || authCode || code || tokenId;

    const verifyConnection = async () => {
      try {
        if (brokerCode) {
          const oauthData = await brokerService.getOAuthUrl(accountId);
          const loginField =
            oauthData?.loginField ||
            (requestToken ? 'requestToken' : authCode || tokenId ? 'authCode' : 'code');
          await brokerService.loginAccount(accountId, { [loginField]: brokerCode });
        } else {
          await brokerService.getAccountStatus(accountId);
        }

        if (isMounted) {
          setStatus('success');
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error');
          addToast(error.message || 'Unable to verify broker connection', 'error');
        }
      }
    };

    verifyConnection();

    return () => {
      isMounted = false;
    };
  }, [addToast, searchParams]);

  const handleContinue = () => navigate('/');

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="glass-card p-10 text-center max-w-md">
        {status === 'success' ? (
          <>
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-success text-2xl">✓</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">Broker Connected</h2>
            <p className="text-muted-foreground mb-6">Your broker account has been linked successfully.</p>
            <button
              onClick={handleContinue}
              className="px-6 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg font-medium transition-colors"
            >
              Continue to Dashboard
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-2 text-danger">Connection Failed</h2>
            <p className="text-muted-foreground mb-6">Something went wrong. Please try again from the Demat page.</p>
            <button
              onClick={() => navigate('/master/user-management')}
              className="px-6 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg font-medium transition-colors"
            >
              Back to Demat
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DematConnected;
