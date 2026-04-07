import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Link, Link2Off, Trash2, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { formatCurrency } from '@/lib/utils';
import { useBrokerAccounts, useBrokerList } from '@/hooks/useBroker';

const normalizeBrokerKey = (value) => String(value || '').trim().toLowerCase();

const EMPTY_FORM = {
  broker: '',
  nickname: '',
  growwOption: 'accessToken',
  dhanOption: 'accessToken',
  dhanClientId: '',
  apiKey: '',
  accessToken: '',
};

const UserManagement = ({
  title = 'User Management',
  connectTitle = "Connect User's Broker",
  detailBasePath = '/master/demat',
}) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { accounts, loading, error, refetch } = useBrokerAccounts();
  const { brokers, load } = useBrokerList();
  const [deleteModal, setDeleteModal] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [refreshing, setRefreshing] = useState({});
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [loginTarget, setLoginTarget] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [loginConfig, setLoginConfig] = useState(null);
  const [oauthRedirectUrl, setOauthRedirectUrl] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [oauthOpened, setOauthOpened] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (error) addToast(error, 'error'); }, [addToast, error]);

  const brokerOptions = useMemo(
    () => brokers.map((b) => ({
      value: normalizeBrokerKey(b.brokerId || b.id || b.name),
      label: b.name || b.brokerName || b.brokerId || b.id,
    })),
    [brokers]
  );

  const brokerMetaMap = useMemo(
    () => brokers.reduce((acc, broker) => {
      const keys = [
        normalizeBrokerKey(broker.brokerId),
        normalizeBrokerKey(broker.id),
        normalizeBrokerKey(broker.name),
        normalizeBrokerKey(broker.brokerName),
      ].filter(Boolean);
      keys.forEach((key) => { acc[key] = broker; });
      return acc;
    }, {}),
    [brokers]
  );

  const filtered = accounts.filter((a) =>
    !search || `${a.broker} ${a.userId} ${a.nickname}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleBrokerChange = (value) => {
    setForm({ ...EMPTY_FORM, broker: normalizeBrokerKey(value) });
    setFormErrors({});
  };

  // ─── Fetch OAuth URL with robust fallback ───────────────────────────────────
  // Returns { oauthUrl, loginField, broker, message } or throws
  const fetchOAuthConfig = async (accountId, brokerKey) => {
    const isDhan = brokerKey === 'dhan';

    if (isDhan) {
      // Dhan Step B: POST /login with empty body → returns loginUrl / oauthUrl
      try {
        const res = await brokerService.loginAccount(accountId, {});
        const payload = res?.data || res || {};
        const url =
          payload?.loginUrl ||
          payload?.oauthUrl ||
          payload?.url ||
          payload?.redirectUrl ||
          '';
        return {
          oauthUrl: url,
          loginField: 'authCode',
          broker: payload?.broker || 'Dhan',
          message: payload?.message || 'Open the Dhan login link, complete authentication, then paste the full redirect URL below.',
        };
      } catch (err) {
        // Try GET oauth-url as fallback
        try {
          const res = await brokerService.getOAuthUrl(accountId);
          const payload = res?.data || res || {};
          const url =
            payload?.oauthUrl ||
            payload?.loginUrl ||
            payload?.url ||
            '';
          if (url) {
            return {
              oauthUrl: url,
              loginField: 'authCode',
              broker: payload?.broker || 'Dhan',
              message: payload?.message || 'Open the Dhan login link, complete authentication, then paste the full redirect URL below.',
            };
          }
        } catch (_) { /* ignore */ }
        throw new Error('Could not generate Dhan consent URL. ' + err.message);
      }
    }

    // Standard OAuth brokers: GET /oauth-url
    const res = await brokerService.getOAuthUrl(accountId);
    const payload = res?.data || res || {};
    const url =
      payload?.oauthUrl ||
      payload?.loginUrl ||
      payload?.url ||
      '';
    return {
      oauthUrl: url,
      loginField: payload?.loginField || 'authCode',
      broker: payload?.broker || brokerKey,
      message: payload?.message || '',
    };
  };

  const handleAdd = async () => {
    const errors = {};
    if (!form.broker) errors.broker = 'Required';
    if (!form.nickname.trim()) errors.nickname = 'Required';

    const brokerMeta = brokerMetaMap[normalizeBrokerKey(form.broker)];
    const loginMethod = brokerMeta?.loginMethod || 'oauth';
    const normalizedBrokerId = normalizeBrokerKey(brokerMeta?.brokerId || form.broker);
    const isDhan = normalizedBrokerId === 'dhan';

    if (!isDhan && loginMethod === 'token') {
      if (form.growwOption === 'accessToken' && !form.accessToken.trim()) errors.accessToken = 'Required';
      if (form.growwOption === 'apiKeyWithTotp' && !form.apiKey.trim()) errors.apiKey = 'Required';
    }
    if (isDhan) {
      if (form.dhanOption === 'accessToken' && !form.accessToken.trim()) errors.accessToken = 'Required';
      if (form.dhanOption === 'oauth' && !form.dhanClientId?.trim()) errors.dhanClientId = 'Required';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddLoading(true);
    try {
      if (isDhan) {
        if (form.dhanOption === 'accessToken') {
          await brokerService.addAccount({ brokerId: 'dhan', accessToken: form.accessToken, accountNickname: form.nickname });
          addToast('Dhan account connected successfully', 'success');
          refetch();
          setForm(EMPTY_FORM);
          setFormErrors({});
          return;
        }
        // Dhan OAuth
        const newAcc = await brokerService.addAccount({
          brokerId: 'dhan',
          clientId: form.dhanClientId?.trim() || '',
          accountNickname: form.nickname,
        });
        setForm(EMPTY_FORM);
        setFormErrors({});
        refetch();
        await openLoginModal(newAcc.accountId || newAcc.id, 'dhan');
        return;
      }

      if (loginMethod === 'token') {
        if (form.growwOption === 'accessToken') {
          await brokerService.addAccount({ brokerId: 'groww', accessToken: form.accessToken, accountNickname: form.nickname });
          addToast('Groww account connected successfully', 'success');
          refetch();
          setForm(EMPTY_FORM);
          setFormErrors({});
          return;
        }
        const newAcc = await brokerService.addAccount({ brokerId: 'groww', apiKey: form.apiKey, accountNickname: form.nickname });
        setForm(EMPTY_FORM);
        setFormErrors({});
        refetch();
        await openLoginModal(newAcc.accountId || newAcc.id, 'groww');
        return;
      }

      // Standard OAuth (Zerodha, Fyers, Upstox)
      const newAcc = await brokerService.addAccount({ brokerId: normalizedBrokerId, accountNickname: form.nickname });
      setForm(EMPTY_FORM);
      setFormErrors({});
      refetch();
      await openLoginModal(newAcc.accountId || newAcc.id, normalizedBrokerId);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleClear = () => { setForm(EMPTY_FORM); setFormErrors({}); };

  const parseCodeFromRedirectUrl = (value, loginField) => {
    if (!value) return '';
    const aliases = {
      requestToken: ['request_token', 'requestToken'],
      authCode: ['auth_code', 'authCode', 'code', 'tokenId', 'token_id'],
      code: ['code', 'authCode', 'auth_code'],
    };
    const candidates = [loginField, ...(aliases[loginField] || [])].filter(Boolean);
    const readParams = (params) => {
      for (const c of candidates) {
        const found = params.get(c);
        if (found) return found;
      }
      return '';
    };
    try {
      const parsed = new URL(value.trim());
      const found = readParams(parsed.searchParams);
      if (found) return found;
      if (parsed.hash) {
        const hashFound = readParams(new URLSearchParams(parsed.hash.replace(/^#/, '')));
        if (hashFound) return hashFound;
      }
    } catch {
      try {
        const parsed = new URL(value.trim(), window.location.origin);
        const found = readParams(parsed.searchParams);
        if (found) return found;
      } catch { /* ignore */ }
      const queryIndex = value.indexOf('?');
      const hashIndex = value.indexOf('#');
      const query = queryIndex >= 0 ? value.slice(queryIndex + 1) : value;
      const hash = hashIndex >= 0 ? value.slice(hashIndex + 1) : '';
      const found = readParams(new URLSearchParams(query));
      if (found) return found;
      const hashFound = readParams(new URLSearchParams(hash));
      if (hashFound) return hashFound;
      if (!value.includes('=') && value.trim().length >= 6) return value.trim();
    }
    return '';
  };

  const closeLoginModal = () => {
    setLoginModalOpen(false);
    setLoginConfig(null);
    setTotpCode('');
    setOauthRedirectUrl('');
    setOauthOpened(false);
  };

  const openOauthWindow = (oauthUrl) => {
    if (!oauthUrl) {
      addToast('OAuth URL not available. Please try re-adding the account.', 'error');
      return false;
    }
    const popup = window.open(oauthUrl, 'broker-login', 'width=600,height=700,noopener,noreferrer');
    if (!popup) {
      // Fallback: open in same tab if popup is blocked
      addToast('Popup blocked — opening broker login in a new tab. After login, come back and paste the redirect URL.', 'warning');
      window.open(oauthUrl, '_blank', 'noopener,noreferrer');
    }
    setOauthOpened(true);
    return true;
  };

  // brokerKeyOverride: pass the normalized broker key directly (avoids stale accounts list lookup)
  const openLoginModal = async (accountId, brokerKeyOverride = null) => {
    setLoginTarget(accountId);
    setTotpCode('');
    setOauthRedirectUrl('');
    setOauthOpened(false);
    setLoginLoading(true);

    try {
      // Resolve broker key
      const accountMeta = accounts.find((item) => (item.accountId || item.id) === accountId);
      const brokerKey =
        brokerKeyOverride ||
        normalizeBrokerKey(
          accountMeta?.brokerId ||
          accountMeta?.broker ||
          accountMeta?.brokerName ||
          ''
        );

      const localBrokerMeta = brokerMetaMap[brokerKey];
      const loginMethod = localBrokerMeta?.loginMethod || 'oauth';

      // Groww API Key + TOTP path
      if (loginMethod === 'token' && brokerKey === 'groww') {
        setLoginConfig({ broker: 'Groww', loginMethod: 'token', loginField: 'totpCode' });
        setLoginModalOpen(true);
        return;
      }

      // All OAuth paths (Dhan, Zerodha, Fyers, Upstox)
      const oauthConfig = await fetchOAuthConfig(accountId, brokerKey);
      setLoginConfig({
        broker: oauthConfig.broker,
        loginMethod: 'oauth',
        loginField: oauthConfig.loginField,
        oauthUrl: oauthConfig.oauthUrl,
        message: oauthConfig.message,
      });
      setLoginModalOpen(true);
    } catch (err) {
      addToast(err.message || 'Failed to initialize broker login', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleBrokerLogin = async () => {
    if (!loginTarget || !loginConfig) {
      addToast('Broker login configuration is missing', 'error');
      return;
    }
    setLoginLoading(true);
    try {
      if (loginConfig.loginMethod === 'token') {
        // Groww TOTP
        const sanitized = String(totpCode || '').replace(/\D/g, '').slice(0, 6);
        await brokerService.loginAccount(loginTarget, sanitized ? { totpCode: sanitized } : {});
      } else {
        // OAuth (Zerodha / Fyers / Upstox / Dhan)
        const extracted = parseCodeFromRedirectUrl(oauthRedirectUrl, loginConfig.loginField);
        if (!extracted) {
          addToast(
            `Could not find the token in the pasted URL. Make sure you copied the full redirect URL after completing login.`,
            'error'
          );
          return;
        }
        await brokerService.loginAccount(loginTarget, { [loginConfig.loginField]: extracted });
      }
      closeLoginModal();
      addToast('Broker connected successfully', 'success');
      refetch();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRefresh = async (acc) => {
    const id = acc.accountId || acc.id;
    setRefreshing((p) => ({ ...p, [id]: true }));
    try {
      await brokerService.getAccountStatus(id);
      await refetch();
      addToast('Account refreshed', 'success');
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setRefreshing((p) => ({ ...p, [id]: false }));
    }
  };

  const handleToggleConnect = async (acc) => {
    const id = acc.accountId || acc.id;
    if (acc.sessionActive || String(acc.status).toUpperCase() === 'ACTIVE') {
      try {
        await brokerService.deleteAccount(id);
        addToast('Broker disconnected', 'warning');
        refetch();
      } catch (e) {
        addToast(e.message, 'error');
      }
      return;
    }
    openLoginModal(id, normalizeBrokerKey(acc.brokerId || acc.broker || acc.brokerName || ''));
  };

  const confirmDelete = async () => {
    try {
      await brokerService.deleteAccount(selectedAcc.accountId || selectedAcc.id);
      addToast('Account removed', 'success');
      refetch();
    } catch (e) {
      addToast(e.message, 'error');
    }
    setDeleteModal(false);
  };

  const isOAuthModal = loginConfig?.loginMethod === 'oauth';
  const confirmLabel = loginLoading ? 'Submitting...' : isOAuthModal ? 'Confirm' : 'Submit';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <GlassCard title={connectTitle}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-5">
          {/* Broker Select */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Select Broker</label>
            <div className="relative">
              <select
                value={form.broker}
                onFocus={load}
                onChange={(e) => handleBrokerChange(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple appearance-none"
              >
                <option value="" className="bg-background">Select broker</option>
                {brokerOptions.map((b) => (
                  <option key={b.value} value={b.value} className="bg-background">{b.label}</option>
                ))}
              </select>
              {formErrors.broker && <p className="text-danger text-xs mt-1">{formErrors.broker}</p>}
            </div>
            <p className="text-[11px] text-muted-foreground">
              OAuth brokers require no credentials. Groww &amp; Dhan support access token login.
            </p>
          </div>

          {/* Nickname */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Nickname</label>
            <input
              value={form.nickname}
              onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              placeholder="Enter Nickname"
              className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
            />
            {formErrors.nickname && <p className="text-danger text-xs mt-1">{formErrors.nickname}</p>}
            <p className="text-[11px] text-muted-foreground">Shown as the account label across dashboards.</p>
          </div>

          {/* Dynamic broker-specific fields */}
          {(() => {
            const brokerMeta = brokerMetaMap[normalizeBrokerKey(form.broker)];
            const loginMethod = brokerMeta?.loginMethod || 'oauth';
            const isDhan = normalizeBrokerKey(brokerMeta?.brokerId || brokerMeta?.name || form.broker) === 'dhan';

            if (!form.broker) return null;

            if (isDhan) {
              return (
                <>
                  <div className="md:col-span-3">
                    <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Dhan Login Option</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'accessToken', label: 'Access Token (Recommended)' },
                        { value: 'oauth', label: 'OAuth (3-step)' },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                            form.dhanOption === opt.value
                              ? 'border-brand-purple bg-brand-purple/15 text-foreground'
                              : 'border-border bg-black/5 dark:bg-white/5 text-muted-foreground'
                          }`}
                        >
                          <input
                            type="radio"
                            name="dhanOption"
                            value={opt.value}
                            checked={form.dhanOption === opt.value}
                            onChange={(e) => setForm((f) => ({ ...f, dhanOption: e.target.value, accessToken: '', dhanClientId: '' }))}
                            className="accent-brand-purple"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {form.dhanOption === 'accessToken' ? (
                    <div className="md:col-span-2">
                      <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Access Token</label>
                      <input
                        type="password"
                        value={form.accessToken}
                        onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                        placeholder="Paste access token"
                        className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Get from: Dhan Web → My Account → Generate Access Token
                      </p>
                      <p className="text-xs text-warning mt-1">Tokens expire daily at 6 AM. Reconnect each morning.</p>
                      {formErrors.accessToken && <p className="text-danger text-xs mt-1">{formErrors.accessToken}</p>}
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Client ID</label>
                      <input
                        value={form.dhanClientId}
                        onChange={(e) => setForm((f) => ({ ...f, dhanClientId: e.target.value }))}
                        placeholder="Enter Dhan Client ID"
                        className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your Dhan clientId (e.g. 1110569575) configured for the consent app.
                      </p>
                      {formErrors.dhanClientId && <p className="text-danger text-xs mt-1">{formErrors.dhanClientId}</p>}
                      <p className="text-xs text-warning mt-1">Sessions expire daily. Reconnect each morning.</p>
                    </div>
                  )}
                </>
              );
            }

            if (loginMethod === 'oauth') {
              return (
                <div className="md:col-span-3">
                  <p className="text-xs text-muted-foreground mt-7">
                    This broker uses OAuth — no credentials needed. Click <strong>Add</strong> to begin.
                  </p>
                </div>
              );
            }

            // Groww (token)
            return (
              <>
                <div className="md:col-span-3">
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Groww Login Option</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'accessToken', label: 'Access Token (Recommended)' },
                      { value: 'apiKeyWithTotp', label: 'API Key + TOTP' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                          form.growwOption === opt.value
                            ? 'border-brand-purple bg-brand-purple/15 text-foreground'
                            : 'border-border bg-black/5 dark:bg-white/5 text-muted-foreground'
                        }`}
                      >
                        <input
                          type="radio"
                          name="growwOption"
                          value={opt.value}
                          checked={form.growwOption === opt.value}
                          onChange={(e) => setForm((f) => ({ ...f, growwOption: e.target.value, accessToken: '', apiKey: '' }))}
                          className="accent-brand-purple"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>

                {form.growwOption === 'accessToken' ? (
                  <div className="md:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Access Token</label>
                    <input
                      type="password"
                      value={form.accessToken}
                      onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))}
                      placeholder="Paste access token"
                      className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get from: Groww App → Profile → Settings → Trading APIs → Generate Access Token
                    </p>
                    <p className="text-xs text-warning mt-1">Access tokens expire at 6 AM the next day.</p>
                    {formErrors.accessToken && <p className="text-danger text-xs mt-1">{formErrors.accessToken}</p>}
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">API Key</label>
                    <input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                      placeholder="Enter API Key"
                      className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get from: Groww Cloud API Keys page. You'll also need a 6-digit TOTP from your authenticator app.
                    </p>
                    {formErrors.apiKey && <p className="text-danger text-xs mt-1">{formErrors.apiKey}</p>}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleClear} className="px-5 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">
            Clear
          </button>
          <button
            onClick={handleAdd}
            disabled={addLoading}
            className="px-5 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {addLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </GlassCard>

      {/* Accounts table */}
      <GlassCard noPadding>
        <div className="p-4 border-b border-border/50">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full max-w-xs bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
          />
        </div>

        {loading ? (
          <div className="p-4"><SkeletonLoader type="table" rows={5} columns={9} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Broker - User Id - User', 'Margin', 'P&L', 'Positions', 'Refresh', 'Demat', 'Connection', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((acc, idx) => {
                  const id = acc.accountId || acc.id;
                  const active = acc.sessionActive || String(acc.status).toUpperCase() === 'ACTIVE';
                  return (
                    <motion.tr
                      key={id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="border-b border-border/30 hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium">{acc.broker} - {acc.userId} - {acc.nickname}</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(acc.margin)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${acc.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {acc.pnl >= 0 ? '+' : ''}{formatCurrency(acc.pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{acc.positions}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleRefresh(acc)} title="Refresh"
                          className="w-8 h-8 bg-brand-purple/80 hover:bg-brand-purple rounded-lg flex items-center justify-center transition-colors">
                          <RefreshCw className={`w-4 h-4 text-white ${refreshing[id] ? 'animate-spin' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => navigate(`${detailBasePath}/${id}`)} title="View Demat"
                          className="w-8 h-8 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors">
                          <Eye className="w-4 h-4 text-foreground" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleToggleConnect(acc)} title={active ? 'Disconnect' : 'Connect'}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-warning/80 hover:bg-warning' : 'bg-success/80 hover:bg-success'}`}>
                            {active ? <Link2Off className="w-4 h-4 text-foreground" /> : <Link className="w-4 h-4 text-foreground" />}
                          </button>
                          <button title="Re-login"
                            onClick={() => openLoginModal(id, normalizeBrokerKey(acc.brokerId || acc.broker || acc.brokerName || ''))}
                            className="w-8 h-8 bg-teal-500/80 hover:bg-teal-500 rounded-lg flex items-center justify-center transition-colors">
                            <RefreshCw className="w-4 h-4 text-foreground" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelectedAcc(acc); setDeleteModal(true); }} title="Delete"
                          className="w-8 h-8 bg-danger/80 hover:bg-danger rounded-lg flex items-center justify-center transition-colors">
                          <Trash2 className="w-4 h-4 text-foreground" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No demat account connected yet. Please connect your demat account.</p>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Delete modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Delete <span className="font-semibold text-foreground">{selectedAcc?.nickname}</span>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Login modal */}
      <Modal isOpen={loginModalOpen} onClose={closeLoginModal} title={`${loginConfig?.broker || 'Broker'} Login`} size="md">
        <div className="space-y-4">
          {loginConfig?.message && (
            <p className="text-xs text-muted-foreground">{loginConfig.message}</p>
          )}

          {loginLoading && !loginConfig ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isOAuthModal ? (
            <div className="space-y-3">
              {loginConfig?.oauthUrl ? (
                <button
                  onClick={() => openOauthWindow(loginConfig?.oauthUrl)}
                  className="w-full py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors"
                >
                  {oauthOpened
                    ? `Open ${loginConfig?.broker || 'Broker'} Login Again`
                    : `Login with ${loginConfig?.broker || 'Broker'}`}
                </button>
              ) : (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                  <p className="text-xs text-danger">
                    Could not get OAuth URL from broker. Please delete this account and try adding it again.
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {oauthOpened
                  ? 'Complete login in the opened window, then paste the full redirect URL below and click Confirm.'
                  : 'Click the button above to open the broker login page in a popup. After completing login, copy the full redirect URL from your browser and paste it below.'}
              </p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Redirect URL (paste the full URL after login)</label>
                <input
                  value={oauthRedirectUrl}
                  onChange={(e) => setOauthRedirectUrl(e.target.value)}
                  placeholder="https://copy-trading-production-3981.up.railway.app/api/v1/brokers/callback?..."
                  className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">TOTP Code (6-digit from your authenticator app)</label>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit TOTP"
                inputMode="numeric"
                maxLength={6}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={closeLoginModal} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm transition-colors">
              Cancel
            </button>
            <button
              onClick={handleBrokerLogin}
              disabled={loginLoading || (isOAuthModal && !loginConfig?.oauthUrl)}
              className="flex-1 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;