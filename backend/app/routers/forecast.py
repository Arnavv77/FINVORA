from datetime import date, timedelta
from typing import List, Optional

import pandas as pd
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction, Account
from ..schemas import ForecastResponse, CashForecastPointOut
from .. import ml

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


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

    return ForecastResponse(
        points=points,
        dates=dates,
        predicted=predicted,
        baseline=baseline,
        scenario_label="Baseline Reconciled Plan",
    )
