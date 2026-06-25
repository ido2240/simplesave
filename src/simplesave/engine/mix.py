"""Combine routes into a mortgage mix (reference ``calcMix``)."""

from __future__ import annotations

from simplesave.engine.core import num
from simplesave.engine.route import calc_route
from simplesave.engine.types import MarketParams, MixResult, Route, RouteResult


def calc_mix(routes: list[Route], params: MarketParams) -> MixResult:
    """Reference ``calcMix``: aggregate up to 10 routes into one mix."""
    E = 0.0
    w_years = 0.0
    w_rate = 0.0
    first_pay = 0.0
    total = 0.0
    max_n = 0
    total_interest = 0.0
    exit_fee = 0.0
    per: list[RouteResult] = []

    for route in routes:
        c = calc_route(route, params)
        per.append(c)
        e = num(route.amount)
        E += e
        w_years += e * num(route.years)
        w_rate += e * c.annual_rate
        first_pay += c.S
        total += c.T
        exit_fee += num(route.exit_fee)
        total_interest += sum(num(v) for v in c.intr)
        if c.n > max_n:
            max_n = c.n

    indexation = max(0.0, total - E - total_interest)
    return MixResult(
        E=E,
        exit_fee=exit_fee,
        total_amount=E + exit_fee,
        principal=E,
        avg_years=w_years / E if E > 0 else 0.0,
        avg_rate=w_rate / E if E > 0 else 0.0,
        first_pay=first_pay,
        total=total,
        interest=total_interest,
        indexation=indexation,
        per=per,
        max_n=max_n,
    )


__all__ = ["calc_mix"]
