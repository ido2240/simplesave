"""Known-value / invariant tests for ``calc_mix``."""

from __future__ import annotations

import math

from simplesave.engine import (
    IndexType,
    MarketParams,
    Route,
    RouteKind,
    calc_mix,
    calc_route,
)

PARAMS = MarketParams(cpi=0.03, usd=0.03, eur=0.015)


def _routes() -> list[Route]:
    return [
        Route(
            amount=600_000, years=20, anchor=0.05,
            index_type=IndexType.NONE, kind=RouteKind.FIXED,
        ),
        Route(
            amount=400_000, years=25, anchor=0.045,
            index_type=IndexType.CPI, kind=RouteKind.FIXED,
        ),
    ]


def test_mix_aggregates_routes() -> None:
    routes = _routes()
    mix = calc_mix(routes, PARAMS)
    per = [calc_route(r, PARAMS) for r in routes]

    assert math.isclose(mix.E, 1_000_000)
    assert math.isclose(mix.principal, 1_000_000)
    assert math.isclose(mix.first_pay, sum(p.S for p in per))
    assert math.isclose(mix.total, sum(p.T for p in per))
    assert math.isclose(mix.interest, sum(sum(p.intr) for p in per))
    assert mix.max_n == max(p.n for p in per)


def test_indexation_is_total_minus_principal_and_interest() -> None:
    mix = calc_mix(_routes(), PARAMS)
    assert math.isclose(mix.indexation, max(0.0, mix.total - mix.E - mix.interest))
    # The linked route should produce positive indexation.
    assert mix.indexation > 0.0


def test_weighted_averages() -> None:
    mix = calc_mix(_routes(), PARAMS)
    # avg_years weighted by amount: (600k*20 + 400k*25) / 1M = 22.
    assert math.isclose(mix.avg_years, 22.0)


def test_exit_fee_flows_into_total_amount() -> None:
    routes = _routes()
    routes[0].exit_fee = 5_000
    mix = calc_mix(routes, PARAMS)
    assert math.isclose(mix.exit_fee, 5_000)
    assert math.isclose(mix.total_amount, mix.E + 5_000)
