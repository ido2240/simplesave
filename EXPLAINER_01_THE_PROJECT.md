# SimpleSave — Section 1: The Project Itself

> This is the first of a planned series. It explains **what SimpleSave is, what
> problem it solves, how the whole thing flows end‑to‑end, the mortgage concepts
> behind it, the actual math (with formulas and worked numbers), and the database
> and how the app uses it.** It deliberately does *not* walk through the code
> file‑by‑file — that is the next section. Here the goal is that you understand
> the *machine* and *why it exists*, deeply, from zero.

---

## 0. The one‑paragraph version

SimpleSave is a Hebrew, right‑to‑left web app for the **Israeli mortgage market**.
A borrower answers a short questionnaire; the app instantly produces **five ready
mortgage plans** (called "clocks" / *שעונים*), each a different blend of loan
tracks, each showing its first monthly payment, its total lifetime cost, how much
of that is interest vs. index linkage, and a single risk gauge. The borrower picks
one, registers, signs bank‑authorization letters, uploads documents, and is then
handed off to a human advisor who guides the rest. The whole thing runs on top of
one calculation engine whose numbers are **locked to a frozen golden battery** so
the money math can never silently drift.

Everything below is that paragraph, unpacked.

---

## 1. The problem it solves

In Israel, a mortgage is almost never a single loan. It is a **mix of "tracks"**
(*מסלולים*) — for example part of the money at a fixed rate, part at prime, part
at a variable rate linked to the consumer price index. Choosing that mix is the
whole game: it decides your monthly payment, how exposed you are to interest‑rate
and inflation changes, and how much the loan costs over 20–30 years. Ordinary
borrowers can't compute this, so they walk into a mortgage broker blind.

SimpleSave replaces **the first, most mechanical part of a mortgage broker's job**:
the intake and the "here are some options" conversation. Instead of a human
sketching a mix on paper, the borrower answers a form and immediately sees five
professionally‑shaped mixes with real, correctly‑computed numbers, plus a plain
risk indicator. Only after that does a human advisor step in for the parts that
actually need a human (negotiating with banks, reviewing documents, judgment).

The stated goals, in order of importance:

1. **Correct money math, provably correct.** The engine's numbers are frozen
   against a validated golden battery and guarded by a "parity gate" (Section 8). This is
   treated as non‑negotiable: a mortgage tool that quietly miscomputes a payment
   is worse than useless.
2. **Instant, understandable options.** Five clocks, each with first payment,
   total cost, interest/indexation split, and a one‑glance risk gauge.
3. **A real workflow, not a calculator toy.** Roles, documents, authorizations,
   messaging, an advisor queue, a manager back office — the plumbing of an actual
   service.
