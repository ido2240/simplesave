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
  return { cpi: data?.cpi ?? 0.02, usd: data?.usd ?? 0.03, eur: data?.eur ?? 0.015 };
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
  const [params, rows] = await Promise.all([loadMarketParams(), loadClockTemplates()]);
  const templates: Record<string, RouteSpec[]> = {};
  for (const r of rows) templates[r.id] = r.routes;

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
  const [params, rows] = await Promise.all([loadMarketParams(), loadClockTemplates()]);
  const row = rows.find((r) => r.id === id);
  if (!row) return null;
  const templates: Record<string, RouteSpec[]> = {};
  for (const r of rows) templates[r.id] = r.routes;
  return generateClock(id, { loan, minPay, maxPay, params, templates, nameHe: row.name, duplicateFlag: row.duplicate_of });
}
