"""Yerel kullanıcı oturumu — admin + kayıtlı üyeler."""

import logging
import os
from datetime import datetime, timedelta, timezone

import jwt

from backend.utils.bootstrap import apply_admin_bootstrap
from backend.utils.env_config import load_env
from backend.utils.json_store import read_json, write_json
from backend.utils.passwords import hash_password, verify_password
from backend.utils.paths import DATA_DIR

logger = logging.getLogger(__name__)

USERS_FILE = DATA_DIR / "users.json"
JWT_ALG = "HS256"
JWT_EXP_HOURS = 72


def _jwt_secret() -> str:
    secret = os.getenv("ARGOS_JWT_SECRET") or os.getenv("JWT_SECRET")
    if not secret:
        secret = "argos-dev-change-me"
        logger.warning("ARGOS_JWT_SECRET tanımlı değil — geliştirme varsayılanı kullanılıyor")
    return secret


def _load_users() -> list[dict]:
    return read_json(USERS_FILE, default=[])


def _save_users(users: list[dict]) -> None:
    write_json(USERS_FILE, users)


def create_token(username: str, is_admin: bool) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": username,
        "admin": is_admin,
        "exp": now + timedelta(hours=JWT_EXP_HOURS),
        "iat": now,
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALG)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, _jwt_secret(), algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        return None


def register_user(username: str, password: str) -> dict:
    username = username.strip().lower()
    if len(username) < 3 or len(password) < 6:
        raise ValueError("Kullanıcı adı min 3, şifre min 6 karakter")
    users = _load_users()
    if any(u["username"] == username for u in users):
        raise ValueError("Bu kullanıcı adı zaten kayıtlı")
    users.append(
        {
            "username": username,
            "password_hash": hash_password(password),
            "is_admin": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    _save_users(users)
    return {"username": username, "is_admin": False}


def authenticate(username: str, password: str) -> dict | None:
    """Admin (ortam değişkeni) veya users.json."""
    load_env()
    username = username.strip().lower()
    admin_user = (os.getenv("ARGOS_ADMIN_USER") or "admin").strip().lower()
    admin_pass = os.getenv("ARGOS_ADMIN_PASSWORD") or ""

    if username == admin_user and admin_pass and password == admin_pass:
        apply_admin_bootstrap()
        return {"username": username, "is_admin": True}

    for u in _load_users():
        if u["username"] == username and verify_password(password, u["password_hash"]):
            return {"username": username, "is_admin": bool(u.get("is_admin"))}
    return None
