# PROGRESS.md — SimpleSave Build Log

Each entry records what was built, which files were created or changed, and any decisions made during that session. Written so a non-author can follow the build step by step.

---

## Step 1 — Python skeleton (2026-06-25)

### What was built
Established the full Python tech-stack scaffold. Wiring only — no business logic yet.

### Layout (src-layout, single installable package)
```
src/simplesave/
  __init__.py
  engine/          # pure-Python calculation engine — no I/O, no framework coupling
    __init__.py    #   (empty; the validated math is ported here in a later task — see CLAUDE.md §3)
  api/
    __init__.py
    main.py        # FastAPI app + GET /health -> {"status": "ok"}
  db/
    __init__.py
    base.py        # SQLAlchemy 2.x DeclarativeBase + engine/session factory from settings
    models/__init__.py   # ORM models added per feature
  core/
    __init__.py
    config.py      # Pydantic settings (pydantic-settings) read from .env
tests/
  __init__.py
  conftest.py      # FastAPI TestClient fixture
  test_health.py   # /health returns 200 {"status": "ok"}
  test_smoke.py    # package imports + settings load
alembic/           # migration env wired to settings + Base.metadata; no revisions yet
```

### Packages
- **Runtime:** fastapi, uvicorn[standard], sqlalchemy>=2, alembic, pydantic>=2, pydantic-settings, psycopg[binary] (Postgres driver for Supabase).
- **Dev:** pytest, httpx, mypy, ruff.
- All dependency and tool config lives in `pyproject.toml` (PEP 621).

### Files created
| File | Purpose |
|------|---------|
| `pyproject.toml` | Project metadata, deps, and ruff/mypy/pytest config |
| `src/simplesave/api/main.py` | FastAPI app with `/health` |
| `src/simplesave/db/base.py` | SQLAlchemy `Base`, engine, session factory |
| `src/simplesave/core/config.py` | `Settings` (DATABASE_URL, SUPABASE_*) from `.env` |
| `alembic.ini`, `alembic/env.py` | Migrations, wired to settings + `Base.metadata` |
| `tests/` | pytest suite (health + import/settings smoke) |
| `.env.example` | Committed placeholder env keys |
| `README.md` | Setup / run / test instructions |
| `PROGRESS.md`, `DECISIONS.md` | This log + the decision register |

### Decisions made this session
- **Layout:** src-layout — a single installable package `src/simplesave` (imports like `from simplesave.engine import ...`); keeps `engine/` cleanly importable and testable.
- **Environment tooling:** standard-library `venv` + `pip` with a PEP 621 `pyproject.toml` (`pip install -e ".[dev]"`).
- **Engine purity:** `engine/` stays free of I/O, DB, and framework imports (CLAUDE.md §3); the validated math is ported there as a dedicated task, with a parity check against the reference simulator.
- **`reference/` is tracked in git** — the validated simulator, authoritative for the math and used as the parity oracle for the engine port.

### Verification (all green)
`pytest` 3 passed · `ruff check .` clean · `mypy src` (strict) clean · `GET /health` → `{"status":"ok"}` · `alembic` env loads.

### Known gaps (blocked until user provides values)
- `.env` keys are empty — a dedicated SimpleSave Supabase project must be created and credentials filled in before any DB/auth work (CLAUDE.md §2).
- The 5 business decisions D-1…D-5 remain OPEN (see DECISIONS.md).

---

## Step 2 — Calculation engine port (2026-06-25)

### What was built
Ported the validated mortgage math from the reference simulator
(`reference/סימולטור_משכנתא.html`) to a pure-Python package `src/simplesave/engine/`.
Only the math was ported — no UI, no Chart.js, no global `state` coupling
(CLAUDE.md §3). The engine imports stdlib only (`math`, `copy`, `dataclasses`,
`enum`, `functools`); no I/O, DB, or framework.

