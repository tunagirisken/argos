# API (prefix `/api`)

| Method | Path | Modül |
|--------|------|--------|
| GET | `/portfolio` | portfolio |
| GET | `/portfolio/summary` | portfolio |
| POST | `/portfolio/position` | portfolio |
| PUT | `/portfolio/position/{symbol}` | portfolio |
| DELETE | `/portfolio/position/{symbol}` | portfolio |
| GET | `/prices/all` | prices |
| GET | `/prices/{symbol}` | prices |
| GET | `/technical/{symbol}/signal` | technical (önce signal route) |
| GET | `/technical/{symbol}` | technical |
| POST | `/analysis/portfolio` | analysis |
| POST | `/analysis/chat` | analysis |
| GET | `/analysis/{symbol}` | analysis |
| GET | `/news/portfolio` | news |
| GET | `/news/{symbol}` | news |
| GET | `/alerts/log` | alerts |
| GET | `/alerts` | alerts |
| POST | `/alerts` | alerts |
| DELETE | `/alerts/{id}` | alerts |
| WS | `/ws/prices` | websocket |
| GET | `/setup/status` | setup |
| POST | `/setup/env` | setup |
| POST | `/setup/portfolio` | setup |
| POST | `/setup/complete` | setup |
| DELETE | `/setup/reset` | setup |
| GET | `/health` | main |

CORS: `localhost:3000`. Swagger: `/docs`.
