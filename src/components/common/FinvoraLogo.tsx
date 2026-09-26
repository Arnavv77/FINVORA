import React from 'react';
import { useFinancial } from '../../context/FinancialContext';

interface FinvoraLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

export const FinvoraLogo: React.FC<FinvoraLogoProps> = ({
  size = 'md',
  showWordmark = true,
  showTagline = false,
  className = '',
  wordmarkClassName = ''
}) => {
  const { actualTheme } = useFinancial();
  const isLight = actualTheme === 'light';

  // Dimension mapping
  const iconDimensions = {
    sm: { width: 28, height: 28 },
    md: { width: 34, height: 34 },
    lg: { width: 44, height: 44 },
    xl: { width: 56, height: 56 }
  }[size];

  const wordmarkSizes = {
    sm: 'text-sm tracking-[0.18em]',
    md: 'text-[17px] tracking-[0.2em]',
    lg: 'text-2xl tracking-[0.22em]',
    xl: 'text-3xl tracking-[0.24em]'
  }[size];

  const taglineSizes = {
    sm: 'text-[9px] tracking-[0.22em]',
    md: 'text-[10px] tracking-[0.24em]',
    lg: 'text-xs tracking-[0.26em]',
    xl: 'text-sm tracking-[0.28em]'
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Stylized Ribbon 'F' Emblem with Chart Bars & Orbit Ring */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={iconDimensions.width}
          height={iconDimensions.height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_2px_8px_rgba(37,99,235,0.25)] transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            {/* Top ribbon: Bright Cyan to Vibrant Royal Blue */}
            <linearGradient id="fl-ribbon-top" x1="20" y1="20" x2="80" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>

            {/* Mid ribbon fold: Royal Blue to Indigo to Purple */}
            <linearGradient id="fl-ribbon-mid" x1="40" y1="30" x2="70" y2="55" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>

            {/* Lower Stem: Deep Indigo to Violet-Purple */}
            <linearGradient id="fl-ribbon-bot" x1="40" y1="50" x2="55" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>

            {/* Orbital Ring: Mint Emerald to Neon Cyan */}
            <linearGradient id="fl-orbit" x1="25" y1="55" x2="75" y2="45" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="60%" stopColor="#22D3EE" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            {/* 3D Bar Chart Gradient */}
            <linearGradient id="fl-bar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#CFFAFE" />
            </linearGradient>

            {/* Sparkle glow filter */}
            <filter id="fl-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Orbital Ring (Back segment) */}
          <path
            d="M 28 52 C 28 42 76 36 78 44"
            stroke="url(#fl-orbit)"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.5"
          />

          {/* Lower Ribbon Stem (Purple / Indigo base) */}
          <path
            d="M 42 54 C 42 66 44 76 49 76 C 54 76 55 68 55 58 Z"
            fill="url(#fl-ribbon-bot)"
          />

          {/* 3 Rising Bar Chart Pillars (Inside F loop) */}
          <rect x="42" y="44" width="3.5" height="9" rx="1.2" fill="url(#fl-bar)" />
          <rect x="47" y="38" width="3.5" height="15" rx="1.2" fill="url(#fl-bar)" />
          <rect x="52" y="31" width="3.5" height="22" rx="1.2" fill="url(#fl-bar)" />

          {/* Main 'F' Ribbon Structure */}
          <path
            d="M 40 40 C 37 32 40 22 52 19 C 64 16 74 18 73 24 C 72 30 58 35 48 38 C 42 40 38 46 41 53 C 44 58 54 56 63 48 C 65 46 68 47 67 50 C 62 58 48 64 42 58 C 37 53 38 45 40 40 Z"
            fill="url(#fl-ribbon-top)"
          />

          {/* Mid Fold Shade & Transition */}
          <path
            d="M 48 38 C 58 35 72 30 73 24 C 68 28 54 34 46 41 C 41 45 42 51 44 54 C 42 48 43 42 48 38 Z"
            fill="url(#fl-ribbon-mid)"
            opacity="0.9"
          />

          {/* Orbital Ring (Front segment) */}
          <path
            d="M 26 53 C 24 59 40 64 68 55 C 75 52 79 47 77 44"
            stroke="url(#fl-orbit)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Sparkle Star 1: Top Right of 'F' */}
          <path
            d="M 77 20 Q 77 24 81 24 Q 77 24 77 28 Q 77 24 73 24 Q 77 24 77 20 Z"
            fill="#22D3EE"
            filter="url(#fl-glow)"
          />
          <circle cx="77" cy="24" r="1.2" fill="#FFFFFF" />

          {/* Sparkle Star 2: Accent Diamond */}
          <path
            d="M 32 48 L 33.5 50.5 L 36 52 L 33.5 53.5 L 32 56 L 30.5 53.5 L 28 52 L 30.5 50.5 Z"
            fill="#34D399"
            opacity="0.85"
          />
        </svg>
      </div>

      {/* Typography: Wordmark + Tagline */}
      {showWordmark && (
        <div className="flex flex-col">
          <div className="flex items-center">
            {/* FINVORA Wordmark with signature diamond star inside 'A' */}
            <span
              className={`font-black font-sans leading-none ${wordmarkSizes} ${
                wordmarkClassName || (isLight ? 'text-[#0F172A]' : 'text-[#F4F5F2]')
              }`}
            >
              FINVOR
            </span>
            {/* Stylized 'A' with cyan 4-point diamond star */}
            <div className="relative inline-flex items-center justify-center">
              <span
                className={`font-black font-sans leading-none ${wordmarkSizes} ${
                  wordmarkClassName || (isLight ? 'text-[#0F172A]' : 'text-[#F4F5F2]')
                }`}
              >
                A
              </span>
              <span className="absolute bottom-[2px] right-0 translate-x-[2px] text-cyan-400 text-[10px] leading-none animate-pulse">
                ✦
              </span>
            </div>
          </div>

          {showTagline && (
            <span
              className={`font-medium uppercase text-[var(--text-secondary)] mt-1 ${taglineSizes}`}
            >
              Your Goals <span className="text-cyan-400 mx-0.5">✦</span> Our Analytics
            </span>
          )}
        </div>
      )}
    </div>
  );
};
