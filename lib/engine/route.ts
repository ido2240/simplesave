// Single-route amortization schedule — port of src/simplesave/engine/route.py.
// Spitzer / equal-principal boards, monthly index linkage (annual/12), balloon &
// grace, housing/any-purpose split. Pure function.

import { displayedAnnualIndex, monthlyRate, num, pmt, routeAnnualIndex } from "./core";
import type { MarketParams, Route, RouteResult } from "./types";

const ARRAY_FIELDS = [
  "L", "baseL", "basePrin", "indexBal", "M", "prin", "intr", "idxEff", "idxPrin", "idxIntr", "cum",
] as const;

interface PurposePart {
  purpose: string;
  share: number;
}

function routePurposeParts(route: Route): PurposePart[] {
  const split = route.purposeSplit;
  if (!split) return [];
  const housing = Math.max(0, num(split.housing));
  const allPurpose = Math.max(0, num(split.allPurpose));
  const total = housing + allPurpose;
  if (total <= 0) return [];
  const parts: PurposePart[] = [];
  if (housing > 0) parts.push({ purpose: "housing", share: housing / total });
  if (allPurpose > 0) parts.push({ purpose: "allPurpose", share: allPurpose / total });
  return parts;
}

function emptyResult(n: number, partial: Partial<RouteResult>): RouteResult {
  const zeros = () => new Array(n + 1).fill(0);
  return {
    S: 0, T: 0, n,
    annualRate: 0, enteredAnnualRate: 0, invalidNegativeRate: false, effRate: 0, annualIndex: 0,
    L: zeros(), baseL: zeros(), basePrin: zeros(), indexBal: zeros(), M: zeros(),
    prin: zeros(), intr: zeros(), idxEff: zeros(), idxPrin: zeros(), idxIntr: zeros(), cum: zeros(),
    ...partial,
  };
}

function mergeSplitRouteCalcs(parts: { amount: number; calc: RouteResult }[]): RouteResult {
  const maxN = parts.reduce((m, p) => Math.max(m, p.calc.n || 0), 0);
  const amount = parts.reduce((s, p) => s + num(p.amount), 0);
  const out = emptyResult(maxN, {});
  for (const { amount: partAmount, calc } of parts) {
    const weight = amount > 0 ? num(partAmount) / amount : 0;
    out.S += num(calc.S);
    out.T += num(calc.T);
    out.annualRate += num(calc.annualRate) * weight;
    out.enteredAnnualRate += num(calc.enteredAnnualRate) * weight;
    out.effRate += num(calc.effRate) * weight;
    out.annualIndex += num(calc.annualIndex) * weight;
    out.invalidNegativeRate = out.invalidNegativeRate || Boolean(calc.invalidNegativeRate);
    for (const f of ARRAY_FIELDS) {
      const dst = out[f];
      const src = calc[f];
      for (let i = 0; i <= maxN; i++) dst[i] = num(dst[i]) + num(src[i] ?? 0);
    }
  }
  return out;
}

export function calcRoute(
  route: Route,
  params: MarketParams,
  bypassSplit = false,
): RouteResult {
  const E = num(route.amount);
  const dy = num(route.years);

  const purposeParts = routePurposeParts(route);
  if (E > 0 && purposeParts.length > 1 && !bypassSplit) {
    const merged = purposeParts.map((part) => {
      const sub: Route = { ...route, purposeSplit: null, loanPurpose: part.purpose, amount: E * part.share };
      return { amount: E * part.share, calc: calcRoute(sub, params, true) };
    });
    return mergeSplitRouteCalcs(merged);
  }

  const n = Math.trunc(dy * 12);
  const enteredAnnualRate = num(route.anchor) + num(route.margin);
  const annualRate = Math.max(0, enteredAnnualRate);
  const r = monthlyRate(route, annualRate);

  const out = emptyResult(n, {
    annualRate,
    enteredAnnualRate,
    invalidNegativeRate: enteredAnnualRate < 0,
    effRate: Math.pow(1 + r, 12) - 1,
    annualIndex: displayedAnnualIndex(route, params),
  });
  if (n <= 0 || E <= 0) return out;

  const board = route.board || "שפיצר";
  const g = route.balloon || "";
  const h = num(route.balloonMonths);
  const isBalloon = g === "בלון מלא" || g === "בלון חלקי";
  const isGrace = g === "גרייס מלא" || g === "גרייס חלקי";

  // 1-indexed working arrays (index 0 is a zero placeholder).
  const L = new Array(n + 1).fill(0);
  const B = new Array(n + 1).fill(0);
  const N = new Array(n + 1).fill(0);
  const O = new Array(n + 1).fill(0);
  const P = new Array(n + 1).fill(0);
  const R = new Array(n + 1).fill(0);
  const M = new Array(n + 1).fill(0);

  let cumM = 0;
  let cumO = 0;
  let sumR = 0;
  let tTotal = 0;
  const idxStop = isBalloon ? h : n;

  for (let m = 1; m <= n; m++) {
    const idx = (routeAnnualIndex(route, params) / 12) * num(route.indexPct);

    if (m === 1) {
      L[m] = dy * 12 > 1 ? E : 0;
      B[m] = L[m];
    } else {
      if (dy * 12 >= m) {
        if (isBalloon) {
          L[m] = h === m || h + 1 > m ? P[m - 1] : 0;
        } else if (g === "גרייס מלא") {
          L[m] = h + 1 === m ? P[m - 1] + sumR : P[m - 1];
        } else {
          L[m] = P[m - 1];
        }
      } else {
        L[m] = 0;
      }
      B[m] = Math.max(0, B[m - 1] - num(out.basePrin[m - 1]));
    }

    O[m] = L[m] * r;
    if (L[m] > 0) {
      if (isBalloon) N[m] = 0;
      else if (isGrace && h >= m) N[m] = 0;
      else if (board === "שפיצר") N[m] = -pmt(r, n - m + 1, L[m]) - O[m];
      else N[m] = L[m] / (n - m + 1);
    } else {
      N[m] = 0;
    }

    P[m] = (L[m] - N[m]) * (idx + 1);
    R[m] = O[m] + N[m];
    sumR += R[m];

    const gracePay = board === "שפיצר" ? -pmt(r, n - m + 1, L[m]) : R[m];
    if (g === "בלון מלא") M[m] = h === m ? P[m] : 0;
    else if (g === "בלון חלקי") M[m] = h > m ? O[m] : h === m ? P[m] + O[m] : 0;
    else if (g === "גרייס מלא") M[m] = h >= m ? 0 : gracePay;
    else if (g === "גרייס חלקי") M[m] = h >= m ? O[m] : gracePay;
    else M[m] = R[m];

    cumM += M[m];
    cumO += O[m];
    let q: number;
    if (g === "בלון חלקי") q = h === m ? cumM : 0;
    else if (g === "בלון מלא") q = h === m ? cumM + cumO : 0;
    else q = cumM;
    if (m === idxStop) tTotal = q;

    const idxPrin = (L[m] - N[m]) * idx;
    const idxIntr = O[m] * idx;
    out.basePrin[m] = L[m] > 0 ? N[m] * (B[m] / L[m]) : 0;
    out.baseL[m] = B[m];
    out.indexBal[m] = Math.max(0, L[m] - B[m]);
    out.prin[m] = N[m];
    out.intr[m] = O[m];
    out.idxPrin[m] = idxPrin;
    out.idxIntr[m] = idxIntr;
    out.idxEff[m] = idxPrin + idxIntr;
    out.cum[m] = cumM;
  }

  out.S = M[1] || 0;
  out.T = tTotal;
  out.L = L;
  out.M = M;
  return out;
}
