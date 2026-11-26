import os
from pathlib import Path
from urllib.parse import urlparse, parse_qs

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Load environment variables from backend/.env (local dev) without overriding host env vars (e.g. Render)
_ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)
load_dotenv()

raw_database_url = os.getenv("DATABASE_URL")
if not raw_database_url:
    raise ValueError(
        "DATABASE_URL environment variable is missing. "
        "Set it in backend/.env for local development or in your Render environment variables."
    )

# Normalize legacy postgres:// scheme for SQLAlchemy 2.x compatibility
DATABASE_URL = (
    raw_database_url.replace("postgres://", "postgresql://", 1)
    if raw_database_url.startswith("postgres://")
    else raw_database_url
)

# Enforce SSL for remote PostgreSQL hosts (such as Neon) unless sslmode is already in the query string
parsed = urlparse(DATABASE_URL)
query_params = parse_qs(parsed.query)
is_local_host = (parsed.hostname or "").lower() in {"localhost", "127.0.0.1", "::1"}

connect_args = {}
if not is_local_host and "sslmode" not in query_params:
    connect_args["sslmode"] = "require"

# Neon serverless pooler closes idle connections; pool_pre_ping + pool_recycle keep pooled connections healthy
engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
