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
