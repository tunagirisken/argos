# ARGOS — Özet (≈1 min okuma)

**Amaç:** Linux'ta çalışan kişisel portföy botu (MRVL, AVAV, NVDA + nakit).

**Stack:** FastAPI, yfinance, pandas/numpy teknik, Firecrawl→Exa haber, Anthropic Claude, Telegram, APScheduler (Europe/Istanbul).

**Veri:** `backend/data/portfolio.json`, `alerts.json`, `alerts_log.json` — JSON dosya DB.

**Giriş:** `backend/main.py` → router'lar `backend/api/routes/`, WS `backend/api/websocket.py`.

**Servisler:** `backend/services/{price,technical,news,claude,telegram,alert}_service.py`

**Zamanlama:** `backend/schedulers/jobs.py` — 09:00 brifing, 16:30 açılış (Claude yok), 23:05 kapanış, */5 dk alarm, saatlik teknik cache.

**Piyasa:** `is_us_market_hours()` = hafta içi TR 16:30–23:00.

**Frontend (plan):** CORS `http://localhost:3000`.

Daha fazla detay için bu dosyayı genişletme; `architecture.md` veya `api-endpoints.md` kullan.
