# SimpleSave — Section 2: The Code

> Section 1 explained *what the machine is*. This one explains *how the code is
> built and where everything lives*. It is **not** a line‑by‑line reading. The
> goal is that you can open any part of the repo and know what it's for, where the
> math is, where the database is, and how a request travels from a form to a
> result. Every explanation quotes the **actual code block** it's talking about, so
> you never have to hunt for a line number.
>
> Throughout, look for **“Say it like this”** — those are plain sentences you can
> use when you explain the project to someone else.

---

## 1. The one rule that explains the whole architecture

There is a single design principle, and once you see it, the whole repo makes sense:

> **The engine is pure and frozen. Everything else is thin.**

"Pure" means the calculation engine (`lib/engine/`) is just math functions — no
database, no network, no React, no clock, no randomness. Give it the same inputs
and it always returns the same numbers. "Thin" means every other layer (API,
pages, forms, actions) does as little as possible: it gathers inputs, calls the
engine, and formats the output.

**Why this matters:** because the engine is pure, it can be locked to a validated
reference by the parity gate (Section 1, §8). If any layer were allowed to do its
own math, that guarantee would break. So the code is organized as **rings around a
protected core**:

```
        ┌─────────────────────────── UI pages (app/**/page.tsx) ──────────────────────────┐
        │   ┌───────────────── Server Actions (app/**/actions.ts) ─────────────────┐       │
        │   │   ┌──────────── API routes (app/api/**) + zod schemas ──────────┐    │       │
        │   │   │   ┌──────── Config bridge (lib/engine-config.ts) ──────┐     │    │       │
        │   │   │   │   ┌──────────  THE PURE ENGINE  (lib/engine)  ──┐  │     │    │       │
        │   │   │   │   │   core → route → mix → risk → tuning → clocks │  │     │    │       │
        │   │   │   │   │              + rules (validation)            │  │     │    │       │
        │   │   │   │   └────────────────────────────────────────────┘  │     │    │       │
        │   │   │   └────── Supabase (DB + Auth + Storage + RLS) ────────┘     │    │       │
        │   │   └──────────────────────────────────────────────────────────────┘    │       │
        │   └────────────────────────────────────────────────────────────────────────┘       │
        └───────────────────────────────────────────────────────────────────────────────────┘
```

**Say it like this:** *"All the money math lives in one pure library. Nothing else
is allowed to compute a payment — every other file just feeds that library and
displays what comes back. That's why we can prove the numbers are correct."*

---

## 2. Where everything lives (the map)

```
lib/
  engine/            ← THE MATH. Pure functions. The protected core.
    core.ts            payment formula (pmt), rounding, rates, indexation
    route.ts           one track's month-by-month amortization schedule
    mix.ts             add several tracks into one mix
    risk.ts            weighted risk score of a mix
    tuning.ts          the "tuner" — fit a template into a payment range
    clocks.ts          the 5 named templates + "generate all 5"
    rules.ts           regulatory gate: LTV / equity / DTI / age
    types.ts           the data shapes (Route, MixResult, …)
    index.ts           the public door — what the rest of the app may import
    __tests__/         golden.json + parity.test.ts (the safety net)

  engine-config.ts   ← BRIDGE: reads DB config, runs the engine, returns clocks
  display-risk.ts    ← the 0–100 gauge score → label/color
  clock-card-data.ts ← shrink a heavy clock result into something safe for the browser
  schedule.ts        ← turn per-month schedules into yearly chart/table series
  supabase-server.ts ← the authenticated DB client (as the logged-in user)
  session.ts         ← who am I? currentUser / requireUser / requireRole
  requests.ts        ← queries around a client's active request
  stage.ts           ← the 8-step journey stepper, derived from real data
  api-schemas.ts     ← zod validation for the headless API
  rate-limit.ts, format.ts, billing.ts, messages.ts, securities.ts … helpers

app/
  page.tsx           ← home
  new-mortgage/      ← the main flow: questionnaire → clocks → clock detail
    page.tsx           the form page (server component)
    actions.ts         saveNewMortgage() — validates + writes to DB
    clocks/page.tsx    computes + shows the 5 clocks
    clock/[id]/…       one clock's detail (charts, table, choose)
  refinance/, insurance/, personal/, documents/, authorizations/,
  messages/, checkout/, advisor/, admin/, active/, tender/  ← the other areas
  api/               ← headless JSON endpoints (calculate, clocks, refinance, insurance)

components/          ← the visual building blocks (ClockCard, RiskGauge, charts, forms)
supabase/migrations/ ← the database schema, evolved 0001 → 0013
```

