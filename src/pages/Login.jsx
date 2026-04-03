import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
const loginImg = '/asset/login4.png';
const logomain = '/asset/logomain.png';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyTwoFactor } = useAuth();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const redirectAfterLogin = (user) => {
    const redirectPath =
      user.role === 'Master'
        ? '/master/overview'
        : user.role === 'Child'
        ? '/child/overview'
        : '/admin/overview';

    navigate(redirectPath, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);

    if (result.success) {
      redirectAfterLogin(result.user);
    } else if (result.requires2FA) {
      setRequiresTwoFactor(true);
      setOtpCode('');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await verifyTwoFactor(otpCode);
      redirectAfterLogin(user);
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <img
          src={loginImg}
          alt="AlgoDelta Trading"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
          <div className="w-full h-16 flex-shrink-0">
            <img src={logomain} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="absolute bottom-12 left-8 right-8 z-10">
          <h2 className="text-white text-3xl font-bold leading-tight drop-shadow-lg">
            Welcome to <br />Ascentra Copy Trading Platform
          </h2>
          <p className="text-white/70 mt-2 text-sm">
            Copy top strategies. Trade smarter.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-[45%] flex items-center justify-center relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden px-4 py-8 sm:px-6">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-brand-purple/10 dark:bg-brand-purple/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-teal/5 dark:bg-brand-teal/10 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-0 sm:px-2 py-6 sm:py-10 relative z-10"
        >
          <div
            className="rounded-2xl p-5 sm:p-8 border border-slate-200 dark:border-white/10"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)'
                : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          >
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                {requiresTwoFactor ? 'Verify your sign in' : 'Welcome back'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {requiresTwoFactor
                  ? 'Enter the 6-digit code from your authenticator app.'
                  : 'Sign in to access your account.'}
              </p>
            </div>

            {location.state?.message && !error && !requiresTwoFactor && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-500 text-sm"
              >
                {location.state.message}
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={requiresTwoFactor ? handleTwoFactorSubmit : handleSubmit} className="space-y-4">
              {!requiresTwoFactor && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-brand-purple/60"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                      }}
                      required
                    />
                  </div>
                </div>
              )}

              {!requiresTwoFactor && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Password</label>
                    <button
                      type="button"
                      className="text-xs text-brand-blue hover:underline"
                      onClick={() => navigate('/forgot-password')}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-12 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-brand-purple/60"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {requiresTwoFactor && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Two-Factor Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-brand-purple/60 tracking-[0.35em]"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
                    }}
                    required
                  />
                </div>
              )}

              {!requiresTwoFactor && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-brand-purple cursor-pointer"
                  />
                  <label htmlFor="remember" className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                    Remember Me
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(90deg, #00C896, #00A878, #059669)',
                  boxShadow: '0 4px 20px rgba(0,200,150,0.35)',
                }}
              >
                {loading ? 'Signing in...' : requiresTwoFactor ? 'Verify Code' : 'Sign In'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-500">
              New on our platform?{' '}
              <Link to="/register" className="text-brand-blue hover:underline font-medium">
                Create an Account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
