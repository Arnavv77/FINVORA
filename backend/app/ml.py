"""
ML utilities: load pickled models at module import time (once),
expose inference helpers used by the routers.
"""
from __future__ import annotations

import os
import pickle
import pathlib
from typing import Optional, Union, Dict, Any, List
from dotenv import load_dotenv

import numpy as np
import pandas as pd

# ── Resolve model directory ───────────────────────────────────────────────────
_BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent   # backend/
MODELS_DIR = _BACKEND_DIR / "models"
load_dotenv(_BACKEND_DIR / ".env")

# ── Lazy singletons ───────────────────────────────────────────────────────────
_anomaly_model = None
_forecast_model = None


def _load_anomaly_model():
    global _anomaly_model
    if _anomaly_model is None:
        p = MODELS_DIR / "anomaly_model.pkl"
        if p.exists():
            with open(p, "rb") as f:
                _anomaly_model = pickle.load(f)
    return _anomaly_model


def _load_forecast_model():
    global _forecast_model
    if _forecast_model is None:
        p = MODELS_DIR / "forecast_model.pkl"
        if p.exists():
            with open(p, "rb") as f:
                _forecast_model = pickle.load(f)
    return _forecast_model


# ── Anomaly scoring ───────────────────────────────────────────────────────────

def anomaly_score(
    amount: float,
    vendor_avg: float,
    days_since_last: float,
    is_new_vendor: int,
) -> float:
    """
    Returns a 0-1 anomaly score (1 = most anomalous).
    Falls back to a rule-based score if the model isn't trained yet.
    """
    model = _load_anomaly_model()
    deviation = (amount - vendor_avg) / (vendor_avg + 1e-9)

    if model is None:
        # Rule-based fallback
        score = min(1.0, abs(deviation) / 5.0)
        if is_new_vendor:
            score = max(score, 0.6)
        return round(score, 4)

    features = np.array([[amount, deviation, days_since_last, is_new_vendor]])
    # IsolationForest: decision_function < 0 is an outlier (anomaly), >= 0 is an inlier
    decision_val = float(model.decision_function(features)[0])
    if decision_val < 0:
        # Outlier anomaly: calibrated between 0.70 and 0.82
        score = min(0.82, 0.70 + abs(decision_val) * 1.0)
    else:
        # Inlier normal point: calibrated between 0.10 and 0.45
        score = max(0.10, 0.45 - decision_val * 2.0)
    return round(float(score), 4)


# ── Forecast helpers ──────────────────────────────────────────────────────────

def _build_lag_features(series: pd.Series, horizon: int) -> pd.DataFrame:
    """
    Given a daily net-cash-flow Series (DatetimeIndex), produce a feature
    DataFrame for horizon future days using the tail of `series`.
    Matches the 7 features in training: lag_7, lag_14, lag_30, roll_7, roll_14, roll_30, dow.
    """
    tail = series.copy()
    rows = []
    for _ in range(horizon):
        row = {
            "lag_7":   float(tail.iloc[-7]) if len(tail) >= 7 else 0.0,
            "lag_14":  float(tail.iloc[-14]) if len(tail) >= 14 else 0.0,
            "lag_30":  float(tail.iloc[-30]) if len(tail) >= 30 else 0.0,
            "roll_7":  float(tail.iloc[-7:].sum()) if len(tail) >= 7 else float(tail.sum()),
            "roll_14": float(tail.iloc[-14:].sum()) if len(tail) >= 14 else float(tail.sum()),
            "roll_30": float(tail.iloc[-30:].sum()) if len(tail) >= 30 else float(tail.sum()),
            "dow":     (tail.index[-1] + pd.Timedelta(days=1)).dayofweek,
        }
        rows.append(row)
        # Append estimated next val so rolling and lags shift forward
        next_val = row["roll_7"] / 7.0 if row["roll_7"] != 0 else 0.0
        new_idx = tail.index[-1] + pd.Timedelta(days=1)
        tail = pd.concat([tail, pd.Series([next_val], index=[new_idx])])
    return pd.DataFrame(rows)


def moving_average_baseline(series: pd.Series, horizon: int, window: int = 14) -> list[float]:
    """Simple rolling-mean baseline."""
    ma = series.rolling(window=window, min_periods=1).mean().iloc[-1]
    return [round(float(ma), 2)] * horizon


