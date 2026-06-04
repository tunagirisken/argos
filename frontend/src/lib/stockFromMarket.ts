import type { Time } from "lightweight-charts";
import { bollinger, ema } from "./indicators";
import type { LwOhlc, LwSeries } from "./lwc";
import { logoFor } from "./logos";
import type { SignalIndicator, Stock } from "../types";

export type MarketBundle = {
  symbol: string;
  price?: number;
  change_pct?: number;
  daily?: { time: string; open: number; high: number; low: number; close: number }[];
  dailyVol?: { time: string; value: number; color?: string }[];
  intra?: { time: number; open: number; high: number; low: number; close: number }[];
  intraVol?: { time: number; value: number; color?: string }[];
  signal?: string;
  confidence?: number;
  signal_components?: SignalIndicator[];
  signal_sum?: number;
  indicators?: { rsi?: number };
  error?: string;
};

export type MarketSnapshot = {
  symbol: string;
  price: number;
  change_pct: number;
  signal: string;
  confidence?: number;
  signal_components: SignalIndicator[];
  signal_sum: number;
  indicators?: { rsi?: number };
  error?: string;
};

export type PositionInput = {
  symbol: string;
  name: string;
  shares: number;
  avg_cost: number;
  stop_loss?: number;
  target?: number;
  sector?: string;
  change_pct?: number;
  current_price?: number;
  note?: string;
};

function emptyLw(): LwSeries {
  return { daily: [], dailyVol: [], intra: [], intraVol: [] };
}

function toLwSeries(bundle: MarketBundle): LwSeries {
  if (bundle.error || !bundle.daily?.length) return emptyLw();
  return {
    daily: bundle.daily.map((b) => ({ ...b, time: b.time as Time })),
    dailyVol: (bundle.dailyVol ?? []).map((b) => ({ ...b, time: b.time as Time })),
    intra: (bundle.intra ?? []).map((b) => ({ ...b, time: b.time as Time })),
    intraVol: (bundle.intraVol ?? []).map((b) => ({ ...b, time: b.time as Time })),
  };
}

/** Portföy pozisyonu + yfinance paketinden Stock oluşturur. */
export function buildStockFromMarket(pos: PositionInput, bundle: MarketBundle): Stock {
  const sym = pos.symbol.toUpperCase();
  const price = Number(bundle.price ?? pos.current_price ?? pos.avg_cost);
  const dayPct = Number(bundle.change_pct ?? pos.change_pct ?? 0);
  const qty = Number(pos.shares);
  const cost = Number(pos.avg_cost);
  const stop = Number(pos.stop_loss ?? cost * 0.92);
  const target = Number(pos.target ?? cost * 1.15);
  const lw = toLwSeries(bundle);

  const closes = lw.daily.map((b) => b.close);
  const candles = lw.daily.map((b, i) => ({
    i,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: lw.dailyVol[i]?.value ?? 0,
  }));

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);

  const value = price * qty;
  const totalCost = cost * qty;
  const totalPL = value - totalCost;
  const totalPct = totalCost ? (totalPL / totalCost) * 100 : 0;

  const signal = (bundle.signal ?? "BEKLE") as Stock["signal"];
  const components = bundle.signal_components ?? [];
  const signalSum = bundle.signal_sum ?? components.reduce((a, x) => a + x.val, 0);

  return {
    t: sym,
    name: pos.name || sym,
    price,
    dayPct,
    cost,
    qty,
    stop,
    target,
    signal,
    rsi: Math.round(Number(bundle.indicators?.rsi ?? 50)),
    sector: pos.sector ?? "Hisse",
    candles,
    closes,
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    value,
    totalCost,
    totalPL,
    totalPct,
    stopDist: price ? ((price - stop) / price) * 100 : 0,
    dayPL: value * (dayPct / (100 + dayPct)),
    logo: logoFor(sym),
    confidence: Math.round(Number(bundle.confidence ?? 0.5) * 100),
    note: pos.note || "",
    macd,
    closesFull: closes,
    bb: bollinger(closes, 20, 2),
    lw,
    signals: components,
    signalSum,
  };
}

/** Bundle alınamadığında pozisyon verisiyle minimum Stock (kısmi portföy render). */
export function buildStockFromPosition(pos: PositionInput): Stock {
  return buildStockFromMarket(pos, {
    symbol: pos.symbol.toUpperCase(),
    price: pos.current_price ?? pos.avg_cost,
    change_pct: pos.change_pct ?? 0,
  });
}

function patchLwLastPrice(lw: LwSeries, price: number): LwSeries {
  const patchBar = (bar: LwOhlc): LwOhlc => ({
    ...bar,
    close: price,
    high: Math.max(bar.high, price),
    low: Math.min(bar.low, price),
  });
  if (!lw.daily.length && !lw.intra.length) return lw;
  const daily = lw.daily.length ? [...lw.daily] : lw.daily;
  const intra = lw.intra.length ? [...lw.intra] : lw.intra;
  if (daily.length) daily[daily.length - 1] = patchBar(daily[daily.length - 1]);
  if (intra.length) intra[intra.length - 1] = patchBar(intra[intra.length - 1]);
  return { ...lw, daily, intra };
}

/** Canlı snapshot ile mevcut Stock'u günceller (fiyat, sinyal, RSI, P/L). */
export function mergeStockSnapshot(stock: Stock, snap: MarketSnapshot): Stock {
  const price = Number(snap.price);
  const dayPct = Number(snap.change_pct);
  const qty = stock.qty;
  const value = price * qty;
  const totalPL = value - stock.totalCost;
  const totalPct = stock.totalCost ? (totalPL / stock.totalCost) * 100 : 0;
  const signal = snap.signal as Stock["signal"];
  const signals = snap.signal_components ?? stock.signals;
  const signalSum = snap.signal_sum ?? signals.reduce((a, x) => a + x.val, 0);
  const rsi = Math.round(Number(snap.indicators?.rsi ?? stock.rsi));
  const confidence = Math.round(Number(snap.confidence ?? stock.confidence / 100) * 100);
  const lw = patchLwLastPrice(stock.lw, price);
  const closes = lw.daily.map((b) => b.close);
  const priceFlash: "pos" | "neg" | null =
    price > stock.price ? "pos" : price < stock.price ? "neg" : stock.priceFlash ?? null;
  const signalFlash = signal !== stock.signal ? signal : undefined;

  return {
    ...stock,
    price,
    dayPct,
    value,
    totalPL,
    totalPct,
    dayPL: value * (dayPct / (100 + dayPct)),
    stopDist: price ? ((price - stock.stop) / price) * 100 : stock.stopDist,
    signal,
    signals,
    signalSum,
    rsi,
    confidence,
    lw,
    closes,
    closesFull: closes,
    candles: lw.daily.map((b, i) => ({
      i,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
      volume: lw.dailyVol[i]?.value ?? 0,
    })),
    priceFlash,
    signalFlash,
  };
}

/** Portföy dışı semboller için izleme modu (Keşif → detay). */
export function buildWatchStockFromMarket(symbol: string, bundle: MarketBundle, name?: string): Stock | null {
  if (bundle.error || bundle.price == null) return null;
  return buildStockFromMarket(
    {
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      shares: 0,
      avg_cost: Number(bundle.price),
      sector: "Hisse",
    },
    bundle
  );
}
