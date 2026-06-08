// ============================================================
// ARGOS — Mock Data Layer
// Gerçekçi sahte portföy + deterministik fiyat geçmişi üreteci
// ============================================================

// Deterministik PRNG (her hisse için tutarlı grafik)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// N adet OHLC mumu üret (random walk, drift'li)
function genCandles(seed, n, start, drift, vol) {
  const rnd = mulberry32(seed);
  const out = [];
  let price = start;
  for (let i = 0; i < n; i++) {
    const open = price;
    const change = (rnd() - 0.5) * 2 * vol + drift;
    const close = Math.max(1, open * (1 + change));
    const hi = Math.max(open, close) * (1 + rnd() * vol * 0.6);
    const lo = Math.min(open, close) * (1 - rnd() * vol * 0.6);
    const volume = Math.round((0.6 + rnd()) * 1e6);
    out.push({ i, open, close, high: hi, low: lo, volume });
    price = close;
  }
  return out;
}

// Basit hareketli ortalama
function ema(values, period) {
  const k = 2 / (period + 1);
  const out = [];
  let prev;
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

// RSI
function rsi(closes, period = 14) {
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let rs = gains / (losses || 1e-9);
  return Math.round(100 - 100 / (1 + rs));
}

const LOGO_COLORS = {
  MRVL: "linear-gradient(135deg,#0a4d8c,#1789e0)",
  NVDA: "linear-gradient(135deg,#1a7a1a,#76b900)",
  TSLA: "linear-gradient(135deg,#7a1320,#e31937)",
  AAPL: "linear-gradient(135deg,#444,#888)",
  AMD: "linear-gradient(135deg,#0a6b3b,#11b569)",
  PLTR: "linear-gradient(135deg,#111,#3b3b55)",
};

// ---- Portföy hisseleri ----
// her hisse: ticker, isim, fiyat, gün %değişim, maliyet, adet, stop, hedef, sinyal, rsi
const RAW = [
  { t: "MRVL", name: "Marvell Technology", price: 319.58, dayPct: 45.64, cost: 262.12, qty: 120, stop: 310, target: 400, signal: "AL", rsi: 68, sector: "Yarı İletken" },
  { t: "NVDA", name: "NVIDIA Corp.", price: 178.34, dayPct: 2.81, cost: 121.40, qty: 340, stop: 165, target: 210, signal: "AL", rsi: 61, sector: "Yarı İletken" },
  { t: "TSLA", name: "Tesla Inc.", price: 248.12, dayPct: -3.42, cost: 274.90, qty: 90, stop: 232, target: 300, signal: "BEKLE", rsi: 44, sector: "Otomotiv" },
  { t: "AAPL", name: "Apple Inc.", price: 226.78, dayPct: 0.64, cost: 198.20, qty: 150, stop: 212, target: 250, signal: "BEKLE", rsi: 55, sector: "Donanım" },
  { t: "AMD", name: "Advanced Micro", price: 164.05, dayPct: 4.12, cost: 142.80, qty: 200, stop: 150, target: 195, signal: "AL", rsi: 72, sector: "Yarı İletken" },
  { t: "PLTR", name: "Palantir Tech.", price: 41.22, dayPct: -1.88, cost: 46.10, qty: 500, stop: 38, target: 55, signal: "SAT", rsi: 38, sector: "Yazılım" },
];

const SEEDS = { MRVL: 11, NVDA: 22, TSLA: 33, AAPL: 44, AMD: 55, PLTR: 66 };

// ---- lightweight-charts zaman eksenleri ----
const NOW = Date.UTC(2026, 5, 4, 20, 0, 0); // 4 Haz 2026 kapanış
function dailyTimes(n) {
  const out = [], base = new Date(NOW);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base); d.setUTCDate(base.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10)); // 'yyyy-mm-dd'
  }
  return out;
}
function intraTimes(n) {
  const out = [], now = Math.floor(NOW / 1000);
  for (let i = n - 1; i >= 0; i--) out.push(now - i * 3600);
  return out;
}
function adjustTo(arr, price) {
  const adj = price / arr[arr.length - 1].close;
  arr.forEach((c) => { c.open *= adj; c.close *= adj; c.high *= adj; c.low *= adj; });
  return arr;
}
const mapOHLC = (arr, times) => arr.map((c, i) => ({
  time: times[i], open: +c.open.toFixed(2), high: +c.high.toFixed(2), low: +c.low.toFixed(2), close: +c.close.toFixed(2),
}));
const mapVol = (arr, times) => arr.map((c, i) => ({
  time: times[i], value: Math.round(c.volume), color: c.close >= c.open ? "rgba(38,166,154,0.45)" : "rgba(239,83,80,0.45)",
}));

