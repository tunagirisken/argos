# Mimari

```
Client (React)
  authStore ─ JWT session
  portfolioStore ─ stocks, summary, tradeSignals, WS applyMarketUpdate
  api.ts / ws.ts

FastAPI (main.py)
  ├─ JWTAuthMiddleware — /api/* Bearer (auth login/register hariç)
  ├─ /api/* (12 routers)
  ├─ WS /ws/prices → market snapshots + trade signals (60s)
  └─ lifespan → APScheduler + Telegram bot

Services
  price_service          yfinance, cache 60s
  chart_service          OHLCV for lightweight-charts
  technical_service      RSI/MACD/BB/EMA, signals
  market_data_service    bundle + snapshot aggregation
  news_service           Firecrawl → Exa
  llm_service            anthropic | gemini
  claude_service         prompts via llm_service
  trade_signal_service   AL/SAT/İZLE scoring
  trade_alert_service    5m job, Telegram on decision change
  discovery_service      4-layer funnel, LLM top 5
  analyst_target_service yfinance + Firecrawl
  alert_service          rules + spam limit
  auth_service           JWT + users.json
  telegram_*             outbound + command bot
  symbol_search_service  nasdaq_symbols.json

Persist: utils/json_store.py + backend/data/*.json
Logs: backend/logs/argos_YYYY-MM-DD.log
```

## Frontend routes (authenticated)

`/dashboard` · `/stock/:symbol` · `/discovery` · `/ai` · `/alarms` · `/docs` · `/settings`

Stock detail supports **watch mode** for symbols not in portfolio (e.g. from Discovery).

## Real-time sync

- WebSocket sends full market snapshots every 60s (US market hours)
- REST fallback: `POST /api/market/snapshot` + 60s poll when WS down
- `portfolioStore.applyMarketUpdate` updates price, signal, RSI, trade scores app-wide

## Scheduler (Europe/Istanbul)

| Job | When |
|-----|------|
| Morning briefing + discovery | Mon–Fri 09:00 |
| Market open report | Mon–Fri 16:30 |
| Closing report | Mon–Fri 23:05 |
| Alert + trade checks | Every 5 min |
| Technical cache refresh | Hourly |

## Dosya ekleme rehberi

- Yeni endpoint → `api/routes/<alan>.py` + `main.py`
- Yeni harici API → `services/<ad>_service.py`
- Zamanlı iş → `schedulers/jobs.py`
- Frontend sayfa → `features/<alan>/` + `App.tsx` route

See `docs/STABILIZATION-AUDIT.md` for tech debt and security notes.
