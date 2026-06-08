# ARGOS Stabilization Audit (Final Phase)

**Date:** 2026-06-05  
**Scope:** Repository-wide review — architecture, cleanup, standardization, documentation, tests, security, performance, DX.

---

## Executive Summary

ARGOS is a **FastAPI + React** personal portfolio assistant with yfinance market data, optional Firecrawl/Exa news, LLM analysis (Gemini/Claude), Telegram notifications, discovery engine, and real-time WebSocket market sync. Rapid feature expansion created **documentation drift**, **orphan frontend files**, **UI-only auth**, and **hardcoded MRVL defaults**. This phase consolidates without adding product features.

**Actions taken in this phase:**
- Removed 7 orphan frontend components/pages
- Removed synthetic chart generators (`genCandles`, `buildLwSeries`)
- Fixed stock detail watch mode (Discovery → non-portfolio symbols)
- Removed fake alarm history placeholder
- Added portfolio load error UI
- Synced README and `ai/context/*`
- Added this audit document and `docs/TESTING.md`

---

## 1. Architecture Audit Report

### Current Architecture

```
Browser (React :5173 or SPA :8000)
  ├─ authStore (JWT)
  ├─ portfolioStore (stocks, summary, tradeSignals, WS updates)
  ├─ api.ts → REST /api/*
  └─ ws.ts → WS /ws/prices (market payload: prices + signals + trade scores)

FastAPI (backend/main.py)
  ├─ 12 REST routers under /api
  ├─ WebSocket /ws/prices (60s, US market hours)
  ├─ APScheduler (briefings, alerts, trade checks, technical refresh)
  └─ Telegram bot polling

Persistence: JSON files (portfolio, alerts, users) + backend/.env
External: yfinance, Firecrawl, Exa, Anthropic/Gemini, Telegram
```

### Findings

| Area | Status | Notes |
|------|--------|-------|
| Service layer | Good | Clear `services/*.py` per domain |
| Market data path | Good | `market_data_service` bundles + snapshots |
| Frontend state | Improved | Single `portfolioStore` for live data |
| Auth vs API | **Drift** | JWT gates UI; most REST endpoints are open |
| Design assets | Duplicate | `design/02_design` + `design/bps/01_design` |
| CSS stack | Layered | tokens + global + design-tv + Tailwind bridge — intentional but complex |

### Recommendations

1. **Short-term:** Add optional JWT middleware for `/api/*` (exclude `/auth`, `/health`, `/docs`)
2. **Mid-term:** Extract shared types (OpenAPI → TS client)
3. **Long-term:** Postgres for multi-user; Redis for WS fan-out

---

## 2. Code Quality Report

### Standards Applied

- Real data only in runtime paths (removed mock candle generators)
- Central market sync via `portfolioStore.applyMarketUpdate`
- Watch mode for non-portfolio stock URLs
- Empty states instead of fake UI data (alarms history)

### Refactoring Performed

| Change | Files |
|--------|-------|
| Deleted orphans | `DesignPreview`, `LoginPage`, `PriceChart`, `PortfolioSetup`, `MacdMini`, `RsiGauge`, `Sparkline` |
| Cleaned `lwc.ts` | Removed `buildLwSeries`, `computeSignals`, synthetic helpers |
| Cleaned `indicators.ts` | Removed `genCandles`, `mulberry32` |
| Removed dead `broadcast_loop` | `backend/api/websocket.py` |
| Stock detail watch mode | `StockDetailPage`, `buildWatchStockFromMarket` |
| Load error UI | `portfolioStore`, `DashboardPage` |
| Fake alarm history removed | `AlarmsPage` |
| Sidebar first-stock nav | `Sidebar.tsx` |

### Remaining Concerns

- `Record<string, unknown>` on several API responses
- Settings scheduler rows still static (not from backend)
- `MarketPill` hour check differs from backend `market_hours.py`
- shadcn components partially used; most UI is custom CSS

---

## 3. Technical Debt Report

### Critical

| Item | Impact | Resolution |
|------|--------|------------|
| REST API unauthenticated | Data mutation if exposed beyond localhost | JWT middleware; bind to 127.0.0.1 in dev docs |
| `POST /api/setup/env` writes secrets without auth | `.env` overwrite | Protect setup routes after wizard complete |
| Default JWT secret | Token forgery if unset | Fail startup when `ARGOS_JWT_SECRET` missing in prod |

### High

| Item | Impact | Resolution |
|------|--------|------------|
| Bundle failure drops positions from UI | User sees empty portfolio | Partial render + error banner |
| WS summary rebuild loses backend `day_pl` | Header P/L drift | Merge summary fields on update |
| No CI pipeline | Regressions undetected | GitHub Actions: `make test-all` |

### Medium

| Item | Impact | Resolution |
|------|--------|------------|
| Setup wizard hardcodes Anthropic | Gemini misconfig on first run | Use selected provider from wizard UI |
| Duplicate design folders | Confusion for designers | Mark `bps/01_design` archived |
| Smoke test hardcoded password | Credential leak in repo | Env vars (`SMOKE_USER`, `SMOKE_PASS`) |
| Unused npm deps | Bundle bloat | Remove `lucide-react`, `framer-motion` when convenient |

