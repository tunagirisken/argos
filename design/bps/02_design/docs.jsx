// ============================================================
// ARGOS — Dokümantasyon (in-app)
// 3 kolon: kategori sidebar (arama) | içerik | "Bu Sayfada" (scroll-spy)
// styles.css'e dokunulmaz; sayfa-özel stiller alttaki <style>'da.
// ============================================================
const { useState: useDocState, useEffect: useDocEffect, useRef: useDocRef, useMemo: useDocMemo } = React;

// ---- Kategori ağacı ----
const DOC_CATS = [
  { icon: "🚀", title: "Başlangıç", items: [
    ["welcome", "Hoş Geldiniz"], ["installation", "Kurulum"], ["quickstart", "Hızlı Başlangıç"], ["env-config", "Yapılandırma (.env)"],
  ]},
  { icon: "📊", title: "Özellikler", items: [
    ["portfolio", "Portföy Yönetimi"], ["prices", "Canlı Fiyatlar"], ["technical", "Teknik Analiz"],
    ["alarms-feature", "Alarm Motoru"], ["discovery", "Fırsat Keşfi"], ["ai-analysis", "AI Analiz"],
  ]},
  { icon: "🔌", title: "API Referansı", items: [
    ["api-overview", "Genel Bakış"], ["portfolio-endpoints", "Portfolio Endpoints"], ["analysis-endpoints", "Analysis Endpoints"],
    ["alerts-endpoints", "Alerts Endpoints"], ["setup-endpoints", "Setup Endpoints"],
  ]},
  { icon: "📱", title: "Telegram Botu", items: [
    ["telegram", "Bot Kurulumu"], ["notification-types", "Bildirim Tipleri"], ["bot-commands", "Komutlar"],
  ]},
  { icon: "⚙️", title: "Yapılandırma", items: [
    ["llm-provider", "LLM Sağlayıcı"], ["market-hours", "Piyasa Saatleri"], ["token-policy", "Token Politikası"],
  ]},
  { icon: "🛠", title: "Geliştirici", items: [
    ["architecture", "Mimari"], ["contributing", "Katkı Rehberi"], ["deployment", "Deployment"],
  ]},
];
const DOC_ORDER = DOC_CATS.flatMap((c) => c.items.map((i) => i[0]));
const DOC_LABEL = Object.fromEntries(DOC_CATS.flatMap((c) => c.items.map((i) => [i[0], i[1]])));
const DOC_CAT_OF = Object.fromEntries(DOC_CATS.flatMap((c) => c.items.map((i) => [i[0], c.title])));

const P = (title, description, sections) => ({ title, description, sections });
const placeholder = (title, desc, note) => P(title, desc, [
  { type: "callout", variant: "info", title: "Taslak", content: "Bu sayfanın tam içeriği yakında eklenecek. Aşağıda konunun ana hatları yer alıyor." },
  { type: "heading", content: "Genel Bakış" },
  { type: "text", content: note },
]);

