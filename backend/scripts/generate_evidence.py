from __future__ import annotations

import sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models import RiskAlert
from app.ml import generate_explanation


def process_alert(alert_id: int) -> tuple[int, dict]:
    db = SessionLocal()
    try:
        alert = db.query(RiskAlert).filter(RiskAlert.id == alert_id).first()
        if not alert:
            return alert_id, {}

        vendor_name = alert.vendor.name if alert.vendor else "Enterprise Vendor"
        ev_context = {
            "value": alert.amount,
            "amount": alert.amount,
            "vendor_name": vendor_name,
            "score": alert.confidence_score,
            "confidence_score": alert.confidence_score,
            "risk_type": alert.risk_type,
        }
        if isinstance(alert.evidence, list):
            for item in alert.evidence:
                if isinstance(item, dict) and "label" in item and "value" in item:
                    ev_context[item["label"]] = item["value"]

        structured = generate_explanation(alert.risk_type, ev_context, return_dict=True)
        return alert_id, structured
    finally:
        db.close()


def precompute_evidence():
    db = SessionLocal()
    try:
        alerts = db.query(RiskAlert).all()
        alert_ids = [a.id for a in alerts]
        print(f"🔍 Precomputing structured LLM evidence for {len(alert_ids)} risk alerts offline...")

        # Process top alerts concurrently with workers
        results = {}
        with ThreadPoolExecutor(max_workers=8) as executor:
            future_to_id = {executor.submit(process_alert, aid): aid for aid in alert_ids}
            done_count = 0
            for future in as_completed(future_to_id):
                aid, structured = future.result()
                results[aid] = structured
                done_count += 1
                if done_count % 50 == 0 or done_count == len(alert_ids):
                    print(f"  Precomputed {done_count}/{len(alert_ids)} alerts...")

        # Save back to database
        print("💾 Saving precomputed evidence & explanations to database...")
        for alert in alerts:
            data = results.get(alert.id)
            if data and isinstance(data, dict):
                alert.evidence = data.get("evidence", alert.evidence)
                alert.explanation = data.get("explanation", alert.explanation)
                alert.recommended_action = data.get("recommendedAction", alert.recommended_action)
            elif data:
                alert.explanation = str(data)

            if alert.confidence_score is not None and alert.confidence_score <= 1.0:
                alert.confidence_score = round(alert.confidence_score * 100, 1)

        db.commit()
        print(f"✅ Successfully batch-precomputed and stored evidence on all {len(alerts)} rows offline!")
    finally:
        db.close()


if __name__ == "__main__":
    precompute_evidence()

