import os
from datetime import date, timedelta
from typing import List, Optional, Tuple

import pandas as pd
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction, Account, Invoice, Vendor, DepartmentBudget, RiskAlert
from ..schemas import ForecastResponse, CashForecastPointOut, RiskReasonItem
from .. import ml

router = APIRouter(prefix="/api/forecast", tags=["forecast"])

DEFAULT_MIN_CASH_BUFFER = float(os.getenv("MIN_CASH_BUFFER", "10000000.0"))


def _build_daily_net(db: Session) -> pd.Series:
    """Aggregate all transactions into a daily net cash-flow Series."""
    rows = db.query(Transaction.date, Transaction.amount, Transaction.direction).all()
    if not rows:
        today = date.today()
        idx = pd.date_range(end=today, periods=90, freq="D")
        return pd.Series(0.0, index=idx)

    records = []
    for r in rows:
        net = r.amount if r.direction == "inflow" else -r.amount
        records.append({"date": pd.Timestamp(r.date), "net": net})

    df = pd.DataFrame(records)
    daily = df.groupby("date")["net"].sum().sort_index()
    # Fill gaps so every calendar day has a row
    full_idx = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    daily = daily.reindex(full_idx, fill_value=0.0)
    return daily


def build_cash_forecast_points(
    daily_net: pd.Series,
    predicted: List[float],
    current_cash: float = 18_200_000.0,
) -> List[CashForecastPointOut]:
    """
    Builds CashForecastPoint list matching frontend schema:
    - 30 days historical actuals (isHistorical=True, dayIndex -29 to 0)
    - Horizon forward days with Base, Optimistic, and Conservative bands (isHistorical=False)
    """
    points: List[CashForecastPointOut] = []
    last_date = daily_net.index[-1]

    # 1. 30 days historical actuals (Day -29 to Day 0)
    hist_tail = daily_net.iloc[-30:] if len(daily_net) >= 30 else daily_net
    hist_nets = hist_tail.values.tolist()

    # Reconstruct historical running balances leading up to current_cash
    running_balances = [current_cash]
    for n in reversed(hist_nets[1:]):
        running_balances.append(running_balances[-1] - n)
    running_balances = list(reversed(running_balances))

    for idx, (dt, net) in enumerate(zip(hist_tail.index, hist_nets)):
        day_idx = idx - (len(hist_tail) - 1)
        bal = round(float(running_balances[idx]))
        inflow = max(0.0, float(net))
        outflow = max(0.0, -float(net))

        points.append(
            CashForecastPointOut(
                date=dt.strftime("%Y-%m-%d"),
                dayIndex=day_idx,
                isHistorical=True,
                actualBalance=bal,
                forecastBalanceBase=bal,
                forecastBalanceOptimistic=bal,
                forecastBalanceConservative=bal,
                uncertaintyUpper=bal,
                uncertaintyLower=bal,
                inflows=round(inflow, 2),
                outflows=round(outflow, 2),
                netCashFlow=round(float(net), 2),
            )
        )

    # 2. Forward forecast points (Day 1 to horizon)
    base_run = current_cash
    opt_run = current_cash
    cons_run = current_cash

    for i, p_net in enumerate(predicted):
        day_idx = i + 1
        d_str = (last_date + pd.Timedelta(days=day_idx)).strftime("%Y-%m-%d")

        base_in = max(0.0, p_net * 0.7) if p_net > 0 else 750_000.0
        base_out = max(0.0, -p_net * 0.7) if p_net < 0 else 650_000.0

        base_run += p_net
        opt_run += (p_net * 1.15 if p_net >= 0 else p_net * 0.85)
        cons_run += (p_net * 0.85 if p_net >= 0 else p_net * 1.15)

        spread = day_idx * 45_000

        points.append(
            CashForecastPointOut(
                date=d_str,
                dayIndex=day_idx,
                isHistorical=False,
                actualBalance=None,
                forecastBalanceBase=round(base_run),
                forecastBalanceOptimistic=round(opt_run),
                forecastBalanceConservative=round(cons_run),
                uncertaintyUpper=round(base_run + spread),
                uncertaintyLower=round(base_run - spread),
                inflows=round(base_in, 2),
                outflows=round(base_out, 2),
                netCashFlow=round(p_net, 2),
            )
        )

    return points



def classify_cash_risk(closing_cash: float, buffer: float) -> str:
    """Classifies risk level based on projected closing cash vs minimum safe cash buffer."""
    if closing_cash >= buffer:
        return "SAFE"
    elif closing_cash >= 0.5 * buffer:
        return "WATCH"
    elif closing_cash >= 0:
        return "HIGH_RISK"
    else:
        return "CRITICAL"


