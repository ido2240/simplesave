"""``POST /calculate`` — run the engine over a mix supplied as JSON."""

from __future__ import annotations

from fastapi import APIRouter

from simplesave.api.schemas import (
    CalculateRequest,
    CalculateResponse,
    MixResultOutput,
    RiskOutput,
    RouteResultOutput,
)
from simplesave.engine import calc_mix, mix_risk

router = APIRouter(tags=["calculation"])


@router.post("/calculate", response_model=CalculateResponse)
def calculate(request: CalculateRequest) -> CalculateResponse:
    """Compute per-route and mix totals plus the risk score for a mortgage mix."""
    routes = [r.to_engine() for r in request.routes]
    params = request.params.to_engine()

    mix = calc_mix(routes, params)  # also computes each route (mix.per)
    risk = mix_risk(routes)

    return CalculateResponse(
        routes=[RouteResultOutput.from_engine(r) for r in mix.per],
        mix=MixResultOutput.from_engine(mix),
        risk=RiskOutput.from_engine(risk),
    )
