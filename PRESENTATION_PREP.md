# SimpleSave — Presentation & Defense Prep

> A study guide for defending the project against the grading rubric (מחוון).
> Course goal: **using AI tools to build apps.** This doc turns the real facts of
> the build (commits, the engine, the tests) into things you can *say* and *show*.
> Everything here is checkable against `git log` and the code.
>
> The rubric: **40% הספק · 25% הצגת העיקר · 25% העבודה עם הצ'ט · 10% 5 סעיפי וריפיקציה.**
> Screenshots (part of the 25%) are skipped for now — placeholders are marked.

---

## 0. The 20-second pitch (memorize this)

*"SimpleSave is a Hebrew RTL web app for the Israeli mortgage market. A borrower
answers a short questionnaire and instantly gets five mortgage-mix proposals
('clocks') — each with its first monthly payment, total cost, and a risk gauge —
then registers, signs bank authorizations, uploads documents, and is handed to an
advisor. Three roles (client, advisor, manager) share one database under real
row-level security. The money math is a validated engine locked behind a parity
gate, so it can't silently drift."*

Then, for the course angle: *"I built it with an AI coding agent. My job was
directing it — deciding the architecture, sourcing the math from a validated
reference, and gating every change behind tests so the AI's output was provably
correct, not just plausible."*

---

## 1. הספק — 40% (output, quality, and the 24-hour anchor)

This is the biggest slice. Two claims to make, both provable from `git log`:
**(a)** a complete, deployed MVP inside the first day, and **(b)** a second push
that reached feature-parity and production quality.

### 1.1 The headline numbers

- **42 commits total**, authored `ido2240`.
- **11 commits in the first ~15 hours** (2026-06-25 21:35 → 2026-06-26 12:22) —
  all inside the 24-hour window.
- **31 commits after**, in a focused second phase (2026-07-06 and 07-07, ~2 half-days).
- **~8,000 lines** of application code + SQL: `app/` 3,566 · `components/` 1,334 ·
  `lib/` 1,906 (of which the engine is 1,232) · `supabase/migrations/` 574 (13
  migrations) · `e2e/` 580 — plus a **140-case, 2 MB golden test battery**.

### 1.2 What shipped INSIDE 24 hours (the MVP)

| Time | Commit | What landed |
|------|--------|-------------|
| 06-25 21:35 | `40252e5` | Project initialised |
| 06-25 22:49 | `5e1a730` | **The calculation engine** + a **parity oracle** to validate it |
| 06-25 23:14 | `a8b832c` | `/calculate` HTTP API over the engine |
| 06-26 02:05 | `86078c8` | **Full app: Next.js + TypeScript + Supabase** |
| 06-26 02:09 | `32fd7a0` | App finalised + docs |
| 06-26 02:19 | `e6c7b17` | Database access policies (RLS) |
| 06-26 11:09–11:30 | `d236ff7`→`c02e113` | Production prep: **real auth**, scoped **RLS**, service-role seed, deploy doc |
| 06-26 12:10 | `be7190b` | Real-password login + role-based routing |
| 06-26 12:22 | `c819c10` | English code comments + README |

**Say it like this:** *"By midday on day one I had a deployed app: the validated
engine, a working questionnaire→clocks flow, three roles with real Supabase auth
and row-level security, and a public API — 11 commits, all inside 24 hours."*

### 1.3 What shipped AFTER (parity + production hardening)

The July 6–7 phase (31 commits) turned the MVP into a complete product:

- **Feature parity** with the definitive design mockup: the five named mix
  templates + display-risk gauge (`64f2b6b`), mix-detail donut/table/charts
  (`8047681`), the 8-step client journey stepper, 6-doc checklist, client
  messages, bank tender, active-mortgage screen, consent (`fa67d0f`).
- **Business rules finalised**: DTI 40% (`99d4a16`).
- **Staff tooling**: advisor tender/active entry, tasks, advisor load, visual
  template editor (`b680b23`).
- **Production readiness**: terms + privacy (Takana 13), error boundary, SEO/OG,
  rate limiting (`59d7e61`); document-upload limits + guards (`3aac6c8`).
