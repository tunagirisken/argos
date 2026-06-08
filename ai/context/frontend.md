# Frontend (Vite + React 18 + TS)

**Uygulama:** `frontend/src/` — Vite, React 18, TypeScript strict, zustand.
**Stil:** `tokens.css` + `global.css` + `design-tv.css` + Tailwind köprüsü. `ThemeProvider` + `ThemeToggle` (localStorage `argos.theme`).

## Mimari

- **State:** zustand. `authStore` (JWT oturum), `portfolioStore` (stocks, summary, tradeSignals, WS güncellemeleri).
- **Canlı veri tek yol:** `portfolioStore.applyMarketUpdate` — fiyat, sinyal, RSI, trade skorunu uygulama geneline yayar.
- **API:** Vite proxy `/api` → `:8000`. Tüm `/api/*` JWT Bearer gerektirir (`authStore` → `services/api.ts`). WS: `services/ws.ts` → `/ws/prices` (60s payload) + REST fallback (`POST /api/market/snapshot` + 60s poll).

## Ekranlar (JWT korumalı)

`/dashboard` · `/stock/:symbol` · `/discovery` · `/trade` · `/ai` · `/alarms` · `/docs` · `/settings`
Setup gate: giriş sonrası `GET /api/setup/status`.

- **Dashboard:** özet bar (gerçek toplamlar), pozisyon kartları (fiyat, sinyal badge, RSI, mini grafik), pozisyon ekle/sil, API hatasında retry banner.
- **Stock detail:** portföy sembolü → pozisyon paneli düzenlenebilir; portföy dışı sembol (Discovery'den) → **watch mode**, pozisyon paneli yok (`buildWatchStockFromMarket`).
- **Trade (Otomatik Motor):** portföy tavsiye merkezi + işlem motoru (`/api/engine/*`).
- **Discovery:** `GET /api/discovery/latest`, `POST /api/discovery/scan`.
- **Alarms:** CRUD; geçmiş boşsa mesaj (sahte satır yok).

## Grafik / responsive

- lightweight-charts + `ResizeObserver` (`chart-wrap`) — sabit genişlik verme.
- `styles/responsive.css` merkezi; `stock-detail-layout` 1280→1024 tek kolon; mobilde sidebar üst şerit.

## Kurallar

- Hardcoded renk/spacing yok → token kullan.
- Mock/synthetic veri yok (audit'te temizlendi) → gerçek API + empty state.
- Yeni endpoint: `services/api.ts` → `types/` → component sırası.

Detay: `docs/STABILIZATION-AUDIT.md`, `docs/TESTING.md`. Cursor kuralı: `.cursor/rules/frontend-react.mdc`.
