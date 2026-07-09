// Route normalization, allowed periods, and the mix-to-range tuner.
// The tuner produces the clocks.

import { jsRound, num } from "./core";
import { calcMix } from "./mix";
import {
  DEFAULT_CONDITIONS,
  type MarketParams,
  type MixResult,
  type Route,
  type RouteKind,
  type ShortenInfo,
  type TuneConditions,
  type TuneResult,
} from "./types";

export function inferRouteKind(route: Route): RouteKind {
  if (route.kind) return route.kind;
  if (route.anchorType === "פריים") return "prime";
  return route.rateType === "משתנה" ? "variable" : "fixed";
}

export function allowedYears(route: Route): number[] {
  const kind = inferRouteKind(route);
  if (kind !== "variable") {
    const step = Math.max(1, jsRound(num(route.yearStep) || 1));
    const first = step > 1 ? Math.max(4, step) : 4;
    const out: number[] = [];
    for (let years = first; years <= 30; years += step) out.push(years);
    return out;
  }
  const base = num(route.yearStep) || num(route.changeMonths) / 12 || 5;
  const jump = Math.max(1, jsRound(base * 12));
  const out: number[] = [];
  for (let months = 72; months <= 360; months++) {
    if (months % jump === 0) out.push(months / 12);
  }
  return out.length ? out : [6, 30];
}

export function nearestAllowedYears(route: Route, value: number): number {
  const vals = allowedYears(route);
  return vals.reduce((best, x) => (Math.abs(x - value) < Math.abs(best - value) ? x : best), vals[0]);
}

export function candidateYears(route: Route, t: number): number {
  const values = allowedYears(route);
  return values[jsRound(t * (values.length - 1))];
}

export function routeChangePeriod(route: Route): number {
  const kind = inferRouteKind(route);
  if (kind === "fixed") return jsRound(num(route.years) * 12);
  if (kind === "prime") return 1;
  return jsRound(num(route.changeMonths) || 60);
}

export function applyRouteKind(route: Route, kind: RouteKind): void {
  route.kind = kind;
  route.board = "שפיצר";
  route.balloon = "";
  route.balloonMonths = 0;
  if (kind === "fixed") {
    route.rateType = "קבועה";
    route.changeMonths = 0;
    route.anchorType = "";
    if (route.indexType !== "ללא" && route.indexType !== "מדד") route.indexType = "ללא";
    route.years = Math.min(30, Math.max(4, num(route.years) || 20));
  } else if (kind === "variable") {
    route.rateType = "משתנה";
    if (route.anchorType === "פריים") route.anchorType = "";
    route.changeMonths = num(route.changeMonths) || 60;
    if (route.indexType !== "ללא" && route.indexType !== "מדד") route.indexType = "ללא";
    route.years = nearestAllowedYears(route, num(route.years) || 20);
  } else {
    route.rateType = "משתנה";
    route.anchorType = "פריים";
    route.changeMonths = 1;
    route.indexType = "ללא";
    route.indexPct = 0;
    route.years = Math.min(30, Math.max(4, num(route.years) || 20));
  }
}

export function validateMixTemplate(routes: Route[]): string {
  if (!routes.length) return "יש להוסיף לפחות מסלול אחד.";
  if (routes.length > 10) return "תמהיל יכול להכיל עד 10 מסלולים.";
  const share = routes.reduce((s, r) => s + num(r.sharePct), 0);
  if (Math.abs(share - 100) > 0.01)
    return `סכום אחוזי המסלולים חייב להיות 100% (כעת ${share.toFixed(2)}%).`;
  for (let i = 0; i < routes.length; i++) {
    const rt = routes[i];
    const kind = inferRouteKind(rt);
    if (kind === "variable" && num(rt.changeMonths) <= 0)
      return `במסלול ${i + 1} יש להזין כל כמה חודשים הריבית משתנה.`;
    if (num(rt.anchor) + num(rt.margin) < 0) return `במסלול ${i + 1} הריבית הכוללת שלילית.`;
  }
  return "";
}

