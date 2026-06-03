"""Üretim: derlenmiş React arayüzünü FastAPI ile aynı porttan sun."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = REPO_ROOT / "frontend" / "dist"


def frontend_dist_ready() -> bool:
    return (DIST_DIR / "index.html").is_file()


def mount_frontend(app: FastAPI) -> None:
    """`frontend/dist` varsa SPA + statik dosyaları bağla (API/WS route'larından sonra çağır)."""
    if not frontend_dist_ready():
        return

    assets = DIST_DIR / "assets"
    if assets.is_dir():
        app.mount(
            "/assets",
            StaticFiles(directory=str(assets)),
            name="argos-frontend-assets",
        )

    @app.get("/", include_in_schema=False)
    async def ui_index():
        return FileResponse(DIST_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def ui_spa(full_path: str):
        reserved = (
            "api",
            "ws",
            "health",
            "docs",
            "redoc",
            "openapi.json",
        )
        if full_path == "" or full_path.split("/", 1)[0] in reserved:
            raise HTTPException(status_code=404)
        if full_path.startswith("assets/"):
            raise HTTPException(status_code=404)
        candidate = DIST_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(DIST_DIR / "index.html")
