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

const baseBrokerFields = [
  { key: 'nickname', label: 'Nickname', placeholder: 'Enter Nickname' },
  { key: 'clientId', label: 'Client ID', placeholder: 'Enter Client ID' },
  { key: 'apiKey', label: 'API Key', placeholder: 'Enter API Key' },
  { key: 'apiSecret', label: 'API Secret', placeholder: 'Enter API Secret' },
];

const normalizeBrokerKey = (value) => String(value || '').trim().toLowerCase();

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
  const [form, setForm] = useState({
    broker: '',
    nickname: '',
    clientId: '',
    mobile: '',
    apiKey: '',
    apiSecret: '',
    accessToken: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [loginTarget, setLoginTarget] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [brokerFields, setBrokerFields] = useState(baseBrokerFields);
  const [loginConfig, setLoginConfig] = useState(null);
  const [oauthRedirectUrl, setOauthRedirectUrl] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [oauthOpened, setOauthOpened] = useState(false);
  const [oauthPopupRef, setOauthPopupRef] = useState(null);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (error) {
      addToast(error, 'error');
    }
  }, [addToast, error]);

  const brokerOptions = useMemo(
    () =>
      brokers.map((b) => ({
        value: normalizeBrokerKey(b.brokerId || b.id || b.name),
        label: b.name || b.brokerName || b.brokerId || b.id,
      })),
    [brokers]
  );

  const brokerMetaMap = useMemo(
    () =>
      brokers.reduce((acc, broker) => {
        const keys = [
          normalizeBrokerKey(broker.brokerId),
          normalizeBrokerKey(broker.id),
          normalizeBrokerKey(broker.name),
          normalizeBrokerKey(broker.brokerName),
        ].filter(Boolean);
        keys.forEach((key) => {
          acc[key] = broker;
        });
        return acc;
      }, {}),
    [brokers]
  );

  const filtered = accounts.filter((a) =>
    !search || `${a.broker} ${a.userId} ${a.nickname}`.toLowerCase().includes(search.toLowerCase())
  );

  const validate = () => {
    const e = {};
    if (!form.broker) e.broker = 'Required';
    if (!form.nickname.trim()) e.nickname = 'Required';
    if (!(form.clientId || form.mobile).trim()) e.clientId = 'Required';
    if (!form.apiKey.trim()) e.apiKey = 'Required';
    if (!form.apiSecret.trim()) e.apiSecret = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleBrokerChange = (value) => {
    setForm((prev) => ({ ...prev, broker: normalizeBrokerKey(value) }));
    setBrokerFields(baseBrokerFields);
  };

  const handleAdd = async () => {
    if (!validate()) return;
    try {
      const selectedBrokerMeta = brokerMetaMap[normalizeBrokerKey(form.broker)];
      const normalizedBrokerId = normalizeBrokerKey(selectedBrokerMeta?.brokerId || form.broker);
      const newAcc = await brokerService.addAccount({
        brokerId: normalizedBrokerId,
        clientId: form.clientId || form.mobile,
        apiKey: form.apiKey || '',
        apiSecret: form.apiSecret || '',
        accessToken: form.accessToken || '',
        accountNickname: form.nickname,
      });
      setForm({ broker: '', nickname: '', clientId: '', mobile: '', apiKey: '', apiSecret: '', accessToken: '' });
      setFormErrors({});
      setBrokerFields(baseBrokerFields);
      addToast('Account added — please login to activate', 'success');
      refetch();
      await openLoginModal(newAcc.accountId, null, selectedBrokerMeta);
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleClear = () => {
    setForm({ broker: '', nickname: '', clientId: '', mobile: '', apiKey: '', apiSecret: '', accessToken: '' });
    setFormErrors({});
    setBrokerFields(baseBrokerFields);
  };

  const parseCodeFromRedirectUrl = (value, loginField) => {
    if (!value) return '';
    const aliases = {
      requestToken: ['request_token', 'requestToken'],
      authCode: ['auth_code', 'authCode'],
      code: ['code'],
    };
    const candidates = [loginField, ...(aliases[loginField] || [])].filter(Boolean);
    const readParams = (params) => {
      for (const candidate of candidates) {
        const found = params.get(candidate);
        if (found) return found;
      }
      return '';
    };

    try {
      const parsed = new URL(value.trim());
      return readParams(parsed.searchParams);
    } catch {
      try {
        const parsed = new URL(value.trim(), window.location.origin);
        return readParams(parsed.searchParams);
      } catch {
        const queryIndex = value.indexOf('?');
        const query = queryIndex >= 0 ? value.slice(queryIndex + 1) : value;
        const params = new URLSearchParams(query);
        return readParams(params);
      }
    }
  };

  const closeLoginModal = () => {
    setLoginModalOpen(false);
    setLoginConfig(null);
    setTotpCode('');
    setOauthRedirectUrl('');
    setOauthOpened(false);
    setOauthPopupRef(null);
  };

  const openOauthWindow = (oauthUrl, popupRef = null) => {
    if (!oauthUrl) return;
    const popup = popupRef || window.open('about:blank', '_blank');
    if (!popup) {
      addToast('Popup blocked. Please allow popups and try again.', 'error');
      return;
    }
    popup.location.href = oauthUrl;
    setOauthPopupRef(popup);
    setOauthOpened(true);
  };

  const openLoginModal = async (accountId, popupRef = null, brokerHint = null) => {
    setLoginTarget(accountId);
    setTotpCode('');
    setOauthRedirectUrl('');
    setLoginLoading(true);

    try {
      const oauthData = await brokerService.getOAuthUrl(accountId);
      const accountMeta = accounts.find((item) => (item.accountId || item.id) === accountId);
      const localBrokerMeta =
        brokerHint ||
        brokerMetaMap[normalizeBrokerKey(accountMeta?.brokerId)] ||
        brokerMetaMap[normalizeBrokerKey(accountMeta?.broker)] ||
        brokerMetaMap[normalizeBrokerKey(accountMeta?.brokerName)];
      const resolvedLoginMethod =
        oauthData?.loginMethod ||
        localBrokerMeta?.loginMethod ||
        'secret';
      const resolvedLoginField =
        oauthData?.loginField ||
        localBrokerMeta?.loginField ||
        'totpCode';
      setLoginConfig({
        broker: oauthData?.broker || localBrokerMeta?.name || accountMeta?.brokerName || accountMeta?.broker || '',
        loginMethod: resolvedLoginMethod,
        loginField: resolvedLoginField,
        oauthUrl: oauthData?.oauthUrl || '',
        message: oauthData?.message || '',
      });
      setLoginModalOpen(true);
      if (String(resolvedLoginMethod).toLowerCase() === 'oauth' && oauthData?.oauthUrl) {
        openOauthWindow(oauthData.oauthUrl, popupRef);
      }
    } catch (error) {
      if (popupRef && !popupRef.closed) {
        popupRef.close();
      }
      addToast(error.message, 'error');
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

    const sanitizedCode = String(totpCode || '').replace(/\D/g, '').slice(0, 6);

    try {
      if (loginConfig.loginMethod === 'secret') {
        const payload = sanitizedCode ? { totpCode: sanitizedCode } : {};
        await brokerService.loginAccount(loginTarget, payload);
      } else {
        const extractedCode = parseCodeFromRedirectUrl(oauthRedirectUrl, loginConfig.loginField);
        if (!extractedCode) {
          addToast(`Unable to find ${loginConfig.loginField} in the pasted redirect URL`, 'error');
          return;
        }
        await brokerService.loginAccount(loginTarget, { [loginConfig.loginField]: extractedCode });
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

    const popup = window.open('about:blank', '_blank');
    openLoginModal(id, popup);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      <GlassCard title={connectTitle}>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Select Broker</label>
            <div className="relative">
              <select
                value={form.broker}
                onFocus={load}
                onChange={(e) => handleBrokerChange(e.target.value)}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple appearance-none"
              >
                <option value="" className="bg-background">Select broker</option>
                {brokerOptions.map((b) => (
                  <option key={b.value} value={b.value} className="bg-background">{b.label}</option>
                ))}
              </select>
              {formErrors.broker && <p className="text-danger text-xs mt-1">{formErrors.broker}</p>}
            </div>
          </div>

          {brokerFields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs text-muted-foreground mb-1">{field.label}</label>
              <input
                value={form[field.key] || ''}
                onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
              />
              {formErrors[field.key] && <p className="text-danger text-xs mt-1">{formErrors[field.key]}</p>}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleClear} className="px-5 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">
            Clear
          </button>
          <button onClick={handleAdd} className="px-5 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors">
            Add
          </button>
        </div>
      </GlassCard>

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
          <div className="p-4">
            <SkeletonLoader type="table" rows={5} columns={9} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  {['Id', 'Broker - User Id - User', 'Margin', 'P&L', 'Positions', 'Refresh', 'Demat', 'Connection', 'Action'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
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
                        <span className="text-sm font-medium">
                          {acc.broker} - {acc.userId} - {acc.nickname}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatCurrency(acc.margin)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${acc.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                          {acc.pnl >= 0 ? '+' : ''}{formatCurrency(acc.pnl)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{acc.positions}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRefresh(acc)}
                          title="Refresh"
                          className="w-8 h-8 bg-brand-purple/80 hover:bg-brand-purple rounded-lg flex items-center justify-center transition-colors"
                        >
                          <RefreshCw className={`w-4 h-4 text-white ${refreshing[id] ? 'animate-spin' : ''}`} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`${detailBasePath}/${id}`)}
                          title="View Demat"
                          className="w-8 h-8 bg-brand-blue/80 hover:bg-brand-blue rounded-lg flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-4 h-4 text-foreground" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleConnect(acc)}
                            title={active ? 'Disconnect' : 'Connect'}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${active ? 'bg-warning/80 hover:bg-warning' : 'bg-success/80 hover:bg-success'}`}
                          >
                            {active ? <Link2Off className="w-4 h-4 text-foreground" /> : <Link className="w-4 h-4 text-foreground" />}
                          </button>
                          <button
                            title="Re-login"
                            onClick={() => {
                              const popup = window.open('about:blank', '_blank');
                              openLoginModal(id, popup);
                            }}
                            className="w-8 h-8 bg-teal-500/80 hover:bg-teal-500 rounded-lg flex items-center justify-center transition-colors"
                          >
                            <RefreshCw className="w-4 h-4 text-foreground" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { setSelectedAcc(acc); setDeleteModal(true); }}
                          title="Delete"
                          className="w-8 h-8 bg-danger/80 hover:bg-danger rounded-lg flex items-center justify-center transition-colors"
                        >
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

      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account" size="sm">
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">Delete <span className="font-semibold text-foreground">{selectedAcc?.nickname}</span>? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button onClick={confirmDelete} className="flex-1 py-2 bg-danger hover:bg-danger/90 text-foreground rounded-lg text-sm font-medium transition-colors">Delete</button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={loginModalOpen}
        onClose={closeLoginModal}
        title="Broker Login"
        size="md"
      >
        <div className="space-y-4">
          {loginConfig?.message && (
            <p className="text-xs text-muted-foreground">{loginConfig.message}</p>
          )}

          {loginConfig?.loginMethod === 'secret' ? (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">TOTP Code (Optional)</label>
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter TOTP if required"
                inputMode="numeric"
                maxLength={6}
                className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <button
                onClick={() => openOauthWindow(loginConfig?.oauthUrl, oauthPopupRef)}
                className="w-full py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors"
              >
                {oauthOpened ? 'Open Broker Login Again' : `Login with ${loginConfig?.broker || 'Broker'}`}
              </button>
              <p className="text-xs text-muted-foreground">
                {oauthOpened
                  ? 'Complete login in the opened tab, then paste the full redirect URL below and click Confirm.'
                  : 'Click the button above to open the broker login, then paste the full redirect URL below and click Confirm.'}
              </p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Redirect URL</label>
                <input
                  value={oauthRedirectUrl}
                  onChange={(e) => setOauthRedirectUrl(e.target.value)}
                  placeholder="Paste the redirect URL after login"
                  className="w-full bg-black/5 dark:bg-white/5 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-purple placeholder:text-muted-foreground/40"
                />
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={closeLoginModal} className="flex-1 py-2 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10 rounded-lg text-sm transition-colors">Cancel</button>
            <button
              onClick={handleBrokerLogin}
              disabled={loginLoading}
              className="flex-1 py-2 bg-brand-purple hover:bg-brand-purple/90 text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {loginLoading ? 'Submitting...' : loginConfig?.loginMethod === 'oauth' ? 'Confirm' : 'Submit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
