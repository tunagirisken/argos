# Frontend (Vite + React)

**Kaynak:** `design/` (prototip, commit edilir, bundle'a girmez).

**Uygulama:** `frontend/src/` — `tokens.css` + `global.css` (design/styles.css birebir). `ThemeProvider` + `ThemeToggle`. Adım 1: `pages/DesignPreview.tsx`.

**API:** `VITE_API_URL=http://localhost:8000` — Vite proxy `/api` → backend.

**Ekranlar:** dashboard, stock/:ticker, ai, alarms, settings. Setup gate: `GET /api/setup/status`.

Detay plan: repo kökünde uygulama onayı bekleniyor; `design/CURSOR-PROMPT.md`.
