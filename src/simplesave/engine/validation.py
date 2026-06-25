"""Regulatory validations for new-mortgage and refinance questionnaires.

Business-rule ceilings use provisional values from DECISIONS.md (resolved 2026-06-25
per user directive to proceed with documented defaults until formal sign-off).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import StrEnum
from typing import Any

# Provisional — DECISIONS D-3 (main questionnaire table: 38%).
DEFAULT_PAYMENT_TO_INCOME_RATIO = 0.38
# Provisional — DECISIONS D-4.
DEFAULT_MAX_AGE_NEW_MORTGAGE = 85
# Provisional — DECISIONS D-5 (structured refinance table).
DEFAULT_MAX_AGE_REFINANCE = 80
MIN_BORROWER_AGE = 18
MAX_MORTGAGE_TERM_YEARS = 30
TARGET_PRICE_MIN_EQUITY = 100_000.0


class LoanType(StrEnum):
    SINGLE_PROPERTY = "single_property"
    ADDITIONAL_PROPERTY = "additional_property"
    ALL_PURPOSE = "all_purpose"
    IMPROVEMENT = "improvement"


class PropertySource(StrEnum):
    CONTRACTOR = "contractor"
    SECOND_HAND = "second_hand"
    TARGET_PRICE = "target_price"
    SELF_BUILD = "self_build"


class ServiceType(StrEnum):
    NEW_MORTGAGE = "new_mortgage"
    REFINANCE = "refinance"
    INSURANCE = "insurance"


@dataclass
class BorrowerInput:
    full_name: str = ""
    birth_date: date | None = None
    is_property_owner: bool = True
    net_income: float = 0.0


@dataclass
class NewMortgageInput:
    loan_type: LoanType
    property_source: PropertySource
    property_value: float
    equity: float
    borrowers: list[BorrowerInput]
    additional_income: float = 0.0
    fixed_expenses: float = 0.0
    desired_min_payment: float = 0.0
    desired_max_payment: float = 0.0
    existing_mortgage_balance: float = 0.0


@dataclass
class RefinanceInput:
    property_value: float
    borrowers: list[BorrowerInput]
    additional_income: float = 0.0
    fixed_expenses: float = 0.0
    desired_min_payment: float = 0.0
    desired_max_payment: float = 0.0
    existing_routes_balance: float = 0.0
    adjust_payment: bool = False


@dataclass
class ValidationIssue:
    field: str
    message: str


@dataclass
class ValidationResult:
    ok: bool
    issues: list[ValidationIssue] = field(default_factory=list)
    computed: dict[str, Any] = field(default_factory=dict)

    def add(self, field: str, message: str) -> None:
        self.ok = False
        self.issues.append(ValidationIssue(field=field, message=message))


def _age_on_date(birth: date, on: date) -> int:
    years = on.year - birth.year
    if (on.month, on.day) < (birth.month, birth.day):
        years -= 1
    return years


def _oldest_borrower_age(borrowers: list[BorrowerInput], on: date) -> int | None:
    ages = [
        _age_on_date(b.birth_date, on)
        for b in borrowers
        if b.birth_date is not None
    ]
    return max(ages) if ages else None


def _counting_income(borrowers: list[BorrowerInput]) -> float:
    total = 0.0
    for b in borrowers:
        portion = b.net_income if b.is_property_owner else b.net_income * 0.5
        total += portion
    return total


def net_income_for_capacity(
    borrowers: list[BorrowerInput],
    additional_income: float,
    fixed_expenses: float,
) -> float:
    """Net income for repayment-capacity (הכנסה נטו לחישוב החזר)."""
    return _counting_income(borrowers) + additional_income - fixed_expenses


def max_allowed_payment(net: float, ratio: float = DEFAULT_PAYMENT_TO_INCOME_RATIO) -> float:
    return max(0.0, net * ratio)


def financing_limit_pct(
    loan_type: LoanType,
    property_source: PropertySource,
) -> float:
    if loan_type == LoanType.SINGLE_PROPERTY:
        if property_source == PropertySource.TARGET_PRICE:
            return 0.90
        return 0.75
    if loan_type == LoanType.IMPROVEMENT:
        return 0.70
    if loan_type in (LoanType.ADDITIONAL_PROPERTY, LoanType.ALL_PURPOSE):
        return 0.50
    return 0.75


def min_equity_pct(loan_type: LoanType, property_source: PropertySource) -> float:
    if property_source == PropertySource.TARGET_PRICE:
        return 0.10
    if loan_type in (LoanType.ADDITIONAL_PROPERTY, LoanType.ALL_PURPOSE):
        return 0.50
    return 0.25


def compute_loan_amount_new(data: NewMortgageInput) -> float:
    limit_pct = financing_limit_pct(data.loan_type, data.property_source)
    max_loan = data.property_value * limit_pct
    if data.loan_type == LoanType.ALL_PURPOSE:
        max_loan = max(0.0, data.property_value * 0.50 - data.existing_mortgage_balance)
    return max(0.0, min(max_loan, data.property_value - data.equity))


def validate_new_mortgage(
    data: NewMortgageInput,
    *,
    today: date | None = None,
    payment_ratio: float = DEFAULT_PAYMENT_TO_INCOME_RATIO,
    max_age: int = DEFAULT_MAX_AGE_NEW_MORTGAGE,
) -> ValidationResult:
    on = today or date.today()
    result = ValidationResult(ok=True)

    if not data.borrowers:
        result.add("borrowers", "יש להזין לפחות לווה אחד.")
    if data.property_value <= 0:
        result.add("property_value", "שווי הנכס חייב להיות חיובי.")
    if data.equity < 0:
        result.add("equity", "הון עצמי לא יכול להיות שלילי.")

    min_eq_pct = min_equity_pct(data.loan_type, data.property_source)
    required_equity = data.property_value * min_eq_pct
    if data.property_source == PropertySource.TARGET_PRICE:
        required_equity = max(required_equity, TARGET_PRICE_MIN_EQUITY)
    if data.equity < required_equity - 0.01:
        result.add(
            "equity",
            f"הון עצמי מינימלי: {required_equity:,.0f} ₪ ({min_eq_pct:.0%} משווי הנכס).",
        )

    loan = compute_loan_amount_new(data)
    limit_pct = financing_limit_pct(data.loan_type, data.property_source)
    max_loan = data.property_value * limit_pct
    if data.loan_type == LoanType.ALL_PURPOSE:
        max_loan = max(0.0, data.property_value * 0.50 - data.existing_mortgage_balance)
    if loan > max_loan + 0.01:
        result.add("loan_amount", f"סכום המשכנתא חורג ממגבלת המימון ({max_loan:,.0f} ₪).")

    for i, b in enumerate(data.borrowers):
        if not b.full_name.strip():
            result.add(f"borrowers[{i}].full_name", "שם מלא נדרש.")
        if b.birth_date is None:
            result.add(f"borrowers[{i}].birth_date", "תאריך לידה נדרש.")
        elif _age_on_date(b.birth_date, on) < MIN_BORROWER_AGE:
            result.add(f"borrowers[{i}].birth_date", "גיל מינימלי ללווה: 18.")

    oldest = _oldest_borrower_age(data.borrowers, on)
    if oldest is not None and oldest > max_age:
        result.add("borrowers", f"גיל הלווה המבוגר ({oldest}) חורג מגיל {max_age}.")

    net = net_income_for_capacity(
        data.borrowers, data.additional_income, data.fixed_expenses
    )
    cap = max_allowed_payment(net, payment_ratio)
    if data.desired_min_payment <= 0 or data.desired_max_payment <= 0:
        result.add("desired_payment", "יש להזין טווח תשלום חודשי רצוי.")
    elif data.desired_min_payment > data.desired_max_payment:
        result.add("desired_payment", "מינימום התשלום חייב להיות קטן מהמקסימום.")
    elif data.desired_max_payment > cap + 0.01:
        result.add(
            "desired_max_payment",
            (
                f"מקסימום תשלום ({data.desired_max_payment:,.0f} ₪) "
                f"חורג מכושר החזר ({cap:,.0f} ₪, {payment_ratio:.0%})."
            ),
        )

    max_term = MAX_MORTGAGE_TERM_YEARS
    if oldest is not None:
        max_term = min(max_term, max(0, max_age - oldest))
    if max_term < 4:
        result.add("borrowers", "תקופת המשכנתא המקסימלית קצרה מדי לפי גיל הלווה.")

    result.computed = {
        "loan_amount": loan,
        "financing_limit_pct": limit_pct,
        "net_income": net,
        "max_payment_capacity": cap,
        "max_term_years": max_term,
        "payment_ratio_used": payment_ratio,
        "max_age_used": max_age,
        "check_eligibility": (
            data.loan_type == LoanType.SINGLE_PROPERTY
            and data.property_source != PropertySource.TARGET_PRICE
        ),
    }
    return result


def validate_refinance(
    data: RefinanceInput,
    *,
    today: date | None = None,
    payment_ratio: float = DEFAULT_PAYMENT_TO_INCOME_RATIO,
    max_age: int = DEFAULT_MAX_AGE_REFINANCE,
) -> ValidationResult:
    on = today or date.today()
    result = ValidationResult(ok=True)

    if not data.borrowers:
        result.add("borrowers", "יש להזין לפחות לווה אחד.")
    if data.property_value <= 0:
        result.add("property_value", "שווי הנכס חייב להיות חיובי.")
    if data.existing_routes_balance <= 0:
        result.add("existing_routes_balance", "יש להזין יתרת משכנתא קיימת.")

    for i, b in enumerate(data.borrowers):
        if not b.full_name.strip():
            result.add(f"borrowers[{i}].full_name", "שם מלא נדרש.")
        if b.birth_date is None:
            result.add(f"borrowers[{i}].birth_date", "תאריך לידה נדרש.")

    oldest = _oldest_borrower_age(data.borrowers, on)
    if oldest is not None and oldest > max_age:
        result.add("borrowers", f"גיל הלווה המבוגר ({oldest}) חורג מגיל {max_age}.")

    net = net_income_for_capacity(
        data.borrowers, data.additional_income, data.fixed_expenses
    )
    cap = max_allowed_payment(net, payment_ratio)

    min_pay = data.desired_min_payment
    max_pay = data.desired_max_payment
    if not data.adjust_payment:
        min_pay = cap * 0.85
        max_pay = cap
    elif min_pay <= 0 or max_pay <= 0:
        result.add("desired_payment", "יש להזין טווח תשלום חודשי רצוי.")
    elif min_pay > max_pay:
        result.add("desired_payment", "מינימום התשלום חייב להיות קטן מהמקסימום.")
    elif max_pay > cap + 0.01:
        result.add(
            "desired_max_payment",
            f"מקסימום תשלום חורג מכושר החזר ({cap:,.0f} ₪).",
        )

    max_term = MAX_MORTGAGE_TERM_YEARS
    if oldest is not None:
        max_term = min(max_term, max(0, max_age - oldest))

    loan = data.existing_routes_balance
    result.computed = {
        "loan_amount": loan,
        "net_income": net,
        "max_payment_capacity": cap,
        "min_pay": min_pay,
        "max_pay": max_pay,
        "max_term_years": max_term,
        "payment_ratio_used": payment_ratio,
        "max_age_used": max_age,
    }
    return result


__all__ = [
    "BorrowerInput",
    "DEFAULT_MAX_AGE_NEW_MORTGAGE",
    "DEFAULT_MAX_AGE_REFINANCE",
    "DEFAULT_PAYMENT_TO_INCOME_RATIO",
    "LoanType",
    "MAX_MORTGAGE_TERM_YEARS",
    "NewMortgageInput",
    "PropertySource",
    "RefinanceInput",
    "ServiceType",
    "TARGET_PRICE_MIN_EQUITY",
    "ValidationIssue",
    "ValidationResult",
    "compute_loan_amount_new",
    "financing_limit_pct",
    "max_allowed_payment",
    "net_income_for_capacity",
    "validate_new_mortgage",
    "validate_refinance",
]
