# Mimari

```
Client → FastAPI (main.py)
           ├─ /api/* routes
           ├─ WS /ws/prices (60s, piyasa saatinde)
           └─ lifespan → APScheduler
Services ← routes / jobs
  price_service      yfinance, cache 60s, 3× retry
  technical_service  RSI/MACD/BB/EMA, sinyal skoru
  news_service       Firecrawl → Exa, title+url+date only
  claude_service     COMPACT_SYSTEM, max_tokens sınırlı
  telegram_service   aiohttp Bot API
  alert_service      6 kural + spam 3/gün + alerts.json
Persist: utils/json_store.py + utils/paths.py
Logs: backend/logs/argos_YYYY-MM-DD.log
Sentry: main.py init (SENTRY_DSN)
```

## Alarm kuralları (piyasa saatinde, 5 dk)

1. price ≤ stop_loss → ACİL + Claude kısa
2. price ≤ stop×1.03 → UYARI
3. price ≥ target → HEDEF
4. |günlük %| ≥ 5 → HAREKET
5. RSI>75 / RSI<30

## Dosya ekleme rehberi

- Yeni endpoint → `api/routes/<alan>.py` + `main.py` include
- Yeni harici API → `services/<ad>_service.py`
- Zamanlı iş → `schedulers/jobs.py`
