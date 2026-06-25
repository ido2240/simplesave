# CLAUDE.md — SimpleSave (Next.js stack)

> Permanent context for the SimpleSave project. Read in full before planning or
> writing code. The product rules live here and in `DECISIONS.md`; never guess a
> business rule — look it up or ask.

## What SimpleSave is
A Hebrew (RTL) web platform for the Israeli mortgage market. Three services —
**new mortgage**, **refinance**, **mortgage insurance** — and three roles:
**client**, **advisor** (יועץ), **manager/admin** (מנהל). Client flow:
lead → 5 "clocks" (mortgage-mix offers) → registration → personal area →
authorizations → documents → tracking.

UI is Hebrew RTL; code, file names, comments and commits are English.

## Tech stack (this is a single Next.js app — no Python)
- **Next.js 16** App Router + **TypeScript** (strict)
- **Tailwind v4** (RTL, Frank Ruhl Libre + Assistant)
- **Supabase (Postgres)** — server-only data access; demo auth is a mock cookie
  session + role switcher (`lib/session.ts`). Production: Supabase Auth + RLS.
- **Recharts**, **Vitest**, **zod**

> This project was ported from an earlier Python/FastAPI implementation. The
> Python is gone; `reference/סימולטור_משכנתא.html` (the validated source
> simulator) is kept as documentation, and `PORT_PLAN.md` records the mapping.

## The calculation engine (`lib/engine/`) — the heart
Pure functions, no React/Supabase/IO. Layers: `core` (pmt, num, jsRound,
indexation) → `route` (calcRoute: Spitzer / equal-principal, balloon/grace,
purpose split) → `mix` (calcMix) → `risk` (mixRisk) → `tuning`
(calculateMixToRange — generates the clocks) → `clocks` (5 templates) +
`rules` (LTV / equity / DTI / age).

**Numerical fidelity (do not break):** Hebrew enum *values* verbatim
(`'שפיצר'`, `'מדד'`, `'פריים'`…); 1-indexed per-month arrays; index linkage
monthly = `annual/12` (linear); `Math.round` for the reference `js_round`.

**Parity gate:** `lib/engine/__tests__/parity.test.ts` asserts the engine matches
the Python golden battery (`golden.json`, 140 cases) — max diff 1.86e-9. Keep it
green; it is the safety net for any engine change.

## Carried-forward decisions (see DECISIONS.md — don't silently change)
- **5 clocks = reference templates verbatim**: clock4 == clock1, clock5 ≈ clock3
  (reference quirk) — kept as defaults, **flagged** via `duplicate_of`.
- DTI **38%**; max age **85** new / **80** refinance; indexation **annual**.
- Insurance + balance-PDF parsing **blocked** until real tariff/parse engines —
  never fabricate numbers.

## How we work
- Build incrementally; one focused task per session.
- Engine stays pure and fully tested; UI/API call sites stay thin.
- Commits authored as **ido2240 / ido2240@gmail.com**, no AI attribution.
- Keep `PROGRESS.md` (build log) and `DECISIONS.md` (open vs resolved) current.
