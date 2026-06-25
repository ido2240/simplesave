"""ORM models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from simplesave.db.base import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="client")
    token: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    applications: Mapped[list[Application]] = relationship(back_populates="user")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    service_type: Mapped[str] = mapped_column(String(32))
    questionnaire: Mapped[dict[str, Any]] = mapped_column(JSON)
    validation: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    clocks: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    applications: Mapped[list[Application]] = relationship(back_populates="lead")


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    lead_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("leads.id"), nullable=True)
    service_type: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="draft")
    path: Mapped[str | None] = mapped_column(String(32), nullable=True)
    selected_clock: Mapped[str | None] = mapped_column(String(16), nullable=True)
    personal_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    documents: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User | None] = relationship(back_populates="applications")
    lead: Mapped[Lead | None] = relationship(back_populates="applications")


class ClockTemplateConfig(Base):
    """Manager-editable clock templates (JSON route specs)."""

    __tablename__ = "clock_template_configs"

    key: Mapped[str] = mapped_column(String(16), primary_key=True)
    name_he: Mapped[str] = mapped_column(String(128))
    route_specs: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    duplicate_flag: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


__all__ = ["Application", "ClockTemplateConfig", "Lead", "User"]
