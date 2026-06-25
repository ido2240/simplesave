"""Single-route amortization schedule (reference ``calcRoute``).

Handles Spitzer (level payment) and equal-principal boards, index linkage
applied monthly as ``annual_index / 12`` (the linear industry approximation —
see CLAUDE.md §3), balloon (full/partial) and grace (full/partial), and the
housing / any-purpose split. Pure functions only.
"""

from __future__ import annotations

import copy
import math
from dataclasses import dataclass

from simplesave.engine.core import (
    displayed_annual_index,
    monthly_rate,
    num,
    pmt,
    route_annual_index,
)
from simplesave.engine.types import (
    Balloon,
    Board,
    MarketParams,
    Route,
    RouteResult,
)


@dataclass
class _PurposePart:
    purpose: str
    share: float


def route_purpose_parts(route: Route) -> list[_PurposePart]:
    """Reference ``routePurposeParts``: housing / any-purpose split shares."""
    split = route.purpose_split
    if not split:
        return []
    housing = max(0.0, num(split.housing))
    all_purpose = max(0.0, num(split.all_purpose))
    total = housing + all_purpose
    if total <= 0:
        return []
    parts: list[_PurposePart] = []
    if housing > 0:
        parts.append(_PurposePart("housing", housing / total))
    if all_purpose > 0:
        parts.append(_PurposePart("allPurpose", all_purpose / total))
    return parts


_ARRAY_FIELDS = (
    "L",
    "base_l",
    "base_prin",
    "index_bal",
    "M",
    "prin",
    "intr",
    "idx_eff",
    "idx_prin",
    "idx_intr",
    "cum",
)


def _merge_split_route_calcs(
    parts: list[tuple[float, RouteResult]],
) -> RouteResult:
    """Reference ``mergeSplitRouteCalcs``: weighted-merge two sub-route calcs."""
    max_n = max((c.n or 0) for _, c in parts) if parts else 0
    amount = sum(num(a) for a, _ in parts)
    out = RouteResult(n=max_n)
    for fld in _ARRAY_FIELDS:
        setattr(out, fld, [0.0] * (max_n + 1))
    for part_amount, c in parts:
        weight = num(part_amount) / amount if amount > 0 else 0.0
        out.S += num(c.S)
        out.T += num(c.T)
        out.annual_rate += num(c.annual_rate) * weight
        out.entered_annual_rate += num(c.entered_annual_rate) * weight
        out.eff_rate += num(c.eff_rate) * weight
        out.annual_index += num(c.annual_index) * weight
        out.invalid_negative_rate = out.invalid_negative_rate or bool(c.invalid_negative_rate)
        for fld in _ARRAY_FIELDS:
            dst = getattr(out, fld)
            src = getattr(c, fld)
            for i in range(max_n + 1):
                src_v = src[i] if i < len(src) else 0.0
                dst[i] = num(dst[i]) + num(src_v)
    return out


