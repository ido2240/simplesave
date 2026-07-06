# GAP.md — Feature parity vs the definitive mockup

Phase 2 audit. Every mockup screen (from the unpacked
`reference/simplesave-mockup.html` — bundler template + 46KB logic component)
graded against the current app on `fix/end-to-end-flow`.
**Legend:** ✅ implemented · 🟡 partial · ❌ missing.
No new feature is built until you choose scope from this list.

| # | Mockup screen / element | Status | Detail |
|---|---|---|---|
| 1 | **Home hero** | ✅ | Hero + trust bullets exist (`app/page.tsx`); visual polish differs but structure matches. |
| 2 | **Service picker** (3 colored services: new/refi/insurance) | ✅ | Services section on home with per-service accent colors and feature lists. |
| 3 | **Question wizard** — progress bar + step counter | ✅ | `NewMortgageForm` is a single-page form in the app vs the mockup's one-question-per-step wizard with animated progress. Functionally complete, UX shape differs → see note A. |
| 3a | Live finance hints per question (LTV cap on value, equity ok/warn, 40% capacity on income, payment slider 2k–25k) | 🟡 | Capacity hint + over-capacity warning added this branch; LTV/max-loan hint on property value and equity ok/warn hint are missing; no slider. |
| 3b | Borrowers stepper (1–5) + per-borrower tabbed forms | 🟡 | App has add/remove borrower rows (max 5) with name/birth/income/owner — equivalent data, different UI (rows vs tabs). Owner-flag (50% income) exists in app but not in mockup. |
| 3c | Refinance wizard: existing-mortgage step — bank select, balance-report upload, manual tracks editor **up to 10 tracks** (balance/rate-type/rate/end-date/linked) | ❌ | App refinance form (`app/refinance/page.tsx`) takes one aggregate balance/rate/term, not per-track rows; no bank select; upload intentionally deferred (no parse engine — CLAUDE.md). |
| 3d | Insurance wizard (insured count, borrower details, sum, building type) | ❌ | No insurance questionnaire; `/insurance` is the honest stub. |
| 4 | **Gauges/results screen** — 5 mixes, animated needle gauges, recommended badge, בחר/פירוט per card | ✅ | 5 clock cards + RiskGauge + recommended badge; after this branch the five mixes, names, subtitles and display-risk match the mockup. Needle entrance animation absent (static). |
| 4a | Sticky post-selection bar ("בחרתם: X — המשיכו להרשמה") | ❌ | App: choosing navigates to detail/personal; no sticky selection bar with register CTA. |
| 4b | Refi results: side-by-side vs existing (monthly/total/interest/savings banner, per-card חיסכון chips) | 🟡 | App has a comparison table vs existing on `/refinance`; no per-card saving chips or green "bestSaving" banner. |
| 5 | **Mix detail** — track composition **donut** | ❌ | Detail page shows a routes table, no donut. |
| 5a | Annual Spitzer amortization **table** (open/principal/interest/close per year, charts↔table tabs) | 🟡 | App has an annual principal-vs-interest chart (`AmortizationChart`); no yearly table view, no tab switcher. |
| 5b | Cumulative payments line chart (paid vs cumulative interest) | ❌ | Not present. |
| 5c | Monthly-payment bar chart with hover tooltip | ❌ | Not present. |
| 6 | **Registration + consent** | 🟡 | Real register page exists (better than mockup, which just jumps to the dashboard); no consent/terms checkbox — required for prod (Phase 3 privacy anyway). |
| 7 | **Client personal area** — status stepper (8 steps: שאלון→…→חתימה) | ❌ | App shows chosen-mix card + next-step links; no 8-step progress stepper. |
| 7a | Sidebar panels: פרטים אישיים / נתוני משכנתא / מסמכים / אישור עקרוני / הודעות / בטחונות (locked until signing) | 🟡 | All content exists as separate pages (documents, authorizations, messages via advisor, securities on personal); not the mockup's tabbed panel layout; no locked-state affordance. |
| 7b | Auto-built document checklist (6 docs: הסמכה/עו"ש/תלושים/ת"ז/חוזה/שמאי, 3 statuses, progress "X מתוך 6") | 🟡 | App has a document list with upload + advisor review statuses, but seeds only 3 kinds (ת"ז/תלושים/דפי חשבון) and no progress counter; mockup wants 6 kinds incl. optional שמאי. |
| 7c | Per-borrower detail forms (tabs per borrower) in personal area | ❌ | Borrower data editable only by re-running the questionnaire (client) or by the advisor. |
| 7d | Advisor messages thread in client area | ❌ | Messages exist advisor-side (`MessagesThread` on `/advisor/[id]`); the client has no messages UI. |
| 8 | **Bank tender screen** (מכרז בנקים: approved banks lit, weighted rate per bank, best-terms badge, pending bank dashed) | ❌ | Nothing equivalent; authorizations page covers the *signing* step only. |
| 9 | **Insurance comparison table** — 5 insurers, treasury-rating stars, first/avg/total premium, declining-premium sparklines, best badge, "השוואה מול פוליסה קיימת" CTA | ❌ | `/insurance` intentionally returns "not available" (CLAUDE.md: never fabricate premiums). ⚠️ Conflict: the mockup's premiums come from hardcoded illustrative factors — building this screen requires either real tariff tables or your explicit sign-off to use the mockup's factors as approved demo data. |
| 10 | **Advisor area** — client cards (stage chip, current step, next appointment, amount, unread badge) | 🟡 | Advisor dashboard has client cards with stage/step/pending-docs; no next-appointment field, no unread-message badges. |
| 10a | Advisor tasks tab (due dates, urgent highlight, done strikethrough) | 🟡 | Tasks tab exists but is derived only from pending documents; no freeform tasks/due dates/urgency. |
| 11 | **Manager dashboard** — leads tab with assignment | ✅ | `/admin/leads` lists all requests with advisor assignment; KPI for unassigned added this branch. Mockup's "time since lead" chip absent. |
| 11a | Advisor-load view (clients/active/closed counts, load bar with color) | ❌ | No advisor-load screen. |
| 11b | Mix-template editor (tracks: type/period/linked/pct/anchor/method, pct bars, donut, **up to 10 tracks**) | 🟡 | `/admin/templates` edits templates (JSON-level); mockup wants a visual per-track editor with donut + share bars and a 10-track cap. |
| 11c | Market-params cards (prime, expected CPI, fixed anchor, variable anchor) | ✅ | `/admin/params` edits exactly these; live repricing already works. |
| 12 | **Active mortgage management** (post-signing): balances donut, 3 tracks with per-track balance/rate/monthly, payments progress ring (24/228), **refi-opportunity banner** ("הריבית ירדה — מחזור עשוי לחסוך ₪38,000") | ❌ | Screen does not exist; spec lists post-execution tracking as deferred (v0.2), but the mockup includes it. |

## Notes / decisions needed when you pick scope

- **A — wizard shape:** the mockup's one-question-per-step wizard (with progress
  bar and per-step hints) vs the app's single long form. Converting is pure UI
  work but touches the most-used flow. Recommend converting — it is the
  mockup's signature UX.
