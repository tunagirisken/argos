# ARGOS · Cursor Implementation Prompt (Landing + Trade Engine + Docs + Settings)

> Bu doküman, ARGOS tasarım prototipine (`argos/ARGOS.html` ve modülleri) eklenen
> **son geliştirmeleri** production React + TypeScript koduna çevirmek için yazıldı.
> Tasarım tokenları ve önceki ekranlar için: `ARGOS-tasarim-sistemi.md`.
> Kurulum sihirbazı için: `ARGOS-setup-wizard.md`.
>
> **Kural:** "portföy botu" ifadesi her yerde **"dijital yatırım asistanı"** olarak geçer.
> Em dash (—) karakteri kullanılmaz; yerine nokta, virgül veya orta nokta (·) kullanılır.

---

## 0. UYGULAMA AKIŞI (App.tsx)

Uygulama üç kapıdan geçer, sırayla:

```
1. loggedIn === false           → <Landing /> (giriş + tanıtım, tam ekran)
2. setupComplete === false       → <SetupWizard /> (3 adımlı onboarding)
3. aksi                          → <AppShell />  (sidebar + header + sayfalar)
```

- `loggedIn`: JWT token (sessionStorage/localStorage). Login formu submit → `POST /api/auth/login` → token sakla → `loggedIn=true`.
- `setupComplete`: `GET /api/setup/status`.
- Tema (`data-theme="light|dark"`) ve tweaks tüm kapılarda korunur (localStorage).

Sidebar navigasyonu (sıra önemli):
`Dashboard · Hisseler · AI Analiz · İşlem Motoru · Alarmlar · Dokümantasyon · Ayarlar`

---

## 1. LANDING / GİRİŞ EKRANI  (`features/landing/`)

Tam ekran, yukarıdan aşağı kayan tanıtım + giriş sayfası. Prototip: `landing.jsx`.

### Bölümler (sırayla)
1. **Sticky Navbar** — ARGOS logosu (göz ikonu, accent halo), orta linkler (Özellikler, Nasıl Çalışır, Dokümantasyon → smooth scroll), sağda tema toggle + "Giriş Yap" butonu. `backdrop-filter: blur` + yarı saydam zemin.
2. **Hero** — sol: badge ("Canlı Portföy Takibi", pulse dot), dev `ARGOS` başlığı (mono), slogan **"Uyumayan Yatırım Asistanınız"**, açıklama (dijital yatırım asistanı), iki CTA ("Hemen Başla" → login'e scroll, "Demo İzle"), güven rozetleri. Sağ: **canlı dashboard önizleme kartı** (saniyede güncellenen sahte fiyatlar + flash, RSI gauge, sinyal rozetleri, hafif döndürülmüş, hover'da düzelir). Arka planda grid pattern + radyal glow.
3. **Özellikler** — 6 kart (7/24 İzleme, Akıllı Sinyaller, Telegram Bildirimleri, Teknik Analiz, AI Destekli Rapor, Fırsat Keşfi). Scroll-reveal (IntersectionObserver, staggered delay).
4. **Nasıl Çalışır** — 3 adım (Kurulum, İzle, Kazan), aralarında ok. Alternatif arka plan (`bg-surface`).
5. **Login** — e-posta + şifre (göster/gizle), "Beni hatırla", hata durumu, "Giriş Yap". Alt linkler (şifremi unuttum, hesap oluştur).
6. **Footer** — logo + tanıtım, link kolonları, alt çizgi: "© 2026 ARGOS · Tüm hakları saklıdır · Tuna Girişken" ve "Bu uygulama yatırım tavsiyesi vermez."

### Kritik animasyon kuralı
Hero ve scroll-reveal animasyonları **transform-only** olmalı (resting state `opacity:1`). `from { opacity:0 }` + `both` fill-mode KULLANMA — sekme/iframe duraklatıldığında içerik görünmez kalır. Tümü `@media (prefers-reduced-motion: no-preference)` ile sarılır.

### Gap fix
- **Landing canlı önizleme:** JWT öncesi `getMarketBundle` 401 verir. Çözüm: ya **public read-only** `GET /api/public/preview` ucu, ya da landing'de **statik/cached demo veri** (prototipteki gibi client-side simülasyon önerilir; gerçek veri sızdırma riski yok).

---

## 2. İŞLEM MOTORU  (`features/trade/`)  ← YENİ

Otomatik işlem motorunun kontrol ve izleme paneli. Prototip: `trade.jsx`.

### Üst durum şeridi
- Sol: pulse (yeşil=çalışıyor), "İşlem Motoru Çalışıyor/Duraklatıldı", aktif strateji sayısı + mod.
- Sağ: **Kağıt / Canlı** segmented toggle, **Başlat/Duraklat** butonu.
- Canlı modda uyarı banner'ı ("Motor gerçek emirler iletecek").

