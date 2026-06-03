import type { Candle } from "./lib/indicators";

export type SignalType = "AL" | "SAT" | "BEKLE" | "GÜÇLÜ AL" | "GÜÇLÜ SAT";

export interface Stock {
  t: string;
  name: string;
  price: number;
  dayPct: number;
  cost: number;
  qty: number;
  stop: number;
  target: number;
  signal: SignalType | string;
  rsi: number;
  sector: string;
  candles: Candle[];
  closes: number[];
  ema20: number[];
  ema50: number[];
  ema200: number[];
  value: number;
  totalCost: number;
  totalPL: number;
  totalPct: number;
  stopDist: number;
  dayPL: number;
  logo: string;
  confidence: number;
  macd: number[];
  closesFull: number[];
  bb: ReturnType<typeof import("./lib/indicators").bollinger>;
}

export interface PortfolioSummary {
  totalValue: number;
  invested: number;
  cash: number;
  pendingOrders: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPct: number;
  dayPL: number;
  dayPct: number;
}

export interface NewsItem {
  title: string;
  url?: string;
  published_at?: string;
  src?: string;
  min?: number;
  sentiment?: "pos" | "neg" | "neu";
}

export interface AlarmRow {
  id: string | number;
  ticker: string;
  type: string;
  level: number;
  current: number;
  status: string;
}
