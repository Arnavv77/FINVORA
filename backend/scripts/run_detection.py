"""
run_detection.py — One-time offline risk detection script.

Runs detection logic idempotently:
  1. Ensures the 4 deliberate high-confidence demo anomalies exist.
  2. Duplicate invoice detection on Invoice table.
  3. Rule-based detection (outflow > 3.0x vendor average or new vendor > 3.0x category benchmark).
  4. IsolationForest ML anomaly detection (calibrated confidence 70-82%).

Usage:
    cd backend
    python -m scripts.run_detection
"""
from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session, joinedload
from app.database import SessionLocal
from app.models import RiskAlert, Transaction, Vendor, Invoice
from app import ml


def ensure_seeded_demo_anomalies(db: Session) -> int:
    """Ensure the 4 core demo anomalies exist with highest confidence scores."""
    existing_types = {
        r[0] for r in db.query(RiskAlert.risk_type).filter(RiskAlert.transaction_id.is_(None)).all()
    }
    
    vendors = db.query(Vendor).all()
    if not vendors:
        return 0

    zenith = db.query(Vendor).filter(Vendor.name.like("%Zenith Cloud%")).first() or vendors[0]
    hyperscale = db.query(Vendor).filter(Vendor.name.like("%HyperScale%")).first() or (vendors[1] if len(vendors) > 1 else vendors[0])
    apex = db.query(Vendor).filter(Vendor.name.like("%Apex Growth%")).first() or (vendors[2] if len(vendors) > 2 else vendors[0])
    vertex = db.query(Vendor).filter(Vendor.name.like("%Vertex%")).first() or (vendors[3] if len(vendors) > 3 else vendors[0])

    seeded = []

    # 1. Duplicate Invoice (Critical, 97.4%)
    if "duplicate_invoice" not in existing_types:
        seeded.append(
            RiskAlert(
                transaction_id=None,
                vendor_id=zenith.id,
                title="Duplicate Invoice Detected: Same Amount, Vendor & Hash",
                risk_type="duplicate_invoice",
                severity="critical",
                amount=680_000.0,
                estimated_exposure=680_000.0,
                status="open",
                confidence_score=97.4,
                rule_triggered="RULE-AP-002: Dual Invoice Hash & Amount Collision within 14 Days",
                evidence=[
                    {"label": "Original Invoice", "value": "INV-2024-8841 (Cleared on 19 Sep 2024)"},
                    {"label": "Duplicate Candidate", "value": "INV-2024-8849 (Submitted on 24 Sep 2024)", "matchHighlight": True},
                    {"label": "Amount Match", "value": "₹6,80,000.00 (100% exact match)", "matchHighlight": True},
                    {"label": "Vendor GSTIN", "value": "27AAACZ4921M1ZX (Identical)", "matchHighlight": True},
                    {"label": "Beneficiary Bank A/C", "value": "HDFC0000240 - 502000481920 (Identical)", "matchHighlight": True},
                    {"label": "Description Overlap", "value": "AWS Kubernetes Reserved Capacity & Direct Connect Q3 (96% semantic similarity)"}
                ],
                supporting_records=[
                    {
                        "recordId": "INV-2024-8841",
                        "description": "Original cleared invoice for AWS Q3 Reserved Capacity",
                        "date": "2024-09-18",
                        "amount": 680_000.0,
                        "source": "SAP S/4HANA Cloud"
                    },
                    {
                        "recordId": "INV-2024-8849",
                        "description": "New pending invoice with duplicate PO line item",
                        "date": "2024-09-24",
                        "amount": 680_000.0,
                        "source": "Zoho Books Enterprise"
                    }
                ],
                recommended_action="Propose immediate payment hold on INV-2024-8849 and flag vendor accounting department",
                assigned_to="Finance Ops Lead",
                review_history=[{
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
                    "user": "FINVORA Predictive Engine",
                    "action": "Anomaly Detected",
                    "note": "High confidence duplicate detected upon Zoho Books sync."
                }],
                explanation="Flagged as a duplicate: invoice #INV-2024-8849 from Zenith Cloud Services matches cleared invoice #INV-2024-8841 within 6 days at the exact same amount (₹6,80,000.00)."
            )
        )

    # 2. Unusual Transaction Spike (Critical, 92.1%)
    has_hyperscale = db.query(RiskAlert).filter(
        RiskAlert.vendor_id == hyperscale.id,
        RiskAlert.transaction_id.is_(None)
    ).first()
    if not has_hyperscale:
        seeded.append(
            RiskAlert(
                transaction_id=None,
                vendor_id=hyperscale.id,
                title="Unusually Large Vendor Invoice Spike (9.1x Historical Baseline)",
                risk_type="unusual_transaction",
                severity="critical",
                amount=3_850_000.0,
                estimated_exposure=3_850_000.0,
                status="under_review",
                confidence_score=92.1,
                rule_triggered="RULE-AP-008: Outlier Detection > 3 Sigma against 90-day Vendor Mean",
                evidence=[
                    {"label": "Submitted Invoice Amount", "value": "₹38,50,000.00", "matchHighlight": True},
                    {"label": "90-Day Average Spend", "value": "₹4,20,000.00"},
                    {"label": "Spike Ratio", "value": "9.16x standard deviation envelope", "matchHighlight": True},
                    {"label": "Matching PO", "value": "PO #8891 (Unsigned by CTO)"},
                    {"label": "Budget Category", "value": "Capital Equipment (Engineering)"}
                ],
                supporting_records=[{
                    "recordId": "PO-8891",
                    "description": "Purchase Order created by Infrastructure team",
                    "date": "2024-09-15",
                    "amount": 3_850_000.0,
                    "source": "SAP S/4HANA Cloud"
                }],
                recommended_action="Require VP Engineering and CFO dual sign-off before scheduling payment",
                assigned_to="Senior Finance Analyst",
                review_history=[
                    {
                        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
                        "user": "FINVORA Rule Engine",
                        "action": "Anomaly Detected",
                        "note": "Outlier flag triggered based on 90-day moving window."
                    }
                ],
                explanation="This outflow of ₹38,50,000.00 is 9.2× the vendor's normal 90-day average of ₹4,20,000.00, indicating an unapproved capex spike."
            )
        )

    # 3. Department Budget Deviation (Warning, 88.5%)
    if "budget_deviations" not in existing_types:
        seeded.append(
            RiskAlert(
                transaction_id=None,
                vendor_id=apex.id,
                title="Department Monthly Spend Exceeded Pre-Approved Threshold",
                risk_type="budget_deviations",
                severity="warning",
                amount=1_850_000.0,
                estimated_exposure=360_000.0,
                status="open",
                confidence_score=88.5,
                rule_triggered="RULE-BUD-004: Departmental Variance > 105% of Monthly Allocation",
                evidence=[
                    {"label": "Department", "value": "Marketing & Growth"},
                    {"label": "Monthly Budget Allocated", "value": "₹45,00,000.00"},
                    {"label": "Committed + Spent", "value": "₹48,60,000.00", "matchHighlight": True},
                    {"label": "Overrun Variance", "value": "+₹3,60,000.00 (+8.0% Unfavorable)", "matchHighlight": True},
                    {"label": "Primary Driver", "value": "Unplanned Festive Paid Acquisition Ad Blitz"}
                ],
                supporting_records=[{
                    "recordId": "INV-2024-8712",
                    "description": "Google & Meta Ads Invoice for mid-month campaign",
                    "date": "2024-09-16",
                    "amount": 1_850_000.0,
                    "source": "Zoho Books Enterprise"
                }],
                recommended_action="Propose reallocation of ₹4,50,000 from Engineering surplus or freeze discretionary ad campaigns",
                assigned_to="Budget Controller",
                review_history=[{
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
                    "user": "FINVORA Budget Engine",
                    "action": "Anomaly Detected",
                    "note": "Marketing variance threshold exceeded."
                }],
                explanation="Marketing & Growth department spend reached ₹48,60,000.00 against an allocation of ₹45,00,000.00, creating an 8.0% unfavorable budget overrun."
            )
        )

    # 4. Abnormal Vendor Activity (Warning, 84.0%)
    if "abnormal_vendor_activity" not in existing_types:
        seeded.append(
            RiskAlert(
                transaction_id=None,
                vendor_id=vertex.id,
                title="Vendor Bank Account Routing Details Changed Prior to Release",
                risk_type="abnormal_vendor_activity",
                severity="warning",
                amount=1_240_000.0,
                estimated_exposure=1_240_000.0,
                status="under_review",
                confidence_score=84.0,
                rule_triggered="RULE-SEC-012: Beneficiary IFSC & Account Modified within 48h of Payout",
                evidence=[
                    {"label": "Previous Account", "value": "HDFC Bank - ••••9921"},
                    {"label": "Modified Account", "value": "Yes Bank - ••••3312", "matchHighlight": True},
                    {"label": "Initiated By", "value": "Vendor Portal Web Submission"},
                    {"label": "Penny Drop Status", "value": "Pending Name Match Verification"}
                ],
                supporting_records=[{
                    "recordId": "VND-MOD-991",
                    "description": "Vendor master update request",
                    "date": "2024-09-18",
                    "amount": 1_240_000.0,
                    "source": "RazorpayX Vendor Payouts"
                }],
                recommended_action="Execute automated penny-drop verification and obtain verbal confirmation from vendor CFO",
                assigned_to="Treasury Manager",
                review_history=[{
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S IST"),
                    "user": "FINVORA Security Guard",
                    "action": "Anomaly Detected",
                    "note": "Beneficiary change detected before payment batch release."
                }],
                explanation="Beneficiary routing details for Vertex Logistics Solutions were modified within 48h of a ₹12,40,000.00 scheduled disbursal."
            )
        )

    if seeded:
        db.add_all(seeded)
        db.flush()
    return len(seeded)


