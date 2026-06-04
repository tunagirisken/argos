#!/usr/bin/env bash
# ARGOS entegrasyon sağlık kontrolü
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export PATH="${ROOT}/.tools/node/bin:${PATH}"

echo "==> Backend health"
curl -sf "http://127.0.0.1:8000/health" && echo "" || echo "Backend kapalı (8000)"

echo "==> Entegrasyon durumu"
curl -sf "http://127.0.0.1:8000/api/setup/integrations" 2>/dev/null | python3 -m json.tool || echo "(backend yanıt vermedi)"

echo "==> Haber örneği (NVDA)"
curl -sf "http://127.0.0.1:8000/api/news/NVDA" 2>/dev/null | python3 -m json.tool | head -20 || echo "(haber endpoint yok / key eksik)"

echo "==> Firecrawl CLI"
if command -v firecrawl >/dev/null 2>&1; then
  firecrawl --version --auth-status 2>/dev/null || firecrawl --version
else
  echo "firecrawl CLI yok: npm install -g firecrawl-cli && firecrawl login --browser"
fi

echo "==> shadcn"
if [ -f frontend/components.json ]; then
  echo "components.json OK"
  (cd frontend && npx shadcn@latest info 2>/dev/null | head -5) || true
else
  echo "shadcn kurulu değil"
fi

echo "==> Frontend build (kısa)"
(cd frontend && npm run build) >/dev/null && echo "build OK" || echo "build FAIL"

echo "==> Tamamlandı"
