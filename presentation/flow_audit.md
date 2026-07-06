# Flow Audit — client journey: questionnaire → clocks → checkout → full service

Written BEFORE any code change (per task step 1). Reproduced with a real browser
(Playwright, Chromium) against a local `npm run dev` bound to the production
Supabase project, and cross-checked against the deployed Vercel production site.
Demo data was restored to its seeded state after each run.

## How it was reproduced

1. `npm test` baseline: **2/2 green** (incl. engine parity, 140 golden cases).
2. Logged in as `yossi@simplesave.co.il / Client1234!` and walked:
   personal → `/checkout` → `/checkout/hosted?rid=…` → `שלם` → `/personal` →
   `/authorizations` → `/documents`.
3. Registered a **fresh client** and walked the same journey from `/register`.
4. Repeated the yossi walk against `https://ido-new-project.vercel.app`
   (deployed commit == local `main` == `c819c10`; deploy created 2026-06-26 12:22,
   same minute as the commit).
5. Verified each suspicious DB write directly against PostgREST with a
   client-role JWT (GoTrue password grant) to isolate RLS behaviour from app code.

## What does NOT break (verified, twice each)

- `requirePaid` (`lib/billing.ts:14-16`) — no redirect loop. Unpaid client on
  `/authorizations` / `/documents` is sent to `/checkout` exactly once.
- The hosted-checkout confirm button (`app/checkout/hosted/page.tsx:31`) binds the
  correct `requestId` (`confirmPayment.bind(null, rid)`; `rid` validated against
  `client_id` on line 13-14).
