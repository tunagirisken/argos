# ARGOS — Claude Code talimatları

Önce **yalnızca** ihtiyaç duyulan `ai/context/*.md` dosyasını oku; tüm repo taraması yapma.

## Proje

Kişisel portföy botu: FastAPI backend (`backend/`), ileride frontend `localhost:3000`.

## Hızlı harita

| Konu | Dosya |
|------|--------|
| Genel | `ai/context/overview.md` |
| API | `ai/context/api-endpoints.md` |
| Mimari | `ai/context/architecture.md` |
| Token/Claude | `ai/context/token-policy.md` |
| Stack | `ai/context/stack.md` |

## Sabit kurallar

- Yorumlar **Türkçe**; minimal diff.
- Claude API: yalnızca brifing, kapanış, manuel analiz, ACİL stop-loss (`backend/services/claude_service.py`).
- Haberler: başlık+URL+tarih; içerik LLM'e gönderilmez.
- Piyasa penceresi TR: hafta içi 16:30–23:00 (`utils/market_hours.py`).
- `.env` commit etme.

## Çalıştırma

```bash
make install && cp backend/.env.example backend/.env
make run
```

## Değişiklik sonrası

API veya scheduler değiştiyse `ai/context/api-endpoints.md` veya `architecture.md` güncelle.
