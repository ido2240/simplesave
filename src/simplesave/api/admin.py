"""Manager endpoints — clock templates and settings."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from simplesave.api.auth import get_current_user
from simplesave.core.config import Settings, get_settings
from simplesave.db.base import get_db
from simplesave.db.models import ClockTemplateConfig, User
from simplesave.engine.clocks import CLOCK_KEYS, get_clock_templates

router = APIRouter(prefix="/admin", tags=["admin"])


def require_manager(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("manager", "advisor"):
        from fastapi import HTTPException

        raise HTTPException(status_code=403, detail="Manager or advisor role required")
    return user


class ClockTemplateOut(BaseModel):
    key: str
    name_he: str
    route_specs: list[dict[str, Any]]
    duplicate_flag: str | None


class SettingsOut(BaseModel):
    payment_to_income_ratio: float
    max_age_new_mortgage: int
    max_age_refinance: int


@router.get("/clock-templates", response_model=list[ClockTemplateOut])
def list_clock_templates(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
) -> list[ClockTemplateOut]:
    rows = {r.key: r for r in db.query(ClockTemplateConfig).all()}
    if not rows:
        return [
            ClockTemplateOut(
                key=t.key,
                name_he=t.name_he,
                route_specs=t.route_specs,
                duplicate_flag=t.duplicate_flag,
            )
            for t in get_clock_templates()
        ]
    return [
        ClockTemplateOut(
            key=k,
            name_he=rows[k].name_he,
            route_specs=rows[k].route_specs,
            duplicate_flag=rows[k].duplicate_flag,
        )
        for k in CLOCK_KEYS
        if k in rows
    ]


@router.put("/clock-templates/{key}", response_model=ClockTemplateOut)
def upsert_clock_template(
    key: str,
    body: ClockTemplateOut,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
) -> ClockTemplateOut:
    row = db.get(ClockTemplateConfig, key)
    if row is None:
        row = ClockTemplateConfig(
            key=key,
            name_he=body.name_he,
            route_specs=body.route_specs,
            duplicate_flag=body.duplicate_flag,
        )
        db.add(row)
    else:
        row.name_he = body.name_he
        row.route_specs = body.route_specs
        row.duplicate_flag = body.duplicate_flag
    db.commit()
    return body


@router.get("/settings", response_model=SettingsOut)
def admin_settings(
    settings: Settings = Depends(get_settings),
    _: User = Depends(require_manager),
) -> SettingsOut:
    return SettingsOut(
        payment_to_income_ratio=settings.payment_to_income_ratio,
        max_age_new_mortgage=settings.max_age_new_mortgage,
        max_age_refinance=settings.max_age_refinance,
    )


@router.post("/seed-clock-templates")
def seed_clock_templates(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
) -> dict[str, int]:
    count = 0
    for t in get_clock_templates():
        if db.get(ClockTemplateConfig, t.key) is None:
            db.add(
                ClockTemplateConfig(
                    key=t.key,
                    name_he=t.name_he,
                    route_specs=t.route_specs,
                    duplicate_flag=t.duplicate_flag,
                )
            )
            count += 1
    db.commit()
    return {"seeded": count}
