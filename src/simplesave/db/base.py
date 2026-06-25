"""SQLAlchemy 2.x declarative base, engine, and session factory.

Import all ORM models into ``simplesave.db.models`` so that ``Base.metadata``
is fully populated for Alembic autogenerate. No models exist yet — they are
added per feature.
"""

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from simplesave.core.config import get_settings


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


def _make_engine() -> Engine | None:
    """Create the SQLAlchemy engine from settings.

    Returns ``None`` until ``DATABASE_URL`` is configured, so importing this
    module never fails at skeleton stage.
    """
    url = get_settings().database_url
    if not url:
        return None
    return create_engine(url, pool_pre_ping=True)


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
