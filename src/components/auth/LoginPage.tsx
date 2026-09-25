import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme, toggleTheme } = useFinancial();
  const isDark = actualTheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setEmailError('Please enter your work email.'); return; }
    setEmailError('');
    setIsLoading(true);
    setTimeout(() => navigate('/'), 600);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: isDark ? '#111312' : '#FFFFFF',
        color: isDark ? '#F4F5F2' : '#0F172A',
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* ── Top Nav ── */}
      <nav
        className="flex items-center justify-between px-6 lg:px-10 h-14 shrink-0"
        style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9'}` }}
      >
        {/* Logo */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5 select-none">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="lp-a" x1="20" y1="20" x2="80" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#EA580C" />
                </linearGradient>
                <linearGradient id="lp-b" x1="40" y1="30" x2="70" y2="55" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FB923C" />
                  <stop offset="100%" stopColor="#F97316" />
                </linearGradient>
              </defs>
              <path d="M 28 52 C 28 42 76 36 78 44" stroke="url(#lp-a)" strokeWidth="2.5" strokeLinecap="round" opacity="0.4" />
              <path d="M 42 54 C 42 66 44 76 49 76 C 54 76 55 68 55 58 Z" fill="url(#lp-b)" />
              <rect x="42" y="44" width="3.5" height="9" rx="1.2" fill="white" opacity="0.9" />
              <rect x="47" y="38" width="3.5" height="15" rx="1.2" fill="white" opacity="0.9" />
              <rect x="52" y="31" width="3.5" height="22" rx="1.2" fill="white" opacity="0.9" />
              <path d="M 40 40 C 37 32 40 22 52 19 C 64 16 74 18 73 24 C 72 30 58 35 48 38 C 42 40 38 46 41 53 C 44 58 54 56 63 48 C 65 46 68 47 67 50 C 62 58 48 64 42 58 C 37 53 38 45 40 40 Z" fill="url(#lp-a)" />
            </svg>
            <span
              className="font-black text-[16px] tracking-[0.18em]"
              style={{ color: isDark ? '#F4F5F2' : '#0F172A' }}
            >
              FINVORA
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6">
            {['Product', 'Solutions', 'About'].map(item => (
              <button
                key={item}
                className="text-sm flex items-center gap-1"
                style={{ color: isDark ? '#6E7570' : '#64748B' }}
              >
                {item}
                <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 16 16">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg transition-colors"
            style={{
              color: isDark ? '#6E7570' : '#64748B',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'transparent',
            }}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => navigate('/')}
            className="text-sm font-medium flex items-center gap-1"
            style={{ color: isDark ? '#A6ADA8' : '#374151' }}
          >
            Back to home
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </nav>

      {/* ── Main body ── */}
      <div className="flex-1 grid lg:grid-cols-2" style={{ minHeight: 0 }}>

        {/* LEFT: Form */}
        <div className="flex items-center justify-start px-10 sm:px-16 lg:px-20 xl:px-28 py-16">
          <div className="w-full max-w-[360px]">

            {/* Eyebrow */}
            <p
              className="text-xs font-semibold tracking-[0.18em] uppercase mb-5"
              style={{ color: '#F97316' }}
            >
              Financial Intelligence, Simplified
            </p>

            {/* Headline */}
            <h1
              className="text-[38px] sm:text-[44px] font-extrabold tracking-tight leading-[1.05] mb-3"
              style={{ color: isDark ? '#F4F5F2' : '#0F172A' }}
            >
              Clarity for every<br /><span style={{ color: '#F97316', fontFamily: "'Great Vibes', cursive", fontStyle: 'normal', fontSize: '1.3em', lineHeight: 1.1 }}>financial decision.</span>
            </h1>

            {/* Subline */}
            <p className="text-[15px] mb-8" style={{ color: isDark ? '#6E7570' : '#64748B' }}>
              Sign in to your FINVORA workspace.
            </p>

            {/* Form */}
            <form onSubmit={handleSignIn} noValidate className="space-y-4">

              {/* Email */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: isDark ? '#A6ADA8' : '#374151' }}
                >
                  Work email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: isDark ? '#1A1D1B' : '#FFFFFF',
                    border: `1.5px solid ${emailError ? '#F43F5E' : isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                    color: isDark ? '#F4F5F2' : '#0F172A',
                  }}
                />
                {emailError && <p className="mt-1 text-xs" style={{ color: '#F43F5E' }}>{emailError}</p>}
              </div>

              {/* Password */}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: isDark ? '#A6ADA8' : '#374151' }}
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded-lg px-4 py-3 pr-11 text-sm outline-none transition-all"
                    style={{
                      background: isDark ? '#1A1D1B' : '#FFFFFF',
                      border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                      color: isDark ? '#F4F5F2' : '#0F172A',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: isDark ? '#6E7570' : '#94A3B8' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setRememberMe(v => !v)}
                    className="w-4 h-4 rounded flex items-center justify-center transition-colors cursor-pointer"
                    style={{
                      background: rememberMe ? '#F97316' : isDark ? '#1A1D1B' : '#FFFFFF',
                      border: `1.5px solid ${rememberMe ? '#F97316' : isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1'}`,
                    }}
                  >
                    {rememberMe && (
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm" style={{ color: isDark ? '#A6ADA8' : '#374151' }}>Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#F97316' }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign in */}
              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg font-bold text-sm text-white transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                style={{
                  background: '#F97316',
                  boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
                }}
              >
                {isLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                )}
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {/* Sign up */}
            <p className="mt-5 text-center text-sm" style={{ color: isDark ? '#6E7570' : '#64748B' }}>
              New to FINVORA?{' '}
              <button
                className="font-semibold"
                style={{ color: '#F97316' }}
              >
                Create an account
              </button>
            </p>
          </div>
        </div>

        {/* RIGHT: Laptop photo — full half cover */}
        <div className="hidden lg:block relative overflow-hidden" style={{ minHeight: '100%' }}>
          <img
            src="/login-laptop.jpg"
            alt="FINVORA dashboard on MacBook Pro"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
};
