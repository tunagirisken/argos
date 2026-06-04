# ARGOS — Tasarım ve UX Geliştirme Günlüğü

Bu dosya ürünün tasarım teknik borcu ve UX iyileştirmelerini kayıt altına alır.

---

## Platform Benchmark Özeti (Referans)

| Platform | Güçlü yön | ARGOS’a yansıma |
|----------|-----------|-----------------|
| **TradingView** | Sembol arama (logo, ticker, klavye), grafik container disiplini | `StockSymbolSearch`, `ResizeObserver` grafik |
| **Investing.com** | Yoğun veri + net hiyerarşi, mobil watchlist | Dashboard grid, ellipsis metinler |
| **Yahoo Finance** | Hisse detay iki kolon → tek kolon kırılımı | `stock-detail-layout` breakpoint’leri |
| **Seeking Alpha** | Haber + pozisyon kartları ayrık | Stock detail sidebar stack |
| **Finviz** | Kompakt tablo, monospace ticker | Mevcut mono / badge sistemi |

**Ortak prensipler:** container içinde kalma, 8px spacing grid, accent yalnızca aksiyon/vurgu, koyu tema okunabilirliği, autocomplete’te sanal liste performansı.

---

### 2026-06-03

#### Problem

- Hisse ekleme yalnızca serbest metin sembol alanıydı; Nasdaq evreni ve autocomplete yoktu.
- Ayarlar sayfasında uzun URL’ler ve `code` metinleri taşıyordu; kart hizaları dar ekranda bozuluyordu.
- MRVL hisse detayında grafik sabit 800px genişlikte çizildiği için yarım ekran (Snap) modunda container dışına taşıyordu.
- Responsive breakpoint sistemi merkezi değildi.

#### Çözüm

1. **Hisse autocomplete**
   - Backend: `nasdaqtrader.com` listed.txt → `backend/data/nasdaq_symbols.json` (4266 sembol), `GET /api/symbols/search`
   - Frontend: `StockSymbolSearch` — debounce, klavye ↑↓ Enter, mouse, sanal liste (52px satır, 320px viewport)
   - `StockLogo` — FMP logo + renkli fallback
   - `PortfolioSetup` entegrasyonu

2. **Ayarlar layout**
   - `settings-layout`, `settings-card-row`, `integration-block` — `overflow-wrap`, flex-wrap, eşit kart padding

3. **Responsive sistem** (`frontend/src/styles/responsive.css`)
   - `stock-detail-layout`: 1280 → 1024 tek kolon
   - `chart-wrap` + `PriceChart` `ResizeObserver` ile dinamik genişlik
   - `dashboard-hero`, `dashboard-grid`
   - 768 / 640 / 480 breakpoint’leri; mobilde yatay sidebar

#### Etkilenen Sayfalar

- Portföy kurulumu (`PortfolioSetup`)
- Hisse detay (`StockDetailPage`, `PriceChart`)
- Ayarlar (`SettingsPage`, `IntegrationsSettings`)
- Dashboard (`DashboardPage`)

#### Responsive Test Sonuçları

| Genişlik | Durum |
|----------|--------|
| 1920px+ | Grafik tam genişlik, iki kolon detay |
| 1440px | OK |
| 1280px | Detay grid daraltıldı |
| 1024px | Detay tek kolon, grafik container içinde |
| 768px | Padding azaltıldı, hero wrap |
| 480px | Sidebar üst şerit, kurulum formu tek sütun arama |

*Not: Manuel tarayıcı doğrulaması önerilir (Windows Snap / DevTools).*

#### Gelecek İyileştirmeler

- `SetupWizard` içine aynı `StockSymbolSearch` bileşenini taşımak (deprecated ise kaldırmak)
- NYSE / AMEX sembol evreni genişletmesi
- Logo CDN yedekleri (TradingView tarzı)
- `@tanstack/react-virtual` ile daha agresif sanallaştırma (10k+ sembol senaryosu)
- Ayarlar için shadcn `Tabs` ile bölümleme

---

### Şablon (yeni kayıtlar için)

### [Tarih]

#### Problem

...

#### Çözüm

...

#### Etkilenen Sayfalar

...

#### Responsive Test Sonuçları

...

#### Gelecek İyileştirmeler

...
