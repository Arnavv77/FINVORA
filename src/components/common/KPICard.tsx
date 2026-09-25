import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  change?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  to?: string;
  alertLevel?: 'none' | 'warning' | 'critical';
  onClick?: () => void;
  exactValueTooltip?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  to,
  alertLevel = 'none',
  onClick,
  exactValueTooltip
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) onClick();
    if (to) navigate(to);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (to || onClick) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    }
  };

  const isClickable = Boolean(to || onClick);
  const isCritical = alertLevel === 'critical';
  const isWarning = alertLevel === 'warning';

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      tabIndex={isClickable ? 0 : undefined}
      role={isClickable ? 'button' : undefined}
      title={exactValueTooltip || `${title}: ${value}`}
      className={`group relative p-5 rounded-2xl glass-card overflow-hidden flex flex-col justify-between h-[142px] sm:h-[150px] outline-none ${
        isCritical
          ? 'border-rose-500/35 dark:border-rose-500/45 shadow-[0_0_24px_rgba(244,63,94,0.09)] hover:border-rose-500/65 hover:shadow-[0_0_36px_rgba(244,63,94,0.22)]'
          : isWarning
          ? 'border-amber-500/35 dark:border-amber-500/45 shadow-[0_0_24px_rgba(245,158,11,0.08)] hover:border-amber-500/65 hover:shadow-[0_0_36px_rgba(245,158,11,0.2)]'
          : 'hover:border-[var(--accent-border)]'
      } ${
        isClickable
          ? 'cursor-pointer focus-visible:ring-2 focus-visible:ring-[var(--accent)]'
          : ''
      }`}
    >
      {/* Touch of Red Light for Alert Cards */}
      {isCritical && (
        <>
          {/* Ambient red light glow in top corner */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-rose-500/15 dark:bg-rose-500/25 blur-2xl" />
          {/* Subtle translucent red light wash */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-rose-500/[0.07] via-rose-500/[0.02] to-transparent" />
          {/* Subtle top edge red light glow */}
          <div className="pointer-events-none absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
        </>
      )}

      {/* Touch of Amber Light for Warning Cards */}
      {isWarning && (
        <>
          <div className="pointer-events-none absolute -top-10 -right-10 w-36 h-36 rounded-full bg-amber-500/15 dark:bg-amber-500/20 blur-2xl" />
          <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent" />
          <div className="pointer-events-none absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </>
      )}

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between">
        <span className={`text-[12px] font-medium tracking-wide ${isCritical ? 'text-rose-600 dark:text-rose-300' : 'text-[var(--text-secondary)]'}`}>
          {title}
        </span>
        {icon && (
          <div
            className={`p-1.5 rounded-lg border transition-colors ${
              isCritical
                ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.18)]'
                : isWarning
                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.18)]'
                : 'bg-[var(--surface-muted)] text-[var(--text-secondary)] border-[var(--divider)]'
            }`}
          >
            {icon}
          </div>
        )}
      </div>

      {/* Main KPI Value */}
      <div className="relative z-10 my-auto">
        <div className="text-[28px] sm:text-[32px] font-bold tracking-tight text-[var(--text-primary)] tabular-nums font-sans leading-none">
          {value}
        </div>
      </div>

      {/* Footer line */}
      <div className="relative z-10 flex items-center justify-between gap-2 text-xs pt-1">
        <span className="text-[var(--text-secondary)] text-[12px] truncate">
          {subtitle}
        </span>

        {change && (
          <span
            className={`inline-flex items-center font-medium px-1.5 py-0.5 rounded text-[11px] tabular-nums shrink-0 border ${
              change.isPositive
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/60 dark:border-emerald-800/50'
                : 'text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/60 dark:border-rose-800/50'
            }`}
          >
            {change.isPositive ? (
              <ArrowUpRight className="w-3 h-3 mr-0.5" />
            ) : (
              <ArrowDownRight className="w-3 h-3 mr-0.5" />
            )}
            {change.value}
          </span>
        )}

        {isCritical && !change && (
          <span className="inline-flex items-center text-rose-700 bg-rose-500/10 border border-rose-500/30 dark:text-rose-300 dark:bg-rose-500/20 dark:border-rose-500/40 font-medium text-[11px] px-2 py-0.5 rounded-full gap-1 shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            Action required
          </span>
        )}
      </div>
    </div>
  );
};
