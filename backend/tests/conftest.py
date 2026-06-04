"""Pytest ortak fixture'ları."""

import pytest
from fastapi.testclient import TestClient

from backend.main import app
from backend.services import auth_service


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers():
    token = auth_service.create_token("pytest", is_admin=True)
    return {"Authorization": f"Bearer {token}"}
