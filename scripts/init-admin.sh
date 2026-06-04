#!/usr/bin/env bash
# Admin bootstrap dosyası oluştur (anahtarları siz doldurursunuz)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f backend/.env.bootstrap ]; then
  echo "backend/.env.bootstrap zaten var — üzerine yazılmadı."
else
  cp backend/.env.bootstrap.example backend/.env.bootstrap
  echo "Oluşturuldu: backend/.env.bootstrap"
  echo "Düzenleyin: nano backend/.env.bootstrap"
fi

echo ""
echo "Admin şifresi için (sunucuda bir kez):"
echo "  export ARGOS_ADMIN_USER=admin"
echo "  export ARGOS_ADMIN_PASSWORD='...'"
echo "  export ARGOS_JWT_SECRET=\$(openssl rand -hex 32)"
echo ""
echo "Detay: docs/ADMIN-SETUP.md"
