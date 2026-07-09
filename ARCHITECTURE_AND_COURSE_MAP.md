# SimpleSave — Architecture Decisions & Course Map

> Slide-ready. Three parts: **(1)** how the architecture was chosen and evolved,
> **(2)** the final architecture and why the combination is right, **(3)** where
> each course concept shows up in the actual code. Every claim is grounded in the
> repo — commit hashes, files, migrations, tests, and the project docs
> (`CLAUDE.md`, `DECISIONS.md`, `README.md`). Each section is written as a slide
> with a header, short paragraphs, and a **Talking point** line you can say aloud.
>
> **Stated assumptions** (called out where they occur, and listed at the very end):
> the exact course syllabus isn't in the repo, so Part 3 maps to the concepts a
> modern "build apps with AI" course typically teaches; refine once you share the
> syllabus.

---

# PART 1 — The architecture decision process

The story is short and honest: I started with a **Python prototype to nail the
math**, then deliberately **rebuilt as a single Next.js + TypeScript + Supabase
app** once the math was proven. The database, auth, and security then evolved from
"demo" to "production" in a visible sequence of migrations. Here is each decision
point with its alternatives, tradeoffs, and the trigger that caused the shift.

### Slide 1.1 — Where I started: prove the math first (Python)

The first three commits are all about the calculation engine, not the UI:

- `40252e5` (06-25 21:35) — initialise the project (Python).
- `5e1a730` (06-25 22:49) — the mortgage engine as **pure functions**, plus a
  **JS parity oracle** to check the numbers.
- `a8b832c` (06-25 23:14) — a small HTTP API exposing the engine (`/calculate`).

**Why start here.** In a money app the risk isn't the buttons — it's a wrong
payment. So the first decision was *"make the math provably correct before building
anything on top of it."* The engine was written as **pure functions with no
framework**, which is what later made it safe to move languages.

**Talking point:** *"I started by de-risking the hardest part — the math — with a
pure engine and a parity check, before I wrote a single screen."*

### Slide 1.2 — Decision: language & framework → one full-stack app

Within hours I rebuilt the whole thing as one app:

- `86078c8` (06-26 02:05) — **Port SimpleSave to Next.js + TypeScript + Supabase.**
- `32fd7a0` (06-26 02:09) — remove Python, finalise the Next.js app.

**Alternatives compared.**

| Option | Pros | Cons → why not |
|---|---|---|
| Keep Python API + separate JS frontend | Clear separation | Two languages, two deploys, no shared types; the engine couldn't run in the browser/server directly |
| Node/Express + a separate SPA | One language | Still two apps (API + client) to wire and host |
| **Next.js (App Router) full-stack** ✅ | One language end-to-end, UI + API + server logic in one deployable, engine reusable on server and client, first-class TypeScript | Framework lock-in to the React/Vercel world (acceptable) |

**The trigger.** Once the engine was validated, a single TypeScript codebase meant
the *same* engine powers the API, the server-rendered pages, and any client code —
with shared types and one deployment. That collapses a two-service system into one.

**Talking point:** *"The port wasn't rework — it was a deliberate consolidation:
one language, one deploy, the engine shared everywhere, all type-checked."*

### Slide 1.3 — Decision: how the engine is structured & validated

This decision was made on day one and **survived the language change unchanged** —
that's the proof it was the right structure.

- **Structure:** pure, layered functions — `core → route → mix → risk → tuning →
  clocks` plus `rules` (`lib/engine/`, ~1,232 lines). No React, no DB, no I/O.
- **Validation:** a **parity gate** — `lib/engine/__tests__/parity.test.ts` runs a
  **140-case golden battery** and compares **~167,000 numbers** to a frozen
  `golden.json` within 1e-9.

**Tradeoff.** Purity means the engine can't just "read the database" — a bridge
layer has to feed it (`lib/engine-config.ts`). The payoff: it's trivially testable,
portable across languages, and impossible to break silently.

