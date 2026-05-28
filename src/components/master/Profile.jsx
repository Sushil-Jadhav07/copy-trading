import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Fingerprint, MessageCircle, Phone, Shield, User, Users, RefreshCw, TrendingUp, AlertCircle, Eye, EyeOff } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/lib/auth';
import { userProfileService } from '@/lib/userProfile';
import TelegramSettings from '@/components/shared/TelegramSettings';

const Profile = () => {
  const { addToast } = useToast();
  const { user, refreshUser, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);
  const [settings, setSettings] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    telegramChatId: '',
  });
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [twoFactorSetup, setTwoFactorSetup] = useState({
    channel: 'EMAIL',
    otpSent: false,
  });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [brokerProfiles, setBrokerProfiles] = useState([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);
  const [refreshingBroker, setRefreshingBroker] = useState({});
  const [disableTwoFactorForm, setDisableTwoFactorForm] = useState({
    password: '',
    otp: '',
  });
  const [twoFactorOptions, setTwoFactorOptions] = useState({ email: true, phone: false });

  const profileSummary = useMemo(() => {
    const brokerAccounts = Array.isArray(user?.brokerAccounts) ? user.brokerAccounts : [];

    return [
      {
        label: 'Account Role',
        value: user?.role || 'N/A',
        accent: 'from-emerald-500/20 to-emerald-500/5',
        textColor: 'text-emerald-400',
        icon: User,
      },
      {
        label: 'Account Status',
        value: user?.status || 'N/A',
        accent: 'from-cyan-500/20 to-cyan-500/5',
        textColor: 'text-cyan-400',
        icon: Shield,
      },
      {
        label: 'Broker Accounts',
        value: String(brokerAccounts.length),
        accent: 'from-amber-500/20 to-amber-500/5',
        textColor: 'text-amber-400',
        icon: Users,
      },
      {
        label: 'Created',
        value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A',
        accent: 'from-fuchsia-500/20 to-fuchsia-500/5',
        textColor: 'text-fuchsia-400',
        icon: CalendarDays,
      },
    ];
  }, [user]);

  useEffect(() => {
    const nameParts = (user?.name || '').split(' ').filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 2 ? nameParts[nameParts.length - 1] : nameParts[1] || '';
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

    setSettings({
      firstName,
      middleName,
      lastName,
      email: user?.email || '',
      phone: user?.phone || '',
      telegramChatId: user?.telegramChatId || '',
    });
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const hydrateProfile = async () => {
      setLoadingProfile(true);

      try {
        const latestUser = await refreshUser();

        if (!isMounted) {
          return;
        }

        const nameParts = (latestUser?.name || '').split(' ').filter(Boolean);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.length > 2 ? nameParts[nameParts.length - 1] : nameParts[1] || '';
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';

        setSettings({
          firstName,
          middleName,
          lastName,
          email: latestUser?.email || '',
          phone: latestUser?.phone || '',
          telegramChatId: latestUser?.telegramChatId || '',
        });
      } catch (error) {
        if (isMounted) {
          addToast(error.message || 'Unable to load profile', 'error');
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false);
        }
      }
    };

    hydrateProfile();

    return () => {
      isMounted = false;
    };
  }, [addToast, refreshUser]);

  const handleProfileSave = async () => {
    setSavingProfile(true);

    try {
      const fullName = [settings.firstName, settings.middleName, settings.lastName]
        .filter(Boolean)
        .join(' ');
      const telegramChatId = settings.telegramChatId.trim();

      // Try new profile endpoint first, fall back to auth endpoint
      try {
        await userProfileService.updateProfile({
          displayName: fullName,
          telegramChatId,
        });
        await refreshUser();
      } catch {
        await updateProfile({
          name: fullName,
          phone: settings.phone,
          telegramChatId,
        });
      }
      addToast('Profile saved successfully', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to save profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadBrokerProfiles = async () => {
    setLoadingBrokers(true);
    try {
      const profile = await userProfileService.getProfile();
      setBrokerProfiles(profile.brokerAccounts || []);
    } catch (e) {
      // Fall back to user.brokerAccounts if available
      setBrokerProfiles(Array.isArray(user?.brokerAccounts) ? user.brokerAccounts : []);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const handleRefreshBroker = async (accountId) => {
    setRefreshingBroker((prev) => ({ ...prev, [accountId]: true }));
    try {
      const updated = await userProfileService.refreshBrokerProfile(accountId);
      setBrokerProfiles((prev) => prev.map((acc) =>
        acc.accountId === accountId ? { ...acc, ...updated } : acc
      ));
      addToast('Broker profile refreshed', 'success');
    } catch (e) {
      addToast(e.message || 'Failed to refresh broker profile', 'error');
    } finally {
      setRefreshingBroker((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  const handlePasswordChange = async () => {
    if (security.newPassword !== security.confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }

    setSavingPassword(true);

    try {
      await changePassword(security);
      setSecurity({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      addToast('Password updated successfully', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to update password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEnableTwoFactor = async () => {
    setSavingTwoFactor(true);

    try {
      await authService.enableTwoFactor(twoFactorSetup.channel || 'EMAIL');
      setTwoFactorSetup({
        channel: twoFactorSetup.channel || 'EMAIL',
        otpSent: true,
      });
      addToast(`OTP sent to your ${String(twoFactorSetup.channel || 'EMAIL').toLowerCase()}`, 'info');
    } catch (error) {
      addToast(error.message || 'Unable to enable two-factor auth', 'error');
    } finally {
      setSavingTwoFactor(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    setSavingTwoFactor(true);

    try {
      await authService.confirmTwoFactorEnable(twoFactorCode);
      await refreshUser();
      setTwoFactorCode('');
      setTwoFactorSetup({
        channel: twoFactorSetup.channel || 'EMAIL',
        otpSent: false,
      });
      addToast('Two-factor authentication enabled', 'success');
    } catch (error) {
      addToast(error.message || 'Invalid verification code', 'error');
    } finally {
      setSavingTwoFactor(false);
    }
  };

  const handleSendDisableOtp = async () => {
    const email = user?.email;
    if (!email) {
      addToast('Add an email to your profile first', 'error');
      return;
    }
    setSavingTwoFactor(true);
    try {
      await authService.sendLoginOtp(email);
      addToast('Verification code sent to your email', 'info');
    } catch (error) {
      addToast(error.message || 'Unable to send OTP', 'error');
    } finally {
      setSavingTwoFactor(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    setSavingTwoFactor(true);

    try {
      await authService.disableTwoFactor(disableTwoFactorForm);
      await refreshUser();
      setTwoFactorCode('');
      setTwoFactorSetup({
        channel: 'EMAIL',
        otpSent: false,
      });
      setDisableTwoFactorForm({
        password: '',
        otp: '',
      });
      addToast('Two-factor authentication disabled', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to disable two-factor auth', 'error');
    } finally {
      setSavingTwoFactor(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'telegram', label: 'Telegram', icon: MessageCircle },
    { id: 'brokers', label: 'Broker Accounts', icon: Users },
  ];

  useEffect(() => {
    let mounted = true;
    authService.getTwoFactorOptions()
      .then((opts) => {
        if (!mounted) return;
        const channels = Array.isArray(opts?.channels) ? opts.channels : [];
        const emailCh = channels.find((c) => String(c?.id || '').toUpperCase() === 'EMAIL');
        const phoneCh = channels.find((c) => String(c?.id || '').toUpperCase() === 'PHONE');
        const emailAvailable = emailCh?.available ?? opts?.EMAIL?.available ?? opts?.email?.available ?? true;
        const phoneAvailable = phoneCh?.available ?? opts?.PHONE?.available ?? opts?.phone?.available ?? false;
        setTwoFactorOptions({ email: Boolean(emailAvailable), phone: Boolean(phoneAvailable) });
        if (!emailAvailable && phoneAvailable) {
          setTwoFactorSetup((prev) => ({ ...prev, channel: 'PHONE' }));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'brokers' && brokerProfiles.length === 0) loadBrokerProfiles();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-purple text-white'
                : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:bg-white/10'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {profileSummary.map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border border-emerald-500/15 bg-gradient-to-br ${item.accent} p-4 shadow-[0_0_0_1px_rgba(16,185,129,0.04)]`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                <p className={`mt-3 text-xl font-semibold ${item.textColor}`}>{item.value}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-2">
                <item.icon className={`h-4 w-4 ${item.textColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {Array.isArray(user?.brokerAccounts) && user.brokerAccounts.length > 0 && (
        <GlassCard>
          <p className="mb-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Broker Sessions</p>
          <div className="space-y-3">
            {user.brokerAccounts.map((account) => {
              const tokenExpiresAt = account.tokenExpiresAt || account.expiresAt;
              const expiresInHours = tokenExpiresAt
                ? Math.round((new Date(tokenExpiresAt).getTime() - Date.now()) / 3600000)
                : null;
              const isExpired = expiresInHours !== null && expiresInHours < 0;
              const isExpiringSoon = expiresInHours !== null && expiresInHours >= 0 && expiresInHours < 24;
              const sessionActive = account.sessionActive ?? account.isActive ?? false;

              return (
                <div
                  key={account.accountId || account.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/50 bg-black/5 dark:bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ${
                      isExpired ? 'bg-rose-500/10 text-rose-500' :
                      isExpiringSoon ? 'bg-amber-500/10 text-amber-500' :
                      sessionActive ? 'bg-emerald-500/10 text-emerald-500' :
                      'bg-muted/10 text-muted-foreground'
                    }`}>
                      {String(account.broker || account.brokerName || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{account.broker || account.brokerName || account.brokerId}</p>
                      <p className="text-xs text-muted-foreground">{account.clientId || account.nickname || account.accountId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isExpired ? (
                      <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-rose-500">
                        Session Expired
                      </span>
                    ) : isExpiringSoon ? (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-500">
                        Expires in {expiresInHours}h
                      </span>
                    ) : sessionActive ? (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-500">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Not Connected
                      </span>
                    )}
                    {(isExpired || isExpiringSoon || !sessionActive) && (
                      <a
                        href="/platform/dematconnected"
                        className="rounded-xl bg-brand-purple px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:opacity-90 transition-opacity"
                      >
                        Re-Login
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {(activeTab === 'profile' || activeTab === 'security') && (
        <GlassCard>
          {activeTab === 'profile' && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-500/15 bg-black/10 p-4 sm:p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Account Details</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This section shows your latest account details.
                    </p>
                  </div>
                  {loadingProfile && (
                    <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400">
                      Syncing...
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Full Name</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={settings.firstName}
                          onChange={(e) => setSettings({ ...settings, firstName: e.target.value })}
                          placeholder="First"
                          required
                          className="w-full pl-8 pr-2 py-2.5 rounded-xl border border-black/10 bg-black/5 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                          disabled={loadingProfile}
                        />
                      </div>
                      <input
                        type="text"
                        value={settings.middleName}
                        onChange={(e) => setSettings({ ...settings, middleName: e.target.value })}
                        placeholder="Middle"
                        className="w-full px-3 py-2.5 rounded-xl border border-black/10 bg-black/5 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                        disabled={loadingProfile}
                      />
                      <input
                        type="text"
                        value={settings.lastName}
                        onChange={(e) => setSettings({ ...settings, lastName: e.target.value })}
                        placeholder="Last"
                        required
                        className="w-full px-3 py-2.5 rounded-xl border border-black/10 bg-black/5 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                        disabled={loadingProfile}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Middle name is optional</p>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Email</label>
                    <input
                      type="email"
                      value={settings.email}
                      className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 text-muted-foreground focus:outline-none dark:border-white/10 dark:bg-white/5"
                      disabled
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Phone</label>
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                      disabled={loadingProfile}
                    />
                  </div>
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                    <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400">Telegram linking is managed in the Telegram tab.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Use Connect Telegram there to avoid incorrect chat IDs.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/15 bg-black/10 p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-semibold">Update Profile</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Save your updated name and phone details here.
                  </p>
                </div>

                <button
                  onClick={handleProfileSave}
                  disabled={savingProfile || loadingProfile}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 font-medium text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProfile ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/15 bg-black/10 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2">
                    <Fingerprint className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Identity</h3>
                    <p className="text-sm text-muted-foreground">Live values returned for your account.</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">User ID</p>
                    <p className="mt-2 break-all font-medium text-foreground">{user?.id ?? user?.userId ?? 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Email</p>
                    <p className="mt-2 font-medium text-foreground">{user?.email || 'N/A'}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Phone</p>
                    <p className="mt-2 font-medium text-foreground">{user?.phone || 'Not added yet'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-cyan-500/15 bg-black/10 p-4 sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-2">
                    <Phone className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">Account Snapshot</h3>
                    <p className="text-sm text-muted-foreground">Quick status summary from the backend.</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-muted-foreground">Two-Factor Auth</span>
                    <span className={user?.twoFactorEnabled ? 'font-medium text-emerald-400' : 'font-medium text-amber-400'}>
                      {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-muted-foreground">Telegram</span>
                    <span className={user?.telegramChatId ? 'font-medium text-emerald-400' : 'font-medium text-amber-400'}>
                      {user?.telegramChatId ? 'Linked' : 'Not Linked'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-medium text-foreground">{user?.role || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium text-foreground">{user?.status || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-500/15 bg-black/10 p-4 sm:p-5">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Change Password</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use this form to update your password.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      value={security.currentPassword}
                      onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 pr-11 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => ({ ...prev, current: !prev.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword.current ? 'Hide current password' : 'Show current password'}
                    >
                      {showPassword.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.next ? 'text' : 'password'}
                      value={security.newPassword}
                      onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 pr-11 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => ({ ...prev, next: !prev.next }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword.next ? 'Hide new password' : 'Show new password'}
                    >
                      {showPassword.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={security.confirmPassword}
                      onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 pr-11 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => ({ ...prev, confirm: !prev.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword.confirm ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <button
                  onClick={handlePasswordChange}
                  disabled={
                    savingPassword ||
                    !security.currentPassword ||
                    !security.newPassword ||
                    !security.confirmPassword
                  }
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 font-medium text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingPassword ? 'Updating Password...' : 'Update Password'}
                </button>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-cyan-500/15 bg-black/10 p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
                <p className="text-sm text-muted-foreground">
                  Add an extra verification step to protect your account.
                </p>
              </div>

              <div className="rounded-xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm">
                  Status:{' '}
                  <span className={user?.twoFactorEnabled ? 'text-emerald-500 font-medium' : 'text-amber-500 font-medium'}>
                    {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </p>
              </div>

              {!user?.twoFactorEnabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">2FA Channel</label>
                    <select
                      value={twoFactorSetup.channel}
                      onChange={(e) => setTwoFactorSetup((prev) => ({ ...prev, channel: e.target.value }))}
                      className="w-full px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-brand-purple/50"
                    >
                      {twoFactorOptions.email && <option value="EMAIL">Email OTP</option>}
                      {twoFactorOptions.phone && <option value="PHONE">Phone OTP</option>}
                    </select>
                  </div>

                  <button
                    onClick={handleEnableTwoFactor}
                    disabled={savingTwoFactor}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-2.5 font-medium text-white shadow-[0_10px_30px_rgba(6,182,212,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTwoFactor ? 'Preparing...' : 'Enable Two-Factor Auth'}
                  </button>

                  {twoFactorSetup.otpSent && (
                    <div className="space-y-4 rounded-xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-sm text-muted-foreground">
                        Enter the 6-digit code sent to your {twoFactorSetup.channel === 'PHONE' ? 'phone' : 'email'}.
                      </p>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Verification Code</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="Enter 6-digit code"
                          className="w-full px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-brand-purple/50"
                        />
                      </div>
                      <button
                        onClick={handleVerifyTwoFactor}
                        disabled={savingTwoFactor || twoFactorCode.length !== 6}
                        className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2.5 font-medium text-white shadow-[0_10px_30px_rgba(16,185,129,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingTwoFactor ? 'Verifying...' : 'Verify and Enable'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {user?.twoFactorEnabled && (
                <div className="space-y-4 rounded-xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Password</label>
                    <input
                      type="password"
                      value={disableTwoFactorForm.password}
                      onChange={(e) => setDisableTwoFactorForm({ ...disableTwoFactorForm, password: e.target.value })}
                      placeholder="Enter your password"
                      className="w-full px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-brand-purple/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={disableTwoFactorForm.otp}
                      onChange={(e) => setDisableTwoFactorForm({ ...disableTwoFactorForm, otp: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg focus:outline-none focus:border-brand-purple/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendDisableOtp}
                    disabled={savingTwoFactor}
                    className="rounded-xl border border-black/10 px-6 py-2.5 text-sm font-medium dark:border-white/10"
                  >
                    {savingTwoFactor ? 'Sending...' : 'Send OTP to email'}
                  </button>
                  <button
                    onClick={handleDisableTwoFactor}
                    disabled={savingTwoFactor || disableTwoFactorForm.otp.length !== 6 || !disableTwoFactorForm.password}
                    className="rounded-xl bg-red-500 px-6 py-2.5 font-medium text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTwoFactor ? 'Disabling...' : 'Disable Two-Factor Auth'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        </GlassCard>
      )}

      {/* Telegram Tab */}
      {activeTab === 'telegram' && (
        <TelegramSettings />
      )}

      {/* Broker Accounts Tab */}
      {activeTab === 'brokers' && (
        <GlassCard>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-black tracking-tight">Broker Accounts</h2>
              <p className="text-xs text-muted-foreground mt-1">Live margin, session status, and positions from each linked broker</p>
            </div>
            <button
              onClick={loadBrokerProfiles}
              disabled={loadingBrokers}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-black/5 dark:bg-white/5 text-xs font-bold uppercase tracking-wider hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingBrokers ? 'animate-spin' : ''}`} />
              Refresh All
            </button>
          </div>

          {brokerProfiles.length === 0 && !loadingBrokers ? (
            <div className="py-12 text-center">
              <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm font-bold uppercase">No Broker Accounts</p>
              <p className="text-xs text-muted-foreground mt-1">Link a broker from the Demat Accounts section.</p>
              <button
                onClick={loadBrokerProfiles}
                className="mt-4 text-xs font-bold text-brand-purple hover:underline"
              >
                Load accounts
              </button>
            </div>
          ) : loadingBrokers ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-28 rounded-2xl bg-black/5 dark:bg-white/5 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {brokerProfiles.map((acc) => {
                const statusColor = acc.fundsUtilizationStatus === 'RED'
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : acc.fundsUtilizationStatus === 'YELLOW'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-emerald-500/20 bg-emerald-500/5';
                const marginColor = acc.fundsUtilizationStatus === 'RED'
                  ? 'text-rose-500 bg-rose-500'
                  : acc.fundsUtilizationStatus === 'YELLOW'
                  ? 'text-amber-500 bg-amber-500'
                  : 'text-emerald-500 bg-emerald-500';

                return (
                  <div key={acc.accountId} className={`rounded-2xl border p-4 ${statusColor}`}>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center font-black text-sm">
                          {(acc.broker || '?')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black">{acc.broker || '—'}</p>
                          <p className="text-xs text-muted-foreground">{acc.clientId || acc.fullName || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${
                          acc.sessionActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {acc.sessionActive ? 'Active' : 'Expired'}
                        </span>
                        {acc.isTokenExpired && (
                          <span className="flex items-center gap-1 text-xs text-rose-500 font-bold">
                            <AlertCircle className="w-3.5 h-3.5" /> Token expired
                          </span>
                        )}
                        <button
                          onClick={() => handleRefreshBroker(acc.accountId)}
                          disabled={refreshingBroker[acc.accountId]}
                          className="p-1.5 rounded-lg border border-border hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                          title="Refresh"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${refreshingBroker[acc.accountId] ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Margin bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground font-bold">Margin Used</span>
                        <span className={`font-black ${marginColor.split(' ')[0]}`}>
                          {acc.marginUsedPercent?.toFixed(1) ?? 0}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${marginColor.split(' ')[1]}`}
                          style={{ width: `${Math.min(100, acc.marginUsedPercent || 0)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground font-bold">Available</p>
                        <p className="font-black">₹{(acc.marginAvailable || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold">Used</p>
                        <p className="font-black">₹{(acc.marginUsed || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground font-bold">Positions</p>
                        <p className="font-black">{acc.openPositionsCount ?? 0}</p>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        acc.fundsUtilizationStatus === 'GREEN' ? 'bg-emerald-500/10 text-emerald-500' :
                        acc.fundsUtilizationStatus === 'YELLOW' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-rose-500/10 text-rose-500'
                      }`}>
                        {acc.fundsUtilizationStatus || 'UNKNOWN'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Margin: ₹{(acc.marginAvailable || 0).toLocaleString('en-IN')} available
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(acc.marginUsedPercent ?? 0).toFixed(1)}% used
                      </span>
                    </div>

                    {acc.isTokenExpired && (
                      <p className="text-xs text-rose-500 font-bold mt-1">Session expired - re-login required</p>
                    )}

                    {acc.tokenExpiresInHours != null && !acc.isTokenExpired && (
                      <p className="mt-2 text-[10px] text-muted-foreground">
                        Session expires in {acc.tokenExpiresInHours}h
                        {acc.lastSyncedAt && ` · Synced ${new Date(acc.lastSyncedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

    </div>
  );
};

export default Profile;
