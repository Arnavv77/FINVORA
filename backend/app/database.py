import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool
import pathlib
from dotenv import load_dotenv

_BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv()

_raw_url = os.getenv("DATABASE_URL", "").strip().strip('"').strip("'")

# Supabase sometimes gives "postgres://" — SQLAlchemy needs "postgresql://"
if _raw_url.startswith("postgres://"):
    _raw_url = _raw_url.replace("postgres://", "postgresql://", 1)

# Strip pgbouncer flag from URL — we handle it via engine options instead
if "?pgbouncer=true" in _raw_url:
    _raw_url = _raw_url.replace("?pgbouncer=true", "")
if "&pgbouncer=true" in _raw_url:
    _raw_url = _raw_url.replace("&pgbouncer=true", "")

DATABASE_URL = _raw_url

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example → backend/.env "
        "and fill in your Supabase connection string."
    )

# ── Supabase pgbouncer (transaction-mode pooler) requirements:
#    • NullPool  — don't keep idle connections; pgbouncer manages the pool
#    • prepared_statements disabled — pgbouncer transaction mode doesn't support them
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,          # let pgbouncer own the pool
    connect_args={
        "options": "-c statement_timeout=30000",
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency — yields a DB session, closes on exit."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
