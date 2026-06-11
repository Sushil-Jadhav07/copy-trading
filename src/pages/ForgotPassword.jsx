import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { authService } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import PhoneInput from '@/components/shared/PhoneInput';
import loginImg from '/asset/login4.png';

const inputCls = (isDark) => ({
  background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,1)',
  border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.14)',
  boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
});

const ForgotPassword = () => {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [method, setMethod]       = useState('email'); // 'email' | 'phone'
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [countryCode, setCountry] = useState('+91');
  const [otp, setOtp]             = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // email: 'input' → 'otp' | phone: 'input' → 'otp'
  const [emailStage, setEmailStage] = useState('input');
  const [phoneStage, setPhoneStage] = useState('input');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [errorType, setErrorType] = useState(''); // 'email_not_found'
  const [success, setSuccess]     = useState('');

  const resetPhoneFlow = () => { setPhoneStage('input'); setOtp(''); setError(''); setSuccess(''); };

  // ─── Email flow: forgot-password → OTP → reset-password ───────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setErrorType(''); setSuccess('');
    try {
      await authService.forgotPassword(email);
      setEmailStage('otp');
      setSuccess('If this email is registered, a 6-digit code was sent. Check inbox and spam.');
    } catch (err) {
      setError(err.message || 'Unable to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailReset = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8 || !/[0-9]/.test(newPassword) || !/[^a-zA-Z0-9]/.test(newPassword)) {
      setError('Password must be at least 8 characters and include a number and special character.');
      return;
    }
    if (otp.length < 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setLoading(true); setError(''); setSuccess('');
    try {
      await authService.resetPasswordWithOtp(email, otp, newPassword);
      navigate('/login', {
        replace: true,
        state: { message: 'Password reset successful. Sign in with your new password.' },
      });
    } catch (err) {
      setError(err.message || 'Unable to reset password. Request a new code and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone flow step 1: POST /auth/send-otp { phone } ────────────────────
  // FIX: spec has no phone-based password reset endpoint.
  // We use the OTP login flow instead: send-otp → verify-otp → user is logged in
  // and can change their password from the Profile page.
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setSuccess('');
    try {
      const fullPhone = `${countryCode}${phone}`;
      await authService.sendOtp(fullPhone, 'login');
      setPhoneStage('otp');
      setSuccess(`OTP sent to ${fullPhone}`);
    } catch (err) {
      setError(err.message || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone flow step 2: POST /auth/verify-otp → login → redirect ─────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 4) { setError('Please enter the full OTP'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const fullPhone = `${countryCode}${phone}`;
      await authService.verifyOtp(fullPhone, otp, 'login');
      // User is now authenticated — send them to login so AuthContext bootstraps
      navigate('/login', {
        replace: true,
        state: { message: 'Phone verified. You are now logged in. Go to Profile to change your password.' },
      });
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const tabStyle = (active) => ({
    ...(active ? {
      background: isDark ? 'rgba(255,255,255,0.12)' : '#fff',
      color:      isDark ? '#fff' : '#0f172a',
      boxShadow:  isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
    } : {}),
  });
  const tabCls = (active) =>
    `flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
      active ? '' : 'text-slate-400 dark:text-slate-400 hover:text-foreground'
    }`;

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden px-4 py-8 bg-slate-950">
      <div className="absolute inset-0 z-0">
        <img src={loginImg} alt="Trading Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-purple/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-teal/20 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
        className="w-full max-w-md relative z-10">
        <div className="rounded-2xl p-6 sm:p-8 border"
          style={{
            background: isDark ? 'rgba(255,255,255,0.052)' : 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: isDark
              ? '0 8px 28px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)',
          }}>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Reset password</h1>
            <p className="text-sm text-slate-400 dark:text-slate-400 mt-1">
              {method === 'email' && emailStage === 'otp'
                ? 'Enter the code from your email and choose a new password.'
                : method === 'phone' && phoneStage === 'otp'
                ? 'Enter the OTP sent to your phone.'
                : "Choose how you'd like to recover your account."}
            </p>
          </div>

          {/* Tabs — hidden during OTP entry */}
          {emailStage === 'input' && phoneStage === 'input' && (
            <div className="flex gap-1 mb-5 p-1 rounded-xl"
              style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
              {[
                { key: 'email', icon: Mail,  label: 'Via Email' },
                { key: 'phone', icon: Phone, label: 'Via Phone' },
              ].map(({ key, icon: Icon, label }) => (
                <button key={key} type="button"
                  onClick={() => { setMethod(key); setError(''); setErrorType(''); setSuccess(''); }}
                  className={tabCls(method === key)}
                  style={tabStyle(method === key)}>
                  <Icon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />{label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence>
            {success && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-emerald-500/12 border border-emerald-500/28 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{success}</span>
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 p-3 bg-red-500/12 border border-red-500/24 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{error}</p>
                    {errorType === 'email_not_found' && (
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-400">
                        No account found with this email.{' '}
                        <button type="button" className="underline font-medium text-emerald-600 dark:text-emerald-400"
                          onClick={() => { setMethod('phone'); setError(''); setErrorType(''); }}>
                          Try recovering via phone number instead
                        </button>.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            {/* ── EMAIL FLOW ── */}
            {method === 'email' && emailStage === 'input' && (
              <motion.form key="email-form" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      style={inputCls(isDark)} required />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5">
                    We&apos;ll send a 6-digit verification code to this email.
                  </p>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : 'Send Verification Code'}
                </button>
              </motion.form>
            )}

            {method === 'email' && emailStage === 'otp' && (
              <motion.form key="email-otp" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                onSubmit={handleEmailReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Verification code</label>
                  <input type="text" inputMode="numeric" maxLength={6} value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-center tracking-[0.4em] text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                    style={inputCls(isDark)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">New password</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                    style={inputCls(isDark)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Confirm password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30"
                    style={inputCls(isDark)} required />
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50">
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
                <button type="button" onClick={() => { setEmailStage('input'); setOtp(''); setError(''); }}
                  className="w-full text-sm text-slate-400 hover:text-slate-700 dark:hover:text-white">
                  ← Change email
                </button>
              </motion.form>
            )}

            {/* ── PHONE FLOW — STEP 1: input number ── */}
            {method === 'phone' && phoneStage === 'input' && (
              <motion.form key="phone-input" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Phone Number
                  </label>
                  <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    countryCode={countryCode}
                    onCountryChange={setCountry}
                    inputStyle={inputCls(isDark)}
                    maxLength={10}
                    required
                    placeholder="10-digit number"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5">
                    We'll send a one-time code. After verifying, you can change your password in Profile settings.
                  </p>
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : 'Send OTP'}
                </button>
              </motion.form>
            )}

            {/* ── PHONE FLOW — STEP 2: OTP verify ── */}
            {method === 'phone' && phoneStage === 'otp' && (
              <motion.form key="phone-otp" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Enter OTP
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="6-digit code"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-center tracking-[0.4em] text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                    style={inputCls(isDark)}
                    required
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-1.5 text-center">
                    Code sent to {countryCode} {phone}
                  </p>
                </div>
                <button type="submit" disabled={loading || otp.length < 4}
                  className="btn-primary w-full py-3 text-sm font-semibold disabled:opacity-50">
                  {loading
                    ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : 'Verify & Login'}
                </button>
                <button type="button" onClick={resetPhoneFlow}
                  className="w-full text-sm text-slate-400 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                  ← Change phone number
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-5 text-center text-sm text-slate-400 dark:text-slate-400">
            Remembered your password?{' '}
            <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium flex items-center justify-center gap-1 mt-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
