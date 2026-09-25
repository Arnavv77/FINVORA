"""
train_models.py — run once (offline) after generate_data.py has populated the DB.

Trains:
  1. IsolationForest  → models/anomaly_model.pkl
  2. LightGBM regressor → models/forecast_model.pkl

Usage:
    cd backend
    python -m scripts.train_models
"""
from __future__ import annotations

import os
import sys
import pickle
import pathlib

import numpy as np
import pandas as pd

# Allow running as a module from backend/
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal
from app.models import Transaction, Vendor

MODELS_DIR = pathlib.Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def build_transaction_features(db) -> pd.DataFrame:
    """Features for IsolationForest: amount, deviation, days_since_last, is_new_vendor."""
    txs = (
        db.query(Transaction)
        .filter(Transaction.direction == "outflow", Transaction.vendor_id.isnot(None))
        .order_by(Transaction.vendor_id, Transaction.date)
        .all()
    )

    # Vendor averages + first dates
    from sqlalchemy import func
    vendor_stats = (
        db.query(
            Transaction.vendor_id,
            func.avg(Transaction.amount).label("avg_amt"),
            func.min(Transaction.date).label("first_date"),
        )
        .filter(Transaction.direction == "outflow", Transaction.vendor_id.isnot(None))
        .group_by(Transaction.vendor_id)
        .all()
    )
    avg_map = {r.vendor_id: float(r.avg_amt) for r in vendor_stats}
    first_map = {r.vendor_id: r.first_date for r in vendor_stats}

    rows = []
    last_date_map: dict[int, any] = {}
    for tx in txs:
        vid = tx.vendor_id
        vavg = avg_map.get(vid, tx.amount)
        is_new = 1 if tx.date == first_map.get(vid) else 0
        days_since = (tx.date - last_date_map[vid]).days if vid in last_date_map else 0
        deviation = (tx.amount - vavg) / (vavg + 1e-9)
        rows.append({
            "amount": tx.amount,
            "deviation": deviation,
            "days_since_last": days_since,
            "is_new_vendor": is_new,
        })
        last_date_map[vid] = tx.date

    return pd.DataFrame(rows)


def build_daily_cashflow(db) -> pd.Series:
    """Daily net cash flow for LightGBM training."""
    txs = db.query(Transaction.date, Transaction.amount, Transaction.direction).all()
    records = [
        {"date": pd.Timestamp(r.date), "net": r.amount if r.direction == "inflow" else -r.amount}
        for r in txs
    ]
    if not records:
        raise RuntimeError("No transactions found — run generate_data.py first.")

    df = pd.DataFrame(records)
    daily = df.groupby("date")["net"].sum().sort_index()
    full_idx = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    return daily.reindex(full_idx, fill_value=0.0)


def build_lgbm_dataset(daily: pd.Series):
    """Lag features → X, y for supervised learning."""
    df = pd.DataFrame({"y": daily.values}, index=daily.index)
    df["lag_7"]  = df["y"].shift(7).fillna(0)
    df["lag_14"] = df["y"].shift(14).fillna(0)
    df["lag_30"] = df["y"].shift(30).fillna(0)
    df["roll_7"]  = df["y"].shift(1).rolling(7,  min_periods=1).sum()
    df["roll_14"] = df["y"].shift(1).rolling(14, min_periods=1).sum()
    df["roll_30"] = df["y"].shift(1).rolling(30, min_periods=1).sum()
    df["dow"] = df.index.dayofweek

    feature_cols = ["lag_7", "lag_14", "lag_30", "roll_7", "roll_14", "roll_30", "dow"]
    df = df.dropna()
    return df[feature_cols], df["y"]


def train_anomaly_model(db):
    print("🔧  Training IsolationForest…")
    from sklearn.ensemble import IsolationForest

    features_df = build_transaction_features(db)
    if features_df.empty:
        print("   ⚠  No outflow transactions — skipping anomaly model.")
        return

    X = features_df.values
    model = IsolationForest(
        n_estimators=200,
        contamination=0.03,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X)

    path = MODELS_DIR / "anomaly_model.pkl"
    with open(path, "wb") as f:
        pickle.dump(model, f)
    print(f"   ✔ Saved → {path}  (trained on {len(X)} transactions)")


def train_forecast_model(db):
    print("🔧  Training LightGBM cash-flow forecaster…")
    import lightgbm as lgb

    daily = build_daily_cashflow(db)
    X, y = build_lgbm_dataset(daily)

    if len(X) < 30:
        print("   ⚠  Not enough data for LightGBM — need ≥30 rows. Skipping.")
        return

    # Simple train/val split (last 20 % for validation)
    split = int(len(X) * 0.8)
    X_train, X_val = X.iloc[:split], X.iloc[split:]
    y_train, y_val = y.iloc[:split], y.iloc[split:]

    train_set = lgb.Dataset(X_train, label=y_train)
    val_set   = lgb.Dataset(X_val,   label=y_val, reference=train_set)

    params = {
        "objective":      "regression",
        "metric":         "rmse",
        "learning_rate":  0.05,
        "num_leaves":     31,
        "feature_fraction": 0.8,
        "bagging_fraction": 0.8,
        "bagging_freq":   5,
        "verbose":        -1,
        "n_jobs":         -1,
    }
    model = lgb.train(
        params,
        train_set,
        num_boost_round=300,
        valid_sets=[val_set],
        callbacks=[lgb.early_stopping(20, verbose=False), lgb.log_evaluation(0)],
    )

    path = MODELS_DIR / "forecast_model.pkl"
    with open(path, "wb") as f:
        pickle.dump(model, f)
    print(f"   ✔ Saved → {path}  (best iteration: {model.best_iteration})")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        train_anomaly_model(db)
        train_forecast_model(db)
        print("\n✅  All models trained and saved.")
    finally:
        db.close()