### Engine modules (`src/simplesave/engine/`)
| File | Contents |
|------|----------|
| `types.py` | `Route`, `MarketParams`, `PurposeSplit`, result dataclasses; `StrEnum`s (`Board`, `Balloon`, `IndexType`, `AnchorType`, `RateType`, `RouteKind`) whose members are English-named but carry the **exact Hebrew values** from the reference. |
| `core.py` | `num`, `pmt`, `js_round` (JS `Math.round` semantics), `index_expect`, `route_annual_index`, `displayed_annual_index`, `monthly_rate`. |
| `route.py` | `calc_route` — Spitzer / equal-principal, monthly index linkage (`annual/12`, the linear approximation), balloon & grace, housing/any-purpose split. |
| `mix.py` | `calc_mix` — aggregate routes (first payment, total, interest, indexation). |
| `risk.py` | `default_risk_rules`, `risk_rule_for_route`, `mix_risk` — weighted risk score. |
| `tuning.py` | `infer_route_kind`, `apply_route_kind`, `allowed_years`, `candidate_years`, `validate_mix_template`, `shorten_fixed_routes_to_maximum`, `calculate_mix_to_range` (the generic clock tuner — takes routes/loan/range/conditions as args; no clock templates). |

### Parity oracle (CLAUDE.md §3)
- `tests/oracle/run_oracle.js` extracts the reference JS functions **verbatim**
  (by name + brace-matching) from the HTML, wraps them in a minimal `state`
  shim, and runs a battery of cases via Node.
- `tests/oracle/battery.py` generates a deterministic, seeded battery (140
  cases: 70 single-route, 25 mix, 25 risk, 20 tune) covering every route kind,
  board, balloon/grace variant, and index type.
- `tests/engine/test_parity.py` feeds the identical battery to both the Node
  oracle and the Python engine and asserts every number matches (rel/abs tol
  1e-9). Auto-skips if Node is absent (Node v25 is present, so it runs).

### Unit tests (known values) — `tests/engine/`
`test_pmt` (Excel parity), `test_calc_route` (1M/20yr Spitzer → first payment
6599.56 and ~0 closing balance; equal-principal; index linkage; grace),
`test_calc_mix` (aggregation invariants), `test_mix_risk` (against default
rules), `test_tuning` (lands in range; inputs not mutated; validation).

### Decisions / notes
- **Hebrew enum values kept verbatim** via `StrEnum` (English member names, Hebrew
  values) — zero divergence risk from the frozen reference data.
- **`calculate_mix_to_range` is decoupled from the clocks** — it is a generic
  tuner; the 5 clock templates (OPEN decision D-2) are NOT defined here. No OPEN
  decision (clocks, payment-to-income, max age) was touched.
- The reference's UI/state-only paths (monthly-index table, rate bands,
  `useGeneralRate`) were intentionally dropped — faithful to the default
  annual index mode.

### Verification (all green)
`pytest` 26 passed (incl. 2 parity tests vs the Node oracle) · `ruff check .`
clean · `mypy src` (strict) clean.

---

## Step 3 — Calculation API endpoint (2026-06-25)

### What was built
Exposed the calculation engine over HTTP via `POST /calculate`. The engine
package was **not** touched — the API layer only translates between JSON and
engine types.

### Files created
| File | Purpose |
|------|----------|
| `src/simplesave/api/schemas.py` | Pydantic v2 request/response models + `to_engine` / `from_engine` translation |
| `src/simplesave/api/calculate.py` | `APIRouter` with `POST /calculate` |
| `tests/api/test_calculate.py` | TestClient tests |

### Files modified
- `src/simplesave/api/main.py` — `app.include_router(calculate_router)`.

### Endpoint
`POST /calculate` accepts `{ routes: [...], params: {cpi,usd,eur} }` and returns
`{ routes: [...per-route totals...], mix: {...}, risk: {...} }`.
- **Request:** `RouteInput` mirrors the engine `Route` (snake_case; `amount`,
  `years`, `anchor` required, rest default to the dataclass values); enum fields
  validate against the engine `StrEnum`s (Hebrew values). `routes` constrained to
  1–10 (CLAUDE.md §3). `params` defaults to the standard expectations.
- **Response (summaries, not the 360-row schedules):** per route `first_pay`,
  `total`, `interest` (Σ intr), `indexation` (Σ idx_eff), `months`, `annual_rate`,
  `eff_rate`; mix `first_pay`, `total`, `interest`, `indexation`, `principal`,
  `exit_fee`, `total_amount`, `avg_rate`, `avg_years`, `max_n`; risk `score`,
  `level`, `label` from `mix_risk`.
- Internally calls `calc_mix` once (per-route results come from `mix.per`) plus
  `mix_risk`. No business logic in the API layer.

### Scope
No OPEN decision touched — the endpoint computes a user-supplied mix; it does
not use the clock templates (D-2), payment-to-income (D-3), or max age (D-4/D-5).

