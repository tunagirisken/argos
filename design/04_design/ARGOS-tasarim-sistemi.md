# ARGOS — Tasarım Sistemi & Cursor Implementation Prompt

> **ARGOS** · "100 gözlü, hiç uyumayan finansal bekçi"
> Profesyonel portföy yönetim uygulaması · **TradingView seviyesi** terminal estetiği
> Grafikler: **lightweight-charts** (TradingView'in açık-kaynak kütüphanesi).
> Bu doküman, prototipteki tasarım sistemini ve onu React'a çevirmek için Cursor'a verilecek promptu içerir.

---

## 1. TASARIM TOKENLARI

### 1.1 Renkler (TradingView paleti)

```css
:root {
  /* Yüzeyler — TradingView dark */
  --bg-base:      #131722;   /* ana arkaplan */
  --bg-surface:   #1e2130;   /* kart / panel */
  --bg-elevated:  #2a2e39;   /* hover/active */
  --bg-overlay:   #2a2e39;   /* modal, dropdown, tooltip */
  --border-subtle:  #242836; /* ince border + grid çizgileri */
  --border-default: #363a45; /* normal border */

  /* Accent (TradingView mavi) */
  --accent-primary: #2962ff;
  --accent-hover:   #1e53e5;
  --accent-glow:    rgba(41,98,255,0.16);

  /* Durum — TradingView mum renkleri */
  --positive:     #26a69a;   --positive-dim: rgba(38,166,154,0.14);
  --negative:     #ef5350;   --negative-dim: rgba(239,83,80,0.14);
  --warning:      #f59e0b;   --warning-dim:  rgba(245,158,11,0.15);
  --info:         #2962ff;

  /* Metin */
  --text-primary:   #d1d4dc;
  --text-secondary: #868993;
  --text-muted:     #5d606b;
  --text-accent:    #2962ff;
}

/* Light tema — TradingView light */
:root[data-theme="light"] {
  --bg-base: #ffffff; --bg-surface: #ffffff; --bg-elevated: #f0f3fa;
  --border-subtle: #e0e3eb; --border-default: #d1d4dc;
  --positive: #089981; --negative: #f23645;
  --text-primary: #131722; --text-secondary: #5d606b; --text-muted: #9598a1;
}
```

> Radius sıkı tutulur (profesyonel terminal): `--radius-sm 4px / md 6px / lg 8px / xl 12px`.
> Tüm sayısal değerler **JetBrains Mono** + `font-variant-numeric: tabular-nums`.

### 1.2 Tipografi

| Token          | Değer            | Kullanım                |
| -------------- | ---------------- | ----------------------- |
| `--font-hero`    | 48px / 700       | büyük sayılar           |
| `--font-display` | 32px / 700       | sayfa başlıkları        |
| `--font-title`   | 20px / 600       | kart başlıkları         |
| `--font-body`    | 14px / 400       | normal metin            |
| `--font-small`   | 12px / 400       | etiketler               |
| `--font-mono`    | JetBrains Mono   | fiyatlar, kodlar, sayılar |

Sans: **Inter** · Mono: **JetBrains Mono** (Google Fonts).

### 1.3 Spacing & Radius

Base unit: **4px**. Tüm boşluklar 4'ün katı.

| Token         | Değer | Kullanım          |
| ------------- | ----- | ----------------- |
| `--radius-sm` | 6px   | badge, tag        |
| `--radius-md` | 10px  | buton, input      |
| `--radius-lg` | 14px  | kart              |
| `--radius-xl` | 20px  | modal, büyük kart |

### 1.4 Efektler

```css
/* Glow — pozitif kart */  box-shadow: 0 0 20px rgba(0,208,132,0.1);
/* Glow — negatif kart */  box-shadow: 0 0 20px rgba(255,77,106,0.1);
/* Glow — accent */        box-shadow: 0 0 30px rgba(124,108,248,0.2);
/* Glassmorphism */        backdrop-filter: blur(10px); background: rgba(15,15,26,0.8);
```

---

## 2. EKRAN BAZINDA COMPONENT LİSTESİ

### Shell (her ekranda)
- **`<Sidebar>`** — 64px sabit sol bar. Logo (👁 göz ikonu, accent glow) + nav ikonları (Dashboard, Hisseler, AI Analiz, Alarmlar, Ayarlar) + altta canlı WebSocket pulse noktası. Aktif öğede sol kenar accent çizgi + tooltip.
- **`<Header>`** — 64px. Sol: sayfa başlığı · Orta: `<MarketPill>` (NYSE AÇIK/KAPALI + canlı TR saati, glassmorphism) · Sağ: toplam portföy değeri + günlük değişim.

### Ekran 1 — DASHBOARD
- **`<HeroCard>`** ×3 — Toplam Değer (accent glow), Bugünkü P&L (pozitif/negatif glow), Nakit. Büyük mono rakam + alt metin.
- **`<StockCard>`** (3 kolon grid) — logo + ticker + isim + sparkline · fiyat + günlük % · maliyet/getiri satırı · **stop→hedef range bar** (uzaklık %10> yeşil, 5–10 sarı, <5 kırmızı+pulse) · footer: sinyal badge + RSI.

### Ekran 2 — HİSSE DETAY (%65 / %35 split)
- **Sol:** fiyat başlığı (canlı, büyük) · zaman seçici (1G 1H 3A 6A 1Y) · mum/alan toggle · indikatör toggle'ları (EMA20 mor, EMA50 turuncu, EMA200 mavi, Bollinger) · **`<PriceChart>`** (canvas candlestick + EMA çizgileri + Bollinger alanı + hacim barları + hover crosshair + son fiyat etiketi).
- **Sağ:** `<TeknikSinyalKartı>` (büyük AL/SAT/BEKLE badge + güven skoru bar + **`<RsiGauge>`** yarım daire + **`<MacdMini>`**) · `<PozisyonKartı>` (detaylar + stop/hedef düzenle inputları + not alanı + güncelle) · `<HaberlerKartı>` (son 5 haber + kaynak + "X dk önce" + duygu noktası 🟢🔴⚪).

### Ekran 3 — AI ANALİZ (ARGOS BRAIN) (%55 / %45)
- **Sol:** chat. ARGOS avatarı (göz ikonu + mor halo) · mesaj balonları (kullanıcı sağ accent, ARGOS sol koyu) · yazıyor animasyonu (3 nokta) · hızlı butonlar · input + gönder.
- **Sağ:** otomatik raporlar (sabah brifingi, kapanış raporu, risk uyarısı) — renkli durum noktası + tür + tarih + özet.

### Ekran 4 — ALARMLAR (1fr / 320px)
- **`<AlarmTablosu>`** — Hisse | Tür | Seviye | Mevcut | Uzaklık | Durum. Yakın seviye kırmızı, tetiklenen satır pulse.
- **`<AlarmGeçmişiTimeline>`** — ikon + mesaj + zaman.
- **`<YeniAlarmFormu>`** (sticky sağ panel) — hisse dropdown + tip pill seçici + fiyat/RSI input + Ekle butonu (accent).

### Tweaks (prototip)
Aksan rengi, glow yoğunluğu, yoğunluk (compact/regular/comfy), köşe yuvarlaklığı — canlı CSS değişkeni override.

---

## 3. MİKRO ANİMASYONLAR

| Etkileşim          | Davranış                                    |
| ------------------ | ------------------------------------------- |
| Kart hover         | `translateY(-2px)` + gölge artışı           |
| Fiyat değişimi     | 0.3s smooth transition                      |
| Pozitif/negatif flash | yeşil/kırmızı pulse 0.5s                  |
| Alarm tetikleme    | kart/satır border kırmızı pulse             |
| Sayfa geçişi       | fade + slide 0.2s (`prefers-reduced-motion` korumalı) |
| Skeleton loader    | shimmer animasyonu                          |
| WebSocket bağlantı | sağ üst/sidebar yeşil dot pulse             |

---

## 4. CURSOR IMPLEMENTATION PROMPTU

> Aşağıdaki bloğu Cursor'a yapıştır. Prototipteki tasarımı production React + Vite + TypeScript projesine çevirir.

```
ARGOS adında bir portföy yönetim uygulaması inşa et. "100 gözlü, hiç uyumayan
finansal bekçi" konsepti — Bloomberg Terminal + modern fintech hissi. Koyu tema,
mor-mavi accent. Profesyonel ama karmaşık değil; minimal, modern, işlevsel.

STACK
- React 18 + TypeScript + Vite
- Routing: react-router-dom
- Grafikler: **lightweight-charts v4** (TradingView) — candlestick + line + histogram (hacim) + EMA/BB line serileri. Dashboard mini kartlarda da aynı kütüphane (axis'siz, attributionLogo:false).
- State: Zustand (portfolio store)
- Stil: CSS Modules + global tokens (aşağıdaki :root değişkenleri)
- Font: Inter + JetBrains Mono (Google Fonts)
- Canlı veri: WebSocket mock service (saniyede fiyat tick)

TASARIM TOKENLARI
[bu dokümanın 1. bölümündeki :root bloğunu birebir kopyala — renkler, radius,
font tokenları]. Glow ve glassmorphism util sınıfları ekle.

KLASÖR YAPISI
src/
  tokens.css            // :root değişkenleri
  components/
    Sidebar.tsx  Header.tsx  MarketPill.tsx
    Card.tsx  Badge.tsx  RangeBar.tsx  Sparkline.tsx
    charts/ PriceChart.tsx  RsiGauge.tsx  MacdMini.tsx
  features/
    dashboard/ Dashboard.tsx  HeroCard.tsx  StockCard.tsx
    stock/     StockDetail.tsx  SignalCard.tsx  PositionCard.tsx  NewsCard.tsx
    ai/        ArgosBrain.tsx  ChatBubble.tsx  ReportCard.tsx
    alarms/    Alarms.tsx  AlarmTable.tsx  AlarmTimeline.tsx  NewAlarmForm.tsx
  store/ portfolioStore.ts  marketStore.ts
  lib/ indicators.ts (ema, rsi, macd, bollinger)  format.ts (fmtUSD, fmtPct)
  services/ ws.ts (mock WebSocket fiyat akışı)

EKRANLAR
1. DASHBOARD: 64px sidebar + header. Hero olarak 3 metrik kartı (Toplam Değer
   accent-glow, Bugünkü P&L durum-glow, Nakit). Altında 3 kolonlu StockCard grid.
   Her kart: logo+ticker+isim+sparkline, fiyat+günlük%, maliyet/getiri,
   stop→hedef range bar (uzaklık>10% yeşil / 5-10% sarı / <5% kırmızı+pulse),
   sinyal badge (AL/SAT/BEKLE) + RSI. Kart tıklanınca /stock/:ticker.
2. HİSSE DETAY: 65/35 split. Sol: canlı fiyat başlığı + zaman seçici
   (1G/1H/3A/6A/1Y) + mum/alan toggle + indikatör toggle (EMA20/50/200, Bollinger)
   + candlestick grafik (alt hacim bar). Sağ: TeknikSinyal (AL/SAT/BEKLE badge +
   güven bar + RSI gauge + MACD mini), Pozisyon (detay + düzenlenebilir stop/hedef
   + not), Haberler (son 5 + duygu).
3. AI ANALİZ: 55/45. Sol: ARGOS chat (avatar göz+halo, mesaj balonları, yazıyor
   animasyonu, hızlı butonlar, input). Yanıtları önce kural-tabanlı (portföy
   verisinden), sonra gerçek LLM API'sine bağla. Sağ: otomatik raporlar listesi.
4. ALARMLAR: tablo (Hisse|Tür|Seviye|Mevcut|Uzaklık|Durum) + geçmiş timeline +
   sticky yeni alarm formu (dropdown + tip pill + input + ekle).

ANİMASYONLAR
Kart hover translateY(-2px)+gölge, fiyat 0.3s transition, pozitif/negatif flash
pulse 0.5s, alarm tetikleme border pulse, sayfa geçişi fade+slide (reduced-motion
korumalı), skeleton shimmer, WebSocket dot pulse.

VERİ
Başlangıçta gerçekçi mock portföy: MRVL, NVDA, TSLA, AAPL, AMD, PLTR. Her hisse:
fiyat, günlük%, maliyet, adet, stop, hedef, sinyal, rsi, sektör. WebSocket mock'u
saniyede küçük random tick uygulasın; değişimde flash animasyonu tetiklensin.

KALİTE
TypeScript strict. Tüm renk/spacing/radius token üzerinden. Erişilebilir
(klavye nav, aria-label, kontrast). Mobil/responsive ikincil öncelik.
```

---

*Bu doküman ARGOS HTML prototipinin (`argos/ARGOS.html`) birebir tasarım referansıdır.*
