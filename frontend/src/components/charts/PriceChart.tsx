import { useEffect, useRef, useState } from "react";
import type { Stock } from "../../types";

const RANGE_N: Record<string, number> = { "1G": 24, "1H": 32, "3A": 60, "6A": 90, "1Y": 120 };

interface Props {
  stock: Stock;
  range: string;
  mode: "candle" | "area";
  overlays: { ema20: boolean; ema50: boolean; ema200: boolean; bollinger: boolean };
}

export function PriceChart({ stock, range, mode, overlays }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ idx: number; c: (typeof stock.candles)[0]; x: number } | null>(null);
  const [dims] = useState({ w: 800, h: 420 });
  const [themeTick, setThemeTick] = useState(0);

  const N = RANGE_N[range] || 90;
  const candles = stock.candles.slice(-N);
  const ema20 = stock.ema20.slice(-N);
  const ema50 = stock.ema50.slice(-N);
  const ema200 = stock.ema200.slice(-N);
  const bbUp = stock.bb.up.slice(-N);
  const bbLo = stock.bb.lo.slice(-N);

  useEffect(() => {
    const obs = new MutationObserver(() => setThemeTick((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const dpr = window.devicePixelRatio || 1;
    const W = dims.w;
    const H = dims.h;
    const volH = 60;
    const padR = 56;
    const padB = 22;
    const padT = 12;
    const chartH = H - volH - padB - padT;
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    cvs.style.width = W + "px";
    cvs.style.height = H + "px";
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const css = getComputedStyle(document.documentElement);
    const cPos = css.getPropertyValue("--positive").trim() || "#00d084";
    const cNeg = css.getPropertyValue("--negative").trim() || "#ff4d6a";
    const accent = css.getPropertyValue("--t-accent").trim() || "#7c6cf8";

    let hi = Math.max(...candles.map((c) => c.high));
    let lo = Math.min(...candles.map((c) => c.low));
    if (overlays.bollinger) {
      bbUp.forEach((v) => {
        if (v != null) hi = Math.max(hi, v);
      });
      bbLo.forEach((v) => {
        if (v != null) lo = Math.min(lo, v);
      });
    }
    const pad = (hi - lo) * 0.08;
    hi += pad;
    lo -= pad;
    const plotW = W - padR;
    const x = (i: number) => (i / (candles.length - 1)) * (plotW - 10) + 5;
    const y = (p: number) => padT + (1 - (p - lo) / (hi - lo)) * chartH;
    const cw = Math.max(2, (plotW / candles.length) * 0.62);

    ctx.font = "11px 'JetBrains Mono', monospace";
    for (let g = 0; g <= 4; g++) {
      const py = padT + (chartH / 4) * g;
      const val = hi - ((hi - lo) / 4) * g;
      ctx.strokeStyle = "rgba(42,42,69,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(plotW, py);
      ctx.stroke();
      ctx.fillStyle = "#4a4a6a";
      ctx.textAlign = "left";
      ctx.fillText("$" + val.toFixed(0), plotW + 6, py);
    }

    if (overlays.bollinger) {
      ctx.beginPath();
      let started = false;
      candles.forEach((_, i) => {
        if (bbUp[i] != null) {
          const px = x(i);
          if (!started) {
            ctx.moveTo(px, y(bbUp[i] as number));
            started = true;
          } else ctx.lineTo(px, y(bbUp[i] as number));
        }
      });
      for (let i = candles.length - 1; i >= 0; i--) {
        if (bbLo[i] != null) ctx.lineTo(x(i), y(bbLo[i] as number));
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(124,108,248,0.07)";
      ctx.fill();
    }

    if (mode === "candle") {
      candles.forEach((c, i) => {
        const up = c.close >= c.open;
        const col = up ? cPos : cNeg;
        const px = x(i);
        ctx.strokeStyle = col;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, y(c.high));
        ctx.lineTo(px, y(c.low));
        ctx.stroke();
        ctx.fillStyle = col;
        const top = y(Math.max(c.open, c.close));
        const bh = Math.max(1, Math.abs(y(c.open) - y(c.close)));
        ctx.fillRect(px - cw / 2, top, cw, bh);
      });
    } else {
      const last = candles[candles.length - 1];
      const upTrend = last.close >= candles[0].close;
      const base = upTrend ? cPos : cNeg;
      const grad = ctx.createLinearGradient(0, padT, 0, padT + chartH);
      grad.addColorStop(0, base + "44");
      grad.addColorStop(1, base + "00");
      ctx.beginPath();
      candles.forEach((c, i) => {
        const px = x(i);
        const py = y(c.close);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.lineTo(x(candles.length - 1), padT + chartH);
      ctx.lineTo(x(0), padT + chartH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      candles.forEach((c, i) => {
        const px = x(i);
        const py = y(c.close);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = base;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    const drawLine = (arr: number[], color: string) => {
      ctx.beginPath();
      arr.forEach((v, i) => {
        const px = x(i);
        const py = y(v);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    };
    if (overlays.ema20) drawLine(ema20, "#9b8cff");
    if (overlays.ema50) drawLine(ema50, "#ffb547");
    if (overlays.ema200) drawLine(ema200, "#40c8ff");

    const maxVol = Math.max(...candles.map((c) => c.volume));
    candles.forEach((c, i) => {
      const up = c.close >= c.open;
      const bh = (c.volume / maxVol) * (volH - 8);
      ctx.fillStyle = (up ? cPos : cNeg) + "55";
      ctx.fillRect(x(i) - cw / 2, H - padB - bh, cw, bh);
    });

    const lastC = candles[candles.length - 1];
    const ly = y(lastC.close);
    ctx.strokeStyle = accent + "88";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(plotW, ly);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = accent;
    ctx.fillRect(plotW, ly - 9, padR, 18);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.fillText(lastC.close.toFixed(2), plotW + padR / 2, ly);

    if (hover != null && candles[hover.idx]) {
      const px = x(hover.idx);
      ctx.strokeStyle = "rgba(232,232,240,0.25)";
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(px, padT);
      ctx.lineTo(px, padT + chartH);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [stock, range, mode, overlays, dims, hover, themeTick, candles, ema20, ema50, ema200, bbUp, bbLo]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const mx = e.clientX - r.left;
    const plotW = dims.w - 56;
    const idx = Math.round(((mx - 5) / (plotW - 10)) * (candles.length - 1));
    if (idx >= 0 && idx < candles.length) setHover({ idx, c: candles[idx], x: mx });
    else setHover(null);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: 420 }}>
      <canvas ref={ref} onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: "crosshair", width: "100%" }} />
      {hover?.c && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: Math.min(hover.x + 12, dims.w - 170),
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            padding: "8px 10px",
            fontSize: 11,
            pointerEvents: "none",
            fontFamily: "var(--font-mono)",
            lineHeight: 1.7,
            minWidth: 130,
            zIndex: 5,
          }}
        >
          <div>A: {hover.c.open.toFixed(2)}</div>
          <div>Y: {hover.c.high.toFixed(2)}</div>
          <div>D: {hover.c.low.toFixed(2)}</div>
          <div>K: {hover.c.close.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}
