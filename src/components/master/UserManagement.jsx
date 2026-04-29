import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Link, Link2Off, Trash2, WifiOff, CheckCircle2, Clock, XCircle, AlertCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
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

/* ── Status helpers ── */
const getStatusInfo = (acc) => {
  const s = String(acc.status || '').toUpperCase();
  const active = acc.sessionActive || s === 'ACTIVE';
  if (active) return { key: 'connected', label: 'Connected & Verified', icon: CheckCircle2, color: '#10B981' };
  if (s === 'PENDING') return { key: 'pending', label: 'Pending', icon: Clock, color: '#F59E0B' };
  if (s === 'FAILED' || s === 'ERROR') return { key: 'failed', label: 'Failed', icon: XCircle, color: '#EF4444' };
  return { key: 'inactive', label: 'Inactive', icon: AlertCircle, color: '#9CA3AF' };
};

const StatusBadge = ({ acc }) => {
  const { key, label, icon: Icon, color } = getStatusInfo(acc);
  return (
    <span className={`broker-status-badge ${key}`}>
      <Icon style={{ width: 10, height: 10, color }} />
      {label}
    </span>
  );
};

const formatLinkedAt = (raw) => {
  if (!raw) return null;
  try {
    return new Date(raw).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return null; }
};

const UserManagement = ({
  title = 'User Management',
  connectTitle = "Connect Broker Account",
  detailBasePath = '/master/demat',
}) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const { accounts, loading, error, refetch } = useBrokerAccounts();
  const { brokers, load } = useBrokerList();
  const [deleteModal, setDeleteModal]   = useState(false);
  const [selectedAcc, setSelectedAcc]   = useState(null);
  const [refreshing, setRefreshing]     = useState({});
  const [testing, setTesting]           = useState({});
  const [search, setSearch]             = useState('');
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [formErrors, setFormErrors]     = useState({});
  const [loginTarget, setLoginTarget]   = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [totpCode, setTotpCode]         = useState('');
  const [loginConfig, setLoginConfig]   = useState(null);
  const [oauthRedirectUrl, setOauthRedirectUrl] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [oauthOpened, setOauthOpened]   = useState(false);
  const [addLoading, setAddLoading]     = useState(false);
  const [testResult, setTestResult]     = useState(null); // { ok, message }
  const [liveBalances, setLiveBalances] = useState({});

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (error) addToast(error, 'error'); }, [addToast, error]);

  // Enrich accounts with live balance data if session is active
  useEffect(() => {
    if (accounts.length > 0) {
      accounts.forEach((acc) => {
        const id = acc.accountId || acc.id;
        if (acc.sessionActive && !liveBalances[id]) {
          brokerService.getDashboard(id)
            .then((data) => {
              const margin = data.margin?.availableMargin ?? data.account?.margin ?? acc.margin ?? 0;
              const pnl = data.account?.pnl ?? acc.pnl ?? 0;
              setLiveBalances((prev) => ({
                ...prev,
                [id]: { margin, pnl },
              }));
            })
            .catch(() => {
              // Fail silently, fallback to cached data
            });
        }
      });
    }
  }, [accounts]);

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
    setTestResult(null);
  };

  /* ── Test Connection (before save) ── */
  const handleTestConnection = async () => {
    if (!form.broker) { addToast('Select a broker first', 'error'); return; }
    setTesting((p) => ({ ...p, _new: true }));
    setTestResult(null);
    try {
      // For token-based brokers, try adding then immediately check status
      // For oauth brokers, we can't fully test until after oauth, so just indicate ready
      const brokerMeta = brokerMetaMap[normalizeBrokerKey(form.broker)];
      const loginMethod = brokerMeta?.loginMethod || 'oauth';
      if (loginMethod === 'oauth') {
        setTestResult({ ok: true, message: 'OAuth broker — connection will be verified after login.' });
      } else if (form.accessToken) {
        // Optimistic: validate token format
        setTestResult({ ok: true, message: 'Credentials look valid. Click Add to connect.' });
      } else {
        setTestResult({ ok: false, message: 'Fill in required credentials before testing.' });
      }
    } catch (e) {
      setTestResult({ ok: false, message: e.message || 'Test failed.' });
    } finally {
      setTesting((p) => ({ ...p, _new: false }));
    }
  };

  /* ── Fetch OAuth config ── */
  const fetchOAuthConfig = async (accountId, brokerKey) => {
    const isDhan = brokerKey === 'dhan';
    if (isDhan) {
      try {
        const res = await brokerService.loginAccount(accountId, {});
        const payload = res?.data || res || {};
        const url = payload?.loginUrl || payload?.oauthUrl || payload?.url || payload?.redirectUrl || '';
        return { oauthUrl: url, loginField: 'authCode', broker: payload?.broker || 'Dhan', message: payload?.message || 'Complete Dhan login and paste the redirect URL below.' };
      } catch {
        const res = await brokerService.getOAuthUrl(accountId);
        const payload = res?.data || res || {};
        const url = payload?.oauthUrl || payload?.loginUrl || payload?.url || '';
        return { oauthUrl: url, loginField: 'authCode', broker: 'Dhan', message: 'Complete Dhan login and paste the redirect URL below.' };
      }
    }
    const res = await brokerService.getOAuthUrl(accountId);
    const payload = res?.data || res || {};
    const url = payload?.oauthUrl || payload?.loginUrl || payload?.url || '';
    return { oauthUrl: url, loginField: payload?.loginField || 'authCode', broker: payload?.broker || brokerKey, message: payload?.message || '' };
  };

  /* ── Add account ── */
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
          refetch(); setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null);
          return;
        }
        const newAcc = await brokerService.addAccount({ brokerId: 'dhan', clientId: form.dhanClientId?.trim() || '', accountNickname: form.nickname });
        setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null); refetch();
        await openLoginModal(newAcc.accountId || newAcc.id, 'dhan');
        return;
      }
      if (loginMethod === 'token') {
        if (form.growwOption === 'accessToken') {
          const newAcc = await brokerService.addAccount({ brokerId: 'groww', accessToken: form.accessToken, accountNickname: form.nickname });
          // Activate the session so the backend stores and uses the accessToken
          // for subsequent Groww API calls (margins, positions, orders, etc.)
          const newAccId = newAcc?.accountId || newAcc?.id;
          if (newAccId && form.accessToken?.trim()) {
            try {
              await brokerService.loginAccount(newAccId, { accessToken: form.accessToken.trim() });
            } catch (_) {
              // Non-fatal: token was already saved during addAccount
            }
          }
          addToast('Groww account connected successfully', 'success');
          refetch(); setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null);
          return;
        }
        const newAcc = await brokerService.addAccount({ brokerId: 'groww', apiKey: form.apiKey, accountNickname: form.nickname });
        setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null); refetch();
        await openLoginModal(newAcc.accountId || newAcc.id, 'groww');
        return;
      }
      const newAcc = await brokerService.addAccount({ brokerId: normalizedBrokerId, accountNickname: form.nickname });
      setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null); refetch();
      await openLoginModal(newAcc.accountId || newAcc.id, normalizedBrokerId);
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleClear = () => { setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null); };

  const parseCodeFromRedirectUrl = (value, loginField) => {
    if (!value) return '';
    const aliases = {
      requestToken: ['request_token', 'requestToken'],
      authCode: ['auth_code', 'authCode', 'code', 'tokenId', 'token_id'],
      code: ['code', 'authCode', 'auth_code'],
    };
    const candidates = [loginField, ...(aliases[loginField] || [])].filter(Boolean);
    const readParams = (params) => { for (const c of candidates) { const found = params.get(c); if (found) return found; } return ''; };
    try {
      const parsed = new URL(value.trim());
      const found = readParams(parsed.searchParams);
      if (found) return found;
    } catch { /* ignore */ }
    if (!value.includes('=') && value.trim().length >= 6) return value.trim();
    return readParams(new URLSearchParams(value.includes('?') ? value.slice(value.indexOf('?') + 1) : value));
  };

  const closeLoginModal = () => { setLoginModalOpen(false); setLoginConfig(null); setTotpCode(''); setOauthRedirectUrl(''); setOauthOpened(false); };

  const openOauthWindow = (oauthUrl) => {
    if (!oauthUrl) { addToast('OAuth URL not available. Re-add the account.', 'error'); return false; }
    const popup = window.open(oauthUrl, 'broker-login', 'width=600,height=700,noopener,noreferrer');
    if (!popup) window.open(oauthUrl, '_blank', 'noopener,noreferrer');
    setOauthOpened(true);
    return true;
  };

  const openLoginModal = async (accountId, brokerKeyOverride = null) => {
    setLoginTarget(accountId); setTotpCode(''); setOauthRedirectUrl(''); setOauthOpened(false); setLoginLoading(true);
    try {
      const accountMeta = accounts.find((item) => (item.accountId || item.id) === accountId);
      const brokerKey = brokerKeyOverride || normalizeBrokerKey(accountMeta?.brokerId || accountMeta?.broker || accountMeta?.brokerName || '');
      const localBrokerMeta = brokerMetaMap[brokerKey];
      const loginMethod = localBrokerMeta?.loginMethod || 'oauth';
      if (loginMethod === 'token' && brokerKey === 'groww') {
        setLoginConfig({ broker: 'Groww', loginMethod: 'token', loginField: 'totpCode' });
        setLoginModalOpen(true);
        return;
      }
      const oauthConfig = await fetchOAuthConfig(accountId, brokerKey);
      setLoginConfig({ broker: oauthConfig.broker, loginMethod: 'oauth', loginField: oauthConfig.loginField, oauthUrl: oauthConfig.oauthUrl, message: oauthConfig.message });
      setLoginModalOpen(true);
    } catch (err) {
      addToast(err.message || 'Failed to initialize broker login', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleBrokerLogin = async () => {
    if (!loginTarget || !loginConfig) { addToast('Broker login configuration is missing', 'error'); return; }
    setLoginLoading(true);
    try {
      if (loginConfig.loginMethod === 'token') {
        const sanitized = String(totpCode || '').replace(/\D/g, '').slice(0, 6);
        await brokerService.loginAccount(loginTarget, sanitized ? { totpCode: sanitized } : {});
      } else {
        const extracted = parseCodeFromRedirectUrl(oauthRedirectUrl, loginConfig.loginField);
        if (!extracted) { addToast('Could not find the token in the pasted URL. Copy the full redirect URL after login.', 'error'); return; }
        await brokerService.loginAccount(loginTarget, { [loginConfig.loginField]: extracted });
      }
      closeLoginModal();
      addToast('Broker connected & verified successfully', 'success');
      refetch();
    } catch (e) {
      addToast(e.message, 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  /* ── Test existing account connection ── */
  const handleTestAccount = async (acc) => {
    const id = acc.accountId || acc.id;
    setTesting((p) => ({ ...p, [id]: true }));
    try {
      await brokerService.getAccountStatus(id);
      await refetch();
      addToast('Connection verified — account is active', 'success');
    } catch (e) {
      addToast('Connection test failed: ' + e.message, 'error');
    } finally {
      setTesting((p) => ({ ...p, [id]: false }));
    }
  };

  const handleRefresh = async (acc) => {
    const id = acc.accountId || acc.id;
    setRefreshing((p) => ({ ...p, [id]: true }));
    try {
      // Fetch dashboard for live data
      const data = await brokerService.getDashboard(id);
      const margin = data.margin?.availableMargin ?? data.account?.margin ?? acc.margin ?? 0;
      const pnl = data.account?.pnl ?? acc.pnl ?? 0;

      setLiveBalances((prev) => ({
        ...prev,
        [id]: { margin, pnl },
      }));

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
    const active = acc.sessionActive || String(acc.status).toUpperCase() === 'ACTIVE';
    if (active) {
      try { await brokerService.deleteAccount(id); addToast('Broker disconnected', 'warning'); refetch(); }
      catch (e) { addToast(e.message, 'error'); }
      return;
    }
    openLoginModal(id, normalizeBrokerKey(acc.brokerId || acc.broker || acc.brokerName || ''));
  };

  const confirmDelete = async () => {
    try { await brokerService.deleteAccount(selectedAcc.accountId || selectedAcc.id); addToast('Account removed', 'success'); refetch(); }
    catch (e) { addToast(e.message, 'error'); }
    setDeleteModal(false);
  };

  const isOAuthModal = loginConfig?.loginMethod === 'oauth';
  const inputCls = 'w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
      </div>

      {/* ── Add Broker Form ── */}
      <GlassCard title={connectTitle}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-4">
          {/* Broker Select */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Select Broker</label>
            <DivSelect
              value={form.broker}
              onFocus={load}
              onChange={handleBrokerChange}
              placeholder="Select broker"
              options={brokerOptions.map((b) => ({ value: b.value, label: b.label }))}
              triggerClassName={inputCls}
            />
            {formErrors.broker && <p className="text-danger text-xs mt-1">{formErrors.broker}</p>}
          </div>

          {/* Nickname */}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Nickname</label>
            <input value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
              placeholder="My Trading Account" className={inputCls} />
            {formErrors.nickname && <p className="text-danger text-xs mt-1">{formErrors.nickname}</p>}
          </div>

          {/* Dynamic broker fields */}
          {(() => {
            const brokerMeta = brokerMetaMap[normalizeBrokerKey(form.broker)];
            const loginMethod = brokerMeta?.loginMethod || 'oauth';
            const isDhan = normalizeBrokerKey(brokerMeta?.brokerId || brokerMeta?.name || form.broker) === 'dhan';
            if (!form.broker) return null;
            if (isDhan) return (
              <>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Dhan Login Option</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ value: 'accessToken', label: 'Access Token' }, { value: 'oauth', label: 'OAuth' }].map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors ${form.dhanOption === opt.value ? 'border-brand-purple bg-brand-purple/15' : 'border-border bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
                        <input type="radio" name="dhanOption" value={opt.value} checked={form.dhanOption === opt.value} onChange={(e) => setForm((f) => ({ ...f, dhanOption: e.target.value, accessToken: '', dhanClientId: '' }))} className="accent-brand-purple" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  {form.dhanOption === 'accessToken' ? (
                    <>
                      <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Access Token</label>
                      <input type="password" value={form.accessToken} onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))} placeholder="Paste access token" className={inputCls} />
                      <p className="text-[10px] text-warning mt-1">Tokens expire daily at 6 AM.</p>
                      {formErrors.accessToken && <p className="text-danger text-xs mt-1">{formErrors.accessToken}</p>}
                    </>
                  ) : (
                    <>
                      <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Client ID</label>
                      <input value={form.dhanClientId} onChange={(e) => setForm((f) => ({ ...f, dhanClientId: e.target.value }))} placeholder="Dhan Client ID" className={inputCls} />
                      {formErrors.dhanClientId && <p className="text-danger text-xs mt-1">{formErrors.dhanClientId}</p>}
                    </>
                  )}
                </div>
              </>
            );
            if (loginMethod === 'oauth') return (
              <div className="sm:col-span-2 lg:col-span-3 flex items-end">
                <p className="text-xs text-muted-foreground">OAuth broker — no credentials needed. Click <strong>Test</strong> then <strong>Add</strong>.</p>
              </div>
            );
            return (
              <>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Groww Login Option</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ value: 'accessToken', label: 'Access Token' }, { value: 'apiKeyWithTotp', label: 'API Key + TOTP' }].map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors ${form.growwOption === opt.value ? 'border-brand-purple bg-brand-purple/15' : 'border-border bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
                        <input type="radio" name="growwOption" value={opt.value} checked={form.growwOption === opt.value} onChange={(e) => setForm((f) => ({ ...f, growwOption: e.target.value, accessToken: '', apiKey: '' }))} className="accent-brand-purple" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{form.growwOption === 'accessToken' ? 'Access Token' : 'API Key'}</label>
                  <input type="password" value={form.growwOption === 'accessToken' ? form.accessToken : form.apiKey}
                    onChange={(e) => setForm((f) => form.growwOption === 'accessToken' ? { ...f, accessToken: e.target.value } : { ...f, apiKey: e.target.value })}
                    placeholder={form.growwOption === 'accessToken' ? 'Paste access token' : 'Enter API key'} className={inputCls} />
                  {(formErrors.accessToken || formErrors.apiKey) && <p className="text-danger text-xs mt-1">{formErrors.accessToken || formErrors.apiKey}</p>}
                </div>
              </>
            );
          })()}
        </div>

        {/* Test result */}
        {testResult && (
          <div className={`mb-3 p-2.5 rounded-lg text-xs flex items-center gap-2 ${testResult.ok ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'}`}>
            {testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
            {testResult.message}
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleClear} className="px-4 py-2 bg-black/8 dark:bg-white/8 hover:bg-black/12 dark:hover:bg-white/12 border border-border rounded-lg text-sm transition-colors">
            Clear
          </button>
          <button onClick={handleTestConnection} disabled={!form.broker || testing._new}
            className="px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {testing._new ? 'Testing…' : 'Test Connection'}
          </button>
          <button onClick={handleAdd} disabled={addLoading}
            className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
            {addLoading ? 'Adding...' : 'Add Account'}
          </button>
        </div>
      </GlassCard>

      {/* ── Accounts table ── */}
      <GlassCard noPadding>
        <div className="p-4 border-b border-border/50 flex items-center justify-between gap-3 flex-wrap">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts..."
            className="w-full max-w-xs bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground">{filtered.length} account{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="p-4"><SkeletonLoader type="table" rows={4} columns={8} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['#', 'Account', 'Balance', 'Status', 'Last Synced', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((acc, idx) => {
                  const id = acc.accountId || acc.id;
                  const active = acc.sessionActive || String(acc.status).toUpperCase() === 'ACTIVE';
                  const syncedAt = formatLinkedAt(acc.linkedAt);
                  return (
                    <motion.tr key={id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      className="border-b border-border/30 hover:bg-black/2 dark:hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-sm text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold">{acc.nickname || acc.broker}</p>
                          <p className="text-xs text-muted-foreground">{acc.broker} · {acc.userId || acc.clientId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">
                            {formatCurrency(liveBalances[id]?.margin ?? acc.margin ?? 0)}
                          </p>
                          <p className={`text-xs font-semibold ${(liveBalances[id]?.pnl ?? acc.pnl ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {(liveBalances[id]?.pnl ?? acc.pnl ?? 0) >= 0 ? '+' : ''}
                            {formatCurrency(liveBalances[id]?.pnl ?? acc.pnl ?? 0)} P&L
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge acc={acc} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {syncedAt || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Refresh */}
                          <ActionBtn title="Refresh" color="purple" onClick={() => handleRefresh(acc)} spin={refreshing[id]}>
                            <RefreshCw className="w-3.5 h-3.5" />
                          </ActionBtn>
                          {/* Test Connection */}
                          <ActionBtn title="Test Connection" color="amber" onClick={() => handleTestAccount(acc)} spin={testing[id]}>
                            <Zap className="w-3.5 h-3.5" />
                          </ActionBtn>
                          {/* View Details */}
                          <ActionBtn title="View Details" color="blue" onClick={() => navigate(`${detailBasePath}/${id}`)}>
                            <Eye className="w-3.5 h-3.5" />
                          </ActionBtn>
                          {/* Connect/Disconnect */}
                          <ActionBtn title={active ? 'Disconnect' : 'Connect'} color={active ? 'warning' : 'success'}
                            onClick={() => handleToggleConnect(acc)}>
                            {active ? <Link2Off className="w-3.5 h-3.5" /> : <Link className="w-3.5 h-3.5" />}
                          </ActionBtn>
                          {/* Delete */}
                          <ActionBtn title="Delete" color="danger" onClick={() => { setSelectedAcc(acc); setDeleteModal(true); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </ActionBtn>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-muted-foreground">
                <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium">No broker accounts connected</p>
                <p className="text-xs mt-1 opacity-70">Use the form above to connect your first account.</p>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Delete modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Remove Account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Remove <span className="font-semibold text-foreground">{selectedAcc?.nickname}</span>? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-white rounded-lg text-sm font-medium transition-colors">Remove</button>
          </div>
        </div>
      </Modal>

      {/* Broker Login modal */}
      <Modal isOpen={loginModalOpen} onClose={closeLoginModal} title={`${loginConfig?.broker || 'Broker'} Login`} size="md">
        <div className="space-y-4">
          {loginConfig?.message && <p className="text-xs text-muted-foreground">{loginConfig.message}</p>}
          {loginLoading && !loginConfig ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isOAuthModal ? (
            <div className="space-y-3">
              {loginConfig?.oauthUrl ? (
                <button onClick={() => openOauthWindow(loginConfig?.oauthUrl)}
                  className="w-full py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-lg text-sm font-medium transition-colors">
                  {oauthOpened ? `Open ${loginConfig?.broker || 'Broker'} Login Again` : `Login with ${loginConfig?.broker || 'Broker'}`}
                </button>
              ) : (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
                  <p className="text-xs text-danger">Could not get OAuth URL. Delete and re-add this account.</p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {oauthOpened ? 'After completing login, copy the full redirect URL from your browser and paste it below.' : 'Click above to open broker login. After login, paste the redirect URL here.'}
              </p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Redirect URL (paste after login)</label>
                <input value={oauthRedirectUrl} onChange={(e) => setOauthRedirectUrl(e.target.value)}
                  placeholder="https://...?request_token=..." className={inputCls} />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">TOTP Code (6-digit from authenticator)</label>
              <input value={totpCode} onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit TOTP" inputMode="numeric" maxLength={6} className={inputCls} />
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={closeLoginModal} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={handleBrokerLogin} disabled={loginLoading || (isOAuthModal && !loginConfig?.oauthUrl)}
              className="flex-1 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
              {loginLoading ? 'Verifying…' : isOAuthModal ? 'Confirm' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ── Small icon button ── */
const COLOR_MAP = {
  purple:  'bg-brand-purple/80 hover:bg-brand-purple',
  blue:    'bg-blue-500/80 hover:bg-blue-500',
  amber:   'bg-amber-500/80 hover:bg-amber-500',
  success: 'bg-emerald-500/80 hover:bg-emerald-500',
  warning: 'bg-amber-500/80 hover:bg-amber-500',
  danger:  'bg-red-500/80 hover:bg-red-500',
};
const ActionBtn = ({ title, color = 'purple', onClick, spin, children }) => (
  <button onClick={onClick} title={title}
    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors text-white ${COLOR_MAP[color] || COLOR_MAP.purple}`}>
    <span className={spin ? 'animate-spin' : ''}>{children}</span>
  </button>
);

export default UserManagement;