export function shortenFixedRoutesToMaximum(
  routes: Route[],
  maxPay: number,
  conditions: TuneConditions,
  params: MarketParams,
): ShortenInfo[] {
  if (conditions.shortenFixed === false) return [];

  const fixed = routes
    .map((route, index) => ({ route, index }))
    .filter((x) => inferRouteKind(x.route) === "fixed" && num(x.route.amount) > 0)
    .sort((a, b) => {
      const linkedDiff = Number(b.route.indexType === "מדד") - Number(a.route.indexType === "מדד");
      return conditions.linkedFixedFirst === false ? -linkedDiff : linkedDiff;
    });

  const shortened: ShortenInfo[] = [];
  for (const { route, index } of fixed) {
    const original = num(route.years);
    const candidates = allowedYears(route).filter((y) => y < original).sort((a, b) => a - b);
    let selected = original;
    for (const years of candidates) {
      route.years = years;
      if (calcMix(routes, params).firstPay <= maxPay + 0.01) {
        selected = years;
        break;
      }
    }
    route.years = selected;
    if (selected < original) {
      shortened.push({ index, fromYears: original, toYears: selected, linked: route.indexType === "מדד" });
    }
  }
  return shortened;
}

interface Best {
  years: number[];
  mix: MixResult;
  inRange: boolean;
  distance: number;
}

function distance(firstPay: number, inRange: boolean, target: number, lo: number, hi: number): number {
  if (inRange) return Math.abs(firstPay - target);
  return Math.min(Math.abs(firstPay - lo), Math.abs(firstPay - hi));
}

export function calculateMixToRange(
  routes: Route[],
  opts: { loan: number; minPay: number; maxPay: number; params: MarketParams; conditions?: TuneConditions },
): TuneResult {
  const conditions = opts.conditions ?? DEFAULT_CONDITIONS;
  // Deep copy — inputs are not mutated.
  const work: Route[] = routes.map((r) => ({ ...r, purposeSplit: r.purposeSplit ? { ...r.purposeSplit } : null }));

  const fail = (reason: string): TuneResult => ({
    ok: false, inRange: false, reason, routes: work, years: work.map((r) => num(r.years)), mix: null, shortened: [],
  });

  const error = validateMixTemplate(work);
  if (error) return fail(error);
  if (opts.loan <= 0) return fail("יש להזין סכום משכנתא בנתונים הכלכליים.");
  if (opts.minPay <= 0 || opts.maxPay <= 0 || opts.minPay > opts.maxPay)
    return fail("יש להזין טווח החזר חודשי תקין.");

  for (const rt of work) {
    applyRouteKind(rt, inferRouteKind(rt));
    rt.amount = (opts.loan * num(rt.sharePct)) / 100;
  }

  const target = (opts.minPay + opts.maxPay) / 2;
  let best: Best | null = null;
  for (let step = 0; step <= 240; step++) {
    const t = step / 240;
    for (const rt of work) rt.years = candidateYears(rt, t);
    const mix = calcMix(work, opts.params);
    const inRange = opts.minPay <= mix.firstPay && mix.firstPay <= opts.maxPay;
    const d = distance(mix.firstPay, inRange, target, opts.minPay, opts.maxPay);
    if (best === null || Number(inRange) > Number(best.inRange) || (inRange === best.inRange && d < best.distance)) {
      best = { years: work.map((r) => r.years), mix, inRange, distance: d };
    }
  }

  if (best === null) return fail("יש להזין טווח החזר חודשי תקין."); // unreachable: the sweep always sets best
  best.years.forEach((y, i) => { work[i].years = y; });

  for (let round = 0; round < 3; round++) {
    for (const rt of work) {
      let localBest: Best = best;
      for (const years of allowedYears(rt)) {
        rt.years = years;
        const mix = calcMix(work, opts.params);
        const inRange = opts.minPay <= mix.firstPay && mix.firstPay <= opts.maxPay;
        const d = distance(mix.firstPay, inRange, target, opts.minPay, opts.maxPay);
        if (Number(inRange) > Number(localBest.inRange) || (inRange === localBest.inRange && d < localBest.distance)) {
          localBest = { years: work.map((r) => r.years), mix, inRange, distance: d };
        }
      }
      best = localBest;
      best.years.forEach((y, j) => { work[j].years = y; });
    }
  }

  best.years.forEach((y, i) => { work[i].years = y; });

  const shortened = shortenFixedRoutesToMaximum(work, opts.maxPay, conditions, opts.params);
  const finalMix = calcMix(work, opts.params);
  const finalInRange = opts.minPay <= finalMix.firstPay && finalMix.firstPay <= opts.maxPay;
  return {
    ok: finalInRange,
    inRange: finalInRange,
    reason: "",
    routes: work,
    years: work.map((r) => num(r.years)),
    mix: finalMix,
    shortened,
  };
}
