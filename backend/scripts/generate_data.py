"""
generate_data.py — Populate the database with ~6 months of realistic synthetic data
directly matching the frontend schema and vocabulary.

Usage:
    cd backend
    python -m scripts.generate_data [--reset]
"""
from __future__ import annotations

import os
import sys
import random
from datetime import date, datetime, timedelta
from pathlib import Path

# Allow running as a module from backend/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from faker import Faker
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models import Vendor, Account, Transaction, Invoice, DepartmentBudget, RiskAlert

fake = Faker("en_IN")
random.seed(42)
Faker.seed(42)

PERIOD_MONTHS = 6
TODAY = date.today()
START_DATE = (TODAY.replace(day=1) - timedelta(days=PERIOD_MONTHS * 30)).replace(day=1)

CATEGORIES = {
    "Software & Cloud":        {"count": 5, "avg_range": (80_000, 450_000), "dept": "IT & Infrastructure"},
    "Logistics & Supply":       {"count": 5, "avg_range": (60_000, 300_000), "dept": "Sales & Operations"},
    "Capital Equipment":       {"count": 4, "avg_range": (300_000, 1_500_000), "dept": "Engineering"},
    "Marketing & Media":       {"count": 4, "avg_range": (70_000, 350_000), "dept": "Marketing & Growth"},
    "Office & Facilities":     {"count": 3, "avg_range": (40_000, 180_000), "dept": "HR & Admin"},
    "Legal & Professional":    {"count": 5, "avg_range": (90_000, 400_000), "dept": "Finance & Legal"},
}

SOURCE_SYSTEMS = [
    "HDFC Corporate Current A/C",
    "RazorpayX Vendor Payouts",
    "SAP S/4HANA Cloud",
    "Zoho Books Enterprise",
    "ICICI Treasury & Forex A/C",
]


def random_date(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, max(1, delta)))


