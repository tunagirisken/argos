import type { Time } from "lightweight-charts";

export type LwOhlc = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type LwVol = {
  time: Time;
  value: number;
  color?: string;
};

export type LwSeries = {
  daily: LwOhlc[];
  dailyVol: LwVol[];
  intra: LwOhlc[];
  intraVol: LwVol[];
};

export const RANGE_MAP: Record<string, [string, number]> = {
  "1G": ["intra", 8],
  "5G": ["intra", 40],
  "1A": ["daily", 22],
  "3A": ["daily", 66],
  "6A": ["daily", 130],
  "1Y": ["daily", 252],
};

export function seriesFor(
  lw: LwSeries,
  range: string
): { ohlc: LwOhlc[]; vol: LwVol[]; intraday: boolean } {
  const [kind, count] = RANGE_MAP[range] || ["daily", 66];
  const ohlc = lw[kind === "intra" ? "intra" : "daily"].slice(-count);
  const vol = lw[kind === "intra" ? "intraVol" : "dailyVol"].slice(-count);
  return { ohlc, vol, intraday: kind === "intra" };
}

export function emaLine(ohlc: LwOhlc[], period: number) {
  const k = 2 / (period + 1);
  let prev = 0;
  return ohlc.map((c, i) => {
    prev = i === 0 ? c.close : c.close * k + prev * (1 - k);
    return { time: c.time, value: +prev.toFixed(2) };
  });
}

export function bbLines(ohlc: LwOhlc[], period = 20, mult = 2) {
  const up: { time: Time; value: number }[] = [];
  const lo: { time: Time; value: number }[] = [];
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

export function tvColors() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n: string, f: string) => cs.getPropertyValue(n).trim() || f;
  return {
    text: g("--text-secondary", "#868993"),
    grid: g("--border-subtle", "#242836"),
    border: g("--border-default", "#363a45"),
    up: g("--positive", "#26a69a"),
    down: g("--negative", "#ef5350"),
    accent: g("--t-accent", "#2962ff"),
  };
}

export function ratingLabel(sum: number) {
  if (sum >= 3) return { t: "GÜÇLÜ AL", cls: "buy" as const };
  if (sum >= 1) return { t: "AL", cls: "buy" as const };
  if (sum <= -3) return { t: "GÜÇLÜ SAT", cls: "sell" as const };
  if (sum <= -1) return { t: "SAT", cls: "sell" as const };
  return { t: "BEKLE", cls: "hold" as const };
}

export function signalClass(signal: string) {
  if (signal === "AL" || signal === "GÜÇLÜ AL") return "buy";
  if (signal === "SAT" || signal === "GÜÇLÜ SAT") return "sell";
  return "hold";
}

export function stopZone(dist: number) {
  if (dist > 10) return "ok";
  if (dist >= 5) return "warn";
  return "danger";
}
