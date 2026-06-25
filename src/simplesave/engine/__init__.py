"""Pure-Python mortgage calculation engine.

Ported from the validated reference simulator in ``reference/`` (see
CLAUDE.md §3). This package is pure: no I/O, no database, no framework imports.

Public API:
    pmt                     standard monthly-payment formula
    calc_route              month-by-month amortization for one track
    calc_mix                combine routes into a mortgage mix
    mix_risk                weighted risk score for a mix
    calculate_mix_to_range  tune route periods to a desired payment range
"""

from simplesave.engine.core import index_expect, num, pmt, route_annual_index
from simplesave.engine.mix import calc_mix
from simplesave.engine.risk import default_risk_rules, mix_risk, risk_rule_for_route
from simplesave.engine.route import calc_route
from simplesave.engine.tuning import (
    allowed_years,
    apply_route_kind,
    calculate_mix_to_range,
    candidate_years,
    infer_route_kind,
    nearest_allowed_years,
    route_change_period,
    shorten_fixed_routes_to_maximum,
    validate_mix_template,
)
from simplesave.engine.types import (
    DEFAULT_CONDITIONS,
    AnchorType,
    Balloon,
    Board,
    IndexType,
    MarketParams,
    MixResult,
    PurposeSplit,
    RateType,
    RiskResult,
    RiskRule,
    Route,
    RouteKind,
    RouteResult,
    ShortenInfo,
    TuneConditions,
    TuneResult,
)

__all__ = [
    # functions
    "pmt",
    "num",
    "index_expect",
    "route_annual_index",
    "calc_route",
    "calc_mix",
    "mix_risk",
    "default_risk_rules",
    "risk_rule_for_route",
    "calculate_mix_to_range",
    "infer_route_kind",
    "apply_route_kind",
    "allowed_years",
    "nearest_allowed_years",
    "candidate_years",
    "route_change_period",
    "validate_mix_template",
    "shorten_fixed_routes_to_maximum",
    # types
    "Route",
    "MarketParams",
    "PurposeSplit",
    "RouteResult",
    "MixResult",
    "RiskResult",
    "RiskRule",
    "TuneResult",
    "TuneConditions",
    "ShortenInfo",
    "DEFAULT_CONDITIONS",
    "Board",
    "Balloon",
    "RateType",
    "IndexType",
    "AnchorType",
    "RouteKind",
]