**The mental shortcut:** `lib/engine` = *what is true about mortgages*.
`lib/*` (the rest) = *plumbing*. `app/**` = *screens and buttons*. `components/**`
= *pixels*. `supabase/**` = *storage + permissions*.

---

## 3. The core: `lib/engine`

Section 1 covered the math itself. Here we look at it as **code** — what each file
hands to the next, and where each formula physically lives.

### 3.1 The public door — `lib/engine/index.ts`

Everything outside the engine imports from here, never from the individual files.
This is a deliberate "front desk":

```ts
// lib/engine/index.ts
export * from "./types";
export { num, pmt, jsRound, indexExpect, routeAnnualIndex, monthlyRate } from "./core";
export { calcRoute } from "./route";
export { calcMix } from "./mix";
export { defaultRiskRules, riskRuleForRoute, mixRisk } from "./risk";
export { /* … */ calculateMixToRange } from "./tuning";
export { CLOCK_KEYS, generateClock, generateAllClocks, /* … */ } from "./clocks";
export * from "./rules";
```

**Why it exists:** it keeps the "protected core" boundary honest. If you ever want
to know "what is the engine allowed to be used for?", this file is the complete
answer.

### 3.2 The primitives — `core.ts`

This is the smallest, most important file: the actual payment formula lives here.

```ts
// lib/engine/core.ts — the mortgage payment (Spitzer annuity)
export function pmt(r: number, n: number, pv: number): number {
  if (n <= 0) return 0;
  if (r === 0) return -pv / n;
  return -(r * pv) / (1 - Math.pow(1 + r, -n));
}
```

Also here: `monthlyRate` (annual ÷ 12, or daily‑compounded if a track opts in),
and `indexExpect`/`routeAnnualIndex` (how much inflation linkage to apply). These
are the atoms every other file is built from.

**Say it like this:** *"The single most important function in the whole codebase is
`pmt` in `core.ts` — five lines that turn a loan, a rate, and a number of months
into a monthly payment. Everything else is scaffolding around it."*

### 3.3 One track's schedule — `route.ts`

`calcRoute` is the workhorse. It loops month by month and fills 1‑indexed arrays
(opening balance, interest, principal, indexation, payment). The heart of the loop:

```ts
// lib/engine/route.ts (inside the m = 1..n loop)
O[m] = L[m] * r;                                   // interest = balance × monthly rate
if (L[m] > 0) {
  if (board === "שפיצר") N[m] = -pmt(r, n - m + 1, L[m]) - O[m];  // Spitzer principal
  else N[m] = L[m] / (n - m + 1);                                  // equal-principal
}
P[m] = (L[m] - N[m]) * (idx + 1);                  // remaining balance grows by inflation
R[m] = O[m] + N[m];                                // this month's payment (before balloon/grace)
```

The rest of the loop handles balloon/grace variants and records the split so the
UI can later show "how much of my cost is interest vs. inflation." Two outputs
matter downstream: `out.S = M[1]` (first payment) and `out.T` (total cost).

**Where the math lives, exactly:** the amortization math is *only* here. No other
file computes a balance or a monthly interest.

### 3.4 Adding tracks together — `mix.ts`

A mix's payment is simply the **sum** of its tracks' payments. That's the whole
file, essentially:

```ts
// lib/engine/mix.ts
for (const route of routes) {
  const c = calcRoute(route, params);
  firstPay += c.S;                 // monthly payments just add up
  total    += c.T;
  totalInterest += c.intr.reduce((s, v) => s + num(v), 0);
}
return {
  /* … */
  firstPay, total, interest: totalInterest,
  indexation: Math.max(0, total - E - totalInterest), // inflation = cost that isn't principal or interest
};
```

