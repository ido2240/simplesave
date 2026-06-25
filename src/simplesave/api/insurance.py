"""Mortgage insurance quotes.

The comparison is BLOCKED until the real tariff tables arrive (CLAUDE.md §8), so the
endpoint reports ``available: false`` with the known insurer list rather than returning
fabricated premiums. When the tariff engine is supplied, fill ``quotes`` and flip the flag.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from simplesave.api.flow_schemas import InsuranceQuestionnaire
from simplesave.engine.insurance import (
    INSURANCE_BLOCKED_MESSAGE,
    INSURANCE_COMPANIES,
)

router = APIRouter(prefix="/insurance", tags=["insurance"])


class QuoteRow(BaseModel):
    company: str
    life_monthly: float
    structure_monthly: float
    total_monthly: float


class InsuranceQuotesResponse(BaseModel):
    available: bool
    companies: list[str]
    quotes: list[QuoteRow]
    note: str


@router.post("/quotes", response_model=InsuranceQuotesResponse)
def insurance_quotes(q: InsuranceQuestionnaire) -> InsuranceQuotesResponse:
    """Insurance comparison is not available until real tariff tables are loaded."""
    return InsuranceQuotesResponse(
        available=False,
        companies=list(INSURANCE_COMPANIES),
        quotes=[],
        note=INSURANCE_BLOCKED_MESSAGE,
    )