### Metrik şeridi (5)
Toplam Getiri · Kazanma Oranı · Açık Pozisyon (x/max) · İşlem Başına Risk (%) · Sharpe.

### Sol kolon
- **Sermaye Eğrisi** — equity curve. *Prototipte SVG area chart kullanıldı (bağımlılıksız, her ortamda render).* Production'da `lightweight-charts` AreaSeries veya recharts kullanılabilir; veri `GET /api/engine/equity`.
- **Motor İşlemleri tablosu** — Hisse, Yön (AL/SAT badge), Strateji, Giriş, Güncel, P&L, Durum (açık/kapalı). Veri: `GET /api/engine/trades`.

### Sağ kolon
- **Stratejiler** — her biri: aç/kapa switch, ad, açıklama, kazanma oranı %, işlem sayısı. Toggle → `PUT /api/engine/strategy/{id}` `{ active }`.
- **Risk Kontrolleri** — işlem başına risk slider (%0.5–5), maksimum açık pozisyon slider (1–12), "Telegram'a otomatik bildir" switch. → `PUT /api/engine/config`.
- **Karar Akışı** — canlı log (zaman, sembol, mesaj, tone noktası). WebSocket `/ws/engine` veya `GET /api/engine/feed` polling.

### Backend uçları (eklenecek)
```
GET  /api/engine/status     → { running, mode, active_strategies, metrics }
POST /api/engine/toggle     → { running }
PUT  /api/engine/config     → { mode, risk_per_trade, max_positions, auto_telegram }
GET  /api/engine/strategies → [{ id, name, desc, active, win_rate, trades }]
PUT  /api/engine/strategy/{id} → { active }
GET  /api/engine/trades     → [{ symbol, side, qty, entry, current, pnl_pct, status, strategy }]
GET  /api/engine/equity     → [{ time, value }]
WS   /ws/engine             → karar akışı olayları
```

---

## 3. DOKÜMANTASYON  (`features/docs/`)

In-app dokümantasyon. Prototip: `docs.jsx`. 3 kolon: kategori sidebar (arama) · içerik · "Bu Sayfada" (scroll-spy TOC).

### Yapı
- **Sol sidebar:** arama kutusu + katlanabilir kategoriler (Başlangıç, Özellikler, API Referansı, Telegram Botu, Yapılandırma, Geliştirici). Aktif sayfa accent vurgu.
- **İçerik:** breadcrumb + başlık + açıklama + render edilen section'lar.
- **Sağ TOC:** sayfadaki H3 başlıkları, scroll-spy ile aktif olan vurgulanır, tıklayınca smooth scroll.
- **Pager:** önceki/sonraki sayfa. **Footer:** copyright.

### Section render tipleri
`text` · `heading` (H3, TOC'a girer) · `code` (kopyala butonlu) · `callout` (info/warning/tip/danger) · `endpoint` (HTTP method badge + path + açıklama) · `table` (zebra).

### İçerik kaynağı (gap fix)
Prototipte ~15 sayfa `placeholder()`. Production'da iki seçenek:
1. **Statik** `docContent.ts` (markdown veya structured) — basit, hızlı.
2. **API'den** `GET /api/docs/{slug}` markdown → render (backend markdown'ları hazırsa tercih edilir).
Tüm placeholder sayfalar gerçek içerikle doldurulmalı (kurulum, env, alarm tipleri, scheduler, deployment vb.).

### Store gereksinimi
Dokümantasyonu uygulama içinde sakla: seçili sayfa `localStorage`'da tutulur (prototipte `argos.doc`), böylece kullanıcı kaldığı yerden devam eder.

---

## 4. AYARLAR  (`features/settings/`)

İşlevsel ayarlar sayfası. Prototip: `settings.jsx`. Bölümler (kartlar):

1. **Hesap & Tercihler** — para birimi, saat dilimi (select), veri kaynağı durumu (WebSocket bağlı pill).
2. **Entegrasyonlar** — her API anahtarı: **maskeli önizleme** (`sk-ant-••••••••x9`), durum rozeti (Bağlı/Hata/Test edilmedi), **Test** butonu. Zorunlu/opsiyonel etiketi. → `POST /api/setup/env` (yeniden yaz), test için `POST /api/integrations/test/{service}`.
3. **LLM Sağlayıcı** — Claude / Gemini segmented toggle. → `PUT /api/config/llm`.
4. **Bildirimler** — switch'ler: fiyat alarmları, stop-loss, RSI eşik, günlük raporlar, haber. → `PUT /api/config/notifications`.
5. **Zamanlayıcı (Scheduler)** — sabah brifingi + kapanış raporu için **saat input + aç/kapa switch**. Statik metin DEĞİL; gerçek değerler `GET/PUT /api/config/scheduler`.
6. **Görünüm** — tema ve tweaks paneli yönlendirmesi.
7. **Yönetici (Admin)** — "Sembol Listesini Yenile" → `POST /api/symbols/refresh` (loading spinner + sonuç toast). Admin-only.
8. **Kurulum** — sihirbazı yeniden çalıştır (setup flag temizle).