**Say it like this:** *"A mix is just several tracks. Its monthly payment is the
sum of theirs, and the 'indexation' number is whatever's left over after principal
and plain interest — that's the inflation tax."*

### 3.5 Risk — `risk.ts`

A small rules table assigns each track a risk (1–4) by kind/reset‑window/linkage,
then the mix score is the **share‑weighted average**:

```ts
// lib/engine/risk.ts
const score = routes.reduce(
  (s, rt) => s + weight(rt) * num(riskRuleForRoute(rt, rules).risk), 0
) / total;
const level = Math.min(5, Math.max(1, jsRound(score)));
```

Note: this is the *engine* risk. The *gauge* you see on screen uses a separate
0–100 "display risk" (see §7.2). Two different numbers, on purpose.

### 3.6 The tuner — `tuning.ts` (the clever part)

A template only says *shares and kinds*. The tuner picks each track's **term** so
the mix's first payment lands in the borrower's desired range. It's a search:

```ts
// lib/engine/tuning.ts — calculateMixToRange (abridged)
const target = (opts.minPay + opts.maxPay) / 2;
for (let step = 0; step <= 240; step++) {          // 1) coarse sweep of one knob t
  const t = step / 240;
  for (const rt of work) rt.years = candidateYears(rt, t);
  const mix = calcMix(work, opts.params);
  const inRange = opts.minPay <= mix.firstPay && mix.firstPay <= opts.maxPay;
  /* keep the best: prefer in-range, then closest to target */
}
for (let round = 0; round < 3; round++) {          // 2) polish each track individually
  for (const rt of work) { /* try every allowed term, keep the best */ }
}
shortenFixedRoutesToMaximum(work, opts.maxPay, conditions, opts.params); // 3) trim if still too high
```

**Say it like this:** *"The borrower gives a monthly budget. The tuner tries
thousands of term combinations and picks the one whose first payment sits in that
budget. That's why all five clocks feel the same per month but differ in risk and
cost."*

### 3.7 The five strategies — `clocks.ts`

This file defines the five templates (shares/kinds) and a `generateAllClocks` that
runs the tuner five times. The built‑in default templates have a
duplication (clock 4 == clock 1 by default), which is flagged rather than hidden:

```ts
// lib/engine/clocks.ts
export const CLOCK_ROUTE_SPECS = {
  clock1: [fixed(17,false), fixed(17,true), variable(30,36,false), variable(15,60,true), prime(21)],
  clock2: [fixed(33,false), variable(30,36,false), prime(37)],
  clock3: [fixed(35,false), prime(65)],
  clock4: [/* EXACT DUPLICATE of clock1 — flagged, not silently shipped */ …],
  clock5: [fixed(33,false), prime(67)],
};
```

**Important:** these hard‑coded specs are only the *fallback*. In the running app,
the real five come from the **database** and are stamped with live rates — that's
the bridge in §4. (That is the curated set: סולידי → אגרסיבי.)

### 3.8 The regulatory gate — `rules.ts`

Not amortization math — *lending‑rule* math. This is the pre‑flight check before
any clocks are drawn. The load‑bearing formulas:

```ts
// lib/engine/rules.ts
export function financingLimitPct(loanType, source) {           // LTV ceiling
  if (loanType === "single_property") return source === "target_price" ? 0.9 : 0.75;
  if (loanType === "improvement") return 0.7;
  if (loanType === "additional_property" || loanType === "all_purpose") return 0.5;
  return 0.75;
}
function countingIncome(borrowers) {                            // owners full, others half
  return borrowers.reduce((s, b) => s + (b.isPropertyOwner ? b.netIncome : b.netIncome * 0.5), 0);
}
export function maxAllowedPayment(net, ratio = 0.4) {           // DTI capacity (40%)
  return Math.max(0, net * ratio);
}
```

`validateNewMortgage` / `validateRefinance` run all these and return either
`ok:true` with a `computed` block (including `loan_amount`) or a list of Hebrew
`issues`, each naming the exact shortfall.

**Say it like this:** *"`rules.ts` is the bouncer. Before we ever draw a clock, it
checks loan‑to‑value, minimum down payment, 40%‑of‑income capacity, and age — and
if you fail, it tells you precisely by how much."*

