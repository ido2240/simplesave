# CLAUDE.md — SimpleSave (Python stack)

> This file is the permanent context for the SimpleSave project. Read it in full at the start of every session before planning or writing any code. It defines what the system is, the business rules it must obey, and how we work. The "how to build" is yours; the "what the rules are" lives here — never guess a business rule, look it up here or ask.

> **Language policy (important):** This project is **Python-first**. Everything that *can* be Python **must** be Python — the entire backend, the calculation engine, the API, the business logic, the DB access. The **only** exception is the browser frontend: browsers cannot run Python, so the user-facing UI is built with the standard web technology (HTML/CSS/JavaScript). Keep that frontend as thin as possible — it only displays what the Python backend computes. If something seems like it must be non-Python, first check whether a Python option exists; only fall back to JavaScript when it is technically unavoidable (i.e. code that runs in the browser), and flag it.

---

## 1. What SimpleSave is

SimpleSave is a web platform for the Israeli market that helps people make better mortgage decisions. It covers three services:

1. **New mortgage** (משכנתא חדשה) — compare mixes and compute an optimal mortgage for a property purchase.
2. **Refinance** (מחזור משכנתא) — analyse an existing mortgage and check whether refinancing is worthwhile.
3. **Mortgage insurance** (ביטוח משכנתא) — compare life + structure insurance offers.

The product is operated by three user roles: **client**, **advisor** (יועץ), and **manager** (מנהל). The flow for a client is: lead → "clocks" (5 mortgage-mix offers) → registration → personal area → documents → in-principle approval → collateral → active mortgage tracking.

The UI language is Hebrew (RTL). Code, file names, comments, commits, and all documentation are in English.

---

## 2. Tech stack

**Backend — everything here is Python:**
- **Language:** Python 3.12+ (type-hinted; checked with mypy/pyright in strict mode)
- **Web framework / API:** FastAPI
- **ASGI server:** uvicorn
- **Database:** Supabase (Postgres)
- **ORM:** SQLAlchemy 2.x (with Alembic for migrations)
- **Validation / schemas:** Pydantic v2
- **Auth:** Supabase Auth (verified server-side from Python)
- **Tests:** pytest
- **Calculation engine:** pure Python (the heart of the system — see §3)

**Frontend — the only non-Python part, and only because browsers require it:**
- Standard HTML/CSS/JavaScript. Chosen framework to be decided when we reach the UI (a lightweight option is preferred). It must support Hebrew RTL.
- The frontend is "dumb": it sends user input to the Python API and renders the results. **No business logic in the frontend** — all calculation, validation, and rules live in Python.

