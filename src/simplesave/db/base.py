"""SQLAlchemy 2.x declarative base, engine, and session factory."""

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from simplesave.core.config import DEFAULT_DATABASE_URL, get_settings


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


def _make_engine() -> Engine:
    settings = get_settings()
    url = settings.database_url or DEFAULT_DATABASE_URL
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(url, pool_pre_ping=True, connect_args=connect_args)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
