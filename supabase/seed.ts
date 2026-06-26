// Seed Supabase: economic params, 5 clock templates, demo users + one request.
// Run: npx tsx --env-file=.env.local supabase/seed.ts
import { createClient } from "@supabase/supabase-js";
import {
  CLOCK_KEYS,
  CLOCK_ROUTE_SPECS,
  CLOCK_STRATEGY_NAMES,
} from "../lib/engine";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_ANON_KEY!;
if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_ANON_KEY (use --env-file=.env.local)");
const db = createClient(url, key, { auth: { persistSession: false } });

const DUPLICATE_OF: Record<string, string | null> = {
  clock1: null, clock2: null, clock3: null, clock4: "clock1", clock5: "clock3",
};

async function main() {
  // economic params
  // Defaults verbatim from the reference simulator: index expectations
  // {'מדד':0.03,'דולר':0.03,'אירו':0.015} and prime anchor .0456.
  await db.from("economic_params").upsert({ id: "singleton", cpi: 0.03, usd: 0.03, eur: 0.015, prime_rate: 0.0456, fixed_anchor: 0.0462, variable_anchor: 0.047 });

  // clock templates (reference verbatim; duplicates flagged)
  for (let i = 0; i < CLOCK_KEYS.length; i++) {
    const id = CLOCK_KEYS[i];
    await db.from("clock_templates").upsert({
      id,
      name: CLOCK_STRATEGY_NAMES[id],
      routes: CLOCK_ROUTE_SPECS[id],
      duplicate_of: DUPLICATE_OF[id],
      display_order: i,
      recommended: id === "clock2",
    });
  }

  // demo users
  const users = [
    { email: "admin@simplesave.co.il", full_name: "מנהל מערכת", role: "admin" },
    { email: "dan@simplesave.co.il", full_name: "דן יועץ", role: "advisor" },
    { email: "yossi@simplesave.co.il", full_name: "יוסי לקוח", role: "client" },
    { email: "maya@simplesave.co.il", full_name: "מאיה לקוחה", role: "client" },
  ];
  await db.from("profiles").upsert(users, { onConflict: "email" });
  const { data: profiles } = await db.from("profiles").select("id, email");
  const byEmail = Object.fromEntries((profiles ?? []).map((p) => [p.email, p.id]));

  // a demo request for Yossi, advised by Dan
  const yossi = byEmail["yossi@simplesave.co.il"];
  const dan = byEmail["dan@simplesave.co.il"];
  await db.from("requests").delete().eq("client_id", yossi);
  const { data: req } = await db
    .from("requests")
    .insert({ client_id: yossi, advisor_id: dan, service: "new_mortgage", status: "clocks" })
    .select("id")
    .single();
  const rid = req!.id;
  await db.from("request_details").insert({
    request_id: rid, property_value: 2_000_000, equity: 500_000, loan_amount: 1_500_000,
    loan_type: "single_property", property_source: "second_hand", term_years: 25, min_pay: 7000, max_pay: 10_000,
  });
  await db.from("borrowers").insert({ request_id: rid, full_name: "יוסי לקוח", birth_date: "1985-05-05", net_income: 14_000, is_property_owner: true });
  await db.from("authorizations").insert([
    { request_id: rid, bank: "בנק הפועלים" },
    { request_id: rid, bank: "בנק לאומי" },
    { request_id: rid, bank: "מזרחי טפחות" },
  ]);
  await db.from("documents").insert([
    { request_id: rid, kind: "תעודת זהות" },
    { request_id: rid, kind: "תלושי שכר (3 אחרונים)" },
    { request_id: rid, kind: "דפי חשבון בנק" },
  ]);

  console.log("✓ Seed complete: params, 5 clocks, 4 users, 1 demo request");
}

main().catch((e) => { console.error(e); process.exit(1); });
