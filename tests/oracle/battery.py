"""Shared battery of engine cases for the JS↔Python parity check.

Cases are generated once (seeded) as JS-shaped dicts so the exact same inputs
feed both the Node oracle (``run_oracle.js``) and the Python engine. Helpers
convert a case's routes/params into Python engine objects and reduce engine
results to plain dicts whose keys match the oracle's JSON output.
"""

from __future__ import annotations

import random
from typing import Any

from simplesave.engine import (
    MarketParams,
    MixResult,
    PurposeSplit,
    Route,
    RouteResult,
    calc_mix,
    calc_route,
    calculate_mix_to_range,
    mix_risk,
)

BOARDS = ["שפיצר", "קרן שווה"]
BALLOONS = ["", "בלון מלא", "בלון חלקי", "גרייס מלא", "גרייס חלקי"]
INDEX_TYPES = ["ללא", "מדד", "דולר", "אירו"]


# --- dict -> Python engine objects -------------------------------------------

def params_from_dict(d: dict[str, Any]) -> MarketParams:
    return MarketParams(
        cpi=float(d.get("מדד", 0.0)),
        usd=float(d.get("דולר", 0.0)),
        eur=float(d.get("אירו", 0.0)),
    )


def route_from_dict(d: dict[str, Any]) -> Route:
    split = None
    if d.get("purposeSplit"):
        ps = d["purposeSplit"]
        split = PurposeSplit(
            housing=float(ps.get("housing", 0)),
            all_purpose=float(ps.get("allPurpose", 0)),
        )
    return Route(
        amount=float(d.get("amount", 0) or 0),
        years=float(d.get("years", 0) or 0),
        anchor=float(d.get("anchor", 0) or 0),
        margin=float(d.get("margin", 0) or 0),
        board=d.get("board", "שפיצר"),
        balloon=d.get("balloon", ""),
        balloon_months=float(d.get("balloonMonths", 0) or 0),
        index_type=d.get("indexType", "ללא"),
        index_pct=float(d.get("indexPct", 1) if d.get("indexPct", 1) != "" else 1),
        daily_interest=bool(d.get("dailyInterest", False)),
        custom_annual_index=d.get("customAnnualIndex"),
        kind=d.get("kind"),
        rate_type=d.get("rateType", "קבועה"),
        anchor_type=d.get("anchorType", ""),
        change_months=float(d.get("changeMonths", 0) or 0),
        share_pct=float(d.get("sharePct", 0) or 0),
        exit_fee=float(d.get("exitFee", 0) or 0),
        year_step=float(d.get("yearStep", 0) or 0),
        purpose_split=split,
        loan_purpose=d.get("loanPurpose", ""),
    )


# --- Python engine result -> oracle-shaped dict ------------------------------

def _dense(arr: list[float], n: int) -> list[float]:
    return [float(arr[i]) if i < len(arr) else 0.0 for i in range(n + 1)]


def py_route_result(route: Route, params: MarketParams) -> dict[str, Any]:
    c: RouteResult = calc_route(route, params)
    return {
        "S": c.S, "T": c.T, "n": c.n,
        "annualRate": c.annual_rate, "enteredAnnualRate": c.entered_annual_rate,
        "effRate": c.eff_rate, "annualIndex": c.annual_index,
        "invalidNegativeRate": c.invalid_negative_rate,
        "L": _dense(c.L, c.n), "M": _dense(c.M, c.n),
        "prin": _dense(c.prin, c.n), "intr": _dense(c.intr, c.n),
        "cum": _dense(c.cum, c.n), "baseL": _dense(c.base_l, c.n),
        "basePrin": _dense(c.base_prin, c.n), "indexBal": _dense(c.index_bal, c.n),
        "idxPrin": _dense(c.idx_prin, c.n), "idxIntr": _dense(c.idx_intr, c.n),
        "idxEff": _dense(c.idx_eff, c.n),
    }


def py_mix_result(mix: MixResult) -> dict[str, Any]:
    return {
        "E": mix.E, "exitFee": mix.exit_fee, "totalAmount": mix.total_amount,
        "principal": mix.principal, "avgYears": mix.avg_years, "avgRate": mix.avg_rate,
        "firstPay": mix.first_pay, "total": mix.total, "interest": mix.interest,
        "indexation": mix.indexation, "maxN": mix.max_n,
    }


