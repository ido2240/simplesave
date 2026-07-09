// Parity gate: the engine must reproduce the frozen golden battery exactly.
// Loads golden.json (the validated reference outputs) and runs the identical
// cases through the engine, comparing every number.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { blankRoute, type Route } from "../types";
import { calcRoute } from "../route";
import { calcMix } from "../mix";
import { mixRisk } from "../risk";
import { calculateMixToRange } from "../tuning";
import type { MarketParams, MixResult, RouteResult } from "../types";

interface Golden {
  cases: AnyCase[];
  golden: Record<string, unknown>[];
}
interface AnyCase {
  type: "route" | "mix" | "risk" | "tune";
  params?: Record<string, number>;
  routes: Record<string, unknown>[];
  loan?: number;
  minPay?: number;
  maxPay?: number;
}

const data = JSON.parse(
  readFileSync(join(__dirname, "golden.json"), "utf-8"),
) as Golden;

const REL_TOL = 1e-9;
const ABS_TOL = 1e-6;

function paramsFromDict(d: Record<string, number> = {}): MarketParams {
  return { cpi: Number(d["מדד"] ?? 0), usd: Number(d["דולר"] ?? 0), eur: Number(d["אירו"] ?? 0) };
}

function routeFromDict(d: Record<string, unknown>): Route {
  const ps = d.purposeSplit as { housing?: number; allPurpose?: number } | undefined;
  return blankRoute({
    amount: Number(d.amount ?? 0),
    years: Number(d.years ?? 0),
    anchor: Number(d.anchor ?? 0),
    margin: Number(d.margin ?? 0),
    board: (d.board ?? "שפיצר") as Route["board"],
    balloon: (d.balloon ?? "") as Route["balloon"],
    balloonMonths: Number(d.balloonMonths ?? 0),
    indexType: (d.indexType ?? "ללא") as Route["indexType"],
    indexPct: d.indexPct === "" || d.indexPct == null ? 1 : Number(d.indexPct),
    dailyInterest: Boolean(d.dailyInterest ?? false),
    customAnnualIndex: (d.customAnnualIndex ?? null) as number | null,
    kind: (d.kind ?? null) as Route["kind"],
    rateType: (d.rateType ?? "קבועה") as Route["rateType"],
    anchorType: (d.anchorType ?? "") as Route["anchorType"],
    changeMonths: Number(d.changeMonths ?? 0),
    sharePct: Number(d.sharePct ?? 0),
    exitFee: Number(d.exitFee ?? 0),
    yearStep: Number(d.yearStep ?? 0),
    purposeSplit: ps ? { housing: Number(ps.housing ?? 0), allPurpose: Number(ps.allPurpose ?? 0) } : null,
    loanPurpose: String(d.loanPurpose ?? ""),
  });
}

const dense = (arr: number[], n: number) => Array.from({ length: n + 1 }, (_, i) => Number(arr[i] ?? 0));

function routeOut(c: RouteResult): Record<string, unknown> {
  return {
    S: c.S, T: c.T, n: c.n,
    annualRate: c.annualRate, enteredAnnualRate: c.enteredAnnualRate,
    effRate: c.effRate, annualIndex: c.annualIndex, invalidNegativeRate: c.invalidNegativeRate,
    L: dense(c.L, c.n), M: dense(c.M, c.n),
    prin: dense(c.prin, c.n), intr: dense(c.intr, c.n), cum: dense(c.cum, c.n),
    baseL: dense(c.baseL, c.n), basePrin: dense(c.basePrin, c.n), indexBal: dense(c.indexBal, c.n),
    idxPrin: dense(c.idxPrin, c.n), idxIntr: dense(c.idxIntr, c.n), idxEff: dense(c.idxEff, c.n),
  };
}

function mixOut(m: MixResult): Record<string, unknown> {
  return {
    E: m.E, exitFee: m.exitFee, totalAmount: m.totalAmount, principal: m.principal,
    avgYears: m.avgYears, avgRate: m.avgRate, firstPay: m.firstPay, total: m.total,
    interest: m.interest, indexation: m.indexation, maxN: m.maxN,
  };
}

function runCase(c: AnyCase): Record<string, unknown> {
  const params = paramsFromDict(c.params);
  const routes = c.routes.map(routeFromDict);
  if (c.type === "route") return { route: routeOut(calcRoute(routes[0], params)) };
  if (c.type === "mix") return { mix: mixOut(calcMix(routes, params)) };
  if (c.type === "risk") {
    const r = mixRisk(routes);
    return { risk: { score: r.score, level: r.level, label: r.label } };
  }
  // tune
  const t = calculateMixToRange(routes, {
    loan: c.loan!, minPay: c.minPay!, maxPay: c.maxPay!, params,
  });
  return { tune: { ok: t.ok, years: t.years, mix: mixOut(t.mix!) } };
}

let maxDiff = 0;
let compared = 0;

function assertClose(path: string, a: unknown, b: unknown): void {
  if (typeof a === "boolean" || typeof b === "boolean") {
    expect(Boolean(a), path).toBe(Boolean(b));
  } else if (typeof a === "number" && typeof b === "number") {
    compared++;
    const diff = Math.abs(a - b);
    maxDiff = Math.max(maxDiff, diff);
    const ok = diff <= ABS_TOL || diff <= REL_TOL * Math.max(Math.abs(a), Math.abs(b));
    if (!ok) expect.fail(`${path}: ${a} != ${b} (diff ${diff})`);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    expect(a.length, `${path}.length`).toBe(b.length);
    a.forEach((x, i) => assertClose(`${path}[${i}]`, x, b[i]));
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object).sort();
    const kb = Object.keys(b as object).sort();
    expect(ka, `${path} keys`).toEqual(kb);
    for (const k of ka) assertClose(`${path}.${k}`, (a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]);
  } else {
    expect(a, path).toBe(b);
  }
}

describe("engine parity (vs frozen golden battery)", () => {
  it("battery is substantial (140 cases across route/mix/risk/tune)", () => {
    expect(data.cases.length).toBe(140);
    expect(new Set(data.cases.map((c) => c.type))).toEqual(new Set(["route", "mix", "risk", "tune"]));
  });

  it("every case matches the golden output", () => {
    data.cases.forEach((c, i) => {
      assertClose(`case[${i}](${c.type})`, runCase(c), data.golden[i]);
    });
    // Surface the worst divergence for the build log.
    console.log(`parity: compared ${compared} numbers, max abs diff = ${maxDiff}`);
    expect(maxDiff).toBeLessThanOrEqual(ABS_TOL);
  });
});
