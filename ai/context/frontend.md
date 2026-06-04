# Frontend (Vite + React)

**Kaynak:** `design/02_design/` (prototip referans; bundle'a girmez).

**Uygulama:** `frontend/src/` — `tokens.css` + `global.css` + `design-tv.css`. `ThemeProvider` + `ThemeToggle`.

**API:** Vite proxy `/api` → backend `:8000`. Tüm `/api/*` istekleri JWT Bearer token gerektirir (`authStore`).

**Ekranlar:** dashboard, stock/:symbol, discovery, ai, alarms, docs, settings. Setup gate: `GET /api/setup/status` (giriş sonrası).

**Canlı veri:** `portfolioStore` + WebSocket `/ws/prices` (60s market payload) + REST fallback.

Detay: `docs/STABILIZATION-AUDIT.md`, `docs/TESTING.md`.
