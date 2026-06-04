#!/usr/bin/env bash
# Cursor eklentileri — CLI ve frontend bağımlılıkları
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${ROOT}/.tools/node/bin:${PATH}"

echo "→ Firecrawl CLI (global)"
if command -v firecrawl >/dev/null 2>&1; then
  firecrawl --version
else
  npm install -g firecrawl-cli
  echo "  firecrawl login --browser  # bir kez çalıştırın"
fi

echo "→ Frontend (shadcn zaten init ise npm install)"
(cd frontend && npm install)

echo ""
echo "Sonraki adımlar:"
echo "  1. Cursor Settings → Plugins: Figma, shadcn, Firecrawl → Enable + Auth"
echo "  2. backend/.env: FIRECRAWL_API_KEY, EXA_API_KEY (wizard Haber API bölümü)"
echo "  3. ./scripts/start.sh"
echo "  4. ./scripts/check-integrations.sh"
