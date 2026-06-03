"""ARGOS FastAPI uygulaması — giriş noktası."""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import (
    alerts,
    analysis,
    news,
    portfolio,
    prices,
    setup,
    technical,
)
from backend.api.websocket import router as ws_router
from backend.schedulers.jobs import start_scheduler, stop_scheduler
from backend.ui import mount_frontend
from backend.utils.logging_config import setup_logging

# .env yükle
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

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
    """Başlangıç: scheduler. Kapanış: graceful stop."""
    start_scheduler()
    yield
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

# REST API
api_prefix = "/api"
app.include_router(portfolio.router, prefix=api_prefix)
app.include_router(prices.router, prefix=api_prefix)
app.include_router(technical.router, prefix=api_prefix)
app.include_router(analysis.router, prefix=api_prefix)
app.include_router(news.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(setup.router, prefix=api_prefix)

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
