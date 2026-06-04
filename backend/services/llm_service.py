"""Çoklu LLM sağlayıcı — Anthropic ve Google Gemini."""

import asyncio
import logging
import os

from anthropic import Anthropic

from backend.utils.env_config import load_env

logger = logging.getLogger(__name__)

ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
GEMINI_MODEL = "gemini-2.5-flash"
# Rapor/brifing/analiz — 2.5-flash thinking token harcar, yüksek tavan gerekir
GEMINI_MIN_REPORT_TOKENS = 8192
GEMINI_SHORT_WARN_LEN = 200


def _provider() -> str:
    return (os.getenv("LLM_PROVIDER") or "anthropic").strip().lower()


async def call_llm(prompt: str, max_tokens: int, system: str = "") -> str:
    """LLM_PROVIDER'a göre Anthropic veya Gemini ile metin üret."""
    load_env()
    provider = _provider()
    tokens = max_tokens
    if provider == "gemini" and max_tokens >= 400:
        tokens = max(max_tokens, GEMINI_MIN_REPORT_TOKENS)

    if provider == "anthropic":
        return await _call_anthropic(prompt, tokens, system)
    if provider == "gemini":
        return await _call_gemini(prompt, tokens, system)
    msg = f"Geçersiz LLM_PROVIDER: {provider!r} (anthropic | gemini)"
    logger.error(msg)
    raise ValueError(msg)


async def _call_anthropic(prompt: str, max_tokens: int, system: str) -> str:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        msg = "ANTHROPIC_API_KEY tanımlı değil"
        logger.error(msg)
        raise ValueError(msg)

    client = Anthropic(api_key=key)

    def _sync() -> str:
        msg = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            system=system or "Sen yardımcı bir asistansın.",
            messages=[{"role": "user", "content": prompt}],
        )
        parts = []
        for block in msg.content:
            if hasattr(block, "text"):
                parts.append(block.text)
        return "\n".join(parts) or "Yanıt alınamadı."

    return await asyncio.to_thread(_sync)


def _extract_gemini_text(response) -> str:
    """response.text başarısız olunca aday parçalarından metin topla."""
    try:
        text = (response.text or "").strip()
        if text:
            return text
    except (ValueError, AttributeError):
        pass
    chunks: list[str] = []
    for cand in getattr(response, "candidates", None) or []:
        content = getattr(cand, "content", None)
        if not content:
            continue
        for part in getattr(content, "parts", None) or []:
            if hasattr(part, "text") and part.text:
                chunks.append(part.text)
    return "\n".join(chunks).strip()


async def _call_gemini(prompt: str, max_tokens: int, system: str) -> str:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        msg = "GEMINI_API_KEY tanımlı değil"
        logger.error(msg)
        raise ValueError(msg)

    def _sync() -> str:
        import google.generativeai as genai

        genai.configure(api_key=key)
        model = genai.GenerativeModel(
            GEMINI_MODEL,
            system_instruction=system or None,
        )
        generation_config = genai.GenerationConfig(
            max_output_tokens=max_tokens,
            temperature=0.4,
        )
        response = model.generate_content(
            prompt,
            generation_config=generation_config,
        )
        text = _extract_gemini_text(response)
        finish = None
        if getattr(response, "candidates", None):
            finish = getattr(response.candidates[0], "finish_reason", None)

        # Thinking modeli erken MAX_TOKENS ile keserse devam ettir
        finish_name = str(finish).upper() if finish is not None else ""
        if "MAX_TOKENS" in finish_name and len(text) < 500:
            logger.warning(
                "Gemini yanıt kesildi (len=%s), devam isteniyor (finish_reason=%s)",
                len(text),
                finish,
            )
            cont = model.generate_content(
                "Önceki yanıt yarım kaldı. Aşağıdaki metinden devam et; "
                "eksik bölümleri (Teknik, Risk, Aksiyon) tamamla. Giriş cümlesi ekleme.\n\n"
                + text,
                generation_config=generation_config,
            )
            text = (text + "\n" + _extract_gemini_text(cont)).strip()

        if not text or len(text) < GEMINI_SHORT_WARN_LEN:
            logger.warning(
                "Gemini kısa/boş yanıt (len=%s, max_output_tokens=%s, finish_reason=%s)",
                len(text),
                max_tokens,
                finish,
            )
        return text or "Yanıt alınamadı."

    return await asyncio.to_thread(_sync)