**Talking point:** *"Because the engine is pure, porting it from Python to
TypeScript was safe — I re-ran the same 140-case battery and every number matched."*

### Slide 1.4 — Decision: database → Supabase (hosted Postgres)

**Alternatives compared.**

| Option | Why not / why |
|---|---|
| SQLite + Prisma (a quick local option) | Great for a single-user prototype, but no hosting, no multi-user auth, no built-in row security *(assumption: this was the lightweight alternative weighed)* |
| Raw Postgres self-hosted | Full control, but I'd hand-build auth, storage, and security |
| Firebase | Managed, but document store fits this relational, multi-role data poorly |
| **Supabase (managed Postgres)** ✅ | Real relational schema **+ Auth + Storage + Row-Level Security in one service** |

**Why it won.** SimpleSave is inherently relational and multi-role (clients,
advisors, managers sharing requests, documents, messages). Supabase gave me
Postgres for the data, GoTrue for auth, a Storage bucket for documents, and RLS for
security — one dependency instead of four. Wired via `@supabase/ssr` +
`@supabase/supabase-js` so the server queries the DB **as the logged-in user**.

**Talking point:** *"One managed service covered database, auth, file storage, and
security — so I could spend my time on the product, not the plumbing."*

### Slide 1.5 — Decision: auth → from demo mock to real Supabase Auth

Auth evolved on purpose, visible in the migrations:

- `0002_demo_policies.sql` — start fast: a **mock cookie session + role switcher**,
  permissive policies so a demo could run.
- `0004_real_auth.sql` — replace the mock with **real Supabase Auth** (email +
  password, bcrypt). Commits `c02e113`, `be7190b` (06-26).

**Tradeoff.** The mock let me build the flow immediately without an auth wall; the
cost was that it wasn't real security. Once the flow worked, I switched to real
auth. `middleware.ts` refreshes the session each request; `lib/session.ts`
(`requireUser` / `requireRole`) does route-level gating.

**Talking point:** *"I bootstrapped with a fake session to move fast, then swapped
in real authentication once the flow was proven — a conscious 'demo-then-harden'
path."*

### Slide 1.6 — Decision: authorization → DB-enforced RLS, not UI checks

The most important security decision:

- Started permissive (`demo_all` policies, RLS effectively open) for the demo.
- `0007_rls_hardening.sql` — replaced them with **real Row-Level Security**: helper
  functions `app_role()` and `can_access_request()` so a **client reads only their
  own rows, an advisor only assigned clients, a manager everything**; config tables
  are admin-write-only; Storage objects are scoped by the request id in their path.
- `0011_profiles_advisor_visibility.sql` — a follow-up **fix for an RLS gap the
  end-to-end tests caught** (`cd4b9ed`).

**Tradeoff.** I could have enforced access with `if` checks in the app. I chose the
database layer instead, so **even a UI bug can't leak another client's data.** The
cost is that policies are trickier to get right — which is exactly why the e2e
suite exists to verify them.

**Talking point:** *"Security lives in the database, not the UI. Postgres itself
refuses to return rows you're not allowed to see — and my tests proved it, even
catching one gap I then fixed."*

### Slide 1.7 — Decision: configuration as data (live rates)

- `0005_rate_anchors.sql` — market rates and the five clock templates live in the
  DB and are **manager-editable**; the engine reads them via `engine-config.ts`.

**Tradeoff.** Hard-coding rates is simpler but means a redeploy every time the
market moves. Making them data lets a manager change a rate in `/admin/params` and
**reprice everyone's clocks instantly** (`app/admin/actions.ts` → `updateParams`
→ `revalidatePath`). This kept business logic out of code.

**Talking point:** *"Rates and strategy templates are data, not code — so the
business can move the market without a developer."*

### Slide 1.8 — Decision: hosting → Vercel

Next.js is made by Vercel and deploys there with zero config (`.vercel/`, README
deploy section). Environment secrets (Supabase keys, the payment ratio, age caps)
are set as Vercel env vars; the **service-role key is server-only**, never exposed
to the browser.