4. **Honesty about limits.** Where a real data source doesn't exist yet
   (insurance tariffs, parsing a bank's balance PDF, live card payments), the app
   returns an explicit "not available / demo / sandbox" instead of inventing
   numbers. This is a repeated, deliberate design rule.

It is explicitly an **educational demo — not licensed financial advice.**

---

## 2. The cast: three services and three roles

**Three services** the platform offers:

- **New mortgage** (*משכנתא חדשה*) — buying/financing a property for the first time.
- **Refinance** (*מִחזור*) — replacing an existing mortgage with a better mix.
- **Mortgage insurance** (*ביטוח משכנתא*) — life/property insurance tied to the loan.
  (Currently an honest stub — see Section 9.)

**Three roles**, who all see the same underlying data but through different doors
and with different permissions:

- **Client** (*לקוח*) — the borrower. Fills the questionnaire, sees clocks, picks
  one, registers, uploads documents, signs authorizations, tracks progress.
- **Advisor** (*יועץ*) — the professional. Sees a queue of assigned client cards
  (current step, next action), reviews documents, edits client data, messages the
  client per request.
- **Manager / admin** (*מנהל*) — the back office. Assigns leads to advisors, and —
  importantly — **edits the live market rates and clock templates**, which
  immediately reprices everyone's clocks (Section 7).

---

## 3. The end‑to‑end workflow

Think of a single borrower moving left to right. The `requests.status` column in
the database literally tracks this journey (`lead → clocks → registered → active`).

```
  Questionnaire        Five clocks         Registration        Personal area          Service
  (lead intake)   →   (5 mixes shown)  →   (real signup)   →   (authorizations,   →   (advisor guides,
                                                                documents, msgs)        paywall, tracking)
```

1. **Questionnaire / lead.** The borrower enters: loan type, property source, its
   value, their equity (down payment), one to five **borrowers** (each with name,
   birthdate, net income, and whether they own the property), extra income, fixed
   monthly expenses, and a **desired monthly‑payment range**.

2. **Validation (the regulatory gate).** Before any clocks are drawn, the inputs
   are checked against Bank‑of‑Israel‑style lending rules — loan‑to‑value ceiling,
   minimum equity, debt‑to‑income capacity, borrower age. If something is out of
   bounds (too little equity, payment beyond capacity, borrower too old for the
   term), the borrower is told exactly what and by how much. This is the `rules`
   layer, and its math is in Section 6.4.

3. **Five clocks generated.** If valid, the engine builds five mortgage mixes,
   each tuned so its **first monthly payment lands inside the borrower's desired
   range** (Section 6.5). Each clock card shows: first payment, total lifetime
   cost, the interest‑plus‑indexation portion, and a **risk gauge**. One is badged
   **recommended** (*מומלץ*). Clicking a clock opens a detail view with an
   amortization chart (how principal vs. interest/indexation break down per year).

4. **Registration.** The borrower creates a real account (Supabase Auth,
   email + password) and a consent timestamp is stored.

5. **Personal area & service flow.** Now the request becomes a live case:
   bank‑authorization letters to sign, a document checklist to upload into (with
   advisor review statuses), collateral/securities, and a **paywall** for the full
   guided service (enforced on the server; checkout currently runs a clearly
   labeled *sandbox* provider).

6. **Advisor + manager.** The request appears in the assigned advisor's queue.
   The manager can (re)assign it and can tune the rates/templates that drive the
   numbers.

**Refinance** is the same shape with a twist: instead of "buy a property," the
borrower enters an existing mortgage balance and a goal, and gets five *alternative*
mixes plus a **side‑by‑side comparison** against what they have today (monthly /
total / interest / indexation / risk / savings).

---

## 4. The core domain concepts (learn these four words)

Everything in the engine is built from four nested ideas. Get these and the math
in Section 6 reads easily.

- **Route / track** (*מסלול*) — one slice of the loan: an amount, a term in years,
  a rate, and a *kind*. There are three kinds:
  - **fixed** (*קבועה*) — the rate never changes. Safe, usually costs more.
  - **prime** (*פריים*) — floats with the Bank of Israel prime rate; changes
    monthly. Cheap today, exposed to rate hikes.
  - **variable** (*משתנה*) — a rate that resets every N months (e.g., every 60
    months) off an anchor like a government bond.
  A track may also be **index‑linked** (*צמוד מדד*): its balance grows with
  inflation (CPI). Linked tracks look cheaper up front but carry inflation risk.

- **Mix / tamhil** (*תמהיל*) — a set of routes whose shares add up to 100% of the
  loan. This is the actual product a borrower gets. The mix's monthly payment is
  the **sum** of its routes' payments; its risk is a **weighted blend** of its
  routes' risks.

- **Clock / she'on** (*שעון*) — a *named strategy template* for a mix, plus the
  result of fitting that template to this specific borrower. The five clocks range
  from conservative to aggressive:

  | Clock | Name | Fixed / Variable / Prime | Display risk (0–100) |
  |------|------|--------------------------|----------------------|
  | 1 | סולידי (Solid) | 70 / 20 / 10 | 24 (low) |
  | 2 | מאוזן (Balanced) | 55 / 25 / 20 | 40 |
  | 3 | מומלץ★ (Recommended) | 45 / 25 / 30 | 55 |
  | 4 | גמיש (Flexible) | 33 / 27 / 40 | 70 |
  | 5 | אגרסיבי (Aggressive) | 20 / 30 / 50 | 84 (high) |

  More fixed = calmer and safer; more prime/variable = cheaper now but riskier.
  (These specific five come from the "definitive mockup" and are stored in the
  database as manager‑editable rows — see the note on the "reference quirk" in
  Section 8.)

- **Market params & anchors** — the economic assumptions the math runs on:
  expected CPI, USD, EUR (for linkage), and the base rate ("anchor") for each
  kind (prime, fixed, variable). These live in the database and the manager edits
  them; changing one instantly reprices every clock.

---

## 5. The engine at a glance (how the pieces stack)

The whole calculation is a stack of **pure functions** — no database, no UI, no
randomness. Same inputs always give the same outputs. That purity is what makes
the parity gate (Section 8) possible.

```
core     → the primitives: payment formula (pmt), rounding, indexation, rates
route    → one track's full month-by-month amortization schedule
mix      → add up several routes into one mix (payment, total, interest, risk inputs)
risk     → turn a mix into a risk score/level/label
tuning   → the "tuner": bend a template's terms so the mix lands in a payment range
clocks   → the five named templates + "generate all five for this borrower"
rules    → the regulatory gate: LTV, equity, DTI, age (new-mortgage & refinance)
```

Data flows **up** the stack: `core` feeds `route`, `route` feeds `mix`, `mix`
feeds `risk` and `tuning`, and `clocks` orchestrates `tuning` five times using the
templates. `rules` sits to the side as the pre‑flight validator. The next section
is the math inside each of these.

---

## 6. The math — formulas, intuition, and worked numbers

This is the heart. I'll give each piece as: **what it computes → the formula →
the intuition → a number.**

### 6.1 The monthly payment: PMT (the Spitzer annuity)

**What.** For a "Spitzer" (*שפיצר*) loan — the standard equal‑payment mortgage —
every month you pay the *same* total amount. Early on most of it is interest; late
on most of it is principal. `pmt` computes that fixed amount.

**Formula.** For monthly rate `r`, number of months `n`, and present value (loan)
`PV`:

```
PMT = -( r · PV ) / ( 1 − (1 + r)^(−n) )        (r ≠ 0)
PMT = -PV / n                                    (r = 0, i.e. an interest-free loan)
```

The result is **negative** on purpose — it mirrors Excel's `PMT`, where money
leaving your pocket is negative. The rest of the engine negates it back to a
positive payment.

**Intuition.** The numerator `r·PV` is the interest on the whole loan in month one.
The denominator `1 − (1+r)^(−n)` is an "annuity factor": it spreads that cost
across `n` months, accounting for the fact that the balance shrinks over time. A
longer term (bigger `n`) pushes the denominator toward 1, lowering the payment but
raising total interest.

**Numbers.** A ₪1,000,000 fixed track at 4.62%/year for 25 years:
`r = 0.0462 / 12 = 0.00385`, `n = 300`.

```
monthly payment ≈ ₪5,626.66
total paid       ≈ ₪1,687,997
of which interest≈ ₪687,997
```

So a million‑shekel loan costs about ₪688k in interest over 25 years at that rate.
That single line is why the *mix* matters so much.

### 6.2 The other board: equal principal (*קרן שווה*)

**What.** The alternative repayment style. Instead of a level total payment, you
pay a **constant principal** each month plus whatever interest is due on the
remaining balance. Payments start high and fall over time.

**Formula (per month `m`).** With opening balance `L[m]` and remaining months
`n − m + 1`:

```
principal N[m] = L[m] / (n − m + 1)
interest  O[m] = L[m] · r
payment   R[m] = N[m] + O[m]
```

**Numbers.** Same ₪1,000,000 at 4.62%, 300 months, first month:
principal `= 1,000,000/300 = ₪3,333.33`, interest `= ₪3,850.00`, so the **first**
payment is `₪7,183.33` — much higher than Spitzer's flat ₪5,627, but it drops every
month and costs less interest overall. Spitzer trades lower early payments for more
total interest; equal‑principal is the reverse.

### 6.3 Rates: nominal, effective, and index linkage

**Monthly rate.** By default the engine uses the simple convention
`r = annualRate / 12`. (A track can opt into daily compounding, in which case
`r = (1 + annual/365)^(365/12) − 1`.) The `annualRate` itself is `anchor + margin`,
floored at 0 (a negative total rate is flagged, never used as negative).

**Effective annual rate.** Because you pay monthly, the true annual rate is
slightly above the nominal: `effRate = (1 + r)^12 − 1`. For 4.62% nominal that's
**4.72%** effective.

**Index linkage (the inflation part).** A CPI‑linked track's *balance itself grows*
with inflation. The engine converts an annual index expectation into a monthly
bump **linearly** (this is a deliberate modeling choice — it is *not*
compounded):

```
monthly index  idx = (annualIndex / 12) · indexPct
```

At 3% expected CPI, that's `0.03 / 12 = 0.0025` — a 0.25% bump to the balance each
month. Each month the engine grows the post‑payment balance by `(1 + idx)`, and
splits the extra into "index on principal" and "index on interest" so the app can
show you how much of your cost is *interest* vs. *inflation linkage*. This is the
"indexation" number on every clock card.

### 6.4 Building one track's full schedule (amortization)

`route` runs a month‑by‑month loop from month 1 to `n` and, for each month `m`,
records the opening balance, the interest, the principal, the linkage, and the
payment. In simplified form, for a plain Spitzer track:

```
L[m] = balance at the start of month m        (L[1] = the loan)
O[m] = L[m] · r                               (interest this month)
N[m] = (−PMT(r, n−m+1, L[m])) − O[m]          (principal = payment − interest)
L[m+1] grows the leftover by linkage:  (L[m] − N[m]) · (1 + idx)
```

It also supports **balloon** and **grace** structures (*בלון / גרייס*), where for
some initial months you pay only interest, or nothing at all, and the principal is
deferred — the loop has branches for each. And it supports a **purpose split**
(part of a track for "housing," part "all‑purpose"), which it prices separately
and then merges weightedly.

Two outputs per track matter most downstream:

- **S** = `M[1]`, the **first monthly payment**.
- **T** = the **total cost** accumulated over the relevant horizon.

Also kept: `prin[]`, `intr[]`, `idxEff[]` per month — the raw material for the
amortization chart and (in principle) the yearly breakdown table.

> **Fidelity details that are load‑bearing:** arrays are **1‑indexed** (index 0 is
> a zero placeholder); the Hebrew enum values are stored *verbatim* (`'שפיצר'`,
> `'מדד'`, `'פריים'`…) so the data is consistent everywhere and the risk
> table keys still match; rounding uses `Math.round`. These look like trivia but
> they're exactly what keeps the engine bit‑for‑bit consistent with the golden battery.

### 6.5 Aggregating a mix

Given several routes, `mix` computes each route's schedule and then combines:

```
firstPay   = Σ  S_route          (monthly payments simply add)
total      = Σ  T_route
interest   = Σ (sum of intr[] per route)
indexation = max(0, total − principal − interest)
avgYears   = Σ (amount · years) / Σ amount     (amount-weighted term)
avgRate    = Σ (amount · rate)  / Σ amount     (amount-weighted rate)
```

The key intuition: **a mix's monthly payment is just the sum of its parts.** That's
why blending a cheap‑but‑risky prime slice with a safe fixed slice lets you dial
the payment and the risk independently. `indexation` is backed out as "whatever of
the total cost isn't principal or plain interest" — i.e., the inflation tax.

### 6.6 Risk scoring

**What.** Turn a mix into a number a human can read. There are actually **two**
risk notions, kept separate on purpose:

1. **Engine risk (the computed one).** A small rules table assigns each track a
   risk of 1–4 based on its *kind*, how often its rate resets (*months*), and
   whether it's index‑linked:

   | Kind | Reset window | Linked? | Risk |
   |------|--------------|---------|------|
   | prime | 1–12 mo | no | 1 |
   | variable | 1–59 mo | no / yes | 2 / 3 |
   | variable | 60–360 mo | no / yes | 3 / 4 |
   | fixed | 48–360 mo | no / yes | 3 / 4 |

   The mix's score is the **share‑weighted average** of its tracks' risks:

   ```
   score = Σ (weight_route · risk_route) / Σ weight_route
   ```

   Then `level = round(score)` clamped to 1–5, and a Hebrew label
   (`נמוכה / בינונית / גבוהה / גבוהה מאוד`) by threshold. (Note the slightly
   counter‑intuitive rule that a *long fixed linked* track scores as risky — that's
   the inflation exposure of long index linkage, faithfully copied from the
   reference.)

2. **Display risk (the shown one).** A per‑template score **0–100**, stored on the
   clock template in the database and editable by the manager, mapped to labels by
   the mockup's thresholds (`<35 low`, `<50 low‑med`, `<65 med`, `<78 med‑high`,
   else high). This is what the speedometer gauge shows. The engine's computed risk
   stays available underneath as a fallback.

   Why two? A product decision (logged as "D‑6"): the business wanted the gauge to
   reflect a curated conservative→aggressive ordering, while the validated engine
   risk stays untouched for correctness.