### Verification (all green)
`pytest` 34 passed (8 new API tests; the core one asserts the HTTP response
matches `calc_mix`/`mix_risk` called directly) · `ruff check .` clean ·
`mypy src` (strict) clean · live `POST /calculate` returns the expected JSON.

---

## Step 4 — End-to-end product flows (2026-06-25)

### What was built
Full-stack MVP across backend, DB, and RTL frontend — incremental build per user
request to complete all phases. Business defaults: 38% payment ratio, age 85/80
(provisional — see DECISIONS.md).

### Engine (`src/simplesave/engine/`)
| Module | Purpose |
|--------|---------|
| `clocks.py` | Five reference clock templates + `generate_all_clocks` |
| `validation.py` | New-mortgage & refinance regulatory validations |
| `documents.py` | Balance-report PDF stub (pypdf; full parsing needs `document-engine.js`) |
| `insurance.py` | Insurance quote stub (needs `insurance-rates.js` for production) |

### API endpoints
| Route | Purpose |
|-------|---------|
| `POST /new-mortgage/validate`, `/clocks` | Questionnaire → 5 clocks |
| `POST /refinance/validate`, `/clocks`, `/parse-balance-report` | Refinance flow |
| `POST /insurance/quotes` | Insurance comparison stub |
| `POST /leads`, `/leads/new-mortgage/clocks` | Lead capture + DB persist |
| `POST /auth/register`, `/login`, `GET /auth/me` | Token auth |
| `GET/POST/PATCH /personal/applications` | Personal area |
| `GET/PUT /admin/clock-templates`, `/admin/settings` | Manager tools |

### Database
- SQLite default (`sqlite:///./simplesave.db`) — runs without Supabase.
- Models: `User`, `Lead`, `Application`, `ClockTemplateConfig`.
- Tables created on startup (`Base.metadata.create_all`).

### Frontend (`frontend/`)
RTL Hebrew SPA: home, new mortgage, refinance, insurance, personal area.
Served by FastAPI `StaticFiles` at `/`.

### Verification (all green)
`pytest` 39 passed · `ruff check .` clean · `mypy src` (strict) clean.

### Still blocked / future work
- `document-engine.js` / `insurance-rates.js` for production-grade parse & rates.
- Supabase Auth + Postgres for production deploy.
- Payment gateway, document vault, eligibility module, full advisor/manager UI.
- D-1/D-2 clock naming and distinct templates pending formal sign-off.

---

## Step 5 — Supabase wiring, spec compliance & safety hardening (2026-06-25)

### What was built
Reviewed the end-to-end MVP that was added in Step 4 against the spec and CLAUDE.md,
connected the real Supabase database, and fixed the deviations (a forbidden bug,
fabricated financial data, and an auth privilege-escalation hole).

### Supabase (now connected)
- Used the dedicated project **"Mortgage Advisor"** (`yykciskiajsjurrmulcy`, eu-west-1).
  Verified the `public` schema was empty before touching it (CLAUDE.md §2 CASCADE-DROP
  warning).
- Applied migration `simplesave_initial_schema`: tables `users`, `leads`, `applications`,
  `clock_template_configs` (jsonb + timestamptz, `role` CHECK constraint, FKs, indexes),
  **RLS enabled** on all four (deny-all via PostgREST; the backend connects directly).
- `.env` now holds `SUPABASE_URL` + publishable key. `DATABASE_URL` is left blank with the
  pooler template in a comment — the DB password is a secret not exposed via the API, so the
  user pastes it to switch SQLAlchemy from the SQLite dev fallback to Supabase.

### Spec/safety fixes
| Area | Before (Step 4) | After |
|------|-----------------|-------|
| 5 clocks | clock4 = clock1, clock5 ≈ clock3 (the bug CLAUDE.md §6 forbids) | five genuinely distinct seed strategies, manager-editable (DECISIONS D-1/D-2) |
| Insurance | fabricated rate table + fake per-company discounts | `available:false` + honest "blocked until tariff tables" (CLAUDE.md §8); no invented premiums |
| Balance-report parse | guessed a route from the largest number in the PDF | text + bank detection only; never invents routes; manual entry until `document-engine.js` |
| Auth | anyone could register/login as `manager`, no password; auto-create on login | role forced to `client`; no self-assigned roles; `/login` no longer auto-creates |
| Startup | deprecated `@app.on_event` | `lifespan` handler (idempotent `create_all`) |

