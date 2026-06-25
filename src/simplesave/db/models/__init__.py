"""ORM model registry — import all models so Alembic sees metadata."""

from simplesave.db.models.user import Application, ClockTemplateConfig, Lead, User

__all__ = ["Application", "ClockTemplateConfig", "Lead", "User"]
