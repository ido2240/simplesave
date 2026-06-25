"""Tests for ``POST /calculate`` — assert the API matches the engine directly."""

from __future__ import annotations

import math
from typing import Any

from fastapi.testclient import TestClient

from simplesave.engine import MarketParams, Route, calc_mix, mix_risk

SAMPLE_ROUTES: list[dict[str, Any]] = [
    {
        "amount": 600000, "years": 20, "anchor": 0.05,
        "index_type": "ללא", "kind": "fixed",
    },
    {
        "amount": 400000, "years": 25, "anchor": 0.045,
        "index_type": "מדד", "kind": "fixed",
    },
]
SAMPLE_PARAMS = {"cpi": 0.03, "usd": 0.03, "eur": 0.015}


def _engine_routes() -> list[Route]:
    return [
        Route(amount=600000, years=20, anchor=0.05, index_type="ללא", kind="fixed"),
        Route(amount=400000, years=25, anchor=0.045, index_type="מדד", kind="fixed"),
    ]


def test_response_matches_engine(client: TestClient) -> None:
    resp = client.post("/calculate", json={"routes": SAMPLE_ROUTES, "params": SAMPLE_PARAMS})
    assert resp.status_code == 200
    body = resp.json()

    routes = _engine_routes()
    params = MarketParams(**SAMPLE_PARAMS)
    mix = calc_mix(routes, params)
    risk = mix_risk(routes)

    # Mix totals.
    assert math.isclose(body["mix"]["first_pay"], mix.first_pay)
    assert math.isclose(body["mix"]["total"], mix.total)
    assert math.isclose(body["mix"]["interest"], mix.interest)
    assert math.isclose(body["mix"]["indexation"], mix.indexation)
    assert math.isclose(body["mix"]["principal"], mix.principal)
    assert math.isclose(body["mix"]["avg_rate"], mix.avg_rate)
    assert math.isclose(body["mix"]["avg_years"], mix.avg_years)
    assert body["mix"]["max_n"] == mix.max_n

    # Per-route totals.
    assert len(body["routes"]) == len(mix.per)
    for out, engine_route in zip(body["routes"], mix.per, strict=True):
        assert math.isclose(out["first_pay"], engine_route.S)
        assert math.isclose(out["total"], engine_route.T)
        assert math.isclose(out["interest"], sum(engine_route.intr))
        assert math.isclose(out["indexation"], sum(engine_route.idx_eff))
        assert out["months"] == engine_route.n

    # Risk.
    assert math.isclose(body["risk"]["score"], risk.score)
    assert body["risk"]["level"] == risk.level
    assert body["risk"]["label"] == risk.label


def test_indexed_route_has_indexation(client: TestClient) -> None:
    resp = client.post("/calculate", json={"routes": SAMPLE_ROUTES, "params": SAMPLE_PARAMS})
    assert resp.status_code == 200
    assert resp.json()["mix"]["indexation"] > 0.0


def test_params_default_applied(client: TestClient) -> None:
    """Omitting params uses the engine defaults (MarketParams())."""
    resp = client.post("/calculate", json={"routes": SAMPLE_ROUTES})
    assert resp.status_code == 200
    body = resp.json()

    mix = calc_mix(_engine_routes(), MarketParams())
    assert math.isclose(body["mix"]["indexation"], mix.indexation)


def test_risk_level_present(client: TestClient) -> None:
    resp = client.post(
        "/calculate",
        json={
            "routes": [
                {"amount": 1000000, "years": 20, "anchor": 0.045, "anchor_type": "פריים",
                 "kind": "prime", "index_type": "ללא", "change_months": 1, "share_pct": 100}
            ]
        },
    )
    assert resp.status_code == 200
    risk = resp.json()["risk"]
    assert risk["level"] == 1
    assert risk["label"] == "נמוכה"


def test_empty_routes_rejected(client: TestClient) -> None:
    resp = client.post("/calculate", json={"routes": []})
    assert resp.status_code == 422


def test_too_many_routes_rejected(client: TestClient) -> None:
    route = {"amount": 100000, "years": 20, "anchor": 0.05}
    resp = client.post("/calculate", json={"routes": [route] * 11})
    assert resp.status_code == 422


def test_invalid_enum_rejected(client: TestClient) -> None:
    resp = client.post(
        "/calculate",
        json={"routes": [{"amount": 100000, "years": 20, "anchor": 0.05, "board": "nope"}]},
    )
    assert resp.status_code == 422


def test_missing_required_field_rejected(client: TestClient) -> None:
    resp = client.post("/calculate", json={"routes": [{"years": 20, "anchor": 0.05}]})
    assert resp.status_code == 422