---

## 4. The bridge: `lib/engine-config.ts`

This is the single most important "glue" file, because it's where the **database
meets the pure engine**. The engine knows nothing about Supabase; this file feeds
it DB data and hands back finished clocks.

```ts
// lib/engine-config.ts — the live-rate loop
function applyAnchors(routes, rates) {                 // stamp live base rates by kind
  return routes.map((r) => ({
    ...r,
    anchor: r.kind === "prime" ? rates.prime : r.kind === "fixed" ? rates.fixed : rates.variable,
  }));
}

export async function computeClocks(loan, minPay, maxPay) {
  const [params, rates, rows] = await Promise.all([
    loadMarketParams(), loadRateAnchors(), loadClockTemplates(),   // ← from the DB
  ]);
  const templates = {};
  for (const r of rows) templates[r.id] = applyAnchors(r.routes, rates);
  return rows.map((row) => withMeta(
    generateClock(row.id, { loan, minPay, maxPay, params, templates, /* … */ }),  // ← the engine
    row,
  ));
}
```

**Why it matters:** this is the mechanism behind "the manager edits a rate and
everyone's clocks reprice." The template *shapes* (shares/kinds) and the *rates*
both come from the DB; the engine just prices whatever it's given.

**Say it like this:** *"`engine-config.ts` is the wiring. It pulls the market rates
and the five strategy templates out of the database, injects the current rates into
them, and asks the pure engine to price them. Change a number in the DB, and the
clocks move — no code change."*

---

## 5. The headless API: `app/api/**` + `lib/api-schemas.ts`

The app can also be used as a pure JSON calculator. These routes are thin: validate
the body with zod, call the engine, return numbers.

```ts
// app/api/calculate/route.ts
const parsed = calculateSchema.safeParse(await req.json().catch(() => null));
if (!parsed.success) return NextResponse.json({ error: "invalid body", … }, { status: 422 });
const routes = parsed.data.routes.map(toRoute);
const mix = calcMix(routes, parsed.data.params);   // ← engine
const risk = mixRisk(routes);                       // ← engine
return NextResponse.json({ mix: { firstPay: mix.firstPay, … }, risk });
```

The validation lives in `lib/api-schemas.ts` — the typed request models for the
API — which also converts loose JSON into a proper `Route`:

```ts
// lib/api-schemas.ts
export const calculateSchema = z.object({
  routes: z.array(routeInputSchema).min(1).max(10),
  params: paramsSchema.default({ cpi: 0.03, usd: 0.03, eur: 0.015 }),
});
export function toRoute(input): Route { return blankRoute({ ...input, /* index handling */ }); }
```

The endpoints:
`/api/calculate` (price an arbitrary mix), `/api/new-mortgage/clocks` (validate a
questionnaire → 5 clocks), `/api/refinance/clocks`, and `/api/insurance/quotes`
(the honest stub). Every one is rate‑limited (`rate-limit.ts`) and does no math of
its own.

**Say it like this:** *"There's a clean JSON API around the same engine. The route
files are boring on purpose — parse, validate, call the engine, respond. All the
intelligence is in `lib/engine`."*

---

## 6. Data & identity plumbing (`lib/supabase-server.ts`, `session.ts`, `requests.ts`)

### 6.1 Talking to the database *as the user*

```ts
// lib/supabase-server.ts
export async function supabaseServer(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: { getAll() { return cookieStore.getAll(); }, setAll(/* … */) {} },
  });
}
```

The key idea: this client carries the user's auth cookie, so every query runs
**as that user**. Combined with Row‑Level Security (Section 1, §7.3), the database
itself decides what rows come back. The app doesn't have to write "WHERE
client_id = me" everywhere — the DB enforces it.

### 6.2 Who am I? — `session.ts`

```ts
// lib/session.ts
export async function currentUser(): Promise<AppUser | null> { /* auth.getUser() + profiles row */ }
export async function requireUser(): Promise<AppUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
export async function requireRole(role: Role): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== role) redirect("/");
  return user;
}
```

Every protected page or action starts with one of these. `requireRole("client")`
at the top of a page is the whole access‑control story in one line — if you're not
a client, you're redirected before any data loads.

