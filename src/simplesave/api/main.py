"""FastAPI application entrypoint.

Run locally with::

    uvicorn simplesave.api.main:app --reload
"""

from fastapi import FastAPI

from simplesave.api.calculate import router as calculate_router

app = FastAPI(title="SimpleSave API")

app.include_router(calculate_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe — confirms the API process is up."""
    return {"status": "ok"}
