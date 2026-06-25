"""Core numeric primitives, ported verbatim from the reference simulator.

Pure functions only — no I/O, no framework imports.
"""

from __future__ import annotations

import math

from simplesave.engine.types import IndexType, MarketParams, Route


def num(v: object) -> float:
    """Reference ``num``: parse to a finite float, else 0.

    Mirrors ``parseFloat`` + ``isFinite`` semantics for the loose values the
    reference allows (``''``, ``None``, numbers, numeric strings).
    """
    if v is None or v is True or v is False:
        # JS: num(true) -> parseFloat(true) -> NaN -> 0. Booleans never carry
        # numeric meaning in the reference route data.
        return 0.0
    try:
        n = float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0.0
    return n if math.isfinite(n) else 0.0


def js_round(x: float) -> int:
    """JavaScript ``Math.round``: round half toward +infinity.

    Python's built-in ``round`` uses banker's rounding, which diverges from the
    reference on exact halves (e.g. tuning step indices). ``floor(x + 0.5)``
    reproduces ``Math.round`` exactly.
    """
    return math.floor(x + 0.5)


def pmt(r: float, n: float, pv: float) -> float:
    """Reference ``PMT``: standard monthly payment (sign-negative, like Excel)."""
    if n <= 0:
        return 0.0
    if r == 0:
        return -pv / n
    return -(r * pv) / (1 - math.pow(1 + r, -n))


def index_expect(index_type: IndexType | str, params: MarketParams) -> float:
    """Reference ``indexExpect``: annual index expectation for a route's type."""
    if index_type == IndexType.CPI:
        return num(params.cpi)
    if index_type == IndexType.USD:
        return num(params.usd)
    if index_type == IndexType.EUR:
        return num(params.eur)
    return 0.0


def route_annual_index(route: Route, params: MarketParams) -> float:
    """Reference ``routeAnnualIndex``: custom override, else the expectation."""
    if route.custom_annual_index is None:
        return index_expect(route.index_type, params)
    return num(route.custom_annual_index)


def displayed_annual_index(route: Route, params: MarketParams) -> float:
    """Reference ``displayedAnnualIndex``.

    The reference has a second branch that compounds a monthly-index table when
    ``state.indexCalcMode === 'monthly'``. That mode is UI/state-only; the
    default (and the engine's contract) is annual mode, where this reduces to
    ``routeAnnualIndex``. See CLAUDE.md §3.
    """
    return route_annual_index(route, params)


def monthly_rate(route: Route, annual_rate: float) -> float:
    """Reference per-month rate: daily-compounded or simple ``annual / 12``."""
    if route.daily_interest:
        return math.pow(1 + annual_rate / 365, 365 / 12) - 1
    return annual_rate / 12
