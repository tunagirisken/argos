# ARGOS — Cursor ana prompt (kopyala-yapıştır)

## Cursor kurulum

1. Repoyu Cursor'da aç: `git@github.com:tunagirisken/argos.git`
2. `design/` klasörü workspace'te kalsın (referans; build'e dahil değil)
3. Chat'te `@` ile ekle: `ARGOS-tasarim-sistemi.md`, `ARGOS-setup-wizard.md`, `styles.css`, `ARGOS.html`

---

## Ana prompt

Bağlam: `argos/design/` klasöründe bu uygulamanın çalışan HTML+React prototipi ve iki tasarım dokümanı var. Bunları **TEK GERÇEK KAYNAK** olarak kullan:

- `argos/design/ARGOS-tasarim-sistemi.md` → renk/tipografi/spacing token'ları, ekran component listesi, animasyonlar
- `argos/design/ARGOS-setup-wizard.md` → onboarding akışı + FastAPI endpoint'leri
- `argos/design/styles.css` → tüm CSS token'ları ve component stilleri
- `argos/design/ARGOS.html` + `*.jsx` → davranış ve görsel referans (prototip)

**GÖREV:** Bu prototipi production bir React + TypeScript + Vite uygulamasına çevir. Repo: mevcut argos reposu. Backend: FastAPI, `localhost:8000`.

**KURALLAR:**

1. `styles.css` içindeki `:root` token'larını birebir `tokens.css`'e taşı. **ASLA** yeni renk uydurma; her şey token üzerinden.
2. Dark + light tema (`data-theme="light"` override'ları `styles.css`'te var).
3. Tüm fiyat/sayı/anahtar metinleri **JetBrains Mono**.
4. Klasör yapısını `ARGOS-tasarim-sistemi.md` ağacına göre kur (`frontend/src/`).
5. Grafikler: **lightweight-charts** (candlestick + EMA + Bollinger + hacim); prototipteki `charts.jsx` davranışını eşle.
6. Mock veriyi (`data.jsx`) gerçek API'ye bağlanana kadar `fixtures/` olarak kullan.

**ÖNCE PLAN** — onay sonrası kod.

---

## Onay sonrası — adım adım küçük promptlar

| Sıra | Prompt özeti | Karşılaştır |
|------|----------------|-------------|
| 1 | Tasarım sistemi: `tokens.css` + global stiller + ThemeProvider + fontlar | `styles.css` birebir |
| 2 | Shell: Sidebar + Header + MarketPill + react-router | `shell.jsx`, `ARGOS.html` |
| 3 | Backend `/api/setup/*` + Setup Wizard (3 adım, gate) | `setup.jsx`, `ARGOS-setup-wizard.md` |
| 4 | Dashboard: HeroCard + StockCard grid | `dashboard.jsx` |
| 5 | Hisse Detay: PriceChart + sağ panel | `stockdetail.jsx`, `charts.jsx` |
| 6 | AI Analiz | `aianalysis.jsx` |
| 7 | Alarmlar | `alarms.jsx` |
| 8 | API + WebSocket entegrasyonu | `data.jsx` → backend |

Her adımdan sonra: **"Prototiple karşılaştır"** — görsel ve davranış farklarını düzelt.

İpucu: Adım 3'te backend setup endpoint'leri hazır olunca onboarding uçtan uca test edilir.