A dedicated Supabase project must be used for SimpleSave only — never share a Supabase instance with another product (a past CASCADE DROP TABLE on a shared instance broke another project's foreign keys).

---

## 3. The calculation engine — the heart of the system

The mortgage math comes from a validated reference implementation (a standalone HTML simulator written in JavaScript). The formulas are correct and have been numerically verified. **Port the pure logic to a pure-Python module** (`engine/`); do not reinvent it. Do **not** port the reference UI or its Chart.js rendering.

The engine is layered:

1. **`pmt(rate, n, pv)`** — standard monthly-payment formula (same as Excel PMT).
2. **`calc_route(route, params)`** — builds a month-by-month amortization schedule for a single route (track). Handles Spitzer (level payment) and equal-principal (קרן שווה), index linkage (הצמדה), balloon, and grace.
3. **`calc_mix(mix, params)`** — combines up to 10 routes into one mortgage mix; returns first payment, total paid, total interest, indexation.
4. **`calculate_mix_to_range(...)`** — tunes route periods so the monthly payment lands inside a desired min/max range. This is what generates the "clocks".
5. **`mix_risk(...)`** — weighted risk score per mix → drives the speedometer gauge.

**Known engine note:** index linkage is applied monthly as `annual_index / 12` (linear), not `(1+annual)**(1/12)-1` (geometric). This is a common industry approximation. Keep it as-is unless told otherwise, but document it.

**Porting verification:** Because the source is JavaScript and the port is Python, the engine task should include a parity check — run the reference JS functions in Node as an oracle and assert the Python port returns the same numbers across a battery of route configs. This guarantees a faithful port.

### Route types
- **fixed** (קבועה) — period 4–30 years; may be index-linked (צמודה) or not; only an anchor rate, no margin.
- **variable** (משתנה) — resets every X months (e.g. 36 = every 3 years, 60 = every 5 years); period 6–30 years; index-linked or not; rate = anchor + margin.
- **prime** (פריים) — period 4–30 years; never index-linked; rate = anchor + margin.

---

## 4. The five clocks (חמשת השעונים)

The spec requires **exactly 5 clocks**, each a distinct mortgage strategy with its own risk profile. The spec names them (with example sub-titles):

1. **Short-term** (תמהיל קצר טווח) — short tracks to save on interest · risk: low–medium
2. **Short-term** (appears twice in the spec — ⚠️ likely a typo, confirm intended 2nd strategy)
3. **קל"צ (fixed-unlinked dominant)** — risk: low–medium
4. **Saver** (תמהיל חסכוני) — low payment at the start · risk: medium–high
5. **Safe** (תמהיל בטוח) — fixed rate for maximum stability · risk: low

The reference simulator defines 5 templates (`clock1`–`clock5`) as fixed share-percent mixes, BUT:
- `clock4` is an exact duplicate of `clock1`.
- `clock5` is nearly identical to `clock3`.
- They are named generically ("שעון 1–5"), not mapped to the strategy names above.

⚠️ **OPEN DECISION — do not guess.** The exact definition of the 5 clocks (which tracks, which share %, which strategy name) is a business decision pending sign-off. Until confirmed, use the reference templates below as defaults and flag any clock that is a duplicate. See DECISIONS.md.

Reference template share percentages (from the simulator, anchors: fixed/variable 4.62–4.7%, prime 4.56%):
- clock1: fixed-unlinked 17 / fixed-linked 17 / variable-unlinked 30 / variable-linked 15 / prime 21
- clock2: fixed-unlinked 33 / variable-unlinked 30 / prime 37
- clock3: fixed-unlinked 35 / prime 65
- clock4: (duplicate of clock1 — must be replaced)
- clock5: fixed-unlinked 33 / prime 67 (near-duplicate of clock3 — must be replaced)

---

## 5. Regulatory rules & dependency matrix

These are the conditional rules the system must enforce. **Validations depend on them — getting one wrong makes the output wrong.** Several values conflict between the spec and the reference code and are marked ⚠️ pending sign-off (see DECISIONS.md).

### Financing percentage (אחוז מימון) — depends on property type
- **Single/first property** (נכס יחיד): up to **75%**
- **Additional property** (נכס נוסף): up to **50%**
- **Any-purpose loan** (לכל מטרה): up to **50%** of property value, minus existing mortgage
- **Buyer-price program** (מחיר למשתכן): up to **90%**, minimum 100,000 ₪ equity
- **Home improvement** (שיפור דיור): up to **70%**

### Equity (הון עצמי) — depends on property type
- Minimum **25%** of property value (i.e. complement of the 75% case)
- **Buyer-price**: minimum **10%**, but not less than 100,000 ₪ (lower of the options)

### Payment-to-income ratio (יחס החזר)
- ⚠️ **OPEN DECISION.** Reference simulator uses **30%**; Base44 prototype uses **38%**; parts of the spec say **40%**. Must be confirmed before building the validation. Net income = sum of all borrowers' net income + additional income − fixed expenses.

### Maximum borrower age (גיל מקסימלי)
- ⚠️ **OPEN DECISION.** Spec/Base44 show **85** (mortgage ends by age 85 of the oldest borrower) in the new-mortgage flow, but **80** appears in the refinance flow. Confirm both.
- Minimum borrower age: **18**.

### Mortgage term
- Maximum **30 years**.

### Eligibility / entitlement (זכאות, משרד השיכון)
- Computed only for a **first home with no prior property owned**.
- Uses the official scoring/sum tables (gov.il). Initial scope: compute **only for "ותיקים בארץ"** (veterans). This is a separate, complex module.

### Ownership flag for income
- A borrower not registered as a property owner: only **50%** of their net income counts toward the repayment-capacity calculation.

---

## 6. Known issues to fix (do not replicate)

The Base44 prototype and the reference simulator both contain bugs that the new system must NOT carry over:
- **Duplicate clocks** — two identical clocks were shown (clock4 = clock1). The 5 clocks must be 5 genuinely distinct strategies.
- **Only 4 clocks displayed** in Base44 — must be 5.
- Generic clock names instead of strategy names.

---

## 7. How we work — process rules

### Build incrementally
Never build the whole system in one pass. One focused task per session (e.g. "build the DB schema", then "port the engine", then "build the new-mortgage flow"). Keep each change small and reviewable.

### Plan first
For each task, present a short plan and wait for approval before writing code. If a business rule needed for the task is marked ⚠️ OPEN in this file or in DECISIONS.md, **stop and ask** — do not pick a value.

### Documentation (required every step)
- **PROGRESS.md** — append an entry after every completed step: what was built, which files were created/changed, and any decisions made. Written so a non-author can follow the build step by step.
- **DECISIONS.md** — track open vs. resolved decisions (the ⚠️ items above). When one is resolved, record the chosen value and the date.

### Git & commits
- All commits must be authored as:
  - **name:** `ido2240`
  - **email:** `ido2240@gmail.com`
- Set this at repo level: `git config user.name "ido2240"` and `git config user.email "ido2240@gmail.com"`.
- **Do not add** a `Co-authored-by: Claude` trailer or any AI attribution to commit messages.
- Commit in small, logical units with clear English messages. Push to the GitHub remote under the `ido2240` account.

### Code quality
- Python: full type hints, checked with mypy/pyright (strict). Format with ruff/black. No untyped public functions.
- The calculation engine must be **pure functions** (no DB, no I/O, no framework coupling), fully unit-tested with pytest.
- Use the spec's numeric examples as test cases (e.g. principal 1,000,000 → known totals) to verify the engine.
- Keep the frontend (the unavoidable JavaScript layer) free of business logic.

---

## 8. Source materials (reference, not to copy blindly)
- The product spec (PDF/Word, Hebrew) — authoritative for business rules and the clocks.
- The reference HTML/JS simulator — authoritative for the math, not the UI. Lives in `reference/`.
- The Base44 prototype — reference for UX flow only; its calculation logic is known to be broken.
- Two engine dependency files (`document-engine.js` for bank-statement PDF parsing, `insurance-rates.js` for life-insurance rate tables) are **missing** and must be re-created or requested. Insurance flow and balance-report parsing are blocked until then. (When rebuilt, these become Python modules.)