**Talking point:** *"Hosting was the easy decision — Vercel is the native home for
Next.js, and it kept secrets on the server."*

### Slide 1.9 — The evolution in one line

**Prove the math (pure engine + parity) → consolidate into one Next.js/TS app →
add managed data/auth/storage via Supabase → harden demo auth and permissive
policies into real Auth + DB-enforced RLS → make rates data → test the whole
journey → deploy on Vercel.**

---

# PART 2 — The final chosen architecture

### Slide 2.1 — The stack (what each piece is and why)

| Layer | Choice | Why this one |
|---|---|---|
| Framework | **Next.js 16 (App Router)** | One full-stack app: pages, server logic, and API together |
| Language | **TypeScript (strict)** | One typed language across engine, server, and UI |
| UI | **React 19 + Tailwind v4** | Component UI; Tailwind for fast, consistent **Hebrew RTL** styling |
| Data | **Supabase Postgres** | Relational, multi-role data |
| Auth | **Supabase Auth (GoTrue)** | Real email/password, session cookies |
| Security | **Row-Level Security** | Access enforced by the database |
| Storage | **Supabase Storage** | Private `documents` bucket |
| Validation | **zod** | Runtime validation of API inputs |
| Charts | **Recharts** | Amortization + composition visuals |
| Tests | **Vitest + Playwright** | Parity (unit) + end-to-end journeys |
| Hosting | **Vercel** | Native Next.js deploy |

Core app size: `app/` 3,566 · `components/` 1,334 · `lib/` 1,906 (engine 1,232) ·
`supabase/migrations/` 574 across **13 migrations** · `e2e/` 580 lines.

### Slide 2.2 — How the pieces connect (request → answer)

```
Browser (React, RTL)
  │  form submit
  ▼
Next.js Server Action / Server Component   ── requireRole() gate (lib/session.ts)
  │                                            middleware.ts refreshes the session
  ├── validate + write ─► Supabase (Postgres)  ── RLS decides what's visible
  │                          ▲
  │        engine-config.ts  │ reads rates + templates (config as data)
  ▼                          │
lib/engine  (PURE) ──────────┘  prices the 5 clocks, returns full schedules
  │
  ▼
small projection (clock-card-data.ts) ─► React components ─► charts (Recharts)
```

Two front doors share the one engine: **server pages** (the app UI) and **JSON API
routes** (`app/api/*`, zod-validated). Neither computes money itself — both call
`lib/engine`.

**Talking point:** *"Everything funnels through one pure engine. The UI and the API
are thin; the database enforces access; the engine is the single source of
numerical truth."*

### Slide 2.3 — Why this combination is right (given the tradeoffs)

- **One language, one deploy** removed the two-service tax of the Python start
  (Slide 1.2) and let the engine run wherever it's needed with shared types.
- **A pure engine + parity gate** made the whole thing trustworthy and made the
  language change safe (Slide 1.3).
- **Supabase** collapsed database + auth + storage + security into one dependency,
  matching the app's relational, multi-role shape (Slide 1.4).
- **DB-enforced RLS** put security where a UI bug can't undo it (Slide 1.6),
  and the **e2e suite** verifies it.
- **Config-as-data** kept business rules (rates, templates) out of code (Slide 1.7).

**Talking point:** *"Each choice bought a specific guarantee: correctness from the
parity gate, safety from RLS, agility from config-as-data, and simplicity from one
full-stack language."*

---

# PART 3 — Where each course concept shows up

### Slide 3.0 — The framing that makes this honest

The course covered two distinct kinds of AI mastery:

- **(A) Building apps *with* AI** — coding agents (Claude, Cursor), MCP, git/GitHub,
  Python, databases, testing, CI, deployment.
- **(B) Building apps that *use* AI at runtime** — LLM APIs, prompt engineering,
  structured output, agents, and RAG.

