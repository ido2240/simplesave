"""New-mortgage validation and five-clock generation."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from simplesave.api.flow_schemas import (
    ClocksResponse,
    NewMortgageClocksRequest,
    NewMortgageQuestionnaire,
    ValidationResponse,
    clock_to_output,
    validation_to_output,
)
from simplesave.core.config import Settings, get_settings
from simplesave.engine.clocks import generate_all_clocks
from simplesave.engine.validation import (
    BorrowerInput,
    NewMortgageInput,
    validate_new_mortgage,
)

router = APIRouter(prefix="/new-mortgage", tags=["new-mortgage"])


def _to_engine_borrowers(q: NewMortgageQuestionnaire) -> list[BorrowerInput]:
    return [
        BorrowerInput(
            full_name=b.full_name,
            birth_date=b.birth_date,
            is_property_owner=b.is_property_owner,
            net_income=b.net_income,
        )
        for b in q.borrowers
    ]


def _to_engine_input(q: NewMortgageQuestionnaire) -> NewMortgageInput:
    return NewMortgageInput(
        loan_type=q.loan_type,
        property_source=q.property_source,
        property_value=q.property_value,
        equity=q.equity,
        borrowers=_to_engine_borrowers(q),
        additional_income=q.additional_income,
        fixed_expenses=q.fixed_expenses,
        desired_min_payment=q.desired_min_payment,
        desired_max_payment=q.desired_max_payment,
        existing_mortgage_balance=q.existing_mortgage_balance,
    )


@router.post("/validate", response_model=ValidationResponse)
def validate_new(
    q: NewMortgageQuestionnaire,
    settings: Settings = Depends(get_settings),
) -> ValidationResponse:
    result = validate_new_mortgage(
        _to_engine_input(q),
        payment_ratio=settings.payment_to_income_ratio,
        max_age=settings.max_age_new_mortgage,
    )
    return validation_to_output(result)


@router.post("/clocks", response_model=ClocksResponse)
def new_mortgage_clocks(
    body: NewMortgageClocksRequest,
    settings: Settings = Depends(get_settings),
) -> ClocksResponse:
    q = NewMortgageQuestionnaire.model_validate(body.model_dump(exclude={"params"}))
    params = body.params
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
    min_pay = q.desired_min_payment
    max_pay = q.desired_max_payment
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
