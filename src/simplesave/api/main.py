"""FastAPI application entrypoint.

Run locally with::

    uvicorn simplesave.api.main:app --reload
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from simplesave.api.admin import router as admin_router
from simplesave.api.auth import router as auth_router
from simplesave.api.calculate import router as calculate_router
from simplesave.api.insurance import router as insurance_router
from simplesave.api.leads import router as leads_router
from simplesave.api.new_mortgage import router as new_mortgage_router
from simplesave.api.personal_area import router as personal_router
from simplesave.api.refinance import router as refinance_router
from simplesave.db.base import Base, engine


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Idempotent: on Supabase the schema is created via migrations; this is a no-op
    # there (checkfirst) and a convenience for local SQLite development.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title="SimpleSave API", version="0.2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(calculate_router)
app.include_router(new_mortgage_router)
app.include_router(refinance_router)
app.include_router(insurance_router)
app.include_router(leads_router)
app.include_router(auth_router)
app.include_router(personal_router)
app.include_router(admin_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe — confirms the API process is up."""
    return {"status": "ok"}


_frontend = Path(__file__).resolve().parents[3] / "frontend"
if _frontend.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="frontend")
