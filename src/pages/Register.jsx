import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, Phone, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import loginImg from '@/asset/login4.png';
import logomain from '@/asset/logomain.png';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'Child',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.role,
      formData.phone
    );

    if (result.success) {
      navigate('/login', {
        replace: true,
        state: {
          message: 'Registration successful. Please sign in with your new account.',
        },
      });
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-background">
      {/* ── LEFT PANEL – Image ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={loginImg}
          alt="AlgoDelta Trading"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />

      
          {/* Logo top-left */}
                  <div className="absolute top-8 left-8 flex items-center gap-3 z-10">
                    <div className="w-full h-16 flex-shrink-0">
                                <img src={logomain} alt="Logo" className="w-full h-full object-contain" />
                              </div>
                  </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-12 left-8 right-8 z-10">
          <h2 className="text-foreground text-3xl font-bold leading-tight drop-shadow-lg">
            Join the future<br />of Copy trading.
          </h2>
          <p className="text-white/70 mt-2 text-sm">
            Copy top strategies. Trade smarter.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL – Glassmorphism Form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden px-4 py-8 sm:px-6">
        {/* Background orbs */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-brand-purple/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-brand-blue/20 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-teal/10 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md px-0 sm:px-2 py-6 sm:py-10 relative z-10"
        >
          {/* Glass Card */}
          <div
            className="rounded-2xl p-5 sm:p-8 border border-black/10 dark:border-white/10"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}
          >
            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Create account</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Start your trading journey today.</p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-brand-purple/60"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-brand-purple/60"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-brand-purple/60"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Create a password"
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl text-sm text-foreground placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-brand-purple/60"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your password"
                    className="w-full pl-10 pr-12 py-2.5 rounded-xl text-sm text-foreground placeholder-slate-500 outline-none transition-all focus:ring-1 focus:ring-brand-purple/60"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">I want to</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'Master' })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all border ${
                      formData.role === 'Master'
                        ? 'bg-brand-purple border-brand-purple text-foreground shadow-lg shadow-brand-purple/30'
                        : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-white/20 hover:text-foreground'
                    }`}
                    style={formData.role !== 'Master' ? { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)' } : {}}
                  >
                    Be a Master
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, role: 'Child' })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all border ${
                      formData.role === 'Child'
                        ? 'bg-brand-blue border-brand-blue text-foreground shadow-lg shadow-brand-blue/30'
                        : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-white/20 hover:text-foreground'
                    }`}
                    style={formData.role !== 'Child' ? { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)' } : {}}
                  >
                    Copy Trades
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-foreground font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(90deg, #7c3aed, #2563eb, #0ea5e9)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
                }}
              >
                {loading ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            {/* Login link */}
            <p className="mt-5 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-blue hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
