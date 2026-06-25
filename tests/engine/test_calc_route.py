"""Known-value tests for ``calc_route`` against hand-verified amortization."""

from __future__ import annotations

import math

from simplesave.engine import (
    Balloon,
    Board,
    IndexType,
    MarketParams,
    Route,
    RouteKind,
    calc_route,
    pmt,
)

PARAMS = MarketParams()


def test_spitzer_1m_20yr_first_payment_and_zero_balance() -> None:
    """Principal 1,000,000 @ 5% / 20yr Spitzer: stable payment, ~0 final balance."""
    route = Route(
        amount=1_000_000, years=20, anchor=0.05,
        board=Board.SPITZER, index_type=IndexType.NONE, kind=RouteKind.FIXED,
    )
    res = calc_route(route, PARAMS)

    assert res.n == 240
    # First payment equals the standard PMT (level payment).
    expected_payment = -pmt(0.05 / 12, 240, 1_000_000)
    assert math.isclose(res.S, expected_payment, abs_tol=1e-6)
    assert math.isclose(res.S, 6599.5574, abs_tol=1e-3)

    # Level payment: total paid is the payment times the term.
    assert math.isclose(res.T, expected_payment * 240, abs_tol=1e-4)

    # Principal fully amortizes; closing balance after the last month is ~0.
    principal_repaid = sum(res.prin)
    assert math.isclose(principal_repaid, 1_000_000, abs_tol=1e-3)
    closing_balance = res.L[res.n] - res.prin[res.n]
    assert abs(closing_balance) < 1e-3

    # Unlinked route: no indexation.
    assert sum(res.idx_eff) == 0.0


def test_equal_principal_has_constant_principal() -> None:
    """Equal-principal (קרן שווה): the principal portion is constant each month."""
    route = Route(
        amount=1_000_000, years=20, anchor=0.05,
        board=Board.EQUAL_PRINCIPAL, index_type=IndexType.NONE, kind=RouteKind.FIXED,
    )
    res = calc_route(route, PARAMS)

    monthly_principal = 1_000_000 / 240
    for m in range(1, res.n + 1):
        assert math.isclose(res.prin[m], monthly_principal, abs_tol=1e-6)
    # First payment is principal + first-month interest (higher than Spitzer).
    assert math.isclose(res.S, monthly_principal + 1_000_000 * 0.05 / 12, abs_tol=1e-6)
    assert math.isclose(sum(res.prin), 1_000_000, abs_tol=1e-3)


def test_index_linked_route_accrues_indexation() -> None:
    route = Route(
        amount=1_000_000, years=20, anchor=0.03,
        board=Board.SPITZER, index_type=IndexType.CPI, index_pct=1.0, kind=RouteKind.FIXED,
    )
    res = calc_route(route, MarketParams(cpi=0.03))
    # With positive CPI expectation, total cost exceeds nominal interest-only.
    assert sum(res.idx_eff) > 0.0
    assert res.annual_index == 0.03


def test_grace_period_defers_principal() -> None:
    """Full grace (גרייס מלא): no principal is repaid during the grace months."""
    route = Route(
        amount=1_000_000, years=20, anchor=0.05, board=Board.SPITZER,
        balloon=Balloon.FULL_GRACE, balloon_months=12,
        index_type=IndexType.NONE, kind=RouteKind.FIXED,
    )
    res = calc_route(route, PARAMS)
    # During grace, principal portion is zero.
    for m in range(1, 13):
        assert res.prin[m] == 0.0
    # After grace, principal repayment begins.
    assert res.prin[13] > 0.0


def test_zero_amount_returns_empty_schedule() -> None:
    res = calc_route(Route(amount=0, years=20, anchor=0.05), PARAMS)
    assert res.S == 0.0
    assert res.T == 0.0
