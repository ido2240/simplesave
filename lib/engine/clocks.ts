// Five-clock templates + generation. The default clock1–clock5 templates are the
// engine's built-in fallback mixes (CLAUDE §4): by default clock4 == clock1 and
// clock5 ≈ clock3 — kept as defaults but flagged via CLOCK_DUPLICATE_FLAGS so the
// manager UI can mark/replace them. In the running app the five clocks come from
// the DB-stored (manager-editable) templates.

import { num } from "./core";
import { calcMix } from "./mix";
import { mixRisk } from "./risk";
import {
  allowedYears,
  applyRouteKind,
  calculateMixToRange,
  inferRouteKind,
} from "./tuning";
import {
  DEFAULT_CONDITIONS,
  blankRoute,
  type IndexType,
  type MarketParams,
  type MixResult,
  type RiskResult,
  type Route,
  type RouteKind,
  type TuneConditions,
  type TuneResult,
} from "./types";

interface RouteSpec {
  kind: RouteKind;
  sharePct: number;
  indexType: IndexType;
  yearStep: number;
  changeMonths?: number;
  anchorType?: string;
  anchor: number;
  margin?: number;
}

const fixed = (share: number, linked: boolean): RouteSpec => ({
  kind: "fixed", sharePct: share, indexType: linked ? "מדד" : "ללא", yearStep: 5, anchor: 0.0462,
});
const variable = (share: number, changeMonths: number, linked: boolean): RouteSpec => ({
  kind: "variable", sharePct: share, indexType: linked ? "מדד" : "ללא",
  changeMonths, yearStep: Math.floor(changeMonths / 12), anchorType: 'אג"ח', anchor: 0.047, margin: 0,
});
const prime = (share: number): RouteSpec => ({
  kind: "prime", sharePct: share, indexType: "ללא", changeMonths: 1, yearStep: 10,
  anchorType: "פריים", anchor: 0.0456, margin: 0,
});

// Built-in fallback templates for the five clocks.
export const CLOCK_ROUTE_SPECS: Record<string, RouteSpec[]> = {
  clock1: [fixed(17, false), fixed(17, true), variable(30, 36, false), variable(15, 60, true), prime(21)],
  clock2: [fixed(33, false), variable(30, 36, false), prime(37)],
  clock3: [fixed(35, false), prime(65)],
  // clock4: EXACT DUPLICATE of clock1 by default — flagged, not silently shipped
  clock4: [fixed(17, false), fixed(17, true), variable(30, 36, false), variable(15, 60, true), prime(21)],
  // clock5: near-duplicate of clock3 by default — flagged
  clock5: [fixed(33, false), prime(67)],
};

export const CLOCK_KEYS = ["clock1", "clock2", "clock3", "clock4", "clock5"] as const;

export const CLOCK_STRATEGY_NAMES: Record<string, string> = {
  clock1: "שעון 1", clock2: "שעון 2", clock3: "שעון 3", clock4: "שעון 4", clock5: "שעון 5",
};

export const CLOCK_DUPLICATE_FLAGS: Record<string, string> = {
  clock4: "כפיל מדויק של שעון 1 — מומלץ להחליף לאחר אישור הלקוח.",
  clock5: "כמעט-כפיל של שעון 3 — מומלץ להחליף לאחר אישור הלקוח.",
};

export interface ClockResult {
  key: string;
  nameHe: string;
  duplicateFlag: string | null;
  tune: TuneResult;
  mix: MixResult;
  risk: RiskResult;
  routes: Route[];
}

function buildClockRoute(spec: RouteSpec): Route {
  const route = blankRoute({
    kind: spec.kind,
    sharePct: num(spec.sharePct),
    indexType: spec.indexType || "ללא",
    yearStep: num(spec.yearStep),
    anchor: num(spec.anchor),
    margin: num(spec.margin ?? 0),
    anchorType: (spec.anchorType ?? "") as Route["anchorType"],
    changeMonths: num(spec.changeMonths ?? 0),
    indexPct: spec.indexType === "מדד" ? 1 : 0,
  });
  route.years = allowedYears(route)[0];
  applyRouteKind(route, inferRouteKind(route));
  return route;
}

export function routesFromTemplate(
  key: string,
  templates: Record<string, RouteSpec[]> = CLOCK_ROUTE_SPECS,
): Route[] {
  return (templates[key] ?? []).filter((s) => num(s.sharePct) > 0).map(buildClockRoute);
}

export function generateClock(
  key: string,
  opts: {
    loan: number; minPay: number; maxPay: number; params: MarketParams;
    conditions?: TuneConditions; templates?: Record<string, RouteSpec[]>; nameHe?: string; duplicateFlag?: string | null;
  },
): ClockResult {
  const routes = routesFromTemplate(key, opts.templates);
  const tune = calculateMixToRange(routes, {
    loan: opts.loan, minPay: opts.minPay, maxPay: opts.maxPay, params: opts.params,
    conditions: opts.conditions ?? DEFAULT_CONDITIONS,
  });
  const mix = tune.mix ?? calcMix(tune.routes, opts.params);
  const risk = mixRisk(tune.routes);
  return {
    key,
    nameHe: opts.nameHe ?? CLOCK_STRATEGY_NAMES[key] ?? key,
    duplicateFlag: opts.duplicateFlag ?? CLOCK_DUPLICATE_FLAGS[key] ?? null,
    tune,
    mix,
    risk,
    routes: tune.routes,
  };
}

export function generateAllClocks(opts: {
  loan: number; minPay: number; maxPay: number; params: MarketParams; conditions?: TuneConditions;
}): ClockResult[] {
  return CLOCK_KEYS.map((key) => generateClock(key, opts));
}

export type { RouteSpec };