const DOC_PAGES = {
  welcome: P("ARGOS'a Hoş Geldiniz", "Kişisel dijital yatırım asistanı ve analiz platformu", [
    { type: "text", content: "ARGOS, NYSE/NASDAQ hisselerinizi gerçek zamanlı takip eden, teknik analiz sinyalleri üreten ve Telegram üzerinden sizi anlık bilgilendiren bir dijital yatırım asistanıdır." },
    { type: "callout", variant: "tip", title: "Hızlı Başlangıç", content: "make install-all && make start komutuyla 2 dakikada kurulum tamamlanır." },
    { type: "heading", content: "Temel Özellikler" },
    { type: "text", content: "Portföy CRUD, canlı fiyatlar (yfinance), RSI/MACD/BB/EMA teknik sinyaller, Firecrawl haber entegrasyonu, alarm motoru (stop-loss, hedef, RSI), zamanlanmış raporlar (sabah brifingi, kapanış), WebSocket canlı fiyat akışı, Google Gemini veya Anthropic Claude AI analiz." },
    { type: "heading", content: "Felsefe" },
    { type: "text", content: "Argos, Yunan mitolojisindeki 100 gözlü, hiç uyumayan devden ilham alır. Amaç: piyasayı sizin yerinize izlemek, yalnızca önemli olduğunda dikkatinizi çekmek." },
    { type: "callout", variant: "warning", title: "Yasal Uyarı", content: "ARGOS yatırım tavsiyesi vermez. Tüm kararlar kullanıcının sorumluluğundadır." },
  ]),
  installation: P("Kurulum", "ARGOS'u yerel ortamınızda 5 dakikada çalıştırın", [
    { type: "heading", content: "Gereksinimler" },
    { type: "text", content: "Python 3.10+, Node.js 18+, Git. Linux/macOS önerilir." },
    { type: "heading", content: "1. Repo'yu klonla" },
    { type: "code", content: "git clone git@github.com:tunagirisken/argos.git\ncd argos" },
    { type: "heading", content: "2. Bağımlılıkları kur" },
    { type: "code", content: "make install-all" },
    { type: "heading", content: "3. Ortam değişkenlerini ayarla" },
    { type: "code", content: "cp backend/.env.example backend/.env\n# .env dosyasını düzenle" },
    { type: "callout", variant: "warning", title: "Güvenlik Uyarısı", content: ".env dosyasını asla git'e commit etme. .gitignore'a eklenmiş durumdadır." },
    { type: "heading", content: "4. Başlat" },
    { type: "code", content: "make start" },
    { type: "text", content: "API: http://localhost:8000 · UI: http://localhost:5173" },
  ]),
  "api-overview": P("API Referansı — Genel Bakış", "Tüm endpoint'ler /api prefix'i ile erişilir", [
    { type: "text", content: "Tüm endpoint'ler /api prefix'i ile erişilir. Etkileşimli Swagger dokümantasyonu: http://localhost:8000/docs" },
    { type: "heading", content: "Portfolio" },
    { type: "endpoint", method: "GET", path: "/api/portfolio", desc: "Tüm portföy pozisyonlarını döndürür" },
    { type: "endpoint", method: "POST", path: "/api/portfolio/position", desc: "Yeni pozisyon ekler" },
    { type: "endpoint", method: "PUT", path: "/api/portfolio/position/{symbol}", desc: "Mevcut pozisyonu günceller" },
    { type: "endpoint", method: "DELETE", path: "/api/portfolio/position/{symbol}", desc: "Pozisyonu siler" },
    { type: "heading", content: "Analysis" },
    { type: "endpoint", method: "POST", path: "/api/analysis/portfolio", desc: "AI ile portföy analizi yapar, Telegram'a gönderir" },
    { type: "endpoint", method: "POST", path: "/api/analysis/chat", desc: "AI chat endpoint'i" },
    { type: "heading", content: "Alerts" },
    { type: "endpoint", method: "GET", path: "/api/alerts", desc: "Aktif alarmları listeler" },
    { type: "endpoint", method: "POST", path: "/api/alerts", desc: "Yeni alarm oluşturur" },
    { type: "endpoint", method: "DELETE", path: "/api/alerts/{id}", desc: "Alarmı siler" },
  ]),
  telegram: P("Telegram Botu Kurulumu", "Anlık bildirimler için Telegram entegrasyonu", [
    { type: "heading", content: "1. Bot Oluştur" },
    { type: "text", content: "Telegram'da @BotFather'a mesaj at, /newbot komutunu çalıştır. İsim ve kullanıcı adı belirle (sonu _bot ile bitmeli). Token'ı kopyala." },
    { type: "heading", content: "2. Chat ID'ni Al" },
    { type: "code", content: "https://api.telegram.org/bot<TOKEN>/getUpdates\n# Bota /start mesajı attıktan sonra aç\n# chat.id değerini kopyala" },
    { type: "heading", content: "3. .env'e Ekle" },
    { type: "code", content: "TELEGRAM_BOT_TOKEN=1234567890:ABC...\nTELEGRAM_CHAT_ID=123456789" },
    { type: "callout", variant: "info", title: "Test", content: "curl -X POST http://localhost:8000/api/analysis/portfolio — Telegram'a mesaj gelmeli." },
  ]),
  technical: P("Teknik Analiz", "RSI, MACD, Bollinger Bands ve EMA sinyalleri", [
    { type: "text", content: "ARGOS her pozisyon için 5 teknik göstergeyi birleştirip tek bir AL/SAT/BEKLE skoru üretir." },
    { type: "heading", content: "Göstergeler" },
    { type: "table", columns: ["Gösterge", "Periyot", "Sinyal"], rows: [
      ["RSI", "14", "<30 aşırı satım · >70 aşırı alım"],
      ["MACD", "12/26/9", "Sinyal çizgisi kesişimi"],
      ["Bollinger", "20 / 2σ", "Bant dışı = aşırı hareket"],
      ["EMA", "20 / 50 / 200", "Trend yönü"],
      ["Hacim", "—", "Onay / sapma"],
    ]},
    { type: "callout", variant: "tip", title: "Bileşik Skor", content: "Her gösterge +1 / 0 / −1 katkı verir. Toplam −5…+5 aralığında GÜÇLÜ SAT'tan GÜÇLÜ AL'a kadar bir rating'e dönüşür." },
  ]),
  "portfolio-endpoints": P("Portfolio Endpoints", "Pozisyon CRUD işlemleri", [
    { type: "endpoint", method: "GET", path: "/api/portfolio", desc: "Tüm pozisyonlar + toplam değer + nakit" },
    { type: "endpoint", method: "POST", path: "/api/portfolio/position", desc: "Gövde: { symbol, shares, avg_cost }" },
    { type: "endpoint", method: "PUT", path: "/api/portfolio/position/{symbol}", desc: "Adet veya maliyet günceller" },
    { type: "endpoint", method: "DELETE", path: "/api/portfolio/position/{symbol}", desc: "Pozisyonu kapatır" },
    { type: "heading", content: "Örnek İstek" },
    { type: "code", content: "curl -X POST http://localhost:8000/api/portfolio/position \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"symbol\":\"MRVL\",\"shares\":120,\"avg_cost\":262.12}'" },
  ]),
  "setup-endpoints": P("Setup Endpoints", "Kurulum sihirbazı backend uçları", [
    { type: "endpoint", method: "GET", path: "/api/setup/status", desc: "{ setup_complete, has_env, has_portfolio }" },
    { type: "endpoint", method: "POST", path: "/api/setup/env", desc: ".env dosyasına anahtarları yazar" },
    { type: "endpoint", method: "POST", path: "/api/setup/portfolio", desc: "portfolio.json oluşturur" },
    { type: "endpoint", method: "POST", path: "/api/setup/complete", desc: "Kurulum tamamlandı bayrağını kaydeder" },
  ]),
  architecture: P("Mimari", "ARGOS sistem bileşenleri", [
    { type: "text", content: "ARGOS iki ana parçadan oluşur: FastAPI backend (veri, analiz, zamanlayıcı, Telegram) ve React frontend (bu arayüz)." },
    { type: "heading", content: "Bileşenler" },
    { type: "table", columns: ["Katman", "Teknoloji", "Sorumluluk"], rows: [
      ["UI", "React + lightweight-charts", "Dashboard, grafik, etkileşim"],
      ["API", "FastAPI", "REST + WebSocket"],
      ["Veri", "yfinance", "Canlı fiyat / OHLCV"],
      ["Analiz", "pandas-ta", "RSI/MACD/BB/EMA"],
      ["AI", "Gemini / Claude", "Rapor + chat"],
      ["Bildirim", "Telegram Bot API", "Anlık mesaj"],
    ]},
  ]),
  // ---- Placeholder sayfalar ----
  quickstart: placeholder("Hızlı Başlangıç", "İlk 5 dakikada ARGOS", "Kurulumdan sonra ilk portföyünü ekle, dashboard'u aç ve ilk sinyalini al."),
  "env-config": placeholder("Yapılandırma (.env)", "Ortam değişkenleri referansı", "ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID zorunlu; FIRECRAWL_API_KEY, EXA_API_KEY, SENTRY_DSN opsiyoneldir."),
  portfolio: placeholder("Portföy Yönetimi", "Pozisyon ekleme, düzenleme, takip", "Her pozisyon için adet, ortalama maliyet ve güncel değer izlenir; stop-loss ve hedef otomatik belirlenir."),
  prices: placeholder("Canlı Fiyatlar", "yfinance + WebSocket akışı", "Fiyatlar gerçek zamanlı güncellenir; değişimde kart üzerinde flash animasyonu tetiklenir."),
  "alarms-feature": placeholder("Alarm Motoru", "Fiyat, stop-loss ve RSI alarmları", "Tetiklenen alarmlar anlık bildirim olarak iletilir ve sabah brifingine eklenir."),
  discovery: placeholder("Fırsat Keşfi", "Aşırı satım ve kırılım taraması", "Momentum ve aşırı satım sinyalleriyle portföy dışı fırsatlar önerilir."),
  "ai-analysis": placeholder("AI Analiz", "Gemini / Claude ile portföy yorumu", "Doğal dil sorularına portföy verisiyle yanıt verir; sabah/kapanış raporları üretir."),
  "analysis-endpoints": placeholder("Analysis Endpoints", "AI analiz uçları", "POST /api/analysis/portfolio ve POST /api/analysis/chat uçları AI çıktısı üretir."),
  "alerts-endpoints": placeholder("Alerts Endpoints", "Alarm CRUD uçları", "GET/POST/DELETE /api/alerts ile alarmlar yönetilir."),
  "notification-types": placeholder("Bildirim Tipleri", "Telegram mesaj şablonları", "Stop-loss, hedef, RSI ve günlük rapor olmak üzere dört bildirim tipi vardır."),
  "bot-commands": placeholder("Komutlar", "Telegram bot komut listesi", "/start, /portfolio, /analiz, /alarmlar komutları desteklenir."),
  "llm-provider": placeholder("LLM Sağlayıcı", "Gemini ve Claude seçimi", "LLM_PROVIDER değişkeni ile gemini veya anthropic sağlayıcısı seçilir."),
  "market-hours": placeholder("Piyasa Saatleri", "NYSE/NASDAQ seans takvimi", "Seans açık/kapalı durumu TR saatiyle hesaplanır; rapor zamanlaması buna göre ayarlanır."),
  "token-policy": placeholder("Token Politikası", "LLM token bütçe yönetimi", "Maliyet kontrolü için istek başına maksimum token sınırı uygulanır."),
  contributing: placeholder("Katkı Rehberi", "Pull request ve kod standardı", "Fork → branch → PR akışı; commit mesajları conventional commits standardına uyar."),
  deployment: placeholder("Deployment", "Üretim ortamı kurulumu", "Docker Compose ile backend + frontend tek komutta ayağa kalkar."),
};