### 6.7 The tuner — how a template becomes *your* clock

This is the cleverest piece. A template only says *shares and kinds* (e.g., "55%
fixed, 25% variable, 20% prime"). It does **not** say the term of each track. The
**tuner** (`calculateMixToRange`) picks the terms so that the mix's **first payment
lands in the borrower's desired monthly range** — because payment is what borrowers
actually feel.

The procedure:

1. **Assign amounts.** Each track gets `loan · share%`.
2. **Target.** Aim for the middle of the range: `target = (minPay + maxPay) / 2`.
3. **Coarse sweep.** Slide a single knob `t` from 0 to 1 in 241 steps. At each `t`,
   every track is set to a candidate term drawn from its allowed terms
   (`candidateYears`), the mix is priced, and the engine keeps the best result —
   preferring any mix whose first payment is *inside* the range, and among those,
   the one closest to `target`.
4. **Local polish.** Three rounds of coordinate descent: hold all tracks fixed but
   one, try every allowed term for that one, keep the best; repeat track by track.
   This nudges the solution better than the single‑knob sweep could.
5. **Shorten fixed if still too high.** If the payment is still above the max, it
   *shortens* fixed tracks (linked ones first, by rule) to the longest term that
   fits — because a shorter fixed term is the safe way to cut cost/exposure.

The output is the concrete set of routes (with chosen terms), the priced mix, and
whether it actually landed in range. Run this five times with the five templates
and you get the five clocks.

**Intuition:** the borrower says "I can pay ₪6,000–₪8,000." The tuner answers, for
each strategy, "here's the exact 55/25/20 loan whose first payment is about ₪7,000,"
so all five clocks are directly comparable at the same monthly feel but with
different risk/cost tradeoffs.

### 6.8 The regulatory gate (rules)

Before clocks, the inputs must pass real lending limits. The important formulas:

**Loan‑to‑value (financing ceiling).** The maximum you can borrow as a fraction of
property value depends on the deal:

```
single property        : 75%   (90% under the "target price" program)
improvement/renovation : 70%
additional property /
  all-purpose loan      : 50%
```

The actual loan is then `min( value · limit% , value − equity )` — you can't borrow
past the ceiling *or* past what your down payment leaves.

**Minimum equity.** The down payment floor: 25% normally, 10% for target‑price
(with a ₪100,000 absolute minimum), 50% for additional/all‑purpose loans.

**Debt‑to‑income capacity (DTI).** This decides the payment ceiling. Income counts
*fully* for property owners and at *half* for non‑owner co‑borrowers, plus extra
income, minus fixed expenses:

```
net = Σ (owner ? income : income·0.5) + additionalIncome − fixedExpenses
capacity = net · 0.40            (the payment-to-income ratio, "D-3" = 40%)
```

So the borrower's requested max payment can't exceed 40% of net income. Example: a
household with ₪25,000 net counting income can support up to `25,000 · 0.40 =
₪10,000/month`.

**Age & term.** The oldest borrower must be within the age cap (**85** for a new
mortgage, **80** for refinance), and the term is capped so the loan finishes by
that age: `maxTerm = min(30, maxAge − oldestAge)`. A 60‑year‑old on a new mortgage
tops out at `85 − 60 = 25` years.

Each violated rule produces a specific Hebrew message with the exact number the
borrower is missing — the point is to guide, not just reject.

---

## 7. The database and how the app uses it

The data layer is **Supabase** — a hosted Postgres with built‑in Auth (GoTrue),
file Storage, and Row‑Level Security (RLS). The app talks to it **server‑side, as
the logged‑in user**, so the database itself enforces who can see what.

### 7.1 The core tables

| Table | Holds | Role in the story |
|------|-------|-------------------|
| `profiles` | user id, email, name, **role** (client/advisor/admin), consent stamp | who you are + what door you get |
| `requests` | client_id, advisor_id, service, **status**, service_status (FREE/PAID), chosen clock | the case itself; `status` is the workflow tracker |
| `request_details` | property value, equity, loan amount, type, term, pay range | the questionnaire's numeric answers |
| `borrowers` | per‑request people: name, birthdate, income, owner flag | drives DTI and age rules |
| `documents` | kind, file name, **status**, required flag | the upload checklist + advisor review |
| `authorizations` | bank, signed?, signed_at | the bank‑authorization letters |
| `messages` | author, body, read_at | advisor ↔ client thread |
| `leads` | raw questionnaire + validation + clocks as JSON | pre‑account lead capture |

**Manager‑editable engine config** (this is what makes rates "live"):

| Table | Holds |
|------|-------|
| `economic_params` | expected CPI/USD/EUR **and** the prime/fixed/variable anchors + prime rate |
| `rate_bands` | rate curves keyed by a rate key (JSON bands) |
| `clock_templates` | the five clocks as data: name, routes (shares/kinds), display order, `recommended`, `subtitle`, `display_risk` |

Later migrations add **mockup‑parity domains**: `bank_offers` (a bank tender per
request), `active_mortgages` + `active_tracks` (post‑signing management), and
`advisor_tasks` (the advisor's to‑do list).

### 7.2 How config becomes numbers (the live‑rate loop)

This is the most important "how it uses the DB" idea. The pure engine knows nothing
about the database. A thin bridge (`engine-config.ts`) does the wiring:

1. Load `economic_params` → market params (CPI/USD/EUR) **and** anchors
   (prime/fixed/variable base rates).
2. Load `clock_templates` (the five mixes) and **stamp the live anchors onto each
   track by kind** — a prime track gets the current prime rate, a fixed track the
   current fixed anchor, etc.
3. Run the engine's `generateClock` for each template with the borrower's loan and
   payment range.
4. Attach display metadata (recommended badge, subtitle, 0–100 display risk).

The payoff: when the **manager edits a single anchor in the admin screen, every
borrower's clocks reprice** on the next computation — no code change, no redeploy.
The database is the control panel; the engine is the calculator; the bridge joins
them.

### 7.3 Security: Row‑Level Security (RLS)

Every table has policies enforced by Postgres itself, not by app code. Two helper
functions do the heavy lifting:

- `app_role()` — returns the current user's role from their profile.
- `can_access_request(req)` — true if you're the request's client, its assigned
  advisor, or an admin.

From those, the rules read naturally: a **client sees only their own rows**; an
**advisor sees only assigned clients**; a **manager sees everything**; the config
tables (rates, templates) are **readable by any logged‑in user but writable only by
admins**; and uploaded files in Storage are scoped by the request id embedded in
their path. So even if the UI had a bug, the database would still refuse to hand a
client someone else's mortgage.

---

## 8. Why you can trust the numbers: the parity gate

The engine's math is **frozen against a validated golden battery.** Money math is
exactly where silent bugs creep in — an off‑by‑one, a rounding difference, a
compounding assumption — so the engine is guarded so it can never drift.

To do that, there's a **parity gate**: a frozen file (`golden.json`) holds the
validated outputs for a battery of **140 cases** (routes, mixes, risk,
tuner). A test runs those 140 cases through the engine and compares
**every single number** (about 167,000 of them) to the golden values, allowing only
floating‑point‑level noise (differences down around 1e‑9). If any real number
drifts, the test goes red and the build stops.

The practical rule that falls out of this: **the engine math and the parity files
are frozen.** New features build *on top of* the engine; they don't reach in and
change how a payment is computed. That's the whole reason the app can call itself a
faithful mortgage calculator.

> **The default templates and the five clocks.** The engine's built‑in five
> templates have a duplication by default (clock 4 is an exact copy of clock 1,
> clock 5 nearly a copy of clock 3). Rather than silently "fix" it, the engine keeps
> the defaults but *flags* them, and the business adopted a cleaner
> set of five distinct strategies (the סולידי→אגרסיבי table in
> Section 4), stored as editable database rows. So: engine math = frozen and
> faithful; the *choice* of which five mixes to show = a product decision living in
> data.

---

## 9. What's real vs. deliberately deferred

A defining trait of this project is that it **stubs honestly** instead of faking.
In v1, working and deployed: real auth + RLS, the five‑clock engine, the
new‑mortgage and refinance flows, documents/storage, authorizations, securities,
advisor and manager areas, live rate editing, and an installable PWA.

Deliberately deferred (and clearly labeled as such in the UI/API, never faked):

| Deferred item | Why | What it does instead |
|---|---|---|
| Insurance pricing | No official tariff tables | Stub returns "not available" / demo estimates, clearly labeled |
| Balance‑report PDF parsing | Needs a real parser | Refinance uses manual balance entry |
| Real card payments | No live keys | Checkout runs a flagged **sandbox**; the paywall is still enforced server‑side |
| Eligibility (*זכאות*), multi‑language, post‑execution tracking | Out of MVP scope | — |

This is the same principle as the parity gate, applied to product: **be correct or
be explicit; never be confidently wrong.**

---

## 10. The mental model to keep

If you remember five things:

1. **A mortgage is a mix of tracks**, and choosing the mix is the entire value.
2. **Five clocks** = five strategies from safe to aggressive, each tuned so its
   *first payment fits your budget*, so they're directly comparable.
3. **The engine is pure and frozen**, locked to a reference by a 140‑case parity
   gate — that's why the money math is trustworthy.
4. **The database is the control panel**: rates and templates are data the manager
   edits, and editing them reprices everyone's clocks through a thin bridge.
5. **Roles + RLS** mean the same data serves client, advisor, and manager, with
   Postgres itself enforcing who sees what.

---

### Where the next sections go

- **Section 2 — the code in depth:** a file‑by‑file walk through `lib/engine/*`
  (core → route → mix → risk → tuning → clocks → rules), tying each formula above
  to the exact function, plus the app/API/UI layers.
- Likely later: the amortization loop line‑by‑line; the tuner's search in detail;
  the full RLS policy set; and the request/state machine across the UI.

*Tell me which to do next and how deep.*
