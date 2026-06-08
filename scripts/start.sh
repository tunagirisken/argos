#!/usr/bin/env bash
# ARGOS — tek komutla backend + frontend
#   ./scripts/start.sh          → geliştirme (API :8000, UI :5173, Vite proxy)
#   ./scripts/start.sh prod     → tek port (UI+API http://localhost:8000)
#   ARGOS_MODE=prod ./scripts/start.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MODE="${ARGOS_MODE:-dev}"
if [ "${1:-}" = "prod" ] || [ "${1:-}" = "--prod" ]; then
  MODE="prod"
fi

export PATH="${ROOT}/.tools/node/bin:${PATH}"

if [ ! -d ".venv" ]; then
  echo "→ Python venv oluşturuluyor…"
  python3 -m venv .venv
  .venv/bin/pip install -r backend/requirements.txt -q
fi

_ensure_npm() {
  if command -v npm >/dev/null 2>&1; then
    return 0
  fi
  echo "HATA: npm bulunamadı."
  echo "  Node.js 18+ kurun veya: curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz | tar -xJ -C .tools && mv .tools/node-v22.14.0-linux-x64 .tools/node"
  exit 1
}

_free_ports() {
  echo "→ Eski süreçler temizleniyor (8000, 5173, 5174)…"
  for port in 8000 5173 5174; do
    fuser -k "${port}/tcp" 2>/dev/null || true
  done
  sleep 1
}

_wait_backend() {
  for _ in $(seq 1 40); do
    if kill -0 "$BACK_PID" 2>/dev/null && curl -sf "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
      return 0
    fi
    if ! kill -0 "$BACK_PID" 2>/dev/null; then
      echo "HATA: Backend süreci kapandı (port 8000 başka süreçte olabilir)."
      echo "  Kontrol: ss -tlnp | grep 8000"
      exit 1
    fi
    sleep 0.25
  done
  echo "HATA: Backend 8000 portunda yanıt vermiyor."
  exit 1
}

_cleanup() {
  if [ -n "${BACK_PID:-}" ]; then
    kill -TERM "$BACK_PID" 2>/dev/null || true
    sleep 0.5
    kill -9 "$BACK_PID" 2>/dev/null || true
  fi
  fuser -k -KILL 8000/tcp 5173/tcp 5174/tcp 2>/dev/null || true
}
trap _cleanup EXIT INT TERM

if [ "$MODE" = "prod" ]; then
  _ensure_npm
  if [ ! -d "frontend/node_modules" ]; then
    echo "→ frontend npm install…"
    (cd frontend && npm install)
  fi
  echo "→ Frontend production build…"
  (cd frontend && npm run build)
  echo ""
  echo "ARGOS (tek port)"
  echo "  Uygulama: http://localhost:8000"
  echo "  API docs: http://localhost:8000/docs"
  echo ""
  _free_ports
  export ARGOS_SERVE_UI=1
  exec .venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000
fi

# --- dev: Vite proxy ile birleşik geliştirme ---
_free_ports
_ensure_npm
if [ ! -d "frontend/node_modules" ]; then
  echo "→ frontend npm install…"
  (cd frontend && npm install)
fi

echo "→ Backend başlatılıyor (http://localhost:8000)…"
.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACK_PID=$!
_wait_backend

echo "→ Frontend başlatılıyor (http://localhost:5173)…"
echo "  API proxy: /api ve /ws → :8000"
echo "  Giriş: http://localhost:5173/login"
echo "  (ENOSPC: make prod veya sudo sysctl fs.inotify.max_user_watches=524288)"
echo ""
cd frontend
export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-true}"
exec npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
