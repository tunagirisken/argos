#!/usr/bin/env bash
# ARGOS semver bump — VERSION + backend + frontend senkronu
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUMP="${1:-patch}"
if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Kullanım: $0 [patch|minor|major]"
  exit 1
fi

if [[ ! -f VERSION ]]; then
  echo "1.0.0" > VERSION
fi

VER="$(tr -d '[:space:]' < VERSION)"
IFS=. read -r MA MI PA _ <<< "${VER}."
MA=${MA:-1}; MI=${MI:-0}; PA=${PA:-0}

case "$BUMP" in
  major) MA=$((MA + 1)); MI=0; PA=0 ;;
  minor) MI=$((MI + 1)); PA=0 ;;
  patch) PA=$((PA + 1)) ;;
esac

NEW="${MA}.${MI}.${PA}"
echo "$NEW" > VERSION

# Backend FastAPI version
sed -i "s/version=\"[0-9.]*\"/version=\"${NEW}\"/" backend/main.py

# Frontend package.json
sed -i "s/\"version\": \"[0-9.]*\"/\"version\": \"${NEW}\"/" frontend/package.json

# package-lock kök sürümü (ilk iki eşleşme)
sed -i "0,/\"version\": \"[0-9.]*\"/s//\"version\": \"${NEW}\"/" frontend/package-lock.json
sed -i "0,/\"version\": \"[0-9.]*\"/s//\"version\": \"${NEW}\"/" frontend/package-lock.json

echo "Sürüm → v${NEW}"
