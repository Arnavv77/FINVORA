import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  AlertTriangle,
  CheckCircle2,
  Ban,
  Sparkles
} from 'lucide-react';
import { useFinancial } from '../context/FinancialContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { Drawer } from '../components/common/Drawer';
import { Modal } from '../components/common/Modal';
import { formatINR, formatDate } from '../utils/formatters';
import type { AnomalyRecord } from '../types';
import { fetchRiskDetail } from '../lib/api';

export const RiskAnomaliesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    anomalies,
    updateAnomalyStatus,
    assignAnomaly,
    createProposal,
    role,
    showToast
  } = useFinancial();

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Drawer & Modals
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyRecord | null>(null);
  const [dismissModalOpen, setDismissModalOpen] = useState(false);
  const [dismissReason, setDismissReason] = useState('');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigneeName, setAssigneeName] = useState('Finance Operations Lead');

  const handleSelectAnomaly = (anomaly: AnomalyRecord) => {
    setSelectedAnomaly(anomaly);
    fetchRiskDetail(anomaly.id)
      .then(detail => {
        if (detail) setSelectedAnomaly(detail);
      })
      .catch(err => {
        console.warn('Could not load detailed risk from backend:', err);
      });
  };

  const filteredAnomalies = anomalies.filter(a => {
    const matchesSearch =
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ruleTriggered.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSeverity = selectedSeverity === 'all' || a.severity === selectedSeverity;
    const matchesType = selectedType === 'all' || a.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || a.status === selectedStatus;

    return matchesSearch && matchesSeverity && matchesType && matchesStatus;
  });

  // Calculate high priority exposure
  const totalOpenExposure = anomalies
    .filter(a => a.status === 'open' || a.status === 'under_review')
    .reduce((acc, a) => acc + a.estimatedExposure, 0);

  // Propose Payment Hold
  const handleProposePaymentHold = (anomaly: AnomalyRecord) => {
    if (anomaly.id === 'ANOM-2024-001') {
      navigate('/decisions-approvals');
      showToast('Navigating to proposal for Duplicate Invoice #INV-2024-8849 sign-off', 'info');
      setSelectedAnomaly(null);
    } else {
      createProposal({
        title: `Payment Hold: ${anomaly.vendorName}`,
        type: 'payment_hold',
        severity: anomaly.severity,
        amount: anomaly.estimatedExposure,
        description: `Enforce payment hold on ${anomaly.vendorName} triggered by ${anomaly.ruleTriggered}`,
        evidence: anomaly.evidence.map(e => `${e.label}: ${e.value}`),
        expectedImpact: `Saves ${formatINR(anomaly.estimatedExposure)} until vendor verification is completed.`,
        assumptions: ['Vendor invoice disputed due to automated risk flag.'],
        confidence: anomaly.confidenceScore,
        requestedBy: role === 'manager' ? 'Rajesh Gopinathan (Finance Manager)' : 'Pooja Sharma (Analyst)',
        assignedReviewer: 'Rajesh Gopinathan (Finance Manager / CFO)',
        targetEntityId: anomaly.id
      });
      navigate('/decisions-approvals');
      setSelectedAnomaly(null);
    }
  };

  const handleDismissConfirm = () => {
    if (selectedAnomaly && dismissReason.trim()) {
      updateAnomalyStatus(selectedAnomaly.id, 'dismissed', undefined, dismissReason);
      setDismissModalOpen(false);
      setDismissReason('');
      setSelectedAnomaly(null);
    }
  };

  const handleAssignConfirm = () => {
    if (selectedAnomaly && assigneeName.trim()) {
      assignAnomaly(selectedAnomaly.id, assigneeName);
      setAssignModalOpen(false);
      if (selectedAnomaly) {
        setSelectedAnomaly({ ...selectedAnomaly, assignedTo: assigneeName });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl glass-card border border-rose-500/35 dark:border-rose-500/45 bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.02] to-transparent shadow-[0_0_24px_rgba(244,63,94,0.08)]">
          {/* Touch of red light in background */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-rose-500/15 dark:bg-rose-500/25 blur-2xl" />
          <div className="pointer-events-none absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

          <div className="relative z-10 flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span className="text-rose-600 dark:text-rose-300 font-medium">Total Estimated Exposure</span>
            <div className="p-1 rounded-md bg-rose-500/15 text-rose-500 border border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="relative z-10 text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
            {formatINR(totalOpenExposure)}
          </div>
          <p className="relative z-10 text-[11px] text-[var(--text-muted)] mt-1">Across open unreviewed anomaly alerts</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-[var(--card-border)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Critical Detections</span>
            <ShieldAlert className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[var(--text-primary)]">
            {anomalies.filter(a => a.severity === 'critical').length}
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Duplicate invoice hash + Outlier PO</p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl glass-card border border-[var(--card-border)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
            <span>Rule Engine Accuracy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            78% Avg
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">ML behavioral heuristics</p>
        </div>
      </div>

      {/* Main Anomalies Ledger Card */}
      <div className="p-5 sm:p-6 rounded-2xl glass-card space-y-4 border border-[var(--card-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
              Detected Risk & Anomaly Register
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Continuous audit telemetry evaluated across every incoming invoice and GL transaction
            </p>
          </div>

          <span className="text-xs text-[var(--text-muted)]">Showing {filteredAnomalies.length} signals</span>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-[var(--divider)]">
          <div className="relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search title, vendor, rule..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
          </div>

          <div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">All Anomaly Types</option>
              <option value="duplicate_invoice">Duplicate Invoices</option>
              <option value="unusual_transaction">Unusual Transactions</option>
              <option value="abnormal_vendor_activity">Abnormal Vendor Activity</option>
              <option value="budget_deviations">Budget Deviations</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="under_review">Under Review</option>
              <option value="held">Payment Held</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        </div>

        {/* Anomalies List */}
        <div className="space-y-3">
          {filteredAnomalies.map(anomaly => {
            const isAlert = anomaly.severity === 'critical';
            return (
              <div
                key={anomaly.id}
                onClick={() => handleSelectAnomaly(anomaly)}
                className={`group relative overflow-hidden p-4 rounded-xl border transition-all cursor-pointer ${
                  isAlert && anomaly.status === 'open'
                    ? 'border-rose-500/35 dark:border-rose-500/45 bg-gradient-to-r from-rose-500/[0.08] via-rose-500/[0.02] to-transparent shadow-[0_0_24px_rgba(244,63,94,0.07)] hover:border-rose-500/60'
                    : 'bg-[var(--surface-subtle)] border-[var(--divider)] hover:border-[var(--accent-border)] hover:bg-[var(--surface-muted)]'
                }`}
              >
                {isAlert && anomaly.status === 'open' && (
                  <>
                    <div className="pointer-events-none absolute -top-8 -left-8 w-24 h-24 rounded-full bg-rose-500/15 dark:bg-rose-500/20 blur-xl" />
                    <div className="pointer-events-none absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
                  </>
                )}
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={anomaly.severity} size="sm" pulse={anomaly.severity === 'critical'} />
                    <span className="text-xs font-bold text-[var(--text-primary)]">{anomaly.title}</span>
                    <span className="text-[10px] text-[var(--text-muted)] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-muted)]">
                      {anomaly.id}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    Vendor: <strong className="text-[var(--text-primary)]">{anomaly.vendorName}</strong> • Rule: <span className="font-mono text-[var(--text-muted)]">{anomaly.ruleTriggered.split(':')[0]}</span> • Detected: {formatDate(anomaly.detectedDate)}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-[11px] text-[var(--text-muted)]">Est. Exposure</div>
                    <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                      {formatINR(anomaly.estimatedExposure)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-[var(--text-muted)]">Confidence</div>
                    <div className="text-xs font-mono font-semibold text-[var(--accent)]">
                      {anomaly.confidenceScore}%
                    </div>
                  </div>

                  <div>
                    <StatusBadge status={anomaly.status} size="sm" />
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectAnomaly(anomaly);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent-border)] hover:brightness-105 transition-colors"
                  >
                    Investigate
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {/* Detailed Investigation Drawer */}
      <Drawer
        isOpen={Boolean(selectedAnomaly)}
        onClose={() => setSelectedAnomaly(null)}
        title={selectedAnomaly?.title || 'Signal Investigation'}
        subtitle={selectedAnomaly ? `Detected by ${selectedAnomaly.ruleTriggered.split(':')[0]}` : ''}
        badge={selectedAnomaly && <StatusBadge status={selectedAnomaly.severity} />}
        footer={
          selectedAnomaly ? (
            <div className="flex flex-wrap items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDismissModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                >
                  Dismiss with Reason
                </button>
                <button
                  onClick={() => setAssignModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl hover:bg-[var(--surface-muted)] transition-colors"
                >
                  Assign ({selectedAnomaly.assignedTo || 'Unassigned'})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    updateAnomalyStatus(selectedAnomaly.id, 'under_review', 'Marked under active review');
                    setSelectedAnomaly({ ...selectedAnomaly, status: 'under_review' });
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--surface-muted)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--divider)] transition-colors"
                >
                  Mark Under Review
                </button>
                <button
                  onClick={() => handleProposePaymentHold(selectedAnomaly)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-[#F59E0B] text-black hover:bg-[#D97706] transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Propose Payment Hold</span>
                </button>
              </div>
            </div>
          ) : null
        }
      >
        {selectedAnomaly && (
          <div className="space-y-6 text-xs">
            {/* Financial Exposure Banner */}
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-rose-700 dark:text-rose-300 uppercase font-semibold">Estimated Financial Exposure</span>
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  {formatINR(selectedAnomaly.estimatedExposure)}
                </div>
                <span className="text-[10px] text-rose-600/80 dark:text-rose-300/80">Subject to review; labeled as estimate per audit policy</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-rose-700 dark:text-rose-300 uppercase font-semibold">Signal Confidence</span>
                <div className="text-lg font-mono font-bold text-[var(--accent)]">
                  {selectedAnomaly.confidenceScore}%
                </div>
              </div>
            </div>

            {/* Evidence Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Supporting Telemetry Evidence
              </h4>
              <div className="space-y-2">
                {selectedAnomaly.evidence.map((ev, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      ev.matchHighlight
                        ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800/40 dark:text-amber-200'
                        : 'bg-[var(--surface-subtle)] border-[var(--divider)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <span className="font-medium text-[var(--text-primary)]">{ev.label}</span>
                    <span className="font-mono text-xs font-medium">{ev.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supporting Records comparison */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Correlated Database Records
              </h4>
              <div className="space-y-2">
                {selectedAnomaly.supportingRecords.map((rec, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider)] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[var(--accent)]">{rec.recordId}</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{formatINR(rec.amount)}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{rec.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-1">
                      <span>Source: {rec.source}</span>
                      <span>Date: {formatDate(rec.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Next Steps */}
            <div className="p-4 rounded-xl bg-[var(--accent-light)] border border-[var(--accent-border)] space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>FINVORA Recommended Next Steps</span>
              </div>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {selectedAnomaly.recommendedAction}
              </p>
            </div>

            {/* Review History Audit Trail */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Review History & Audit Trail
              </h4>
              <div className="space-y-2.5">
                {selectedAnomaly.reviewHistory.map((hist, i) => (
                  <div key={i} className="p-2.5 rounded-xl bg-[var(--surface-subtle)] border border-[var(--divider)] text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-[var(--text-secondary)]">
                      <span className="font-semibold text-[var(--text-primary)]">{hist.user}</span>
                      <span>{hist.timestamp}</span>
                    </div>
                    <div className="text-[var(--accent)] font-medium">{hist.action}</div>
                    <div className="text-[var(--text-secondary)]">{hist.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Dismiss Anomaly Modal */}
      <Modal
        isOpen={dismissModalOpen}
        onClose={() => setDismissModalOpen(false)}
        title="Dismiss Anomaly Signal"
        subtitle="Provide required audit rationale for dismissing risk detection"
        footer={
          <>
            <button
              onClick={() => setDismissModalOpen(false)}
              className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleDismissConfirm}
              disabled={!dismissReason.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-40"
            >
              Dismiss Signal
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            All dismissals are logged in the immutable compliance audit register. Please specify the business justification:
          </p>
          <textarea
            value={dismissReason}
            onChange={(e) => setDismissReason(e.target.value)}
            rows={3}
            placeholder="e.g. Verified with vendor that invoice #8849 was issued in error and credit note issued..."
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </Modal>

      {/* Assign Team Member Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Anomaly Reviewer"
        subtitle="Route detection to appropriate finance controller"
        footer={
          <>
            <button
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignConfirm}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F59E0B] text-black hover:bg-[#D97706] transition-colors"
            >
              Confirm Assignment
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-xs text-[var(--text-secondary)] block">Select Reviewer:</label>
          <select
            value={assigneeName}
            onChange={(e) => setAssigneeName(e.target.value)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-xl p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
          >
            <option value="Finance Operations Lead">Finance Operations Lead</option>
            <option value="Pooja Sharma (Senior Analyst)">Pooja Sharma (Senior Analyst)</option>
            <option value="Rajesh Gopinathan (Finance Manager / CFO)">Rajesh Gopinathan (Finance Manager / CFO)</option>
            <option value="Internal Audit Team">Internal Audit Team</option>
          </select>
        </div>
      </Modal>
    </div>
  );
};
