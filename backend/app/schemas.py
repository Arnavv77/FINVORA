from __future__ import annotations
from datetime import date, datetime
from typing import Any, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────── Vendor ────────────────────────────
class VendorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: str
    first_seen_date: date
    avg_transaction_amount: float


# ─────────────────────────── Account ───────────────────────────
class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    type: str
    balance: float


# ──────────────────────── Transaction ──────────────────────────
class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Union[int, str]
    referenceNo: Optional[str] = None
    description: Optional[str] = None
    vendorId: Optional[Union[int, str]] = None
    vendorName: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    amount: float
    date: Union[date, str]
    type: str = "outflow"
    status: str = "cleared"
    source: str = "Bank Current A/C"
    isAnomaly: Optional[bool] = False
    notes: Optional[str] = None


# ─────────────────────────── Invoice ───────────────────────────
class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Union[int, str]
    vendor_id: int
    vendor_name: Optional[str] = None
    invoice_number: str
    amount: float
    issue_date: date
    due_date: date
    status: str


# ─────────────────────────── Budget ────────────────────────────
class DepartmentCategoryBudget(BaseModel):
    name: str
    allocated: float
    spent: float


class DepartmentBudgetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    department: str
    headOfDepartment: str
    allocated: float
    spent: float
    committed: float
    projectedMonthEnd: float
    historicalSpend: float
    varianceAmount: float
    variancePercentage: float
    isUnfavorable: bool
    status: str
    categories: List[DepartmentCategoryBudget]


# Legacy BudgetOut for compatibility if requested
class BudgetOut(BaseModel):
    category: str
    budgeted: float
    actual: float
    variance_pct: float
    status: str


# ─────────────────────── Dashboard Summary ─────────────────────
class DashboardSummary(BaseModel):
    total_balance: float
    monthly_inflow: float
    monthly_outflow: float
    open_risk_count: int
    budget_health_pct: float


# ─────────────────────── Evidence / Risk ───────────────────────
class EvidenceItem(BaseModel):
    label: str
    value: str
    matchHighlight: Optional[bool] = None


class SupportingRecord(BaseModel):
    recordId: str
    description: str
    date: str
    amount: float
    source: str


class ReviewHistoryItem(BaseModel):
    timestamp: str
    user: str
    action: str
    note: str


class AnomalyRecordOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Union[int, str]
    title: str
    type: str  # duplicate_invoice | unusual_transaction | budget_deviations | abnormal_vendor_activity | payment_risks
    severity: str = "warning"  # critical | warning | info
    detectedDate: str
    vendorName: str
    amount: float
    estimatedExposure: float
    status: str = "open"  # open | under_review | held | resolved | dismissed
    confidenceScore: float = 80.0
    ruleTriggered: str = ""
    evidence: List[EvidenceItem] = []
    supportingRecords: List[SupportingRecord] = []
    recommendedAction: str = ""
    assignedTo: Optional[str] = None
    reviewHistory: List[ReviewHistoryItem] = []
    dismissReason: Optional[str] = None
    explanation: Optional[str] = None
    # Compatibility aliases
    risk_type: Optional[str] = None
    score: Optional[float] = None
    vendor_name: Optional[str] = None


# Alias for compatibility with previous endpoints
RiskAlertOut = AnomalyRecordOut
RiskAlertDetail = AnomalyRecordOut


class RiskActionRequest(BaseModel):
    action: str  # "approve" | "dismiss" | "hold" | "under_review" | "resolved"
    note: Optional[str] = None
    dismissReason: Optional[str] = None


class RiskActionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: Union[int, str]
    status: str
    risk_type: Optional[str] = None
    score: Optional[float] = None


# ────────────────────────── Forecast ───────────────────────────
class CashForecastPointOut(BaseModel):
    date: str
    dayIndex: int
    isHistorical: bool
    actualBalance: Optional[float] = None
    forecastBalanceBase: float
    forecastBalanceOptimistic: float
    forecastBalanceConservative: float
    uncertaintyUpper: float
    uncertaintyLower: float
    inflows: float
    outflows: float
    netCashFlow: float


class RiskReasonItem(BaseModel):
    category: str  # "invoice" | "budget" | "trend"
    title: str
    detail: str
    impact_amount: Optional[float] = None
    entity_name: Optional[str] = None


class ForecastResponse(BaseModel):
    points: List[CashForecastPointOut]
    dates: List[str]
    predicted: List[float]
    baseline: List[float]
    scenario_label: Optional[str] = None
    buffer_amount: Optional[float] = 10_000_000.0
    risk_level: Optional[str] = "SAFE"  # SAFE | WATCH | HIGH_RISK | CRITICAL
    projected_closing_cash: Optional[float] = 0.0
    risk_reasons: Optional[List[RiskReasonItem]] = []
    suggested_actions: Optional[List[str]] = []


# ────────────────────────── Simulate ───────────────────────────
class SimulationAdjustment(BaseModel):
    type: str  # "delay_payment" | "add_expense"
    vendor_id: Optional[int] = None
    amount: Optional[float] = None
    days: Optional[int] = None


class SimulateRequest(BaseModel):
    adjustments: List[SimulationAdjustment]
    horizon: Optional[int] = 30

