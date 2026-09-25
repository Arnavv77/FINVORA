import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from .database import engine, Base
from .routers import (
    dashboard_router,
    transactions_router,
    risks_router,
    forecast_router,
    simulate_router,
    budget_router,
    copilot_router,
)

# ── Create tables (idempotent; use Alembic for production migrations) ─────────
Base.metadata.create_all(bind=engine)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FINVORA API",
    description="AI-powered Financial Intelligence & Decision Support — hackathon build",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(dashboard_router)
app.include_router(transactions_router)
app.include_router(risks_router)
app.include_router(forecast_router)
app.include_router(simulate_router)
app.include_router(budget_router)
app.include_router(copilot_router)



# ── Global error handler — no raw stack traces ────────────────────────────────
@app.exception_handler(Exception)
async def generic_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "finvora-api"}
