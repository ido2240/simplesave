// Core numeric primitives — port of src/simplesave/engine/core.py.

import type { MarketParams, Route } from "./types";

/** Reference num: parse to a finite float, else 0 (parseFloat + isFinite). */
export function num(v: unknown): number {
  if (v === null || v === undefined || typeof v === "boolean") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

/**
 * JS Math.round semantics (round half toward +∞). The Python port used
 * floor(x+0.5) precisely to match this; on the JS runtime it is native.
 */
export function jsRound(x: number): number {
  return Math.round(x);
}

/** Reference PMT: standard monthly payment (sign-negative, like Excel). */
export function pmt(r: number, n: number, pv: number): number {
  if (n <= 0) return 0;
  if (r === 0) return -pv / n;
  return -(r * pv) / (1 - Math.pow(1 + r, -n));
}

/** Annual index expectation for a route's index type. */
export function indexExpect(indexType: string, params: MarketParams): number {
  if (indexType === "מדד") return num(params.cpi);
  if (indexType === "דולר") return num(params.usd);
  if (indexType === "אירו") return num(params.eur);
  return 0;
}

/** Custom override if present, else the expectation. */
export function routeAnnualIndex(route: Route, params: MarketParams): number {
  return route.customAnnualIndex === null
    ? indexExpect(route.indexType, params)
    : num(route.customAnnualIndex);
}

/**
 * Reference displayedAnnualIndex. The monthly-table branch is UI/state-only;
 * the engine contract is annual mode, where this is just routeAnnualIndex.
 */
export function displayedAnnualIndex(route: Route, params: MarketParams): number {
  return routeAnnualIndex(route, params);
}

/** Per-month rate: daily-compounded or simple annual/12. */
export function monthlyRate(route: Route, annualRate: number): number {
  if (route.dailyInterest) return Math.pow(1 + annualRate / 365, 365 / 12) - 1;
  return annualRate / 12;
}
