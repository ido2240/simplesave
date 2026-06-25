"""Lead capture for curious users (pre-registration)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from simplesave.api.flow_schemas import (
    ClocksResponse,
    NewMortgageClocksRequest,
    NewMortgageQuestionnaire,
    clock_to_output,
    validation_to_output,
)
from simplesave.api.new_mortgage import _to_engine_input
from simplesave.core.config import get_settings
from simplesave.db.base import get_db
from simplesave.db.models import Lead
from simplesave.engine.clocks import generate_all_clocks
from simplesave.engine.validation import validate_new_mortgage

router = APIRouter(prefix="/leads", tags=["leads"])


class LeadCreate(BaseModel):
    service_type: str = Field(pattern="^(new_mortgage|refinance|insurance)$")
    questionnaire: dict[str, Any]


class LeadResponse(BaseModel):
    id: str
    service_type: str
    questionnaire: dict[str, Any]
    validation: dict[str, Any] | None
    clocks: dict[str, Any] | None


@router.post("", response_model=LeadResponse)
def create_lead(body: LeadCreate, db: Session = Depends(get_db)) -> LeadResponse:
    lead = Lead(service_type=body.service_type, questionnaire=body.questionnaire)
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return LeadResponse(
        id=lead.id,
        service_type=lead.service_type,
        questionnaire=lead.questionnaire,
        validation=lead.validation,
        clocks=lead.clocks,
    )


@router.get("/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: str, db: Session = Depends(get_db)) -> LeadResponse:
    lead = db.get(Lead, lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="Lead not found")
    return LeadResponse(
        id=lead.id,
        service_type=lead.service_type,
        questionnaire=lead.questionnaire,
        validation=lead.validation,
        clocks=lead.clocks,
    )


@router.post("/new-mortgage/clocks", response_model=ClocksResponse)
def lead_new_mortgage_clocks(
    body: NewMortgageClocksRequest,
    db: Session = Depends(get_db),
) -> ClocksResponse:
    """Validate, generate clocks, and persist as a lead."""
    q = NewMortgageQuestionnaire.model_validate(body.model_dump(exclude={"params"}))
    params = body.params
    settings = get_settings()
    validation = validate_new_mortgage(
        _to_engine_input(q),
        payment_ratio=settings.payment_to_income_ratio,
        max_age=settings.max_age_new_mortgage,
    )
    if not validation.ok:
        return ClocksResponse(
            validation=validation_to_output(validation),
            clocks=[],
            params=params,
        )
    loan = float(validation.computed["loan_amount"])
    engine_params = params.to_engine()
    clocks = generate_all_clocks(
        loan=loan,
        min_pay=q.desired_min_payment,
        max_pay=q.desired_max_payment,
        params=engine_params,
    )
    response = ClocksResponse(
        validation=validation_to_output(validation),
        clocks=[clock_to_output(c) for c in clocks],
        params=params,
    )
    lead = Lead(
        service_type="new_mortgage",
        questionnaire=q.model_dump(mode="json"),
        validation=response.validation.model_dump(),
        clocks={
            "clocks": [c.model_dump() for c in response.clocks],
            "params": response.params.model_dump(),
        },
    )
    db.add(lead)
    db.commit()
    return response
