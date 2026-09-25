import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  ShieldAlert,
  TrendingUp,
  Receipt,
  PieChart,
  Sliders,
  CheckSquare,
  Network,
  Settings,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagneticDock, type DockItemData } from '@/components/ui/magnetic-dock';
import { useFinancial } from '@/context/FinancialContext';

interface FinvoraDockProps {
  className?: string;
  position?: 'bottom' | 'top' | 'left' | 'right';
  iconSize?: number;
  maxScale?: number;
}

export const FinvoraDock: React.FC<FinvoraDockProps> = ({
  className = '',
  position = 'bottom',
  iconSize = 46,
  maxScale = 1.35
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    openCriticalRisksCount,
    proposals,
    invoices,
    budgets
  } = useFinancial();

  const [isExpanded, setIsExpanded] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOverview =
    location.pathname === '/' ||
    location.pathname === '/overview' ||
    location.pathname === '/workspace';

  const pendingProposalsCount = proposals.filter(p => p.status === 'pending_approval').length;
  const pendingInvoicesCount = invoices.filter(inv => inv.status === 'pending_approval').length;
  const overBudgetDepts = budgets.filter(b => b.status === 'over_budget').length;

  // Collapse dock when navigating to another tab (if not overview)
  useEffect(() => {
    if (!isOverview) {
      setIsExpanded(false);
    }
  }, [location.pathname, isOverview]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = null;
    }
    if (!isOverview) {
      setIsExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (isOverview) return;
    collapseTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 350);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    if (path !== '/' && path !== '/overview' && path !== '/workspace') {
      setIsExpanded(false);
    }
  };

  const items: DockItemData[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-5 h-5 text-amber-500 dark:text-amber-400" />,
      onClick: () => handleNavigate('/'),
      isActive: isOverview
    },
    {
      id: 'financial-data',
      label: 'Financial Data',
      icon: <Database className="w-5 h-5 text-sky-500" />,
      onClick: () => handleNavigate('/financial-data'),
      isActive: location.pathname === '/financial-data'
    },
    {
      id: 'risk-anomalies',
      label: 'Risk & Anomalies',
      icon: <ShieldAlert className="w-5 h-5 text-rose-500" />,
      badge: openCriticalRisksCount > 0 ? openCriticalRisksCount : undefined,
      onClick: () => handleNavigate('/risk-anomalies'),
      isActive: location.pathname === '/risk-anomalies'
    },
    {
      id: 'cash-flow',
      label: 'Cash Flow & Forecasting',
      icon: <TrendingUp className="w-5 h-5 text-emerald-500" />,
      onClick: () => handleNavigate('/cash-flow'),
      isActive: location.pathname === '/cash-flow'
    },
    {
      id: 'ap-expenses',
      label: 'AP & Expenses',
      icon: <Receipt className="w-5 h-5 text-amber-500" />,
      badge: pendingInvoicesCount > 0 ? pendingInvoicesCount : undefined,
      onClick: () => handleNavigate('/ap-expenses'),
      isActive: location.pathname === '/ap-expenses'
    },
    {
      id: 'budget-intelligence',
      label: 'Budget Intelligence',
      icon: <PieChart className="w-5 h-5 text-indigo-500" />,
      badge: overBudgetDepts > 0 ? overBudgetDepts : undefined,
      onClick: () => handleNavigate('/budget-intelligence'),
      isActive: location.pathname === '/budget-intelligence'
    },
    {
      id: 'what-if',
      label: 'What-If Simulator',
      icon: <Sliders className="w-5 h-5 text-purple-500" />,
      onClick: () => handleNavigate('/what-if'),
      isActive: location.pathname === '/what-if'
    },
    {
      id: 'decisions-approvals',
      label: 'Decisions & Approvals',
      icon: <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      badge: pendingProposalsCount > 0 ? pendingProposalsCount : undefined,
      onClick: () => handleNavigate('/decisions-approvals'),
      isActive: location.pathname === '/decisions-approvals'
    },
    {
      id: 'data-connections',
      label: 'Data Connections',
      icon: <Network className="w-5 h-5 text-teal-500" />,
      onClick: () => handleNavigate('/data-connections'),
      isActive: location.pathname === '/data-connections'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5 text-stone-500" />,
      onClick: () => handleNavigate('/settings'),
      isActive: location.pathname === '/settings'
    }
  ];

  const currentItem = items.find(i => i.isActive) || items[0];
  const showFullDock = isOverview || isExpanded;

  const urgentBadgeCount =
    (location.pathname !== '/risk-anomalies' ? openCriticalRisksCount : 0) +
    (location.pathname !== '/decisions-approvals' ? pendingProposalsCount : 0);

  return (
    <div
      className={`flex flex-col items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <AnimatePresence mode="wait">
        {showFullDock ? (
          <motion.div
            key="full-dock"
            initial={isOverview ? false : { opacity: 0, y: 16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="flex flex-col items-center"
          >
            {!isOverview && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="mb-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--surface-muted)]/80 hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--divider)] shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Collapse dock to background"
              >
                <span>Collapse</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            )}

            <MagneticDock
              items={items}
              iconSize={iconSize}
              maxScale={maxScale}
              variant="glass"
              position={position}
              magneticDistance={140}
              showLabels={true}
            />
          </motion.div>
        ) : (
          <motion.button
            key="collapsed-pill"
            type="button"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            onClick={() => setIsExpanded(true)}
            onFocus={() => setIsExpanded(true)}
            className="group relative flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[var(--card-bg)]/85 dark:bg-neutral-900/85 backdrop-blur-xl border border-[var(--card-border)] hover:border-amber-500/50 shadow-lg hover:shadow-amber-500/10 transition-all cursor-pointer"
            aria-label="Expand navigation dock"
          >
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/[0.06] to-sky-500/[0.06] opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative flex items-center gap-2 text-xs font-medium text-[var(--text-primary)]">
              <span className="flex items-center justify-center w-5 h-5">
                {currentItem.icon}
              </span>
              <span className="font-semibold tracking-tight">{currentItem.label}</span>
            </div>

            <div className="w-1 h-1 rounded-full bg-[var(--divider)]" />

            <div className="relative flex items-center gap-1 text-[11px] text-[var(--text-muted)] group-hover:text-amber-500 transition-colors">
              <span>Switch tab</span>
              <ChevronUp className="w-3.5 h-3.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>

            {urgentBadgeCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs animate-pulse">
                {urgentBadgeCount}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};
