"""Weighted risk score for a mix (reference ``mixRisk``)."""

from __future__ import annotations

from simplesave.engine.core import js_round, num
from simplesave.engine.tuning import infer_route_kind, route_change_period
from simplesave.engine.types import IndexType, RiskResult, RiskRule, Route, RouteKind


def default_risk_rules() -> list[RiskRule]:
    """Reference ``defaultRiskRules``."""
    return [
        RiskRule(RouteKind.PRIME.value, 1, 12, "לא", "נמוך", 1),
        RiskRule(RouteKind.VARIABLE.value, 1, 59, "לא", "בינוני", 2),
        RiskRule(RouteKind.VARIABLE.value, 1, 59, "כן", "בינוני", 3),
        RiskRule(RouteKind.VARIABLE.value, 60, 360, "לא", "גבוה", 3),
        RiskRule(RouteKind.VARIABLE.value, 60, 360, "כן", "גבוה", 4),
        RiskRule(RouteKind.FIXED.value, 48, 360, "לא", "גבוה", 3),
        RiskRule(RouteKind.FIXED.value, 48, 360, "כן", "גבוה", 4),
    ]


def risk_rule_for_route(route: Route, rules: list[RiskRule]) -> RiskRule:
    """Reference ``riskRuleForRoute``: match a route to its risk rule."""
    months = route_change_period(route)
    indexed = "כן" if route.index_type == IndexType.CPI else "לא"
    kind = infer_route_kind(route).value

    for rule in rules:
        if (
            (rule.route_kind == "all" or rule.route_kind == kind)
            and months >= num(rule.from_months)
            and months <= num(rule.to_months)
            and (rule.indexed == "הכול" or rule.indexed == indexed)
        ):
            return rule
    for rule in rules:
        if (rule.route_kind == "all" or rule.route_kind == kind) and (
            rule.indexed == "הכול" or rule.indexed == indexed
        ):
            return rule
    return RiskRule("all", 0, 0, "הכול", "נמוך", 1)


def mix_risk(routes: list[Route], rules: list[RiskRule] | None = None) -> RiskResult:
    """Reference ``mixRisk``: share- (or amount-) weighted risk score."""
    if rules is None:
        rules = default_risk_rules()

    use_shares = sum(num(rt.share_pct) for rt in routes) > 0

    def weight(rt: Route) -> float:
        return num(rt.share_pct) if use_shares else num(rt.amount)

    total = sum(weight(rt) for rt in routes)
    if total <= 0:
        return RiskResult(score=0.0, level=0, label="—")

    score = sum(weight(rt) * num(risk_rule_for_route(rt, rules).risk) for rt in routes) / total
    level = min(5, max(1, js_round(score)))
    if score < 1.75:
        label = "נמוכה"
    elif score < 2.75:
        label = "בינונית"
    elif score < 3.75:
        label = "גבוהה"
    else:
        label = "גבוהה מאוד"
    return RiskResult(score=score, level=level, label=label)


__all__ = ["default_risk_rules", "mix_risk", "risk_rule_for_route"]
