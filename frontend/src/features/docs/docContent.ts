export type DocSectionType =
  | { type: "text"; content: string }
  | { type: "heading"; content: string }
  | { type: "code"; content: string }
  | { type: "callout"; variant: "info" | "warning" | "danger" | "tip"; title: string; content: string }
  | { type: "endpoint"; method: string; path: string; desc: string }
  | { type: "table"; columns: string[]; rows: string[][] };

export interface DocPage {
  title: string;
  description: string;
  sections: DocSectionType[];
}

export const DOC_CATS = [
  {
    icon: "🚀",
    title: "Başlangıç",
    items: [
      ["welcome", "Hoş Geldiniz"],
      ["installation", "Kurulum"],
      ["quickstart", "Hızlı Başlangıç"],
      ["env-config", "Yapılandırma (.env)"],
    ],
  },
  {
    icon: "📊",
    title: "Özellikler",
    items: [
      ["portfolio", "Portföy Yönetimi"],
      ["prices", "Canlı Fiyatlar"],
      ["technical", "Teknik Analiz"],
      ["alarms-feature", "Alarm Motoru"],
      ["discovery", "Fırsat Keşfi"],
      ["ai-analysis", "AI Analiz"],
    ],
  },
  {
    icon: "🔌",
    title: "API Referansı",
    items: [
      ["api-overview", "Genel Bakış"],
      ["portfolio-endpoints", "Portfolio Endpoints"],
      ["analysis-endpoints", "Analysis Endpoints"],
      ["alerts-endpoints", "Alerts Endpoints"],
      ["setup-endpoints", "Setup Endpoints"],
    ],
  },
  {
    icon: "📱",
    title: "Telegram Botu",
    items: [
      ["telegram", "Bot Kurulumu"],
      ["notification-types", "Bildirim Tipleri"],
      ["bot-commands", "Komutlar"],
    ],
  },
  {
    icon: "⚙️",
    title: "Yapılandırma",
    items: [
      ["llm-provider", "LLM Sağlayıcı"],
      ["market-hours", "Piyasa Saatleri"],
      ["token-policy", "Token Politikası"],
    ],
  },
  {
    icon: "🛠",
    title: "Geliştirici",
    items: [
      ["architecture", "Mimari"],
      ["contributing", "Katkı Rehberi"],
      ["deployment", "Deployment"],
    ],
  },
] as const;

export type DocPageId = (typeof DOC_CATS)[number]["items"][number][0];

export const DOC_ORDER = DOC_CATS.flatMap((c) => c.items.map((i) => i[0])) as DocPageId[];
export const DOC_LABEL = Object.fromEntries(
  DOC_CATS.flatMap((c) => c.items.map((i) => [i[0], i[1]]))
) as Record<DocPageId, string>;
export const DOC_CAT_OF = Object.fromEntries(
  DOC_CATS.flatMap((c) => c.items.map((i) => [i[0], c.title]))
) as Record<DocPageId, string>;

const P = (title: string, description: string, sections: DocSectionType[]): DocPage => ({
  title,
  description,
  sections,
});

const placeholder = (title: string, desc: string, note: string): DocPage =>
  P(title, desc, [
    {
      type: "callout",
      variant: "info",
      title: "Taslak",
      content: "Bu sayfanın tam içeriği yakında eklenecek. Aşağıda konunun ana hatları yer alıyor.",
    },
    { type: "heading", content: "Genel Bakış" },
    { type: "text", content: note },
  ]);

