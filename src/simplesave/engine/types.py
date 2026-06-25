"""Typed data model for the calculation engine.

The reference simulator switches on Hebrew string literals (e.g.
``board === 'שפיצר'``). To stay byte-for-byte faithful to that data while
keeping the Python readable, each enum has an English-named member whose
*value* is the exact Hebrew string from the reference. Because they subclass
``str``, comparisons against the raw Hebrew string also work, and JSON
serialization yields the reference string unchanged.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum


class Board(StrEnum):
    """Repayment board (לוח סילוקין)."""

    SPITZER = "שפיצר"  # level payment
    EQUAL_PRINCIPAL = "קרן שווה"  # equal principal


class Balloon(StrEnum):
    """Balloon / grace variants."""

    NONE = ""
    FULL_BALLOON = "בלון מלא"
    PARTIAL_BALLOON = "בלון חלקי"
    FULL_GRACE = "גרייס מלא"
    PARTIAL_GRACE = "גרייס חלקי"


class RateType(StrEnum):
    UNSET = ""
    FIXED = "קבועה"
    VARIABLE = "משתנה"


class IndexType(StrEnum):
    UNSET = ""
    NONE = "ללא"
    CPI = "מדד"
    USD = "דולר"
    EUR = "אירו"


class AnchorType(StrEnum):
    UNSET = ""
    PRIME = "פריים"
    MAKAM = 'פק"מ'
    BOND = 'אג"ח'


class RouteKind(StrEnum):
    FIXED = "fixed"
    VARIABLE = "variable"
    PRIME = "prime"


@dataclass
class PurposeSplit:
    """Split of a route between housing and any-purpose portions."""

    housing: float = 0.0
    all_purpose: float = 0.0


@dataclass
class MarketParams:
    """Annual index expectations (the reference ``params`` object).

    Defaults match the reference ``defaultState`` (CPI 3%, USD 3%, EUR 1.5%).
    """

    cpi: float = 0.03  # מדד
    usd: float = 0.03  # דולר
    eur: float = 0.015  # אירו


@dataclass
class Route:
    """A single mortgage track. Defaults mirror the reference ``blankRoute``."""

    amount: float = 0.0
    years: float = 20.0
    anchor: float = 0.0
    margin: float = 0.0
    board: Board = Board.SPITZER
    balloon: Balloon = Balloon.NONE
    balloon_months: float = 0.0
    index_type: IndexType = IndexType.NONE
    index_pct: float = 1.0
    daily_interest: bool = False
    custom_annual_index: float | None = None
    kind: RouteKind | None = None
    rate_type: RateType = RateType.FIXED
    anchor_type: AnchorType = AnchorType.UNSET
    change_months: float = 0.0
    share_pct: float = 0.0
    exit_fee: float = 0.0
    year_step: float = 0.0
    purpose_split: PurposeSplit | None = None
    loan_purpose: str = ""


@dataclass
class RouteResult:
    """Per-route amortization output (mirrors the reference ``out`` object).

    All per-month arrays are 1-indexed: element ``0`` is a zero placeholder and
    the schedule runs ``1..n``.
    """

    S: float = 0.0  # first payment
    T: float = 0.0  # total relevant cost
    n: int = 0  # number of months
    annual_rate: float = 0.0
    entered_annual_rate: float = 0.0
    invalid_negative_rate: bool = False
    eff_rate: float = 0.0
    annual_index: float = 0.0
    L: list[float] = field(default_factory=list)  # opening balance
    base_l: list[float] = field(default_factory=list)
    base_prin: list[float] = field(default_factory=list)
    index_bal: list[float] = field(default_factory=list)
    M: list[float] = field(default_factory=list)  # relevant monthly payment
    prin: list[float] = field(default_factory=list)
    intr: list[float] = field(default_factory=list)
    idx_eff: list[float] = field(default_factory=list)
    idx_prin: list[float] = field(default_factory=list)
    idx_intr: list[float] = field(default_factory=list)
    cum: list[float] = field(default_factory=list)


@dataclass
class MixResult:
    """Aggregated output for a mix of routes."""

    E: float = 0.0  # total principal
    exit_fee: float = 0.0
    total_amount: float = 0.0
    principal: float = 0.0
    avg_years: float = 0.0
    avg_rate: float = 0.0
    first_pay: float = 0.0
    total: float = 0.0
    interest: float = 0.0
    indexation: float = 0.0
    per: list[RouteResult] = field(default_factory=list)
    max_n: int = 0


@dataclass
class RiskResult:
    score: float = 0.0
    level: int = 0
    label: str = "—"


@dataclass
class RiskRule:
    route_kind: str
    from_months: int
    to_months: int
    indexed: str  # 'כן' | 'לא' | 'הכול'
    exit_penalty: str
    risk: int


@dataclass
class TuneConditions:
    """Controls how ``calculate_mix_to_range`` shortens fixed routes."""

    shorten_fixed: bool = True
    linked_fixed_first: bool = True


DEFAULT_CONDITIONS = TuneConditions()


@dataclass
class ShortenInfo:
    index: int
    from_years: float
    to_years: float
    linked: bool


@dataclass
class TuneResult:
    """Result of tuning a mix to a desired monthly-payment range."""

    ok: bool
    in_range: bool
    reason: str
    routes: list[Route] = field(default_factory=list)
    years: list[float] = field(default_factory=list)
    mix: MixResult | None = None
    shortened: list[ShortenInfo] = field(default_factory=list)
