// Seed Supabase: demo auth users (with passwords), economic params + anchors,
// 5 clock templates, and one demo request graph.
//
//   npx tsx --env-file=.env.local supabase/seed.ts   (or: npm run seed)
//
// Uses the SERVICE ROLE key — seeding creates auth users and bypasses RLS.
import { createClient } from "@supabase/supabase-js";
import type { RouteSpec } from "../lib/engine";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) {
  throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (seeding needs the service role; use --env-file=.env.local)");
}
const db = createClient(url, key, { auth: { persistSession: false } });

// The definitive mockup's five templates (D-2 rev. 2026-07-06): a solid →
// aggressive axis of fixed/variable/prime shares, each with a marketing
// subtitle and a display risk score (D-6). Route composition per the mockup's
// detail screen: קבועה צמודה / משתנה כל 5 שנים (לא צמודה) / פריים. Anchors are
// placeholders — engine-config applies the live manager-edited anchors by kind.
const fixed = (share: number): RouteSpec => ({
  kind: "fixed", sharePct: share, indexType: "מדד", yearStep: 5, anchor: 0.0462,
});
const variable5 = (share: number): RouteSpec => ({
  kind: "variable", sharePct: share, indexType: "ללא",
  changeMonths: 60, yearStep: 5, anchorType: 'אג"ח', anchor: 0.047, margin: 0,
});
const prime = (share: number): RouteSpec => ({
  kind: "prime", sharePct: share, indexType: "ללא", changeMonths: 1, yearStep: 10,
  anchorType: "פריים", anchor: 0.0456, margin: 0,
});

const CLOCK_TEMPLATES: {
  id: string; name: string; subtitle: string; displayRisk: number;
  recommended: boolean; routes: RouteSpec[];
}[] = [
  { id: "clock1", name: "תמהיל סולידי", subtitle: "יציבות מקסימלית, רוב קבועה", displayRisk: 24,
    recommended: false, routes: [fixed(70), variable5(20), prime(10)] },
  { id: "clock2", name: "תמהיל מאוזן", subtitle: "איזון בין יציבות לחיסכון", displayRisk: 40,
    recommended: false, routes: [fixed(55), variable5(25), prime(20)] },
  { id: "clock3", name: "תמהיל מומלץ", subtitle: "התאמה אופטימלית לפרופיל", displayRisk: 55,
    recommended: true, routes: [fixed(45), variable5(25), prime(30)] },
  { id: "clock4", name: "תמהיל גמיש", subtitle: "חיסכון גבוה, חשיפה מתונה", displayRisk: 70,
    recommended: false, routes: [fixed(33), variable5(27), prime(40)] },
  { id: "clock5", name: "תמהיל אגרסיבי", subtitle: "ההחזר הנמוך ביותר בהתחלה", displayRisk: 84,
    recommended: false, routes: [fixed(20), variable5(30), prime(50)] },
];

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

function must<T extends { error: { message: string } | null }>(label: string) {
  return (res: T): T => {
    if (res.error) throw new Error(`seed: ${label} failed — ${res.error.message}`);
    return res;
  };
}

