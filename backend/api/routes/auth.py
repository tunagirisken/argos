"""Giriş ve üyelik."""

import logging

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from backend.services import auth_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])


class LoginBody(BaseModel):
    username: str = Field(min_length=3)
    password: str = Field(min_length=1)


class RegisterBody(BaseModel):
    username: str = Field(min_length=3)
    password: str = Field(min_length=6)


def _bearer(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, detail="Oturum gerekli")
    token = authorization[7:].strip()
    payload = auth_service.decode_token(token)
    if not payload:
        raise HTTPException(401, detail="Geçersiz veya süresi dolmuş oturum")
    return payload


@router.post("/register")
def register(body: RegisterBody):
    try:
        user = auth_service.register_user(body.username, body.password)
        token = auth_service.create_token(user["username"], user["is_admin"])
        return {"ok": True, "token": token, "user": user}
    except ValueError as e:
        raise HTTPException(400, detail=str(e))


@router.post("/login")
def login(body: LoginBody):
    user = auth_service.authenticate(body.username, body.password)
    if not user:
        raise HTTPException(401, detail="Kullanıcı adı veya şifre hatalı")
    token = auth_service.create_token(user["username"], user["is_admin"])
    bootstrap_applied = user["is_admin"]
    return {
        "ok": True,
        "token": token,
        "user": user,
        "bootstrap_applied": bootstrap_applied,
    }


@router.get("/me")
def me(payload: dict = Depends(_bearer)):
    return {
        "username": payload.get("sub"),
        "is_admin": bool(payload.get("admin")),
    }


@router.post("/logout")
def logout():
    return {"ok": True}
