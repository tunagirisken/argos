"""Kullanıcı bazlı sohbet geçmişi saklama servisi."""

from datetime import datetime, timezone
from uuid import uuid4

from backend.utils.json_store import read_json, write_json
from backend.utils.paths import CHAT_HISTORY_FILE


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _load() -> dict:
    data = read_json(CHAT_HISTORY_FILE, default={"sessions": []})
    if not isinstance(data, dict):
        return {"sessions": []}
    sessions = data.get("sessions")
    if not isinstance(sessions, list):
        data["sessions"] = []
    return data


def _save(data: dict) -> None:
    write_json(CHAT_HISTORY_FILE, data)


def _title_from_text(text: str) -> str:
    clean = " ".join((text or "").strip().split())
    if not clean:
        return "Yeni Sohbet"
    return clean[:48] + ("…" if len(clean) > 48 else "")


def list_sessions(username: str) -> list[dict]:
    data = _load()
    rows = [s for s in data["sessions"] if s.get("user") == username]
    rows.sort(key=lambda s: s.get("updated_at", ""), reverse=True)
    out: list[dict] = []
    for s in rows:
        msgs = s.get("messages", [])
        last_msg = msgs[-1]["content"] if msgs else ""
        out.append(
            {
                "id": s["id"],
                "title": s.get("title") or "Yeni Sohbet",
                "created_at": s.get("created_at"),
                "updated_at": s.get("updated_at"),
                "message_count": len(msgs),
                "last_message_preview": _title_from_text(last_msg),
            }
        )
    return out


def create_session(username: str, title: str | None = None) -> dict:
    data = _load()
    now = _now_iso()
    session = {
        "id": uuid4().hex,
        "user": username,
        "title": title.strip() if title and title.strip() else "Yeni Sohbet",
        "created_at": now,
        "updated_at": now,
        "messages": [],
    }
    data["sessions"].append(session)
    _save(data)
    return session


def get_session(username: str, session_id: str) -> dict | None:
    data = _load()
    for s in data["sessions"]:
        if s.get("id") == session_id and s.get("user") == username:
            return s
    return None


def add_message(username: str, session_id: str, role: str, content: str) -> dict:
    data = _load()
    for s in data["sessions"]:
        if s.get("id") == session_id and s.get("user") == username:
            now = _now_iso()
            msg = {
                "id": uuid4().hex,
                "role": role,
                "content": content,
                "created_at": now,
            }
            s.setdefault("messages", []).append(msg)
            if s.get("title") in ("", "Yeni Sohbet") and role == "user":
                s["title"] = _title_from_text(content)
            s["updated_at"] = now
            _save(data)
            return msg
    raise ValueError("Sohbet bulunamadı")


def delete_session(username: str, session_id: str) -> bool:
    data = _load()
    before = len(data["sessions"])
    data["sessions"] = [s for s in data["sessions"] if not (s.get("id") == session_id and s.get("user") == username)]
    if len(data["sessions"]) == before:
        return False
    _save(data)
    return True