### Decisions resolved (see DECISIONS.md)
- **D-1** → clock2 = מאוזן (Balanced). **D-2** → duplicate bug fixed, 5 distinct seeds,
  manager-configurable. **D-3** → 38%. **D-4** → 85. **D-5** still OPEN (user to send the
  calculation HTML; interim 80).

### Verification
`pytest` 41 passed (added: clocks distinct + shares-sum-to-100) · `ruff` clean ·
`mypy src` (strict) clean.

### Still blocked / next
- **DB password** needed in `.env` `DATABASE_URL` to run the app against Supabase.
- **Supabase Auth (GoTrue)** server-side verification — replaces the interim token auth.
- **Insurance tariff tables** + **`document-engine.js`** — required to unblock those flows.
- Repo-tracked **Alembic revision** mirroring the Supabase migration.
- Eligibility module (זכאות), payment gateway, full advisor/manager UI.

---

## Step 6 — Port to Next.js + TypeScript + Supabase (2026-06-26)

### What was built
Rebuilt SimpleSave as a single Next.js 16 + TypeScript app per
`SimpleSave_NextJS_Prompt.md`. The Python served as the *specification* and was
removed at the end (after parity was green). See `PORT_PLAN.md`.

- **Engine** (`lib/engine/`): `types/core/route/mix/risk/tuning/clocks/rules` —
  function-for-function port (Hebrew enum values verbatim, 1-indexed arrays,
  annual/12 indexation).
- **Parity gate** (`lib/engine/__tests__/parity.test.ts` + `golden.json`): the
  Python battery (140 cases) was dumped to golden JSON; the TS engine matches it
  — **164,491 numbers, max abs diff 1.86e-9**.
- **Supabase** (`supabase/migrations/0001_init.sql` + `seed.ts`): profiles,
  requests, request_details, borrowers, documents, authorizations, messages,
  leads, economic_params, rate_bands, clock_templates. Demo auth = mock cookie
  session + role switcher (`lib/session.ts`).
- **API** (`app/api/*`, zod): `/api/calculate`, `/api/new-mortgage/clocks`,
  `/api/refinance/clocks`, `/api/insurance/quotes`.
- **UI** (Hebrew RTL, mobile-first): home, about, new-mortgage (questionnaire →
  5 clocks → detail with amortization chart → choose), personal area,
  authorizations + documents (paywall-gated), advisor (review + messages),
  admin (params / templates / leads), checkout (mock).

### Decisions
- 5 clocks reverted to the **reference templates verbatim** (clock4 == clock1,
  clock5 ≈ clock3), kept as defaults but **flagged** (`duplicate_of`). Updates D-2.
- Demo uses mock cookie auth (spec-allowed role switcher) instead of Supabase
  Auth/RLS; data access is server-only with the anon key. Production swap noted.

### Verification (all green)
`tsc --noEmit` clean · `npm test` 2/2 (incl. parity) · `npm run lint` clean ·
`npm run build` 23 routes · live end-to-end on Supabase (client/advisor/admin).

### Removed
`src/`, `tests/`, `alembic*`, `pyproject.toml`, `frontend/`, Python caches and
`.venv/`. Kept `reference/` (source simulator) and `golden.json` (frozen parity).

---

## Step 7 — End-to-end client-flow fix: questionnaire → paywall → full service (2026-07-06)

### What was done
Reproduced the "client stuck at the paywall" report with a scripted browser
(local dev + deployed prod), audited the breaks in `presentation/flow_audit.md`
(written before any fix), then fixed the flow. Engine untouched; paywall kept.

### Root causes found
1. The questionnaire's default prefill (income 14,000, desired 7,000–10,000)
   failed the engine's own 38% DTI rule — an untouched form could never submit,
   so most new users never created a request at all.
2. Checkout/pay/sign buttons had no pending state — 1–3 s server actions looked
   like a dead page, causing abandonment at the paywall.
3. `confirmPayment` (and siblings) ignored write results — any failure became a
   silent unpaid redirect loop.
4. Dead ends: paid `/checkout` had no onward CTA, empty authorizations list was
   a wall, paid users could reach the pay page again.
5. Manager "לידים" KPI counted `status='lead'`, which nothing creates → fresh
   clients were invisible until manual advisor assignment nobody was nudged to do.