// ============================================================
// Section render'ları
// ============================================================
function DocCode({ content }) {
  const [copied, setCopied] = useDocState(false);
  const copy = () => {
    navigator.clipboard && navigator.clipboard.writeText(content);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="doc-code">
      <button className="doc-code__copy" onClick={copy}>
        <Icon name={copied ? "check" : "copy"} size={13} /> {copied ? "Kopyalandı" : "Kopyala"}
      </button>
      <pre><code>{content}</code></pre>
    </div>
  );
}

function DocCallout({ variant, title, content }) {
  const map = {
    info: { c: "var(--info)", icon: "ai" }, warning: { c: "var(--warning)", icon: "bell" },
    danger: { c: "var(--negative)", icon: "x" }, tip: { c: "var(--positive)", icon: "spark" },
  };
  const m = map[variant] || map.info;
  return (
    <div className="doc-callout" style={{ background: `color-mix(in srgb, ${m.c} 9%, transparent)`, borderColor: m.c }}>
      <span style={{ color: m.c, flexShrink: 0 }}><Icon name={m.icon} size={16} /></span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: m.c, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--text-secondary)" }}>{content}</div>
      </div>
    </div>
  );
}

function DocEndpoint({ method, path, desc }) {
  const colors = { GET: "var(--positive)", POST: "var(--t-accent)", DELETE: "var(--negative)", PUT: "var(--warning)" };
  const c = colors[method] || "var(--text-muted)";
  return (
    <div className="doc-endpoint">
      <span className="doc-method" style={{ color: c, background: `color-mix(in srgb, ${c} 14%, transparent)` }}>{method}</span>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontSize: 14, wordBreak: "break-all" }}>{path}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function DocTable({ columns, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="doc-table">
        <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j} className={j === 0 ? "mono" : ""}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function slugify(s) { return "h-" + s.toLowerCase().replace(/[^a-z0-9çğıöşü ]/gi, "").trim().replace(/\s+/g, "-"); }

function DocSection({ s }) {
  switch (s.type) {
    case "text": return <p className="doc-text">{s.content}</p>;
    case "heading": return <h3 className="doc-h3" id={slugify(s.content)} data-doc-heading={s.content}>{s.content}</h3>;
    case "code": return <DocCode content={s.content} />;
    case "callout": return <DocCallout {...s} />;
    case "endpoint": return <DocEndpoint {...s} />;
    case "table": return <DocTable {...s} />;
    default: return null;
  }
}

// ============================================================
// Ana Docs bileşeni
// ============================================================
function Docs() {
  const [active, setActive] = useDocState(() => localStorage.getItem("argos.doc") || "welcome");
  const [query, setQuery] = useDocState("");
  const [openCats, setOpenCats] = useDocState(() => Object.fromEntries(DOC_CATS.map((c) => [c.title, true])));
  const [activeH, setActiveH] = useDocState(null);
  const contentRef = useDocRef(null);

  useDocEffect(() => { localStorage.setItem("argos.doc", active); if (contentRef.current) contentRef.current.scrollTop = 0; setActiveH(null); }, [active]);

  const page = DOC_PAGES[active] || DOC_PAGES.welcome;
  const headings = page.sections.filter((s) => s.type === "heading").map((s) => s.content);

  // arama filtresi
  const filtered = useDocMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOC_CATS;
    return DOC_CATS.map((c) => ({ ...c, items: c.items.filter(([id, l]) => l.toLowerCase().includes(q) || (DOC_PAGES[id] && DOC_PAGES[id].title.toLowerCase().includes(q))) }))
      .filter((c) => c.items.length);
  }, [query]);

  // scroll-spy
  useDocEffect(() => {
    const root = contentRef.current; if (!root) return;
    const hs = [...root.querySelectorAll("[data-doc-heading]")];
    if (!hs.length) return;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis.length) setActiveH(vis[0].target.getAttribute("data-doc-heading"));
    }, { root, rootMargin: "0px 0px -70% 0px", threshold: 0 });
    hs.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [active]);

  const idx = DOC_ORDER.indexOf(active);
  const prev = idx > 0 ? DOC_ORDER[idx - 1] : null;
  const next = idx < DOC_ORDER.length - 1 ? DOC_ORDER[idx + 1] : null;

  const goHeading = (h) => {
    const el = contentRef.current.querySelector(`[data-doc-heading="${h}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="docs">
      <DocsStyles />

      {/* ---- Sol sidebar ---- */}
      <aside className="docs-side">
        <div className="docs-search">
          <Icon name="search" size={15} />
          <input placeholder="Dokümanlarda ara..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <nav className="docs-nav">
          {filtered.map((cat) => (
            <div key={cat.title} className="docs-cat">
              <button className="docs-cat__head" onClick={() => setOpenCats((o) => ({ ...o, [cat.title]: !o[cat.title] }))}>
                <span>{cat.icon} {cat.title}</span>
                <span className="docs-cat__chev" style={{ transform: openCats[cat.title] || query ? "rotate(0)" : "rotate(-90deg)" }}><Icon name="chevron-down" size={14} /></span>
              </button>
              {(openCats[cat.title] || query) && (
                <div className="docs-cat__items">
                  {cat.items.map(([id, label]) => (
                    <button key={id} className={"docs-item" + (active === id ? " active" : "")} onClick={() => setActive(id)}>{label}</button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!filtered.length && <div style={{ padding: 16, fontSize: 13, color: "var(--text-muted)" }}>Sonuç yok.</div>}
        </nav>
      </aside>

      {/* ---- Orta içerik ---- */}
      <main className="docs-content" ref={contentRef}>
        <div className="docs-inner">
          <div className="docs-breadcrumb">Docs <span>/</span> {DOC_CAT_OF[active]} <span>/</span> {page.title}</div>
          <h1 className="docs-title">{page.title}</h1>
          {page.description && <p className="docs-desc">{page.description}</p>}
          <div className="docs-body">
            {page.sections.map((s, i) => <DocSection key={i} s={s} />)}
          </div>

          <div className="docs-pager">
            {prev ? <button className="btn btn--ghost" onClick={() => setActive(prev)}>← {DOC_LABEL[prev]}</button> : <span />}
            {next ? <button className="btn btn--ghost" onClick={() => setActive(next)}>{DOC_LABEL[next]} →</button> : <span />}
          </div>

          <div className="docs-foot">
            <span>© 2026 ARGOS — Tüm hakları saklıdır. Tuna Girişken</span>
            <span style={{ fontStyle: "italic" }}>Bu uygulama yatırım tavsiyesi vermez.</span>
          </div>
        </div>
      </main>

      {/* ---- Sağ TOC ---- */}
      <aside className="docs-toc">
        {headings.length > 0 && <>
          <div className="docs-toc__h">Bu Sayfada</div>
          {headings.map((h) => (
            <button key={h} className={"docs-toc__item" + (activeH === h ? " active" : "")} onClick={() => goHeading(h)}>{h}</button>
          ))}
        </>}
      </aside>
    </div>
  );
}

Object.assign(window, { Docs });

function DocsStyles() {
  return <style>{`
.docs { display: grid; grid-template-columns: 248px 1fr 200px; height: 100%; overflow: hidden; }
.docs * { box-sizing: border-box; }

/* sol sidebar */
.docs-side { border-right: 1px solid var(--border-subtle); overflow-y: auto; overflow-x: hidden; padding: 16px 12px; background: var(--bg-surface); }
.docs-search { display: flex; align-items: center; gap: 8px; padding: 8px 11px; background: var(--bg-base);
  border: 1px solid var(--border-default); border-radius: var(--radius-md); color: var(--text-muted); margin-bottom: 14px; }
.docs-search input { flex: 1; background: none; border: none; outline: none; color: var(--text-primary); font-family: inherit; font-size: 13px; }
.docs-search input::placeholder { color: var(--text-muted); }
.docs-cat { margin-bottom: 4px; }
.docs-cat__head { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; background: none; border: none;
  color: var(--text-muted); font-family: inherit; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em;
  padding: 8px 8px; cursor: pointer; border-radius: var(--radius-sm); }
.docs-cat__head > span:first-child { display: inline-flex; align-items: center; gap: 7px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.docs-cat__head:hover { color: var(--text-secondary); }
.docs-cat__chev { transition: transform .18s; display: grid; flex-shrink: 0; }
.docs-cat__items { display: flex; flex-direction: column; gap: 1px; margin: 2px 0 6px; }
.docs-item { text-align: left; background: none; border: none; color: var(--text-secondary); font-family: inherit; font-size: 13px;
  padding: 7px 12px; border-radius: var(--radius-sm); cursor: pointer; border-left: 2px solid transparent; transition: background .12s, color .12s; }
.docs-item:hover { background: var(--bg-elevated); color: var(--text-primary); }
.docs-item.active { background: color-mix(in srgb, var(--t-accent) 14%, transparent); color: var(--t-accent); border-left-color: var(--t-accent); font-weight: 500; }

/* orta içerik */
.docs-content { overflow-y: auto; }
.docs-inner { max-width: 760px; margin: 0 auto; padding: 32px 40px 60px; }
.docs-breadcrumb { font-size: 12px; color: var(--text-muted); margin-bottom: 14px; }
.docs-breadcrumb span { margin: 0 6px; opacity: .6; }
.docs-title { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; }
.docs-desc { font-size: 15px; color: var(--text-secondary); margin: 0 0 24px; line-height: 1.6; }
.docs-body > * { margin-bottom: 16px; }
.doc-text { font-size: 14px; line-height: 1.75; color: var(--text-primary); max-width: 720px; margin: 0 0 16px; }
.doc-h3 { font-size: 17px; font-weight: 600; margin: 30px 0 12px; letter-spacing: -0.01em; scroll-margin-top: 20px; }

.doc-code { position: relative; background: var(--bg-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
.doc-code pre { margin: 0; padding: 16px 20px; overflow-x: auto; }
.doc-code code { font-family: var(--font-mono); font-size: 13px; line-height: 1.7; color: var(--text-primary); white-space: pre; }
.doc-code__copy { position: absolute; top: 8px; right: 8px; display: inline-flex; align-items: center; gap: 5px;
  background: var(--bg-elevated); border: 1px solid var(--border-default); color: var(--text-secondary); font-family: inherit;
  font-size: 11px; padding: 5px 9px; border-radius: var(--radius-sm); cursor: pointer; }
.doc-code__copy:hover { color: var(--text-primary); border-color: var(--text-muted); }

.doc-callout { display: flex; gap: 11px; padding: 13px 15px; border-radius: var(--radius-md); border: 1px solid; border-left-width: 3px; }

.doc-endpoint { display: flex; gap: 12px; align-items: center; padding: 12px 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); }
.doc-method { font-family: var(--font-mono); font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 4px; letter-spacing: 0.03em; flex-shrink: 0; min-width: 56px; text-align: center; }

.doc-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.doc-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted);
  padding: 10px 14px; border-bottom: 2px solid var(--border-default); }
.doc-table td { padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); color: var(--text-primary); }
.doc-table tbody tr:nth-child(even) { background: var(--bg-surface); }
.doc-table tbody tr:hover { background: var(--bg-elevated); }

.docs-pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 36px; padding-top: 22px; border-top: 1px solid var(--border-subtle); }
.docs-foot { display: flex; justify-content: space-between; gap: 14px; flex-wrap: wrap; margin-top: 28px; padding-top: 18px;
  border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-muted); }

/* sağ TOC */
.docs-toc { border-left: 1px solid var(--border-subtle); overflow-y: auto; padding: 32px 16px; }
.docs-toc__h { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 12px; }
.docs-toc__item { display: block; width: 100%; text-align: left; background: none; border: none; border-left: 2px solid var(--border-subtle);
  color: var(--text-secondary); font-family: inherit; font-size: 12px; padding: 6px 10px; cursor: pointer; transition: color .12s, border-color .12s; }
.docs-toc__item:hover { color: var(--text-primary); }
.docs-toc__item.active { color: var(--t-accent); border-left-color: var(--t-accent); }

@media (max-width: 1100px) { .docs { grid-template-columns: 220px 1fr; } .docs-toc { display: none; } }
@media (max-width: 760px) { .docs { grid-template-columns: 1fr; } .docs-side { display: none; } .docs-inner { padding: 24px; } }
`}</style>;
}