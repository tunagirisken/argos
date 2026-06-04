# ARGOS Testing Guide

## Automated

```bash
# Backend unit tests
make test

# Backend + frontend production build
make test-all

# Dashboard smoke (requires running app on :5173)
make test-smoke
# veya: cd frontend && npm run test:smoke
```

Smoke test env vars:

```bash
export SMOKE_URL=http://127.0.0.1:5173/login
export SMOKE_USER=admin
export SMOKE_PASS=your-password   # zorunlu
make test-smoke
```

CI: GitHub Actions `.github/workflows/ci.yml` — push/PR'da pytest + frontend build.

## Manual QA Checklist

### Auth & Setup

- [ ] Register / login / logout
- [ ] Setup wizard completes; `.env` written
- [ ] Settings → integrations show correct flags

### Dashboard

- [ ] Summary bar shows real totals
- [ ] Position cards: price, signal badge, RSI, mini chart
- [ ] Add position modal; delete position
- [ ] Load error shows retry button if API down

### Real-time sync

- [ ] Sidebar WS dot green when connected
- [ ] Price/signal updates within ~60s (market hours)
- [ ] Signal change flashes on card badge

### Stock detail

- [ ] Portfolio symbol: position panel editable
- [ ] Discovery symbol (not in portfolio): watch mode, no position panel
- [ ] Chart loads; trade signal + analyst target panels

### Discovery

- [ ] Latest report loads; scan runs
- [ ] Click opportunity → correct symbol in detail

### AI & Alarms

- [ ] Chat responds (LLM configured)
- [ ] Portfolio analyze button
- [ ] Trade scores panel from store
- [ ] Alarm CRUD; empty history message (no fake rows)

### Telegram (optional)

- [ ] `/durum`, `/trade`, `/fiyat` commands

## Backend test modules

| File | Focus |
|------|-------|
| `test_api.py` | health, setup status, portfolio GET |
| `test_auth.py` | JWT login/register |
| `test_trade_signal_service.py` | AL/SAT/İZLE scoring |
| `test_discovery_service.py` | weights, sentiment |
| `test_analyst_target_service.py` | target parsing |
| `test_symbol_search.py` | Nasdaq search |
| `test_llm_service.py` | provider env |
| `test_docs_api.py` | docs routes |
| `test_telegram_service.py` | message formatting |

## Known gaps

- No automated WebSocket tests
- No market bundle integration tests
- No frontend component tests

See `docs/STABILIZATION-AUDIT.md` for prioritized improvements.
