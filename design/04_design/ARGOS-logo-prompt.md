# ARGOS · Cursor Prompt — Logo, Ana Sayfa ve Marka Dili Güncellemesi

> Bu prompt, ARGOS prototipindeki **marka/landing yenilemesini** production React + TypeScript
> koduna taşır. Tasarım tokenları: `ARGOS-tasarim-sistemi.md`. Sayfa yapısı: `ARGOS-frontend-prompt.md`.
>
> **Kurallar:** Em dash (—) kullanma; nokta, virgül veya orta nokta (·). "bekçi" kelimesi kullanma.
> Tüm metin akıcı, doğal Türkçe pazarlama dilinde olmalı.

---

## 1. YENİ LOGO — Dönen 3D Küp

Eski "göz" ikonu marka markı olmaktan çıkar. Yeni marka markı **CSS 3B dönen küp**tür
(Cursor'ın logosundaki dönüş hissi). Argos'un "100 göz" temasına gönderme olarak küpün
her yüzünde ince bir **halka (göz/diyafram)** bulunur.

### Bileşen — `ArgosCube.tsx`
```tsx
export function ArgosCube({ size = 32, spin = true, className = "" }: {
  size?: number; spin?: boolean; className?: string;
}) {
  const s = `${size}px`;
  return (
    <span className={`argos-cube-wrap ${className}`} style={{ width: s, height: s }}>
      <span className={`argos-cube${spin ? " spin" : ""}`} style={{ width: s, height: s, ["--cs" as any]: s }}>
        {["f-front","f-back","f-right","f-left","f-top","f-bottom"].map(f =>
          <span key={f} className={`argos-cube__face ${f}`} />)}
      </span>
    </span>
  );
}
```

### CSS (global, tema değişkenleriyle)
```css
.argos-cube-wrap { display: inline-grid; place-items: center; perspective: 340px; flex-shrink: 0; }
.argos-cube { position: relative; transform-style: preserve-3d; transform: rotateX(-20deg) rotateY(28deg); will-change: transform; }
@media (prefers-reduced-motion: no-preference) { .argos-cube.spin { animation: argos-cube-spin 7s linear infinite; } }
.argos-cube-wrap:hover .argos-cube.spin { animation-duration: 2.4s; }           /* hover'da hızlan */
@keyframes argos-cube-spin { from { transform: rotateX(-20deg) rotateY(0); } to { transform: rotateX(-20deg) rotateY(360deg); } }
.argos-cube__face {
  position: absolute; top: 0; left: 0; width: var(--cs); height: var(--cs);
  border: 1.5px solid var(--accent); border-radius: 3px;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  box-shadow: inset 0 0 14px color-mix(in srgb, var(--accent) 28%, transparent);
}
.argos-cube__face::after {                                                       /* göz halkası */
  content: ""; position: absolute; inset: 0; margin: auto; width: 34%; height: 34%;
  border-radius: 50%; border: 2px solid var(--accent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 50%, transparent);
}
.f-front  { transform: translateZ(calc(var(--cs)/2)); }
.f-back   { transform: rotateY(180deg) translateZ(calc(var(--cs)/2)); }
.f-right  { transform: rotateY(90deg)  translateZ(calc(var(--cs)/2)); }
.f-left   { transform: rotateY(-90deg) translateZ(calc(var(--cs)/2)); }
.f-top    { transform: rotateX(90deg)  translateZ(calc(var(--cs)/2)); }
.f-bottom { transform: rotateX(-90deg) translateZ(calc(var(--cs)/2)); }
```

### Kullanım yerleri
- **Landing navbar** (`size={30}`, spin) + ARGOS kelime markı.
- **Landing footer** (`size={26}`).
- **App sidebar** üst logo (`size={26}`, spin). Eski `<Icon name="eye">` markını kaldır.
- "eye" ikonu yalnızca AI avatarı gibi tematik yerlerde kalabilir; **marka markı her yerde küp**.

> Reduced-motion'da küp döner durur (statik açıda kalır), erişilebilirlik korunur.

---

## 2. ANA SAYFA (Landing) — Sıralama ve Tema

Bölüm sırası: **Navbar → Hero → Özellikler → Nasıl Çalışır → Giriş → Footer.**

- **Navbar linkleri** yalnızca gerçek bölümlere gitsin: `Özellikler`, `Nasıl Çalışır`.
  (Eski "Dokümantasyon → #login" hatalı bağlantısını kaldır.) Sağda tema toggle + "Giriş Yap"
  butonu; buton tek satır (`white-space: nowrap`).
- **Hero:** sol kolonda rozet + dev `ARGOS` başlığı + slogan + açıklama + CTA + güven satırı;
  sağ kolonda canlı dashboard önizleme kartı (saniyede güncellenen demo fiyatlar). Arka planda
  ince grid + radyal accent glow.
- **Tema:** accent `#2962ff` (TradingView mavisi). Dark varsayılan, light tema `data-theme="light"`.
  Hero görselleri ve glow accent değişkeninden beslenir.

### CTA butonları (eski hâli amatördü)
Inline `→` ve inline play ikonu KULLANMA. Yerine:
```tsx
<div className="lp-cta">
  <button className="btn btn--accent lp-cta__main" onClick={goLogin}>Ücretsiz Başla</button>
  <button className="lp-cta__demo" onClick={goHow}>
    <span className="lp-cta__play"><PlayIcon size={12} /></span>
    Nasıl çalışır?
  </button>
</div>
```
```css
.lp-cta__main { padding: 13px 28px; font-weight: 600; border-radius: var(--radius-md);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 32%, transparent); transition: transform .15s, box-shadow .2s, filter .15s; }
.lp-cta__main:hover { transform: translateY(-2px); box-shadow: 0 14px 32px color-mix(in srgb, var(--accent) 45%, transparent); filter: brightness(1.05); }
.lp-cta__demo { display: inline-flex; align-items: center; gap: 11px; background: none; border: none; cursor: pointer; font-size: 15px; font-weight: 500; color: var(--text-primary); }
.lp-cta__play { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; border: 1px solid var(--border-default); color: var(--accent); transition: .15s; }
.lp-cta__demo:hover .lp-cta__play { background: color-mix(in srgb, var(--accent) 14%, transparent); border-color: var(--accent); transform: scale(1.08); }
```
Güven satırı: tikler yerine küçük yeşil noktalar (`::before` 5px nokta).

### Animasyon kuralı (kritik)
Hero ve scroll-reveal animasyonları **transform-only** olmalı; resting state `opacity:1`.
`from { opacity:0 } ... both` KULLANMA (sekme/iframe duraklayınca içerik kaybolur). Hepsi
`@media (prefers-reduced-motion: no-preference)` içinde.

---

## 3. MARKA DİLİ — Doğal Türkçe Metinler

"bekçi" ve zorlama ifadeler kalkar. Yeni metinler:

| Yer | Metin |
|---|---|
| Hero rozet | "Yapay Zekâ Destekli Analiz" |
| Hero slogan | "Piyasayı sizin için izler" |
| Hero açıklama | "ARGOS, portföyünüzü **gerçek zamanlı** izler; RSI, MACD ve Bollinger gibi teknik sinyalleri tek ekranda toplar. Önemli bir fırsat ya da risk belirdiğinde anında haber verir." |
| Güven satırı | "Ücretsiz" · "5 dakikada kurulum" · "Telegram bildirimleri" |
| Özellikler başlık | "Neden ARGOS?" / "Profesyonel analiz araçları, sade bir arayüzde." |
| 7/24 İzleme | "Piyasa açıkken de kapalıyken de portföyünüz sürekli takip edilir; önemli her hareket anında yakalanır." |
| Akıllı Sinyaller | "RSI, MACD, Bollinger ve EMA tek bir skorda birleşir; AL, SAT ya da BEKLE kararı bir bakışta netleşir." |
| Telegram Bildirimleri | "Stop-loss, hedef ya da RSI eşiği tetiklendiğinde Telegram'a anında mesaj gelir." |
| Teknik Analiz | "Profesyonel mum grafikleri, indikatör katmanları ve hacim. Terminal kalitesinde analiz." |
| Yapay Zekâ Raporları | "Sabah brifingi ve kapanış raporları yapay zekâ ile özetlenir, riskler önceden işaretlenir." |
| Fırsat Keşfi | "Aşırı satım, kırılım ve momentum sinyalleriyle yeni fırsatlar gözden kaçmaz." |
| Nasıl Çalışır başlık | "3 Adımda Başlayın" / "Kurulumdan ilk bildirime, sadece dakikalar." |
| Adımlar | 1) Kurun · 2) İzleyin · 3) Kazanın |
| Giriş başlık | "ARGOS'a Giriş Yapın" / "Demo için herhangi bir e-posta ve şifre yeterli." |
| Footer açıklama | "Yapay zekâ destekli yatırım asistanı. Portföyünüzü gerçek zamanlı izler, teknik analizle yorumlar ve önemli gelişmeleri anında bildirir." |
| Footer alt | "© 2026 ARGOS · Tüm hakları saklıdır · Tuna Girişken" · "Bu uygulama yatırım tavsiyesi vermez." |

> "AI" yerine "Yapay Zekâ" tercih edilir. "portföy botu" → "dijital yatırım asistanı".

---

*Prototip referansı: `argos/landing.jsx`, `argos/icons.jsx` (ArgosCube), `argos/styles.css` (.argos-cube*), `argos/shell.jsx` (sidebar logosu).*