- **Testing**: a **77-check full-journey e2e suite** + an RLS fix it caught
  (`cd4b9ed`).
- **Real-world fixes** from a preview audit: anon calculators + lead capture
  (`5ec2df8`), orphaned-profile signup fix (`224b0ab`), infeasible-loan handling
  (`3e338db`→`b33504f`).

**Say it like this:** *"The first day proved the concept end-to-end. The second
phase was about quality — matching the full design, hardening for production, and
adding an automated test suite that actually caught a security bug."*

### 1.4 Coverage vs. the requirements

> If you have the original requirements doc (עיצוב מערכת 6.26), map each line to a
> commit for a precise %. Below is the coverage reconstructed from the build.

**Three services:** new mortgage ✅ · refinance ✅ (with side-by-side comparison) ·
insurance ✅ *as clearly-labeled demo tariffs* (honest stub where no real tariff
source exists).
**Three roles:** client ✅ · advisor ✅ · manager ✅ — all under real RLS.
**Client journey:** questionnaire → 5 clocks → registration → personal area →
authorizations → documents → messaging → tracking ✅.
**Deliberately deferred (and labeled, never faked):** live card payments (sandbox),
balance-PDF parsing (manual entry), post-execution tracking beyond the demo screen.

**The quality argument:** the numbers aren't illustrative — every payment comes
from the validated engine; access is enforced by the database, not just the UI;
and the flow is covered by end-to-end tests. Where a real data source was missing,
the app says so instead of inventing values.

### 1.5 How to SHOW the anchors live (do this in the room)

```bash
# commit hours, oldest first — proves the 24h story
git log --reverse --pretty=format:'%h  %ad  %s' --date=format:'%Y-%m-%d %H:%M'

# count inside the first 24h
git log --since="2026-06-25 21:35" --until="2026-06-26 21:35" --oneline | wc -l
```

---

## 2. הצגת העיקר — 25% (demo the essence, not the trivia)

Grading rewards focus on the **main thing**. The main thing here is: *a
questionnaire becomes five correct, comparable mortgage options, and the whole
thing is one shared system under real permissions.* Don't spend the demo on fonts
or footers.

### 2.1 A tight 5-minute demo script

1. **Home → questionnaire (30s).** Enter a realistic scenario. Point out the *live
   capacity hint* (40% of income) — the app validates against real lending rules
   before it computes anything.
2. **The five clocks (90s).** This is the heart. Show the five cards from solid to
   aggressive, the recommended badge, the risk gauge, and — critically — *first
   payment, total cost, interest/indexation split*. Say: *"same monthly budget,
   five different risk/cost tradeoffs — the engine tuned each one's term to fit my
   payment range."*
3. **Clock detail (45s).** Open one. Show the amortization chart / yearly table and
   the track donut. Say: *"these charts are computed from the engine's real
   month-by-month schedule, not an approximation."*
4. **Manager live-rate edit (60s).** Log in as manager, change an anchor rate in
   `/admin/params`, go back to the clocks — *they reprice*. Say: *"rates and
   templates are data; editing them reprices everyone with no code change."*
5. **Roles + security (30s).** Show that a client sees only their own case and an
   advisor only assigned clients. Say: *"the database enforces this with
   row-level security — even a UI bug couldn't leak another client's data."*

### 2.2 The three "essence" sentences

- *"The engine is the product — five correct mixes, provably correct."*
- *"It's a real workflow, not a calculator: roles, documents, authorizations,
  advisor handoff."*
- *"It's honest: where there's no real data source, it says 'estimate' or 'not
  available' instead of faking numbers."*

---

## 3. העבודה עם הצ'ט — 25% (how you used AI)

Structure: (10%) screenshots of key chats · (10%) reflection on where AI shortened
the work · (5%) reflection on how AI helped with technical challenges.

### 3.1 Screenshots — placeholder checklist (fill later)

Capture these conversations (they map to the highest-value moments):

- [ ] Sourcing/porting the math + building the parity oracle (day 1).
- [ ] Scaffolding the Next.js + Supabase app and the auth/RLS setup.
- [ ] A debugging session (e.g., the RLS/advisor-visibility fix, or the
      orphaned-profile signup bug the preview audit found).
