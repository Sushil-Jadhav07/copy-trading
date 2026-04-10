import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, AlertCircle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { authService } from '@/lib/auth';
import { useTheme } from '@/context/ThemeContext';
import PhoneInput from '@/components/shared/PhoneInput';

const inputCls = (isDark) => ({
  background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,1)',
  border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.14)',
  boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
});

const ForgotPassword = () => {
  const { isDark } = useTheme();
  const [method, setMethod]       = useState('email'); // 'email' | 'phone'
  const [email, setEmail]         = useState('');
  const [phone, setPhone]         = useState('');
  const [countryCode, setCountry] = useState('+91');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [errorType, setErrorType] = useState(''); // 'email_not_found'
  const [success, setSuccess]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setErrorType(''); setSuccess('');

    try {
      if (method === 'email') {
        await authService.forgotPassword(email);
        setSuccess("If this email exists, you'll receive a reset link shortly.");
      } else {
        const fullPhone = `${countryCode}${phone}`;
        await authService.forgotPassword(fullPhone);
        setSuccess("If this phone number is registered, you'll receive an OTP shortly.");
      }
    } catch (err) {
      const msg = err.message || '';
      const notFound = msg.toLowerCase().includes('not found') ||
                       msg.toLowerCase().includes('does not exist') ||
                       msg.toLowerCase().includes('no account') ||
                       msg.toLowerCase().includes('invalid email');
      if (notFound && method === 'email') {
        setErrorType('email_not_found');
        setError('No account found with this email address.');
      } else {
        setError(msg || 'Unable to process your request. Please try again.');
      }
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
      active ? '' : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
    }`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: isDark ? undefined : 'linear-gradient(135deg,#ebf1f8 0%,#f8fafc 50%,#edf2f8 100%)' }}>

      {/* Orbs */}
      <div className="fixed top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: isDark ? 'rgba(0,200,150,0.04)' : 'rgba(0,200,150,0.07)', filter: 'blur(60px)' }} />
      <div className="fixed bottom-0 left-0 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: isDark ? 'rgba(37,99,235,0.04)' : 'rgba(37,99,235,0.06)', filter: 'blur(60px)' }} />

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
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Choose how you'd like to recover your account.
            </p>
          </div>

          {/* Tabs */}
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
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {method === 'email' ? (
                <motion.div key="email" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                      style={inputCls(isDark)} required />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    We'll send a password reset link to this email.
                  </p>
                </motion.div>
              ) : (
                <motion.div key="phone" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
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
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                    We'll send a one-time code to your registered phone.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(90deg,#00C896,#00A878)', boxShadow: '0 2px 10px rgba(0,200,150,0.26)' }}>
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : method === 'email' ? 'Send Reset Link' : 'Send OTP'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-500">
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