### 6.3 Fetching the case — `requests.ts`

`getActiveRequest(clientId)` pulls the client's most recent request plus its
`request_details` row. This is what the clocks page and personal area start from.

**Say it like this:** *"Three small files handle identity: one opens the database as
you, one answers 'who are you and are you allowed here', and one loads your current
mortgage case. Almost every screen begins with those."*

---

## 7. The screens: server components, actions, and the client boundary

Next.js "App Router" splits work between the **server** (renders pages, holds
secrets, does DB + engine) and the **client** (interactivity in the browser). The
codebase uses this split carefully — heavy data stays on the server; only small,
safe projections cross to the browser.

### 7.1 The write path — Server Actions (`app/**/actions.ts`)

A Server Action is a function that runs on the server but is called straight from a
form. The main one, `saveNewMortgage`, is the flow's spine — it validates, then
writes several tables, then redirects:

```ts
// app/new-mortgage/actions.ts (abridged)
"use server";
export async function saveNewMortgage(_prev, formData): Promise<SaveState> {
  const user = await requireRole("client");
  const db = await supabaseServer();
  /* …read propertyValue, equity, borrowers[] from formData… */

  const validation = validateNewMortgage(input, { paymentRatio: RATIO, maxAge: MAX_AGE }); // ← engine
  if (!validation.ok) return { issues: validation.issues };                                 // back to the form
  const loan = computeLoanAmountNew(input);                                                 // ← engine

  /* create or reuse the request, seed default banks + documents */
  await db.from("request_details").upsert({ request_id, loan_amount: loan, … });
  await db.from("borrowers").insert(rows);
  redirect("/new-mortgage/clocks");
}
```

Notice: even the write path calls the engine for the truth (`validateNewMortgage`,
`computeLoanAmountNew`) — it never re‑implements a rule.

The admin's live‑rate editor is another action, and it's tiny — it writes the
`economic_params` row and tells Next.js to re‑render the pages that show clocks:

```ts
// app/admin/actions.ts
export async function updateParams(formData: FormData) {
  await requireRole("admin");
  await (await supabaseServer()).from("economic_params").upsert({ id: "singleton", cpi, /* …anchors… */ });
  revalidatePath("/new-mortgage/clocks");
  revalidatePath("/refinance");
}
```

**Say it like this:** *"Forms submit to 'server actions' — server functions that
validate with the engine, write to the database, and redirect. The manager's rate
editor is just such an action: it saves the new rates and refreshes the clock
pages."*

### 7.2 The read path — a page that computes clocks

`app/new-mortgage/clocks/page.tsx` is a **server component**. It loads the request,
calls the bridge to compute the clocks, then shrinks each into a light shape before
handing them to a client grid:

```ts
// app/new-mortgage/clocks/page.tsx
const user = await requireRole("client");
const req  = await getActiveRequest(user.id);
const clocks = await computeClocks(d.loan_amount, d.min_pay, d.max_pay);  // ← bridge → engine
return ( /* … */ <ClocksGrid clocks={clocks.map(toClockCardData)} /> );
```

Why the `toClockCardData` shrink? Because a full clock result contains **hundreds
of numbers per track** (the whole month‑by‑month schedule). That must not be shipped
to the browser. `clock-card-data.ts` keeps only what a card shows:

```ts
// lib/clock-card-data.ts
export function toClockCardData(c: ClockWithMeta): ClockCardData {
  const m = c.mix;
  return {
    key: c.key, nameHe: c.nameHe, displayRisk: c.displayRisk, recommended: c.recommended,
    firstPay: m.firstPay, total: m.total, costSide: m.interest + m.indexation,
    principalPct: m.total > 0 ? m.principal / m.total : 0,
    routes: c.routes.map((rt) => ({ kind: rt.kind ?? "fixed", sharePct: rt.sharePct, indexed: rt.indexType === "מדד" })),
  };
}
```

**Say it like this:** *"Pages run on the server: they load your case, ask the bridge
for the five clocks, then deliberately strip the result down to just the numbers a
card needs before sending anything to the browser."*

### 7.3 Charts from *real* schedules — `lib/schedule.ts` + the detail page

