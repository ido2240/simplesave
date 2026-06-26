# DEPLOY_READINESS — SimpleSave

Status: **GREEN** — `tsc` · `vitest` · `eslint` · `next build` (production) all pass;
real Supabase Auth + RLS verified end-to-end. Generated during the production-prep pass.

Safety: a `pre-cleanup` branch + checkpoint commit (`d236ff7`) mark the state before this
pass; everything here is reversible.

---

## Phase checklist

| Phase | Item | Result |
|------|------|--------|
| **1** | `tsc --noEmit` | ✅ PASS |
| 1 | `vitest` (parity gate) | ✅ 2/2 — **140 cases / 167,099 numbers**, tol rel 1e-9 / abs 1e-6 |
| 1 | `eslint` | ✅ clean |
| 1 | `next build` | ✅ 24 routes + middleware |
| 1 | Frozen engine math untouched (`core/route/mix/risk/tuning/types` + `parity.test.ts` + `golden.json`) | ✅ confirmed (not in change set) |
| 1 | Real auth E2E: signup → login → role gating | ✅ signup provisions profile (role=client); gating matrix server-side (client⊘advisor/admin, advisor⊘admin, no-auth→/login) |
| **2** | Mock cookie session / role-switcher removed | ✅ none remain (`grep` clean) |
| 2 | console.* noise in app/lib | ✅ none (only the parity-test log, intentional) |
| 2 | Demo/“mock” banners removed; genuine disclaimer kept | ✅ "אינו ייעוץ" kept; checkout flagged **Sandbox** |
| 2 | Paywall / serviceStatus enforcement intact | ✅ `requirePaid` + server-only `confirmPayment` (ownership-checked) unchanged |
| 2 | Kept: seed data, reference + golden.json, insurance `available:false` stub | ✅ kept |
| **3a** | No secret tracked in git; never committed | ✅ only `.env.example` tracked; `.env`/`.env.local` never in history → **no rotation needed** |
| **3b** | `.env.example` lists every required var | ✅ updated |
| **3c** | RLS per table (user can’t read others’ rows) | ✅ **added** — scoped policies on all 12 tables + storage; verified: anon=0 rows, client sees only self, advisor sees clients, admin all, impersonation INSERT denied (42501), storage scoped to own request |
| **3d** | Server-side authz on every API route | ✅ all 4 `app/api/*` routes are stateless calculators (no user-data reads/writes); all DB mutations go through server actions that call `requireRole` |
| **3e** | Production build, no demo shortcuts | ✅ `NODE_ENV=production next build` passes |

---

## Files changed in this pass

**Added**
- `supabase/migrations/0007_rls_hardening.sql` — scoped RLS (helpers `app_role()`, `can_access_request()`; per-table + storage policies)
- `DEPLOY_READINESS.md` — this file

**Deleted**
- `lib/supabase.ts` — the old unauthenticated anon client (replaced by the cookie-bound authed client)

**Changed**
- Data access switched to the authenticated SSR client (`lib/supabase-server`) in 22 files:
  `lib/{billing,engine-config,messages,requests,securities}.ts`,
  `app/admin/{actions,page,leads/page,params/page,templates/actions}.tsx?`,
  `app/advisor/{page,[requestId]/page,[requestId]/actions}`,
  `app/authorizations/{page,actions}`, `app/checkout/{page,actions,hosted/page}`,
  `app/documents/{page,actions}`, `app/new-mortgage/{page,actions,clock/[id]/actions}`
- `supabase/seed.ts` — now uses the **service-role key** + `auth.admin.createUser` (creates real auth identities → profiles via trigger) so it works under RLS and on a fresh DB
- `.env.example` — added `SUPABASE_SERVICE_ROLE_KEY` + Stripe placeholders; documented real-auth model
- Wording: removed “demo/mock” framing in `app/page.tsx`, `app/refinance/page.tsx`,
  `app/new-mortgage/clocks/page.tsx`; checkout flagged as Sandbox (`app/checkout/{page,hosted/page}.tsx`, `actions.ts`)

**DB migrations already applied to the live project** (`kvavcpwccxooflduockp`): `0001`–`0007`.

---

## Manual steps to deploy (fresh environment)

1. **Create / pick a Supabase project.** Copy from Project Settings → API:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (keep secret).
2. **Run migrations in order** `supabase/migrations/0001 → 0007` (Supabase SQL editor or CLI `supabase db push`). End state: schema + triggers + **scoped RLS**.
3. **Seed** demo content & accounts: `npm run seed` (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`). Creates the 4 demo logins, params/anchors, 5 clocks, 1 demo request.
4. **Set Vercel env vars** (Project → Settings → Environment Variables):
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` — Production
   - `SUPABASE_SERVICE_ROLE_KEY` — **Sensitive**, server only (used by seed/admin tasks; never `NEXT_PUBLIC_*`)
   - `PAYMENT_TO_INCOME_RATIO=0.38`, `MAX_AGE_NEW_MORTGAGE=85`, `MAX_AGE_REFINANCE=80`
   - (payments) `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` — only when wiring the real PSP
5. **Deploy** (`vercel --prod` or Git integration). `next build` must be the production build (no demo env).
6. **Keys to rotate:** none were committed. ⚠️ The **demo passwords** (`Admin1234!` / `Advisor1234!` / `Client1234!`) live in `supabase/migrations/0004_real_auth.sql` and `supabase/seed.ts` — for a real production tenant, change them (or don’t seed demo accounts) and consider enabling email confirmation (the demo auto-confirms via a DB trigger because no SMTP is configured).

---

## Intentionally deferred to v0.2

| Item | Why |
|------|-----|
| **Insurance tariffs** | No real tariff tables — the stub returns `available:false`; we never fabricate premiums (DECISIONS.md). |
| **Balance-report PDF parsing** | Needs a real parse engine; refinance uses manual entry until then. |
| **Eligibility (זכאות)** module | Out of MVP scope; not required for the 5-clock flow. |
| **Real payments (Stripe)** | Checkout runs a clearly-flagged Sandbox provider; the paywall (serviceStatus) is fully enforced server-side. Wire Stripe + webhook once keys are provided. |
| **Multi-language (RU/FR/EN)** | Hebrew-only for v0.1; no i18n scaffold yet. |
| **Email confirmation / SMTP** | Demo auto-confirms new users at the DB level; production should configure SMTP and require confirmation. |
