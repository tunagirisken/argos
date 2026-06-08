// ============================================================
// ARGOS — lightweight-charts (TradingView v4) sarmalayıcıları
// TVChart (detay), MiniChart (dashboard kart), skor göstergeleri
// ============================================================
const { useRef, useEffect } = React;

// CSS değişkenlerinden canlı renk oku (tema değişimine duyarlı)
function tvColors() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n, f) => (cs.getPropertyValue(n).trim() || f);
  return {
    text: g("--text-secondary", "#868993"),
    grid: g("--border-subtle", "#242836"),
    border: g("--border-default", "#363a45"),
    up: g("--positive", "#26a69a"),
    down: g("--negative", "#ef5350"),
    accent: g("--t-accent", "#2962ff"),
  };
}

const RANGE_MAP = {
  "1G": ["intra", 8], "5G": ["intra", 40],
  "1A": ["daily", 22], "3A": ["daily", 66], "6A": ["daily", 130], "1Y": ["daily", 252],
};
function seriesFor(stock, range) {
  const [kind, count] = RANGE_MAP[range] || ["daily", 66];
  const ohlc = stock.lw[kind].slice(-count);
  const vol = stock.lw[kind === "intra" ? "intraVol" : "dailyVol"].slice(-count);
  return { ohlc, vol, intraday: kind === "intra" };
}

// EMA / BB → {time,value} (kapanışlardan, gösterilen zaman eksenine hizalı)
function emaLine(ohlc, period) {
  const k = 2 / (period + 1); let prev;
  return ohlc.map((c, i) => { prev = i === 0 ? c.close : c.close * k + prev * (1 - k); return { time: c.time, value: +prev.toFixed(2) }; });
}
function bbLines(ohlc, period = 20, mult = 2) {
  const up = [], lo = [];
  for (let i = 0; i < ohlc.length; i++) {
    if (i < period - 1) continue;
    const sl = ohlc.slice(i - period + 1, i + 1).map((c) => c.close);
    const m = sl.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(sl.reduce((a, b) => a + (b - m) ** 2, 0) / period);
    up.push({ time: ohlc[i].time, value: +(m + mult * sd).toFixed(2) });
    lo.push({ time: ohlc[i].time, value: +(m - mult * sd).toFixed(2) });
  }
  return { up, lo };
}