// ---- 5'li teknik sinyal skoru (-1 / 0 / +1) ----
function computeSignals(s) {
  const lastMacd = s.macd[s.macd.length - 1];
  const ema50 = s.ema50[s.ema50.length - 1];
  // bollinger (20)
  const cl = s.closes.slice(-20);
  const m = cl.reduce((a, b) => a + b, 0) / cl.length;
  const sd = Math.sqrt(cl.reduce((a, b) => a + (b - m) ** 2, 0) / cl.length);
  const upper = m + 2 * sd, lower = m - 2 * sd;
  const rsiVal = s.rsi <= 35 ? 1 : s.rsi >= 68 ? -1 : 0;
  const macdVal = lastMacd > 0.05 ? 1 : lastMacd < -0.05 ? -1 : 0;
  const bbVal = s.price > upper ? -1 : s.price < lower ? 1 : 0;
  const emaVal = s.price > ema50 ? 1 : -1;
  const volVal = s.dayPct > 0 ? 1 : -1;
  return [
    { key: "RSI", val: rsiVal, note: `${s.rsi}` },
    { key: "MACD", val: macdVal, note: lastMacd > 0 ? "pozitif" : "negatif" },
    { key: "BB", val: bbVal, note: bbVal > 0 ? "alt bant" : bbVal < 0 ? "üst bant" : "orta" },
    { key: "EMA", val: emaVal, note: emaVal > 0 ? "trend ↑" : "trend ↓" },
    { key: "Hacim", val: volVal, note: volVal > 0 ? "alış baskın" : "satış baskın" },
  ];
}

const STOCKS = RAW.map((s) => {
  const drift = (s.target > s.cost ? 1 : -1) * 0.0015 + (s.dayPct > 0 ? 0.001 : -0.001);
  const candles = genCandles(SEEDS[s.t], 120, s.price * 0.78, drift, 0.022);
  // son mumun close'unu güncel fiyata yakınla
  adjustTo(candles, s.price);
  const closes = candles.map((c) => c.close);
  const value = s.price * s.qty;
  const totalCost = s.cost * s.qty;
  const totalPL = value - totalCost;
  const totalPct = (totalPL / totalCost) * 100;
  const stopDist = ((s.price - s.stop) / s.price) * 100; // stop'a uzaklık %

  // lightweight-charts serileri
  const dN = 252, iN = 140;
  const dailyC = adjustTo(genCandles(SEEDS[s.t] + 100, dN, s.price * 0.55, drift, 0.02), s.price);
  const intraC = adjustTo(genCandles(SEEDS[s.t] + 200, iN, s.price * 0.97, drift * 0.25, 0.009), s.price);
  const dT = dailyTimes(dN), iT = intraTimes(iN);

  const out = {
    ...s,
    candles, closes,
    ema20: ema(closes, 20), ema50: ema(closes, 50), ema200: ema(closes, 200),
    value, totalCost, totalPL, totalPct, stopDist,
    dayPL: value * (s.dayPct / (100 + s.dayPct)),
    logo: LOGO_COLORS[s.t],
    confidence: { AL: 85, SAT: 78, BEKLE: 52 }[s.signal] + (SEEDS[s.t] % 9),
    macd: ema(closes, 12).map((v, i) => v - ema(closes, 26)[i]),
    lw: {
      daily: mapOHLC(dailyC, dT), dailyVol: mapVol(dailyC, dT),
      intra: mapOHLC(intraC, iT), intraVol: mapVol(intraC, iT),
    },
  };
  out.signals = computeSignals(out);
  out.signalSum = out.signals.reduce((a, x) => a + x.val, 0);
  return out;
});

const PORTFOLIO = (() => {
  const totalValue = STOCKS.reduce((a, s) => a + s.value, 0);
  const totalCost = STOCKS.reduce((a, s) => a + s.totalCost, 0);
  const dayPL = STOCKS.reduce((a, s) => a + s.dayPL, 0);
  const cash = 48250.0;
  return {
    totalValue: totalValue + cash,
    invested: totalValue,
    cash,
    pendingOrders: 12400,
    totalCost,
    totalReturn: totalValue - totalCost,
    totalReturnPct: ((totalValue - totalCost) / totalCost) * 100,
    dayPL,
    dayPct: (dayPL / (totalValue - dayPL)) * 100,
  };
})();

