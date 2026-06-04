"""JWT doğrulama — /api/* için Bearer token (auth endpoint'leri hariç)."""

import os

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from backend.services import auth_service

PUBLIC_EXACT = frozenset({"/health", "/openapi.json", "/docs", "/redoc"})
PUBLIC_PREFIXES = (
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/logout",
)


def _auth_disabled() -> bool:
    return os.getenv("ARGOS_AUTH_DISABLED", "").lower() in ("1", "true", "yes")


def _is_public(path: str) -> bool:
    if path in PUBLIC_EXACT:
        return True
    return any(path == p or path.startswith(f"{p}/") for p in PUBLIC_PREFIXES)


class JWTAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if _auth_disabled():
            return await call_next(request)

        path = request.url.path
        if path.startswith("/ws") or _is_public(path):
            return await call_next(request)

        if not path.startswith("/api"):
            return await call_next(request)

        auth = request.headers.get("authorization", "")
        if not auth.startswith("Bearer "):
            return JSONResponse({"detail": "Oturum gerekli"}, status_code=401)

        token = auth[7:].strip()
        if not auth_service.decode_token(token):
            return JSONResponse({"detail": "Geçersiz veya süresi dolmuş oturum"}, status_code=401)

        return await call_next(request)
