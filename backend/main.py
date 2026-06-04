"""ARGOS FastAPI uygulaması — giriş noktası."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.middleware.jwt_auth import JWTAuthMiddleware

from backend.api.routes import (
    alerts,
    analysis,
    auth,
    discovery,
    docs,
    market,
    news,
    symbols,
    portfolio,
    prices,
    setup,
    technical,
)
from backend.api.websocket import router as ws_router
from backend.schedulers.jobs import start_scheduler, stop_scheduler
from backend.services.telegram_bot_service import start_bot, stop_bot
from backend.ui import mount_frontend
from backend.utils.env_config import load_env
from backend.utils.logging_config import setup_logging

load_env()

if os.getenv("ENV", "development").lower() == "production":
    if not (os.getenv("ARGOS_JWT_SECRET") or os.getenv("JWT_SECRET")):
        raise RuntimeError("ARGOS_JWT_SECRET tanımlı olmalı (ENV=production)")

# Sentry — mümkün olan en erken
_sentry_dsn = os.getenv("SENTRY_DSN")
if _sentry_dsn:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=_sentry_dsn,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        traces_sample_rate=0.1,
        environment=os.getenv("ENV", "development"),
    )

setup_logging(os.getenv("LOG_LEVEL", "INFO"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Başlangıç: scheduler + Telegram bot. Kapanış: graceful stop."""
    start_scheduler()
    await start_bot()
    yield
    await stop_bot()
    stop_scheduler()


app = FastAPI(
    title="ARGOS",
    description="Kişisel portföy yönetim botu — backend API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(JWTAuthMiddleware)

# REST API
api_prefix = "/api"
app.include_router(portfolio.router, prefix=api_prefix)
app.include_router(prices.router, prefix=api_prefix)
app.include_router(market.router, prefix=api_prefix)
app.include_router(technical.router, prefix=api_prefix)
app.include_router(analysis.router, prefix=api_prefix)
app.include_router(discovery.router, prefix=api_prefix)
app.include_router(news.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(setup.router, prefix=api_prefix)
app.include_router(auth.router, prefix=api_prefix)
app.include_router(docs.router, prefix=api_prefix)
app.include_router(symbols.router, prefix=api_prefix)

# WebSocket
app.include_router(ws_router)


@app.get("/health")
async def health():
    """Sağlık kontrolü."""
    return {"status": "ok", "service": "argos-backend"}


if os.getenv("ARGOS_SERVE_UI", "").lower() in ("1", "true", "yes"):
    mount_frontend(app)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
