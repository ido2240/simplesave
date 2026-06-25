"""Shared pytest fixtures."""

import pytest
from fastapi.testclient import TestClient

from simplesave.api.main import app


@pytest.fixture
def client() -> TestClient:
    """A FastAPI test client for the application."""
    return TestClient(app)
