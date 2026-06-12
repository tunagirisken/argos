# ARGOS — Agent talimatları (Cursor / Codex)

## Bağlam yükleme (token tasarrufu)

1. Bu dosyayı oku (kısa).
2. Göreve göre **tek** ek dosya: `ai/context/<konu>.md`
3. `ai/context/` dışında geniş arama yapma; kullanıcı dosya verdiyse onu kullan.

## Dizinler

```
backend/     FastAPI uygulaması
ai/context/  Kompakt referans (öncelikli)
ai/prompts/  Görev şablonları
```

## Kurallar

- Türkçe yorum; odaklı patch.
- Plan dosyasını (`*.plan.md`) düzenleme.
- **Backend geliştirme döngüsü:** test → semver bump → commit → push (`.cursor/rules/dev-workflow.mdc`).
- Detay: `.cursor/rules/argos-global.mdc`, `backend-python.mdc`, `dev-workflow.mdc`

## Komutlar

| Komut | Açıklama |
|-------|----------|
| `make install` | venv + pip |
| `make run` | uvicorn :8000 |
| `make lint` | ruff (opsiyonel) |
| `make test-all` | pytest + frontend build |
| `make release-patch` | test → bump → commit → tag → push |

Repo: `git@github.com:tunagirisken/argos.git`
