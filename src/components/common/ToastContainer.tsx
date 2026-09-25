import React from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useFinancial();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map(toast => {
        let border = 'border-emerald-300 dark:border-emerald-500/40 bg-white/95 dark:bg-[#1D1C19]/95 text-emerald-800 dark:text-emerald-200';
        let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />;

        if (toast.type === 'warning') {
          border = 'border-amber-300 dark:border-amber-500/40 bg-white/95 dark:bg-[#1D1C19]/95 text-amber-800 dark:text-amber-200';
          icon = <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
        } else if (toast.type === 'error') {
          border = 'border-rose-300 dark:border-rose-500/40 bg-white/95 dark:bg-[#1D1C19]/95 text-rose-800 dark:text-rose-200';
          icon = <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />;
        } else if (toast.type === 'info') {
          border = 'border-sky-300 dark:border-sky-500/40 bg-white/95 dark:bg-[#1D1C19]/95 text-sky-800 dark:text-sky-200';
          icon = <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-5 duration-200 ${border}`}
          >
            {icon}
            <div className="text-xs font-medium leading-relaxed flex-1 text-[var(--text-primary)]">
              {toast.message}
            </div>
          </div>
        );
      })}
    </div>
  );
};
