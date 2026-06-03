#!/usr/bin/env bash
# ARGOS — backend pytest + frontend build
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="${ROOT}/.tools/node/bin:${PATH}"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  .venv/bin/pip install -r backend/requirements.txt -q
fi

echo "==> Backend testleri (pytest)"
.venv/bin/python -m pytest backend/tests -q

if ! command -v npm >/dev/null 2>&1; then
  echo "HATA: npm bulunamadı (Node 18+ veya .tools/node)"
  exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
  (cd frontend && npm install)
fi

echo "==> Frontend derleme (tsc + vite build)"
(cd frontend && npm run build)

echo "==> Tamamlandı"
