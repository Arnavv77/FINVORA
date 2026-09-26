import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRightLeft,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Building
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { formatINR, formatINRCompact, formatPercent } from '../utils/formatters';
import { DepartmentBudget } from '../types';

export const BudgetIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    budgets,
    reallocateBudget,
    createProposal,
    role,
    showToast
  } = useFinancial();

  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');

  // Reallocation Modal State
  const [isReallocateModalOpen, setIsReallocateModalOpen] = useState(false);
  const [fromDeptId, setFromDeptId] = useState('dept-eng');
  const [toDeptId, setToDeptId] = useState('dept-mktg');
  const [reallocationAmount, setReallocationAmount] = useState<number>(450000);
  const [reallocationReason, setReallocationReason] = useState('Offset Q3 festive customer acquisition overspend using Engineering surplus');

  const filteredBudgets = selectedDeptId === 'all'
    ? budgets
    : budgets.filter(b => b.id === selectedDeptId);

  const totalAllocated = budgets.reduce((acc, b) => acc + b.allocated, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + b.spent, 0);
  const totalRemaining = totalAllocated - totalSpent;
  const overBudgetCount = budgets.filter(b => b.status === 'over_budget').length;

  const handleOpenReallocateModal = (dept?: DepartmentBudget) => {
    if (dept && dept.status === 'over_budget') {
      setToDeptId(dept.id);
    }
    setIsReallocateModalOpen(true);
  };

  const handleReallocateSubmit = () => {
    if (!reallocationAmount || reallocationAmount <= 0) {
      showToast('Please enter a valid transfer amount', 'error');
      return;
    }

    const fromDept = budgets.find(b => b.id === fromDeptId);
    const toDept = budgets.find(b => b.id === toDeptId);

    if (!fromDept || !toDept) return;

    if (fromDept.allocated - fromDept.spent < reallocationAmount) {
      showToast(`Warning: ${fromDept.department} only has ${formatINR(fromDept.allocated - fromDept.spent)} available.`, 'warning');
    }

    // Create a formal proposal in Decisions & Approvals
    createProposal({
      title: `Inter-Department Budget Transfer: ${fromDept.department} → ${toDept.department}`,
      type: 'budget_reallocation',
      severity: 'warning',
      amount: reallocationAmount,
      description: reallocationReason,
      evidence: [
        `${fromDept.department} current surplus is ${formatINR(fromDept.allocated - fromDept.spent)}.`,
        `${toDept.department} current spend is ${formatINR(toDept.spent)} against ${formatINR(toDept.allocated)} allocation.`,
        `Reallocation re-balances ledger without increasing net enterprise expenditure.`
      ],
      expectedImpact: `Directly cures ${toDept.department} overspend red-flag; preserves overall company budget cap.`,
      assumptions: ['Engineering confirms deferred procurement of secondary lab hardware.'],
      confidence: 74.5,
      requestedBy: role === 'manager' ? 'Rajesh Gopinathan (Finance Manager)' : 'Pooja Sharma (Analyst)',
      assignedReviewer: 'Rajesh Gopinathan (Finance Manager / CFO)',
      targetEntityId: toDept.id
    });

    setIsReallocateModalOpen(false);
    navigate('/decisions-approvals');
    showToast('Budget reallocation proposal submitted for sign-off', 'info');
  };

  return (
    <div className="space-y-6">
      {/* Top Budget Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Total Enterprise Budget</span>
            <Building className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {formatINR(totalAllocated)}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">Full Q3 allocation across 6 business units</p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Month-to-Date Spend</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {formatINR(totalSpent)}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            {((totalSpent / totalAllocated) * 100).toFixed(1)}% of total allocated capital consumed
          </p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Remaining Buffer</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatINR(totalRemaining)}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">Available liquidity before budget cap</p>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl glass-card border border-rose-500/35 dark:border-rose-500/45 bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.02] to-transparent shadow-[0_0_24px_rgba(244,63,94,0.08)]">
          {/* Touch of red light in background */}
          <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-rose-500/15 dark:bg-rose-500/25 blur-2xl" />
          <div className="pointer-events-none absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

          <div className="relative z-10 flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span className="text-rose-600 dark:text-rose-300 font-medium">Overspend Alerts</span>
            <div className="p-1 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="relative z-10 text-2xl font-bold font-mono text-rose-500">
            {overBudgetCount} Department
          </div>
          <p className="relative z-10 text-[11px] text-[var(--text-secondary)] mt-1">Marketing & Growth is 18% over budget</p>
        </div>
      </div>

      {/* Main Budget Register Card */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
              Departmental Budget vs Actual Variance
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Real-time monitoring: Higher spend is flagged as unfavorable variance
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 cursor-pointer transition-colors"
            >
              <option value="all">All Departments</option>
              {budgets.map(b => (
                <option key={b.id} value={b.id}>{b.department}</option>
              ))}
            </select>

            <button
              onClick={() => handleOpenReallocateModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Propose Reallocation</span>
            </button>
          </div>
        </div>

        {/* Department Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {filteredBudgets.map(dept => {
            const pct = Math.min(100, Math.round((dept.spent / dept.allocated) * 100));
            const isOver = dept.status === 'over_budget';
            const remaining = dept.allocated - dept.spent;

            return (
              <div
                key={dept.id}
                className={`group relative overflow-hidden p-4 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${isOver
                    ? 'border-rose-500/35 dark:border-rose-500/45 bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.02] to-transparent shadow-[0_0_24px_rgba(244,63,94,0.07)]'
                    : dept.status === 'at_risk'
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-[var(--card-bg-elevated)] border-[var(--border-subtle)]'
                  }`}
              >
                {isOver && (
                  <>
                    <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-rose-500/15 dark:bg-rose-500/20 blur-xl" />
                    <div className="pointer-events-none absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />
                  </>
                )}
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">{dept.department}</h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">{dept.headOfDepartment}</p>
                    </div>
                    <StatusBadge status={dept.status} size="sm" pulse={isOver} />
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 my-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--text-secondary)]">Spent: <strong className="text-[var(--text-primary)] font-mono">{formatINR(dept.spent)}</strong></span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--surface-muted)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial Metrics Box */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-muted)] p-2.5 rounded-xl border border-[var(--border-subtle)]">
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] block">Allocated:</span>
                      <span className="font-mono text-[var(--text-primary)] font-medium">{formatINR(dept.allocated)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] block">Projected M-End:</span>
                      <span className="font-mono text-[var(--text-primary)] font-medium">{formatINR(dept.projectedMonthEnd)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] block">Remaining Buffer:</span>
                      <span className={`font-mono font-semibold ${remaining < 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {formatINR(remaining)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)] block">Variance (Nature):</span>
                      <span className={`font-mono font-semibold ${dept.isUnfavorable ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {dept.variancePercentage > 0 ? `+${dept.variancePercentage}% Unfav` : `${dept.variancePercentage}% Fav`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Subcategory mini breakdown */}
                <div className="space-y-1 pt-2 border-t border-[var(--divider)] text-[11px]">
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block mb-1">
                    Top Spend Categories
                  </span>
                  {dept.categories.slice(0, 2).map((cat, i) => (
                    <div key={i} className="flex justify-between text-[var(--text-secondary)]">
                      <span className="truncate">{cat.name}</span>
                      <span className="font-mono text-[var(--text-primary)]">{formatINRCompact(cat.spent)}</span>
                    </div>
                  ))}

                  {isOver && (
                    <button
                      onClick={() => handleOpenReallocateModal(dept)}
                      className="w-full mt-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 font-semibold text-xs border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Resolve Overspend via Reallocation</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Budget Reallocation Modal Wizard */}
      <Modal
        isOpen={isReallocateModalOpen}
        onClose={() => setIsReallocateModalOpen(false)}
        title="Propose Inter-Departmental Budget Reallocation"
        subtitle="Transfer surplus funds to balance department ledger without altering total company spend"
        maxWidth="max-w-xl"
        footer={
          <>
            <button
              onClick={() => setIsReallocateModalOpen(false)}
              className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleReallocateSubmit}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors shadow-md"
            >
              Submit for Finance Manager Approval
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            {/* From Department */}
            <div className="space-y-1">
              <label className="text-[11px] text-[var(--text-secondary)] font-semibold">Source Department (Surplus):</label>
              <select
                value={fromDeptId}
                onChange={(e) => setFromDeptId(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 transition-colors"
              >
                {budgets.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.department} (Surplus: {formatINRCompact(b.allocated - b.spent)})
                  </option>
                ))}
              </select>
            </div>

            {/* To Department */}
            <div className="space-y-1">
              <label className="text-[11px] text-[var(--text-secondary)] font-semibold">Recipient Department (Deficit):</label>
              <select
                value={toDeptId}
                onChange={(e) => setToDeptId(e.target.value)}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 transition-colors"
              >
                {budgets.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.department} {b.status === 'over_budget' ? '(Over Budget)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount input */}
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)] font-semibold">Reallocation Amount (INR):</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-[var(--text-secondary)] font-mono">₹</span>
              <input
                type="number"
                step="50000"
                value={reallocationAmount}
                onChange={(e) => setReallocationAmount(Number(e.target.value))}
                className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl pl-8 pr-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
              Recommended amount: <strong>₹4,50,000</strong> to offset Marketing ad blitz.
            </div>
          </div>

          {/* Justification note */}
          <div className="space-y-1">
            <label className="text-[11px] text-[var(--text-secondary)] font-semibold">Business Justification & Evidence:</label>
            <textarea
              rows={2}
              value={reallocationReason}
              onChange={(e) => setReallocationReason(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Impact Preview Box */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-wider">
              Simulated Financial Impact Preview
            </span>
            <div className="flex justify-between text-[var(--text-primary)]">
              <span>Net Enterprise Budget Change:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹0 (Zero Net Variance)</span>
            </div>
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Marketing Post-Transfer Variance:</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">+0.8% (On Track)</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