- [ ] The production-hardening pass (terms/privacy, rate limiting, error boundary).
- [ ] Writing the e2e test suite.

### 3.2 Where AI shortened the work (reflection — 10%)

Concrete, commit-anchored examples:

- **Function-for-function engine port in one evening.** Translating a validated
  mortgage simulator into a clean, typed engine (amortization, indexation, risk,
  the tuner) would be days of careful work by hand; with AI it was hours
  (`5e1a730` → `86078c8`, same night).
- **Whole-stack scaffolding.** The Next.js App Router structure, Supabase schema,
  server actions, and RLS policies were generated as a coherent set rather than
  assembled piecemeal (`86078c8`, `c02e113`).
- **Mechanical breadth.** 13 migrations, ~20 components, Hebrew RTL styling, charts
  — the repetitive surface area where AI is fastest.
- **Audit → fix loops.** I had the AI *audit* the running app, list the breaks,
  then fix them (`aedbc84` "reproduce and document end-to-end breaks (pre-fix)" →
  the fixes that followed). That review-then-repair loop is much faster than
  manual QA.

**One honest line:** *"AI removed the typing time, not the thinking time. I still
had to decide the architecture, resolve the business rules, and insist on tests."*

### 3.3 How AI helped with technical challenges (reflection — 5%)

- **Trusting ported math → the parity oracle.** The risk with AI-generated math is
  it *looks* right. I had the AI build a golden battery of 140 cases and a test
  that compares every number to a frozen reference within 1e-9. That turned "trust
  me" into "prove it." (See §5.)
- **Correct access control → RLS, not UI checks.** Instead of scattering
  permission `if`s, the AI helped express access as database policies
  (`app_role()`, `can_access_request()`), so security is enforced at the data
  layer. The e2e suite then *verified* it end-to-end and caught a real gap
  (`cd4b9ed`).
- **Next.js server/client boundary.** Keeping heavy per-month schedules on the
  server and shipping only small projections to the browser was a subtlety the AI
  helped get right (the `toClockCardData` shrink).
- **Hebrew RTL + numeric formatting.** A class of fiddly bugs (direction, shekel
  formatting) handled quickly.

### 3.4 The method (say this — it's the course's whole point)

*"My workflow was: (1) source the truth (a validated reference for the math, a
design mockup for the UX); (2) have the AI implement in phases; (3) gate every
phase behind verification — a parity test for math, e2e tests for flows, strict
types and lint for the code. AI was the implementer; I was the architect and the
QA."*

---

## 4. The math — how I "fetched" it and how I use it

This is where you must sound fluent. Full derivations are in
`EXPLAINER_01_THE_PROJECT.md`; here's the defense version.

### 4.1 Where the math comes from

The mortgage math is **not invented** — it's the standard Israeli mortgage
calculation, taken from a **validated reference simulator** and reproduced exactly
by the engine. That's deliberate: for a money tool, "correct" means "matches a
trusted source," not "looks reasonable."

### 4.2 The formulas you should be able to explain

- **Monthly payment (Spitzer annuity):** `PMT = r·PV / (1 − (1+r)^−n)`, where `r`
  is the monthly rate, `n` the months, `PV` the loan. Intuition: interest on the
  whole loan, spread across `n` months by an annuity factor. *Worked:* ₪1,000,000
  at 4.62%/yr for 25 yrs → ≈ ₪5,627/month, ≈ ₪688k total interest.
- **Amortization:** each month, interest = balance × r, principal = payment −
  interest; the balance falls until it hits zero at month `n`.
- **Index linkage (inflation):** a CPI-linked track's balance grows by
  `annualCPI/12` each month (linear, by design). This is the "indexation" number.
- **A mix:** several tracks; its monthly payment is the **sum** of the tracks'
  payments; its risk is the **share-weighted average** of their risks.
- **The tuner (the clever bit):** a template only fixes *shares and kinds*; the
  engine searches each track's *term* so the mix's first payment lands in the
  borrower's budget — that's why all five clocks are comparable at the same monthly
  feel.

### 4.3 How I use it in the app