def run_forecast(daily_net: pd.Series, horizon: int) -> tuple[list[float], list[float]]:
    """
    Returns (predicted, baseline) lists of length `horizon`.
    Uses LightGBM if available, otherwise falls back to moving average for both.
    """
    model = _load_forecast_model()
    baseline = moving_average_baseline(daily_net, horizon)

    if model is None:
        return baseline, baseline

    X = _build_lag_features(daily_net, horizon)
    predicted = [round(float(v), 2) for v in model.predict(X)]
    return predicted, baseline


# ── LLM explanation ───────────────────────────────────────────────────────────

def generate_explanation(risk_type: str, evidence: dict, return_dict: bool = True) -> Union[dict, str]:
    """
    Generate structured risk analysis:
    {
        "evidence": [{"label": "...", "value": "...", "matchHighlight": bool}],
        "explanation": "...",
        "recommendedAction": "..."
    }
    Tries NVIDIA NIM LLM, then Google Generative AI, then deterministic fallback.
    """
    # Normalize risk_type
    frontend_type = risk_type
    if risk_type in ("amount_spike", "anomaly"):
        frontend_type = "unusual_transaction"
    elif risk_type == "new_vendor_spike":
        frontend_type = "abnormal_vendor_activity"

    # Ensure all monetary evidence is formatted as ₹ (INR)
    evidence_inr = {}
    for k, v in evidence.items():
        if isinstance(v, (int, float)) and any(term in k.lower() for term in ("value", "avg", "amount", "balance", "total", "threshold", "price", "cost", "sum")):
            evidence_inr[k] = f"₹{v:,.2f}"
        else:
            evidence_inr[k] = v

    val_num = float(evidence.get("value") or evidence.get("amount") or 0.0)
    avg_num = float(evidence.get("vendor_avg") or evidence.get("cat_avg") or val_num or 1.0)
    dev_num = float(evidence.get("deviation_multiple") or (val_num / (avg_num + 1e-9) if avg_num else 1.0))
    vendor_name = str(evidence.get("vendor_name") or "Vendor")
    inv_num = str(evidence.get("invoice_num") or "INV-8849")
    dup_of = str(evidence.get("duplicate_of") or "INV-8841")

    # 1. NVIDIA NIM LLM (Structured JSON request)
    nvidia_key = os.getenv("NVIDIA_API_KEY", "")
    nvidia_model = os.getenv("NVIDIA_MODEL", "meta/llama-3.2-11b-vision-instruct")
    if nvidia_key:
        try:
            import requests  # type: ignore
            import json

            prompt = (
                f"You are an enterprise financial risk analyst for an Indian corporation.\n"
                f"Analyze this financial risk alert of type '{frontend_type}'.\n"
                f"Evidence: {evidence_inr}.\n\n"
                f"Respond ONLY with a valid JSON object (no markdown, no extra text) with exact keys:\n"
                f'{{\n'
                f'  "evidence": [\n'
                f'    {{"label": "Submitted Amount", "value": "₹...", "matchHighlight": true}},\n'
                f'    {{"label": "Baseline / Avg", "value": "₹...", "matchHighlight": false}},\n'
                f'    {{"label": "Key Finding", "value": "...", "matchHighlight": true}}\n'
                f'  ],\n'
                f'  "explanation": "One concise sentence (max 25 words) explaining the risk using ₹ symbol (never $ or USD).",\n'
                f'  "recommendedAction": "One clear actionable recommendation for the financial controller."\n'
                f'}}\n'
            )
            headers = {
                "Authorization": f"Bearer {nvidia_key}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
            payload = {
                "model": nvidia_model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are a financial risk analyst. You output ONLY strictly valid JSON. "
                            "Strict currency rule: Always use the Indian Rupee symbol (₹) for all monetary amounts. NEVER use $ or USD."
                        ),
                    },
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 250,
            }
            r = requests.post(
                "https://integrate.api.nvidia.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=12,
            )
            if r.status_code == 200:
                resp_json = r.json()
                raw_content = resp_json["choices"][0]["message"]["content"].strip()
                if raw_content:
                    # Sanitize any accidental dollar signs or USD
                    raw_content = raw_content.replace("$", "₹").replace("USD", "INR")
                    # Extract JSON substring if wrapped in markdown
                    if "```" in raw_content:
                        raw_content = raw_content.split("```")[1]
                        if raw_content.startswith("json"):
                            raw_content = raw_content[4:]
                    try:
                        parsed = json.loads(raw_content, strict=False)
                    except Exception:
                        json_match = re.search(r"\{.*\}", raw_content, re.DOTALL)
                        if json_match:
                            parsed = json.loads(json_match.group(0), strict=False)
                        else:
                            raise
                    if isinstance(parsed, dict) and "explanation" in parsed and "evidence" in parsed:
                        if not return_dict:
                            return parsed["explanation"]
                        return {
                            "evidence": parsed.get("evidence", []),
                            "explanation": parsed.get("explanation", "").strip(),
                            "recommendedAction": parsed.get("recommendedAction", "Review transaction with vendor.").strip()
                        }
        except Exception:
            pass  # fall through to template fallback

    # ── High-Quality Structured Template Fallback ──
    if frontend_type == "duplicate_invoice":
        evidence_list = [
            {"label": "Original Invoice", "value": f"{dup_of} (Cleared)"},
            {"label": "Duplicate Candidate", "value": f"{inv_num} (Pending Batch)", "matchHighlight": True},
            {"label": "Amount Match", "value": f"₹{val_num:,.2f} (100% exact match)", "matchHighlight": True},
            {"label": "Vendor Name", "value": f"{vendor_name}", "matchHighlight": True},
            {"label": "Description Overlap", "value": "Identical invoice amount within 2 days"}
        ]
        explanation = f"Flagged as a duplicate: invoice #{inv_num} matches an earlier invoice within 2 days at the same amount (₹{val_num:,.2f})."
        recommended_action = f"Propose immediate payment hold on {inv_num} and request clarification from {vendor_name} accounting."

    elif frontend_type == "abnormal_vendor_activity":
        evidence_list = [
            {"label": "First Transaction Amount", "value": f"₹{val_num:,.2f}", "matchHighlight": True},
            {"label": "Category Average", "value": f"₹{avg_num:,.2f}"},
            {"label": "Spike Ratio", "value": f"{dev_num:.2f}× Category Benchmark", "matchHighlight": True},
            {"label": "Vendor", "value": f"{vendor_name} (New Onboarding)", "matchHighlight": True}
        ]
        explanation = f"First transaction with {vendor_name} is unusually large at ₹{val_num:,.2f} ({dev_num:.1f}× category average) — warrants verification."
        recommended_action = "Execute automated penny-drop verification and confirm delivery sign-off prior to disbursement."

    elif frontend_type == "budget_deviations":
        evidence_list = [
            {"label": "Department / Category", "value": f"{vendor_name}"},
            {"label": "Committed + Spent", "value": f"₹{val_num:,.2f}", "matchHighlight": True},
            {"label": "Variance Overrun", "value": f"+{dev_num:.1f}% Unfavorable", "matchHighlight": True}
        ]
        explanation = f"Department expenditure of ₹{val_num:,.2f} exceeded pre-approved budget variance threshold (+{dev_num:.1f}%)."
        recommended_action = "Propose inter-departmental budget reallocation or freeze discretionary purchase orders."

    else:  # unusual_transaction
        evidence_list = [
            {"label": "Submitted Outflow", "value": f"₹{val_num:,.2f}", "matchHighlight": True},
            {"label": "90-Day Vendor Average", "value": f"₹{avg_num:,.2f}"},
            {"label": "Spike Multiple", "value": f"{dev_num:.2f}× Historical Baseline", "matchHighlight": True},
            {"label": "Vendor", "value": f"{vendor_name}"}
        ]
        explanation = f"This outflow of ₹{val_num:,.2f} is {dev_num:.1f}× the vendor's normal average of ₹{avg_num:,.2f}, indicating a potential overbilling."
        recommended_action = "Require dual finance controller and department head sign-off before scheduling payment."

    if not return_dict:
        return explanation

    return {
        "evidence": evidence_list,
        "explanation": explanation,
        "recommendedAction": recommended_action
    }

