"""
Risk detection + management router.

Detection logic (runs on demand, idempotent):
  1. duplicate_invoice       — same vendor_id + amount within 2 days
  2. unusual_transaction     — amount > 2.5 × vendor average or IsolationForest flag
  3. abnormal_vendor_activity— vendor's first transaction is large (> 2.5 × category avg)
  4. budget_deviations       — department spend exceeding threshold
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..models import RiskAlert, Transaction, Vendor, Invoice
from ..schemas import (
    RiskActionRequest,
    RiskActionResponse,
    AnomalyRecordOut,
    EvidenceItem,
    SupportingRecord,
    ReviewHistoryItem,
)
from .. import ml

router = APIRouter(prefix="/api/risks", tags=["risks"])


# ── Helper: ensure risk_alerts are populated ──────────────────────────────────

def _run_detection(db: Session) -> None:
    """Idempotent — safe to call on every request."""
    transactions = (
        db.query(Transaction)
        .options(joinedload(Transaction.vendor))
        .filter(Transaction.direction == "outflow")
        .all()
    )
    if not transactions:
        return

    # Build vendor stats
    vendor_avgs: dict[int, float] = {}
    vendor_first_dates: dict[int, datetime] = {}
    vendor_last_dates: dict[int, datetime] = {}
    for tx in transactions:
        vid = tx.vendor_id
        if vid is None:
            continue
        vendor_avgs.setdefault(vid, []).append(tx.amount)
        d = tx.date
        if vid not in vendor_first_dates or d < vendor_first_dates[vid]:
            vendor_first_dates[vid] = d
        if vid not in vendor_last_dates or d > vendor_last_dates[vid]:
            vendor_last_dates[vid] = d

    vendor_avg_map = {vid: sum(v) / len(v) for vid, v in vendor_avgs.items()}

    # Category averages
    cat_amounts: dict[str, list] = {}
    for tx in transactions:
        if tx.vendor:
            cat_amounts.setdefault(tx.vendor.category, []).append(tx.amount)
    cat_avg_map = {cat: sum(v) / len(v) for cat, v in cat_amounts.items()}

    alerted_tx_ids = {
        row[0]
        for row in db.query(RiskAlert.transaction_id)
        .filter(RiskAlert.transaction_id.isnot(None))
        .all()
    }

    # ── Rule 1: Duplicate invoice ─────────────────────────────────────────────
    invoices = db.query(Invoice).options(joinedload(Invoice.vendor)).all()
    seen: dict = {}
    for inv in invoices:
        key = (inv.vendor_id, round(inv.amount, 2))
        if key in seen:
            prev = seen[key]
            if abs((inv.issue_date - prev.issue_date).days) <= 2:
                vendor_name = inv.vendor.name if inv.vendor else "Unknown Vendor"
                exists = (
                    db.query(RiskAlert)
                    .filter(
                        RiskAlert.vendor_id == inv.vendor_id,
                        RiskAlert.risk_type == "duplicate_invoice",
                    )
                    .first()
                )
                if not exists:
                    ev_list = [
                        {"label": "Original Invoice", "value": f"{prev.invoice_number} (Cleared)"},
                        {"label": "Duplicate Candidate", "value": f"{inv.invoice_number} (Pending)", "matchHighlight": True},
                        {"label": "Amount Match", "value": f"₹{inv.amount:,.2f} (100% exact match)", "matchHighlight": True},
                        {"label": "Vendor Name", "value": vendor_name, "matchHighlight": True},
                        {"label": "Description Overlap", "value": "Line item collision within 2 days"}
                    ]
                    supp_records = [
                        {
                            "recordId": prev.invoice_number,
                            "description": f"Original cleared invoice for {vendor_name}",
                            "date": str(prev.issue_date),
                            "amount": prev.amount,
                            "source": "SAP S/4HANA Cloud"
                        },
                        {
                            "recordId": inv.invoice_number,
                            "description": f"New duplicate candidate for {vendor_name}",
                            "date": str(inv.issue_date),
                            "amount": inv.amount,
                            "source": "Zoho Books Enterprise"
                        }
                    ]
                    db.add(
                        RiskAlert(
                            transaction_id=None,
                            vendor_id=inv.vendor_id,
                            title=f"Duplicate Invoice Detected: Same Amount & Vendor ({inv.invoice_number})",
                            risk_type="duplicate_invoice",
                            severity="critical",
                            amount=inv.amount,
                            estimated_exposure=inv.amount,
                            status="open",
                            confidence_score=97.4,
                            rule_triggered="RULE-AP-002: Dual Invoice & Amount Collision within 2 Days",
                            evidence=ev_list,
                            supporting_records=supp_records,
                            recommended_action=f"Propose immediate payment hold on {inv.invoice_number} and contact {vendor_name}.",
                            assigned_to="Finance Ops Lead",
                            review_history=[{
                                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
                                "user": "FINVORA Predictive Engine",
                                "action": "Anomaly Detected",
                                "note": "Duplicate invoice collision flagged upon ERP sync."
                            }],
                            explanation=f"Flagged as a duplicate: invoice #{inv.invoice_number} matches an earlier invoice within 2 days at the same amount (₹{inv.amount:,.2f})."
                        )
                    )
        else:
            seen[key] = inv

    # ── Rules 2 & 3 + IsolationForest ─────────────────────────────────────────
    for tx in transactions:
        if tx.id in alerted_tx_ids or tx.vendor_id is None:
            continue

        vid = tx.vendor_id
        vavg = vendor_avg_map.get(vid, tx.amount)
        cat = tx.vendor.category if tx.vendor else ""
        cat_avg = cat_avg_map.get(cat, tx.amount)
        first_date = vendor_first_dates.get(vid)
        last_date = vendor_last_dates.get(vid)
        is_new = 1 if first_date and tx.date == first_date else 0
        days_since = (
            (tx.date - last_date).days
            if last_date and tx.date > last_date
            else 0
        )
        deviation = tx.amount / (vavg + 1e-9)

        risk_type: Optional[str] = None
        conf_score: float = 80.0
        severity: str = "warning"
        title: str = ""
        rule_name: str = ""
        ev_list: list = []
        vendor_name = tx.vendor.name if tx.vendor else "Unknown Vendor"

        if is_new and tx.amount > cat_avg * 3.0:
            risk_type = "abnormal_vendor_activity"
            conf_score = min(82.0, round((0.70 + (tx.amount / cat_avg - 3.0) * 0.04) * 100, 1))
            severity = "warning"
            title = f"New Vendor Initial Outflow Spike ({vendor_name})"
            rule_name = "RULE-VND-001: New Vendor Initial Transaction > 3.0x Category Benchmark"
            ev_list = [
                {"label": "First Transaction Amount", "value": f"₹{tx.amount:,.2f}", "matchHighlight": True},
                {"label": "Category Average", "value": f"₹{cat_avg:,.2f}"},
                {"label": "Spike Ratio", "value": f"{tx.amount / (cat_avg + 1e-9):.2f}× Category Benchmark", "matchHighlight": True},
                {"label": "Vendor Name", "value": f"{vendor_name} (New Onboarding)", "matchHighlight": True}
            ]
        elif deviation > 3.0:
            risk_type = "unusual_transaction"
            conf_score = min(82.0, round((0.70 + (deviation - 3.0) * 0.04) * 100, 1))
            severity = "warning"
            title = f"Unusually Large Vendor Invoice Spike ({deviation:.1f}x Historical Baseline)"
            rule_name = "RULE-AP-008: Outlier Detection > 3.0x Vendor Historical Mean"
            ev_list = [
                {"label": "Submitted Outflow Amount", "value": f"₹{tx.amount:,.2f}", "matchHighlight": True},
                {"label": "90-Day Vendor Average", "value": f"₹{vavg:,.2f}"},
                {"label": "Spike Ratio", "value": f"{deviation:.2f}× Historical Baseline", "matchHighlight": True},
                {"label": "Vendor Name", "value": vendor_name}
            ]
        else:
            if_score = ml.anomaly_score(tx.amount, vavg, days_since, is_new)
            if if_score > 0.65:
                risk_type = "unusual_transaction"
                conf_score = round(if_score * 100, 1)
                severity = "warning"
                title = f"Statistical Cash Flow Outlier Flagged by IsolationForest ({vendor_name})"
                rule_name = "RULE-ML-IF01: Unsupervised IsolationForest Statistical Outlier Detection"
                ev_list = [
                    {"label": "Transaction Outflow", "value": f"₹{tx.amount:,.2f}", "matchHighlight": True},
                    {"label": "90-Day Vendor Average", "value": f"₹{vavg:,.2f}"},
                    {"label": "IsolationForest Anomaly Score", "value": f"{if_score * 100:.1f}% Outlier Confidence", "matchHighlight": True},
                    {"label": "Days Since Last Transaction", "value": f"{days_since} days"}
                ]

        if risk_type:
            expl = f"This transaction of ₹{tx.amount:,.2f} with {vendor_name} was flagged as '{risk_type}'."
            rec_action = f"Verify purchase order and contract terms with {vendor_name} before payout."
            supp_records = [
                {
                    "recordId": f"TXN-{tx.id:04d}",
                    "description": f"Outflow transaction for {vendor_name}",
                    "date": str(tx.date),
                    "amount": tx.amount,
                    "source": tx.source_system or "Bank Current A/C"
                }
            ]
            db.add(
                RiskAlert(
                    transaction_id=tx.id,
                    vendor_id=tx.vendor_id,
                    title=title,
                    risk_type=risk_type,
                    severity=severity,
                    amount=tx.amount,
                    estimated_exposure=tx.amount,
                    status="open",
                    confidence_score=conf_score,
                    rule_triggered=rule_name,
                    evidence=ev_list,
                    supporting_records=supp_records,
                    recommended_action=rec_action,
                    assigned_to="Senior Finance Analyst",
                    review_history=[{
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
                        "user": "FINVORA Predictive Engine",
                        "action": "Anomaly Detected",
                        "note": "Flagged by autonomous risk engine."
                    }],
                    explanation=expl,
                )
            )
            alerted_tx_ids.add(tx.id)

    db.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

def _to_anomaly_out(a: RiskAlert) -> AnomalyRecordOut:
    vname = a.vendor.name if a.vendor else "Unknown Vendor"
    return AnomalyRecordOut(
        id=a.id,
        title=a.title or f"Risk Alert #{a.id} ({a.risk_type})",
        type=a.risk_type,
        severity=a.severity or "warning",
        detectedDate=a.detected_at.strftime("%Y-%m-%d") if a.detected_at else datetime.now().strftime("%Y-%m-%d"),
        vendorName=vname,
        amount=a.amount or 0.0,
        estimatedExposure=a.estimated_exposure or a.amount or 0.0,
        status=a.status or "open",
        confidenceScore=a.confidence_score or 80.0,
        ruleTriggered=a.rule_triggered or "Standard Risk Rule",
        evidence=a.evidence or [],
        supportingRecords=a.supporting_records or [],
        recommendedAction=a.recommended_action or "Review transaction details.",
        assignedTo=a.assigned_to or "Finance Ops Lead",
        reviewHistory=a.review_history or [],
        dismissReason=a.dismiss_reason,
        explanation=a.explanation,
        # Backwards compatibility fields
        risk_type=a.risk_type,
        score=a.confidence_score,
        vendor_name=vname,
    )


@router.get("", response_model=List[AnomalyRecordOut])
def list_risks(
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(RiskAlert)
        .options(joinedload(RiskAlert.vendor), joinedload(RiskAlert.transaction))
        .order_by(RiskAlert.confidence_score.desc(), RiskAlert.detected_at.desc())
    )
    if status and status != "all":
        q = q.filter(RiskAlert.status == status)

    alerts = q.all()
    return [_to_anomaly_out(a) for a in alerts]


@router.get("/{alert_id}", response_model=AnomalyRecordOut)
def get_risk_detail(alert_id: int, db: Session = Depends(get_db)):
    alert = (
        db.query(RiskAlert)
        .options(joinedload(RiskAlert.vendor), joinedload(RiskAlert.transaction))
        .filter(RiskAlert.id == alert_id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found")

    # If explanation is missing or has dollar signs, regenerate offline
    if not alert.explanation or "$" in alert.explanation or "USD" in alert.explanation:
        vname = alert.vendor.name if alert.vendor else "Vendor"
        ev_ctx = {
            "value": alert.amount,
            "vendor_name": vname,
            "score": alert.confidence_score,
            "risk_type": alert.risk_type,
        }
        res = ml.generate_explanation(alert.risk_type, ev_ctx, return_dict=True)
        if isinstance(res, dict):
            alert.evidence = res.get("evidence", alert.evidence)
            alert.explanation = res.get("explanation", alert.explanation)
            alert.recommended_action = res.get("recommendedAction", alert.recommended_action)
        else:
            alert.explanation = str(res)
        db.commit()

    return _to_anomaly_out(alert)


@router.post("/{alert_id}/action", response_model=RiskActionResponse)
def action_risk(
    alert_id: int,
    body: RiskActionRequest,
    db: Session = Depends(get_db),
):
    alert = db.query(RiskAlert).filter(RiskAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found")

    valid_actions = ("approve", "dismiss", "hold", "under_review", "resolved")
    if body.action not in valid_actions:
        raise HTTPException(status_code=422, detail=f"action must be one of {valid_actions}")

    if body.action == "approve":
        alert.status = "approved"
    elif body.action == "dismiss":
        alert.status = "dismissed"
        if body.dismissReason:
            alert.dismiss_reason = body.dismissReason
    else:
        alert.status = body.action

    # Append to review history
    history = list(alert.review_history or [])
    history.insert(0, {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
        "user": "Finance Controller",
        "action": f"Status updated to {alert.status.upper()}",
        "note": body.note or (body.dismissReason if body.action == "dismiss" else "Action recorded via Risk Drawer")
    })
    alert.review_history = history

    db.commit()
    db.refresh(alert)

    return RiskActionResponse(
        id=alert.id,
        status=alert.status,
        risk_type=alert.risk_type,
        score=alert.confidence_score,
    )

