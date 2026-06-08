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
  priceFlash?: "pos" | "neg" | null;
  signalFlash?: string;
  note?: string;
  closesFull: number[];
  bb: ReturnType<typeof import("./lib/indicators").bollinger>;
  lw: import("./lib/lwc").LwSeries;
  signals: SignalIndicator[];
  signalSum: number;
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
  fetched_at?: string;
  source?: string;
  provider?: string;
  src?: string;
  min?: number;
  sentiment?: "pos" | "neg" | "neu" | string;
}

export type SignalIndicator = {
  key: string;
  val: number;
  note: string;
};

export type TradeDecision = "AL" | "SAT" | "İZLE";

export interface TradeSignal {
  symbol: string;
  score: number;
  score_display: number;
  decision: TradeDecision;
  components: Record<string, number>;
  confidence: string;
  tech_sum?: number;
  news_score?: number;
  price?: number;
  last_decision?: string | null;
  position?: { avg_cost: number; return_pct: number };
}

export interface AlarmRow {
  id: string | number;
  ticker: string;
  type: string;
  level: number;
  current: number;
  status: string;
}
