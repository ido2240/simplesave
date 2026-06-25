# DECISIONS.md — SimpleSave

Tracks open and resolved decisions. When a decision is resolved, fill in the chosen value and date. Never guess an open item — stop and ask.

---

## Open decisions

### D-6: Strategy risk labels vs. the validated risk engine
**Question:** The spec §4 assigns intuitive risk levels to each strategy (e.g. "Safe =
fixed rate → LOW risk"). But the **validated** reference risk engine (`default_risk_rules`)
scores **fixed-rate routes as HIGH (3–4)** and **prime as LOW (1)**. So a 100%-fixed "בטוח
(Safe)" clock shows as *high* on the speedometer — contradicting its name. The risk math is
ported verbatim and must not be changed (CLAUDE.md §3).
**Options:** (a) display the engine-computed risk and rename/re-tune the seed clocks so the
ordering matches; (b) let the manager set a displayed risk label per clock, separate from
the engine score; (c) confirm the engine's definition of "risk" is authoritative and adjust
the spec wording.
**Status:** OPEN — surfaced 2026-06-25. Does not block the build (clocks are
manager-configurable); affects the speedometer labelling only.

---

### D-5: Maximum borrower age — refinance flow
**Question:** The refinance section conflicts with itself in the spec — the question
table says **80**, the explanation of the same screen says **85**. Which applies to
refinance?
**Status:** OPEN — user to provide the calculation HTML to confirm.
**Interim:** `MAX_AGE_REFINANCE` defaults to **80** (the value in the structured table)
and is configurable; will be finalised once the HTML is reviewed.
**Blocked work:** Final age validation in the refinance calculator (logic already
parameterised, so only the number is pending).

---

## Resolved decisions

### D-1: Clock 2 strategy name — RESOLVED 2026-06-25
The spec listed "Short-term" twice (a typo). Clock 2 is now **תמהיל מאוזן (Balanced)** —
the classic thirds mix (fixed-unlinked / variable-unlinked / prime). Editable by the
manager.

### D-2: Five-clock definitions — RESOLVED 2026-06-25 (duplicate bug fixed; seeds editable)
The reference duplicates (clock4 = clock1, clock5 ≈ clock3) are **no longer reproduced**
(CLAUDE.md §6). The five clocks are now genuinely distinct seed strategies, each mapped to
a name and risk profile:
- clock1 **קצר טווח** (low–med) — fixed-unlinked 40 / variable-unlinked 20 / prime 40
- clock2 **מאוזן** (med) — fixed-unlinked 33 / variable-unlinked 34 / prime 33
- clock3 **קל"צ** (low–med) — fixed-unlinked 67 / prime 33
- clock4 **חסכוני** (med–high) — prime 50 / variable-linked 30 / fixed-linked 20
- clock5 **בטוח** (low) — fixed-unlinked 100

Per the user's decision, the clocks are **manager-configurable** (`clock_template_configs`
table + `/admin/clock-templates`). These compositions are seed defaults; the exact final
percentages remain subject to business sign-off but no longer block the build.

### D-3: Payment-to-income ratio — RESOLVED 2026-06-25
**Chosen: 38%** (per the main questionnaire table; also the Base44 value). Configurable
via `PAYMENT_TO_INCOME_RATIO`.

### D-4: Maximum borrower age — new-mortgage flow — RESOLVED 2026-06-25
**Chosen: 85** (consistent across the spec's new-mortgage question table and explanation).
Configurable via `MAX_AGE_NEW_MORTGAGE`.
