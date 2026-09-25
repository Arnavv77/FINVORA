from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from fastapi import APIRouter, Depends, Query

from ..database import get_db
from ..models import Transaction
from ..schemas import TransactionOut

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionOut])
def list_transactions(
    limit: int = Query(default=100, le=500),
    vendor_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Transaction)
        .options(joinedload(Transaction.vendor))
        .order_by(Transaction.date.desc())
    )
    if vendor_id is not None:
        q = q.filter(Transaction.vendor_id == vendor_id)

    rows = q.limit(limit).all()

    result = []
    for tx in rows:
        result.append(
            TransactionOut(
                id=f"TXN-{tx.id:04d}",
                referenceNo=tx.reference_no or f"TXN-{tx.id:04d}",
                description=tx.description or f"Payment - {tx.vendor.name if tx.vendor else 'Direct Transfer'}",
                vendorId=f"VND-{tx.vendor_id}" if tx.vendor_id else None,
                vendorName=tx.vendor.name if tx.vendor else "Internal Disbursal",
                category=tx.category or (tx.vendor.category if tx.vendor else "Operating Expense"),
                department=tx.department or "Engineering",
                amount=tx.amount,
                date=tx.date.strftime("%Y-%m-%d"),
                type=tx.direction,
                status=tx.status or "cleared",
                source=tx.source_system or "HDFC Corporate Current A/C",
                isAnomaly=bool(tx.is_anomaly),
                notes=tx.notes,
            )
        )
    return result
