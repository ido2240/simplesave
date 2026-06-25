"""Mortgage insurance comparison — BLOCKED until the real tariff tables arrive.

CLAUDE.md §8: the insurance flow depends on ``insurance-rates.js`` / the Excel
mortgage tariffs, which are missing. We deliberately do **not** fabricate premiums
here — returning made-up numbers for a financial comparison would be worse than
returning nothing. ``quote_insurance`` raises until real rate tables are supplied
via ``rate_table`` (or the module is rebuilt from the source tariffs).

The Israeli insurer list below is factual and safe to keep for the eventual UI.
"""

from __future__ import annotations

from dataclasses import dataclass

INSURANCE_COMPANIES: tuple[str, ...] = (
    "הפניקס",
    "מגדל",
    "הראל",
    "כלל",
    "מנורה",
)

INSURANCE_BLOCKED_MESSAGE: str = (
    "השוואת ביטוח משכנתא אינה זמינה עדיין — נדרשות טבלאות התעריפים "
    "(insurance-rates.js / קובץ האקסל של תעריפי המשכנתא). ראו CLAUDE.md §8."
)


class InsuranceRatesUnavailable(RuntimeError):
    """Raised when an insurance quote is requested without real tariff tables."""


@dataclass
class InsuranceQuote:
    company: str
    life_monthly: float
    structure_monthly: float
    total_monthly: float


def quote_insurance(
    coverage: float,
    age: int,
    *,
    rate_table: dict[str, dict[int, float]] | None = None,
) -> list[InsuranceQuote]:
    """Return insurance quotes — only possible once real tariff tables are provided.

    Without ``rate_table`` this raises :class:`InsuranceRatesUnavailable` rather than
    inventing premiums. The signature is kept stable so wiring the real engine in
    later is a drop-in change.
    """
    if rate_table is None:
        raise InsuranceRatesUnavailable(INSURANCE_BLOCKED_MESSAGE)
    raise InsuranceRatesUnavailable(
        "Insurance rate computation is not implemented yet — supply the validated "
        "tariff engine before enabling this flow."
    )


__all__ = [
    "INSURANCE_BLOCKED_MESSAGE",
    "INSURANCE_COMPANIES",
    "InsuranceQuote",
    "InsuranceRatesUnavailable",
    "quote_insurance",
]
