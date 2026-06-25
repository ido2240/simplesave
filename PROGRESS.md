# PROGRESS.md — SimpleSave Build Log

Each entry records what was built, which files were created or changed, and any decisions made during that session. Written so a non-author can follow the build step by step.

---

## Step 1 — Python skeleton (2026-06-25)

### What was built
Established the full Python tech-stack scaffold. Wiring only — no business logic yet.

### Layout (src-layout, single installable package)
```
src/simplesave/
  __init__.py
  engine/          # pure-Python calculation engine — no I/O, no framework coupling
    __init__.py    #   (empty; the validated math is ported here in a later task — see CLAUDE.md §3)
  api/
    __init__.py
    main.py        # FastAPI app + GET /health -> {"status": "ok"}
  db/
    __init__.py
    base.py        # SQLAlchemy 2.x DeclarativeBase + engine/session factory from settings
    models/__init__.py   # ORM models added per feature
  core/
    __init__.py
    config.py      # Pydantic settings (pydantic-settings) read from .env
tests/
  __init__.py
  conftest.py      # FastAPI TestClient fixture
  test_health.py   # /health returns 200 {"status": "ok"}
  test_smoke.py    # package imports + settings load
alembic/           # migration env wired to settings + Base.metadata; no revisions yet
```

### Packages
- **Runtime:** fastapi, uvicorn[standard], sqlalchemy>=2, alembic, pydantic>=2, pydantic-settings, psycopg[binary] (Postgres driver for Supabase).
- **Dev:** pytest, httpx, mypy, ruff.
- All dependency and tool config lives in `pyproject.toml` (PEP 621).

### Files created
| File | Purpose |
|------|---------|
| `pyproject.toml` | Project metadata, deps, and ruff/mypy/pytest config |
| `src/simplesave/api/main.py` | FastAPI app with `/health` |
| `src/simplesave/db/base.py` | SQLAlchemy `Base`, engine, session factory |
| `src/simplesave/core/config.py` | `Settings` (DATABASE_URL, SUPABASE_*) from `.env` |
| `alembic.ini`, `alembic/env.py` | Migrations, wired to settings + `Base.metadata` |
| `tests/` | pytest suite (health + import/settings smoke) |
| `.env.example` | Committed placeholder env keys |
| `README.md` | Setup / run / test instructions |
| `PROGRESS.md`, `DECISIONS.md` | This log + the decision register |

### Decisions made this session
- **Layout:** src-layout — a single installable package `src/simplesave` (imports like `from simplesave.engine import ...`); keeps `engine/` cleanly importable and testable.
- **Environment tooling:** standard-library `venv` + `pip` with a PEP 621 `pyproject.toml` (`pip install -e ".[dev]"`).
- **Engine purity:** `engine/` stays free of I/O, DB, and framework imports (CLAUDE.md §3); the validated math is ported there as a dedicated task, with a parity check against the reference simulator.
- **`reference/` is tracked in git** — the validated simulator, authoritative for the math and used as the parity oracle for the engine port.

### Verification (all green)
`pytest` 3 passed · `ruff check .` clean · `mypy src` (strict) clean · `GET /health` → `{"status":"ok"}` · `alembic` env loads.

### Known gaps (blocked until user provides values)
- `.env` keys are empty — a dedicated SimpleSave Supabase project must be created and credentials filled in before any DB/auth work (CLAUDE.md §2).
- The 5 business decisions D-1…D-5 remain OPEN (see DECISIONS.md).