**SimpleSave demonstrates (A) fully — it *is* an AI-built app — and makes a
deliberate, informed choice about (B): it does not call an LLM at runtime.** A
mortgage tool must be *deterministic, auditable, and exactly correct*; generating
payments with a probabilistic model would be irresponsible. So the "AI" in this
project is in **how it was built**, and the runtime "brain" is a **validated,
deterministic engine**. That contrast is a feature, not a gap — and it shows I
understood what each tool is *for*.

**Talking point:** *"The course taught me both to build with AI and to build AI
features. Here I used every 'build-with-AI' tool we learned, and I consciously kept
LLMs out of the math — because a mortgage can't be a hallucination."*

### Slide 3.1 — Module: LLM foundations (how models work, tokens, embeddings, context)

| Concept taught | In SimpleSave |
|---|---|
| How LLMs work · tokens · context window | Applied to **how I worked the coding agent** — scoping tasks to fit context, phase-by-phase prompting, keeping the engine small and pure so the agent could reason about it reliably |
| Embeddings / vector representations | **Not used at runtime** — the app has no semantic-search need; its data is structured (rows + numbers), not free text |
| Model APIs | Understood, then applied as a *design contract*: my own JSON APIs (`app/api/*`) mirror the clean request/response shape, but wrap a deterministic engine, not a model |

### Slide 3.2 — Module: prompt engineering & working with model APIs (JSON output, system prompts, temperature)

| Concept taught | In SimpleSave |
|---|---|
| Prompt engineering | Applied to **directing the build**: spec-driven, one focused task per session, "audit → list breaks → fix" loops (`aedbc84` → fixes), always test-gated |
| Structured JSON output | The app enforces structured contracts with **zod** (`lib/api-schemas.ts`): every API body is parsed/validated; bad input → 422, never a corrupted calc |
| Model providers (OpenAI/Anthropic/Gemini), temperature, system prompts | **Not used at runtime** by choice — determinism beats generation for money math |

### Slide 3.3 — Module: AI coding agents & MCP (Claude, Cursor, MCP, git/GitHub) — *this is how SimpleSave was built*

| Concept taught | In SimpleSave |
|---|---|
| AI coding agents (Claude / Cursor / Copilot) | The **entire 42-commit build** (`40252e5`…`d686cf5`) was done with a coding agent; I set architecture, sourced the math, and gated output |
| Agentic / spec-driven workflow | Phased delivery visible in commits: engine → app → auth/RLS → parity/e2e → hardening |
| **MCP (Model Context Protocol)** | Used in the **development loop** (agent + MCP tools, e.g. the Supabase MCP) to inspect the DB and apply changes — a build-time tool, not shipped in the app |
| Version control (git / GitHub) | 42 commits, conventional messages (`feat()/fix()/docs()`); the 24-hour MVP is provable from commit times |

**Talking point:** *"This module is the backbone of the whole project — SimpleSave
is a working demonstration of building a real, deployed app with an AI coding agent
and MCP tooling, under version control."*

### Slide 3.4 — Module: building & shipping real apps (Python/FastAPI, SQL, testing/Playwright, CI, auth, deploy, RAG)

| Concept taught | In SimpleSave |
|---|---|
| **Python / FastAPI** | The **first engine + `/calculate` HTTP API** (`5e1a730`, `a8b832c`) — the prototype that proved the math before the TS rebuild |
| **Databases · SQL · schema** | Supabase **Postgres**, 13 ordered migrations (`0001…0013`); real schema (profiles, requests, borrowers, documents, messages, config) |
| **Testing — Playwright** | `e2e/*.spec.ts` — a **77-check full-journey Playwright suite** that even caught an RLS bug (`cd4b9ed`) |
| **Testing — unit** | `lib/engine/__tests__/parity.test.ts` — 140-case gate on ~167k numbers |
| **CI / quality gates** | Merge-blocking gates: parity + e2e + `tsc` strict + ESLint + `next build` before deploy |
| **Auth** | Supabase Auth (`0004_real_auth.sql`), session refresh in `middleware.ts`, `requireRole()` in `lib/session.ts` |
| **APIs / JSON / endpoints** | `app/api/*` JSON endpoints, zod-validated, rate-limited (`lib/rate-limit.ts`) |
| **Environment / secrets** | `.env.example`, Vercel env vars; the **service-role key stays server-only** |
| **Deployment** | **Vercel** (native Next.js) — one-command production deploy |
| **RAG / retrieval / vector DB** | **Not used** — no unstructured-knowledge retrieval need; the app answers from structured data + deterministic math, not a knowledge base |
| Agent frameworks (LangChain / Agno) | **Not used at runtime** — there is no autonomous agent in the product; the "agent" was my build tool |

