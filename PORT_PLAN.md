# PORT_PLAN.md — SimpleSave: Python → Next.js (TypeScript) + Supabase

Maps the existing Python implementation (the *specification*) to its Next.js
destination. The Python stays on disk until parity is green (Phase 2) and the
build is complete; it is deleted only in Phase 6.

Target stack: Next.js 16 (App Router) · TypeScript strict · Tailwind v4 ·
Supabase (Postgres + Auth) via `@supabase/supabase-js` + `@supabase/ssr` ·
Recharts · Vitest · Hebrew RTL.

Supabase project: **Mortgage Advisor** (`yykciskiajsjurrmulcy`, eu-west-1, PG17).

---

## Phase 1 — Engine (pure functions, `lib/engine/`)

Function-for-function port. Numbers must match Python exactly (Phase 2 gate).

| Python (`src/simplesave/engine/`) | TypeScript (`lib/engine/`) | Key exports |
| --- | --- | --- |
| `types.py` | `types.ts` | `Route`, `MarketParams`, `RouteResult`, `MixResult`, `RiskResult`, enums (Hebrew **values**) |
| `core.py` | `core.ts` | `num`, `pmt`, `jsRound`, `indexExpect`, `routeAnnualIndex`, `monthlyRate` |
| `route.py` | `route.ts` | `calcRoute` (Spitzer/equal-principal, balloon/grace, purpose split) |
| `mix.py` | `mix.ts` | `calcMix` |
| `risk.py` | `risk.ts` | `defaultRiskRules`, `riskRuleForRoute`, `mixRisk` |
| `tuning.py` | `tuning.ts` | `inferRouteKind`, `applyRouteKind`, `allowedYears`, `candidateYears`, `validateMixTemplate`, `shortenFixedRoutesToMaximum`, `calculateMixToRange` |
| `clocks.py` | `clocks.ts` | `CLOCK_KEYS`, templates, `generateAllClocks` |
| `validation.py` | `rules.ts` | LTV / equity / DTI / age (new-mortgage + refinance) |

### Numerical-fidelity rules (carry forward verbatim)
- **`jsRound`**: Python used `floor(x+0.5)`; on the JS runtime `Math.round` is
  native equivalent — use `Math.round`, verify against parity (don't assume).
- **`num()`**: loose parse → finite float, else 0.
- **Index linkage**: monthly = `annual_index / 12` (linear approximation, CLAUDE §3). NOT compound.
- **Hebrew enum values** kept verbatim (`'שפיצר'`, `'קרן שווה'`, `'מדד'`, `'פריים'`, `'אג"ח'` …) so data is byte-identical and the risk table matches.
- **1-indexed arrays**: `RouteResult` per-month arrays use index 0 as a zero placeholder; schedule runs `1..n`.
- **Annual index mode only** (the monthly-table branch is UI/state-only — dropped, as in Python).

---

## Phase 2 — Parity gate

- Reuse `tests/oracle/battery.py` (140 cases: route/mix/risk/tune) — the same
  battery the Python parity oracle uses.
- Dump Python golden outputs → `lib/engine/__tests__/golden.json` (run the
  battery through the Python engine; no hand-transcribing).
- `lib/engine/__tests__/parity.test.ts`: run the identical battery through the TS
  engine; assert match (1e-6 on money, exact on month counts & risk level).
- **Gate:** must be green before Phase 3.

---

## Phase 3 — Supabase (DB + auth)

Port `src/simplesave/db/models/` + what the admin/flow APIs imply. SQL migrations
under `supabase/migrations/`:

| Table | From | Notes |
| --- | --- | --- |
| `profiles` | `User` | role: client/advisor/admin (linked to `auth.users`) |
| `leads` | `Lead` | service_type, questionnaire/validation/clocks JSON |
| `requests` | `Application` | client/advisor, status, chosen clock, serviceStatus |
| `borrowers` | (new, from questionnaire) | per-request borrower profiles |
| `documents`, `authorizations`, `messages` | (flow) | doc status flow, sign-gating, advisor thread |
| `economic_params`, `rate_bands`, `clock_templates` | admin API + `ClockTemplateConfig` | manager-editable engine config |

Auth: Supabase Auth (email+password), 3 roles, **dev role switcher** (seeded demo
users, no email/OTP) per spec. `@supabase/ssr` for App Router sessions. RLS on.
Keys in `.env.local` (+ `.env.example`).

## Phase 4 — API routes (`app/api/`)

Mirror FastAPI JSON shapes, zod-validated, thin (math in `lib/engine`):
`POST /api/calculate`, new-mortgage (`/validate`,`/clocks`), refinance, insurance
(blocked — honest `available:false`), leads, personal, admin
(params/rates/templates/leads/assign).

## Phase 5 — UI (Hebrew RTL, mobile-first MVP)
Home, About · 3 service questionnaires (with conditionals: financing% by loan
type, age-85 cap, 38% DTI) · Clocks page (5 cards: first payment / total /
interest+indexation / risk gauge / detail→amortization chart) · personal area
(borrowers, mortgage data, documents, authorizations, messages) · advisor · admin
· checkout (mock). Recharts for charts + chosen-mix donut.

## Phase 6 — Cleanup
build/test/lint green → re-run parity → delete Python (`src/`, `tests/`,
`alembic*`, `pyproject.toml`, caches) → **keep `reference/`** → fresh `README.md`
+ file tree + "demo in 2 minutes".

---

## Decisions carried forward (do NOT silently change — CLAUDE/DECISIONS)
- **Clocks = reference templates verbatim**: clock4 == clock1, clock5 ≈ clock3
  (reference quirk) — kept, flagged via `duplicateOf` for the admin UI.
- **DTI 38%** (D-3) · **max age 85** new / **80** refinance (D-4/D-5; D-5 still OPEN).
- **Index mode annual** (`annual/12`).
- **Insurance & balance-PDF parsing stay blocked** (missing `insurance-rates.js`
  / `document-engine.js`) — no fabricated numbers (CLAUDE §8).

## Reuse note
A throwaway reference Next.js build exists at `~/simplesave-next` (Prisma/SQLite).
Stack-agnostic logic (engine math, Recharts gauge/chart, RTL design tokens) is
lifted from it; the data layer is rewritten for Supabase per this spec.