async function main() {
  // Demo auth users (idempotent) → profiles via trigger.
  for (const u of DEMO_USERS) await ensureUser(u);

  // economic params — reference index expectations: CPI 0.03 / USD 0.03 / EUR 0.015,
  // anchors prime .0456 / fixed .0462 / variable .047.
  await db.from("economic_params").upsert({
    id: "singleton", cpi: 0.03, usd: 0.03, eur: 0.015,
    prime_rate: 0.0456, fixed_anchor: 0.0462, variable_anchor: 0.047,
  }).then(must("economic_params"));

  // clock templates — the mockup's five mixes (D-2 rev.; no duplicates)
  for (let i = 0; i < CLOCK_TEMPLATES.length; i++) {
    const t = CLOCK_TEMPLATES[i];
    await db.from("clock_templates").upsert({
      id: t.id,
      name: t.name,
      routes: t.routes,
      duplicate_of: null,
      display_order: i,
      recommended: t.recommended,
      subtitle: t.subtitle,
      display_risk: t.displayRisk,
    }).then(must(`clock_template ${t.id}`));
  }

  const { data: profiles } = await db.from("profiles").select("id, email");
  const byEmail = Object.fromEntries((profiles ?? []).map((p) => [p.email, p.id]));
  const yossi = byEmail["yossi@simplesave.co.il"];
  const dan = byEmail["dan@simplesave.co.il"];

  // one demo request for Yossi, advised by Dan (reset to a single clean copy)
  await db.from("requests").delete().eq("client_id", yossi).then(must("requests delete"));
  const { data: req } = await db
    .from("requests")
    .insert({ client_id: yossi, advisor_id: dan, service: "new_mortgage", status: "clocks" })
    .select("id")
    .single()
    .then(must("request insert"));
  const rid = req!.id;
  await db.from("request_details").insert({
    request_id: rid, property_value: 2_000_000, equity: 500_000, loan_amount: 1_500_000,
    loan_type: "single_property", property_source: "second_hand", term_years: 25, min_pay: 7000, max_pay: 10_000,
  }).then(must("request_details"));
  // 30,000 ₪ net keeps the demo scenario valid under the 40% DTI rule
  // (capacity 12,000 ₪ ≥ the request's 10,000 ₪ max pay).
  await db.from("borrowers").insert({ request_id: rid, full_name: "יוסי לקוח", birth_date: "1985-05-05", net_income: 30_000, is_property_owner: true }).then(must("borrowers"));
  await db.from("authorizations").insert([
    { request_id: rid, bank: "בנק הפועלים" },
    { request_id: rid, bank: "בנק לאומי" },
    { request_id: rid, bank: "מזרחי טפחות" },
  ]).then(must("authorizations"));
  // Mockup document checklist (the 6th item — כתבי הסמכה — derives live from
  // the authorizations table, so 5 uploadable rows; שמאי is optional).
  await db.from("documents").insert([
    { request_id: rid, kind: "תדפיס עו״ש 3 חודשים", required: true },
    { request_id: rid, kind: "תלושי שכר 3 חודשים", required: true },
    { request_id: rid, kind: "צילום ת״ז + ספח", required: true },
    { request_id: rid, kind: "חוזה רכישה", required: true },
    { request_id: rid, kind: "הערכת שמאי", required: false },
  ]).then(must("documents"));

  // bank tender demo (mockup: 3 approved, best = מזרחי, 1 pending)
  await db.from("bank_offers").delete().eq("request_id", rid).then(must("bank_offers delete"));
  await db.from("bank_offers").insert([
    { request_id: rid, bank: "בנק מזרחי-טפחות", note: "אישור עקרוני התקבל · התנאים הטובים ביותר", rate_pct: 4.21, approved: true, is_best: true },
    { request_id: rid, bank: "בנק הפועלים", note: "אישור עקרוני התקבל", rate_pct: 4.38, approved: true, is_best: false },
    { request_id: rid, bank: "בנק לאומי", note: "אישור עקרוני התקבל", rate_pct: 4.44, approved: true, is_best: false },
    { request_id: rid, bank: "בנק דיסקונט", note: "ממתין לתשובת הבנק", rate_pct: null, approved: false, is_best: false },
  ]).then(must("bank_offers"));

  // Maya: executed mortgage → the active-management screen demo
  const maya = byEmail["maya@simplesave.co.il"];
  await db.from("requests").delete().eq("client_id", maya).then(must("maya requests delete"));
  const { data: mreq } = await db
    .from("requests")
    .insert({ client_id: maya, advisor_id: dan, service: "new_mortgage", status: "active", service_status: "PAID", chosen_clock_id: "clock3" })
    .select("id").single().then(must("maya request insert"));
  const mrid = mreq!.id;
  await db.from("request_details").insert({
    request_id: mrid, property_value: 1_600_000, equity: 400_000, loan_amount: 1_200_000,
    loan_type: "single_property", property_source: "second_hand", term_years: 25, min_pay: 5500, max_pay: 7000,
  }).then(must("maya details"));
  await db.from("borrowers").insert({ request_id: mrid, full_name: "מאיה לקוחה", birth_date: "1988-03-12", net_income: 26_000, is_property_owner: true }).then(must("maya borrower"));
  await db.from("active_mortgages").upsert({
    request_id: mrid, payments_made: 24, payments_total: 228, started_at: "2024-07-01",
  }).then(must("active_mortgages"));
  await db.from("active_tracks").delete().eq("request_id", mrid).then(must("active_tracks delete"));
  await db.from("active_tracks").insert([
    { request_id: mrid, label: "קבועה לא צמודה", share_pct: 45, balance: 540_200, rate_label: "4.30%", monthly: 2780, years: 25 },
    { request_id: mrid, label: "משתנה כל 5 שנים", share_pct: 30, balance: 361_400, rate_label: "3.90%", monthly: 1910, years: 20 },
    { request_id: mrid, label: "פריים", share_pct: 25, balance: 298_800, rate_label: "P-0.7%", monthly: 1490, years: 15 },
  ]).then(must("active_tracks"));

  // advisor tasks demo (mockup tasks tab)
  await db.from("advisor_tasks").delete().eq("advisor_id", dan).then(must("advisor_tasks delete"));
  await db.from("advisor_tasks").insert([
    { advisor_id: dan, txt: "לבדוק תלושי שכר — יוסי לקוח", due: "היום", urgent: true, done: false },
    { advisor_id: dan, txt: "להחזיר שיחה למאיה לקוחה", due: "היום", urgent: true, done: false },
    { advisor_id: dan, txt: "להעלות אישור עקרוני — יוסי לקוח", due: "מחר", urgent: false, done: false },
    { advisor_id: dan, txt: "לסגור תיק — מאיה לקוחה", due: "27/07", urgent: false, done: true },
  ]).then(must("advisor_tasks"));

  console.log("✓ Seed complete: 4 auth users, params + anchors, 5 clocks, 2 demo requests (yossi mid-flow, maya active), tender + tasks");
}

main().catch((e) => { console.error(e); process.exit(1); });
