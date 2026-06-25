# SimpleSave

Mortgage advisory platform for the Israeli market. Python-first backend; the
business rules and the validated calculation engine live in Python. See
[CLAUDE.md](./CLAUDE.md) for the full project context.

## Stack

- **Python 3.12+** — FastAPI, uvicorn, SQLAlchemy 2.x + Alembic, Pydantic v2
- **Database:** Supabase (Postgres)
- **Tests:** pytest
- **Engine:** pure-Python calculation module (`src/simplesave/engine/`)

## Layout

```
src/simplesave/
  engine/   # pure Python calc engine — no I/O, no framework coupling
  api/      # FastAPI app (main.py)
  db/       # SQLAlchemy base + models
  core/     # settings / config
tests/      # pytest suite
alembic/    # database migrations
reference/  # the validated JS simulator — authoritative math source
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env        # then fill in Supabase credentials
```

## Run

```bash
uvicorn simplesave.api.main:app --reload
# GET http://127.0.0.1:8000/health -> {"status": "ok"}
```

## Test / check

```bash
pytest
ruff check .
mypy src
```
