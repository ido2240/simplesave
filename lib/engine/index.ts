// Public engine surface (pure functions — no React, no Supabase, no I/O).
export * from "./types";
export { num, pmt, jsRound, indexExpect, routeAnnualIndex, monthlyRate } from "./core";
export { calcRoute } from "./route";
export { calcMix } from "./mix";
export { defaultRiskRules, riskRuleForRoute, mixRisk } from "./risk";
export {
  inferRouteKind,
  allowedYears,
  nearestAllowedYears,
  candidateYears,
  routeChangePeriod,
  applyRouteKind,
  validateMixTemplate,
  shortenFixedRoutesToMaximum,
  calculateMixToRange,
} from "./tuning";
export {
  CLOCK_KEYS,
  CLOCK_STRATEGY_NAMES,
  CLOCK_DUPLICATE_FLAGS,
  generateClock,
  generateAllClocks,
  routesFromTemplate,
  CLOCK_ROUTE_SPECS,
  type ClockResult,
  type RouteSpec,
} from "./clocks";
export * from "./rules";