def py_run_case(case: dict[str, Any]) -> dict[str, Any]:
    params = params_from_dict(case.get("params", {}))
    routes = [route_from_dict(r) for r in case["routes"]]
    if case["type"] == "route":
        return {"route": py_route_result(routes[0], params)}
    if case["type"] == "mix":
        return {"mix": py_mix_result(calc_mix(routes, params))}
    if case["type"] == "risk":
        r = mix_risk(routes)
        return {"risk": {"score": r.score, "level": r.level, "label": r.label}}
    if case["type"] == "tune":
        t = calculate_mix_to_range(
            routes, loan=case["loan"], min_pay=case["minPay"],
            max_pay=case["maxPay"], params=params,
        )
        assert t.mix is not None
        return {"tune": {"ok": t.ok, "years": t.years, "mix": py_mix_result(t.mix)}}
    raise ValueError(f"unknown case type: {case['type']}")


# --- battery generation ------------------------------------------------------

def _rng_params(rng: random.Random) -> dict[str, float]:
    return {
        "מדד": round(rng.uniform(0.0, 0.04), 4),
        "דולר": round(rng.uniform(0.0, 0.04), 4),
        "אירו": round(rng.uniform(0.0, 0.03), 4),
    }


def _rng_route(rng: random.Random, *, with_share: bool = False) -> dict[str, Any]:
    kind = rng.choice(["fixed", "variable", "prime"])
    board = rng.choice(BOARDS)
    if kind == "prime":
        index_type = "ללא"
        anchor_type = "פריים"
        rate_type = "משתנה"
        change_months = 1
    elif kind == "variable":
        index_type = rng.choice(INDEX_TYPES)
        anchor_type = ""
        rate_type = "משתנה"
        change_months = rng.choice([12, 24, 36, 60])
    else:
        index_type = rng.choice(["ללא", "מדד"])
        anchor_type = ""
        rate_type = "קבועה"
        change_months = 0

    balloon = rng.choice(BALLOONS)
    years = rng.choice([4, 7, 10, 12, 15, 18, 20, 25, 27, 30])
    balloon_months = 0
    if balloon:
        balloon_months = rng.randint(1, max(1, years * 12 - 1))

    route: dict[str, Any] = {
        "amount": rng.choice([200000, 350000, 500000, 750000, 1000000]),
        "years": years,
        "anchor": round(rng.uniform(0.02, 0.06), 4),
        "margin": round(rng.uniform(0.0, 0.015), 4) if kind != "fixed" else 0,
        "board": board,
        "balloon": balloon,
        "balloonMonths": balloon_months,
        "indexType": index_type,
        "indexPct": 1,
        "rateType": rate_type,
        "changeMonths": change_months,
        "anchorType": anchor_type,
        "kind": kind,
    }
    if with_share:
        route["sharePct"] = 0  # filled by caller
    return route


def _normalize_shares(routes: list[dict[str, Any]], rng: random.Random) -> None:
    weights = [rng.randint(1, 5) for _ in routes]
    total = sum(weights)
    shares = [round(w / total * 100, 2) for w in weights]
    shares[-1] = round(100 - sum(shares[:-1]), 2)
    for r, s in zip(routes, shares, strict=True):
        r["sharePct"] = s


def build_battery(seed: int = 20240601) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    cases: list[dict[str, Any]] = []

    # Single-route schedules across every kind/board/balloon/index combination.
    for _ in range(70):
        cases.append({"type": "route", "params": _rng_params(rng), "routes": [_rng_route(rng)]})

    # Multi-route mixes.
    for _ in range(25):
        n = rng.randint(2, 5)
        routes = [_rng_route(rng) for _ in range(n)]
        cases.append({"type": "mix", "params": _rng_params(rng), "routes": routes})

    # Risk scoring (shares present).
    for _ in range(25):
        n = rng.randint(1, 5)
        routes = [_rng_route(rng, with_share=True) for _ in range(n)]
        _normalize_shares(routes, rng)
        cases.append({"type": "risk", "params": {}, "routes": routes})

    # Tuning to a payment range (no balloon/grace — matches clock generation).
    for _ in range(20):
        n = rng.randint(2, 4)
        routes = []
        for _ in range(n):
            r = _rng_route(rng, with_share=True)
            r["balloon"] = ""
            r["balloonMonths"] = 0
            routes.append(r)
        _normalize_shares(routes, rng)
        loan = rng.choice([800000, 1000000, 1500000, 2000000])
        lo = rng.choice([4000, 5000, 6000, 7000])
        hi = lo + rng.choice([1500, 2000, 3000])
        cases.append(
            {"type": "tune", "params": _rng_params(rng), "routes": routes,
             "loan": loan, "minPay": lo, "maxPay": hi}
        )

    return cases