def generate(db: Session) -> None:
    print(">> Starting frontend-native synthetic data generation...")

    # -- Accounts --------------------------------------------------------------
    accounts = [
        Account(name="HDFC Corporate Current A/C",   type="checking", balance=12_450_000.0),
        Account(name="ICICI Treasury & Forex A/C",   type="savings",  balance=5_750_000.0),
        Account(name="RazorpayX Vendor Payouts",     type="checking", balance=1_850_000.0),
        Account(name="Corporate Credit Line",        type="credit",   balance=500_000.0),
    ]
    db.add_all(accounts)
    db.flush()
    print(f"  * {len(accounts)} liquid accounts created (Total Balance: ₹{sum(a.balance for a in accounts):,.2f})")

    # -- Vendors ---------------------------------------------------------------
    vendors: list[Vendor] = []
    # Seed known enterprise vendors from frontend mockData
    seed_vendors = [
        ("Zenith Cloud Services Pvt Ltd", "Software & Cloud"),
        ("Cognitive Infotech Solutions", "Software & Cloud"),
        ("HyperScale Systems Pvt Ltd", "Capital Equipment"),
        ("Apex Growth Media LLP", "Marketing & Media"),
        ("Shardul Amarchand & Partners", "Legal & Professional"),
        ("Embassy Tech Parks REIT", "Office & Facilities"),
        ("BlueDart DHL Express Ltd", "Logistics & Supply"),
        ("Vertex Logistics Solutions", "Logistics & Supply"),
    ]
    for vname, vcat in seed_vendors:
        avg = (CATEGORIES[vcat]["avg_range"][0] + CATEGORIES[vcat]["avg_range"][1]) / 2.0
        v = Vendor(
            name=vname,
            category=vcat,
            first_seen_date=START_DATE,
            avg_transaction_amount=round(avg, 2),
        )
        vendors.append(v)
        db.add(v)

    for category, cfg in CATEGORIES.items():
        for _ in range(cfg["count"]):
            avg = random.uniform(*cfg["avg_range"])
            first_seen = random_date(START_DATE, START_DATE + timedelta(days=30))
            v = Vendor(
                name=fake.company() + " Ltd",
                category=category,
                first_seen_date=first_seen,
                avg_transaction_amount=round(avg, 2),
            )
            vendors.append(v)
            db.add(v)

    db.flush()
    print(f"  * {len(vendors)} vendors across {len(CATEGORIES)} categories")

    # -- Transactions + Invoices -----------------------------------------------
    transactions: list[Transaction] = []
    invoices: list[Invoice] = []
    invoice_counter = 8000

    target_tx = random.randint(480, 560)
    for vendor in vendors:
        tx_count = max(6, int(target_tx / len(vendors)) + random.randint(-2, 3))
        dept = CATEGORIES.get(vendor.category, {}).get("dept", "Engineering")

        for _ in range(tx_count):
            tx_date = random_date(vendor.first_seen_date, TODAY - timedelta(days=1))
            amount = round(
                random.gauss(vendor.avg_transaction_amount, vendor.avg_transaction_amount * 0.22),
                2,
            )
            amount = max(5000.0, amount)

            acct = random.choice(accounts)
            src = random.choice(SOURCE_SYSTEMS)
            invoice_counter += 1

            due = tx_date + timedelta(days=random.choice([15, 30, 45]))
            status = "cleared" if due < TODAY else "pending"

            tx = Transaction(
                reference_no=f"TXN-{invoice_counter}",
                description=f"Operational payment to {vendor.name} ({vendor.category})",
                vendor_id=vendor.id,
                account_id=acct.id,
                category=vendor.category,
                department=dept,
                amount=amount,
                date=tx_date,
                direction="outflow",
                source_system=src,
                status=status,
                is_anomaly=False,
            )
            db.add(tx)
            transactions.append(tx)

            inv_status = "paid" if due < TODAY else "pending"
            if due < TODAY - timedelta(days=10) and random.random() < 0.12:
                inv_status = "overdue"

            inv = Invoice(
                vendor_id=vendor.id,
                invoice_number=f"INV-2024-{invoice_counter}",
                amount=amount,
                issue_date=tx_date,
                due_date=due,
                status=inv_status,
            )
            db.add(inv)
            invoices.append(inv)

    # Inflows (Customer Collections & Subscriptions)
    for _ in range(95):
        acct = random.choice(accounts[:2])
        tx_date = random_date(START_DATE, TODAY - timedelta(days=1))
        amount = round(random.uniform(250_000, 1_850_000), 2)
        invoice_counter += 1
        db.add(Transaction(
            reference_no=f"REC-{invoice_counter}",
            description="Enterprise Client Subscription Settlement",
            vendor_id=None,
            account_id=acct.id,
            category="Customer Revenue",
            department="Sales & Operations",
            amount=amount,
            date=tx_date,
            direction="inflow",
            source_system="HDFC Corporate Current A/C",
            status="cleared",
            is_anomaly=False,
        ))

    db.flush()
    print(f"  * ~{len(transactions)} outflow transactions + {len(invoices)} invoices + 95 inflows")

    # -- STEP 6: Department Budgets with Hierarchy -----------------------------
    dept_budgets = [
        DepartmentBudget(
            id="dept-eng",
            department="Engineering",
            head_of_department="Dr. Vikramaditya Sen (VP Eng)",
            allocated=12_000_000.0,
            spent=9_450_000.0,
            committed=1_550_000.0,
            projected_month_end=11_000_000.0,
            historical_spend=9_200_000.0,
            variance_amount=-1_000_000.0,
            variance_percentage=-8.3,
            is_unfavorable=False,
            status="on_track",
            categories=[
                {"name": "Cloud Infrastructure", "allocated": 4_500_000.0, "spent": 3_900_000.0},
                {"name": "Tooling & Licenses", "allocated": 2_500_000.0, "spent": 2_100_000.0},
                {"name": "Contract Staffing", "allocated": 3_500_000.0, "spent": 2_600_000.0},
                {"name": "R&D Hardware", "allocated": 1_500_000.0, "spent": 850_000.0},
            ]
        ),
        DepartmentBudget(
            id="dept-mktg",
            department="Marketing & Growth",
            head_of_department="Ananya Deshmukh (CMO)",
            allocated=4_500_000.0,
            spent=4_860_000.0,
            committed=450_000.0,
            projected_month_end=5_310_000.0,
            historical_spend=4_100_000.0,
            variance_amount=810_000.0,
            variance_percentage=18.0,
            is_unfavorable=True,
            status="over_budget",
            categories=[
                {"name": "Performance Advertising", "allocated": 2_200_000.0, "spent": 2_750_000.0},
                {"name": "Agency Retainers", "allocated": 1_000_000.0, "spent": 980_000.0},
                {"name": "Events & Conferences", "allocated": 800_000.0, "spent": 780_000.0},
                {"name": "Brand & Creative Assets", "allocated": 500_000.0, "spent": 350_000.0},
            ]
        ),
        DepartmentBudget(
            id="dept-sales",
            department="Sales & Operations",
            head_of_department="Rohan Mehra (VP Sales)",
            allocated=7_500_000.0,
            spent=5_820_000.0,
            committed=890_000.0,
            projected_month_end=6_710_000.0,
            historical_spend=5_500_000.0,
            variance_amount=-790_000.0,
            variance_percentage=-10.5,
            is_unfavorable=False,
            status="on_track",
            categories=[
                {"name": "Logistics & Supply Chain", "allocated": 3_500_000.0, "spent": 2_820_000.0},
                {"name": "CRM & Sales Enablement", "allocated": 1_800_000.0, "spent": 1_450_000.0},
                {"name": "Travel & Client Hospitality", "allocated": 1_200_000.0, "spent": 850_000.0},
                {"name": "Field Operations", "allocated": 1_000_000.0, "spent": 700_000.0},
            ]
        ),
        DepartmentBudget(
            id="dept-it",
            department="IT & Infrastructure",
            head_of_department="Sameer Verma (Head of IT)",
            allocated=5_000_000.0,
            spent=4_650_000.0,
            committed=320_000.0,
            projected_month_end=4_970_000.0,
            historical_spend=4_400_000.0,
            variance_amount=-30_000.0,
            variance_percentage=-0.6,
            is_unfavorable=False,
            status="on_track",
            categories=[
                {"name": "Cybersecurity & Identity", "allocated": 1_800_000.0, "spent": 1_650_000.0},
                {"name": "Workplace Hardware", "allocated": 1_200_000.0, "spent": 1_150_000.0},
                {"name": "Network & Colocation", "allocated": 1_000_000.0, "spent": 950_000.0},
                {"name": "IT SaaS Subscriptions", "allocated": 1_000_000.0, "spent": 900_000.0},
            ]
        ),
        DepartmentBudget(
            id="dept-hr",
            department="HR & Admin",
            head_of_department="Priya Nair (VP People)",
            allocated=3_500_000.0,
            spent=3_280_000.0,
            committed=150_000.0,
            projected_month_end=3_430_000.0,
            historical_spend=3_100_000.0,
            variance_amount=-70_000.0,
            variance_percentage=-2.0,
            is_unfavorable=False,
            status="on_track",
            categories=[
                {"name": "Office Leases & Facilities", "allocated": 1_800_000.0, "spent": 1_750_000.0},
                {"name": "Health & Insurance", "allocated": 1_000_000.0, "spent": 920_000.0},
                {"name": "Talent Acquisition", "allocated": 400_000.0, "spent": 380_000.0},
                {"name": "Employee Engagement", "allocated": 300_000.0, "spent": 230_000.0},
            ]
        ),
        DepartmentBudget(
            id="dept-fin",
            department="Finance & Legal",
            head_of_department="Rajesh Gopinathan (CFO)",
            allocated=4_000_000.0,
            spent=3_680_000.0,
            committed=240_000.0,
            projected_month_end=3_920_000.0,
            historical_spend=3_450_000.0,
            variance_amount=-80_000.0,
            variance_percentage=-2.0,
            is_unfavorable=False,
            status="on_track",
            categories=[
                {"name": "Audit & Tax Filing", "allocated": 1_500_000.0, "spent": 1_400_000.0},
                {"name": "Corporate Legal Counsel", "allocated": 1_500_000.0, "spent": 1_380_000.0},
                {"name": "Banking & Merchant Fees", "allocated": 600_000.0, "spent": 550_000.0},
                {"name": "Treasury Management", "allocated": 400_000.0, "spent": 350_000.0},
            ]
        ),
    ]
    db.add_all(dept_budgets)
    db.flush()
    print(f"  * {len(dept_budgets)} department budgets created with categories hierarchy")

    # -- STEP 2 & 3: Seeded Risk Alerts in Frontend Exact Shape ------------------
    # Find Zenith Cloud vendor
    zenith = db.query(Vendor).filter(Vendor.name.like("%Zenith Cloud%")).first() or vendors[0]
    hyperscale = db.query(Vendor).filter(Vendor.name.like("%HyperScale%")).first() or vendors[1]
    apex = db.query(Vendor).filter(Vendor.name.like("%Apex Growth%")).first() or vendors[2]
    vertex = db.query(Vendor).filter(Vendor.name.like("%Vertex%")).first() or vendors[3]

    anomalies = [
        # Anomaly 1: Duplicate invoice
        RiskAlert(
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
                "timestamp": "2024-09-24 09:14:02 IST",
                "user": "FINVORA Predictive Engine",
                "action": "Anomaly Detected",
                "note": "High confidence duplicate detected upon Zoho Books sync."
            }],
            explanation="Flagged as a duplicate: invoice #INV-2024-8849 from Zenith Cloud Services matches cleared invoice #INV-2024-8841 within 6 days at the exact same amount (₹6,80,000.00)."
        ),
        # Anomaly 2: Unusual transaction spike
        RiskAlert(
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
                    "timestamp": "2024-09-21 14:22:10 IST",
                    "user": "FINVORA Rule Engine",
                    "action": "Anomaly Detected",
                    "note": "Outlier flag triggered based on 90-day moving window."
                },
                {
                    "timestamp": "2024-09-22 11:05:00 IST",
                    "user": "Pooja Sharma (Analyst)",
                    "action": "Review Started",
                    "note": "Requested signed contract and delivery receipts from Engineering PM."
                }
            ],
            explanation="This outflow of ₹38,50,000.00 is 9.2× the vendor's normal 90-day average of ₹4,20,000.00, indicating an unapproved capex spike."
        ),
        # Anomaly 3: Department budget deviation
        RiskAlert(
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
                "timestamp": "2024-09-19 16:40:00 IST",
                "user": "FINVORA Budget Engine",
                "action": "Anomaly Detected",
                "note": "Marketing variance threshold exceeded."
            }],
            explanation="Marketing & Growth department spend reached ₹48,60,000.00 against an allocation of ₹45,00,000.00, creating an 8.0% unfavorable budget overrun."
        ),
        # Anomaly 4: Abnormal vendor activity
        RiskAlert(
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
                "timestamp": "2024-09-18 10:11:00 IST",
                "user": "FINVORA Security Guard",
                "action": "Anomaly Detected",
                "note": "Beneficiary change detected before payment batch release."
            }],
            explanation="Beneficiary routing details for Vertex Logistics Solutions were modified within 48h of a ₹12,40,000.00 scheduled disbursal."
        )
    ]
    db.add_all(anomalies)

    db.commit()
    print(f"  * 4 deliberate demo anomalies seeded matching frontend exact types & confidence (0-100)")
    print("\n* Data generation complete.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="Drop and recreate all tables")
    args = parser.parse_args()

    if args.reset:
        print("Dropping all tables to apply new frontend-native schema...")
        Base.metadata.drop_all(bind=engine)

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        generate(db)
    finally:
        db.close()
