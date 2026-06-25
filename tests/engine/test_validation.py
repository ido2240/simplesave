"""Tests for regulatory validations."""

from datetime import date

from simplesave.engine.validation import (
    BorrowerInput,
    LoanType,
    NewMortgageInput,
    PropertySource,
    compute_loan_amount_new,
    validate_new_mortgage,
)


def _sample_new() -> NewMortgageInput:
    return NewMortgageInput(
        loan_type=LoanType.SINGLE_PROPERTY,
        property_source=PropertySource.SECOND_HAND,
        property_value=2_000_000,
        equity=500_000,
        borrowers=[
            BorrowerInput(
                full_name="Test User",
                birth_date=date(1985, 6, 15),
                net_income=25_000,
            )
        ],
        additional_income=0,
        fixed_expenses=0,
        desired_min_payment=6_000,
        desired_max_payment=9_000,
    )


def test_loan_amount_single_property() -> None:
    data = _sample_new()
    assert compute_loan_amount_new(data) == 1_500_000


def test_validate_new_mortgage_ok() -> None:
    result = validate_new_mortgage(_sample_new(), today=date(2026, 6, 25))
    assert result.ok
    assert result.computed["loan_amount"] == 1_500_000


def test_validate_equity_too_low() -> None:
    data = _sample_new()
    data.equity = 100_000
    result = validate_new_mortgage(data, today=date(2026, 6, 25))
    assert not result.ok
    assert any(i.field == "equity" for i in result.issues)
