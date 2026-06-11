import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Crown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
  XCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import GoogleSignInCard from '@/components/shared/GoogleSignInCard';
import { authService } from '@/lib/auth';
import PhoneInput from '@/components/shared/PhoneInput';
import loginImg from '/asset/login4.png';
import logomain from '/asset/whitelogo.png';

const inputStyle = () => ({
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
});

const fallbackPasswordValidation = (pwd) => {
  const checks = {
    minLength: pwd.length >= 8,
    hasNumber: /[0-9]/.test(pwd),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(pwd),
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
  };
  const score = Object.values(checks).filter(Boolean).length;
  return {
    valid: checks.minLength && checks.hasNumber && checks.hasSpecialChar,
    strength: score >= 5 ? 'STRONG' : score >= 3 ? 'MEDIUM' : 'WEAK',
    score,
    checks,
  };
};

const getStrengthColor = (strength) => {
  if (strength === 'STRONG') return '#22c55e';
  if (strength === 'MEDIUM') return '#eab308';
  return '#ef4444';
};

const ACCOUNT_OPTIONS = [
  {
    val: 'CHILD',
    label: 'Copy Trades',
    icon: Copy,
    description: 'Follow expert traders and automatically mirror their trades in your account.',
    badge: 'Most Popular',
  },
  {
    val: 'MASTER',
    label: 'Be a Master',
    icon: Crown,
    description: 'Share your trading strategy, build a following, and earn from your performance.',
    badge: 'For Experts',
  },
];

