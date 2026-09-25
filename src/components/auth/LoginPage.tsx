import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronRight, Play, Layers } from 'lucide-react';
import { FinvoraLogo } from '../common/FinvoraLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

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
      {/* ── High-Resolution Photorealistic Landscape Background ── */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: "url('/images/login-hero-bg.jpg')",
          backgroundPosition: 'center center',
        }}
      >
        {/* Subtle, soft cinematic vignette so mountains and landscape stay vividly visible through glass */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/15 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/25" />
      </div>

      {/* ── Top Bar: FINVORA Logo on Top Right, Theme Toggle Removed ── */}
      <header className="relative z-10 w-full px-6 sm:px-12 lg:px-16 pt-7 flex items-center justify-between">
        <div /> {/* Invisible spacer to push logo cleanly to the top-right */}

        {/* Top-Right Official FINVORA Logo */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105 active:scale-95"
          title="FINVORA Home"
        >
          <FinvoraLogo
            size="md"
            wordmarkClassName="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] tracking-[0.2em]"
            showWordmark={true}
          />
        </div>
      </header>

      {/* ── Main Content: 2-Column Responsive Layout ── */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        
        {/* ── LEFT: Hero Value Proposition & Telemetry ── */}
        <div className="w-full lg:max-w-xl xl:max-w-2xl flex flex-col space-y-6 lg:space-y-8 text-left">
          
          {/* Active Pipeline Status Pill */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/20 text-xs text-white/95 shadow-lg w-fit transition-all">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            </span>
            <span className="font-medium tracking-tight drop-shadow-sm">
              Predictive AI Engine Active • Monitoring ₹1.84 Cr Cash Pipeline
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black text-white tracking-tight leading-[1.08] drop-shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
            Turn Financial Data Into <span className="text-white">Foresight.</span>
          </h1>

          {/* Subtitle Description */}
          <p className="text-sm sm:text-base lg:text-lg text-white/90 leading-relaxed font-normal max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            Detect emerging risks, predict financial impact, simulate decisions, and turn financial intelligence into informed action.
          </p>

          {/* Action Button Row */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-full font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-600/40 hover:shadow-blue-600/60 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Explore FINVORA</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => document.getElementById('login-email')?.focus()}
              className="px-6 py-3 rounded-full font-semibold text-sm text-white hover:text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              Sign In
            </button>
          </div>

          {/* 3 Metrics Stats Row */}
          <div className="grid grid-cols-3 gap-6 pt-8 lg:pt-10 border-t border-white/20 max-w-lg">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight drop-shadow-md">
                ₹24.6L
              </div>
              <div className="text-[11px] sm:text-xs text-white/80 font-medium drop-shadow-sm">
                Active Working Capital
              </div>
            </div>
            <div className="space-y-1 border-l border-white/20 pl-6">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight drop-shadow-md">
                30 Days
              </div>
              <div className="text-[11px] sm:text-xs text-white/80 font-medium drop-shadow-sm">
                Predictive Horizon
              </div>
            </div>
            <div className="space-y-1 border-l border-white/20 pl-6">
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight drop-shadow-md">
                94.2%
              </div>
              <div className="text-[11px] sm:text-xs text-white/80 font-medium drop-shadow-sm">
                Decision Confidence
              </div>
            </div>
          </div>

        </div>

        {/* ── RIGHT: Ultra-Clear Glassmorphic Login Card ── */}
        <div className="w-full max-w-[420px] shrink-0">
          <div className="relative rounded-3xl p-7 sm:p-8 bg-slate-950/25 hover:bg-slate-950/30 backdrop-blur-xl border border-white/25 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)] space-y-6 transition-all duration-300">
            
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
                <h2 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">
                  Welcome to FINVORA
                </h2>
                <p className="text-xs text-white/75 mt-1 font-normal drop-shadow-sm">
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
                  className="text-xs font-semibold text-white/90 block drop-shadow-sm"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.16] border border-white/20 text-white placeholder:text-white/50 text-xs focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 backdrop-blur-md transition-all shadow-inner"
                />
                {emailError && (
                  <p className="text-[11px] text-rose-400 font-medium pl-0.5">{emailError}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5 text-left">
                <label
                  htmlFor="login-password"
                  className="text-xs font-semibold text-white/90 block drop-shadow-sm"
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
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] focus:bg-white/[0.16] border border-white/20 text-white placeholder:text-white/50 text-xs focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30 backdrop-blur-md transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="text-right pt-0.5">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-[11px] text-blue-300 hover:text-blue-200 font-medium transition-colors cursor-pointer drop-shadow-sm"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              {/* Primary Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/40 hover:shadow-blue-600/60 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            {/* OR Divider with Glass Pill */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-white/20" />
              <span className="absolute px-3 py-0.5 bg-black/40 backdrop-blur-md rounded-full text-[10px] uppercase font-bold tracking-widest text-white/60 border border-white/15">
                OR
              </span>
            </div>

            {/* Continue with Demo Button */}
            <button
              type="button"
              onClick={handleDemoSignIn}
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white hover:text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] shadow-md backdrop-blur-md"
            >
              <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
              <span>Continue with Demo</span>
            </button>

            {/* Feature Checklist */}
            <div className="space-y-2 pt-2 border-t border-white/15 text-[11px] text-white/90 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                <span>Risk Intelligence</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
                <span>Cash Forecasting</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.9)]" />
                <span>Decision Automation</span>
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* ── Bottom Minimal Footer ── */}
      <footer className="relative z-10 w-full px-6 py-4 text-center text-[11px] text-white/60 drop-shadow-sm">
        © 2026 FINVORA Intelligence Inc. All rights reserved. Enterprise-grade autonomous decision support.
      </footer>
    </div>
  );
};
