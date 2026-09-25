from typing import List
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends

from ..database import get_db
from ..models import DepartmentBudget
from ..schemas import DepartmentBudgetOut

router = APIRouter(prefix="/api/budget", tags=["budget"])


@router.get("", response_model=List[DepartmentBudgetOut])
def get_budgets(db: Session = Depends(get_db)):
    dept_budgets = db.query(DepartmentBudget).all()
    return [
        DepartmentBudgetOut(
            id=b.id,
            department=b.department,
            headOfDepartment=b.head_of_department,
            allocated=b.allocated,
            spent=b.spent,
            committed=b.committed,
            projectedMonthEnd=b.projected_month_end,
            historicalSpend=b.historical_spend,
            varianceAmount=b.variance_amount,
            variancePercentage=b.variance_percentage,
            isUnfavorable=b.is_unfavorable,
            status=b.status,
            categories=b.categories or [],
        )
        for b in dept_budgets
    ]
