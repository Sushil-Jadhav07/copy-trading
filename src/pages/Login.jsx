import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Phone, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import PhoneInput from '@/components/shared/PhoneInput';

const loginImg = '/asset/login4.png';
const logomain = '/asset/whitelogo.png';

const inputBase =
  'w-full rounded-xl text-sm outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-white';

const inputCls = (isDark) => ({
  background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(248, 250, 252, 0.8)',
  border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(226, 232, 240, 0.8)',
  boxShadow: isDark
    ? 'inset 0 1px 2px rgba(0,0,0,0.18)'
    : 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
});

const Login = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, verifyTwoFactor, sendOtp, verifyOtp } = useAuth();
  const { isDark } = useTheme();

  // 'phone' | 'email'
  const [loginMethod, setLoginMethod] = useState('phone');
  // 'input' | 'otp-verify' | '2fa'
  const [step, setStep] = useState('input');

  const [form, setForm] = useState({ phone: '', countryCode: '+91', email: '', password: '' });
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [otpCode, setOtpCode]       = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [cooldown, setCooldown]     = useState(0);

  /* ---------- redirect helper ---------- */
  const redirectAfterLogin = (user) => {
    const path =
      user.role === 'Master' ? '/master/overview' :
      user.role === 'Admin'  ? '/admin/overview'  : '/child/overview';
    navigate(path, { replace: true });
  };

  /* ---------- cooldown timer ---------- */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((p) => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  /* ---------- Phone → Send OTP ---------- */
  const handlePhoneSend = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const fullPhone = `${form.countryCode}${form.phone}`;
    const res = await sendOtp(fullPhone);
    if (res.success) {
      setStep('otp-verify');
      setOtpSent(true);
      setCooldown(30);
      setOtpCode('');
    } else {
      setError(res.error || 'Failed to send OTP');
    }
    setLoading(false);
  };

  /* ---------- Phone → Verify OTP ---------- */
  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const fullPhone = `${form.countryCode}${form.phone}`;
    const res = await verifyOtp(fullPhone, otpCode);
    if (res.success) {
      if (res.user?.twoFactorEnabled) { setStep('2fa'); setOtpCode(''); }
      else                            { redirectAfterLogin(res.user); }
    } else {
      setError(res.error || 'Invalid OTP');
    }
    setLoading(false);
  };

  /* ---------- Email + Password ---------- */
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await login(form.email, form.password);
    if (res.success)            { redirectAfterLogin(res.user); }
    else if (res.requires2FA)   { setStep('2fa'); setOtpCode(''); }
    else                        { setError(res.error); }
    setLoading(false);
  };

  /* ---------- 2FA ---------- */
  const handle2FA = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await verifyTwoFactor(otpCode);
      redirectAfterLogin(res.user || res);
    } catch (err) {
      setError(err.message || 'Invalid code');
    }
    setLoading(false);
  };

  /* ---------- Resend OTP ---------- */
  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true); setError('');
    const res = await sendOtp(`${form.countryCode}${form.phone}`);
    if (res.success) { setCooldown(30); setOtpSent(true); }
    else             { setError(res.error || 'Failed to resend'); }
    setLoading(false);
  };

  /* ---------- tab style helper ---------- */
  const tabStyle = (active) => ({
    ...(active ? {
      background: isDark ? 'linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.10) 100%)' : '#fff',
      color:      isDark ? '#fff' : '#0f172a',
      border:     isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(226, 232, 240, 0.8)',
      boxShadow:  isDark ? '0 10px 24px rgba(0,0,0,0.22)' : '0 4px 12px rgba(0, 0, 0, 0.04)',
    } : {}),
  });

  const tabCls = (active) =>
    `flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
      active ? '' : 'text-slate-500 dark:text-slate-400 hover:text-foreground'
    }`;

  const BtnSubmit = ({ disabled, children }) => (
    <button
      type="submit"
      disabled={disabled || loading}
      className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      style={{ background: 'linear-gradient(90deg,#00C896,#00A878)', boxShadow: '0 2px 10px rgba(0,200,150,0.28)' }}
    >
      {loading ? <Spinner /> : children}
    </button>
  );

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Left image panel */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <img src={loginImg} alt="Trading" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-8 left-8 z-10">
          <div className="h-14"><img src={logomain} alt="Logo" className="h-full w-auto object-contain" /></div>
        </div>
        <div className="absolute bottom-12 left-8 right-8 z-10">
          <h2 className="text-white text-3xl font-bold leading-tight drop-shadow-lg">
            Welcome to<br />Ascentra Copy Trading
          </h2>
          <p className="text-white/70 mt-2 text-sm">Copy top strategies. Trade smarter.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div
        className="w-full lg:w-[45%] flex items-end lg:items-center justify-center relative overflow-hidden px-4 py-6 sm:px-6 sm:py-8"
        style={{
          background: isDark
            ? 'linear-gradient(180deg,#020605 0%,#061411 48%,#020605 100%)'
            : 'linear-gradient(135deg,#ebf1f8 0%,#f8fafc 50%,#edf2f8 100%)'
        }}
      >
        <div className="absolute inset-0 lg:hidden">
          <img src={loginImg} alt="Trading" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/90" />
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#06110d] via-[#06110d]/75 to-transparent" />
        </div>

        <div className="absolute left-5 right-5 top-5 z-10 lg:hidden text-center">
          <div className="h-10 flex justify-center">
            <img src={logomain} alt="Logo" className="h-full w-auto object-contain" />
          </div>
          <div className="mt-10 mx-auto max-w-[280px]">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-emerald-300/90">Ascentra Copy Trading</p>
            <h2 className="mt-3 text-[2.15rem] font-bold leading-[0.98] text-white">
              Welcome to
              <br />
              Ascentra Copy Trading
            </h2>
            <p className="mt-3 mx-auto max-w-[220px] text-sm leading-6 text-white/72">Copy top strategies. Trade smarter.</p>
          </div>

          <div className="mt-5 flex justify-center gap-2">
            <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">Secure Login</span>
            </div>
            <div className="rounded-full border border-white/12 bg-black/20 px-3 py-1.5 backdrop-blur-md">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/75">OTP + 2FA</span>
            </div>
          </div>
        </div>

        {/* Subtle orbs */}
        <div className="absolute -top-20 -right-20 hidden lg:block w-64 h-64 rounded-full pointer-events-none"
          style={{ background: isDark ? 'rgba(0,200,150,0.05)' : 'rgba(0,200,150,0.07)', filter: 'blur(52px)' }} />
        <div className="absolute -bottom-16 -left-16 hidden lg:block w-56 h-56 rounded-full pointer-events-none"
          style={{ background: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.06)', filter: 'blur(52px)' }} />

        <motion.div
          initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}
          className="w-full max-w-md relative z-10 pt-32 lg:pt-0"
        >
          <div className="rounded-[30px] p-5 sm:p-8 border"
            style={{
              background: isDark ? 'linear-gradient(180deg, rgba(16,24,20,0.94) 0%, rgba(10,16,13,0.92) 100%)' : 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
              boxShadow: isDark
                ? '0 20px 50px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)'
                : '0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)',
            }}>
            <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/12 lg:hidden" />
            <AnimatePresence mode="wait">

              {/* ====== 2FA step ====== */}
              {step === '2fa' && (
                <motion.div key="2fa" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: isDark ? 'rgba(0,200,150,0.11)' : 'rgba(0,200,150,0.09)', border: '1px solid rgba(0,200,150,0.22)' }}>
                      <ShieldCheck className="w-7 h-7 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Two-factor auth</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
                      Enter the 6-digit code from your authenticator app.
                    </p>
                  </div>
                  {error && <ErrorBox>{error}</ErrorBox>}
                  <form onSubmit={handle2FA} className="space-y-4">
                    <OtpInput value={otpCode} onChange={setOtpCode} isDark={isDark} />
                    <BtnSubmit disabled={otpCode.length < 6}>Verify &amp; Sign In</BtnSubmit>
                  </form>
                  <button onClick={() => { setStep('input'); setError(''); }}
                    className="mt-4 w-full text-sm text-slate-500 dark:text-slate-400 hover:text-foreground transition-colors text-center flex items-center justify-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Back to sign in
                  </button>
                </motion.div>
              )}

              {/* ====== Phone OTP verify step ====== */}
              {step === 'otp-verify' && loginMethod === 'phone' && (
                <motion.div key="otp-verify" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <button onClick={() => { setStep('input'); setError(''); }}
                    className="mb-4 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 hover:text-foreground transition-colors">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Enter OTP</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {otpSent ? `Code sent to ${form.countryCode} ${form.phone}` : 'Enter the code sent to your phone.'}
                    </p>
                  </div>
                  {error && <ErrorBox>{error}</ErrorBox>}
                  <form onSubmit={handleOtpVerify} className="space-y-4">
                    <OtpInput value={otpCode} onChange={setOtpCode} isDark={isDark} />
                    <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span />
                      <button type="button" onClick={handleResend} disabled={cooldown > 0}
                        className="hover:underline disabled:opacity-50">
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                    <BtnSubmit disabled={otpCode.length < 6}>Verify &amp; Sign In</BtnSubmit>
                  </form>
                </motion.div>
              )}

              {/* ====== Main input step ====== */}
              {step === 'input' && (
                <motion.div key="input" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  <div className="mb-5">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-emerald-400/90 lg:hidden">Sign In</p>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white lg:text-2xl">
                      <span className="lg:hidden">Welcome back</span>
                      <span className="hidden lg:inline">Welcome To <br />Ascentra Copy Trading</span>
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Sign in to access your account.
                    </p>
                  </div>

                  {/* Method tabs */}
                  <div className="flex gap-1 mb-5 p-1.5 rounded-2xl"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                      border: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.04)',
                    }}>
                    {[
                      { key: 'phone', icon: Phone, label: 'Phone' },
                      { key: 'email', icon: Mail,  label: 'Email' },
                    ].map(({ key, icon: Icon, label }) => (
                      <button key={key} type="button"
                        onClick={() => { setLoginMethod(key); setError(''); }}
                        className={tabCls(loginMethod === key)}
                        style={tabStyle(loginMethod === key)}>
                        <Icon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />{label}
                      </button>
                    ))}
                  </div>

                  {location.state?.message && !error && (
                    <div className="mb-4 p-3 bg-emerald-500/12 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 text-sm">
                      {location.state.message}
                    </div>
                  )}
                  {error && <ErrorBox className="mb-4">{error}</ErrorBox>}

                  {/* Phone form */}
                  {loginMethod === 'phone' && (
                    <form onSubmit={handlePhoneSend} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                          Phone Number
                        </label>
                        <PhoneInput
                          value={form.phone}
                          onChange={(d) => setForm({ ...form, phone: d })}
                          countryCode={form.countryCode}
                          onCountryChange={(c) => setForm({ ...form, countryCode: c })}
                          inputStyle={inputCls(isDark)}
                          maxLength={10}
                          required
                          placeholder="10-digit number"
                        />
                      </div>
                      <BtnSubmit>
                        Send OTP <ArrowRight className="w-4 h-4" />
                      </BtnSubmit>
                      <p className="text-center text-xs text-slate-400 dark:text-slate-500">
                        A one-time code will be sent to your phone.
                      </p>
                    </form>
                  )}

                  {/* Email form */}
                  {loginMethod === 'email' && (
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                          Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <input
                            type="email" value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="Enter your email"
                            className={`${inputBase} pl-10 pr-4 py-2.5`}
                            style={inputCls(isDark)} required
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Password</label>
                          <button type="button" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                            onClick={() => navigate('/forgot-password')}>
                            Forgot Password?
                          </button>
                        </div>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <input
                            type={showPass ? 'text' : 'password'} value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Enter your password"
                            className={`${inputBase} pl-10 pr-12 py-2.5`}
                            style={inputCls(isDark)} required
                          />
                          <button type="button" onClick={() => setShowPass(!showPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <BtnSubmit>
                        Sign In <ArrowRight className="w-4 h-4" />
                      </BtnSubmit>
                    </form>
                  )}

                  <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-500">
                    New on our platform?{' '}
                    <Link to="/register" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">
                      Create an Account
                    </Link>
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

/* ── Shared micro-components ── */

const Spinner = () => (
  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
);

const ErrorBox = ({ children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
    className={`p-3 bg-red-500/12 border border-red-500/28 rounded-xl text-red-600 dark:text-red-400 text-sm mb-4 ${className}`}
  >
    {children}
  </motion.div>
);

const OtpInput = ({ value, onChange, isDark }) => (
  <div>
    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
      Verification Code
    </label>
    <input
      type="text" inputMode="numeric" maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      placeholder="• • • • • •"
      className="w-full px-4 py-3 rounded-xl text-lg text-center text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 outline-none transition-all tracking-[0.5em]"
      style={{
        background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,1)',
        border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.14)',
        boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}
      autoFocus
      required
    />
  </div>
);

export default Login;
