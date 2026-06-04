"""LLM servis birim testleri."""

import pytest

from backend.services import llm_service


@pytest.fixture(autouse=True)
def _skip_dotenv_file(monkeypatch, tmp_path):
    """Testlerde backend/.env dosyası monkeypatch'i ezmesin."""
    monkeypatch.setattr("backend.utils.env_config.ENV_FILE", tmp_path / "no.env")
    monkeypatch.setattr("backend.services.llm_service.load_env", lambda: None)


def test_invalid_provider_raises(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValueError, match="Geçersiz LLM_PROVIDER"):
        import asyncio

        asyncio.run(llm_service.call_llm("test", 50, system="sys"))


def test_missing_anthropic_key_raises(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "anthropic")
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
        import asyncio

        asyncio.run(llm_service.call_llm("test", 50))


def test_missing_gemini_key_raises(monkeypatch):
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ValueError, match="GEMINI_API_KEY"):
        import asyncio

        asyncio.run(llm_service.call_llm("test", 50))
