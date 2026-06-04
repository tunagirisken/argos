"""Telegram yardımcı testleri."""

from backend.services.telegram_service import split_message


def test_split_message_short():
    assert split_message("kısa") == ["kısa"]


def test_split_message_chunks():
    text = "a" * 5000
    parts = split_message(text, 4000)
    assert len(parts) == 2
    assert sum(len(p) for p in parts) >= 5000 - 10
    assert all(len(p) <= 4000 for p in parts)


def test_split_message_prefers_paragraph():
    para = "x" * 2000
    text = f"{para}\n\n{para}"
    parts = split_message(text, 4000)
    assert len(parts) >= 1
    assert all(len(p) <= 4000 for p in parts)
