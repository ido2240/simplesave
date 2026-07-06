// Chart/table series derived from the engine's REAL per-month schedules —
// never the mockup's flat annuity. Semantics (lib/engine/route.ts):
//   M[m]   actual cash payment in month m
//   L[m]   opening (linked) balance of month m
//   prin/intr/idxEff[m]  principal / interest / indexation split
// All arrays are 1-indexed. Pure functions over MixResult; engine untouched.
import type { MixResult } from "@/lib/engine";

export interface AnnualRow {
  year: number;
  open: number;      // opening balance at year start (sum of routes)
  principal: number; // principal repaid during the year
  interest: number;  // interest + indexation during the year
  close: number;     // balance at year end
}

/** Annual amortization table: open/principal/interest/close per year. */
export function annualRows(mix: MixResult): AnnualRow[] {
  const years = Math.ceil(mix.maxN / 12);
  const balanceAt = (mo: number) =>
    mix.per.reduce((s, r) => s + (mo <= r.n ? (r.L[mo] ?? 0) : 0), 0);
  const rows: AnnualRow[] = [];
  for (let y = 1; y <= years; y++) {
    let principal = 0;
    let interest = 0;
    for (let mo = (y - 1) * 12 + 1; mo <= y * 12 && mo <= mix.maxN; mo++) {
      for (const r of mix.per) {
        principal += r.prin[mo] ?? 0;
        interest += (r.intr[mo] ?? 0) + (r.idxEff[mo] ?? 0);
      }
    }
    rows.push({
      year: y,
      open: balanceAt((y - 1) * 12 + 1),
      principal,
      interest,
      close: y * 12 >= mix.maxN ? 0 : balanceAt(y * 12 + 1),
    });
  }
  return rows;
}

export interface CumulativePoint {
  year: number;
  paid: number;        // cumulative cash paid
  cumInterest: number; // cumulative interest + indexation
}

/** Cumulative paid vs cumulative interest+indexation, sampled per year. */
export function cumulativeSeries(mix: MixResult): CumulativePoint[] {
  const years = Math.ceil(mix.maxN / 12);
  const pts: CumulativePoint[] = [{ year: 0, paid: 0, cumInterest: 0 }];
  let paid = 0;
  let cumInterest = 0;
  for (let y = 1; y <= years; y++) {
    for (let mo = (y - 1) * 12 + 1; mo <= y * 12 && mo <= mix.maxN; mo++) {
      for (const r of mix.per) {
        paid += r.M[mo] ?? 0;
        cumInterest += (r.intr[mo] ?? 0) + (r.idxEff[mo] ?? 0);
      }
    }
    pts.push({ year: y, paid, cumInterest });
  }
  return pts;
}

export interface MonthlyPoint {
  year: number;
  monthly: number; // average monthly cash payment during that year
}

/** Average monthly payment per year — shows the real step-downs as shorter
 *  routes finish (what the mockup's bar chart illustrates). */
export function monthlySeries(mix: MixResult): MonthlyPoint[] {
  const years = Math.ceil(mix.maxN / 12);
  const pts: MonthlyPoint[] = [];
  for (let y = 1; y <= years; y++) {
    let sum = 0;
    let months = 0;
    for (let mo = (y - 1) * 12 + 1; mo <= y * 12 && mo <= mix.maxN; mo++) {
      sum += mix.per.reduce((s, r) => s + (r.M[mo] ?? 0), 0);
      months++;
    }
    pts.push({ year: y, monthly: months ? sum / months : 0 });
  }
  return pts;
}
