import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Ban,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  Send,
  Calendar,
  Layers
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Drawer } from '../components/common/Drawer';
import { formatINR, formatINRCompact, formatDate } from '../utils/formatters';
import { Invoice } from '../types';

export const APExpensesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    invoices,
    paymentSchedule,
    placeInvoiceHold,
    duplicateHoldExecuted,
    showToast
  } = useFinancial();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');

  // Selected Invoice for Drawer
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.department.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'all' || inv.status === selectedStatus;
    const matchesRisk = selectedRisk === 'all' || inv.riskLevel === selectedRisk;
    const matchesDept = selectedDept === 'all' || inv.department === selectedDept;

    return matchesSearch && matchesStatus && matchesRisk && matchesDept;
  });

  const overdueInvoices = invoices.filter(i => i.status === 'overdue');
  const highRiskInvoices = invoices.filter(i => i.riskLevel === 'high');

  const handlePlaceHold = (invoice: Invoice) => {
    placeInvoiceHold(invoice.id);
    setSelectedInvoice(null);
    showToast(`Invoice ${invoice.invoiceNumber} successfully placed on hold`, 'warning');
  };

  const handleSubmitForApproval = (invoice: Invoice) => {
    navigate('/decisions-approvals');
    showToast(`Navigated to Decisions center for invoice ${invoice.invoiceNumber}`, 'info');
    setSelectedInvoice(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Payables KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl glass-card border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Pending Invoices</span>
            <Receipt className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {formatINR(invoices.filter(i => i.status === 'pending_approval').reduce((a, b) => a + b.amount, 0))}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">Awaiting department VP or CFO sign-off</p>
        </div>

        <div className="relative overflow-hidden p-4 rounded-2xl glass-card border border-rose-500/35 dark:border-rose-500/45 bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.02] to-transparent shadow-[0_0_24px_rgba(244,63,94,0.08)]">
          {/* Touch of red light in background */}
          <div className="pointer-events-none absolute -top-8 -right-8 w-28 h-28 rounded-full bg-rose-500/15 dark:bg-rose-500/25 blur-2xl" />
          <div className="pointer-events-none absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

          <div className="relative z-10 flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span className="text-rose-600 dark:text-rose-300 font-medium">High Risk Flagged AP</span>
            <div className="p-1 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="relative z-10 text-2xl font-bold font-mono text-rose-500">
            {formatINR(highRiskInvoices.reduce((a, b) => a + b.amount, 0))}
          </div>
          <p className="relative z-10 text-[11px] text-[var(--text-secondary)] mt-1">{highRiskInvoices.length} invoices require dual sign-off</p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Overdue Invoices</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-500">
            {formatINR(overdueInvoices.reduce((a, b) => a + b.amount, 0))}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">
            {overdueInvoices.length > 0 ? `${overdueInvoices[0].vendorName} (4d overdue)` : 'No overdue invoices'}
          </p>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Proposed Weekly Release</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {formatINR(paymentSchedule.filter(p => p.status === 'scheduled').reduce((a, b) => a + b.amount, 0))}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-1">Scheduled across 5 batch disbursement runs</p>
        </div>
      </div>

      {/* Invoices Table & Filter Section */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
              Enterprise Accounts Payable Register
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Prioritized by due-date urgency, vendor critical tier, duplicate risk score, and cash impact
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Showing {filteredInvoices.length} invoices</span>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[var(--divider)]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-tertiary)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice number, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 cursor-pointer transition-colors"
            >
              <option value="all">All Approval Statuses</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="on_hold">On Hold</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 cursor-pointer transition-colors"
            >
              <option value="all">All Risk Tiers</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>

          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-amber-500/50 cursor-pointer transition-colors"
            >
              <option value="all">All Departments</option>
              <option value="IT & Infrastructure">IT & Infrastructure</option>
              <option value="Engineering">Engineering</option>
              <option value="Marketing">Marketing</option>
              <option value="Finance & Legal">Finance & Legal</option>
              <option value="HR & Admin">HR & Admin</option>
              <option value="Sales & Operations">Sales & Operations</option>
            </select>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice # & Date</th>
                <th className="py-3 px-4">Vendor & Department</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Priority</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredInvoices.map(inv => (
                <tr
                  key={inv.id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`hover:bg-[var(--hover-bg)] cursor-pointer transition-colors ${
                    inv.isDuplicateCandidate && inv.status !== 'on_hold'
                      ? 'bg-rose-500/10'
                      : inv.status === 'on_hold'
                      ? 'bg-amber-500/10'
                      : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                      <span>{inv.invoiceNumber}</span>
                      {inv.isDuplicateCandidate && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30">
                          Duplicate Flag
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">Issued: {formatDate(inv.issueDate)}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[var(--text-primary)]">{inv.vendorName}</div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{inv.department} • {inv.vendorCategory}</div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-mono font-bold text-[var(--text-primary)]">{formatINR(inv.amount)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className={inv.status === 'overdue' ? 'text-rose-500 font-semibold' : 'text-[var(--text-primary)]'}>
                      {formatDate(inv.dueDate)}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{inv.paymentTerms}</div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface-muted)] border border-[var(--border-subtle)] font-mono text-[11px]">
                      <span className="font-bold text-amber-500">{inv.priorityScore}</span>
                      <span className="text-[var(--text-tertiary)]">/100</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={inv.status} size="sm" pulse={inv.isDuplicateCandidate && inv.status !== 'on_hold'} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInvoice(inv);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[var(--surface-muted)] hover:bg-[var(--hover-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] text-[11px] transition-colors"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proposed Payment Schedule & Cash Impact */}
      <div className="p-5 rounded-2xl glass-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
              Proposed Autonomous Payment Schedule
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Calculates liquidity buffer post-batch execution to safeguard operating runway
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            Safe Liquidity Threshold: ₹25,00,000
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {paymentSchedule.map(batch => (
            <div
              key={batch.id}
              className={`p-3.5 rounded-xl border space-y-2 flex flex-col justify-between transition-colors ${
                batch.status === 'on_hold'
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-[var(--card-bg-elevated)] border-[var(--border-subtle)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]">{batch.scheduledDate}</span>
                  <StatusBadge status={batch.status} size="sm" />
                </div>
                <div className="font-semibold text-xs text-[var(--text-primary)] truncate">{batch.vendorName}</div>
                <div className="text-[10px] text-[var(--text-secondary)] truncate">{batch.batchName}</div>
              </div>

              <div className="pt-2 border-t border-[var(--divider)] space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Disbursement:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{formatINR(batch.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Reserve After:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">{formatINRCompact(batch.cashBufferAfterPayment)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Details Drawer */}
      <Drawer
        isOpen={Boolean(selectedInvoice)}
        onClose={() => setSelectedInvoice(null)}
        title={selectedInvoice?.invoiceNumber || 'Invoice Details'}
        subtitle={selectedInvoice ? `${selectedInvoice.vendorName} • GSTIN: ${selectedInvoice.gstNumber}` : ''}
        badge={selectedInvoice && <StatusBadge status={selectedInvoice.status} />}
        footer={
          selectedInvoice ? (
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-[var(--text-secondary)]">
                Terms: <strong className="text-[var(--text-primary)]">{selectedInvoice.paymentTerms}</strong>
              </div>
              <div className="flex items-center gap-2">
                {selectedInvoice.status !== 'on_hold' && (
                  <button
                    onClick={() => handlePlaceHold(selectedInvoice)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-colors flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Enforce Payment Hold</span>
                  </button>
                )}
                <button
                  onClick={() => handleSubmitForApproval(selectedInvoice)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit for Sign-Off</span>
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {selectedInvoice && (
          <div className="space-y-6 text-xs">
            {/* Duplicate Anomaly Alert inside Drawer */}
            {selectedInvoice.isDuplicateCandidate && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-300 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Duplicate Invoice Warning (High Confidence)</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-200 leading-relaxed">
                  FINVORA detected that this invoice matches invoice <strong>#INV-2024-8841</strong> (cleared on 19 Sep 2024 for identical amount ₹6,80,000). A hold proposal has been prepared in the Decisions center.
                </p>
                <button
                  onClick={() => navigate('/risk-anomalies')}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 pt-1"
                >
                  View full anomaly evidence in Risk Module →
                </button>
              </div>
            )}

            {/* Explainable Prioritization Breakdown */}
            <div className="p-4 rounded-xl bg-[var(--card-bg-elevated)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
                  Explainable Prioritization Rationale
                </span>
                <span className="font-mono font-bold text-amber-500 text-sm">
                  {selectedInvoice.priorityScore}/100
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {selectedInvoice.priorityReason}
              </p>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Invoice Line Item Breakdown
              </h4>
              <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--table-header-bg)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {selectedInvoice.lineItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--hover-bg)]">
                        <td className="p-2.5 text-[var(--text-primary)]">{item.description}</td>
                        <td className="p-2.5 text-center text-[var(--text-secondary)] font-mono">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono text-[var(--text-secondary)]">
                          {item.unitPrice > 0 ? formatINR(item.unitPrice) : 'Included'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-[var(--text-primary)]">
                          {formatINR(item.total)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[var(--surface-muted)] font-bold">
                      <td colSpan={3} className="p-2.5 text-right text-[var(--text-primary)]">Net Total (Inc. 18% GST):</td>
                      <td className="p-2.5 text-right font-mono text-amber-500">
                        {formatINR(selectedInvoice.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
