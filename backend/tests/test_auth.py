"""Auth birim testleri."""

import os

import pytest

from backend.services import auth_service
from backend.utils.bootstrap import BOOTSTRAP_FILE


def test_register_and_login(monkeypatch, tmp_path):
    users = tmp_path / "users.json"
    monkeypatch.setattr(auth_service, "USERS_FILE", users)
    monkeypatch.delenv("ARGOS_ADMIN_PASSWORD", raising=False)

    auth_service.register_user("testuser", "secret12")
    user = auth_service.authenticate("testuser", "secret12")
    assert user is not None
    assert user["username"] == "testuser"


def test_admin_login_bootstrap(monkeypatch, tmp_path):
    bootstrap = tmp_path / ".env.bootstrap"
    bootstrap.write_text("LLM_PROVIDER=gemini\nGEMINI_API_KEY=test-key\n", encoding="utf-8")
    env_out = tmp_path / ".env"
    env_out.write_text(
        "LLM_PROVIDER=gemini\nGEMINI_API_KEY=old\n"
        "ARGOS_ADMIN_USER=admin\nARGOS_ADMIN_PASSWORD=adminpass\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("backend.utils.bootstrap.BOOTSTRAP_FILE", bootstrap)
    monkeypatch.setattr("backend.utils.bootstrap.ENV_FILE", env_out)
    monkeypatch.setattr("backend.utils.env_config.ENV_FILE", env_out)

    user = auth_service.authenticate("admin", "adminpass")
    assert user is not None
    assert user["is_admin"] is True
    assert env_out.is_file()
    text = env_out.read_text(encoding="utf-8")
    assert "ARGOS_ADMIN_PASSWORD=adminpass" in text