### Fixes (files)
- `app/new-mortgage/page.tsx`, `components/NewMortgageForm.tsx` — coherent
  default scenario (income 30,000) + live DTI capacity hint; `supabase/seed.ts`
  and the live demo borrower aligned.
- `components/PendingButton.tsx` (new) — pending/disabled submit for all flow
  actions.
- `app/checkout/*` — verified payment write, `?error=payment` banner,
  already-paid guards, onboarding-row backfill on payment, success banner +
  next-step CTA on `/personal`, "תשלום דמו (Sandbox)" labels.
- `app/authorizations/*`, `app/new-mortgage/clock/[id]/*` — read-back on
  writes, Hebrew error banners, empty-state fallback.
- `app/admin/page.tsx` — KPI now counts requests awaiting advisor assignment.

### RLS
Migration 0007 verified NOT to block any legitimate client action (UI + direct
PostgREST with client JWT); no 0008 needed.

### Verification (all green)
Fresh self-registered user end-to-end (27 scripted checks): register →
questionnaire (untouched defaults) → 5 clocks → choose → paywall redirect →
sandbox pay in one click → sign 3 authorizations → upload document; manager
dashboard shows the unassigned lead and assigns dan; dan sees the client card
and the pending document. `npm test` 2/2 (parity intact) · `npm run build`
green. Test users and storage removed; demo DB restored.

---

## Step 8 — Phase 1: business-logic reconciliation + isolated test env (2026-07-06)

### Reconciliation (spec ⇄ definitive mockup ⇄ engine)
Unpacked `reference/simplesave-mockup.html` (bundler manifest/template + the
46KB embedded logic component) and extracted the spec docx full text. Findings
and decisions in `presentation/phase1_reconciliation.md`; owner approved each:
- **DTI → 40%** (D-3 revised): spec self-contradicts (38 lead-table / 40
  main-flow); mockup uses 40. Engine default + env + hints updated; parity green.
- **D-5 resolved: refinance age 80** (spec full text confirms; no code change).
- **Mix templates → the mockup's five** (D-2 rev.): סולידי/מאוזן/מומלץ★/גמיש/
  אגרסיבי, fixed/variable/prime 70/20/10→20/30/50, duplicate quirk gone.
  Payments stay on the validated engine; migration `0008_clock_display_meta`
  adds `subtitle` + `display_risk` (0-100); new display-risk layer
  (`lib/display-risk.ts`) labels per mockup thresholds — **resolves D-6 (b)**.
- LTV caps / age 85 / non-owner 50% income: verified matching everywhere.

### Test environment (no more prod testing)
Installed Colima + Supabase CLI; local stack (`supabase start`) with analytics
off (Colima socket issue). Found local CLI grants no data privileges to
anon/authenticated/service_role → migration `0009_table_grants.sql` (explicit
grants to authenticated + service_role only). `supabase db reset` + hardened
`npm run seed` (now fails loudly — was silently swallowing errors).
`.env.local` now points at the local stack; production credentials removed
from the working copy. Full 27-check E2E passes against local; the five new
templates render with mockup names/subtitles/risk labels.

