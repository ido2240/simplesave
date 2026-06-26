// Seed Supabase: demo auth users (with passwords), economic params + anchors,
// 5 clock templates, and one demo request graph.
//
//   npx tsx --env-file=.env.local supabase/seed.ts   (or: npm run seed)
//
// Uses the SERVICE ROLE key — seeding creates auth users and bypasses RLS.
import { createClient } from "@supabase/supabase-js";
import { CLOCK_KEYS, CLOCK_ROUTE_SPECS, CLOCK_STRATEGY_NAMES } from "../lib/engine";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (seeding needs the service role; use --env-file=.env.local)");
}
const db = createClient(url, key, { auth: { persistSession: false } });

const DUPLICATE_OF: Record<string, string | null> = {
  clock1: null, clock2: null, clock3: null, clock4: "clock1", clock5: "clock3",
};

// Demo accounts. Real Supabase Auth identities — the on_auth_user_created trigger
// provisions the matching profiles row (with role) from user_metadata.
const DEMO_USERS = [
  { email: "admin@simplesave.co.il", password: "Admin1234!", full_name: "מנהל מערכת", role: "admin" },
  { email: "dan@simplesave.co.il", password: "Advisor1234!", full_name: "דן יועץ", role: "advisor" },
  { email: "yossi@simplesave.co.il", password: "Client1234!", full_name: "יוסי לקוח", role: "client" },
  { email: "maya@simplesave.co.il", password: "Client1234!", full_name: "מאיה לקוחה", role: "client" },
];

async function ensureUser(u: typeof DEMO_USERS[number]) {
  const { error } = await db.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });
  if (error && !/already|exists|registered/i.test(error.message)) throw error;
}

async function main() {
  // Demo auth users (idempotent) → profiles via trigger.
  for (const u of DEMO_USERS) await ensureUser(u);

  // economic params — reference index expectations: CPI 0.03 / USD 0.03 / EUR 0.015,
  // anchors prime .0456 / fixed .0462 / variable .047.
  await db.from("economic_params").upsert({
    id: "singleton", cpi: 0.03, usd: 0.03, eur: 0.015,
    prime_rate: 0.0456, fixed_anchor: 0.0462, variable_anchor: 0.047,
  });

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

  const { data: profiles } = await db.from("profiles").select("id, email");
  const byEmail = Object.fromEntries((profiles ?? []).map((p) => [p.email, p.id]));
  const yossi = byEmail["yossi@simplesave.co.il"];
  const dan = byEmail["dan@simplesave.co.il"];

  // one demo request for Yossi, advised by Dan (reset to a single clean copy)
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

  console.log("✓ Seed complete: 4 auth users, params + anchors, 5 clocks, 1 demo request");
}

main().catch((e) => { console.error(e); process.exit(1); });
