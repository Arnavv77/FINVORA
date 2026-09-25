import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronRight, Play, Layers, Sun, Moon } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { actualTheme, toggleTheme } = useFinancial();
  const isDark = actualTheme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError('Please enter your work email.');
      return;
    }
    setEmailError('');
    setIsLoading(true);
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  const handleDemoSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      navigate('/');
    }, 300);
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden font-sans select-none bg-slate-950">
      {/* ── Panoramic Landscape Background ── */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: "url('/images/login-hero-bg.jpg')",
          backgroundPosition: 'center 40%',
        }}
      >
        {/* Cinematic dark gradient overlays to ensure razor-sharp text and card readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/70 backdrop-blur-[0.5px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      </div>

      {/* ── Top Subtle Bar ── */}
      <header className="relative z-10 w-full px-6 sm:px-12 lg:px-16 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/40">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-base tracking-[0.16em] text-white">
            FINVORA
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-full text-white/70 hover:text-white bg-black/30 hover:bg-black/50 backdrop-blur-md border border-white/10 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Main Content: 2-Column Responsive Layout ── */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        
        {/* ── LEFT: Hero Value Proposition & Telemetry ── */}
        <div className="w-full lg:max-w-xl xl:max-w-2xl flex flex-col space-y-6 lg:space-y-8 text-left">
          
          {/* Active Pipeline Status Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/50 hover:bg-black/60 backdrop-blur-md border border-white/15 text-xs text-white/90 shadow-sm w-fit transition-all">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            </span>
            <span className="font-medium tracking-tight">
              Predictive AI Engine Active • Monitoring ₹1.84 Cr Cash Pipeline
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-white tracking-tight leading-[1.08] drop-shadow-md">
            Turn Financial Data Into <span className="text-white">Foresight.</span>
          </h1>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-base lg:text-lg text-white/85 leading-relaxed font-normal max-w-xl drop-shadow-sm">
            Detect emerging risks, predict financial impact, simulate decisions, and turn financial intelligence into informed action.
          </p>

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/40 hover:shadow-blue-600/60 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Explore FINVORA</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => document.getElementById('login-email')?.focus()}
              className="px-6 py-3 rounded-full font-semibold text-sm text-white/90 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-md transition-all cursor-pointer active:scale-95"
            >
              Sign In
            </button>
          </div>

          {/* 3 Metrics Stats Row */}
          <div className="grid grid-cols-3 gap-6 pt-8 lg:pt-10 border-t border-white/20 max-w-lg">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                ₹24.6L
              </div>
              <div className="text-[11px] sm:text-xs text-white/75 font-medium">
                Active Working Capital
              </div>
            </div>
            <div className="space-y-1 border-l border-white/20 pl-6">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                30 Days
              </div>
              <div className="text-[11px] sm:text-xs text-white/75 font-medium">
                Predictive Horizon
              </div>
            </div>
            <div className="space-y-1 border-l border-white/20 pl-6">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                94.2%
              </div>
              <div className="text-[11px] sm:text-xs text-white/75 font-medium">
                Decision Confidence
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT: Glassmorphic Login Card ── */}
        <div className="w-full max-w-[420px] shrink-0">
          <div className="relative rounded-3xl p-7 sm:p-8 bg-[#1e2330]/80 dark:bg-[#141824]/85 backdrop-blur-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.5)] space-y-6">
            
            {/* Header: Logo & Titles */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/50">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="font-extrabold text-xs tracking-[0.18em] text-white">
                  FINVORA
                </span>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Welcome to FINVORA
                </h2>
                <p className="text-xs text-white/65 mt-1 font-normal">
                  Your Finance Intelligence Workspace
                </p>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              {/* Username / Email */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-email"
                  className="text-xs font-semibold text-white/80 block"
                >
                  Username / Work Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  placeholder="Enter your work email"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/40 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all"
                />
                {emailError && (
                  <p className="text-[11px] text-rose-400 font-medium pl-0.5">{emailError}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-white/80 block"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/40 border border-white/15 text-white placeholder:text-white/40 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/45 hover:text-white/80 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-right pt-0.5">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/40 hover:shadow-blue-600/60 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-white/15" />
              <span className="absolute px-3 bg-[#1e2330] text-[10px] uppercase font-bold tracking-widest text-white/40">
                OR
              </span>
            </div>

            {/* Continue with Demo Button */}
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/95 hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] shadow-sm"
            >
              <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
              <span>Continue with Demo</span>
            </button>

            {/* Feature Checklist */}
            <div className="space-y-2 pt-2 border-t border-white/10 text-[11px] text-white/80 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                <span>Risk Intelligence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
                <span>Cash Forecasting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]" />
                <span>Decision Automation</span>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* ── Bottom Minimal Footer ── */}
      <footer className="relative z-10 w-full px-6 py-4 text-center text-[11px] text-white/50">
        © 2026 FINVORA Intelligence Inc. All rights reserved. Enterprise-grade autonomous decision support.
      </footer>
    </div>
  );
};
