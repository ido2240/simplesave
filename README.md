# SimpleSave — Mortgage Comparison Platform (Next.js + Supabase)

> **Educational demo only — not licensed mortgage or financial advice.**

SimpleSave replaces the initial mortgage-broker intake. A borrower answers a short
Hebrew questionnaire and instantly receives **five mortgage-mix proposals ("clocks" /
שעונים)** — each a different blend of tracks (fixed / prime / variable, indexed or not)
with its first monthly payment, total lifetime cost, principal-vs-interest split, and a
single-color risk gauge. From there the client signs bank-authorization letters, uploads
documents, messages an advisor, and tracks the process — across three roles
(**client / advisor / manager**) that share data under real row-level security.

**Live:** https://ido-new-project.vercel.app

The calculation engine is a faithful TypeScript port of a validated spreadsheet/HTML
mortgage simulator, locked behind a parity gate so the math cannot silently regress.

---

## Demo accounts

The login page (`/login`) has one-click "quick login" buttons; each performs a **real**
email + password sign-in and routes you to that role's area.

| Role | Email | Password | Lands on |
|------|-------|----------|----------|
| Manager | `admin@simplesave.co.il` | `Admin1234!` | `/admin` |
| Advisor | `dan@simplesave.co.il` | `Advisor1234!` | `/advisor` |
| Client | `yossi@simplesave.co.il` | `Client1234!` | `/personal` |
| Client | `maya@simplesave.co.il` | `Client1234!` | `/personal` |

New users can self-register at `/register`.

---

## What it does

- **Questionnaire → 5 clocks.** Loan type, property source, value, equity, multiple
  borrowers (name / birthdate / income / ownership), additional income, fixed expenses,
  and a desired monthly-payment range. Validated against Bank-of-Israel-style lending
  rules (LTV per deal type, max age, DTI), then five mortgage mixes are generated.
- **Clock detail** with an amortization chart (principal vs. interest/indexation per year).
- **Refinance.** Enter an existing mortgage and a goal; get five alternative mixes plus a
  side-by-side comparison (monthly / total / interest / indexation / risk / savings).
- **Service flow.** Bank-authorization letters, document upload (real file storage,
  advisor review), collateral/securities, and a paywall-gated full service.
- **Advisor area.** Client cards (current step / next action / stage), a tasks tab,
  client-data editing, document review, and per-request messaging.
- **Manager area.** Dashboard, lead assignment, the **live rate editor** (edit an anchor →
  the clocks reprice), and clock-template editing.

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** — Hebrew RTL design (Frank Ruhl Libre + Heebo)
- **Supabase** — Postgres, **Auth (GoTrue)**, **Storage**, and **Row-Level Security**
- **@supabase/ssr** — cookie-bound server client; the app queries the DB *as the user*
- **Recharts** (amortization chart) · **Vitest** (engine + parity) · **zod** (API bodies)
- **PWA** — installable manifest + service worker

---

## The calculation engine (`lib/engine/`)

Pure functions, no React / Supabase / I/O. Layers:
`core` (pmt, rounding, indexation) → `route` (Spitzer / equal-principal, balloon, grace) →
`mix` (aggregate) → `risk` → `tuning` (fit a mix into a payment range) →
`clocks` (5 templates) + `rules` (LTV / equity / DTI / age).

### Parity gate

`lib/engine/__tests__/parity.test.ts` runs the same battery the source engine was
validated on and compares every number to a frozen `golden.json`:

```
140 cases (route / mix / risk / tune) · 167,099 numbers compared
tolerance: rel 1e-9 / abs 1e-6  →  matches (floating-point noise only)
```

`golden.json` is the frozen oracle; the test runs against it independently. **Do not edit
the engine math or the parity files** without keeping this green.

---

## Auth & security

- **Real Supabase Auth** (email + password, bcrypt) — no mock/cookie bypass.
- Server-only data access via `lib/supabase-server.ts`; `middleware.ts` refreshes the
  session; `lib/session.ts` resolves the user + role from the profile.
- **Row-Level Security on every table** (`supabase/migrations/0007_rls_hardening.sql`):
  a client reads only their own rows, an advisor only assigned clients, a manager all;
  config tables are read-only to authenticated users and writable only by managers;
  Storage objects are scoped to the owning request. Verified end-to-end.

---

## Project structure

```
app/                 # App Router — pages, role areas, API routes, server actions
components/           # ClockCard, RiskGauge, AmortizationChart, DashHeader, …
lib/
  engine/             # pure validated calculation engine (+ __tests__/parity)
  supabase-server.ts  # cookie-bound authenticated server client
  session.ts          # currentUser / requireUser / requireRole
  engine-config.ts    # bridges DB config (rates, templates) → engine
supabase/
  migrations/         # 0001–0007 (schema, auth, anchors, storage, RLS)
  seed.ts             # demo users + params + 5 clocks + a demo request
reference/            # source simulator (parity oracle)
```

---

## Local development

```bash
cp .env.example .env.local      # fill SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm install
# apply supabase/migrations/0001..0007 to your Supabase project (SQL editor or CLI)
npm run seed                    # demo users, params, 5 clocks, demo request (needs service role)
npm run dev                     # http://localhost:3000
```

```bash
npm test         # Vitest — engine + parity (must stay green)
npm run lint     # eslint
npm run build    # production build
```

---

## Deployment (Vercel)

Set these in **Project → Settings → Environment Variables** (Production):

| Variable | Notes |
|----------|-------|
| `SUPABASE_URL` | — |
| `SUPABASE_ANON_KEY` | sensitive |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret**, server-only (seed/admin); never `NEXT_PUBLIC_*` |
| `PAYMENT_TO_INCOME_RATIO` | `0.40` |
| `MAX_AGE_NEW_MORTGAGE` | `85` |
| `MAX_AGE_REFINANCE` | `80` |

Then `vercel --prod`. See `DEPLOY_READINESS.md` for the full deploy checklist.

---

## Scope — v1 vs. deferred

**In v1 (working):** real auth + RLS, the 5-clock engine, new-mortgage and refinance
flows, documents/storage, authorizations, securities, advisor & manager areas, live rate
editing, PWA — deployed and verified.

**Deferred to v0.2** (intentionally stubbed, never faked):

| Item | Why |
|------|-----|
| Insurance pricing | No official tariff tables — the stub returns `available:false`. |
| Balance-report PDF parsing | Needs a real parse engine; refinance uses manual entry. |
| Real payments | Checkout runs a clearly-flagged **Sandbox** provider; the paywall is enforced server-side. Wire Stripe when keys are provided. |
| Eligibility (זכאות) / multi-language / post-execution mortgage tracking | Out of MVP scope. |

---

## License

MIT.
