// Mix aggregation — port of src/simplesave/engine/mix.py.

import { num } from "./core";
import { calcRoute } from "./route";
import type { MarketParams, MixResult, Route, RouteResult } from "./types";

export function calcMix(routes: Route[], params: MarketParams): MixResult {
  let E = 0;
  let wYears = 0;
  let wRate = 0;
  let firstPay = 0;
  let total = 0;
  let maxN = 0;
  let totalInterest = 0;
  let exitFee = 0;
  const per: RouteResult[] = [];

  for (const route of routes) {
    const c = calcRoute(route, params);
    per.push(c);
    const e = num(route.amount);
    E += e;
    wYears += e * num(route.years);
    wRate += e * c.annualRate;
    firstPay += c.S;
    total += c.T;
    exitFee += num(route.exitFee);
    totalInterest += c.intr.reduce((s, v) => s + num(v), 0);
    if (c.n > maxN) maxN = c.n;
  }

  return {
    E,
    exitFee,
    totalAmount: E + exitFee,
    principal: E,
    avgYears: E > 0 ? wYears / E : 0,
    avgRate: E > 0 ? wRate / E : 0,
    firstPay,
    total,
    interest: totalInterest,
    indexation: Math.max(0, total - E - totalInterest),
    per,
    maxN,
  };
}
