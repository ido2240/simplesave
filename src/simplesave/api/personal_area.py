"""Personal area — applications and onboarding path."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from simplesave.api.auth import get_current_user
from simplesave.db.base import get_db
from simplesave.db.models import Application, Lead, User

router = APIRouter(prefix="/personal", tags=["personal"])


class ApplicationCreate(BaseModel):
    lead_id: str | None = None
    service_type: str
    path: str | None = Field(default=None, pattern="^(mix_approvals|digital|advisor)$")


class ApplicationUpdate(BaseModel):
    status: str | None = None
    selected_clock: str | None = None
    personal_data: dict[str, Any] | None = None
    documents: list[dict[str, Any]] | None = None
    path: str | None = None


class ApplicationOut(BaseModel):
    id: str
    service_type: str
    status: str
    path: str | None
    selected_clock: str | None
    personal_data: dict[str, Any] | None
    documents: list[dict[str, Any]] | None
    lead_id: str | None


@router.get("/applications", response_model=list[ApplicationOut])
def list_applications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ApplicationOut]:
    apps = db.query(Application).filter(Application.user_id == user.id).all()
    return [
        ApplicationOut(
            id=a.id,
            service_type=a.service_type,
            status=a.status,
            path=a.path,
            selected_clock=a.selected_clock,
            personal_data=a.personal_data,
            documents=a.documents,
            lead_id=a.lead_id,
        )
        for a in apps
    ]


@router.post("/applications", response_model=ApplicationOut)
def create_application(
    body: ApplicationCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationOut:
    lead = db.get(Lead, body.lead_id) if body.lead_id else None
    app = Application(
        user_id=user.id,
        lead_id=body.lead_id,
        service_type=body.service_type,
        path=body.path,
        status="personal_details" if body.path else "draft",
        personal_data=lead.questionnaire if lead else None,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return ApplicationOut(
        id=app.id,
        service_type=app.service_type,
        status=app.status,
        path=app.path,
        selected_clock=app.selected_clock,
        personal_data=app.personal_data,
        documents=app.documents,
        lead_id=app.lead_id,
    )


@router.patch("/applications/{app_id}", response_model=ApplicationOut)
def update_application(
    app_id: str,
    body: ApplicationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationOut:
    app = db.get(Application, app_id)
    if app is None or app.user_id != user.id:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Application not found")
    if body.status is not None:
        app.status = body.status
    if body.selected_clock is not None:
        app.selected_clock = body.selected_clock
    if body.personal_data is not None:
        app.personal_data = body.personal_data
    if body.documents is not None:
        app.documents = body.documents
    if body.path is not None:
        app.path = body.path
    db.commit()
    db.refresh(app)
    return ApplicationOut(
        id=app.id,
        service_type=app.service_type,
        status=app.status,
        path=app.path,
        selected_clock=app.selected_clock,
        personal_data=app.personal_data,
        documents=app.documents,
        lead_id=app.lead_id,
    )