### Low

| Item | Impact | Resolution |
|------|--------|------------|
| `frontend/dist/` on disk | Stale artifacts | `make clean` before prod |
| Docs placeholders | Onboarding friction | Incremental `docContent.ts` updates |
| Missing `src/hooks` for shadcn | Broken alias | Remove from `components.json` or add hooks |

---

## 4. Documentation Report

### Files Reviewed

- `README.md`, `backend/README.md`, `frontend/README.md`
- `ai/context/*`, `ai/README.md`, `AGENTS.md`, `CLAUDE.md`
- `docs/*`, `design_improvements.md`

### Files Updated (this phase)

- `README.md` — expanded feature list, auth note, testing
- `ai/context/api-endpoints.md` — full route table
- `ai/context/architecture.md` — auth, market sync, frontend routes
- `docs/DISCOVERY-FRONTEND.md` — marked implemented
- `docs/TESTING.md` — **created**
- `docs/STABILIZATION-AUDIT.md` — **this file**

### Still Stale (future work)

- `docs/FRONTEND-IMPLEMENTATION-PLAN.md` — references deleted fixtures
- ~~`ai/context/frontend.md` — DesignPreview step obsolete~~ **Çözüldü** (2026-06): güncel Vite/React mimarisi, mock yok, `.cursor/rules/frontend-react.mdc`
- `docContent.ts` — many placeholder pages
- `design/bps/01_design/` — archive or delete

---

## 5. Test Audit Report

### Current Coverage

| Layer | Tool | Scope |
|-------|------|-------|
| Backend | pytest (~25 tests) | auth, LLM env, discovery weights, trade signal, symbol search, docs GET, health |
| Frontend | `tsc` + vite build | Typecheck + bundle |
| Smoke | Playwright script | Login → dashboard text check |

### Gaps

- No tests for `market_data_service`, WebSocket, portfolio CRUD
- No frontend unit/component tests
- Smoke not in CI; credentials in script
- No integration test for market sync / signal updates

### Updated Scenarios (manual QA)

1. Login → setup wizard → dashboard with real positions
2. WebSocket dot green; price/signal updates within 60s
3. Discovery → click symbol not in portfolio → watch mode detail
4. Add/delete position; summary bar updates
5. Alarms: empty history shows message (not fake rows)
6. AI: portfolio analyze + trade scores from store
7. `make test-all` passes

### Recommendations

1. Add `npm run test:smoke` with env-based credentials
2. GitHub Actions on push: pytest + build
3. Backend integration tests for `/api/market/snapshot`, `/api/portfolio/position`

---

## 6. Security & Reliability Report

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Open REST API | High | JWT dependency on protected routes |
| Public registration | Medium | Admin approval or disable in prod |
| Secrets in `.env` plaintext | Expected locally | Never commit; use secret manager in prod |
| JWT in localStorage | Medium | HttpOnly cookie option for prod |
| XSS via AI `dangerouslySetInnerHTML` | Medium | Sanitize LLM output |
| Telegram chat ID gate | Good | Bot ignores other chats |

### Reliability

- Price service: 3× retry, 60s cache
- WS: reconnect + REST fallback polling
- Scheduler: Istanbul timezone, market-hour gating for some jobs
- JSON store: no transactions — corruption risk on concurrent writes

---

## 7. Performance Report

### Findings

| Area | Observation |
|------|-------------|
| Market bundle fetch | Heavy (full OHLCV); snapshots lighter for WS |
| Trade signals | Fetches news per symbol every 60s — Firecrawl load |
| Frontend bundle | ~500KB JS — acceptable |
| Re-renders | Store updates propagate all subscribers — OK for portfolio size |
| Mini charts | Hidden on mobile `<760px` |

### Opportunities

1. Cache trade signals 60s server-side
2. Lazy-load Docs page content
3. Code-split Discovery/AI routes
4. Reduce duplicate `getMarketBundle` on stock detail mount

---

## 8. Developer Experience Report

### Onboarding

```bash
make install-all && make start
# UI :5173, API :8000
# Setup wizard on first login
```

### Improvements Made

- Clearer README feature list
- `docs/TESTING.md` for QA workflow
- Stabilization audit for context

### Recommendations

1. Add `.env.example` note for required vs optional keys
2. `make test-smoke` target in Makefile
3. Single canonical design folder
4. OpenAPI-generated TS types

---

## 9. Future Roadmap

### Short-term (1–2 sprints) — uygulandı

- [x] JWT protect `/api/*` (exclude auth login/register/logout)
- [x] CI: pytest + frontend build (`.github/workflows/ci.yml`)
- [x] Fix setup wizard LLM provider selection
- [x] Env-based smoke test credentials (`SMOKE_PASS` zorunlu)

### Mid-term — uygulandı

- [x] Partial portfolio render on bundle failure
- [x] MarketPill aligned with backend market hours (`GET /api/market/hours`)
- [x] Remove unused npm dependencies (`lucide-react`, `framer-motion`)
- [x] Archive duplicate design folder (`design/bps/01_design/ARCHIVED.md`)

### Long-term (gelecek)

- Postgres + migrations
- Role-based access
- E2E test suite in CI
- OpenAPI client generation

---

*End of stabilization audit.*
