import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Phone, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import GoogleSignInCard from '@/components/shared/GoogleSignInCard';
import PhoneInput from '@/components/shared/PhoneInput';
import loginImg from '/asset/login4.png';
import logomain from '/asset/whitelogo.png';

const inputBase =
  'w-full rounded-xl text-sm outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-white';

const inputCls = () => ({
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
});

const Login = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login, googleLogin, verifyLoginOtp, sendLoginOtp, sendOtp, verifyOtp, pending2FA } = useAuth();
  const isDark = true; // Force dark mode for login page

  // 'phone' | 'email'
  const [loginMethod, setLoginMethod] = useState('phone');
  // 'input' | 'otp-verify' | '2fa'
  const [step, setStep] = useState('input');

  const [form, setForm] = useState({ phone: '', countryCode: '+91', email: '', password: '' });
  const [showPass, setShowPass]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [otpCode, setOtpCode]       = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [cooldown, setCooldown]     = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [twoFactorChannel, setTwoFactorChannel] = useState('EMAIL');
  const [googleRole, setGoogleRole] = useState('CHILD');

  /* ---------- redirect helper ---------- */
  const redirectAfterLogin = (user) => {
    const normalizedRole = String(user?.role || '').toUpperCase();
    const path =
      normalizedRole === 'MASTER' ? '/master/overview' :
      normalizedRole === 'ADMIN'  ? '/admin/overview'  : '/child/overview';
    navigate(path, { replace: true });
  };

  /* ---------- cooldown timer ---------- */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((p) => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  useEffect(() => {
    if (otpExpiresIn <= 0) return;
    const t = setInterval(() => setOtpExpiresIn((p) => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(t);
  }, [otpExpiresIn]);

  useEffect(() => {
    if (!location.state?.message) return;
    setSuccessMessage(location.state.message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  /* ---------- Phone → Send OTP ---------- */
  const handlePhoneSend = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const fullPhone = `${form.countryCode}${form.phone}`;
    if (!/^\+[1-9]\d{9,14}$/.test(fullPhone)) {
      setError('Enter a valid phone number with country code.');
      setLoading(false);
      return;
    }
    const res = await sendOtp(fullPhone);
    if (res.success) {
      setStep('otp-verify');
      setOtpSent(true);
      setCooldown(res.retryAfter ?? 60);
      setOtpExpiresIn(res.expiresIn ?? 300);
      setOtpCode('');
    } else {
      if (res.errorCode === 'RATE_LIMITED') {
        setError(`Too many requests. Please wait ${res.retryAfter ?? 60} seconds before trying again.`);
        if (res.retryAfter) setCooldown(res.retryAfter);
      } else if (res.errorCode === 'SMS_FAILED') {
        setError('Could not send OTP via SMS. Please try the Email login method or contact support.');
      } else {
        setError(res.error || 'Failed to send OTP. Please try again.');
      }
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
      const otpErrors = {
        INVALID_OTP: 'Invalid OTP code.',
        OTP_EXPIRED: 'OTP expired. Request a new code.',
        TOO_MANY_ATTEMPTS: 'Too many attempts. Request a new OTP.',
      };
      setError(otpErrors[res.errorCode] || res.error || 'Invalid OTP');
    }
    setLoading(false);
  };

  /* ---------- Email + Password ---------- */
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await login(form.email, form.password);
    if (res.success)            { redirectAfterLogin(res.user); }
    else if (res.requires2FA)   {
      setStep('2fa');
      setOtpCode('');
      setTwoFactorChannel(res.twoFactorChannel || pending2FA?.channel || 'EMAIL');
      if (res.otpRetryAfter) setCooldown(Number(res.otpRetryAfter) || 60);
      if (res.otpExpiresIn) setOtpExpiresIn(Number(res.otpExpiresIn) || 600);
    }
    else                        { setError(res.error); }
    setLoading(false);
  };

  /* ---------- 2FA ---------- */
  const handle2FA = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    const twoFactorEmail = pending2FA?.email || form.email;
    const res = await verifyLoginOtp(twoFactorEmail, otpCode);
    if (res.success) {
      redirectAfterLogin(res.user);
    } else {
      setError(res.error || 'Invalid code');
    }
    setLoading(false);
  };

  const handleResend2FAOtp = async () => {
    const twoFactorEmail = pending2FA?.email || form.email;
    if (!twoFactorEmail) {
      setError('Email is required to resend OTP');
      return;
    }
    setLoading(true);
    setError('');
    const res = await sendLoginOtp(twoFactorEmail);
    if (res.success) {
      setCooldown(60);
      setOtpExpiresIn(600);
    } else {
      setError(res.error || 'Failed to resend OTP');
    }
    setLoading(false);
  };

  /* ---------- Resend OTP ---------- */
  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true); setError('');
    const res = await sendOtp(`${form.countryCode}${form.phone}`);
    if (res.success) {
      setCooldown(res.retryAfter ?? 60);
      setOtpExpiresIn(res.expiresIn ?? 300);
      setOtpSent(true);
    } else {
      setError(res.error || 'Failed to resend');
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async (credentialResponse) => {
    const credential = credentialResponse?.credential;
    if (!credential) {
      setError('Google sign-in did not return a credential.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await googleLogin(credential, googleRole);
    if (result.success) {
      redirectAfterLogin(result.user);
    } else {
      setError(result.error || 'Google sign-in failed');
    }

    setLoading(false);
  };

  /* ---------- tab style helper ---------- */
  const tabStyle = (active) => ({
    ...(active ? {
      background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,1)',
      color:      isDark ? '#fff' : '#0f172a',
      border:     '1px solid rgba(255,255,255,0.1)',
      boxShadow:  isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0, 0, 0, 0.05)',
    } : {}),
  });

  const tabCls = (active) =>
    `flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
      active ? '' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
    }`;

  const formatOtpTimer = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  };

  const BtnSubmit = ({ disabled, children }) => (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      type="submit"
      disabled={disabled || loading}
      className="btn-primary w-full py-3 text-sm font-semibold"
    >
      {loading ? <Spinner /> : children}
    </motion.button>
  );

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Full-screen background image with blur */}
      <div className="absolute inset-0 z-0">
        <img 
          src={loginImg} 
          alt="Trading Background" 
          className="w-full h-full object-cover"
        />
        {/* Dark overlay with blur */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />
        
        {/* Decorative elements */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-purple/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-teal/20 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      {/* Centered Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-[600px] px-4 relative z-10"
      >
        <div 
          className="rounded-[32px] p-6 sm:p-10 border border-white/10 shadow-2xl overflow-hidden"
          style={{
            background: isDark 
              ? 'linear-gradient(165deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)' 
              : 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: isDark
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)'
              : '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Logo & Header */}
          <div className="text-center mb-2">
            <div className="h-16 mb-6 flex justify-center">
              <img src={logomain} alt="Logo" className="h-full w-auto object-contain drop-shadow-md" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-slate-400 text-sm">
              Securely access your trading dashboard
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* ====== 2FA step ====== */}
            {step === '2fa' && (
              <motion.div key="2fa" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <div className="flex flex-col items-center mb-6">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 bg-emerald-500/10 border border-emerald-500/20">
                    <ShieldCheck className="w-7 h-7 text-emerald-500" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Two-factor auth</h2>
                  <p className="text-sm text-slate-400 mt-1 text-center">
                    Enter the 6-digit code sent via {String(twoFactorChannel || 'EMAIL').toUpperCase()}.
                  </p>
                </div>
                {error && <ErrorBox>{error}</ErrorBox>}
                <form onSubmit={handle2FA} className="space-y-5">
                  <OtpInput value={otpCode} onChange={setOtpCode} isDark={isDark} />
                  <BtnSubmit disabled={otpCode.length < 6}>Verify &amp; Sign In</BtnSubmit>
                </form>
                <button
                  type="button"
                  onClick={handleResend2FAOtp}
                  disabled={loading}
                  className="mt-3 w-full text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                >
                  Resend OTP
                </button>
                <button onClick={() => { setStep('input'); setError(''); }}
                  aria-label="Go back"
                  className="mt-6 w-full text-sm text-slate-400 hover:text-white transition-colors text-center flex items-center justify-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Back to sign in
                </button>
              </motion.div>
            )}

            {/* ====== Phone OTP verify step ====== */}
            {step === 'otp-verify' && loginMethod === 'phone' && (
              <motion.div key="otp-verify" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <button onClick={() => { setStep('input'); setError(''); }}
                  aria-label="Go back"
                  className="mb-6 flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white">Enter OTP</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {otpSent ? `Code sent to ${form.countryCode} ${form.phone}` : 'Enter the code sent to your phone.'}
                  </p>
                </div>
                {error && <ErrorBox>{error}</ErrorBox>}
                <form onSubmit={handleOtpVerify} className="space-y-5">
                  <OtpInput value={otpCode} onChange={setOtpCode} isDark={isDark} />
                  <div className="flex items-center justify-end text-xs">
                    {otpExpiresIn > 0 && (
                      <span className="mr-auto text-slate-400">
                        Expires in {formatOtpTimer(otpExpiresIn)}
                      </span>
                    )}
                    <button type="button" onClick={handleResend} disabled={cooldown > 0}
                      className="text-emerald-400 hover:underline disabled:opacity-50 disabled:no-underline">
                      {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                  <BtnSubmit disabled={otpCode.length < 6}>Verify &amp; Sign In</BtnSubmit>
                </form>
              </motion.div>
            )}

            {/* ====== Main input step ====== */}
            {step === 'input' && (
              <motion.div key="input" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Method tabs */}
                <div className="flex gap-1 mb-6 p-1.5 rounded-2xl bg-white/5 border border-white/5">
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

                {successMessage && !error && (
                  <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                    {successMessage}
                  </div>
                )}
                {error && <ErrorBox className="mb-6">{error}</ErrorBox>}

                <div style={{ minHeight: '160px' }}>
                  <AnimatePresence mode="wait">
                    {/* Phone form */}
                    {loginMethod === 'phone' && (
                      <motion.form
                        key="phone-form"
                        onSubmit={handlePhoneSend}
                        className="space-y-5"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
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
                          Send OTP <ArrowRight className="w-4 h-4 ml-1" />
                        </BtnSubmit>
                        <p className="text-center text-xs text-slate-500">
                          A one-time code will be sent to your phone.
                        </p>

                        <div className="pt-2">
                          <Divider label="Or continue with Google" />
                        </div>
                        <GoogleSignInCard
                          role={googleRole}
                          onRoleChange={setGoogleRole}
                          onSuccess={handleGoogleSignIn}
                          onError={() => setError('Google sign-in was cancelled or blocked.')}
                          disabled={loading}
                        />
                      </motion.form>
                    )}

                    {/* Email form */}
                    {loginMethod === 'email' && (
                      <motion.form
                        key="email-form"
                        onSubmit={handleEmailLogin}
                        className="space-y-5"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Email Address
                          </label>
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                            <input
                              type="email" value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              placeholder="Enter your email"
                              className={`${inputBase} pl-11 pr-4 py-3 bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-white/10`}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label htmlFor="login-password" className="text-sm font-medium text-slate-300">Password</label>
                            <button type="button" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                              onClick={() => navigate('/forgot-password')}>
                              Forgot Password?
                            </button>
                          </div>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                            <input
                              id="login-password"
                              type={showPass ? 'text' : 'password'} value={form.password}
                              onChange={(e) => setForm({ ...form, password: e.target.value })}
                              placeholder="Enter your password"
                              className={`${inputBase} pl-11 pr-12 py-3 bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-white/10`}
                              required
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)}
                              aria-label={showPass ? 'Hide password' : 'Show password'}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <BtnSubmit>
                          Sign In <ArrowRight className="w-4 h-4 ml-1" />
                        </BtnSubmit>

                        <Divider label="Or continue with Google" />
                        <GoogleSignInCard
                          role={googleRole}
                          onRoleChange={setGoogleRole}
                          onSuccess={handleGoogleSignIn}
                          onError={() => setError('Google sign-in was cancelled or blocked.')}
                          disabled={loading}
                        />
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                <p className="mt-8 text-center text-sm text-slate-400">
                  New to Ascentra Capital?{' '}
                  <Link to="/register" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                    Create an Account
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
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
      placeholder="â€¢ â€¢ â€¢ â€¢ â€¢ â€¢"
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

const Divider = ({ label }) => (
  <div className="flex items-center gap-3">
    <div className="h-px flex-1 bg-white/10" />
    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</span>
    <div className="h-px flex-1 bg-white/10" />
  </div>
);

export default Login;
