import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Eye, Link, Link2Off, Trash2, WifiOff, CheckCircle2, Clock, XCircle, AlertCircle, Zap, Server } from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import Modal from '@/components/shared/Modal';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import DivSelect from '@/components/shared/DivSelect';
import { useToast } from '@/components/shared/Toast';
import { brokerService } from '@/lib/broker';
import { childService } from '@/lib/child';
import { masterService } from '@/lib/master';
import { formatCurrency } from '@/lib/utils';
import { useBrokerAccounts, useBrokerList } from '@/hooks/useBroker';

const normalizeBrokerKey = (value) => String(value || '').trim().toLowerCase();
const normalizeLoginMethod = (value) => String(value || '').trim().toLowerCase();
const isTotpBroker = (loginMethod, brokerKey) =>
  normalizeBrokerKey(loginMethod) === 'totp' ||
  ['angelone', 'angel one'].includes(normalizeBrokerKey(brokerKey));
const IP_WHITELIST_BROKERS = ['dhan', 'groww', 'angelone', 'angel one', 'upstox'];

const getLoginMethodLabel = (method) => {
  switch (normalizeLoginMethod(method)) {
    case 'accesstoken':
      return 'Access Token';
    case 'apikeywithtotp':
      return 'API Key + TOTP';
    case 'totp':
      return 'TOTP';
    case 'oauth':
      return 'OAuth';
    default:
      return String(method || 'Login');
  }
};