- **B — insurance:** any real insurance implementation conflicts with the
  "never fabricate premiums" rule unless you approve the mockup's factors
  (הראל 0.000395 … כלל 0.000465, avg = 63% of first premium) as sanctioned
  demo tariffs, clearly labeled as estimates.
- **C — bank tender + active mortgage:** both are new data models (bank offers
  per request; executed-mortgage tracks/payments), not just screens. Real data
  entry would come from the advisor/manager side.
- **D — refi per-track editor:** needs a `refinance_tracks`-style table (or
  reuse of `request_details` JSON) + engine mapping (the engine already prices
  arbitrary route sets; only input UI + persistence are missing).
- **E — engine vs mockup math:** everywhere the mockup uses its flat annuity
  (results, detail charts, tender weighted rates), the app must keep using the
  validated engine (per D-2 rev.). Charts 5a–5c can be computed from the
  engine's real per-month schedules (`mix.per[].prin/intr/idxEff`) — no new math.

## Suggested scope tiers (pick one or mix)

- **Tier 1 — client-flow parity (highest value):** 3a, 4a, 5 (donut), 5a–5c,
  7 (stepper), 7b (6-doc checklist), 7d (client messages), 6 (consent checkbox).
- **Tier 2 — staff parity:** 10/10a polish, 11a advisor load, 11b visual
  template editor.
- **Tier 3 — new domains (need product decisions):** 3c/D refi tracks editor,
  8/C bank tender, 9/B insurance table, 12/C active mortgage.