### Slide 3.5 — What I deliberately did NOT use (informed judgment, not a gap)

- **LLM calls at runtime, RAG, and autonomous agents** were all taught — and all
  intentionally left out. A mortgage engine must return the *same, correct* number
  every time and be auditable to the last shekel. That rules out generative,
  probabilistic components in the calculation path.
- **What I used instead:** a validated, deterministic engine behind a 140-case
  parity gate. AI built the app; math runs it.

**Talking point:** *"Knowing when *not* to use a tool is part of the skill. I kept
generative AI out of the numbers on purpose — and I can defend exactly why."*

### Slide 3.6 — One-glance concept → location map (for a summary slide)

| Course concept | Location in the repo |
|---|---|
| AI coding agents + MCP | whole git history; MCP used in the dev loop |
| git / GitHub | 42 commits, conventional messages |
| Python / FastAPI | `5e1a730`, `a8b832c` (engine + `/calculate`) |
| SQL / databases / migrations | `supabase/migrations/0001…0013` |
| Auth | `0004_real_auth.sql`, `middleware.ts`, `lib/session.ts` |
| Security (RLS) | `0007_rls_hardening.sql`, `app_role()`, `can_access_request()` |
| APIs / JSON / validation | `app/api/*`, `lib/api-schemas.ts` (zod), `lib/rate-limit.ts` |
| Testing — Playwright (e2e) | `e2e/*.spec.ts` |
| Testing — unit / parity | `lib/engine/__tests__/parity.test.ts` |
| CI / quality gates | parity + e2e + `tsc` + eslint + `next build` |
| Env / secrets | `.env.example`, Vercel env (service-role server-only) |
| Deployment | Vercel (`.vercel/`) |
| LLM / prompting / RAG / agents (runtime) | **deliberately not used — see Slide 3.5** |

---

## Closing narrative (one slide to end on)

*"The course taught me to build with AI and to build AI features. SimpleSave is the
first: a real, deployed app built end-to-end with a coding agent, MCP tooling, and
version control — with Python, SQL, auth, Playwright tests, and CI-style gates all
doing real work. I started by proving the math with a pure engine and a parity test,
consolidated everything into one Next.js + TypeScript app on Supabase, and hardened
it from a demo into a product. And I deliberately kept LLMs out of the calculation,
because a mortgage must be exact, not generated. Every architectural choice bought a
specific guarantee — and knowing which AI tools *not* to use was part of the
design."*

---

## Assumptions made (grounded in repo evidence)

1. **The Python start was a FastAPI-style HTTP API.** Grounded in commit `a8b832c`
   ("add /calculate endpoint exposing the engine over HTTP") + the Python init
   (`40252e5`); FastAPI was covered in the course, so the label is consistent.
2. **SQLite/Prisma was the lightweight DB alternative considered.** SQLite was
   covered in the course; the decision landed on Supabase (hosted Postgres) for
   auth + storage + RLS.
3. **Part 3 is mapped to the concepts actually taught** (LLM foundations → prompting/
   APIs → coding agents & MCP → building/shipping real apps with Python, SQL,
   Playwright, CI, auth, deploy, RAG). The "not used at runtime" items are choices,
   stated as such.

## Optional (only if you want to go further)

1. **The client requirements doc** (עיצוב מערכת 6.26) — if you want Part 1 coverage
   tied line-by-line to requirements for the 40% הספק score.
2. Tell me if any specific tool from a lecture is missing here and I'll place it.