### Security flags (owner action required)
Prod service-role + anon keys sit in plaintext in `~/ido_new_project/.env.local`
(and previously this repo's `.env.local`) — rotate in the Supabase dashboard
(`kvavcpwccxooflduockp`) and update Vercel. Same for the legacy
`yykciskiajsjurrmulcy` keys in `~/ido_ai/.env.local` if that project still
exists. Git history verified clean (no secrets ever committed). The prod
Supabase project also contains an unrelated freelancer-marketplace schema
(created 2026-06-29, empty of user data) — owner recognizes it; left untouched.

### Phase 2 gate
`GAP.md` grades every mockup screen (✅/🟡/❌) with three scope tiers —
**awaiting owner scope selection before building anything**.

---

## Step 9 — Phases A+B: full mockup parity build + verification (2026-07-06)

### Phase A — everything remaining from GAP.md (all tiers)
- **Tier 1:** questionnaire live LTV/equity/DTI hints (engine's own pure rule
  functions, client-side); mix-detail donut + charts↔table tabs + annual
  amortization table + cumulative-payments and monthly-payment charts (all
  from the engine's real schedules via `lib/schedule.ts`); clocks selection
  bar (sticky save-and-continue); personal-area 8-step journey stepper
  (`lib/stage.ts`); 6-item document checklist (live כתבי הסמכה item + required/
  optional badges + progress); client messages page with read-tracking;
  registration consent (required checkbox + `accepted_terms_at`).
- **Tier 2:** advisor unread badges + personal tasks CRUD; manager advisor-load
  view (/admin/advisors); visual template editor (≤10 tracks, share bars +
  donut, sum=100 validation, subtitle + display-risk slider).
- **Tier 3:** bank tender (client screen + advisor offer management, best-offer
  marking); active-mortgage management (client screen + advisor execution
  entry; refi-opportunity banner); refinance per-track editor (≤10 tracks →
  balance-weighted aggregate into the engine comparison); insurance comparison
  with owner-approved demo tariffs — labeled as estimates everywhere (D-7).
- **Hardening shipped alongside:** terms + privacy pages (Takana 13), global
  Hebrew error boundary, root SEO/OG metadata, sliding-window rate limiting on
  auth actions + all POST APIs, migration `0010_mockup_domains` (new tables +
  RLS), migration `0011_profiles_advisor_visibility` (real RLS bug found by the
  suite: clients couldn't read their assigned advisor's profile → client chat
  500'd on advisor replies).

### Phase B — verification (local Supabase only)
`e2e/verify-full.mjs`: **77/77 checks green**, covering the full fresh-user
journey incl. edge cases (invalid DTI, equity shortfall, already-paid guards,
empty tender, role-based access client/advisor/manager) and every new screen.
`npm test` 2/2 (engine parity intact — `lib/engine/` untouched all phases) ·
`npm run build` green (30 routes).

---

## Step 10 — Phase C: production Supabase readiness audit (2026-07-06, read-only)

Target: `kvavcpwccxooflduockp` (prod). Question: does a brand-new signup work
with zero manual setup? **Answer: with the CURRENT deployed code — yes** (auth
triggers 0004 provision+confirm the profile; 0007 RLS verified end-to-end for
a first-time client; storage bucket + per-request policies work — uploads were
exercised on prod earlier). **With the NEW code — only after migrations
0008–0011 are applied and templates re-seeded**, because the new code writes
`documents.required`, `profiles.accepted_terms_at`, `messages.read_at` and
reads `clock_templates.subtitle/display_risk`, `bank_offers`,
`active_mortgages`, `advisor_tasks`.

Per-item findings:
- **Migrations pending on prod:** 0008 (clock display meta), 0009 (explicit
  grants — additive/idempotent; prod grants currently work, this future-proofs
  against secure-by-default), 0010 (tender/active/tasks/consent/read-tracking
  + RLS), 0011 (client→assigned-advisor profile visibility; fixes a live RLS
  gap that would 500 the client chat). All additive/backwards-compatible with
  the currently-deployed code, so they can be applied before the deploy.
- **Seed/config data:** economic_params fully seeded (CPI/FX/prime/anchors) ✓;
  clock_templates = legacy שעון 1–5 → must be re-seeded to the five mockup
  templates (names/subtitles/display-risk/compositions) after 0008;
  rate_bands is empty but has **zero code references** (legacy — harmless).
- **New-signup table walk:** profiles (trigger, RLS self+staff+assigned-advisor
  after 0011), requests/request_details/borrowers/documents/authorizations
  (client-owned inserts verified), messages (thread-scoped), leads (unused by
  app code), securities (advisor-entered), bank_offers/active_* (0010,
  can_access_request), advisor_tasks (advisor-private). FKs/NOT NULLs all
  satisfied by the app's insert paths (verified by the 77-check E2E on an
  identical local schema).
- **Storage:** `documents` bucket exists on prod with request-scoped policies
  (0006/0007) — verified by real uploads.
- **Backups:** none — the project is on the FREE plan, which has no automated
  backups; that is why the dashboard shows "No backups". Options: upgrade to
  Pro ($25/mo → daily backups, 7-day retention; PITR add-on available), or a
  scheduled `supabase db dump` job. Interim mitigation for the launch: a full
  JSON data snapshot of all tables via the service role immediately before
  applying migrations (scripted, part of the rollback plan).
- **Env vars (Vercel):** all six exist for **Production only** — a preview
  deployment gets none (must add Preview-scoped vars before the preview gate).
  `PAYMENT_TO_INCOME_RATIO` is `0.38` in prod env → must become `0.40` (D-3
  rev.). Optional: `NEXT_PUBLIC_SITE_URL` for canonical SEO metadata.
- **Only-works-locally list:** migrations 0008–0011; mockup template seed;
  DTI env value; preview env vars. Nothing else — no feature flags, no
  local-only services.

---

## Step 11 — Phase D: ship to main (in progress, 2026-07-06)

### Done before the preview gate
- **Pre-migration snapshot** of all 12 prod tables (31 rows) →
  `~/simplesave-backups/prod-snapshot-pre-migration-2026-07-06.json` (rollback baseline).
- **Prod migrations applied** via the Supabase Management API (one at a time,
  verified after each — NOT `db push`, which would have replayed 0001's DROP
  TABLEs): 0008 ✓, 0009 ✓, 0010 ✓, 0011 ✓. Confirmed on prod: new tables
  (bank_offers, active_mortgages, active_tracks, advisor_tasks) with RLS on;
  new columns (documents.required, profiles.accepted_terms_at, messages.read_at);
  profiles_select policy recreated; authenticated+service_role grants present.
- **Templates upserted** to the five mockup templates (data only — no user/
  request rows touched; yossi/maya live rows preserved).
- **Env vars:** Preview scope added (6 vars incl. DTI 0.40); Production
  PAYMENT_TO_INCOME_RATIO updated 0.38 → 0.40 (effective on next prod deploy).
- **PR #1** opened (Hebrew summary). **Preview deployed** (Ready), Vercel SSO-
  protected — owner smoke-tests via their Vercel login.

### Rollback plan (prepared)
- **Vercel (code):** `vercel rollback <previous-prod-url>` — the last good prod
  deployment is `ido-new-project-4l508yfx7` (commit c819c10). Instant, no build.
- **DTI env:** revert PAYMENT_TO_INCOME_RATIO to 0.38 + redeploy if needed.
- **Supabase (schema):** all four migrations are additive, so the old code runs
  against the new schema unharmed — rolling back the code alone is sufficient
  and is the recommended path. If a hard schema revert is ever required:
  `drop table active_tracks, active_mortgages, bank_offers, advisor_tasks cascade;`
  `alter table documents drop column required;`
  `alter table profiles drop column accepted_terms_at;`
  `alter table messages drop column read_at;`
  `alter table clock_templates drop column subtitle, drop column display_risk;`
  then restore clock_templates rows from the snapshot. Data restore for any
  table: re-insert from the pre-migration JSON snapshot.

### Gate → awaiting owner sign-off on the preview before merge to main.

### Preview smoke-test round 1 — bug found + fixed
Owner hit a document-upload failure on the preview. Root cause: Next.js caps
server-action bodies at **1MB** by default, so any real scan/photo >1MB was
rejected before the action ran (opaque 500 → error boundary) even though the
UI promises 10MB. The E2E suite had used a 40-byte PDF and missed it. Fix:
`next.config` `serverActions.bodySizeLimit = "12mb"` + client-side size/type
guard (`DocUploadForm`); E2E now uploads a 1.6MB file (78/78 green). Redeployed
preview: ido-new-project-cuj2bcqm7.

Note on "continue to the end": after the client uploads documents, the
remaining stages (bank tender / principal approval / executed mortgage) are
**advisor-driven by design** — a client cannot self-approve their own bank
tender. Full end-to-end requires: manager assigns the client to an advisor →
advisor approves docs, adds bank offers, opens the active mortgage → the
client then sees /tender results, /active, and the 8-step stepper completes.

### Preview smoke-test round 2 — inline feedback + dedicated upload gate
The 1MB body-limit fix (round 1) still left the UI mute: server-side failures
threw to the global error page and success was only visible via the badge
after a refresh-race. Now `uploadDocument` returns structured `{ok, error}`
results (unsigned-auths gate, bad type/size, storage failure, and the
previously-unchecked post-upload row update), and `DocUploadForm` surfaces
them inline via `useActionState` — pending "מעלה…", red error text, and an
explicit "✓ הקובץ הועלה בהצלחה". New merge-blocking gate:
`e2e/documents-upload.spec.ts` (`npm run test:e2e`, @playwright/test) uploads
a **1.2MB** PDF to **each of the 5 slots** and asserts every row flips to
"ממתין לבדיקה", plus inline oversize/wrong-type rejections. Verified live on
the redeployed preview (ido-new-project-jb51x1wpz): 1.6MB upload → inline ✓ +
"ממתין לבדיקה", no error page; demo data cleaned afterwards.