const Register = () => {
  const navigate = useNavigate();
  const { register, googleLogin } = useAuth();
  const isDark = true;

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'CHILD',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailCheck, setEmailCheck] = useState({ checking: false, taken: false, message: '' });
  const [step, setStep] = useState(1);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(fallbackPasswordValidation(''));
  const [validatingPassword, setValidatingPassword] = useState(false);

  const passwordState = useMemo(
    () => passwordValidation || fallbackPasswordValidation(formData.password),
    [formData.password, passwordValidation]
  );

  useEffect(() => {
    const password = formData.password;
    const fallback = fallbackPasswordValidation(password);
    setPasswordValidation(fallback);

    if (!password) {
      setValidatingPassword(false);
      return undefined;
    }

    setValidatingPassword(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await authService.validatePassword(password);
        setPasswordValidation({
          ...fallback,
          ...result,
          checks: {
            ...fallback.checks,
            ...(result?.checks || {}),
          },
        });
      } catch {
        setPasswordValidation(fallback);
      } finally {
        setValidatingPassword(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [formData.password]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'email') setEmailCheck({ checking: false, taken: false, message: '' });
  };

  const validateStep = (currentStep) => {
    setError('');

    if (currentStep === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First name and last name are required.');
        return false;
      }
      if (!formData.email.trim()) {
        setError('Email address is required.');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError('Please enter a valid email address.');
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.password) {
        setError('Password is required.');
        return false;
      }
      if (!passwordState.valid) {
        setError('Password must be at least 8 characters and include a number and special character.');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return false;
      }
    }

    return true;
  };

  const handleEmailBlur = async () => {
    const email = formData.email.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setEmailCheck({ checking: true, taken: false, message: '' });
    const result = await authService.checkEmailAvailability(email);
    setEmailCheck({ checking: false, taken: !result.available, message: result.message || '' });
  };

  const handleNext = async () => {
    if (!validateStep(step)) return;
    if (step === 1) {
      const email = formData.email.trim();
      if (email) {
        setEmailCheck({ checking: true, taken: false, message: '' });
        const result = await authService.checkEmailAvailability(email);
        setEmailCheck({ checking: false, taken: !result.available, message: result.message || '' });
        if (!result.available) {
          setError(result.message || 'This email is already registered. Please login or use a different email.');
          return;
        }
      }
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (step < 3) {
      handleNext();
      return;
    }

    handleCreateAccount();
  };

  const handleCreateAccount = async () => {
    if (step !== 3) return;
    if (!validateStep(1) || !validateStep(2)) return;
    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    setError('');

    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');
    const fullPhone = `${formData.countryCode}${formData.phone}`;

    const result = await register(
      fullName,
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.role,
      fullPhone
    );

    if (result.success) {
      navigate('/login', { replace: true, state: { message: 'Registration successful. Please sign in.' } });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleGoogleSignIn = async (credentialResponse) => {
    if (!termsAccepted) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }

    const credential = credentialResponse?.credential;
    if (!credential) {
      setError('Google sign-in did not return a credential.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await googleLogin(credential, formData.role);
    if (result.success) {
      const normalizedRole = String(result.user?.role || formData.role || '').toUpperCase();
      const path =
        normalizedRole === 'MASTER' ? '/master/overview' :
        normalizedRole === 'ADMIN' ? '/admin/overview' :
        '/child/overview';
      navigate(path, { replace: true });
    } else {
      setError(result.error || 'Google sign-in failed');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-950 py-12">
      <div className="absolute inset-0 z-0">
        <img
          src={loginImg}
          alt="Trading Background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[6px]" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-brand-purple/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-brand-teal/20 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-[700px] px-4 relative z-10"
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
          <div className="text-center mb-2">
            <div className="h-16 mb-6 flex justify-center">
              <img src={logomain} alt="Logo" className="h-full w-auto object-contain drop-shadow-md" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
              Create Account
            </h1>
            <p className="text-slate-400 text-sm">
              Start your trading journey with Ascentra Capital
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-400 font-medium">Step {step} of 3</span>
              <span className="text-xs text-slate-400">{['Personal Info', 'Security', 'Account Type'][step - 1]}</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    s < step ? 'bg-emerald-500 text-white' :
                    s === step ? 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400' :
                    'bg-white/5 border border-white/10 text-slate-400'
                  }`}
                >
                  {s < step ? <Check className="h-3.5 w-3.5" /> : s}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step-1"
                  className="space-y-5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
                        <input
                          aria-label="First name"
                          type="text"
                          name="firstName"
                          autoComplete="given-name"
                          value={formData.firstName}
                          onChange={(e) => updateField('firstName', e.target.value)}
                          placeholder="First Name"
                          required
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                          style={inputStyle()}
                        />
                      </div>
                      <input
                        aria-label="Middle name"
                        type="text"
                        name="middleName"
                        autoComplete="additional-name"
                        value={formData.middleName}
                        onChange={(e) => updateField('middleName', e.target.value)}
                        placeholder="Middle Name"
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                        style={inputStyle()}
                      />
                      <input
                        aria-label="Last name"
                        type="text"
                        name="lastName"
                        autoComplete="family-name"
                        value={formData.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                        placeholder="Last Name"
                        required
                        className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                        style={inputStyle()}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => updateField('email', e.target.value)}
                        onBlur={handleEmailBlur}
                        placeholder="Enter your email"
                        required
                        className={`w-full pl-11 pr-10 py-3 rounded-xl text-sm bg-white/5 border focus:bg-white/10 text-white outline-none transition-all ${
                          emailCheck.taken
                            ? 'border-red-500/60 focus:border-red-500/60'
                            : 'border-white/10 focus:border-emerald-500/50'
                        }`}
                      />
                      {emailCheck.checking && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
                      )}
                      {!emailCheck.checking && emailCheck.taken && (
                        <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                      )}
                    </div>
                    {emailCheck.taken && (
                      <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
                        {emailCheck.message || 'This email is already registered.'}{' '}
                        <Link to="/login" className="underline text-red-300 hover:text-white transition-colors">Sign in instead</Link>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(digits) => updateField('phone', digits)}
                      countryCode={formData.countryCode}
                      onCountryChange={(code) => updateField('countryCode', code)}
                      inputStyle={inputStyle(isDark)}
                      maxLength={12}
                      placeholder="Phone number"
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step-2"
                  className="space-y-5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Password *</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        placeholder="Create password"
                        minLength={8}
                        required
                        className="w-full pl-11 pr-12 py-3 rounded-xl text-sm bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-white/10 text-white outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {formData.password && (() => {
                      const { score, strength } = passwordState;
                      const label = validatingPassword ? 'Checking...' : strength;
                      const color = getStrengthColor(strength);
                      return (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                className="h-1 flex-1 rounded-full transition-all duration-300"
                                style={{ background: i <= Number(score || 0) ? color : 'rgba(255,255,255,0.1)' }}
                              />
                            ))}
                          </div>
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs font-medium" style={{ color }}>{label}</span>
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                              <span className={formData.password.length >= 8 ? 'text-emerald-400' : ''}>✓ 8+ chars</span>
                              <span className={/[0-9]/.test(formData.password) ? 'text-emerald-400' : ''}>✓ number</span>
                              <span className={/[^a-zA-Z0-9]/.test(formData.password) ? 'text-emerald-400' : ''}>✓ special</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Confirm *</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-400 transition-colors" />
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => updateField('confirmPassword', e.target.value)}
                        placeholder="Confirm password"
                        required
                        className="w-full pl-11 pr-12 py-3 rounded-xl text-sm bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-white/10 text-white outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step-3"
                  className="space-y-5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">Account Type</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ACCOUNT_OPTIONS.map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => updateField('role', opt.val)}
                          className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 w-full min-h-[190px] sm:min-h-[205px] flex flex-col ${
                            formData.role === opt.val
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <opt.icon className="h-8 w-8 text-white" />
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                formData.role === opt.val ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-slate-400'
                              }`}
                            >
                              {opt.badge}
                            </span>
                          </div>
                          <div className={`font-bold text-base mb-1 ${formData.role === opt.val ? 'text-emerald-400' : 'text-white'}`}>
                            {opt.label}
                          </div>
                          <div className="text-xs text-slate-400 leading-relaxed flex-1">{opt.description}</div>
                          {formData.role === opt.val && (
                            <div className="mt-3 flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                              <Check className="h-3.5 w-3.5" /> Selected
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 bg-white/5 rounded-xl border border-white/10">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-emerald-500 cursor-pointer flex-shrink-0"
                    />
                    <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed cursor-pointer">
                      By creating an account, you agree to our{' '}
                      <a href="/terms" target="_blank" className="text-emerald-400 hover:underline" rel="noreferrer">Terms of Service</a>
                      {' '}and{' '}
                      <a href="/privacy" target="_blank" className="text-emerald-400 hover:underline" rel="noreferrer">Privacy Policy</a>.
                    </label>
                  </div>

                  <Divider label="Or sign up with Google" />
                  <GoogleSignInCard
                    role={formData.role}
                    onRoleChange={(role) => updateField('role', role)}
                    onSuccess={handleGoogleSignIn}
                    onError={() => setError('Google sign-in was cancelled or blocked.')}
                    disabled={loading}
                    title="Create your account with Google"
                    subtitle="For new users, the selected role becomes the default account type."
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`grid gap-3 ${step === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-full py-3.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all"
                >
                  <span className="inline-flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </span>
                </button>
              )}
              {step < 3 ? (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleNext}
                  className="btn-primary w-full py-3.5 text-sm font-bold"
                >
                  <span className="inline-flex items-center gap-2">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleCreateAccount}
                  disabled={loading || !passwordState.valid}
                  className="btn-primary w-full py-3.5 text-sm font-bold"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Create Account'}
                </motion.button>
              )}
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const Divider = ({ label }) => (
  <div className="flex items-center gap-3">
    <div className="h-px flex-1 bg-white/10" />
    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</span>
    <div className="h-px flex-1 bg-white/10" />
  </div>
);

export default Register;