const EMPTY_FORM = {
  broker: '',
  nickname: '',
  growwOption: 'accessToken',
  dhanOption: 'accessToken',
  dhanClientId: '',
  clientId: '',
  apiKey: '',
  apiSecret: '',
  accessToken: '',
  proxyHost: '',
  proxyPort: '',
  proxyUser: '',
  proxyPass: '',
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

const parseProxyPort = (value) => {
  if (value == null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const buildProxyPayload = (values = {}) => {
  const proxyHost = String(values.proxyHost || '').trim();
  const proxyUser = String(values.proxyUser || '').trim();
  const proxyPass = String(values.proxyPass || '').trim();
  const proxyPort = parseProxyPort(values.proxyPort);

  if (!proxyHost && !proxyPort && !proxyUser && !proxyPass) {
    return {};
  }

  return {
    proxyHost,
    proxyPort: Number.isFinite(proxyPort) ? proxyPort : values.proxyPort,
    proxyUser,
    proxyPass,
  };
};

const validateProxyConfig = (values = {}) => {
  const proxyHost = String(values.proxyHost || '').trim();
  const proxyUser = String(values.proxyUser || '').trim();
  const proxyPass = String(values.proxyPass || '').trim();
  const rawProxyPort = values.proxyPort;
  const proxyPort = parseProxyPort(rawProxyPort);
  const hasCoreProxyFields = Boolean(proxyHost || rawProxyPort);
  const hasCredentials = Boolean(proxyUser || proxyPass);

  if (!hasCoreProxyFields && !hasCredentials) {
    return {};
  }

  const errors = {};
  if (!proxyHost) errors.proxyHost = 'Required when proxy routing is enabled';
  if (!rawProxyPort && rawProxyPort !== 0) {
    errors.proxyPort = 'Required when proxy routing is enabled';
  } else if (!Number.isInteger(proxyPort) || proxyPort <= 0) {
    errors.proxyPort = 'Enter a valid port number';
  }

  return errors;
};

const getProxyStatusMeta = (account = {}) => {
  const proxyHost = String(account.proxyHost || '').trim();
  const proxyPort = Number(account.proxyPort ?? 0);
  if (account.proxyConfigured && proxyHost && proxyPort > 0) {
    return {
      label: `Proxy ${proxyHost}:${proxyPort}`,
      badgeClass: 'bg-emerald-500 text-white',
      helper: 'Requests route through the configured proxy',
    };
  }

  return {
    label: 'Direct',
    badgeClass: 'border-border bg-black/5 text-muted-foreground dark:bg-white/5',
    helper: 'Broker API calls use the default platform route',
  };
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
  const [reconnectAccessToken, setReconnectAccessToken] = useState('');
  const [loginConfig, setLoginConfig]   = useState(null);
  const [activeLoginMethod, setActiveLoginMethod] = useState('');
  const [oauthRedirectUrl, setOauthRedirectUrl] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [oauthOpened, setOauthOpened]   = useState(false);
  const [addLoading, setAddLoading]     = useState(false);
  const [testResult, setTestResult]     = useState(null); // { ok, message }
  const [liveBalances, setLiveBalances] = useState({});
  const [liveMetrics, setLiveMetrics] = useState({});
  const isChildScope = String(detailBasePath || '').startsWith('/child');
  const isMasterScope = String(detailBasePath || '').startsWith('/master');

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (error) addToast(error, 'error'); }, [addToast, error]);

  const loadLiveAccountSnapshot = async (acc) => {
    const id = acc.accountId || acc.id;
    const [accountSnapshot, signal, margin, positions] = await Promise.all([
      brokerService.getAccount(id).catch(() => null),
      brokerService.getSignal(id).catch(() => null),
      brokerService.getMargin(id).catch(() => null),
      brokerService.getPositions(id).catch(() => []),
    ]);

    const signalQuality = String(signal?.quality || '').toLowerCase();
    const explicitSignalSession =
      typeof signal?.sessionActive === 'boolean'
        ? signal.sessionActive
        : null;
    const inferredSignalSession =
      signalQuality && signalQuality !== 'unknown'
        ? !['disconnected', 'offline', 'failed', 'error'].includes(signalQuality)
        : null;

    return {
      margin: Number(
        margin?.availableMargin ??
        margin?.marginAvailable ??
        margin?.available ??
        margin?.net ??
        accountSnapshot?.margin ??
        acc.margin ??
        0
      ),
      pnl: Number(
        margin?.pnl ??
        accountSnapshot?.pnl ??
        acc.pnl ??
        0
      ),
      positions: Array.isArray(positions)
        ? positions.length
        : Number(accountSnapshot?.positions ?? acc.positions ?? 0),
      quality: String(signal?.quality || 'unknown'),
      latencyMs: signal?.latencyMs ?? null,
      sessionActive: Boolean(
        explicitSignalSession ??
        inferredSignalSession ??
        accountSnapshot?.sessionActive ??
        acc.sessionActive
      ),
    };
  };

  // Enrich accounts with live balance data if session is active
  useEffect(() => {
    if (accounts.length > 0) {
      accounts.forEach((acc) => {
        const id = acc.accountId || acc.id;
        if (acc.sessionActive && !liveBalances[id]) {
          loadLiveAccountSnapshot(acc)
            .then((snapshot) => {
              setLiveBalances((prev) => ({
                ...prev,
                [id]: { margin: snapshot.margin, pnl: snapshot.pnl },
              }));
              setLiveMetrics((prev) => ({
                ...prev,
                [id]: {
                  positions: snapshot.positions,
                  quality: snapshot.quality,
                  latencyMs: snapshot.latencyMs,
                  sessionActive: snapshot.sessionActive,
                },
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
    !search || `${a.broker} ${a.userId} ${a.nickname} ${a.proxyHost || ''}`.toLowerCase().includes(search.toLowerCase())
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
      const normalizedBrokerId = normalizeBrokerKey(brokerMeta?.brokerId || brokerMeta?.name || form.broker);
      const isDhan = normalizedBrokerId === 'dhan';
      const isTotp = isTotpBroker(loginMethod, normalizedBrokerId);
      if (isDhan) {
        if (!form.dhanClientId?.trim()) {
          setTestResult({ ok: false, message: 'Enter Dhan Client ID before testing.' });
        } else if (form.dhanOption === 'accessToken' && !form.accessToken.trim()) {
          setTestResult({ ok: false, message: 'Paste Dhan access token before testing.' });
        } else {
          setTestResult({ ok: true, message: 'Dhan credentials look valid. Click Add to connect.' });
        }
      } else if (isTotp) {
        if (!form.clientId?.trim()) {
          setTestResult({ ok: false, message: 'Enter Angel One Client ID before testing.' });
        } else if (!form.apiSecret?.trim()) {
          setTestResult({ ok: false, message: 'Enter Angel One API Secret Key before testing.' });
        } else {
          setTestResult({ ok: true, message: 'Angel One credentials are ready. Click Add, then enter TOTP.' });
        }
      } else if (loginMethod === 'oauth') {
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
    const payload = await brokerService.getOAuthUrl(accountId);
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
    const isTotp = isTotpBroker(loginMethod, normalizedBrokerId);
    if (!isDhan && loginMethod === 'token') {
      if (form.growwOption === 'accessToken' && !form.accessToken.trim()) errors.accessToken = 'Required';
      if (form.growwOption === 'apiKeyWithTotp' && !form.apiKey.trim()) errors.apiKey = 'Required';
    }
    if (isTotp) {
      if (!form.clientId?.trim()) errors.clientId = 'Required';
      if (!form.apiSecret?.trim()) errors.apiSecret = 'Required';
    }
    if (isDhan) {
      if (!form.dhanClientId?.trim()) errors.dhanClientId = 'Required';
      if (form.dhanOption === 'accessToken' && !form.accessToken.trim()) errors.accessToken = 'Required';
    }
    Object.assign(errors, validateProxyConfig(form));
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setAddLoading(true);
    try {
      const proxyPayload = buildProxyPayload(form);
      if (isDhan) {
        const dhanClientId = form.dhanClientId.trim();
        if (form.dhanOption === 'accessToken') {
          await brokerService.addAccount({
            brokerId: 'dhan',
            clientId: dhanClientId,
            accessToken: form.accessToken.trim(),
            accountNickname: form.nickname,
            ...proxyPayload,
          });
          addToast('Dhan account connected successfully', 'success');
          refetch(); setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null);
          return;
        }
        const newAcc = await brokerService.addAccount({ brokerId: 'dhan', clientId: dhanClientId, accountNickname: form.nickname, ...proxyPayload });
        setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null); refetch();
        await openLoginModal(newAcc.accountId || newAcc.id, 'dhan');
        return;
      }
      if (isTotp) {
        const brokerId = brokerMeta?.brokerId || (normalizedBrokerId === 'angelone' ? 'ANGELONE' : normalizedBrokerId);
        const newAcc = await brokerService.addAccount({
          brokerId,
          clientId: form.clientId.trim(),
          apiSecret: form.apiSecret.trim(),
          accountNickname: form.nickname,
          ...proxyPayload,
        });
        setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null); refetch();
        await openLoginModal(newAcc.accountId || newAcc.id, normalizedBrokerId);
        return;
      }
      if (loginMethod === 'token') {
        if (form.growwOption === 'accessToken') {
          const newAcc = await brokerService.addAccount({ brokerId: 'groww', accessToken: form.accessToken, accountNickname: form.nickname, ...proxyPayload });
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
        const newAcc = await brokerService.addAccount({ brokerId: 'groww', apiKey: form.apiKey, accountNickname: form.nickname, ...proxyPayload });
        setForm(EMPTY_FORM); setFormErrors({}); setTestResult(null); refetch();
        await openLoginModal(newAcc.accountId || newAcc.id, 'groww');
        return;
      }
      const newAcc = await brokerService.addAccount({ brokerId: normalizedBrokerId, accountNickname: form.nickname, ...proxyPayload });
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

  const closeLoginModal = () => {
    setLoginModalOpen(false);
    setLoginConfig(null);
    setActiveLoginMethod('');
    setTotpCode('');
    setReconnectAccessToken('');
    setOauthRedirectUrl('');
    setOauthOpened(false);
  };

  const openOauthWindow = (oauthUrl) => {
    if (!oauthUrl) { addToast('OAuth URL not available. Re-add the account.', 'error'); return false; }
    const popup = window.open(oauthUrl, 'broker-login', 'width=600,height=700,noopener,noreferrer');
    if (!popup) window.open(oauthUrl, '_blank', 'noopener,noreferrer');
    setOauthOpened(true);
    return true;
  };

  const openLoginModal = async (accountId, brokerKeyOverride = null) => {
    setLoginTarget(accountId);
    setTotpCode('');
    setReconnectAccessToken('');
    setOauthRedirectUrl('');
    setOauthOpened(false);
    setLoginLoading(true);
    try {
      const accountMeta = accounts.find((item) => (item.accountId || item.id) === accountId);
      const brokerKey = brokerKeyOverride || normalizeBrokerKey(accountMeta?.brokerId || accountMeta?.broker || accountMeta?.brokerName || '');
      const loginOptionsPayload = await brokerService.getLoginOptions(accountId).catch(() => null);
      const loginOptions = Array.isArray(loginOptionsPayload?.loginOptions)
        ? loginOptionsPayload.loginOptions.map((option, index) => ({
          ...option,
          method: normalizeLoginMethod(option?.method || option?.loginMethod || option?.type || `option-${index}`),
          requiredFields: Array.isArray(option?.requiredFields) ? option.requiredFields : [],
        }))
        : [];
      const optionMethods = loginOptions.map((option) => option.method).filter(Boolean);
      const recommendedLoginMethod = normalizeLoginMethod(
        loginOptionsPayload?.recommendedLoginMethod ||
        loginOptionsPayload?.recommendedMethod ||
        loginOptionsPayload?.recommendedLogin ||
        optionMethods[0] ||
        ''
      );
      const hasOauth = optionMethods.includes('oauth') || Boolean(loginOptionsPayload?.oauthUrl);
      const hasTotp = optionMethods.includes('totp') || optionMethods.includes('apikeywithtotp');
      const hasAccessToken = optionMethods.includes('accesstoken') || optionMethods.includes('access_token');
      const localBrokerMeta = brokerMetaMap[brokerKey];
      const loginMethod = localBrokerMeta?.loginMethod || 'oauth';
      if (loginOptions.length > 0) {
        const initialMethod = recommendedLoginMethod || optionMethods[0] || 'oauth';
        setLoginConfig({
          broker: loginOptionsPayload?.broker || localBrokerMeta?.name || localBrokerMeta?.brokerName || brokerKey || 'Broker',
          brokerId: loginOptionsPayload?.brokerId || brokerKey,
          loginMethod: initialMethod,
          recommendedLoginMethod: recommendedLoginMethod || initialMethod,
          loginOptions,
          loginOptionMethods: optionMethods,
          platformServerIp: loginOptionsPayload?.platformServerIp || '',
          requiresIpWhitelist: Boolean(loginOptionsPayload?.requiresIpWhitelist),
          hasStoredApiKey: Boolean(loginOptionsPayload?.hasStoredApiKey),
          loginField: loginOptionsPayload?.loginField || 'authCode',
          oauthUrl: loginOptionsPayload?.oauthUrl || loginOptionsPayload?.loginUrl || loginOptionsPayload?.url || '',
        });
        setActiveLoginMethod(initialMethod);
        setLoginModalOpen(true);
        return;
      }
      if (hasTotp || isTotpBroker(loginMethod, brokerKey)) {
        setLoginConfig({
          broker: localBrokerMeta?.name || localBrokerMeta?.brokerName || 'Angel One',
          loginMethod: 'totp',
          loginField: 'totpCode',
          message: 'Enter the current 6-digit TOTP from your authenticator app.',
        });
        setActiveLoginMethod('totp');
        setLoginModalOpen(true);
        return;
      }
      if ((loginMethod === 'token' && brokerKey === 'groww') || hasAccessToken) {
        setLoginConfig({ broker: 'Groww', loginMethod: 'token', loginField: 'accessToken' });
        setActiveLoginMethod('accesstoken');
        setLoginModalOpen(true);
        return;
      }
      if (hasOauth && loginOptionsPayload?.oauthUrl) {
        setLoginConfig({
          broker: loginOptionsPayload?.broker || localBrokerMeta?.name || brokerKey,
          loginMethod: 'oauth',
          loginField: loginOptionsPayload?.loginField || 'authCode',
          oauthUrl: loginOptionsPayload?.oauthUrl,
          message: loginOptionsPayload?.message || '',
        });
        setActiveLoginMethod('oauth');
        setLoginModalOpen(true);
        return;
      }
      const oauthConfig = await fetchOAuthConfig(accountId, brokerKey);
      setLoginConfig({ broker: oauthConfig.broker, loginMethod: 'oauth', loginField: oauthConfig.loginField, oauthUrl: oauthConfig.oauthUrl, message: oauthConfig.message });
      setActiveLoginMethod('oauth');
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
      const selectedMethod = normalizeLoginMethod(activeLoginMethod || loginConfig.recommendedLoginMethod || loginConfig.loginMethod);
      if (selectedMethod === 'accesstoken' || loginConfig.loginMethod === 'token') {
        const token = String(reconnectAccessToken || '').trim();
        if (!token) {
          addToast('Paste the Groww access token', 'error');
          return;
        }
        await brokerService.saveAccessToken(loginTarget, token);
      } else if (selectedMethod === 'apikeywithtotp' || selectedMethod === 'totp') {
        const sanitized = String(totpCode || '').replace(/\D/g, '').slice(0, 6);
        if (sanitized.length !== 6) {
          addToast('Enter the 6-digit TOTP code', 'error');
          return;
        }
        await brokerService.loginAccount(loginTarget, { totpCode: sanitized });
      } else {
        const extracted = parseCodeFromRedirectUrl(oauthRedirectUrl, loginConfig.loginField);
        if (!extracted) { addToast('Could not find the token in the pasted URL. Copy the full redirect URL after login.', 'error'); return; }
        const loginPayload = { [loginConfig.loginField]: extracted };
        const accountMeta = accounts.find((item) => String(item.accountId || item.id) === String(loginTarget));
        const brokerKey = normalizeBrokerKey(accountMeta?.brokerId || accountMeta?.broker || accountMeta?.brokerName || loginConfig.broker);
        const clientId = accountMeta?.clientId || accountMeta?.userId || accountMeta?.raw?.clientId;
        if (brokerKey === 'dhan' && clientId) loginPayload.clientId = clientId;
        await brokerService.loginAccount(loginTarget, loginPayload);
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
      const test = await brokerService.testAccount(id);
      await refetch();
      const message = test?.message || 'Connection verified';
      addToast(message, 'success');
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
      const snapshot = await loadLiveAccountSnapshot(acc);

      setLiveBalances((prev) => ({
        ...prev,
        [id]: { margin: snapshot.margin, pnl: snapshot.pnl },
      }));
      setLiveMetrics((prev) => ({
        ...prev,
        [id]: {
          positions: snapshot.positions,
          quality: snapshot.quality,
          latencyMs: snapshot.latencyMs,
          sessionActive: snapshot.sessionActive,
        },
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
      try {
        await brokerService.disconnectAccount(id);
        addToast('Broker disconnected. Reconnect when ready.', 'warning');
        refetch();
      }
      catch (e) { addToast(e.message, 'error'); }
      return;
    }
    openLoginModal(id, normalizeBrokerKey(acc.brokerId || acc.broker || acc.brokerName || ''));
  };

  const confirmDelete = async () => {
    const accountId = selectedAcc?.accountId || selectedAcc?.id;
    if (!accountId) {
      setDeleteModal(false);
      return;
    }

    try {
      if (isMasterScope) {
        const active = await masterService.getActiveAccount().catch(() => null);
        const activeId = active?.brokerAccountId || active?.accountId || '';
        if (String(activeId) === String(accountId)) {
          await masterService.clearActiveAccount().catch(() => {});
          window.localStorage.removeItem('ascentra_active_master_account');
        }

        const linkedChildren = await masterService.getChildren().catch(() => []);
        const isInUseByChildren = linkedChildren.some((child) => {
          const childAccId = child?.brokerAccountId || child?.accountId || '';
          const status = String(child?.status || child?.copyingStatus || '').toUpperCase();
          return (
            String(childAccId) === String(accountId) &&
            ['ACTIVE', 'PAUSED', 'PENDING_APPROVAL', 'APPROVED'].includes(status)
          );
        });

        if (isInUseByChildren) {
          throw new Error('Broker is mapped to linked child accounts. Unlink/reassign those children in Copy Trading first.');
        }
      }

      if (isChildScope) {
        const subscriptions = await childService.getSubscriptions().catch(() => []);
        const isInUseBySubscriptions = subscriptions.some((sub) => {
          const subAccId = sub?.brokerAccountId || '';
          const status = String(sub?.status || sub?.copyingStatus || '').toUpperCase();
          return (
            String(subAccId) === String(accountId) &&
            !['INACTIVE', 'UNSUBSCRIBED', 'CANCELLED'].includes(status)
          );
        });

        if (isInUseBySubscriptions) {
          throw new Error('Broker is used by one or more master subscriptions. Switch broker/unsubscribe first in My Masters.');
        }
      }

      await brokerService.deleteAccount(accountId);
      const latest = await brokerService.getAccounts().catch(() => []);
      const stillExists = latest.some((item) => String(item.accountId || item.id) === String(accountId));
      if (stillExists) {
        addToast('Delete request succeeded, but server still returns this account (disconnected only)', 'warning');
      } else {
        addToast('Account removed', 'success');
      }
      refetch();
    } catch (e) {
      addToast(e.message, 'error');
    }
    setDeleteModal(false);
  };

  const isOAuthModal = normalizeLoginMethod(activeLoginMethod || loginConfig?.recommendedLoginMethod || loginConfig?.loginMethod) === 'oauth';
  const loginOptions = Array.isArray(loginConfig?.loginOptions) ? loginConfig.loginOptions : [];
  const selectedLoginMethod = normalizeLoginMethod(activeLoginMethod || loginConfig?.recommendedLoginMethod || loginConfig?.loginMethod);
  const selectedLoginOption = loginOptions.find((option) => normalizeLoginMethod(option.method) === selectedLoginMethod) || null;
  const inputCls = 'w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40';
  const selectedBrokerMeta = brokerMetaMap[normalizeBrokerKey(form.broker)];
  const selectedBrokerKey = normalizeBrokerKey(selectedBrokerMeta?.brokerId || selectedBrokerMeta?.name || form.broker);
  const showWhitelistHint = IP_WHITELIST_BROKERS.includes(selectedBrokerKey);

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
            const brokerMeta = selectedBrokerMeta;
            const loginMethod = brokerMeta?.loginMethod || 'oauth';
            const normalizedBrokerId = selectedBrokerKey;
            const isDhan = normalizedBrokerId === 'dhan';
            const isTotp = isTotpBroker(loginMethod, normalizedBrokerId);
            if (!form.broker) return null;
            if (isDhan) return (
              <>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Dhan Login Option</label>
                  <div className="flex flex-wrap gap-2">
                    {[{ value: 'accessToken', label: 'Access Token' }, { value: 'oauth', label: 'OAuth' }].map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition-colors ${form.dhanOption === opt.value ? 'border-brand-purple bg-brand-purple/15' : 'border-border bg-black/5 dark:bg-white/5 text-muted-foreground'}`}>
                        <input type="radio" name="dhanOption" value={opt.value} checked={form.dhanOption === opt.value} onChange={(e) => setForm((f) => ({ ...f, dhanOption: e.target.value, accessToken: '' }))} className="accent-brand-purple" />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Client ID</label>
                  <input value={form.dhanClientId} onChange={(e) => setForm((f) => ({ ...f, dhanClientId: e.target.value }))} placeholder="Dhan Client ID" className={inputCls} />
                  {formErrors.dhanClientId && <p className="text-danger text-xs mt-1">{formErrors.dhanClientId}</p>}
                </div>
                {form.dhanOption === 'accessToken' && (
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Access Token</label>
                    <input type="password" value={form.accessToken} onChange={(e) => setForm((f) => ({ ...f, accessToken: e.target.value }))} placeholder="Paste access token" className={inputCls} />
                    <p className="text-[10px] text-warning mt-1">Tokens expire daily at 6 AM.</p>
                    {formErrors.accessToken && <p className="text-danger text-xs mt-1">{formErrors.accessToken}</p>}
                  </div>
                )}
              </>
            );
            if (isTotp) return (
              <>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Client ID</label>
                  <input value={form.clientId} onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))} placeholder="Angel One Client Code" className={inputCls} />
                  {formErrors.clientId && <p className="text-danger text-xs mt-1">{formErrors.clientId}</p>}
                </div>
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-[11px] uppercase tracking-wider text-muted-foreground mb-1">API Secret Key</label>
                  <input type="password" value={form.apiSecret} onChange={(e) => setForm((f) => ({ ...f, apiSecret: e.target.value }))} placeholder="Angel One API Secret Key" className={inputCls} />
                  {formErrors.apiSecret && <p className="text-danger text-xs mt-1">{formErrors.apiSecret}</p>}
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex items-end">
                  <p className="text-xs text-muted-foreground">After adding, enter the 6-digit TOTP to activate the Angel One session.</p>
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

        {form.broker && (
          <div className="mb-4 rounded-2xl border border-border/60 bg-black/5 p-4 dark:bg-white/5">
            <div className="mb-3 flex items-center gap-2">
              <Server className="h-4 w-4 text-brand-purple" />
              <div>
                <p className="text-sm font-semibold">Advanced: Proxy Routing</p>
                <p className="text-xs text-muted-foreground">
                  Optional. Use this only when the broker must route requests through a whitelisted IP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Proxy Host</label>
                <input
                  value={form.proxyHost}
                  onChange={(e) => setForm((prev) => ({ ...prev, proxyHost: e.target.value }))}
                  placeholder="127.0.0.1"
                  className={inputCls}
                />
                {formErrors.proxyHost && <p className="text-danger text-xs mt-1">{formErrors.proxyHost}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Proxy Port</label>
                <input
                  value={form.proxyPort}
                  onChange={(e) => setForm((prev) => ({ ...prev, proxyPort: e.target.value.replace(/[^\d]/g, '') }))}
                  placeholder="8889"
                  inputMode="numeric"
                  className={inputCls}
                />
                {formErrors.proxyPort && <p className="text-danger text-xs mt-1">{formErrors.proxyPort}</p>}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Proxy Username</label>
                <input
                  value={form.proxyUser}
                  onChange={(e) => setForm((prev) => ({ ...prev, proxyUser: e.target.value }))}
                  placeholder="Optional"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] uppercase tracking-wider text-muted-foreground">Proxy Password</label>
                <input
                  type="password"
                  value={form.proxyPass}
                  onChange={(e) => setForm((prev) => ({ ...prev, proxyPass: e.target.value }))}
                  placeholder="Optional"
                  className={inputCls}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Leave all fields empty to use a direct broker connection.</span>
              {showWhitelistHint && (
                <span className="text-amber-600 dark:text-amber-400">
                  {selectedBrokerMeta?.name || 'This broker'} commonly requires IP whitelisting. Match the broker dashboard whitelist to your proxy exit IP.
                </span>
              )}
            </div>
          </div>
        )}

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
          <label htmlFor="usermgmt-search" className="sr-only">Search accounts</label>
          <input id="usermgmt-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts..."
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
                  {['#', 'Account', 'Broker', 'Client ID', 'Routing', 'Balance', 'Positions', 'Signal', 'Latency', 'Status', 'Last Synced', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((acc, idx) => {
                  const id = acc.accountId || acc.id;
                  const active = acc.sessionActive || String(acc.status).toUpperCase() === 'ACTIVE';
                  const syncedAt = formatLinkedAt(acc.linkedAt);
                  const metrics = liveMetrics[id] || {};
                  const positions = Number(metrics.positions ?? acc.positions ?? 0);
                  const quality = String(metrics.quality || 'unknown');
                  const latencyMs = metrics.latencyMs;
                  const proxyMeta = getProxyStatusMeta(acc);
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
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{acc.broker || '—'}</td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{acc.clientId || acc.userId || '—'}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <div className="space-y-1">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 font-medium ${proxyMeta.badgeClass}`}>
                            {proxyMeta.label}
                          </span>
                          {acc.proxyConfigured && (
                            <p className="text-[11px] text-muted-foreground">Edit from account details</p>
                          )}
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
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{positions}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <span className="uppercase">{quality}</span>
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {latencyMs != null ? `${latencyMs}ms` : '—'}
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
                          {!isChildScope && (
                            <ActionBtn title="View Details" color="blue" onClick={() => navigate(`${detailBasePath}/${id}`)}>
                              <Eye className="w-3.5 h-3.5" />
                            </ActionBtn>
                          )}
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
          {loginConfig?.requiresIpWhitelist && loginConfig?.platformServerIp && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
              Whitelist <span className="font-semibold">{loginConfig.platformServerIp}</span> in your broker dashboard before reconnecting.
            </div>
          )}
          {loginOptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {loginOptions.map((option) => {
                const method = normalizeLoginMethod(option.method);
                const active = method === selectedLoginMethod;
                return (
                  <button
                    key={option.method}
                    type="button"
                    onClick={() => {
                      setActiveLoginMethod(method);
                      setOauthRedirectUrl('');
                      if (method !== 'oauth') {
                        setOauthOpened(false);
                      }
                    }}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'border-brand-purple bg-brand-purple/15 text-foreground' : 'border-border bg-black/5 text-muted-foreground dark:bg-white/5'}`}
                  >
                    {getLoginMethodLabel(option.method)}
                  </button>
                );
              })}
            </div>
          )}
          {loginLoading && !loginConfig ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
            </div>
          ) : loginOptions.length > 0 ? (
            <div className="space-y-3">
              {selectedLoginOption?.description && (
                <p className="text-xs text-muted-foreground">{selectedLoginOption.description}</p>
              )}
              {selectedLoginMethod === 'accesstoken' ? (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Access Token</label>
                  <input
                    value={reconnectAccessToken}
                    onChange={(e) => setReconnectAccessToken(e.target.value)}
                    placeholder="Paste Groww access token"
                    className={inputCls}
                    type="password"
                  />
                </div>
              ) : selectedLoginMethod === 'apikeywithtotp' || selectedLoginMethod === 'totp' ? (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">TOTP Code</label>
                  <input
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit TOTP"
                    inputMode="numeric"
                    maxLength={6}
                    className={inputCls}
                  />
                  {!loginConfig?.hasStoredApiKey && selectedLoginMethod === 'apikeywithtotp' && (
                    <p className="mt-1 text-[11px] text-warning">
                      Your API key is already stored for this account. Only the TOTP code is required here.
                    </p>
                  )}
                </div>
              ) : (
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
              )}
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
              {loginLoading ? 'Verifying...' : (selectedLoginMethod === 'accesstoken' ? 'Connect' : isOAuthModal ? 'Confirm' : 'Submit')}
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
