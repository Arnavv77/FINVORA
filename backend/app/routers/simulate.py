from typing import List

import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction, Invoice, Account
from ..schemas import ForecastResponse, SimulateRequest
from .. import ml
from .forecast import _build_daily_net, build_cash_forecast_points

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

            labels.append(f"Delay payment ₹{amount:,.0f} by {days} days")

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

        elif adj.type == "add_expense":
            amount = float(adj.amount or 0.0)
            labels.append(f"Add expense ₹{amount:,.0f}")
            daily_net.iloc[-1] -= amount

    # Horizon defaults to 30
    horizon = body.horizon or 30
    predicted, baseline = ml.run_forecast(daily_net.sort_index(), horizon)

    liquid_cash = db.query(func.sum(Account.balance)).scalar() or 18_200_000.0
    points = build_cash_forecast_points(daily_net, predicted, current_cash=float(liquid_cash))

    dates = [
        (orig_last_date + pd.Timedelta(days=i + 1)).strftime("%Y-%m-%d")
        for i in range(horizon)
    ]

    scenario_label = " + ".join(labels) if labels else "Custom Scenario"

    return ForecastResponse(
        points=points,
        dates=dates,
        predicted=predicted,
        baseline=baseline,
        scenario_label=scenario_label,
    )
