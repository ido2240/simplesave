# SimpleSave — Port to Next.js (TypeScript) with Supabase

## Context for you (Claude Code)

There is an existing, working Python implementation of SimpleSave in this repo
(FastAPI + a pure calculation engine under `src/simplesave/engine/`, with 41
passing tests and a parity oracle that validates it against the original
reference simulator `reference/סימולטור_משכנתא.html`).

**The goal is to rebuild SimpleSave as a single, clean Next.js 16 + TypeScript
project — as if it had been designed that way from the start.** The Python is
the *specification* you port from, NOT a layer to wrap. The final deliverable
must contain no Python and no FastAPI.

**Critical rule: the Python stays on disk during the whole port so you can run
parity checks against it. You only delete it at the very end, after parity is
green. Do not delete it before then.**

This is a student project that the author must be able to explain line by line.
Favour clarity over cleverness. No dead code, no unused dependencies, no
"enterprise" abstractions that aren't needed. Every file should be something a
person could defend in an oral exam.

---

## Target stack

- Next.js 16 (App Router) + TypeScript (strict)
- Tailwind CSS v4
- Supabase (Postgres) for database + auth — NOT SQLite, NOT Prisma+SQLite
- Use the Supabase JS client (`@supabase/supabase-js`) and `@supabase/ssr` for
  auth in the App Router
- Recharts for the amortization / clock charts
- Vitest for tests
- RTL Hebrew UI (the app is Hebrew-first; `dir="rtl"` on `<html>`)

---

## Phase 0 — Read before you write

1. Read `src/simplesave/engine/*.py` in full. This is the math you are porting:
   `core.py` (pmt, js_round, num, indexation), `route.py` (calc_route —
   Spitzer & equal-principal boards, balloon/grace, purpose split), `mix.py`
   (calc_mix), `risk.py` (mix_risk + the Hebrew risk-rule table),
   `tuning.py` (calculate_mix_to_range — the tuner that produces the clocks),
   `clocks.py` (the 5 clock templates), `types.py` (the data model — note the
   enums whose *values* are Hebrew literals).
2. Read `src/simplesave/api/*.py` to see the request/response shapes and the
   endpoints that exist (calculate, new_mortgage, refinance, insurance, leads,
   auth, personal_area, admin).
3. Read `CLAUDE.md`, `DECISIONS.md`, `PROGRESS.md` — they record the
   reference's known quirks (e.g. clock4 == clock1, monthly vs annual index
   mode) and open business decisions. Carry those decisions forward; don't
   silently "fix" them.

Do not start writing TypeScript until you've done this and written a short
`PORT_PLAN.md` mapping each Python module to its TypeScript destination.

---

## Phase 1 — Engine port (the heart — get this exactly right)

Port the pure engine to `lib/engine/` in TypeScript, **function for function**:

| Python | TypeScript |
| --- | --- |
| `engine/types.py` | `lib/engine/types.ts` |
| `engine/core.py` | `lib/engine/core.ts` |
| `engine/route.ts` | `lib/engine/route.ts` |
| `engine/mix.py` | `lib/engine/mix.ts` |
| `engine/risk.py` | `lib/engine/risk.ts` |
| `engine/tuning.py` | `lib/engine/tuning.ts` |
| `engine/clocks.py` | `lib/engine/clocks.ts` |

Numerical-fidelity rules — these are the things that silently break a port:

- **`js_round`**: Python used `math.floor(x + 0.5)` specifically because
  Python's built-in `round` is banker's rounding and diverges from JS
  `Math.round`. In TypeScript you are now *on* the JS runtime, so the reference
  semantics are native — but be deliberate: use `Math.round` where the Python
  used `js_round`, and verify it matches, don't assume.
- **`num()`**: replicate the loose parse-to-finite-float-or-0 behaviour.
- **Index linkage**: monthly as `annual_index / 12` (the linear approximation
  the reference uses — see CLAUDE.md §3). Don't switch to compound.
- **Hebrew string enums**: keep the exact Hebrew values (`'שפיצר'`,
  `'קרן שווה'`, `'מדד'`, `'פריים'`, etc.) as the serialized values so the data
  is byte-identical to the reference and the risk table still matches.
- **1-indexed arrays**: the per-month arrays in `RouteResult` use index 0 as a
  zero placeholder, schedule runs `1..n`. Preserve that.

The engine must be pure: no React, no Supabase, no I/O. It's just functions.

---

## Phase 2 — Parity gate (DO NOT SKIP — this is your safety net)

Before building any UI, prove the TypeScript engine returns the **same numbers**
as the Python engine.

