"""Pydantic request/response models for the calculation API.

This module is the translation boundary between JSON over HTTP and the pure
engine types. The engine package stays free of Pydantic/framework imports; the
conversions live here.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from simplesave.engine import (
    AnchorType,
    Balloon,
    Board,
    IndexType,
    MarketParams,
    MixResult,
    PurposeSplit,
    RateType,
    RiskResult,
    Route,
    RouteKind,
    RouteResult,
)

# --- request ----------------------------------------------------------------


class PurposeSplitInput(BaseModel):
    housing: float = 0.0
    all_purpose: float = 0.0

    def to_engine(self) -> PurposeSplit:
        return PurposeSplit(housing=self.housing, all_purpose=self.all_purpose)


class RouteInput(BaseModel):
    """One mortgage track. Mirrors the engine ``Route``; defaults match it."""

    amount: float = Field(ge=0)
    years: float = Field(gt=0)
    anchor: float
    margin: float = 0.0
    board: Board = Board.SPITZER
    balloon: Balloon = Balloon.NONE
    balloon_months: float = 0.0
    index_type: IndexType = IndexType.NONE
    index_pct: float = 1.0
    daily_interest: bool = False
    custom_annual_index: float | None = None
    kind: RouteKind | None = None
    rate_type: RateType = RateType.FIXED
    anchor_type: AnchorType = AnchorType.UNSET
    change_months: float = 0.0
    share_pct: float = 0.0
    exit_fee: float = 0.0
    year_step: float = 0.0
    purpose_split: PurposeSplitInput | None = None
    loan_purpose: str = ""

    def to_engine(self) -> Route:
        return Route(
            amount=self.amount,
            years=self.years,
            anchor=self.anchor,
            margin=self.margin,
            board=self.board,
            balloon=self.balloon,
            balloon_months=self.balloon_months,
            index_type=self.index_type,
            index_pct=self.index_pct,
            daily_interest=self.daily_interest,
            custom_annual_index=self.custom_annual_index,
            kind=self.kind,
            rate_type=self.rate_type,
            anchor_type=self.anchor_type,
            change_months=self.change_months,
            share_pct=self.share_pct,
            exit_fee=self.exit_fee,
            year_step=self.year_step,
            purpose_split=self.purpose_split.to_engine() if self.purpose_split else None,
            loan_purpose=self.loan_purpose,
        )


class MarketParamsInput(BaseModel):
    """Annual index expectations. Defaults match the engine ``MarketParams``."""

    cpi: float = 0.03
    usd: float = 0.03
    eur: float = 0.015

    def to_engine(self) -> MarketParams:
        return MarketParams(cpi=self.cpi, usd=self.usd, eur=self.eur)


class CalculateRequest(BaseModel):
    routes: list[RouteInput] = Field(min_length=1, max_length=10)
    params: MarketParamsInput = Field(default_factory=MarketParamsInput)


# --- response ---------------------------------------------------------------


class RouteResultOutput(BaseModel):
    first_pay: float
    total: float
    interest: float
    indexation: float
    months: int
    annual_rate: float
    eff_rate: float

    @classmethod
    def from_engine(cls, r: RouteResult) -> RouteResultOutput:
        return cls(
            first_pay=r.S,
            total=r.T,
            interest=sum(r.intr),
            indexation=sum(r.idx_eff),
            months=r.n,
            annual_rate=r.annual_rate,
            eff_rate=r.eff_rate,
        )


class MixResultOutput(BaseModel):
    first_pay: float
    total: float
    interest: float
    indexation: float
    principal: float
    exit_fee: float
    total_amount: float
    avg_rate: float
    avg_years: float
    max_n: int

    @classmethod
    def from_engine(cls, m: MixResult) -> MixResultOutput:
        return cls(
            first_pay=m.first_pay,
            total=m.total,
            interest=m.interest,
            indexation=m.indexation,
            principal=m.principal,
            exit_fee=m.exit_fee,
            total_amount=m.total_amount,
            avg_rate=m.avg_rate,
            avg_years=m.avg_years,
            max_n=m.max_n,
        )


class RiskOutput(BaseModel):
    score: float
    level: int
    label: str

    @classmethod
    def from_engine(cls, r: RiskResult) -> RiskOutput:
        return cls(score=r.score, level=r.level, label=r.label)


class CalculateResponse(BaseModel):
    routes: list[RouteResultOutput]
    mix: MixResultOutput
    risk: RiskOutput
