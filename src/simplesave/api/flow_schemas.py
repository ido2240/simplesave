"""Shared Pydantic models for product flows and clock responses."""

from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, Field

from simplesave.api.schemas import MarketParamsInput, MixResultOutput, RiskOutput, RouteInput
from simplesave.engine.clocks import ClockResult
from simplesave.engine.types import Route
from simplesave.engine.validation import (
    LoanType,
    PropertySource,
    ValidationResult,
)


class BorrowerSchema(BaseModel):
    full_name: str = ""
    birth_date: date | None = None
    is_property_owner: bool = True
    net_income: float = Field(ge=0, default=0)


class NewMortgageQuestionnaire(BaseModel):
    loan_type: LoanType
    property_source: PropertySource
    property_value: float = Field(gt=0)
    equity: float = Field(ge=0)
    borrowers: list[BorrowerSchema] = Field(min_length=1, max_length=5)
    additional_income: float = Field(ge=0, default=0)
    fixed_expenses: float = Field(ge=0, default=0)
    desired_min_payment: float = Field(ge=0)
    desired_max_payment: float = Field(ge=0)
    existing_mortgage_balance: float = Field(ge=0, default=0)


class RefinanceQuestionnaire(BaseModel):
    property_value: float = Field(gt=0)
    borrowers: list[BorrowerSchema] = Field(min_length=1, max_length=5)
    additional_income: float = Field(ge=0, default=0)
    fixed_expenses: float = Field(ge=0, default=0)
    desired_min_payment: float = Field(ge=0, default=0)
    desired_max_payment: float = Field(ge=0, default=0)
    existing_routes_balance: float = Field(gt=0)
    adjust_payment: bool = False


class InsuranceQuestionnaire(BaseModel):
    coverage_amount: float = Field(gt=0)
    age: int = Field(ge=18, le=85)
    borrowers_count: int = Field(ge=1, le=5, default=1)


class NewMortgageClocksRequest(NewMortgageQuestionnaire):
    """Questionnaire + optional market params in one JSON body."""

    params: MarketParamsInput = Field(default_factory=MarketParamsInput)


class RefinanceClocksRequest(RefinanceQuestionnaire):
    params: MarketParamsInput = Field(default_factory=MarketParamsInput)


class ValidationIssueOutput(BaseModel):
    field: str
    message: str


class ValidationResponse(BaseModel):
    ok: bool
    issues: list[ValidationIssueOutput]
    computed: dict[str, Any]


class ClockRouteOutput(BaseModel):
    share_pct: float
    years: float
    amount: float
    anchor: float
    margin: float
    index_type: str
    kind: str | None


class ClockOutput(BaseModel):
    key: str
    name_he: str
    duplicate_flag: str | None
    in_range: bool
    tune_ok: bool
    tune_message: str
    mix: MixResultOutput
    risk: RiskOutput
    routes: list[ClockRouteOutput]


class ClocksResponse(BaseModel):
    validation: ValidationResponse
    clocks: list[ClockOutput]
    params: MarketParamsInput


def validation_to_output(v: ValidationResult) -> ValidationResponse:
    return ValidationResponse(
        ok=v.ok,
        issues=[ValidationIssueOutput(field=i.field, message=i.message) for i in v.issues],
        computed=v.computed,
    )


def clock_to_output(c: ClockResult) -> ClockOutput:
    return ClockOutput(
        key=c.key,
        name_he=c.name_he,
        duplicate_flag=c.duplicate_flag,
        in_range=c.tune.in_range,
        tune_ok=c.tune.ok,
        tune_message=c.tune.reason,
        mix=MixResultOutput.from_engine(c.mix),
        risk=RiskOutput.from_engine(c.risk),
        routes=[
            ClockRouteOutput(
                share_pct=r.share_pct,
                years=r.years,
                amount=r.amount,
                anchor=r.anchor,
                margin=r.margin,
                index_type=str(r.index_type),
                kind=str(r.kind) if r.kind else None,
            )
            for r in c.routes
        ],
    )


def route_to_route_input(r: Route) -> RouteInput:
    return RouteInput(
        amount=r.amount,
        years=r.years,
        anchor=r.anchor,
        margin=r.margin,
        board=r.board,
        balloon=r.balloon,
        index_type=r.index_type,
        index_pct=r.index_pct,
        kind=r.kind,
        rate_type=r.rate_type,
        anchor_type=r.anchor_type,
        change_months=r.change_months,
        share_pct=r.share_pct,
        year_step=r.year_step,
    )
