from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import APIRouter, Depends

from ..database import get_db
from ..models import Account, Transaction, RiskAlert, DepartmentBudget
from ..schemas import DashboardSummary

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(db: Session = Depends(get_db)):
    # Total balance across all accounts
    total_balance = db.query(func.coalesce(func.sum(Account.balance), 0.0)).scalar() or 0.0

    # Current calendar month window
    today = date.today()
    month_start = today.replace(day=1)
    month_end = today

    monthly_inflow = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.direction == "inflow",
            Transaction.date >= month_start,
            Transaction.date <= month_end,
        )
        .scalar()
        or 0.0
    )
    monthly_outflow = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0.0))
        .filter(
            Transaction.direction == "outflow",
            Transaction.date >= month_start,
            Transaction.date <= month_end,
        )
        .scalar()
        or 0.0
    )

    open_risk_count = (
        db.query(func.count(RiskAlert.id)).filter(RiskAlert.status == "open").scalar() or 0
    )

    # Budget health: ratio of departments NOT over-budget
    dept_budgets = db.query(DepartmentBudget).all()
    if dept_budgets:
        ok = sum(1 for b in dept_budgets if b.spent <= b.allocated)
        budget_health_pct = round(ok / len(dept_budgets) * 100, 1)
    else:
        budget_health_pct = 100.0

    return DashboardSummary(
        total_balance=round(total_balance, 2),
        monthly_inflow=round(monthly_inflow, 2),
        monthly_outflow=round(monthly_outflow, 2),
        open_risk_count=open_risk_count,
        budget_health_pct=budget_health_pct,
    )
