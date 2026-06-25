"""Refinance validation, clocks, and balance-report upload."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile

from simplesave.api.flow_schemas import (
    ClocksResponse,
    RefinanceClocksRequest,
    RefinanceQuestionnaire,
    ValidationResponse,
    clock_to_output,
    validation_to_output,
)
from simplesave.core.config import Settings, get_settings
from simplesave.engine.clocks import generate_all_clocks
from simplesave.engine.documents import parse_balance_report_pdf
from simplesave.engine.validation import BorrowerInput, RefinanceInput, validate_refinance

router = APIRouter(prefix="/refinance", tags=["refinance"])


def _to_engine_input(q: RefinanceQuestionnaire) -> RefinanceInput:
    return RefinanceInput(
        property_value=q.property_value,
        borrowers=[
            BorrowerInput(
                full_name=b.full_name,
                birth_date=b.birth_date,
                is_property_owner=b.is_property_owner,
                net_income=b.net_income,
            )
            for b in q.borrowers
        ],
        additional_income=q.additional_income,
        fixed_expenses=q.fixed_expenses,
        desired_min_payment=q.desired_min_payment,
        desired_max_payment=q.desired_max_payment,
        existing_routes_balance=q.existing_routes_balance,
        adjust_payment=q.adjust_payment,
    )


@router.post("/validate", response_model=ValidationResponse)
def validate_refi(
    q: RefinanceQuestionnaire,
    settings: Settings = Depends(get_settings),
) -> ValidationResponse:
    result = validate_refinance(
        _to_engine_input(q),
        payment_ratio=settings.payment_to_income_ratio,
        max_age=settings.max_age_refinance,
    )
    return validation_to_output(result)


@router.post("/clocks", response_model=ClocksResponse)
def refinance_clocks(
    body: RefinanceClocksRequest,
    settings: Settings = Depends(get_settings),
) -> ClocksResponse:
    q = RefinanceQuestionnaire.model_validate(body.model_dump(exclude={"params"}))
    params = body.params
    validation = validate_refinance(
        _to_engine_input(q),
        payment_ratio=settings.payment_to_income_ratio,
        max_age=settings.max_age_refinance,
    )
    if not validation.ok:
        return ClocksResponse(
            validation=validation_to_output(validation),
            clocks=[],
            params=params,
        )

    loan = float(validation.computed["loan_amount"])
    min_pay = float(validation.computed["min_pay"])
    max_pay = float(validation.computed["max_pay"])
    engine_params = params.to_engine()
    clocks = generate_all_clocks(
        loan=loan,
        min_pay=min_pay,
        max_pay=max_pay,
        params=engine_params,
    )
    return ClocksResponse(
        validation=validation_to_output(validation),
        clocks=[clock_to_output(c) for c in clocks],
        params=params,
    )


@router.post("/parse-balance-report")
async def parse_balance_report(file: UploadFile = File(...)) -> dict[str, object]:
    data = await file.read()
    result = parse_balance_report_pdf(data)
    return {
        "ok": result.ok,
        "total_balance": result.total_balance,
        "bank_hint": result.bank_hint,
        "message": result.message,
        "routes_count": len(result.routes),
        "preview": result.raw_text_preview,
    }