export const DOC_PAGES: Record<DocPageId, DocPage> = {
  welcome: P("ARGOS'a Hoş Geldiniz", "Kişisel dijital yatırım asistanı ve analiz platformu", [
    {
      type: "text",
      content:
        "ARGOS, NYSE/NASDAQ hisselerinizi gerçek zamanlı takip eden, teknik analiz sinyalleri üreten ve Telegram üzerinden sizi anlık bilgilendiren bir dijital yatırım asistanıdır.",
    },
    {
      type: "callout",
      variant: "tip",
      title: "Hızlı Başlangıç",
      content: "make install-all && make start komutuyla 2 dakikada kurulum tamamlanır.",
    },
    { type: "heading", content: "Temel Özellikler" },
    {
      type: "text",
      content:
        "Portföy CRUD, canlı fiyatlar (yfinance), RSI/MACD/BB/EMA teknik sinyaller, Firecrawl haber entegrasyonu, alarm motoru (stop-loss, hedef, RSI), zamanlanmış raporlar (sabah brifingi, kapanış), WebSocket canlı fiyat akışı, Google Gemini veya Anthropic Claude AI analiz.",
    },
    { type: "heading", content: "Felsefe" },
    {
      type: "text",
      content:
        "Argos, Yunan mitolojisindeki 100 gözlü, hiç uyumayan devden ilham alır. Amaç: piyasayı sizin yerinize izlemek, yalnızca önemli olduğunda dikkatinizi çekmek.",
    },
    {
      type: "callout",
      variant: "warning",
      title: "Yasal Uyarı",
      content: "ARGOS yatırım tavsiyesi vermez. Tüm kararlar kullanıcının sorumluluğundadır.",
    },
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
    {
      type: "callout",
      variant: "warning",
      title: "Güvenlik Uyarısı",
      content: ".env dosyasını asla git'e commit etme. .gitignore'a eklenmiş durumdadır.",
    },
    { type: "heading", content: "4. Başlat" },
    { type: "code", content: "make start" },
    { type: "text", content: "API: http://localhost:8000 · UI: http://localhost:5173" },
  ]),
  "api-overview": P("API Referansı — Genel Bakış", "Tüm endpoint'ler /api prefix'i ile erişilir", [
    {
      type: "text",
      content:
        "Tüm endpoint'ler /api prefix'i ile erişilir. Etkileşimli Swagger dokümantasyonu: http://localhost:8000/docs",
    },
    { type: "heading", content: "Portfolio" },
    { type: "endpoint", method: "GET", path: "/api/portfolio", desc: "Tüm portföy pozisyonlarını döndürür" },
    { type: "endpoint", method: "POST", path: "/api/portfolio/position", desc: "Yeni pozisyon ekler" },
    {
      type: "endpoint",
      method: "PUT",
      path: "/api/portfolio/position/{symbol}",
      desc: "Mevcut pozisyonu günceller",
    },
    { type: "endpoint", method: "DELETE", path: "/api/portfolio/position/{symbol}", desc: "Pozisyonu siler" },
    { type: "heading", content: "Analysis" },
    {
      type: "endpoint",
      method: "POST",
      path: "/api/analysis/portfolio",
      desc: "AI ile portföy analizi yapar, Telegram'a gönderir",
    },
    { type: "endpoint", method: "POST", path: "/api/analysis/chat", desc: "AI chat endpoint'i" },
    { type: "heading", content: "Alerts" },
    { type: "endpoint", method: "GET", path: "/api/alerts", desc: "Aktif alarmları listeler" },
    { type: "endpoint", method: "POST", path: "/api/alerts", desc: "Yeni alarm oluşturur" },
    { type: "endpoint", method: "DELETE", path: "/api/alerts/{id}", desc: "Alarmı siler" },
  ]),
  telegram: P("Telegram Botu Kurulumu", "Anlık bildirimler için Telegram entegrasyonu", [
    { type: "heading", content: "1. Bot Oluştur" },
    {
      type: "text",
      content:
        "Telegram'da @BotFather'a mesaj at, /newbot komutunu çalıştır. İsim ve kullanıcı adı belirle (sonu _bot ile bitmeli). Token'ı kopyala.",
    },
    { type: "heading", content: "2. Chat ID'ni Al" },
    {
      type: "code",
      content:
        "https://api.telegram.org/bot<TOKEN>/getUpdates\n# Bota /start mesajı attıktan sonra aç\n# chat.id değerini kopyala",
    },
    { type: "heading", content: "3. .env'e Ekle" },
    { type: "code", content: "TELEGRAM_BOT_TOKEN=1234567890:ABC...\nTELEGRAM_CHAT_ID=123456789" },
    {
      type: "callout",
      variant: "info",
      title: "Test",
      content: "curl -X POST http://localhost:8000/api/analysis/portfolio — Telegram'a mesaj gelmeli.",
    },
  ]),
  technical: P("Teknik Analiz", "RSI, MACD, Bollinger Bands ve EMA sinyalleri", [
    {
      type: "text",
      content: "ARGOS her pozisyon için 5 teknik göstergeyi birleştirip tek bir AL/SAT/BEKLE skoru üretir.",
    },
    { type: "heading", content: "Göstergeler" },
    {
      type: "table",
      columns: ["Gösterge", "Periyot", "Sinyal"],
      rows: [
        ["RSI", "14", "<30 aşırı satım · >70 aşırı alım"],
        ["MACD", "12/26/9", "Sinyal çizgisi kesişimi"],
        ["Bollinger", "20 / 2σ", "Bant dışı = aşırı hareket"],
        ["EMA", "20 / 50 / 200", "Trend yönü"],
        ["Hacim", "—", "Onay / sapma"],
      ],
    },
    {
      type: "callout",
      variant: "tip",
      title: "Bileşik Skor",
      content:
        "Her gösterge +1 / 0 / −1 katkı verir. Toplam −5…+5 aralığında GÜÇLÜ SAT'tan GÜÇLÜ AL'a kadar bir rating'e dönüşür.",
    },
  ]),
  "portfolio-endpoints": P("Portfolio Endpoints", "Pozisyon CRUD işlemleri", [
    { type: "endpoint", method: "GET", path: "/api/portfolio", desc: "Tüm pozisyonlar + toplam değer + nakit" },
    {
      type: "endpoint",
      method: "POST",
      path: "/api/portfolio/position",
      desc: "Gövde: { symbol, shares, avg_cost }",
    },
    {
      type: "endpoint",
      method: "PUT",
      path: "/api/portfolio/position/{symbol}",
      desc: "Adet veya maliyet günceller",
    },
    { type: "endpoint", method: "DELETE", path: "/api/portfolio/position/{symbol}", desc: "Pozisyonu kapatır" },
    { type: "heading", content: "Örnek İstek" },
    {
      type: "code",
      content:
        'curl -X POST http://localhost:8000/api/portfolio/position \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"symbol":"MRVL","shares":120,"avg_cost":262.12}\'',
    },
  ]),
  "setup-endpoints": P("Setup Endpoints", "Kurulum sihirbazı backend uçları", [
    {
      type: "endpoint",
      method: "GET",
      path: "/api/setup/status",
      desc: "{ setup_complete, has_env, has_portfolio }",
    },
    { type: "endpoint", method: "POST", path: "/api/setup/env", desc: ".env dosyasına anahtarları yazar" },
    { type: "endpoint", method: "POST", path: "/api/setup/portfolio", desc: "portfolio.json oluşturur" },
    { type: "endpoint", method: "POST", path: "/api/setup/complete", desc: "Kurulum tamamlandı bayrağını kaydeder" },
  ]),
  architecture: P("Mimari", "ARGOS sistem bileşenleri", [
    {
      type: "text",
      content:
        "ARGOS iki ana parçadan oluşur: FastAPI backend (veri, analiz, zamanlayıcı, Telegram) ve React frontend (bu arayüz).",
    },
    { type: "heading", content: "Bileşenler" },
    {
      type: "table",
      columns: ["Katman", "Teknoloji", "Sorumluluk"],
      rows: [
        ["UI", "React + lightweight-charts", "Dashboard, grafik, etkileşim"],
        ["API", "FastAPI", "REST + WebSocket"],
        ["Veri", "yfinance", "Canlı fiyat / OHLCV"],
        ["Analiz", "pandas-ta", "RSI/MACD/BB/EMA"],
        ["AI", "Gemini / Claude", "Rapor + chat"],
        ["Bildirim", "Telegram Bot API", "Anlık mesaj"],
      ],
    },
  ]),
  quickstart: placeholder(
    "Hızlı Başlangıç",
    "İlk 5 dakikada ARGOS",
    "Kurulumdan sonra ilk portföyünü ekle, dashboard'u aç ve ilk sinyalini al."
  ),
  "env-config": placeholder(
    "Yapılandırma (.env)",
    "Ortam değişkenleri referansı",
    "ANTHROPIC_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID zorunlu; FIRECRAWL_API_KEY, EXA_API_KEY, SENTRY_DSN opsiyoneldir."
  ),
  portfolio: placeholder(
    "Portföy Yönetimi",
    "Pozisyon ekleme, düzenleme, takip",
    "Her pozisyon için adet, ortalama maliyet ve güncel değer izlenir; stop-loss ve hedef otomatik belirlenir."
  ),
  prices: placeholder(
    "Canlı Fiyatlar",
    "yfinance + WebSocket akışı",
    "Fiyatlar gerçek zamanlı güncellenir; değişimde kart üzerinde flash animasyonu tetiklenir."
  ),
  "alarms-feature": placeholder(
    "Alarm Motoru",
    "Fiyat, stop-loss ve RSI alarmları",
    "Tetiklenen alarmlar anlık bildirim olarak iletilir ve sabah brifingine eklenir."
  ),
  discovery: placeholder(
    "Fırsat Keşfi",
    "Aşırı satım ve kırılım taraması",
    "Momentum ve aşırı satım sinyalleriyle portföy dışı fırsatlar önerilir."
  ),
  "ai-analysis": placeholder(
    "AI Analiz",
    "Gemini / Claude ile portföy yorumu",
    "Doğal dil sorularına portföy verisiyle yanıt verir; sabah/kapanış raporları üretir."
  ),
  "analysis-endpoints": placeholder(
    "Analysis Endpoints",
    "AI analiz uçları",
    "POST /api/analysis/portfolio ve POST /api/analysis/chat uçları AI çıktısı üretir."
  ),
  "alerts-endpoints": placeholder(
    "Alerts Endpoints",
    "Alarm CRUD uçları",
    "GET/POST/DELETE /api/alerts ile alarmlar yönetilir."
  ),
  "notification-types": placeholder(
    "Bildirim Tipleri",
    "Telegram mesaj şablonları",
    "Stop-loss, hedef, RSI ve günlük rapor olmak üzere dört bildirim tipi vardır."
  ),
  "bot-commands": placeholder(
    "Komutlar",
    "Telegram bot komut listesi",
    "/start, /portfolio, /analiz, /alarmlar, /trade komutları desteklenir."
  ),
  "llm-provider": placeholder(
    "LLM Sağlayıcı",
    "Gemini ve Claude seçimi",
    "LLM_PROVIDER değişkeni ile gemini veya anthropic sağlayıcısı seçilir."
  ),
  "market-hours": placeholder(
    "Piyasa Saatleri",
    "NYSE/NASDAQ seans takvimi",
    "Seans açık/kapalı durumu TR saatiyle hesaplanır; rapor zamanlaması buna göre ayarlanır."
  ),
  "token-policy": placeholder(
    "Token Politikası",
    "LLM token bütçe yönetimi",
    "Maliyet kontrolü için istek başına maksimum token sınırı uygulanır."
  ),
  contributing: placeholder(
    "Katkı Rehberi",
    "Pull request ve kod standardı",
    "Fork → branch → PR akışı; commit mesajları conventional commits standardına uyar."
  ),
  deployment: placeholder(
    "Deployment",
    "Üretim ortamı kurulumu",
    "Docker Compose ile backend + frontend tek komutta ayağa kalkar."
  ),
};

export function slugify(s: string): string {
  return (
    "h-" +
    s
      .toLowerCase()
      .replace(/[^a-z0-9çğıöşü ]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
  );
}
