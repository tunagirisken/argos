# API (prefix `/api`)

**Auth:** Tüm endpoint'ler JWT Bearer gerektirir; istisna: `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`.

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/register` | Yeni kullanıcı |
| POST | `/auth/login` | JWT token |
| GET | `/auth/me` | Bearer token gerekli |
| POST | `/auth/logout` | Stateless |

## Portfolio

| Method | Path |
|--------|------|
| GET | `/portfolio` |
| GET | `/portfolio/summary` |
| POST | `/portfolio/position` |
| PUT | `/portfolio/position/{symbol}` |
| DELETE | `/portfolio/position/{symbol}` |
| GET | `/portfolio/targets/{symbol}` |
| POST | `/portfolio/sync-targets` |

## Market & prices

| Method | Path | Notes |
|--------|------|-------|
| GET | `/prices/all` | Canlı fiyatlar |
| GET | `/prices/{symbol}` | Tek sembol |
| GET | `/prices/{symbol}/chart` | OHLCV serileri |
| GET | `/market/{symbol}/bundle` | Grafik + sinyal + indikatör |
| GET | `/market/hours` | NYSE açık/kapalı (TR saati) |
| POST | `/market/bundle` | Toplu bundle |
| POST | `/market/snapshot` | Hafif fiyat + sinyal (WS/poll) |

## Technical & analysis

| Method | Path |
|--------|------|
| GET | `/technical/{symbol}/signal` |
| GET | `/technical/{symbol}` |
| POST | `/analysis/portfolio` |
| POST | `/analysis/chat` |
| GET | `/analysis/{symbol}` |
| GET | `/analysis/trade-signal/{symbol}` |
| GET | `/analysis/trade-signals/portfolio` |

## Discovery, news, alerts

| Method | Path |
|--------|------|
| POST | `/discovery/scan` |
| GET | `/discovery/latest` |
| GET | `/news/portfolio` |
| GET | `/news/{symbol}` |
| GET | `/alerts/log` |
| GET | `/alerts` |
| POST | `/alerts` |
| DELETE | `/alerts/{id}` |

## Setup & symbols

| Method | Path |
|--------|------|
| GET | `/setup/status` |
| GET | `/setup/integrations` |
| POST | `/setup/env` |
| POST | `/setup/portfolio` |
| POST | `/setup/complete` |
| DELETE | `/setup/reset` |
| GET | `/symbols/search?q=` |
| POST | `/symbols/refresh` |

## Docs & health

| Method | Path |
|--------|------|
| GET | `/docs/telegram` |
| GET | `/docs/targets` |
| GET | `/docs/telegram/markdown` |
| GET | `/health` | (no `/api` prefix) |

## WebSocket

| Path | Payload |
|------|---------|
| `WS /ws/prices` | `{ type: "market", data: {SYMBOL: snapshot}, trade_signals: [], market_open }` |

CORS: `localhost:3000`, `5173`, `8000`. Swagger: `/docs`.

**Security note:** Frontend auth gates UI; most REST routes are currently unauthenticated — deploy only on trusted networks until JWT middleware is added.
