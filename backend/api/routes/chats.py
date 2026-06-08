"""Sohbet geçmişi API."""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from backend.services import auth_service, chat_history_service

router = APIRouter(prefix="/chats", tags=["chats"])


class CreateChatBody(BaseModel):
    title: str | None = None


class MessageBody(BaseModel):
    role: str
    content: str


def _current_user(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(401, detail="Oturum gerekli")
    payload = auth_service.decode_token(auth[7:].strip())
    if not payload:
        raise HTTPException(401, detail="Geçersiz oturum")
    username = str(payload.get("sub") or "").strip().lower()
    if not username:
        raise HTTPException(401, detail="Geçersiz oturum")
    return username


@router.get("")
def list_chats(request: Request):
    username = _current_user(request)
    return {"sessions": chat_history_service.list_sessions(username)}


@router.post("")
def create_chat(body: CreateChatBody, request: Request):
    username = _current_user(request)
    s = chat_history_service.create_session(username, body.title)
    return {"id": s["id"], "title": s["title"], "created_at": s["created_at"], "updated_at": s["updated_at"]}


@router.get("/{session_id}")
def get_chat(session_id: str, request: Request):
    username = _current_user(request)
    s = chat_history_service.get_session(username, session_id)
    if not s:
        raise HTTPException(404, detail="Sohbet bulunamadı")
    return {
        "id": s["id"],
        "title": s.get("title") or "Yeni Sohbet",
        "created_at": s.get("created_at"),
        "updated_at": s.get("updated_at"),
        "messages": s.get("messages", []),
    }


@router.post("/{session_id}/messages")
def add_chat_message(session_id: str, body: MessageBody, request: Request):
    username = _current_user(request)
    role = body.role.strip().lower()
    if role not in ("user", "assistant"):
        raise HTTPException(400, detail="role: user veya assistant olmalı")
    content = body.content.strip()
    if not content:
        raise HTTPException(400, detail="content boş olamaz")
    try:
        msg = chat_history_service.add_message(username, session_id, role, content)
        return msg
    except ValueError as e:
        raise HTTPException(404, detail=str(e))


@router.delete("/{session_id}")
def delete_chat(session_id: str, request: Request):
    username = _current_user(request)
    ok = chat_history_service.delete_session(username, session_id)
    if not ok:
        raise HTTPException(404, detail="Sohbet bulunamadı")
    return {"ok": True}