// ---- Haberler ----
const NEWS = {
  MRVL: [
    { title: "Marvell, veri merkezi gelirlerinde rekor çeyrek açıkladı", src: "Reuters", min: 12, sentiment: "pos" },
    { title: "Analistler MRVL hedef fiyatını $400'e yükseltti", src: "Bloomberg", min: 47, sentiment: "pos" },
    { title: "Özel AI çip siparişleri beklentileri aştı", src: "CNBC", min: 95, sentiment: "pos" },
    { title: "Yarı iletken sektöründe tedarik baskısı sürüyor", src: "WSJ", min: 180, sentiment: "neu" },
    { title: "Kısa vadeli kâr realizasyonu satışları görüldü", src: "Seeking Alpha", min: 320, sentiment: "neg" },
  ],
  NVDA: [
    { title: "NVIDIA yeni Blackwell üretim kapasitesini ikiye katladı", src: "Reuters", min: 22, sentiment: "pos" },
    { title: "Hyperscaler talebi 2026 görünümünü güçlendiriyor", src: "Bloomberg", min: 60, sentiment: "pos" },
    { title: "Düzenleyici ihracat kısıtları riski izleniyor", src: "WSJ", min: 140, sentiment: "neu" },
  ],
  TSLA: [
    { title: "Teslimat rakamları beklentinin altında kaldı", src: "CNBC", min: 18, sentiment: "neg" },
    { title: "Robotaxi lansman tarihi yeniden ertelendi", src: "Reuters", min: 90, sentiment: "neg" },
    { title: "Enerji depolama segmenti büyümeye devam ediyor", src: "Bloomberg", min: 210, sentiment: "pos" },
  ],
};
function defaultNews(t) {
  return [
    { title: `${t} için çeyreklik bilanço beklentileri güncellendi`, src: "Bloomberg", min: 35, sentiment: "neu" },
    { title: `Kurumsal yatırımcı pozisyonları ${t}'de arttı`, src: "Reuters", min: 88, sentiment: "pos" },
    { title: `Sektör geneli volatilite ${t}'yi etkiliyor`, src: "CNBC", min: 160, sentiment: "neu" },
  ];
}

// ---- Alarmlar ----
const ALARMS = [
  { id: 1, ticker: "MRVL", type: "Fiyat ↑", level: 330, current: 319.58, status: "aktif" },
  { id: 2, ticker: "NVDA", type: "Fiyat ↑", level: 185, current: 178.34, status: "aktif" },
  { id: 3, ticker: "TSLA", type: "Stop-loss", level: 232, current: 248.12, status: "aktif" },
  { id: 4, ticker: "AMD", type: "RSI > 70", level: 70, current: 72, status: "tetiklendi" },
  { id: 5, ticker: "PLTR", type: "Fiyat ↓", level: 40, current: 41.22, status: "aktif" },
];
const ALARM_HISTORY = [
  { icon: "up", msg: "AMD RSI 70 eşiğini aştı (72)", time: "8 dk önce", tone: "warn" },
  { icon: "down", msg: "PLTR $42 desteğini test etti", time: "1 sa önce", tone: "neg" },
  { icon: "up", msg: "MRVL günlük +%45 ile zirve yaptı", time: "3 sa önce", tone: "pos" },
  { icon: "bell", msg: "NVDA hacim ortalamanın 2x üzerinde", time: "Dün 16:40", tone: "info" },
  { icon: "down", msg: "TSLA teslimat haberiyle %3 düştü", time: "Dün 14:12", tone: "neg" },
];

// ---- AI Raporları ----
const REPORTS = [
  { id: "m1", kind: "Sabah Brifingi", date: "3 Haz 2026 · 08:30", summary: "Portföy gece +%1.2 değer kazandı. MRVL ve AMD öncülük ediyor; TSLA teslimat verisi öncesi risk altında. Bugün NYSE açılışında yarı iletken momentumu güçlü.", tone: "pos" },
  { id: "m2", kind: "Kapanış Raporu", date: "2 Haz 2026 · 23:05", summary: "Gün +%2.8 ile kapandı. 4 pozisyon yeşil. PLTR zayıflığı sürüyor — stop-loss $38'e yakın, yakından izlenmeli.", tone: "pos" },
  { id: "m3", kind: "Risk Uyarısı", date: "2 Haz 2026 · 15:40", summary: "TSLA pozisyonu maliyetin %9.7 altında. Stop-loss $232 seviyesine %6.5 uzaklıkta. Pozisyon küçültme değerlendirilebilir.", tone: "warn" },
  { id: "m4", kind: "Kapanış Raporu", date: "1 Haz 2026 · 23:02", summary: "Karışık seans. NVDA Blackwell haberiyle +%2.8. Nakit oranı %11, fırsat alımları için uygun seviye.", tone: "neu" },
];

function fmtUSD(n, dec = 2) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmtPct(n, dec = 2) {
  return (n >= 0 ? "+" : "") + n.toFixed(dec) + "%";
}

Object.assign(window, {
  STOCKS, PORTFOLIO, NEWS, defaultNews, ALARMS, ALARM_HISTORY, REPORTS,
  fmtUSD, fmtPct, rsi, ema, genCandles,
});
