import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import PhoneInput from '@/components/shared/PhoneInput';
import loginImg from '/asset/login4.png';
import logomain from '/asset/whitelogo.png';

const inputStyle = () => ({
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  color: '#fff',
});

const Field = ({ label, children, required, hint }) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">
      {label}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
    <div className="relative">{children}</div>
    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{hint}</p>
  </div>
);

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const isDark = true; // Force dark mode for register page

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    countryCode: '+91',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'Child',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      fullPhone,
    );

    if (result.success) {
      navigate('/login', { replace: true, state: { message: 'Registration successful. Please sign in.' } });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-950 py-12">
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
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="h-12 mb-6 flex justify-center">
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Full Name <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input
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
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full pl-11 pr-4 py-3 rounded-xl text-sm bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-white/10 text-white outline-none transition-all"
                />
              </div>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password *</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    placeholder="Create password"
                    minLength={6}
                    required
                    className="w-full pl-11 pr-12 py-3 rounded-xl text-sm bg-white/5 border border-white/10 focus:border-emerald-500/50 focus:bg-white/10 text-white outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Confirm *</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'Master', label: 'Be a Master', sub: 'Share trades', color: '#00C896' },
                  { val: 'Child', label: 'Copy Trades', sub: 'Follow others', color: '#00A878' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => updateField('role', opt.val)}
                    className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                      formData.role === opt.val 
                        ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className={`font-bold text-sm ${formData.role === opt.val ? 'text-emerald-400' : 'text-white'}`}>{opt.label}</div>
                    <div className="text-[10px] mt-0.5 text-slate-400 uppercase tracking-wider">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden relative group mt-2"
              style={{ 
                background: 'linear-gradient(90deg, #00C896 0%, #00A878 100%)',
                boxShadow: '0 8px 20px -4px rgba(0,200,150,0.4)' 
              }}
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out skew-x-[-20deg]" />
              {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : 'Create Account'}
            </motion.button>
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

export default Register;