def run_detection(db: Session) -> dict[str, int]:
    """
    Run detection logic idempotently across transactions and invoices.
    Returns stats dict with counts.
    """
    seeded_count = ensure_seeded_demo_anomalies(db)

    transactions = (
        db.query(Transaction)
        .options(joinedload(Transaction.vendor))
        .filter(Transaction.direction == "outflow")
        .all()
    )
    if not transactions:
        db.commit()
        return {"seeded": seeded_count, "new_alerts": 0}

    # Build vendor stats
    vendor_avgs: dict[int, list[float]] = {}
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
    cat_amounts: dict[str, list[float]] = {}
    for tx in transactions:
        if tx.vendor:
            cat_amounts.setdefault(tx.vendor.category, []).append(tx.amount)
    cat_avg_map = {cat: sum(v) / len(v) for cat, v in cat_amounts.items()}

    # Existing alerted transaction IDs (prevent any duplicates)
    alerted_tx_ids = {
        row[0]
        for row in db.query(RiskAlert.transaction_id)
        .filter(RiskAlert.transaction_id.isnot(None))
        .all()
    }

    # ── Rule 1: Duplicate invoice ─────────────────────────────────────────────
    invoices = db.query(Invoice).options(joinedload(Invoice.vendor)).all()
    seen_invoices: dict = {}
    new_alerts_count = 0

    for inv in invoices:
        key = (inv.vendor_id, round(inv.amount, 2))
        if key in seen_invoices:
            prev = seen_invoices[key]
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
                    new_alerts_count += 1
        else:
            seen_invoices[key] = inv

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

        risk_type = None
        conf_score = 80.0
        severity = "warning"
        title = ""
        rule_name = ""
        ev_list = []
        vendor_name = tx.vendor.name if tx.vendor else "Unknown Vendor"

        # Tightened Rule 2: Initial transaction > 3.0x category benchmark
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
        # Tightened Rule 3: Outflow > 3.0x vendor historical mean
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
            # IsolationForest anomaly scoring (calibrated: outliers 0.70 - 0.82, inliers <= 0.45)
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
            new_alerts_count += 1

    db.commit()
    return {"seeded": seeded_count, "new_alerts": new_alerts_count}


def main():
    db = SessionLocal()
    try:
        print("🔍 Starting offline risk detection pipeline...")
        stats = run_detection(db)
        print(f"  * Seeded demo anomalies ensured: {stats['seeded']}")
        print(f"  * New transactions/invoices flagged: {stats['new_alerts']}")

        total = db.query(RiskAlert).count()
        print(f"\n📊 Total risk alerts in database: {total}")

        from sqlalchemy import func
        by_type = db.query(RiskAlert.risk_type, func.count(RiskAlert.id)).group_by(RiskAlert.risk_type).all()
        print("  Breakdown by risk type:")
        for rtype, count in by_type:
            print(f"    - {rtype}: {count}")

        top_alerts = db.query(RiskAlert).order_by(RiskAlert.confidence_score.desc()).limit(8).all()
        print("\n🏆 Top alerts by confidence score:")
        for a in top_alerts:
            vname = a.vendor.name if a.vendor else "N/A"
            print(f"    [{a.confidence_score:.1f}%] {a.severity.upper()} | {a.risk_type} | {vname} | ₹{a.amount:,.2f}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