// ---- Tam detay grafiği ----
function TVChart({ stock, range, mode, overlays, theme }) {
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef([]);

  // grafik oluştur (bir kez)
  useEffect(() => {
    const c = tvColors();
    const chart = LightweightCharts.createChart(wrapRef.current, {
      autoSize: true,
      layout: { background: { type: "solid", color: "transparent" }, textColor: c.text, fontFamily: "'Inter', sans-serif", fontSize: 11 },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal, vertLine: { color: c.border, labelBackgroundColor: c.accent }, horzLine: { color: c.border, labelBackgroundColor: c.accent } },
      rightPriceScale: { borderColor: c.border, scaleMargins: { top: 0.08, bottom: 0.26 } },
      timeScale: { borderColor: c.border, timeVisible: true, secondsVisible: false, rightOffset: 4 },
      handleScale: { axisPressedMouseMove: true },
    });
    chartRef.current = chart;
    return () => { chart.remove(); chartRef.current = null; };
  }, []);

  // tema → renkleri güncelle
  useEffect(() => {
    if (!chartRef.current) return;
    const c = tvColors();
    chartRef.current.applyOptions({
      layout: { textColor: c.text },
      grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
      rightPriceScale: { borderColor: c.border },
      timeScale: { borderColor: c.border },
      crosshair: { vertLine: { color: c.border, labelBackgroundColor: c.accent }, horzLine: { color: c.border, labelBackgroundColor: c.accent } },
    });
  }, [theme]);

  // veri / mod / overlay → serileri yeniden kur
  useEffect(() => {
    const chart = chartRef.current; if (!chart) return;
    const c = tvColors();
    seriesRef.current.forEach((s) => chart.removeSeries(s));
    seriesRef.current = [];
    const add = (s) => { seriesRef.current.push(s); return s; };
    const { ohlc, vol } = seriesFor(stock, range);

    // hacim (alt)
    const v = add(chart.addHistogramSeries({ priceScaleId: "vol", priceFormat: { type: "volume" }, lastValueVisible: false, priceLineVisible: false }));
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
    v.setData(vol);

    // ana seri
    if (mode === "line") {
      const ls = add(chart.addLineSeries({ color: c.accent, lineWidth: 2, priceLineColor: c.accent, crosshairMarkerVisible: true, lastValueVisible: true }));
      ls.setData(ohlc.map((o) => ({ time: o.time, value: o.close })));
    } else {
      const cs = add(chart.addCandlestickSeries({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down, borderVisible: false }));
      cs.setData(ohlc);
    }

    // overlay'ler
    if (overlays.ema20) { const s = add(chart.addLineSeries({ color: "#ff9800", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })); s.setData(emaLine(ohlc, 20)); }
    if (overlays.ema50) { const s = add(chart.addLineSeries({ color: "#ab47bc", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })); s.setData(emaLine(ohlc, 50)); }
    if (overlays.bb) {
      const { up, lo } = bbLines(ohlc, 20, 2);
      const o1 = add(chart.addLineSeries({ color: "rgba(120,123,134,0.7)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, lineStyle: 2 }));
      const o2 = add(chart.addLineSeries({ color: "rgba(120,123,134,0.7)", lineWidth: 1, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, lineStyle: 2 }));
      o1.setData(up); o2.setData(lo);
    }
    chart.timeScale().fitContent();
  }, [stock, range, mode, overlays]);

  return <div ref={wrapRef} className="chart-wrap" />;
}

// ---- Mini kart grafiği (dashboard) ----
function MiniChart({ stock, mode, theme }) {
  const wrapRef = useRef(null);
  const chartRef = useRef(null);
  const serRef = useRef(null);

  useEffect(() => {
    const chart = LightweightCharts.createChart(wrapRef.current, {
      autoSize: true,
      layout: { background: { type: "solid", color: "transparent" }, fontSize: 1, attributionLogo: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { visible: false }, leftPriceScale: { visible: false },
      timeScale: { visible: false, borderVisible: false },
      crosshair: { vertLine: { visible: false, labelVisible: false }, horzLine: { visible: false, labelVisible: false } },
      handleScroll: false, handleScale: false,
    });
    chartRef.current = chart;
    return () => { chart.remove(); chartRef.current = null; };
  }, []);

  useEffect(() => {
    const chart = chartRef.current; if (!chart) return;
    const c = tvColors();
    if (serRef.current) { chart.removeSeries(serRef.current); serRef.current = null; }
    const ohlc = stock.lw.intra.slice(-40);
    if (mode === "line") {
      const up = ohlc[ohlc.length - 1].close >= ohlc[0].close;
      const s = chart.addAreaSeries({ lineColor: up ? c.up : c.down, topColor: (up ? c.up : c.down) + "44", bottomColor: (up ? c.up : c.down) + "00", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      s.setData(ohlc.map((o) => ({ time: o.time, value: o.close })));
      serRef.current = s;
    } else {
      const s = chart.addCandlestickSeries({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down, borderVisible: false });
      s.setData(ohlc);
      serRef.current = s;
    }
    chart.timeScale().fitContent();
  }, [stock, mode, theme]);

  return <div ref={wrapRef} style={{ width: "100%", height: "100%" }} />;
}

// ---- Kompakt RSI yarım-gauge ----
function RsiMini({ value, w = 92 }) {
  const h = w * 0.62;
  const cx = w / 2, cy = h - 8, r = w * 0.4;
  const a = Math.PI * (1 - value / 100);
  const ex = cx + r * Math.cos(a), ey = cy - r * Math.sin(a);
  const zone = value >= 70 ? "var(--negative)" : value <= 30 ? "var(--positive)" : "var(--warning)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--bg-elevated)" strokeWidth="6" strokeLinecap="round" />
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={zone} strokeWidth="6" strokeLinecap="round" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={w * 0.2} fontWeight="700" fill="var(--text-primary)">{value}</text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="var(--text-muted)">RSI</text>
    </svg>
  );
}

// ---- Genel sinyal skoru göstergesi (-5..+5) ----
function ScoreDial({ sum, size = 56 }) {
  const pct = (sum + 5) / 10; // 0..1
  const a = Math.PI * (1 - pct);
  const cx = size / 2, cy = size - 8, r = size * 0.4;
  const ex = cx + r * Math.cos(a), ey = cy - r * Math.sin(a);
  const col = sum >= 2 ? "var(--positive)" : sum <= -2 ? "var(--negative)" : "var(--warning)";
  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--bg-elevated)" strokeWidth="5" strokeLinecap="round" />
      <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={col} strokeWidth="5" strokeLinecap="round" />
      <text x={cx} y={cy - 3} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="15" fontWeight="700" fill={col}>{sum > 0 ? "+" + sum : sum}</text>
    </svg>
  );
}
function ratingLabel(sum) {
  if (sum >= 3) return { t: "GÜÇLÜ AL", cls: "buy" };
  if (sum >= 1) return { t: "AL", cls: "buy" };
  if (sum <= -3) return { t: "GÜÇLÜ SAT", cls: "sell" };
  if (sum <= -1) return { t: "SAT", cls: "sell" };
  return { t: "BEKLE", cls: "hold" };
}

Object.assign(window, { TVChart, MiniChart, RsiMini, ScoreDial, ratingLabel, seriesFor });
