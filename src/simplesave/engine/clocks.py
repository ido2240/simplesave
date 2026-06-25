"""Five-clock templates and generation (reference templates + the range tuner).

The five compositions are ported **verbatim from the reference simulator**
(clock1–clock5, CLAUDE.md §4). This means clock4 is an exact copy of clock1 and
clock5 is a near-copy of clock3 — the known reference quirk. Per CLAUDE.md §4 we
keep the reference templates as defaults but **flag** the duplicates via
``CLOCK_DUPLICATE_FLAGS`` (surfaced to the manager UI) rather than silently
shipping them. The exact clock definition is still an OPEN business decision
(DECISIONS.md D-1/D-2): these are editable at runtime, and the manager can
replace any clock once the client signs off. The math (anchors, tuning) comes
from the validated reference engine.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from simplesave.engine.core import num
from simplesave.engine.mix import calc_mix
from simplesave.engine.risk import mix_risk
from simplesave.engine.tuning import (
    allowed_years,
    apply_route_kind,
    calculate_mix_to_range,
    infer_route_kind,
)
from simplesave.engine.types import (
    DEFAULT_CONDITIONS,
    AnchorType,
    IndexType,
    MarketParams,
    MixResult,
    RiskResult,
    Route,
    RouteKind,
    TuneConditions,
    TuneResult,
)

# Anchors taken from the reference simulator (fixed 4.62%, variable 4.70%, prime 4.56%).
# Templates are the reference simulator's clock1–clock5 VERBATIM (CLAUDE.md §4), editable
# by the manager (DECISIONS.md D-1/D-2). clock4 == clock1 and clock5 ≈ clock3 are the
# reference's own duplicates; they are kept as defaults but flagged (CLOCK_DUPLICATE_FLAGS)
# so the UI can mark them and the manager can replace them after client sign-off.


def _fixed(share: int, *, linked: bool) -> dict[str, Any]:
    return {
        "kind": "fixed",
        "share_pct": share,
        "index_type": "מדד" if linked else "ללא",
        "year_step": 5,
        "anchor": 0.0462,
    }


def _variable(share: int, *, change_months: int, linked: bool) -> dict[str, Any]:
    return {
        "kind": "variable",
        "share_pct": share,
        "index_type": "מדד" if linked else "ללא",
        "change_months": change_months,
        "year_step": change_months // 12,
        "anchor_type": "אג\"ח",
        "anchor": 0.047,
        "margin": 0,
    }


def _prime(share: int) -> dict[str, Any]:
    return {
        "kind": "prime",
        "share_pct": share,
        "index_type": "ללא",
        "change_months": 1,
        "year_step": 10,
        "anchor_type": "פריים",
        "anchor": 0.0456,
        "margin": 0,
    }


# Reference simulator templates, verbatim (CLAUDE.md §4, simulator lines ~1369–1426).
_CLOCK_ROUTE_SPECS: dict[str, list[dict[str, Any]]] = {
    # clock1: fixed-unlinked 17 / fixed-linked 17 / variable-unlinked(36) 30 / variable-linked(60) 15 / prime 21
    "clock1": [
        _fixed(17, linked=False),
        _fixed(17, linked=True),
        _variable(30, change_months=36, linked=False),
        _variable(15, change_months=60, linked=True),
        _prime(21),
    ],
    # clock2: fixed-unlinked 33 / variable-unlinked(36) 30 / prime 37
    "clock2": [
        _fixed(33, linked=False),
        _variable(30, change_months=36, linked=False),
        _prime(37),
    ],
    # clock3: fixed-unlinked 35 / prime 65
    "clock3": [
        _fixed(35, linked=False),
        _prime(65),
    ],
    # clock4: EXACT DUPLICATE of clock1 (reference quirk — flagged, not silently shipped)
    "clock4": [
        _fixed(17, linked=False),
        _fixed(17, linked=True),
        _variable(30, change_months=36, linked=False),
        _variable(15, change_months=60, linked=True),
        _prime(21),
    ],
    # clock5: fixed-unlinked 33 / prime 67 (near-duplicate of clock3 — flagged)
    "clock5": [
        _fixed(33, linked=False),
        _prime(67),
    ],
}

CLOCK_KEYS: tuple[str, ...] = ("clock1", "clock2", "clock3", "clock4", "clock5")

# Generic reference names ("שעון 1"–"שעון 5"), matching the simulator. Strategy names
# (קצר-טווח / קל"צ / חסכוני / בטוח...) are an OPEN decision — apply once the client signs off.
CLOCK_STRATEGY_NAMES: dict[str, str] = {
    "clock1": "שעון 1",
    "clock2": "שעון 2",
    "clock3": "שעון 3",
    "clock4": "שעון 4",
    "clock5": "שעון 5",
}

# Reference duplicates, flagged for the manager UI (CLAUDE.md §4/§6).
CLOCK_DUPLICATE_FLAGS: dict[str, str] = {
    "clock4": "כפיל מדויק של שעון 1 — מומלץ להחליף לאחר אישור הלקוח.",
    "clock5": "כמעט-כפיל של שעון 3 — מומלץ להחליף לאחר אישור הלקוח.",
}


@dataclass
class ClockTemplate:
    key: str
    name_he: str
    route_specs: list[dict[str, Any]]
    duplicate_flag: str | None = None


@dataclass
class ClockResult:
    key: str
    name_he: str
    duplicate_flag: str | None
    tune: TuneResult
    mix: MixResult
    risk: RiskResult
    routes: list[Route] = field(default_factory=list)


def get_clock_templates() -> list[ClockTemplate]:
    """All five clock templates (manager-configurable copy in DB later)."""
    return [
        ClockTemplate(
            key=key,
            name_he=CLOCK_STRATEGY_NAMES[key],
            route_specs=list(_CLOCK_ROUTE_SPECS[key]),
            duplicate_flag=CLOCK_DUPLICATE_FLAGS.get(key),
        )
        for key in CLOCK_KEYS
    ]


def build_clock_route(spec: dict[str, Any]) -> Route:
    """Reference ``buildClockRoute`` — blank route + general-rate anchors."""
    index_raw = spec.get("index_type", IndexType.NONE)
    index_type = IndexType(index_raw) if index_raw else IndexType.NONE
    anchor_type_raw = spec.get("anchor_type", "")
    anchor_type = AnchorType(anchor_type_raw) if anchor_type_raw else AnchorType.UNSET

    route = Route(
        kind=RouteKind(spec["kind"]),
        share_pct=num(spec.get("share_pct", 0)),
        index_type=index_type,
        year_step=num(spec.get("year_step", 0)),
        anchor=num(spec.get("anchor", 0)),
        margin=num(spec.get("margin", 0)),
        anchor_type=anchor_type,
        change_months=num(spec.get("change_months", 0)),
        index_pct=1.0 if index_type == IndexType.CPI else 0.0,
    )
    years_opts = allowed_years(route)
    route.years = years_opts[0]
    apply_route_kind(route, infer_route_kind(route))
    return route


def routes_from_template(key: str) -> list[Route]:
    specs = _CLOCK_ROUTE_SPECS.get(key, [])
    return [
        build_clock_route(spec)
        for spec in specs
        if num(spec.get("share_pct", 0)) > 0
    ]


def generate_clock(
    key: str,
    *,
    loan: float,
    min_pay: float,
    max_pay: float,
    params: MarketParams,
    conditions: TuneConditions = DEFAULT_CONDITIONS,
) -> ClockResult:
    """Tune one clock template to the payment range and return full results."""
    routes = routes_from_template(key)
    tune = calculate_mix_to_range(
        routes,
        loan=loan,
        min_pay=min_pay,
        max_pay=max_pay,
        params=params,
        conditions=conditions,
    )
    mix = tune.mix if tune.mix is not None else calc_mix(tune.routes, params)
    risk = mix_risk(tune.routes)
    return ClockResult(
        key=key,
        name_he=CLOCK_STRATEGY_NAMES[key],
        duplicate_flag=CLOCK_DUPLICATE_FLAGS.get(key),
        tune=tune,
        mix=mix,
        risk=risk,
        routes=tune.routes,
    )


def generate_all_clocks(
    *,
    loan: float,
    min_pay: float,
    max_pay: float,
    params: MarketParams,
    conditions: TuneConditions = DEFAULT_CONDITIONS,
) -> list[ClockResult]:
    """Generate all five clocks for a lead / questionnaire."""
    return [
        generate_clock(
            key,
            loan=loan,
            min_pay=min_pay,
            max_pay=max_pay,
            params=params,
            conditions=conditions,
        )
        for key in CLOCK_KEYS
    ]


__all__ = [
    "CLOCK_KEYS",
    "CLOCK_STRATEGY_NAMES",
    "ClockResult",
    "ClockTemplate",
    "build_clock_route",
    "generate_all_clocks",
    "generate_clock",
    "get_clock_templates",
    "routes_from_template",
]
