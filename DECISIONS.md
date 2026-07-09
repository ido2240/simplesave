# DECISIONS.md — SimpleSave

Tracks open and resolved decisions. When a decision is resolved, fill in the chosen value and date. Never guess an open item — stop and ask.

---

## Open decisions

*(none — every decision is resolved as of 2026-07-06)*

---

## Resolved decisions

### D-5: Maximum borrower age — refinance flow — RESOLVED 2026-07-06
**Chosen: 80.** Full-text extraction of the spec (`עיצוב מערכת 6.26.docx`,
refinance section: "מגביל את תקופת המשכנתא עד לגיל 80") confirms 80; the
definitive mockup has no competing age rule. Matches the existing
`MAX_AGE_REFINANCE=80` default — no code change needed.

### D-6: Strategy risk labels vs. the validated risk engine — RESOLVED 2026-07-06
**Chosen: option (b)** — a **display risk score (0–100) stored per clock
template** (`clock_templates.display_risk`, manager-editable), labelled with
the definitive mockup's thresholds (`<35 נמוך · <50 נמוך-בינוני · <65 בינוני ·
<78 בינוני-גבוה · אחרת גבוה`). The engine risk stays untouched and its
score remains available internally; the speedometer shows the display score.
Owner-approved 2026-07-06 together with the mockup template adoption (D-2).

### D-7: Insurance comparison with demo tariffs — RESOLVED 2026-07-06
The "blocked until real tariff tables" rule is superseded by an explicit owner
decision: the definitive mockup's premium factors ship as **demo/estimated
tariffs**, labeled as such in every surface (UI warning banner, per-column
asterisks and footnote, `demo:true` on the API) and never presented as live
insurer quotes. Real tariff tables can replace the factors without UI changes.


### D-1: Clock 2 strategy name — RESOLVED 2026-06-25
The spec listed "Short-term" twice (a typo). Clock 2 is now **תמהיל מאוזן (Balanced)** —
the classic thirds mix (fixed-unlinked / variable-unlinked / prime). Editable by the
manager.

### D-2: Five-clock definitions — UPDATED 2026-07-06 (mockup templates adopted)
Per the owner's 2026-07-06 approval, the seed templates are now the definitive
mockup's five mixes on a solid→aggressive axis (fixed/variable/prime shares):
**סולידי 70/20/10 (risk 24) · מאוזן 55/25/20 (40) · מומלץ★ 45/25/30 (55) ·
גמיש 33/27/40 (70) · אגרסיבי 20/30/50 (84)** — recommended = מומלץ. Payments
are computed by the validated engine (per-route Spitzer + tuner), NOT the
mockup's illustrative single-rate annuity; the mockup's 4.9→3.7% are display
approximations, not inputs. The clock4/clock5 duplication quirk is gone
(`duplicate_of` = null). Templates remain manager-editable data.

Earlier (2026-06-26) resolution — superseded:
Per the project owner's directive, the five clocks now use the **engine's built-in
templates verbatim** — including the quirk that clock4 == clock1 and
clock5 ≈ clock3 by default. They are kept as defaults but **flagged** (`duplicate_of` /
`CLOCK_DUPLICATE_FLAGS`) so the admin UI marks them and the manager can replace them
after client sign-off. (Supersedes the earlier "distinct seeds" resolution below.)

Earlier (2026-06-25) resolution — superseded:
The reference duplicates were not reproduced; the five clocks were distinct seed
strategies, each mapped to a name and risk profile:
- clock1 **קצר טווח** (low–med) — fixed-unlinked 40 / variable-unlinked 20 / prime 40
- clock2 **מאוזן** (med) — fixed-unlinked 33 / variable-unlinked 34 / prime 33
- clock3 **קל"צ** (low–med) — fixed-unlinked 67 / prime 33
- clock4 **חסכוני** (med–high) — prime 50 / variable-linked 30 / fixed-linked 20
- clock5 **בטוח** (low) — fixed-unlinked 100

Per the user's decision, the clocks are **manager-configurable** (`clock_template_configs`
table + `/admin/clock-templates`). These compositions are seed defaults; the exact final
percentages remain subject to business sign-off but no longer block the build.

### D-3: Payment-to-income ratio — RESOLVED 2026-06-25, REVISED 2026-07-06
**Chosen: 40%** (revised). The spec contradicts itself — 38% in the lead-intake
table vs **40%** on the main-flow "תשלום חודשי רצוי" question — and the
definitive interactive mockup (`reference/simplesave-mockup.html`,
`finance().maxMonthly = income * 0.4`) uses 40%. The main-flow value wins;
40% is also within Bank-of-Israel practice. Owner-approved 2026-07-06.
Configurable via `PAYMENT_TO_INCOME_RATIO`; engine default
`DEFAULT_PAYMENT_TO_INCOME_RATIO = 0.4`.
Earlier (2026-06-25) resolution — superseded: 38% per the questionnaire table.

### D-4: Maximum borrower age — new-mortgage flow — RESOLVED 2026-06-25
**Chosen: 85** (consistent across the spec's new-mortgage question table and explanation).
Configurable via `MAX_AGE_NEW_MORTGAGE`.
