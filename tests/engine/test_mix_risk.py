"""Known-value tests for ``mix_risk`` against the default risk rules."""

from __future__ import annotations

import math

from simplesave.engine import (
    AnchorType,
    IndexType,
    Route,
    RouteKind,
    mix_risk,
)


def _prime() -> Route:
    return Route(
        amount=0, anchor_type=AnchorType.PRIME, kind=RouteKind.PRIME,
        index_type=IndexType.NONE, change_months=1, share_pct=0,
    )


def _long_linked_variable() -> Route:
    return Route(
        amount=0, kind=RouteKind.VARIABLE, index_type=IndexType.CPI,
        change_months=60, share_pct=0,
    )


def test_all_prime_is_lowest_risk() -> None:
    r = _prime()
    r.share_pct = 100
    result = mix_risk([r])
    assert result.score == 1.0
    assert result.level == 1
    assert result.label == "נמוכה"


def test_long_linked_variable_is_highest_risk() -> None:
    r = _long_linked_variable()
    r.share_pct = 100
    result = mix_risk([r])
    # variable, 60-360 months, linked -> risk 4.
    assert result.score == 4.0
    assert result.level == 4
    assert result.label == "גבוהה מאוד"


def test_share_weighted_blend() -> None:
    prime = _prime()
    prime.share_pct = 50
    variable = _long_linked_variable()
    variable.share_pct = 50
    result = mix_risk([prime, variable])
    # (50*1 + 50*4) / 100 = 2.5
    assert math.isclose(result.score, 2.5)
    assert result.level == 3  # JS Math.round(2.5) -> 3
    assert result.label == "בינונית"  # 2.5 < 2.75


def test_zero_weight_returns_placeholder() -> None:
    result = mix_risk([_prime()])  # all share_pct and amount are 0
    assert result.score == 0.0
    assert result.label == "—"
