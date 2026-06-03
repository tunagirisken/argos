import { bollinger, ema, genCandles } from "../lib/indicators";
import type { Stock } from "../types";

const LOGO_COLORS: Record<string, string> = {
  MRVL: "linear-gradient(135deg,#0a4d8c,#1789e0)",
  NVDA: "linear-gradient(135deg,#1a7a1a,#76b900)",
  AVAV: "linear-gradient(135deg,#0a4d8c,#1789e0)",
  TSLA: "linear-gradient(135deg,#7a1320,#e31937)",
  AAPL: "linear-gradient(135deg,#444,#888)",
  AMD: "linear-gradient(135deg,#0a6b3b,#11b569)",
  PLTR: "linear-gradient(135deg,#111,#3b3b55)",
};

const SEEDS: Record<string, number> = {
  MRVL: 11,
  NVDA: 22,
  AVAV: 33,
  TSLA: 33,
  AAPL: 44,
  AMD: 55,
  PLTR: 66,
};

export function enrichStock(raw: {
  t: string;
  name: string;
  price: number;
  dayPct: number;
  cost: number;
  qty: number;
  stop: number;
  target: number;
  signal: string;
  rsi: number;
  sector?: string;
}): Stock {
  const drift =
    (raw.target > raw.cost ? 1 : -1) * 0.0015 + (raw.dayPct > 0 ? 0.001 : -0.001);
  const candles = genCandles(SEEDS[raw.t] ?? 99, 120, raw.price * 0.78, drift, 0.022);
  const last = candles[candles.length - 1];
  const adj = raw.price / last.close;
  candles.forEach((c) => {
    c.open *= adj;
    c.close *= adj;
    c.high *= adj;
    c.low *= adj;
  });
  const closes = candles.map((c) => c.close);
  const value = raw.price * raw.qty;
  const totalCost = raw.cost * raw.qty;
  const totalPL = value - totalCost;
  const totalPct = (totalPL / totalCost) * 100;
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);

  return {
    t: raw.t,
    name: raw.name,
    price: raw.price,
    dayPct: raw.dayPct,
    cost: raw.cost,
    qty: raw.qty,
    stop: raw.stop,
    target: raw.target,
    signal: raw.signal as Stock["signal"],
    rsi: raw.rsi,
    sector: raw.sector ?? "Hisse",
    candles,
    closes,
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    value,
    totalCost,
    totalPL,
    totalPct,
    stopDist: ((raw.price - raw.stop) / raw.price) * 100,
    dayPL: value * (raw.dayPct / (100 + raw.dayPct)),
    logo: LOGO_COLORS[raw.t] ?? "linear-gradient(135deg,#7c6cf8,#9b8cff)",
    confidence: ({ AL: 85, SAT: 78, BEKLE: 52 }[raw.signal] ?? 60) + ((SEEDS[raw.t] ?? 0) % 9),
    macd,
    closesFull: closes,
    bb: bollinger(closes, 20, 2),
  };
}

export const FIXTURE_STOCKS: Stock[] = [
  enrichStock({
    t: "MRVL",
    name: "Marvell Technology",
    price: 319.58,
    dayPct: 2.1,
    cost: 262.12,
    qty: 2.5,
    stop: 310,
    target: 400,
    signal: "AL",
    rsi: 68,
    sector: "Yarı İletken",
  }),
  enrichStock({
    t: "AVAV",
    name: "AeroVironment",
    price: 195.2,
    dayPct: 1.2,
    cost: 170.52,
    qty: 3,
    stop: 185,
    target: 305,
    signal: "AL",
    rsi: 55,
    sector: "Savunma",
  }),
  enrichStock({
    t: "NVDA",
    name: "NVIDIA Corp.",
    price: 178.34,
    dayPct: 2.81,
    cost: 185.7,
    qty: 2,
    stop: 200,
    target: 296,
    signal: "BEKLE",
    rsi: 61,
    sector: "Yarı İletken",
  }),
];
