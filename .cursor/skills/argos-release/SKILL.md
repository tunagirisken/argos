---
name: argos-release
description: >-
  ARGOS sürüm yayını: make test-all, semver bump, commit, git tag, push.
  Kullanıcı "release", "commit push", "sürüm güncelle", "yayınla" dediğinde uygula.
disable-model-invocation: true
---

# ARGOS Release

## Ne zaman

Kullanıcı release, commit+push, sürüm bump veya "projeyi yayınla" istediğinde bu akışı uygula.

## Akış (tercih: script)

```bash
chmod +x scripts/release.sh scripts/bump_version.sh
./scripts/release.sh minor "Kısa özet: ne değişti"
```

| Argüman | Varsayılan | Etki |
|---------|------------|------|
| `patch` | ✓ | 1.0.0 → 1.0.1 (bugfix) |
| `minor` | | 1.0.0 → 1.1.0 (özellik) |
| `major` | | 1.0.0 → 2.0.0 (kırıcı) |

Script sırası: `make test-all` → `bump_version.sh` → `git add` → commit → `git tag vX.Y.Z` → `git push origin main` + tag.

## Sürüm kaynakları (senkron)

- `VERSION` (tek kaynak)
- `backend/main.py` → `version=`
- `frontend/package.json` + `package-lock.json`

## Commit kuralları

- `.env` ve `backend/.env` asla commit etme
- Runtime veri commit etme: `alerts_log.json`, `chat_history.json`, `last_discovery.json`
- `frontend/tsconfig.tsbuildinfo` commit etme

## Manuel alternatif

```bash
make test-all
./scripts/bump_version.sh patch
git add -A
git commit -m "Release v$(cat VERSION)."
git tag -a "v$(cat VERSION)" -m "Release v$(cat VERSION)"
git push origin main && git push origin "v$(cat VERSION)"
```

## Makefile kısayolları

- `make release` → patch release
- `make release-minor` → minor release
- `make release-major` → major release
