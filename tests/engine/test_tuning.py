"""Tests for ``calculate_mix_to_range`` (the generic clock tuner)."""

from __future__ import annotations

import copy

from simplesave.engine import (
    AnchorType,
    IndexType,
    MarketParams,
    RateType,
    Route,
    RouteKind,
    calculate_mix_to_range,
)

PARAMS = MarketParams(cpi=0.03, usd=0.03, eur=0.015)


def _mix() -> list[Route]:
    return [
        Route(
            amount=0, years=20, anchor=0.05, index_type=IndexType.NONE,
            kind=RouteKind.FIXED, rate_type=RateType.FIXED, share_pct=50,
        ),
        Route(
            amount=0, years=20, anchor=0.045, anchor_type=AnchorType.PRIME,
            kind=RouteKind.PRIME, index_type=IndexType.NONE, change_months=1, share_pct=50,
        ),
    ]


def test_tuner_lands_inside_range() -> None:
    result = calculate_mix_to_range(
        _mix(), loan=1_000_000, min_pay=6_000, max_pay=7_000, params=PARAMS
    )
    assert result.ok is True
    assert result.in_range is True
    assert result.mix is not None
    assert 6_000 <= result.mix.first_pay <= 7_000


def test_tuner_does_not_mutate_inputs() -> None:
    routes = _mix()
    snapshot = copy.deepcopy(routes)
    calculate_mix_to_range(routes, loan=1_000_000, min_pay=6_000, max_pay=7_000, params=PARAMS)
    assert routes == snapshot


def test_invalid_shares_reported() -> None:
    routes = _mix()
    routes[0].share_pct = 30  # shares no longer sum to 100
    result = calculate_mix_to_range(
        routes, loan=1_000_000, min_pay=6_000, max_pay=7_000, params=PARAMS
    )
    assert result.ok is False
    assert "100%" in result.reason


def test_invalid_range_reported() -> None:
    result = calculate_mix_to_range(
        _mix(), loan=1_000_000, min_pay=7_000, max_pay=6_000, params=PARAMS
    )
    assert result.ok is False
    assert result.reason


def test_zero_loan_reported() -> None:
    result = calculate_mix_to_range(
        _mix(), loan=0, min_pay=6_000, max_pay=7_000, params=PARAMS
    )
    assert result.ok is False
    assert result.reason
