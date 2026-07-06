# Phase 1 — Business-logic reconciliation: spec vs mockup vs engine

Sources compared, no code changed yet:
- **Spec** — `עיצוב מערכת 6.26((.docx` (client requirements; text extracted).
- **Mockup** — `reference/simplesave-mockup.html` (definitive design/UX/logic;
  unpacked the `__bundler` manifest + template, extracted the 46KB embedded
  `DCLogic` component that drives every screen).
- **Engine/app** — `lib/engine/rules.ts`, `lib/engine/clocks.ts`,
  `lib/engine/risk.ts`, seed data.

## 1. Rules that MATCH everywhere (no action)

| Rule | Spec | Mockup | Engine | Verdict |
|---|---|---|---|---|
| LTV — single property | 75% | 75% (`typeCap`) | 75% | ✔ match |
| LTV — additional property | 50% | 50% | 50% | ✔ match |
| LTV — any-purpose | 50% (minus existing mortgage) | 50% | 50% + existing-balance deduction | ✔ match |
| LTV — mehir lemishtaken | 90%, min equity 100,000 ₪ | 90% (`srcCap`), copy mentions the 100K minimum | 90% + `TARGET_PRICE_MIN_EQUITY = 100_000` | ✔ match |
| LTV — contractor / yad-2 | 75% | 75% | 75% | ✔ match |
| Age cap (new) | 85, oldest borrower | *(absent — no age check in mockup)* | 85, oldest borrower | ✔ spec==engine; engine stricter than mockup — keep |
| Age cap (refinance) | 80 (§ line 147) | *(absent)* | 80 | ✔ match — **this also closes open decision D-5 (80)** |
| Non-owner borrower income | counts at 50% | *(absent — single income field)* | 50% | ✔ spec==engine — keep |

Two spec items the mockup omits but the engine correctly implements:
**home-improvement 70% LTV** (spec line 117) and **self-build** property source.
The mockup's questionnaire shows only 3 loan types / 3 sources — treated as a
UI simplification, not a rule change (spec is explicit). *(Note: the task
brief listed home-improvement 70% among mockup rules, but the extracted mockup
`finance()` has no improvement branch — the 70% figure exists only in the spec.
Engine already implements it, so nothing changes either way.)*

## 2. CONFLICT — DTI (payment-to-income cap)

- Spec **lead-questionnaire table** (line ~112): **38%**.
- Spec **main-flow question** "תשלום חודשי רצוי" (line ~126): **40%**.
- Mockup `finance()`: `maxMonthly = income * 0.4` and the on-screen hint
  "החזר חודשי מרבי מומלץ (40%)" — **40%**.
- Engine/app today: **38%** (D-3, env-configurable `PAYMENT_TO_INCOME_RATIO`).

**Recommendation: 40%**, because
1. the mockup is declared the definitive behavior reference and uses 40%;
2. within the spec itself, 40% is the value attached to the actual validated
   question in the main flow, while 38% sits in the earlier lead-intake table —
   the more specific requirement wins;
3. Bank-of-Israel practice caps PTI well above it (50% hard cap; ≤40% is the
   standard "safe" band), so 40% is regulation-compatible;
4. it is the more permissive value — fewer false rejections at the
   questionnaire wall (the exact failure class fixed in the previous session).

**Change surface if approved** (small, parity-safe): the
`DEFAULT_PAYMENT_TO_INCOME_RATIO` constant in `lib/engine/rules.ts` (validation
only — the parity battery covers route/mix/risk/tune math, not validation, so
the 164,491-number gate is untouched), `.env.example` + README env table
(`PAYMENT_TO_INCOME_RATIO=0.40`), Vercel env var, the form hint (reads the env
already), and D-3 in DECISIONS.md updated with this justification.

## 3. CONFLICT — the 5 mix definitions

**Mockup** (`buildOptions()`): five mixes on a solid→aggressive axis, term 300
months (refi: matches remaining term), recommended = #3, with **display**
rates/risk per mix:

| # | Name | Rate | Risk (0-100) | fixed/variable/prime |
|---|---|---|---|---|
| 1 | תמהיל סולידי | 4.9% | 24 | 70/20/10 |
| 2 | תמהיל מאוזן | 4.6% | 40 | 55/25/20 |
| 3 | תמהיל מומלץ ★ | 4.3% | 55 | 45/25/30 |
| 4 | תמהיל גמיש | 4.0% | 70 | 33/27/40 |
| 5 | תמהיל אגרסיבי | 3.7% | 84 | 20/30/50 |

**Current app** (D-2): the reference simulator's templates verbatim, including
the clock4==clock1 / clock5≈clock3 duplication quirk, generic names
(שעון 1..5), and the engine's own risk scale (score ~0–4, labels
נמוכה/בינונית/גבוהה/גבוהה מאוד).

These cannot both hold. D-2 kept the reference templates as *defaults pending
client sign-off* — the mockup **is** that sign-off.

**Recommendation — adopt the mockup's five templates as the new seed data,
computed by the validated engine:**
- Compositions and names from the mockup (the table above) become the five
  `clock_templates` rows (they are already manager-editable DB data — **no
  engine change**); the duplicate quirk disappears, `duplicate_of` stays null.
- Monthly payment / totals keep coming from the **validated engine**
  (per-route Spitzer + tuner) — NOT the mockup's single-rate annuity, which is
  a display mock (`annuity(loan, rate/12, 300)`), not bankable math. The
  mockup's 4.9→3.7% "rates" become approximate blended outcomes of per-route
  anchors, not inputs.
- Risk: store the mockup's **display risk score (0-100)** per template and
  label it with the mockup thresholds (`<35 נמוך · <50 נמוך-בינוני · <65
  בינוני · <78 בינוני-גבוה · else גבוה`). The engine's computed risk stays
  available internally. **This resolves open decision D-6 via its option (b)**
  (display label decoupled from the ported risk engine, which must not change).
- Parity gate untouched (templates are data; engine math unchanged).

## 4. Risk labels

Mockup thresholds (0-100): `<35 low, <50 low-mid, <65 mid, <78 mid-high, else
high` — confirmed in `riskLabel()`. Current UI shows the engine's 4-label
scale. Covered by the recommendation in §3 (display-risk layer).

## 5. Hard-rule items (test env + credentials) — status & needed decisions

**Test environment (rule 2).** Docker/Colima/OrbStack are not installed, so a
local Supabase stack needs a system install first. Options:
- **(A) Dev Supabase project via the connected MCP account** — fastest, no
  installs; apply migrations 0001–0007 + seed there; `.env.local` points to it;
  production credentials removed from the working copy. Free tier.
- **(B) Local stack** (`supabase start`) — fully offline; requires installing
  Docker Desktop or Colima (~1–2 GB, system-level change).

**Credential exposure (rule 3).** Found in plaintext on this Mac (never
committed to git — repo history verified clean; only `.env.example`
placeholders were ever committed):
- `~/ido_new_project/.env.local` — **production** anon (legacy JWT) + **service-role** keys for `kvavcpwccxooflduockp` (SimpleSave prod).
- `~/Downloads/simplesave/.env.local` — copy of the same (made last session for local run).
- `~/ido_ai/.env.local` — **NEXT_PUBLIC_**-prefixed keys + service-role for `yykciskiajsjurrmulcy` (the old "Mortgage Advisor" project). The `NEXT_PUBLIC_` prefix on the URL/anon there is fine, but a service-role key sitting next to it is risky if that project is still live.
- Also: last session's shell commands passed the service key into local
  `curl`/python processes (transient, local only).

**Required rotation (needs your Supabase dashboard access — I cannot rotate
these):** in the prod project `kvavcpwccxooflduockp` → Settings → API: rotate
the **service_role** key (and ideally move to the new `sb_secret_...` keys),
then update Vercel env + local `.env.local`. Same for `yykciskiajsjurrmulcy`
if it is still in use, else pause/delete that project. After we move testing
to a dev environment, the prod keys will no longer exist in this repo's
`.env.local` at all.
