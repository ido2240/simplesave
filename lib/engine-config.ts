// Bridges the database (manager-editable config) to the pure engine.
import "server-only";
import { supabaseServer } from "./supabase-server";
import { generateClock, type ClockResult, type MarketParams, type RouteSpec } from "./engine";
import { engineRiskTo100 } from "./display-risk";

export interface ClockTemplateRow {
  id: string;
  name: string;
  routes: RouteSpec[];
  duplicate_of: string | null;
  display_order: number;
  recommended: boolean;
  subtitle: string | null;
  display_risk: number | null;
}

/** ClockResult enriched with the template's display metadata (D-2/D-6). */
export type ClockWithMeta = ClockResult & {
  recommended: boolean;
  subtitle: string | null;
  /** 0-100 display score: template's display_risk, or engine fallback. */
  displayRisk: number;
};

export async function loadMarketParams(): Promise<MarketParams> {
  const { data } = await (await supabaseServer())
    .from("economic_params")
    .select("cpi, usd, eur")
    .eq("id", "singleton")
    .maybeSingle();
  return { cpi: data?.cpi ?? 0.03, usd: data?.usd ?? 0.03, eur: data?.eur ?? 0.015 };
}

export interface RateAnchors {
  prime: number;
  fixed: number;
  variable: number;
}

/** Live, manager-editable base rate per route kind. */
export async function loadRateAnchors(): Promise<RateAnchors> {
  const { data } = await (await supabaseServer())
    .from("economic_params")
    .select("prime_rate, fixed_anchor, variable_anchor")
    .eq("id", "singleton")
    .maybeSingle();
  return {
    prime: data?.prime_rate ?? 0.0456,
    fixed: data?.fixed_anchor ?? 0.0462,
    variable: data?.variable_anchor ?? 0.047,
  };
}

/** Apply the live anchors onto template routes by kind, so editing a rate in
 *  the admin moves the computed clocks. */
function applyAnchors(routes: RouteSpec[], rates: RateAnchors): RouteSpec[] {
  return routes.map((r) => ({
    ...r,
    anchor: r.kind === "prime" ? rates.prime : r.kind === "fixed" ? rates.fixed : rates.variable,
  }));
}

export async function loadClockTemplates(): Promise<ClockTemplateRow[]> {
  const { data } = await (await supabaseServer())
    .from("clock_templates")
    .select("id, name, routes, duplicate_of, display_order, recommended, subtitle, display_risk")
    .order("display_order", { ascending: true });
  return (data ?? []) as ClockTemplateRow[];
}

function withMeta(clock: ClockResult, row: ClockTemplateRow): ClockWithMeta {
  return {
    ...clock,
    // Override the engine's built-in fallback flags: the DB row is the truth
    // (null duplicate_of must not resurrect the legacy clock4/clock5 notes).
    duplicateFlag: row.duplicate_of,
    recommended: row.recommended,
    subtitle: row.subtitle,
    displayRisk: row.display_risk ?? engineRiskTo100(clock.risk),
  };
}

/** Compute all clocks for a payment range, using the DB-stored templates + params. */
export async function computeClocks(
  loan: number,
  minPay: number,
  maxPay: number,
): Promise<ClockWithMeta[]> {
  const [params, rates, rows] = await Promise.all([loadMarketParams(), loadRateAnchors(), loadClockTemplates()]);
  const templates: Record<string, RouteSpec[]> = {};
  for (const r of rows) templates[r.id] = applyAnchors(r.routes, rates);

  return rows.map((row) => {
    const clock = generateClock(row.id, {
      loan,
      minPay,
      maxPay,
      params,
      templates,
      nameHe: row.name,
      duplicateFlag: row.duplicate_of,
    });
    return withMeta(clock, row);
  });
}

/** Compute a single clock by id. */
export async function computeOneClock(
  id: string,
  loan: number,
  minPay: number,
  maxPay: number,
): Promise<ClockWithMeta | null> {
  const [params, rates, rows] = await Promise.all([loadMarketParams(), loadRateAnchors(), loadClockTemplates()]);
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const templates: Record<string, RouteSpec[]> = {};
  for (const r of rows) templates[r.id] = applyAnchors(r.routes, rates);
  const clock = generateClock(id, { loan, minPay, maxPay, params, templates, nameHe: row.name, duplicateFlag: row.duplicate_of });
  return withMeta(clock, row);
}
