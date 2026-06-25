"""Route normalization, allowed periods, and the mix-to-range tuner.

``calculate_mix_to_range`` is the generic tuner the reference uses to generate
the "clocks": it adjusts each route's period so the mix's first monthly payment
lands inside a desired ``[min_pay, max_pay]`` range. The *clock templates*
themselves (which tracks / shares — an OPEN business decision, DECISIONS.md
D-2) are NOT part of this function; callers pass routes, a loan amount, the
payment range, and tuning ``conditions`` explicitly.

This module's public tuner does not mutate its inputs — it works on a deep copy
and returns the tuned routes in a ``TuneResult``.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass
from functools import cmp_to_key

from simplesave.engine.core import js_round, num
from simplesave.engine.mix import calc_mix
from simplesave.engine.types import (
    DEFAULT_CONDITIONS,
    AnchorType,
    Balloon,
    Board,
    IndexType,
    MarketParams,
    MixResult,
    RateType,
    Route,
    RouteKind,
    ShortenInfo,
    TuneConditions,
    TuneResult,
)


def infer_route_kind(route: Route) -> RouteKind:
    """Reference ``inferRouteKind``.

    Coerces to ``RouteKind`` so callers may pass ``kind`` as a raw string.
    """
    if route.kind:
        return RouteKind(route.kind)
    if route.anchor_type == AnchorType.PRIME:
        return RouteKind.PRIME
    return RouteKind.VARIABLE if route.rate_type == RateType.VARIABLE else RouteKind.FIXED


def allowed_years(route: Route) -> list[float]:
    """Reference ``allowedYears``: candidate periods for a route, by kind."""
    kind = infer_route_kind(route)
    if kind != RouteKind.VARIABLE:
        step = max(1, js_round(num(route.year_step) or 1))
        first = max(4, step) if step > 1 else 4
        out: list[float] = []
        years = first
        while years <= 30:
            out.append(float(years))
            years += step
        return out

    base = num(route.year_step) or (num(route.change_months) / 12) or 5
    jump = max(1, js_round(base * 12))
    variable_out: list[float] = []
    for months in range(72, 361):
        if months % jump == 0:
            variable_out.append(months / 12)
    return variable_out if variable_out else [6.0, 30.0]


def nearest_allowed_years(route: Route, value: float) -> float:
    """Reference ``nearestAllowedYears``."""
    vals = allowed_years(route)
    best = vals[0]
    for x in vals:
        if abs(x - value) < abs(best - value):
            best = x
    return best


def candidate_years(route: Route, t: float) -> float:
    """Reference ``candidateYears``: pick an allowed period by fraction ``t``."""
    values = allowed_years(route)
    return values[js_round(t * (len(values) - 1))]


def route_change_period(route: Route) -> int:
    """Reference ``routeChangePeriod``: rate-reset period in months."""
    kind = infer_route_kind(route)
    if kind == RouteKind.FIXED:
        return js_round(num(route.years) * 12)
    if kind == RouteKind.PRIME:
        return 1
    return js_round(num(route.change_months) or 60)


def apply_route_kind(route: Route, kind: RouteKind) -> None:
    """Reference ``applyRouteKind`` (mutates ``route`` in place).

    The reference's trailing ``syncRouteGeneralRate`` call is UI/state-only and
    is intentionally omitted.
    """
    route.kind = kind
    route.board = Board.SPITZER
    route.balloon = Balloon.NONE
    route.balloon_months = 0.0
    if kind == RouteKind.FIXED:
        route.rate_type = RateType.FIXED
        route.change_months = 0.0
        route.anchor_type = AnchorType.UNSET
        if route.index_type not in (IndexType.NONE, IndexType.CPI):
            route.index_type = IndexType.NONE
        route.years = min(30.0, max(4.0, num(route.years) or 20))
    elif kind == RouteKind.VARIABLE:
        route.rate_type = RateType.VARIABLE
        if route.anchor_type == AnchorType.PRIME:
            route.anchor_type = AnchorType.UNSET
        route.change_months = num(route.change_months) or 60
        if route.index_type not in (IndexType.NONE, IndexType.CPI):
            route.index_type = IndexType.NONE
        route.years = nearest_allowed_years(route, num(route.years) or 20)
    else:
        route.rate_type = RateType.VARIABLE
        route.anchor_type = AnchorType.PRIME
        route.change_months = 1.0
        route.index_type = IndexType.NONE
        route.index_pct = 0.0
        route.years = min(30.0, max(4.0, num(route.years) or 20))


def validate_mix_template(routes: list[Route]) -> str:
    """Reference ``validateMixTemplate``: empty string means valid."""
    if not routes:
        return "יש להוסיף לפחות מסלול אחד."
    if len(routes) > 10:
        return "תמהיל יכול להכיל עד 10 מסלולים."
    share = sum(num(r.share_pct) for r in routes)
    if abs(share - 100) > 0.01:
        return f"סכום אחוזי המסלולים חייב להיות 100% (כעת {share:.2f}%)."
    for i, rt in enumerate(routes):
        kind = infer_route_kind(rt)
        if kind == RouteKind.VARIABLE and num(rt.change_months) <= 0:
            return f"במסלול {i + 1} יש להזין כל כמה חודשים הריבית משתנה."
        if num(rt.anchor) + num(rt.margin) < 0:
            return f"במסלול {i + 1} הריבית הכוללת שלילית."
    return ""


def shorten_fixed_routes_to_maximum(
    routes: list[Route],
    max_pay: float,
    conditions: TuneConditions,
    params: MarketParams,
) -> list[ShortenInfo]:
    """Reference ``shortenFixedRoutesToMaximum`` (mutates ``routes``)."""
    if conditions.shorten_fixed is False:
        return []

    fixed = [
        (route, index)
        for index, route in enumerate(routes)
        if infer_route_kind(route) == RouteKind.FIXED and num(route.amount) > 0
    ]

    def _cmp(a: tuple[Route, int], b: tuple[Route, int]) -> int:
        linked_difference = int(b[0].index_type == IndexType.CPI) - int(
            a[0].index_type == IndexType.CPI
        )
        return -linked_difference if conditions.linked_fixed_first is False else linked_difference

    fixed.sort(key=cmp_to_key(_cmp))

    shortened: list[ShortenInfo] = []
    for route, index in fixed:
        original = num(route.years)
        candidates = sorted(y for y in allowed_years(route) if y < original)
        selected = original
        for years in candidates:
            route.years = years
            if calc_mix(routes, params).first_pay <= max_pay + 0.01:
                selected = years
                break
        route.years = selected
        if selected < original:
            shortened.append(
                ShortenInfo(
                    index=index,
                    from_years=original,
                    to_years=selected,
                    linked=route.index_type == IndexType.CPI,
                )
            )
    return shortened


@dataclass
class _Best:
    years: list[float]
    mix: MixResult
    in_range: bool
    distance: float


def _distance(first_pay: float, in_range: bool, target: float, lo: float, hi: float) -> float:
    if in_range:
        return abs(first_pay - target)
    return min(abs(first_pay - lo), abs(first_pay - hi))


def calculate_mix_to_range(
    routes: list[Route],
    *,
    loan: float,
    min_pay: float,
    max_pay: float,
    params: MarketParams,
    conditions: TuneConditions = DEFAULT_CONDITIONS,
) -> TuneResult:
    """Reference ``calculateMixToRange``, decoupled from global state.

    Tunes each route's period so the mix's first payment lands in
    ``[min_pay, max_pay]``. Operates on a copy; inputs are not mutated.
    """
    work = copy.deepcopy(routes)

    error = validate_mix_template(work)
    if error:
        return TuneResult(
            ok=False,
            in_range=False,
            reason=error,
            routes=work,
            years=[num(r.years) for r in work],
        )
    if loan <= 0:
        return TuneResult(
            ok=False,
            in_range=False,
            reason="יש להזין סכום משכנתא בנתונים הכלכליים.",
            routes=work,
            years=[num(r.years) for r in work],
        )
    if min_pay <= 0 or max_pay <= 0 or min_pay > max_pay:
        return TuneResult(
            ok=False,
            in_range=False,
            reason="יש להזין טווח החזר חודשי תקין.",
            routes=work,
            years=[num(r.years) for r in work],
        )

    for rt in work:
        apply_route_kind(rt, infer_route_kind(rt))
        rt.amount = loan * num(rt.share_pct) / 100

    target = (min_pay + max_pay) / 2
    best: _Best | None = None
    for step in range(0, 241):
        t = step / 240
        for rt in work:
            rt.years = candidate_years(rt, t)
        mix = calc_mix(work, params)
        in_range = min_pay <= mix.first_pay <= max_pay
        distance = _distance(mix.first_pay, in_range, target, min_pay, max_pay)
        if (
            best is None
            or int(in_range) > int(best.in_range)
            or (in_range == best.in_range and distance < best.distance)
        ):
            best = _Best([r.years for r in work], mix, in_range, distance)

    assert best is not None
    for i, years in enumerate(best.years):
        work[i].years = years

    for _round in range(3):
        for rt in work:
            local_best = best
            for years in allowed_years(rt):
                rt.years = years
                mix = calc_mix(work, params)
                in_range = min_pay <= mix.first_pay <= max_pay
                distance = _distance(mix.first_pay, in_range, target, min_pay, max_pay)
                if int(in_range) > int(local_best.in_range) or (
                    in_range == local_best.in_range and distance < local_best.distance
                ):
                    local_best = _Best([r.years for r in work], mix, in_range, distance)
            best = local_best
            for j, years in enumerate(best.years):
                work[j].years = years

    for i, years in enumerate(best.years):
        work[i].years = years

    shortened = shorten_fixed_routes_to_maximum(work, max_pay, conditions, params)
    final_mix = calc_mix(work, params)
    final_in_range = min_pay <= final_mix.first_pay <= max_pay
    return TuneResult(
        ok=final_in_range,
        in_range=final_in_range,
        reason="",
        routes=work,
        years=[num(r.years) for r in work],
        mix=final_mix,
        shortened=shortened,
    )


__all__ = [
    "allowed_years",
    "apply_route_kind",
    "calculate_mix_to_range",
    "candidate_years",
    "infer_route_kind",
    "nearest_allowed_years",
    "route_change_period",
    "shorten_fixed_routes_to_maximum",
    "validate_mix_template",
]
