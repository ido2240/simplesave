"""FastAPI application entrypoint.

Run locally with::

    uvicorn simplesave.api.main:app --reload
"""

from fastapi import FastAPI

app = FastAPI(title="SimpleSave API")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe — confirms the API process is up."""
    return {"status": "ok"}
