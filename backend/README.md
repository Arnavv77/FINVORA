# FINVORA Backend — Quick Start

## Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env
# Edit .env → fill in DATABASE_URL, NVIDIA_API_KEY (NVIDIA NIM) or GOOGLE_API_KEY

# 4. Seed the database (run once)
python -m scripts.generate_data

# 5. Train ML models (run once, after seeding)
python -m scripts.train_models

# 6. Start the API server
uvicorn app.main:app --reload --port 8000
```

## API Base URL
`http://localhost:8000`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/dashboard/summary` | KPIs: balance, inflow, outflow, risk count, budget health |
| GET | `/api/transactions?limit=&vendor_id=` | Unified transaction list |
| GET | `/api/risks?status=open` | Risk alerts (auto-detected on first call) |
| GET | `/api/risks/{id}` | Alert detail + LLM explanation (cached) |
| POST | `/api/risks/{id}/action` | Approve or dismiss an alert |
| GET | `/api/forecast?horizon=30\|60\|90` | LightGBM forecast + MA baseline |
| POST | `/api/simulate` | What-if cash-flow simulation |
| GET | `/api/budget` | Budget vs actual per category |

## Project Structure

```
backend/
  app/
    main.py          ← FastAPI app entry point
    database.py      ← SQLAlchemy engine + session
    models.py        ← ORM models (vendors, transactions, …)
    schemas.py       ← Pydantic v2 request/response schemas
    ml.py            ← Model loading + inference helpers
    routers/
      dashboard.py
      transactions.py
      risks.py       ← Detection + approve/dismiss
      forecast.py
      simulate.py
      budget.py
  scripts/
    generate_data.py ← One-time synthetic data seeder
    train_models.py  ← Offline model trainer
  models/            ← Pickled .pkl files (after training)
  requirements.txt
  .env.example
```

## Deliberate Demo Anomalies (always present after seeding)

1. **Duplicate Invoice** — same vendor, same amount, 1 day apart  
2. **Amount Spike** — vendor payment at 3.2–3.9× their average  
3. **New Vendor Spike** — first-ever transaction 3.5× category average  
4. **Budget Overrun** — Marketing at 96 % with days remaining  
