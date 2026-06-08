#!/usr/bin/env bash
# ARGOS release: test → bump → commit → tag → push
# Kullanım: ./scripts/release.sh [patch|minor|major] ["ek commit notu"]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUMP="${1:-patch}"
NOTE="${2:-}"

RUNTIME_IGNORE=(
  backend/data/alerts_log.json
  backend/data/chat_history.json
  backend/data/last_discovery.json
)

echo "==> 1/5 Testler (make test-all)"
make test-all

echo "==> 2/5 Sürüm bump ($BUMP)"
chmod +x scripts/bump_version.sh
./scripts/bump_version.sh "$BUMP"
NEW_VER="$(tr -d '[:space:]' < VERSION)"
TAG="v${NEW_VER}"

echo "==> 3/5 Git stage"
git add -A
for f in "${RUNTIME_IGNORE[@]}"; do
  git restore --staged "$f" 2>/dev/null || true
done
# tsbuildinfo derleme artefaktı
git restore --staged frontend/tsconfig.tsbuildinfo 2>/dev/null || true

if git diff --cached --quiet; then
  echo "Commit edilecek değişiklik yok."
  exit 0
fi

echo "==> 4/5 Commit + tag ($TAG)"
BODY="Release ${TAG}."
if [[ -n "$NOTE" ]]; then
  BODY="${BODY}

${NOTE}"
fi

git commit -m "$(cat <<EOF
${BODY}

EOF
)"
git tag -a "$TAG" -m "Release ${TAG}"

echo "==> 5/5 Push (origin main + ${TAG})"
git push origin main
git push origin "$TAG"

echo "Tamamlandı: ${TAG}"
