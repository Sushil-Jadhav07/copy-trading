import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Fingerprint, Phone, Shield, User, Users } from 'lucide-react';
import GlassCard from '@/components/shared/GlassCard';
import { useToast } from '@/components/shared/Toast';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/lib/auth';

const Profile = () => {
  const { addToast } = useToast();
  const { user, refreshUser, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);
  const [settings, setSettings] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [twoFactorSetup, setTwoFactorSetup] = useState({
    qrCode:
      '',
    setupKey: '',
  });
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [disableTwoFactorForm, setDisableTwoFactorForm] = useState({
    password: '',
    otp: '',
  });

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
    setSettings({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
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

        setSettings({
          name: latestUser?.name || '',
          email: latestUser?.email || '',
          phone: latestUser?.phone || '',
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
      await updateProfile({
        name: settings.name,
        phone: settings.phone,
      });
      addToast('Profile saved successfully', 'success');
    } catch (error) {
      addToast(error.message || 'Unable to save profile', 'error');
    } finally {
      setSavingProfile(false);
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
      const response = await authService.enableTwoFactor();
      setTwoFactorSetup({
        qrCode: response.qrCode || response.qr_code || response.qrCodeUrl || '',
        setupKey: response.setupKey || response.secret || response.manualEntryKey || '',
      });
      addToast('Two-factor setup started', 'info');
    } catch (error) {
      addToast(error.message || 'Unable to enable two-factor auth', 'error');
    } finally {
      setSavingTwoFactor(false);
    }
  };

  const handleVerifyTwoFactor = async () => {
    setSavingTwoFactor(true);

    try {
      await authService.verifyTwoFactor(twoFactorCode);
      await refreshUser();
      setTwoFactorCode('');
      setTwoFactorSetup({
        qrCode: '',
        setupKey: '',
      });
      addToast('Two-factor authentication enabled', 'success');
    } catch (error) {
      addToast(error.message || 'Invalid verification code', 'error');
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
        qrCode: '',
        setupKey: '',
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
  ];

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
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-purple text-foreground'
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

      <GlassCard>
        {activeTab === 'profile' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-emerald-500/15 bg-black/10 p-4 sm:p-5">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Account Details</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      This section is populated from <span className="text-emerald-400">GET /api/v1/auth/me</span>.
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
                    <input
                      type="text"
                      value={settings.name}
                      onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                      className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                      disabled={loadingProfile}
                    />
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
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/15 bg-black/10 p-4 sm:p-5">
                <div className="mb-4">
                  <h3 className="text-base font-semibold">Update Profile</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Saves through <span className="text-emerald-400">PUT /api/v1/auth/me</span> with
                    <span className="text-emerald-400"> name </span>and
                    <span className="text-emerald-400"> phone</span>.
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
                    <p className="text-sm text-muted-foreground">Live values returned by the auth API.</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">User ID</p>
                    <p className="mt-2 break-all font-medium text-foreground">{user?.userId || 'N/A'}</p>
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
                  This uses <span className="text-emerald-400">PUT /api/v1/auth/me</span> with
                  <span className="text-emerald-400"> currentPassword </span>and
                  <span className="text-emerald-400"> newPassword</span>.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Current Password</label>
                  <input
                    type="password"
                    value={security.currentPassword}
                    onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    value={security.newPassword}
                    onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    value={security.confirmPassword}
                    onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl border border-black/10 bg-black/5 px-4 py-2.5 focus:outline-none focus:border-emerald-500/50 dark:border-white/10 dark:bg-white/5"
                  />
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
                  <button
                    onClick={handleEnableTwoFactor}
                    disabled={savingTwoFactor}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 px-6 py-2.5 font-medium text-white shadow-[0_10px_30px_rgba(6,182,212,0.2)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingTwoFactor ? 'Preparing...' : 'Enable Two-Factor Auth'}
                  </button>

                  {(twoFactorSetup.qrCode || twoFactorSetup.setupKey) && (
                    <div className="space-y-4 rounded-xl border border-black/10 bg-black/5 p-4 dark:border-white/10 dark:bg-white/5">
                      {twoFactorSetup.qrCode && (
                        <div>
                          <p className="text-sm font-medium mb-2">Scan this QR code</p>
                          <img
                            src={twoFactorSetup.qrCode}
                            alt="2FA QR Code"
                            className="w-40 h-40 rounded-lg border border-black/10 dark:border-white/10 bg-white p-2"
                          />
                        </div>
                      )}

                      {twoFactorSetup.setupKey && (
                        <div>
                          <p className="text-sm font-medium mb-2">Manual setup key</p>
                          <div className="px-3 py-2 rounded-lg bg-background border border-black/10 dark:border-white/10 text-sm break-all">
                            {twoFactorSetup.setupKey}
                          </div>
                        </div>
                      )}

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
                    <label className="block text-sm font-medium mb-1.5">Authenticator OTP</label>
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
    </div>
  );
};

export default Profile;
