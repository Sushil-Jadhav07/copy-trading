import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Phone, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import PhoneInput from '@/components/shared/PhoneInput';
const loginImg = '/asset/login4.png';
const logomain = '/asset/logomain.png';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+1',  flag: '🇺🇸', name: 'USA' },
  { code: '+44', flag: '🇬🇧', name: 'UK' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+65', flag: '🇸🇬', name: 'Singapore' },
  { code: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
];

const inputStyle = (isDark) => ({
  background: isDark ? 'rgba(19,27,23,0.92)' : 'rgba(248, 250, 252, 0.8)',
  border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(226, 232, 240, 0.8)',
  boxShadow: isDark
    ? 'inset 0 1px 2px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.03)'
    : 'inset 0 1px 2px rgba(0, 0, 0, 0.02)',
});

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({
    firstName: '', middleName: '', lastName: '',
    email: '', countryCode: '+91', phone: '',
    password: '', confirmPassword: '', role: 'Child',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCountryDrop, setShowCountryDrop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCountry = COUNTRY_CODES.find(c => c.code === formData.countryCode) || COUNTRY_CODES[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ');
    const fullPhone = `${formData.countryCode}${formData.phone}`;

    const result = await register(fullName, formData.email, formData.password, formData.confirmPassword, formData.role, fullPhone);

    if (result.success) {
      navigate('/login', { replace: true, state: { message: 'Registration successful. Please sign in.' } });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const Field = ({ label, icon: Icon, children, required, hint }) => (
    <div>
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <div className="relative">{children}</div>
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* Left image panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={loginImg} alt="Trading Platform" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/42" />
        <div className="absolute top-8 left-8 z-10">
          <div className="h-14"><img src={logomain} alt="Logo" className="h-full w-auto object-contain" /></div>
        </div>
        <div className="absolute bottom-12 left-8 right-8 z-10">
          <h2 className="text-white text-3xl font-bold leading-tight drop-shadow-lg">
            Join the future<br />of Copy Trading.
          </h2>
          <p className="text-white/70 mt-2 text-sm">Copy top strategies. Trade smarter.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative overflow-hidden px-4 py-8 sm:px-6"
        style={{ background: isDark ? undefined : 'linear-gradient(135deg, #f0f4fa 0%, #ffffff 50%, #eef2f8 100%)' }}>
        <div className="absolute inset-0 pointer-events-none lg:hidden">
          <img src={loginImg} alt="Trading Platform" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/28 via-black/52 to-black/84" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#07110d] via-[#07110d]/70 to-transparent" />
        </div>
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: isDark ? 'rgba(0,200,150,0.06)' : 'rgba(0,200,150,0.08)', filter: 'blur(48px)' }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: isDark ? 'rgba(16,185,129,0.05)' : 'rgba(16,185,129,0.06)', filter: 'blur(48px)' }} />
        <motion.div
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-md py-4 lg:max-w-xl"
        >
          <div className="relative overflow-hidden rounded-2xl border p-6 sm:p-8 lg:p-7"
            style={{
              background: isDark ? 'linear-gradient(180deg, rgba(12,18,15,0.94) 0%, rgba(10,15,13,0.92) 100%)' : 'rgba(255,255,255,0.94)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.09)',
              boxShadow: isDark
                ? '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)'
                : '0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
            }}>
            <div className="absolute inset-0 pointer-events-none lg:hidden bg-[#0a100d]/70" />

            <div className="relative z-10 mb-5 lg:mb-4">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Create account</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Start your trading journey today.</p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="relative z-10 mb-4 p-3 bg-red-500/15 border border-red-500/35 rounded-xl text-red-500 dark:text-red-400 text-sm">
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="relative z-10 space-y-4 lg:space-y-3.5">
              {/* Name row */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-2">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input type="text" value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="First Name" required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                      style={inputStyle(isDark)} />
                  </div>
                  <input type="text" value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    placeholder="Middle Name"
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                    style={inputStyle(isDark)} />
                  <input type="text" value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Last Name" required
                    className="w-full px-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                    style={inputStyle(isDark)} />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Middle name is optional</p>
              </div>

              {/* Email */}
              <Field label="Email" required>
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input type="email" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                  style={inputStyle(isDark)} required />
              </Field>
              
              {/* Phone with country code */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(digits) => setFormData({ ...formData, phone: digits })}
                  countryCode={formData.countryCode}
                  onCountryChange={(code) => setFormData({ ...formData, countryCode: code })}
                  inputStyle={inputStyle(isDark)}
                  maxLength={12}
                  placeholder="Phone number"
                />
              </div>

              {/* Password */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-3">
                <Field label="Password" required>
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input type={showPassword ? 'text' : 'password'} value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Create a password" minLength={6} required
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                    style={inputStyle(isDark)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>

                <Field label="Confirm Password" required>
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input type={showConfirm ? 'text' : 'password'} value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password" required
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-300/70 outline-none focus:ring-2 focus:ring-emerald-500/40 transition-all"
                    style={inputStyle(isDark)} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </Field>
              </div>

              {/* Role selector */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">I want to</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'Master', label: 'Be a Master', sub: 'Share your trades', color: '#059669' },
                    { val: 'Child', label: 'Copy Trades', sub: 'Follow top traders', color: '#10b981' },
                  ].map(opt => (
                    <button key={opt.val} type="button"
                      onClick={() => setFormData({ ...formData, role: opt.val })}
                      className="rounded-xl border px-3 py-3 text-center text-sm font-medium transition-all"
                      style={formData.role === opt.val
                        ? { background: opt.color, border: `1px solid ${opt.color}`, color: '#fff' }
                        : { ...inputStyle(isDark), color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-xs mt-0.5 opacity-75">{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(90deg, #059669, #10b981)', boxShadow: '0 3px 14px rgba(16,185,129,0.30)' }}>
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <p className="relative z-10 mt-5 text-center text-sm text-slate-600 dark:text-slate-200">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
