import os
from typing import List

import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction, Invoice, Account
from ..schemas import ForecastResponse, SimulateRequest
from .. import ml
from .forecast import _build_daily_net, build_cash_forecast_points, assess_forecast_risk, DEFAULT_MIN_CASH_BUFFER

router = APIRouter(prefix="/api/simulate", tags=["simulate"])


@router.post("", response_model=ForecastResponse)
def simulate(body: SimulateRequest, db: Session = Depends(get_db)):
    daily_net = _build_daily_net(db).copy()
    orig_last_date = daily_net.index[-1]

    labels = []
    for adj in body.adjustments:
        if adj.type == "delay_payment":
            days = adj.days or 30
            amount = adj.amount
            if not amount and adj.vendor_id:
                # Find recent outflow for this vendor
                vendor_tx = (
                    db.query(Transaction.amount)
                    .filter(
                        Transaction.vendor_id == adj.vendor_id,
                        Transaction.direction == "outflow",
                    )
                    .order_by(Transaction.date.desc())
                    .first()
                )
                if vendor_tx:
                    amount = float(vendor_tx[0])
                else:
                    inv = (
                        db.query(Invoice.amount)
                        .filter(Invoice.vendor_id == adj.vendor_id)
                        .order_by(Invoice.due_date.desc())
                        .first()
                    )
                    if inv:
                        amount = float(inv[0])
            amount = float(amount or 50000.0)

            labels.append(f"Delay vendor payment ₹{amount:,.0f} by {days} days")

            # Outflow is delayed: relieve cash from current period
            daily_net.iloc[-1] += amount

            # Scheduled deferred outflow at future_date
            future_date = orig_last_date + pd.Timedelta(days=days)
            if future_date in daily_net.index:
                daily_net[future_date] -= amount
            else:
                daily_net = pd.concat(
                    [daily_net, pd.Series([-amount], index=[future_date])]
                )

        elif adj.type == "delay_receivable":
            # Step 4(b): Customer receivable delay - reduces near-term inflow and defers it
            days = adj.days or 30
            amount = float(adj.amount or 1000000.0)
            labels.append(f"Delay customer receipt ₹{amount:,.0f} by {days} days")

            # Inflow is delayed: reduce cash from current period
            daily_net.iloc[-1] -= amount

            # Scheduled deferred inflow at future_date
            future_date = orig_last_date + pd.Timedelta(days=days)
            if future_date in daily_net.index:
                daily_net[future_date] += amount
            else:
                daily_net = pd.concat(
                    [daily_net, pd.Series([amount], index=[future_date])]
                )

        elif adj.type == "add_expense":
            amount = float(adj.amount or 0.0)
            labels.append(f"Add expense ₹{amount:,.0f}")
            daily_net.iloc[-1] -= amount

    # Horizon defaults to 30
    horizon = body.horizon or 30

    # Base ML forecast
    predicted, baseline = ml.run_forecast(daily_net.sort_index(), horizon)

    # Apply direct cash-flow shifts to predicted net flows
    simulated_predicted = list(predicted)
    for adj in body.adjustments:
        if adj.type == "delay_payment":
            days = adj.days or 30
            amt = float(adj.amount or 50000.0)
            # Immediate relief in near term (day 1)
            if len(simulated_predicted) > 0:
                simulated_predicted[0] += amt
            # Outflow deferred to day `days + 1`
            target_defer_day = days + 1
            if 0 < target_defer_day <= len(simulated_predicted):
                simulated_predicted[target_defer_day - 1] -= amt

        elif adj.type == "delay_receivable":
            days = adj.days or 30
            amt = float(adj.amount or 1000000.0)
            # Inflow reduced in near term (day 1)
            if len(simulated_predicted) > 0:
                simulated_predicted[0] -= amt
            # Inflow deferred to day `days + 1`
            target_defer_day = days + 1
            if 0 < target_defer_day <= len(simulated_predicted):
                simulated_predicted[target_defer_day - 1] += amt

        elif adj.type == "add_expense":
            amt = float(adj.amount or 0.0)
            if len(simulated_predicted) > 0:
                simulated_predicted[0] -= amt

    liquid_cash = db.query(func.sum(Account.balance)).scalar() or 18_200_000.0
    points = build_cash_forecast_points(daily_net, simulated_predicted, current_cash=float(liquid_cash))

    dates = [
        (orig_last_date + pd.Timedelta(days=i + 1)).strftime("%Y-%m-%d")
        for i in range(horizon)
    ]

    scenario_label = " + ".join(labels) if labels else "Custom Scenario"

    # Future forecast closing cash under simulation
    future_points = [p for p in points if not p.isHistorical]
    projected_closing = future_points[-1].forecastBalanceBase if future_points else float(liquid_cash)

    buffer_amount = float(os.getenv("MIN_CASH_BUFFER", str(DEFAULT_MIN_CASH_BUFFER)))
    risk_level, risk_reasons, suggested_actions = assess_forecast_risk(
        db, daily_net, horizon, projected_closing, buffer_amount
    )

    return ForecastResponse(
        points=points,
        dates=dates,
        predicted=simulated_predicted,
        baseline=baseline,
        scenario_label=scenario_label,
        buffer_amount=buffer_amount,
        risk_level=risk_level,
        projected_closing_cash=projected_closing,
        risk_reasons=risk_reasons,
        suggested_actions=suggested_actions,
    )