The clock detail page proves the "never fake it" rule. The charts and the yearly
table are computed from the engine's actual per‑month arrays, not from a shortcut
annuity:

```ts
// app/new-mortgage/clock/[id]/page.tsx — yearly principal vs interest
for (let mo = (y - 1) * 12 + 1; mo <= y * 12 && mo <= months; mo++) {
  for (const r of clock.mix.per) {
    principal += r.prin[mo] ?? 0;                        // real principal that month
    interest  += (r.intr[mo] ?? 0) + (r.idxEff[mo] ?? 0); // real interest + indexation
  }
}
```

`lib/schedule.ts` does the same for the cumulative and monthly charts and the
annual table. The comment at the top of that file is the whole philosophy:
*"derived from the engine's REAL per‑month schedules — never the mockup's flat
annuity. … engine untouched."*

---

## 8. The pixels: `components/**`

Client components are the visual pieces. They receive already‑computed numbers and
render them — they never calculate money.

**`ClockCard.tsx`** — one clock's card. Pure presentation of a `ClockCardData`: the
recommended badge, the gauge, the stat block, the principal/interest bar, the route
chips:

```tsx
// components/ClockCard.tsx (the split bar)
<div className="flex h-2 overflow-hidden rounded-md bg-rule">
  <div className="rounded-md bg-primary" style={{ width: `${principalPct * 100}%` }} />
</div>
<p className="lbl mt-1.5">קרן {pct(principalPct, 0)} · ריבית/הצמדה {pct(1 - principalPct, 0)}</p>
```

**`RiskGauge.tsx`** — the three‑color needle. It's an SVG that maps a 0–100 score to
a needle angle; color/label come from `display-risk.ts`:

```tsx
// components/RiskGauge.tsx
const ang = 180 - clamped * 1.8;   // 0→180° (left/green), 100→0° (right/red)
const deg = 90 - ang;              // rotate the needle to the score
```

**`AmortizationChart.tsx`** — a Recharts stacked area of principal vs.
interest/indexation per year, fed by the `YearPoint[]` the detail page built.

