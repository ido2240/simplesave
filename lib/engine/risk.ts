// Weighted risk score for a mortgage mix.

import { jsRound, num } from "./core";
import { inferRouteKind, routeChangePeriod } from "./tuning";
import type { RiskResult, RiskRule, Route } from "./types";

export function defaultRiskRules(): RiskRule[] {
  return [
    { routeKind: "prime", fromMonths: 1, toMonths: 12, indexed: "לא", exitPenalty: "נמוך", risk: 1 },
    { routeKind: "variable", fromMonths: 1, toMonths: 59, indexed: "לא", exitPenalty: "בינוני", risk: 2 },
    { routeKind: "variable", fromMonths: 1, toMonths: 59, indexed: "כן", exitPenalty: "בינוני", risk: 3 },
    { routeKind: "variable", fromMonths: 60, toMonths: 360, indexed: "לא", exitPenalty: "גבוה", risk: 3 },
    { routeKind: "variable", fromMonths: 60, toMonths: 360, indexed: "כן", exitPenalty: "גבוה", risk: 4 },
    { routeKind: "fixed", fromMonths: 48, toMonths: 360, indexed: "לא", exitPenalty: "גבוה", risk: 3 },
    { routeKind: "fixed", fromMonths: 48, toMonths: 360, indexed: "כן", exitPenalty: "גבוה", risk: 4 },
  ];
}

export function riskRuleForRoute(route: Route, rules: RiskRule[]): RiskRule {
  const months = routeChangePeriod(route);
  const indexed = route.indexType === "מדד" ? "כן" : "לא";
  const kind = inferRouteKind(route);

  for (const rule of rules) {
    if (
      (rule.routeKind === "all" || rule.routeKind === kind) &&
      months >= num(rule.fromMonths) &&
      months <= num(rule.toMonths) &&
      (rule.indexed === "הכול" || rule.indexed === indexed)
    ) {
      return rule;
    }
  }
  for (const rule of rules) {
    if (
      (rule.routeKind === "all" || rule.routeKind === kind) &&
      (rule.indexed === "הכול" || rule.indexed === indexed)
    ) {
      return rule;
    }
  }
  return { routeKind: "all", fromMonths: 0, toMonths: 0, indexed: "הכול", exitPenalty: "נמוך", risk: 1 };
}

export function mixRisk(routes: Route[], rules: RiskRule[] = defaultRiskRules()): RiskResult {
  const useShares = routes.reduce((s, rt) => s + num(rt.sharePct), 0) > 0;
  const weight = (rt: Route) => (useShares ? num(rt.sharePct) : num(rt.amount));
  const total = routes.reduce((s, rt) => s + weight(rt), 0);
  if (total <= 0) return { score: 0, level: 0, label: "—" };

  const score = routes.reduce((s, rt) => s + weight(rt) * num(riskRuleForRoute(rt, rules).risk), 0) / total;
  const level = Math.min(5, Math.max(1, jsRound(score)));
  const label = score < 1.75 ? "נמוכה" : score < 2.75 ? "בינונית" : score < 3.75 ? "גבוהה" : "גבוהה מאוד";
  return { score, level, label };
}
