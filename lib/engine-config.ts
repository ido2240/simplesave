// Bridges the database (manager-editable config) to the pure engine.
import "server-only";
import { supabase } from "./supabase";
import { generateClock, type ClockResult, type MarketParams, type RouteSpec } from "./engine";

export interface ClockTemplateRow {
  id: string;
  name: string;
  routes: RouteSpec[];
  duplicate_of: string | null;
  display_order: number;
  recommended: boolean;
}

export async function loadMarketParams(): Promise<MarketParams> {
  const { data } = await supabase()
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
  const { data } = await supabase()
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
  const { data } = await supabase()
    .from("clock_templates")
    .select("id, name, routes, duplicate_of, display_order, recommended")
    .order("display_order", { ascending: true });
  return (data ?? []) as ClockTemplateRow[];
}

/** Compute all clocks for a payment range, using the DB-stored templates + params. */
export async function computeClocks(
  loan: number,
  minPay: number,
  maxPay: number,
): Promise<(ClockResult & { recommended: boolean })[]> {
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
    return { ...clock, recommended: row.recommended };
  });
}

/** Compute a single clock by id. */
export async function computeOneClock(
  id: string,
  loan: number,
  minPay: number,
  maxPay: number,
): Promise<ClockResult | null> {
  const [params, rates, rows] = await Promise.all([loadMarketParams(), loadRateAnchors(), loadClockTemplates()]);
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const templates: Record<string, RouteSpec[]> = {};
  for (const r of rows) templates[r.id] = applyAnchors(r.routes, rates);
  return generateClock(id, { loan, minPay, maxPay, params, templates, nameHe: row.name, duplicateFlag: row.duplicate_of });
}
