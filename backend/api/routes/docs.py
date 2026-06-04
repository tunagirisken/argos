"""Dokümantasyon API — Telegram komutları ve hedef fiyat rehberi."""

from pathlib import Path

from fastapi import APIRouter, HTTPException

from backend.services.telegram_bot_service import get_command_catalog

router = APIRouter(prefix="/docs", tags=["docs"])

DOCS_ROOT = Path(__file__).resolve().parents[3] / "docs"


def _read_doc(name: str) -> str:
    path = DOCS_ROOT / name
    if not path.is_file():
        raise HTTPException(404, detail=f"Doküman bulunamadı: {name}")
    return path.read_text(encoding="utf-8")


@router.get("/telegram")
def telegram_docs():
    """Telegram komutları — yapılandırılmış liste + markdown."""
    return {
        "commands": get_command_catalog(),
        "markdown": _read_doc("TELEGRAM-COMMANDS.md"),
    }


@router.get("/targets")
def target_docs():
    """Hedef fiyat kaynakları ve güvenilirlik."""
    return {"markdown": _read_doc("TARGET-PRICES.md")}


@router.get("/telegram/markdown")
def telegram_markdown():
    return {"markdown": _read_doc("TELEGRAM-COMMANDS.md")}