DB holds the market rates and the five templates → a bridge (`engine-config.ts`)
injects live rates and calls the pure engine → the engine returns each clock's
numbers and full schedule → the UI shows payment/total/risk and draws charts from
the *real* schedule. Change a rate in the DB and everything reprices.

**Say it like this:** *"I can show you the payment formula, the amortization loop,
and the tuner. None of it is hand-waved — every number on screen traces back to
`lib/engine`, and `lib/engine` is locked to a validated reference."*

---

## 5. 10% — Five verification clauses (הטמעת 5 סעיפי וריפיקציה)

Five real, independent verification layers in the project. Be able to name and
demo each.

1. **Parity gate (the engine's proof).**
   `lib/engine/__tests__/parity.test.ts` runs a **140-case golden battery**
   (route/mix/risk/tune) through the engine and compares **~167,000 numbers** to a
   frozen `golden.json`, allowing only floating-point noise (≤ 1e-9). If any money
   number drifts, the build fails. *Demo:* `npm test`.

2. **End-to-end journey tests (the flow's proof).**
   Playwright specs (`e2e/`) walk the real app — questionnaire, calculators,
   document upload, registration — including a **77-check full-journey suite** that
   once caught an RLS visibility bug. *Demo:* `npm run test:e2e`.

3. **Runtime input validation (the API's proof).**
   Every API body is parsed with **zod** schemas (`lib/api-schemas.ts`); bad input
   returns a 422 with issues instead of corrupting a calculation. Plus
   **rate limiting** (`lib/rate-limit.ts`) on the public endpoints.

4. **Database-enforced access control (the security proof).**
   **Row-Level Security** on every table (`0007_rls_hardening.sql`) via
   `app_role()` / `can_access_request()`: a client reads only their rows, an
   advisor only assigned clients, config is admin-write-only. Enforced by Postgres,
   verified by the e2e suite.

5. **Type + lint + build gate (the code's proof).**
   **TypeScript strict**, **ESLint**, and a green **production build** are required
   before deploy. *Demo:* `npm run lint` · `npm run build`.

*(Bonus you can mention: the regulatory `rules.ts` validations — LTV, equity, DTI,
age — are themselves a verification layer that blocks infeasible loans before any
clock is drawn.)*

---

## 6. Likely questions → crisp answers

- **"Did you write the math yourself?"** *"I sourced it from a validated reference
  and reproduced it exactly, then proved the match with a 140-case parity test. For
  a money tool that's safer than deriving it from scratch."*
- **"How do you know the numbers are right?"** *"The parity gate — 167k numbers
  checked against a frozen oracle to 1e-9. It fails the build if anything drifts."*
- **"What did the AI actually do vs. you?"** *"AI implemented; I architected and
  verified. I chose the stack, the data model, and the business rules, and I gated
  every change behind tests."*
- **"What's the hardest technical part?"** *"Trusting generated math and getting
  access control right. I solved both by not trusting output on faith — a parity
  test for the math, database-level RLS plus e2e tests for security."*
- **"Why is insurance a stub?"** *"No official tariff tables exist, so it ships as
  clearly-labeled demo estimates. I'd rather be honest than fake premiums."*
- **"What would you add next?"** *"Real payments (Stripe), balance-PDF parsing, and
  post-execution mortgage tracking — all scoped and deferred, not forgotten."*

---

## 7. Live-demo command sheet

```bash
git log --reverse --pretty=format:'%h %ad %s' --date=format:'%m-%d %H:%M'  # the build story
npm test            # parity gate (engine correctness)
npm run test:e2e    # end-to-end flows
npm run lint        # code quality gate
npm run build       # production build gate
npm run dev         # run locally → walk the 5-clock demo
```

---

## 8. What to still prepare (your to-do)

- [ ] Add the chat screenshots from §3.1.
- [ ] If you have the requirements doc, map each requirement → commit for an exact
      הספק %.
- [ ] Rehearse the 5-minute demo (§2.1) until it's smooth.
- [ ] Be able to write the PMT formula and explain the tuner on a whiteboard.
- [ ] Run the command sheet (§7) once beforehand so it's warm in the room.
