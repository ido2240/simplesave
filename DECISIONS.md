# DECISIONS.md — SimpleSave

Tracks open and resolved decisions. When a decision is resolved, fill in the chosen value and date. Never guess an open item — stop and ask.

---

## Open decisions

### D-1: Clock 2 strategy name
**Question:** The spec lists "Short-term" (תמהיל קצר טווח) twice (clocks 1 and 2). This is likely a typo. What is the intended strategy for clock 2?
**Blocked work:** Clock template definitions, UI labels.
**Status:** OPEN

---

### D-2: Five-clock definitions (clocks 4 & 5)
**Question:** The reference HTML has clock4 = duplicate of clock1, and clock5 ≈ clock3. The spec names 5 distinct strategies but doesn't map them to the templates. What are the correct track compositions, share percentages, and strategy names for all 5 clocks?
**Blocked work:** `calculateMixToRange` call sites, clock UI cards.
**Status:** OPEN

---

### D-3: Payment-to-income ratio (יחס החזר)
**Question:** Three conflicting values exist:
- Reference HTML: **30%**
- Base44 prototype: **38%**
- Parts of the spec: **40%**

Which is the correct ceiling?
**Blocked work:** Repayment-capacity validation in new-mortgage and refinance flows.
**Status:** OPEN

---

### D-4: Maximum borrower age — new-mortgage flow
**Question:** Spec / Base44 show **85** in the new-mortgage flow (mortgage ends by age 85 of the oldest borrower). Is 85 confirmed for this flow?
**Blocked work:** Age validation in the new-mortgage calculator.
**Status:** OPEN

---

### D-5: Maximum borrower age — refinance flow
**Question:** The figure **80** appears in the refinance flow. Is 80 confirmed for the refinance flow specifically?
**Blocked work:** Age validation in the refinance calculator.
**Status:** OPEN

---

## Resolved decisions

*(none yet)*