- **RLS under migration 0007 does not block any legitimate client action.**
  Verified as a client-role JWT: `requests` INSERT/SELECT/UPDATE
  (incl. `service_status` → `PAID` on the user's own request), `authorizations`
  UPDATE (`signed=true`), `documents` UPDATE, Storage upload to
  `documents/<reqId>/…`, and the `saveNewMortgage` child-row inserts all succeed.
  **No 0008 migration is required for the paywall itself.**
- The full payment path works end-to-end on the deployed site too — *when every
  click waits for the (1–3 s) server-action round-trip to finish*.

## Where the flow actually breaks

### BUG 1 — The questionnaire's own default values fail server validation (hard entry wall)

- `app/new-mortgage/page.tsx:33` seeds the default borrower with
  `netIncome: 14000`; `app/new-mortgage/page.tsx:42-43` defaults the desired
  payment range to `7,000–10,000 ₪` (same defaults in
  `components/NewMortgageForm.tsx:27`).
- `app/new-mortgage/actions.ts:59-60` runs `validateNewMortgage`, which enforces
  DTI 38% at `lib/engine/rules.ts:150`: capacity = 0.38 × 14,000 = **5,320 ₪**,
  so the default max payment of 10,000 ₪ is rejected.
- Reproduced: submitting the untouched prefilled form returns
  `מקסימום תשלום (10,000 ₪) חורג מכושר החזר (5,320 ₪, 38%).` and the user stays
  on `/new-mortgage`. No request row is ever created, so `/checkout` →
  `startCheckout` (`app/checkout/actions.ts:12`) bounces straight back to
  `/new-mortgage` — the user can never reach the paywall, let alone pass it.
- Production evidence: of the 3 real (non-seed) registered clients in the DB,
  **2 have no request row at all**, and the one who got through
  (`ido2240@gmail.com`) had to raise income to 50,000 ₪ to pass. The seeded demo
  request itself (`supabase/seed.ts:79,81` — income 14,000, range 7,000–10,000)
  violates the DTI rule, so *re-submitting the prefilled questionnaire fails even
  for the demo user yossi*.
- The engine rule is correct and untouched (D-3, DTI 38%); the bug is that the
  UI's default scenario contradicts it and the form gives no capacity hint.

### BUG 2 — Zero feedback on the paywall/checkout buttons (perceived "stuck", double-submit risk)

- `app/checkout/page.tsx:47-48` ("המשך לתשלום") and
  `app/checkout/hosted/page.tsx:31-32` ("שלם") are plain server-component
  `<form action>` buttons with **no pending state and no disable-on-submit**
  (contrast `/login` and `/register`, which use `useActionState` + `pending`).
- Each action takes 1–3 s against the remote DB (measured: `startCheckout`
  ~0.9 s local, longer on Vercel cold starts). During that time the page is
  completely inert — the automated walk-through "got stuck" at exactly this point
  twice until waits were added, faithfully simulating a user who clicks, sees
  nothing, clicks something else (the nearest button is "יציאה"/logout in the
  header) or leaves. This is the paywall-stage abandonment the stuck production
  user (`registered/FREE`, clock chosen, full child rows) matches.
- The pay button can also be double-clicked, firing `confirmPayment` twice.

### BUG 3 — `confirmPayment` (and siblings) swallow DB failures → silent unpaid loop

- `app/checkout/actions.ts:23` fires the `service_status` UPDATE and **ignores
  the result**; line 24 then redirects to `/personal` unconditionally. If the
  update ever fails (RLS change, network, constraint), the user "pays", lands on
  `/personal` still `FREE`, and every gated page bounces them back to
  `/checkout` with **no error message anywhere** — an invisible paywall loop.
- Same swallow-and-continue pattern: `signAuthorization`
  (`app/authorizations/actions.ts:18`), `chooseClock`
  (`app/new-mortgage/clock/[id]/actions.ts:14`), `startCheckout`
  (`app/checkout/actions.ts:9-12`).

### BUG 4 — Dead ends without a next-step CTA

- `/checkout` when already paid (`app/checkout/page.tsx:44-45`): a static
  "השירות כבר פעיל" pill, **no link** to `/authorizations` or `/personal`.
- `startCheckout` has no already-paid guard (`app/checkout/actions.ts:7-14`): a
  paid user clicking through can reach the hosted page and pay again.
- Post-payment `/personal` has no success confirmation and no explicit
  "continue to authorizations" step — the upgrade banner just disappears.
- `/authorizations` with zero authorization rows (legacy/partial requests)
  renders an empty list with "יש לחתום על כל כתבי ההרשאה כדי להמשיך"
  (`app/authorizations/page.tsx:52-57`) — nothing to click, permanent dead end.

### BUG 5 — Sandbox label does not match the required wording

- Required label: **"תשלום דמו (Sandbox)"**. Current copy:
  "תשלום מאובטח (סביבת בדיקה · Sandbox)" (`app/checkout/hosted/page.tsx:19`) and
  a footnote on `/checkout` (`app/checkout/page.tsx:53`). The paywall itself is a
  feature and stays.

### BUG 6 — A fresh paying client is invisible to the advisor and the manager KPI

- `saveNewMortgage` creates the request with **no advisor**
  (`app/new-mortgage/actions.ts:70-72`), and nothing later assigns one.
- The advisor dashboard filters `advisor_id = eq(user.id)`
  (`app/advisor/page.tsx:39`) → dan sees nothing for any self-registered client
  until a manager assigns him on `/admin/leads` (that page does list all
  requests and its `assignAdvisor` works under RLS).
- The manager dashboard's "לידים חדשים" KPI counts `requests.status = 'lead'`
  (`app/admin/page.tsx:22`) — **no code path ever creates status `lead`**
  (`saveNewMortgage` inserts with `status: 'clocks'`), so the KPI is always 0 and
  the manager is never nudged to assign the new client. (The `leads` *table* is
  written by no app code at all — legacy of the pre-port design.)

## Fix plan (step 2)

1. Make the questionnaire's default scenario self-consistent (default income
   30,000 ₪ → capacity 11,400 ₪ ≥ default max 10,000 ₪) and show a live
   capacity hint in the form; align `seed.ts` demo data (and patch the live demo
   row) so yossi's prefill passes his own re-submission. Engine untouched.
2. Pending/disabled states on both checkout buttons; label "תשלום דמו (Sandbox)".
3. `confirmPayment`: verify the write actually landed (read back `PAID`),
   redirect to `/checkout?error=payment` + Hebrew error banner on failure,
   `/personal?paid=1` + success banner on success; already-paid guard in
   `startCheckout`; error signalling in `signAuthorization`.
4. Kill the dead ends: paid-state CTA on `/checkout`, post-payment "next step"
   strip on `/personal`, fallback CTA on empty `/authorizations`.
5. Backfill missing onboarding rows (authorizations/documents) on successful
   payment so no request unlocks into an empty service area.
6. Manager KPI "ממתינים לשיוך יועץ" = unassigned requests, so a fresh client
   surfaces on the dashboard; advisor flow then works via existing assignment.
7. RLS: no policy change needed (verified above); 0008 reserved if step-2
   verification reveals a blocked legitimate write.

## Verification protocol (step 3, after fixes)

Fresh self-registered user end-to-end (register → questionnaire →
clocks → choose → pay → sign 3 authorizations → upload document), then
`dan@simplesave.co.il` sees the client + document after manager assignment on
`/admin/leads`, manager dashboard shows the new client, `npm test` and
`npm run build` green. Before/after appended per issue below.