Other components follow the same pattern: `NewMortgageForm` (the questionnaire),
`TrackDonut` (composition donut), `PaymentCharts`, `StatusStepper`,
`MessagesThread`, `TemplateEditor` (the admin's template editor), `InsuranceCompare`.

**Say it like this:** *"Components are dumb on purpose. The card, the gauge, the
charts — they all receive finished numbers and just draw them. No component
computes a payment."*

---

## 9. Cross‑cutting helpers worth knowing

- **`lib/display-risk.ts`** — the *shown* risk. Maps a 0–100 score to a Hebrew
  label and a color, and provides `engineRiskTo100` as a fallback when a template
  has no stored display score. This is why the gauge and the engine risk are two
  separate numbers.

  ```ts
  export function displayRiskLabel(score) {
    return score < 35 ? "נמוך" : score < 50 ? "נמוך-בינוני" : score < 65 ? "בינוני" : score < 78 ? "בינוני-גבוה" : "גבוה";
  }
  ```

- **`lib/stage.ts`** — the client's 8‑step journey
  (שאלון → הצעות → הרשמה → מילוי פרטים → מסמכים → אישור עקרוני → בחירת בנק → חתימה).
  It is **derived from real data**, not stored: it checks whether details exist, a
  clock was chosen, the service is paid, all required documents are approved and
  authorizations signed, a bank was approved, and an active mortgage exists.

  ```ts
  // lib/stage.ts
  if (req?.details && req.details.loan_amount > 0) idx = 1;
  if (idx === 1 && req?.chosen_clock_id) idx = 3;
  if (idx === 3 && req?.service_status === "PAID") idx = 4;
  /* then docs/auths → 5, approved bank → 6, best offer → 7, active mortgage → 8 */
  ```

  **Say it like this:** *"The progress bar isn't a saved field that can go stale —
  it's recomputed from the actual state of your documents, signatures, and offers
  every time you load the page."*

- **`lib/rate-limit.ts`, `lib/format.ts`, `lib/billing.ts`** — request throttling,
  Hebrew shekel/percent formatting, and the sandbox paywall respectively.

---

## 10. Two end‑to‑end walkthroughs (tie it all together)

### 10.1 A borrower gets five clocks

1. **Form** (`app/new-mortgage/page.tsx` + `components/NewMortgageForm.tsx`) collects
   property value, equity, borrowers, income, and the desired payment range.
2. **Submit → Server Action** `saveNewMortgage` (`actions.ts`): calls
   `validateNewMortgage` (engine `rules.ts`). On failure, returns issues to the
   form. On success, computes the loan and writes `requests`, `request_details`,
   `borrowers`, and seeds default `authorizations` + `documents`. Redirects.
3. **Clocks page** (`clocks/page.tsx`, server): `getActiveRequest` →
   `computeClocks` (bridge `engine-config.ts`) → engine `generateClock` ×5 →
   `toClockCardData` shrink → `<ClocksGrid>`.
4. **Cards** (`ClockCard` + `RiskGauge`) render the numbers. "פירוט" opens
   `clock/[id]/page.tsx`, which recomputes that one clock and builds the charts and
   annual table from the **real per‑month schedules** (`schedule.ts`).
5. **Choose** → a Server Action stamps `chosen_clock_id` on the request, advancing
   the journey (`stage.ts`).

### 10.2 The manager moves the market

1. Manager edits rates on `/admin/params`.
2. **Server Action** `updateParams` writes the `economic_params` singleton and calls
   `revalidatePath("/new-mortgage/clocks")`.
3. Next time any borrower loads their clocks, `computeClocks` reads the new anchors,
   `applyAnchors` stamps them onto the templates, and the engine reprices. No
   deploy, no code change.

---

## 11. "Where is …?" quick reference

| I want to change / find… | It lives in… |
|---|---|
| The monthly payment formula | `lib/engine/core.ts` → `pmt` |
| The month‑by‑month amortization | `lib/engine/route.ts` → `calcRoute` |
| How tracks combine into a mix | `lib/engine/mix.ts` → `calcMix` |
| The risk score math | `lib/engine/risk.ts` → `mixRisk` |
| How a template fits a budget | `lib/engine/tuning.ts` → `calculateMixToRange` |
| The five strategy definitions (fallback) | `lib/engine/clocks.ts` → `CLOCK_ROUTE_SPECS` |
| The five strategies actually used | the `clock_templates` DB table (via `engine-config.ts`) |
| LTV / equity / DTI / age rules | `lib/engine/rules.ts` |
| DB ↔ engine wiring, live rates | `lib/engine-config.ts` |
| The gauge label/color | `lib/display-risk.ts` |
| Chart / table series | `lib/schedule.ts` + `app/new-mortgage/clock/[id]/page.tsx` |
| Who can see what | `supabase/migrations/0007_rls_hardening.sql` + `lib/session.ts` |
| Save the questionnaire | `app/new-mortgage/actions.ts` → `saveNewMortgage` |
| Edit market rates | `app/admin/actions.ts` → `updateParams` |
| The card UI | `components/ClockCard.tsx` |
| The proof the math is right | `lib/engine/__tests__/parity.test.ts` + `golden.json` |

---

## 12. The five sentences that summarize the code

1. **One pure engine** (`lib/engine`) holds all the mortgage math; the parity test
   freezes it against a validated reference.
2. **A bridge** (`engine-config.ts`) feeds the engine data from the database, so
   editing a rate reprices everyone's clocks.
3. **Thin API routes** (`app/api`) expose the same engine as JSON, validated by
   zod schemas.
4. **Server components + server actions** do the DB reads/writes and call the
   engine; **client components** only draw finished numbers.
5. **Row‑Level Security + `requireRole`** mean the same data safely serves client,
   advisor, and manager, and the journey stepper is recomputed from real state,
   never faked.

---

### Where the next section could go

- **Section 3 — the flow layer in depth:** every server action and page for one
  role end‑to‑end (documents, authorizations, checkout/paywall, messaging), with
  the RLS policy that guards each.
- Or **the engine line‑by‑line:** the full `calcRoute` loop including balloon/grace
  and purpose‑split, and the tuner's search proven step by step.

*Tell me which, and how deep.*
