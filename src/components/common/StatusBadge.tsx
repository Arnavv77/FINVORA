import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', pulse = false }) => {
  const normalized = status.toLowerCase().replace(/\s+/g, '_');

  let bg = 'bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-stone-800/80 dark:text-stone-300 dark:border-stone-700/60';
  let dotColor = 'bg-slate-500 dark:bg-stone-400';

  // Positive statuses
  if (['cleared', 'paid', 'approved', 'executed', 'connected', 'on_track', 'low'].includes(normalized)) {
    bg = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50';
    dotColor = 'bg-emerald-500 dark:bg-emerald-400';
  }
  // Warning / Attention statuses
  else if (['pending', 'pending_approval', 'under_review', 'at_risk', 'warning', 'medium', 'syncing', 'draft'].includes(normalized)) {
    bg = 'bg-amber-50 text-amber-900 border-amber-200/90 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/50';
    dotColor = 'bg-amber-600 dark:bg-amber-400';
  }
  // Critical / Severe statuses
  else if (['flagged', 'on_hold', 'held', 'overdue', 'critical', 'high', 'over_budget', 'rejected', 'error'].includes(normalized)) {
    bg = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/50';
    dotColor = 'bg-rose-600 dark:bg-rose-400';
  }
  // Info / Scheduled
  else if (['scheduled', 'info', 'released', 'resolved'].includes(normalized)) {
    bg = 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/50';
    dotColor = 'bg-sky-500 dark:bg-sky-400';
  }

  const label = status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const padding = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border shadow-sm ${bg} ${padding} tracking-wide whitespace-nowrap`}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`} />
      </span>
      {label}
    </span>
  );
};