1. Look at `tests/oracle/` and `tests/engine/test_parity.py` in the Python repo
   — there is already a battery of cases and an oracle runner. Reuse those exact
   input cases.
2. Write a Vitest suite `lib/engine/__tests__/parity.test.ts` that runs the same
   battery through the TypeScript engine and asserts the outputs match the
   Python engine's outputs to a tight tolerance (e.g. 1e-6 on monetary values,
   exact on integer month counts and risk levels).
3. To generate the Python "golden" outputs to compare against: run the existing
   Python oracle/battery (it's already there) and dump its results to JSON, then
   load that JSON in the Vitest parity test. Don't hand-transcribe numbers.
4. **All parity tests must be green before Phase 3.** If they're not, fix the
   TypeScript engine — the Python is the source of truth.

Report the parity results explicitly (e.g. "battery of N cases, all within
tolerance") so the author can cite it.

---

## Phase 3 — Database & auth (Supabase)

Port the data model from `src/simplesave/db/models/` to Supabase. Create SQL
migrations under `supabase/migrations/` for: users (with roles
client/advisor/admin), leads, borrower profiles, mortgage requests, documents,
authorizations, messages, market params, rate bands, clock templates — match
what the Python models + admin API imply.

Auth: Supabase Auth with the three roles. For local development keep a simple
role switcher (the Python build used a mock login + role switcher during dev —
carry that convenience over so the app is demoable without real email/OTP).

Use `@supabase/ssr` for server-side auth in the App Router. Keep all Supabase
keys in `.env.local` (and provide `.env.example`). Never hardcode secrets.

---

## Phase 4 — API routes (App Router)

Recreate each FastAPI endpoint as a Next.js Route Handler under `app/api/`,
preserving the same request/response JSON shapes (so behaviour is identical):

- `POST /api/calculate` → calls `lib/engine` calcMix + mixRisk
- new-mortgage flow, refinance flow, insurance flow
- leads, personal area, admin (params, rates, templates, leads, assign)

Validate request bodies with zod (the TypeScript analogue of the Pydantic
schemas in `api/schemas.py`). Keep the engine call sites thin — all math lives
in `lib/engine`.

---

## Phase 5 — UI (Hebrew, RTL)

Build the screens described in the spec, reading the reference HTML
(`reference/סימולטור_משכנתא.html`) and `reference/SimpleSave-Design...` for the
intended look (blue/white/black, the "clocks" speedometer risk gauge, the
amortization charts). Screens:

- Home, About
- Three service entry flows: new mortgage / refinance / insurance, each a
  questionnaire matching the spec's question tables (with the conditionals and
  validations — e.g. financing % from loan type, age-85 cap, 38–40% payment cap)
- Clocks page: 5 clock cards (initial monthly payment, total payments,
  interest+indexation, risk gauge, "detail" → amortization chart)
- Personal area (client): profile per borrower, mortgage data, documents tab,
  principal-approval tab, securities tab, messages
- Advisor area, Admin area (leads, advisors, rate tables, clock templates,
  market params)
- Checkout (mock payment is fine for the demo)

Use Recharts for: per-clock monthly payment + cumulative principal/interest
charts, and the pie/donut of the final chosen mix.

---

## Phase 6 — Clean up & verify

1. Run `npm run build`, `npm test`, lint — all green.
2. Re-run the parity suite one final time.
3. **Only now**: delete the Python — `src/`, `tests/`, `alembic/`,
   `pyproject.toml`, `alembic.ini`, `.venv/`, `.python-version`, the Python
   caches (`.mypy_cache`, `.pytest_cache`, `.ruff_cache`), and the now-unused
   `reference_dump/`. **Keep** `reference/` (the source simulator + design spec)
   — it's documentation, not Python.
4. Update `CLAUDE.md` / write a fresh `README.md` describing the *Next.js*
   project: stack, Supabase setup, `npm install → supabase migration → seed →
   dev`, demo accounts, project structure, and the educational-demo disclaimer.
5. Print the final file tree and a short "how to demo in 2 minutes" section.

---

## Working style

- Commit after each phase with a clean message; author = ido2240.
- Keep a `PROGRESS.md` build log: one entry per phase — what was built, files,
  decisions, and a "verification (all green)" line.
- When a business rule is ambiguous, log it in `DECISIONS.md` and ask — don't
  guess.
- Hebrew is fine in commit messages and docs; code identifiers stay English.

Begin with Phase 0 now: read the engine and write `PORT_PLAN.md`. Do not write
any TypeScript until the plan is done.