def assess_forecast_risk(
    db: Session,
    daily_net: pd.Series,
    horizon: int,
    closing_cash: float,
    buffer_amount: float,
) -> Tuple[str, List[RiskReasonItem], List[str]]:
    """
    Computes risk_level, grounds risk reasons in real DB rows (invoices, budgets, tx trends),
    and reuses existing recommended actions from risk_alerts.
    """
    risk_level = classify_cash_risk(closing_cash, buffer_amount)
    risk_reasons: List[RiskReasonItem] = []
    suggested_actions: List[str] = []

    if risk_level != "SAFE":
        last_date = daily_net.index[-1].date()
        end_date = (pd.Timestamp(last_date) + pd.Timedelta(days=horizon)).date()

        # 1. Overdue or soon-due invoices within forecast window
        inv_rows = (
            db.query(Invoice, Vendor.name)
            .join(Vendor, Invoice.vendor_id == Vendor.id)
            .filter(
                Invoice.status.in_(["pending", "overdue"]),
                Invoice.due_date <= end_date,
            )
            .order_by(Invoice.amount.desc())
            .all()
        )

        top_vendor_id = None
        if inv_rows:
            total_inv_amount = sum(row[0].amount for row in inv_rows)
            top_inv, top_vname = inv_rows[0]
            top_vendor_id = top_inv.vendor_id

            risk_reasons.append(
                RiskReasonItem(
                    category="invoice",
                    title=f"Significant Inbound Liabilities ({len(inv_rows)} Invoices)",
                    detail=(
                        f"{len(inv_rows)} pending/overdue invoices totaling ₹{total_inv_amount:,.0f} due within the "
                        f"{horizon}-day window, led by #{top_inv.invoice_number} ({top_vname}, ₹{top_inv.amount:,.0f} due {top_inv.due_date})."
                    ),
                    impact_amount=round(total_inv_amount, 2),
                    entity_name=top_vname,
                )
            )

        # 2. Most over-budget department (from DepartmentBudget table)
        over_budget_depts = (
            db.query(DepartmentBudget)
            .filter(DepartmentBudget.is_unfavorable == True)
            .order_by(DepartmentBudget.variance_amount.desc())
            .all()
        )

        top_dept_name = None
        if over_budget_depts:
            top_dept = over_budget_depts[0]
            top_dept_name = top_dept.department
            risk_reasons.append(
                RiskReasonItem(
                    category="budget",
                    title=f"Budget Overrun in {top_dept.department}",
                    detail=(
                        f"{top_dept.department} department has overrun its approved budget by ₹{top_dept.variance_amount:,.0f} "
                        f"(+{top_dept.variance_percentage:.1f}%), having spent ₹{top_dept.spent:,.0f} against an allocation of ₹{top_dept.allocated:,.0f}."
                    ),
                    impact_amount=round(top_dept.variance_amount, 2),
                    entity_name=top_dept.department,
                )
            )

        # 3. Net cash flow trend from recent transactions
        recent_30 = daily_net.iloc[-30:] if len(daily_net) >= 30 else daily_net
        recent_in = sum(x for x in recent_30 if x > 0)
        recent_out = sum(-x for x in recent_30 if x < 0)
        if recent_out > recent_in:
            net_deficit = recent_out - recent_in
            risk_reasons.append(
                RiskReasonItem(
                    category="trend",
                    title="Outflow Velocity Outpacing Inflows",
                    detail=(
                        f"Trailing 30-day cash outflow (₹{recent_out:,.0f}) exceeds inflow (₹{recent_in:,.0f}) by ₹{net_deficit:,.0f}, "
                        f"depleting working capital reserves faster than replacement cadence."
                    ),
                    impact_amount=round(net_deficit, 2),
                    entity_name="Operating Cash Flow",
                )
            )

        # Step 6: Suggested actions - reuse existing recommended_action from risk_alerts
        # A. Department budget action
        if top_dept_name:
            dept_alert = (
                db.query(RiskAlert)
                .filter(
                    RiskAlert.risk_type == "budget_deviations",
                    RiskAlert.status.in_(["open", "under_review"]),
                )
                .first()
            )
            if dept_alert and dept_alert.recommended_action:
                suggested_actions.append(dept_alert.recommended_action)

        # B. Vendor/Invoice action
        if top_vendor_id:
            vendor_alert = (
                db.query(RiskAlert)
                .filter(
                    RiskAlert.vendor_id == top_vendor_id,
                    RiskAlert.status.in_(["open", "under_review"]),
                )
                .first()
            )
            if vendor_alert and vendor_alert.recommended_action:
                suggested_actions.append(vendor_alert.recommended_action)

        # C. Fallback to duplicate/payment risk actions if needed
        if len(suggested_actions) < 2:
            other_alert = (
                db.query(RiskAlert)
                .filter(
                    RiskAlert.risk_type.in_(["duplicate_invoice", "payment_risks", "unusual_transaction"]),
                    RiskAlert.status.in_(["open", "under_review"]),
                )
                .first()
            )
            if other_alert and other_alert.recommended_action and other_alert.recommended_action not in suggested_actions:
                suggested_actions.append(other_alert.recommended_action)

    return risk_level, risk_reasons, suggested_actions


@router.get("", response_model=ForecastResponse)
def get_forecast(
    horizon: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    daily_net = _build_daily_net(db)
    predicted, baseline = ml.run_forecast(daily_net, horizon)

    # Liquid cash from accounts table or fallback
    liquid_cash = db.query(func.sum(Account.balance)).scalar() or 18_200_000.0

    points = build_cash_forecast_points(daily_net, predicted, current_cash=float(liquid_cash))

    last_date = daily_net.index[-1]
    dates = [
        (last_date + pd.Timedelta(days=i + 1)).strftime("%Y-%m-%d")
        for i in range(horizon)
    ]

    # Future forecast closing cash
    future_points = [p for p in points if not p.isHistorical]
    projected_closing = future_points[-1].forecastBalanceBase if future_points else float(liquid_cash)

    buffer_amount = float(os.getenv("MIN_CASH_BUFFER", str(DEFAULT_MIN_CASH_BUFFER)))
    risk_level, risk_reasons, suggested_actions = assess_forecast_risk(
        db, daily_net, horizon, projected_closing, buffer_amount
    )

    return ForecastResponse(
        points=points,
        dates=dates,
        predicted=predicted,
        baseline=baseline,
        scenario_label="Baseline Reconciled Plan",
        buffer_amount=buffer_amount,
        risk_level=risk_level,
        projected_closing_cash=projected_closing,
        risk_reasons=risk_reasons,
        suggested_actions=suggested_actions,
    )