Her işlem sonrası **toast** ile geri bildirim. Switch/slider state'leri optimistic; başarısızlıkta geri al + hata toast.

---

## 5. GAP ANALİZİ — ÖNCELİKLİ DÜZELTMELER

Aşağıdaki maddeler frontend↔backend entegrasyon boşluklarıdır. Önceliğe göre:

### Kritik
- **Landing preview 401:** public/demo veri (bkz. §1).
- **Alarm tipi sahteleme:** UI'da RSI/Hacim alarmı seçilince backend'e `price_above` gidiyor. Çözüm: ya backend'e `rsi_above` / `volume_spike` condition ekle, ya da desteklenmeyen tipleri UI'da **disable + tooltip** ("yakında").
- **pendingOrders her zaman 0:** `getPortfolio()` → `pending_orders` oku; dashboard summary "Bekleyen" hücresinde göster. Kurulumda kaydedilen `portfolio.json` → store.
- **Watch mode'da trade signal yok:** `getTradeSignal(symbol)` ile sembol bazlı fetch; StockDetail "Yenile" bu ucu çağırsın (portföy market refresh değil).

### Orta
- **Kullanılmayan API metodları** (`getPrices`, `getChartSeries`, `getSignal`, `getTechnical`) — tek market client'a indir veya kaldır, dokümante et.
- **"Bu hisseyi analiz et"** butonu (StockDetail) → `GET /api/analysis/{symbol}` → sonuç paneli.
- **Haber sentiment/kaynak:** backend yalnız `{title, url, published_at}` dönüyor; URL'den domain parse (kaynak), opsiyonel LLM sentiment. `<a href={url}>` ile tıklanabilir.
- **Rapor arşivi ≠ sabah brifingi:** ayrı reports koleksiyonu veya log type filtresi; LLM çıktılarını logla.
- **Alarm aktif/pasif toggle:** `PUT /api/alerts/{id}` `{ enabled }`.
- **Alarm "Mevcut" kolonu bayat:** liste yüklenirken portfolioStore canlı fiyatını merge et.
- **Docs placeholder'ları doldur.**

### Düşük
- **Mobil (<760px):** mini chart gizleniyor → sparkline veya fiyat-only satır. Sidebar <480px yatay scroll → bottom nav / hamburger.
- **Alarm geçmişi zaman formatı:** ham ISO yerine `formatDistanceToNow`.
- **AI çıktısı `dangerouslySetInnerHTML`:** DOMPurify ile sanitize et.
- **`analyzeSymbol`, `symbols/refresh`** için UI (Settings admin'de refresh eklendi).

### Veri sözleşmesi notları (mock ↔ backend)
- `STOCKS[].t` ↔ `position.symbol`; `cost/qty` ↔ `avg_cost/shares` (uyumlu).
- `confidence`: mock 52–85 sayı; backend `0–1` → %'ye çevir.
- `signals[]` ↔ backend `signal_components` (MACD eşikleri farklı olabilir, hizala).
- `GÜÇLÜ AL/SAT`: tek kaynak kullan (ya `bundle.signal` ya `signalSum`), çift kaynak olmasın.
- Canlı sözleşme için `frontend/src/types.ts` + `ai/context/api-endpoints.md` esas; `design/data.jsx` yalnız görsel referans.

---

## 6. STACK & KALİTE
- React 18 + TypeScript + Vite · react-router-dom · Zustand · CSS Modules + global `tokens.css`.
- Grafikler: `lightweight-charts` (candlestick/line); equity gibi basit alanlar için SVG de kabul.
- Tema: `data-theme` attr + CSS değişkenleri. Tüm sayısal değerler JetBrains Mono + `tabular-nums`.
- Erişilebilirlik: klavye nav, aria-label, kontrast. Mobil responsive.
- Güvenlik: API anahtarları asla loglanmaz; WS prod'da token/origin korumalı; LLM çıktısı sanitize.

---

*Prototip referansları: `argos/landing.jsx`, `argos/trade.jsx`, `argos/docs.jsx`, `argos/settings.jsx`. Token + önceki ekranlar: `ARGOS-tasarim-sistemi.md`. Onboarding: `ARGOS-setup-wizard.md`.*
