// ============================================================
// ARGOS — Chart Engine
// Sparkline (SVG, kartlar) + PriceChart (Canvas candlestick + indikatörler)
// ============================================================
const { useRef, useEffect, useState } = React;

// ---- Küçük sparkline (hisse kartları) ----
function Sparkline({ data, positive, width = 120, height = 40 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / rng) * (height - 4) - 2;
    return [x, y];
  });
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L${width} ${height} L0 ${height} Z`;
  const color = positive ? "var(--positive)" : "var(--negative)";
  const id = "sg" + Math.random().toString(36).slice(2, 7);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ---- Bollinger bands ----
function bollinger(closes, period = 20, mult = 2) {
  const up = [], lo = [], mid = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { up.push(null); lo.push(null); mid.push(null); continue; }
    const slice = closes.slice(i - period + 1, i + 1);
    const m = slice.reduce((a, b) => a + b, 0) / period;
    const sd = Math.sqrt(slice.reduce((a, b) => a + (b - m) ** 2, 0) / period);
    mid.push(m); up.push(m + mult * sd); lo.push(m - mult * sd);
  }
  return { up, lo, mid };
}

// ---- Büyük fiyat grafiği (canvas) ----
function PriceChart({ stock, range, mode, overlays }) {
  const ref = useRef(null);
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [dims, setDims] = useState({ w: 800, h: 420 });
  const [themeTick, setThemeTick] = useState(0);

  // veri dilimi
  const N = { "1G": 24, "1H": 32, "3A": 60, "6A": 90, "1Y": 120 }[range] || 90;
  const candles = stock.candles.slice(-N);
  const closes = candles.map((c) => c.close);
  const ema20 = stock.ema20.slice(-N), ema50 = stock.ema50.slice(-N), ema200 = stock.ema200.slice(-N);
  const bb = bollinger(stock.closes, 20, 2);
  const bbUp = bb.up.slice(-N), bbLo = bb.lo.slice(-N);

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const cvs = ref.current; if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    const W = dims.w, H = dims.h;
    const volH = 60, padR = 56, padB = 22, padT = 12;
    const chartH = H - volH - padB - padT;
    cvs.width = W * dpr; cvs.height = H * dpr;
    cvs.style.width = W + "px"; cvs.style.height = H + "px";
    const ctx = cvs.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const css = getComputedStyle(document.documentElement);
    const cPos = css.getPropertyValue("--positive").trim() || "#00d084";
    const cNeg = css.getPropertyValue("--negative").trim() || "#ff4d6a";
    const accent = css.getPropertyValue("--t-accent").trim() || "#7c6cf8";

    let hi = Math.max(...candles.map((c) => c.high));
    let lo = Math.min(...candles.map((c) => c.low));
    if (overlays.bollinger) {
      bbUp.forEach((v) => { if (v != null) hi = Math.max(hi, v); });
      bbLo.forEach((v) => { if (v != null) lo = Math.min(lo, v); });
    }
    const pad = (hi - lo) * 0.08; hi += pad; lo -= pad;
    const plotW = W - padR;
    const x = (i) => (i / (candles.length - 1)) * (plotW - 10) + 5;
    const y = (p) => padT + (1 - (p - lo) / (hi - lo)) * chartH;
    const cw = Math.max(2, (plotW / candles.length) * 0.62);

    // grid + fiyat eksenleri
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textBaseline = "middle";
    for (let g = 0; g <= 4; g++) {
      const py = padT + (chartH / 4) * g;
      const val = hi - ((hi - lo) / 4) * g;
      ctx.strokeStyle = "rgba(42,42,69,0.5)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(plotW, py); ctx.stroke();
      ctx.fillStyle = "#4a4a6a"; ctx.textAlign = "left";
      ctx.fillText("$" + val.toFixed(0), plotW + 6, py);
    }

    // Bollinger fill
    if (overlays.bollinger) {
      ctx.beginPath();
      let started = false;
      candles.forEach((c, i) => { if (bbUp[i] != null) { const px = x(i); if (!started) { ctx.moveTo(px, y(bbUp[i])); started = true; } else ctx.lineTo(px, y(bbUp[i])); } });
      for (let i = candles.length - 1; i >= 0; i--) { if (bbLo[i] != null) ctx.lineTo(x(i), y(bbLo[i])); }
      ctx.closePath();
      ctx.fillStyle = "rgba(124,108,248,0.07)"; ctx.fill();
    }

    if (mode === "candle") {
      candles.forEach((c, i) => {
        const up = c.close >= c.open;
        const col = up ? cPos : cNeg;
        const px = x(i);
        ctx.strokeStyle = col; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, y(c.high)); ctx.lineTo(px, y(c.low)); ctx.stroke();
        ctx.fillStyle = col;
        const top = y(Math.max(c.open, c.close));
        const bh = Math.max(1, Math.abs(y(c.open) - y(c.close)));
        ctx.fillRect(px - cw / 2, top, cw, bh);
      });
    } else {
      // area
      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      const last = candles[candles.length - 1];
      const upTrend = last.close >= candles[0].close;
      const base = upTrend ? cPos : cNeg;
      grad.addColorStop(0, base + "44"); grad.addColorStop(1, base + "00");
      ctx.beginPath();
      candles.forEach((c, i) => { const px = x(i), py = y(c.close); i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
      ctx.lineTo(x(candles.length - 1), padT + chartH); ctx.lineTo(x(0), padT + chartH); ctx.closePath();
      ctx.fillStyle = grad; ctx.fill();
      ctx.beginPath();
      candles.forEach((c, i) => { const px = x(i), py = y(c.close); i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
      ctx.strokeStyle = base; ctx.lineWidth = 2; ctx.stroke();
    }

    // EMA çizgileri
    const drawLine = (arr, color) => {
      ctx.beginPath();
      arr.forEach((v, i) => { const px = x(i), py = y(v); i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); });
      ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.stroke();
    };
    if (overlays.ema20) drawLine(ema20, "#9b8cff");
    if (overlays.ema50) drawLine(ema50, "#ffb547");
    if (overlays.ema200) drawLine(ema200, "#40c8ff");

    // hacim barları
    const maxVol = Math.max(...candles.map((c) => c.volume));
    const volTop = H - volH - padB + 6;
    candles.forEach((c, i) => {
      const up = c.close >= c.open;
      const bh = (c.volume / maxVol) * (volH - 8);
      ctx.fillStyle = (up ? cPos : cNeg) + "55";
      ctx.fillRect(x(i) - cw / 2, H - padB - bh, cw, bh);
    });
    ctx.fillStyle = "#4a4a6a"; ctx.textAlign = "left"; ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("HACİM", 4, volTop - 2);

    // son fiyat çizgisi
    const lastC = candles[candles.length - 1];
    const ly = y(lastC.close);
    ctx.strokeStyle = accent + "88"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(plotW, ly); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = accent; ctx.fillRect(plotW, ly - 9, padR, 18);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText(lastC.close.toFixed(2), plotW + padR / 2, ly);

    // hover crosshair
    if (hover != null && candles[hover.idx]) {
      const px = x(hover.idx);
      ctx.strokeStyle = "rgba(232,232,240,0.25)"; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(px, padT); ctx.lineTo(px, padT + chartH); ctx.stroke(); ctx.setLineDash([]);
    }

    // x ekseni etiketleri
    ctx.fillStyle = "#4a4a6a"; ctx.font = "10px 'JetBrains Mono', monospace"; ctx.textAlign = "center";
    const step = Math.ceil(candles.length / 6);
    candles.forEach((c, i) => {
      if (i % step === 0) {
        const daysAgo = candles.length - i;
        ctx.fillText("-" + daysAgo + "g", x(i), H - 6);
      }
    });
  }, [stock, range, mode, overlays, dims, hover, themeTick]);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const plotW = dims.w - 56;
    const idx = Math.round(((mx - 5) / (plotW - 10)) * (candles.length - 1));
    if (idx >= 0 && idx < candles.length) setHover({ idx, c: candles[idx], x: mx });
    else setHover(null);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: 420 }}>
      <canvas ref={ref} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: "crosshair" }} />
      {hover && hover.c && (
        <div style={{
          position: "absolute", top: 8, left: Math.min(hover.x + 12, dims.w - 170),
          background: "var(--bg-overlay)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)", padding: "8px 10px", fontSize: 11, pointerEvents: "none",
          fontFamily: "var(--font-mono)", lineHeight: 1.7, minWidth: 130, zIndex: 5,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}><span>A</span><span style={{ color: "var(--text-primary)" }}>{hover.c.open.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}><span>Y</span><span style={{ color: "var(--positive)" }}>{hover.c.high.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}><span>D</span><span style={{ color: "var(--negative)" }}>{hover.c.low.toFixed(2)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}><span>K</span><span style={{ color: "var(--text-primary)" }}>{hover.c.close.toFixed(2)}</span></div>
        </div>
      )}
    </div>
  );
}

// ---- RSI Gauge (yarım daire) ----
function RsiGauge({ value }) {
  const a = Math.PI * (1 - value / 100);
  const cx = 70, cy = 64, r = 52;
  const ex = cx + r * Math.cos(a), ey = cy - r * Math.sin(a);
  const zone = value >= 70 ? "var(--negative)" : value <= 30 ? "var(--positive)" : "var(--warning)";
  const zoneLabel = value >= 70 ? "Aşırı Alım" : value <= 30 ? "Aşırı Satım" : "Nötr";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="140" height="84" viewBox="0 0 140 84">
        <path d="M18 64 A52 52 0 0 1 122 64" fill="none" stroke="var(--bg-elevated)" strokeWidth="9" strokeLinecap="round" />
        <path d={`M18 64 A52 52 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`} fill="none" stroke={zone} strokeWidth="9" strokeLinecap="round" />
        <text x="70" y="56" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="26" fontWeight="700" fill="var(--text-primary)">{value}</text>
        <text x="70" y="74" textAnchor="middle" fontSize="10" fill="var(--text-secondary)">RSI</text>
      </svg>
      <div style={{ fontSize: 12, color: zone, fontWeight: 600, marginTop: -4 }}>{zoneLabel}</div>
    </div>
  );
}

// ---- MACD mini ----
function MacdMini({ data }) {
  const slice = data.slice(-40);
  const max = Math.max(...slice.map(Math.abs)) || 1;
  return (
    <svg width="100%" height="44" viewBox="0 0 200 44" preserveAspectRatio="none">
      <line x1="0" y1="22" x2="200" y2="22" stroke="var(--border-default)" strokeWidth="0.5" />
      {slice.map((v, i) => {
        const h = (Math.abs(v) / max) * 20;
        const x = (i / slice.length) * 200;
        return <rect key={i} x={x} y={v >= 0 ? 22 - h : 22} width={200 / slice.length - 0.6} height={h} fill={v >= 0 ? "var(--positive)" : "var(--negative)"} opacity="0.8" />;
      })}
    </svg>
  );
}

Object.assign(window, { Sparkline, PriceChart, RsiGauge, MacdMini, bollinger });