def calc_route(route: Route, params: MarketParams, *, _bypass_split: bool = False) -> RouteResult:
    """Reference ``calcRoute``: month-by-month amortization for one track."""
    E = num(route.amount)
    dy = num(route.years)

    purpose_parts = route_purpose_parts(route)
    if E > 0 and len(purpose_parts) > 1 and not _bypass_split:
        merged: list[tuple[float, RouteResult]] = []
        for part in purpose_parts:
            sub = copy.copy(route)
            sub.purpose_split = None
            sub.loan_purpose = part.purpose
            sub.amount = E * part.share
            merged.append((E * part.share, calc_route(sub, params, _bypass_split=True)))
        return _merge_split_route_calcs(merged)

    n = math.trunc(dy * 12)
    entered_annual_rate = num(route.anchor) + num(route.margin)
    annual_rate = max(0.0, entered_annual_rate)
    r = monthly_rate(route, annual_rate)

    out = RouteResult(
        n=n,
        annual_rate=annual_rate,
        entered_annual_rate=entered_annual_rate,
        invalid_negative_rate=entered_annual_rate < 0,
        eff_rate=math.pow(1 + r, 12) - 1,
        annual_index=displayed_annual_index(route, params),
    )
    if n <= 0 or E <= 0:
        return out

    board = route.board or Board.SPITZER
    g = route.balloon or Balloon.NONE
    h = num(route.balloon_months)
    is_balloon = g in (Balloon.PARTIAL_BALLOON, Balloon.FULL_BALLOON)
    is_grace = g in (Balloon.FULL_GRACE, Balloon.PARTIAL_GRACE)

    # 1-indexed working arrays (index 0 is a zero placeholder).
    L = [0.0] * (n + 1)
    B = [0.0] * (n + 1)
    N = [0.0] * (n + 1)
    O = [0.0] * (n + 1)  # noqa: E741 - matches reference variable name
    P = [0.0] * (n + 1)
    R = [0.0] * (n + 1)
    M = [0.0] * (n + 1)
    for fld in _ARRAY_FIELDS:
        setattr(out, fld, [0.0] * (n + 1))

    cum_m = 0.0
    cum_o = 0.0
    sum_r = 0.0
    t_total = 0.0
    # Float like the reference's H, so a non-integer balloon month never trips
    # the equality below (matches ``m === H``).
    idx_stop: float = h if is_balloon else n

    for m in range(1, n + 1):
        # Pure annual-index mode: the monthly-table branch never applies.
        idx = (route_annual_index(route, params) / 12) * num(route.index_pct)

        if m == 1:
            L[m] = E if dy * 12 > 1 else 0.0
            B[m] = L[m]
        else:
            if dy * 12 >= m:
                if is_balloon:
                    L[m] = P[m - 1] if (h == m or h + 1 > m) else 0.0
                elif g == Balloon.FULL_GRACE:
                    L[m] = P[m - 1] + sum_r if (h + 1 == m) else P[m - 1]
                else:
                    L[m] = P[m - 1]
            else:
                L[m] = 0.0
            B[m] = max(0.0, B[m - 1] - num(out.base_prin[m - 1]))

        O[m] = L[m] * r
        if L[m] > 0:
            if is_balloon:
                N[m] = 0.0
            elif is_grace and h >= m:
                N[m] = 0.0
            elif board == Board.SPITZER:
                N[m] = -pmt(r, n - m + 1, L[m]) - O[m]
            else:
                N[m] = L[m] / (n - m + 1)
        else:
            N[m] = 0.0

        P[m] = (L[m] - N[m]) * (idx + 1)
        R[m] = O[m] + N[m]
        sum_r += R[m]

        # After the grace period, a Spitzer route re-amortizes; otherwise it
        # pays the equal-principal installment R[m].
        grace_pay = -pmt(r, n - m + 1, L[m]) if board == Board.SPITZER else R[m]
        if g == Balloon.FULL_BALLOON:
            M[m] = P[m] if h == m else 0.0
        elif g == Balloon.PARTIAL_BALLOON:
            M[m] = O[m] if h > m else (P[m] + O[m] if h == m else 0.0)
        elif g == Balloon.FULL_GRACE:
            M[m] = 0.0 if h >= m else grace_pay
        elif g == Balloon.PARTIAL_GRACE:
            M[m] = O[m] if h >= m else grace_pay
        else:
            M[m] = R[m]

        cum_m += M[m]
        cum_o += O[m]
        if g == Balloon.PARTIAL_BALLOON:
            q = cum_m if h == m else 0.0
        elif g == Balloon.FULL_BALLOON:
            q = cum_m + cum_o if h == m else 0.0
        else:
            q = cum_m
        if m == idx_stop:
            t_total = q

        idx_prin = (L[m] - N[m]) * idx
        idx_intr = O[m] * idx
        base_prin = N[m] * (B[m] / L[m]) if L[m] > 0 else 0.0
        out.base_prin[m] = base_prin
        out.base_l[m] = B[m]
        out.index_bal[m] = max(0.0, L[m] - B[m])
        out.prin[m] = N[m]
        out.intr[m] = O[m]
        out.idx_prin[m] = idx_prin
        out.idx_intr[m] = idx_intr
        out.idx_eff[m] = idx_prin + idx_intr
        out.cum[m] = cum_m

    out.S = M[1] if M[1] else 0.0
    out.T = t_total
    out.L = L
    out.M = M
    return out


__all__ = ["calc_route", "route_purpose_parts"]
