import { create } from "zustand";
import {
  buildStockFromMarket,
  buildStockFromPosition,
  mergeStockSnapshot,
  type MarketBundle,
  type MarketSnapshot,
} from "../lib/stockFromMarket";
import { api } from "../services/api";
import type { PortfolioSummary, Stock, TradeSignal } from "../types";

interface PortfolioState {
  stocks: Stock[];
  summary: PortfolioSummary | null;
  tradeSignals: TradeSignal[];
  bundleWarnings: string[];
  wsConnected: boolean;
  loading: boolean;
  loadError: string | null;
  load: () => Promise<void>;
  refreshMarket: () => Promise<void>;
  applyMarketUpdate: (
    snapshots: Record<string, MarketSnapshot | Record<string, unknown>>,
    tradeSignals?: TradeSignal[]
  ) => void;
  setWsConnected: (v: boolean) => void;
}

function buildSummary(
  stocks: Stock[],
  cash: number,
  dayPl?: number,
  dayPct?: number,
  pendingOrders = 0
): PortfolioSummary {
  const invested = stocks.reduce((a, s) => a + s.value, 0);
  const totalCost = stocks.reduce((a, s) => a + s.totalCost, 0);
  const dayPL = dayPl ?? stocks.reduce((a, s) => a + s.dayPL, 0);
  const totalValue = invested + cash;
  return {
    totalValue,
    invested,
    cash,
    pendingOrders,
    totalCost,
    totalReturn: invested - totalCost,
    totalReturnPct: totalCost ? ((invested - totalCost) / totalCost) * 100 : 0,
    dayPL,
    dayPct: dayPct ?? (totalValue - dayPL ? (dayPL / (totalValue - dayPL)) * 100 : 0),
  };
}

function parseSnapshots(raw: Record<string, unknown>): Record<string, MarketSnapshot> {
  const out: Record<string, MarketSnapshot> = {};
  for (const [sym, val] of Object.entries(raw)) {
    const s = val as Record<string, unknown>;
    if (s.error) continue;
    out[sym] = {
      symbol: sym,
      price: Number(s.price),
      change_pct: Number(s.change_pct ?? 0),
      signal: String(s.signal ?? "BEKLE"),
      confidence: s.confidence != null ? Number(s.confidence) : undefined,
      signal_components: (s.signal_components as MarketSnapshot["signal_components"]) ?? [],
      signal_sum: Number(s.signal_sum ?? 0),
      indicators: s.indicators as MarketSnapshot["indicators"],
    };
  }
  return out;
}

function positionInput(pos: Record<string, unknown>) {
  return {
    symbol: String(pos.symbol),
    name: String(pos.name || pos.symbol),
    shares: Number(pos.shares),
    avg_cost: Number(pos.avg_cost),
    stop_loss: Number(pos.stop_loss) || undefined,
    target: Number(pos.target) || undefined,
    sector: String(pos.sector || "Hisse"),
    change_pct: Number(pos.change_pct) || undefined,
    current_price: Number(pos.current_price) || undefined,
    note: String(pos.note || ""),
  };
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  stocks: [],
  summary: null,
  tradeSignals: [],
  bundleWarnings: [],
  wsConnected: false,
  loading: false,
  loadError: null,

  load: async () => {
    set({ loading: true, loadError: null, bundleWarnings: [] });
    try {
      const portfolio = await api.getPortfolio();
      const positions = (portfolio.positions as Record<string, unknown>[]) || [];
      const cash = Number(portfolio.cash_usd) || 0;
      const pendingOrders = ((portfolio.pending_orders as { price?: number; shares?: number }[]) || []).reduce(
        (sum, o) => sum + Number(o.price ?? 0) * Number(o.shares ?? 0),
        0
      );
      const symbols = positions.map((p) => String(p.symbol));

      const [summaryRes, tradeRes] = await Promise.all([
        api.getSummary().catch(() => null),
        symbols.length
          ? api.getTradeSignalsPortfolio().catch(() => ({ signals: [], count: 0 }))
          : Promise.resolve({ signals: [], count: 0 }),
      ]);

      let bundles: Record<string, MarketBundle> = {};
      if (symbols.length) {
        try {
          const bundlesRes = await api.getMarketBundles(symbols);
          bundles = (bundlesRes.bundles ?? {}) as Record<string, MarketBundle>;
        } catch {
          const entries = await Promise.all(
            symbols.map(async (sym) => {
              try {
                const bundle = await api.getMarketBundle(sym);
                return [sym.toUpperCase(), bundle] as const;
              } catch {
                return [sym.toUpperCase(), { symbol: sym.toUpperCase(), error: "piyasa verisi alınamadı" }] as const;
              }
            })
          );
          bundles = Object.fromEntries(entries);
        }
      }
      const bundleWarnings: string[] = [];

      const stocks: Stock[] = positions.map((pos) => {
        const sym = String(pos.symbol);
        const input = positionInput(pos);
        const bundle = bundles[sym];
        if (!bundle || bundle.error) {
          if (symbols.length) {
            bundleWarnings.push(
              bundle?.error ? `${sym}: ${bundle.error}` : `${sym}: piyasa verisi alınamadı`
            );
          }
          return buildStockFromPosition(input);
        }
        return buildStockFromMarket(input, bundle);
      });

      const summary = summaryRes
        ? {
            totalValue: Number(summaryRes.total_market_value),
            invested: Number(summaryRes.total_cost_basis),
            cash: Number(summaryRes.cash_usd),
            pendingOrders,
            totalCost: Number(summaryRes.total_cost_basis),
            totalReturn: Number(summaryRes.total_unrealized_pl),
            totalReturnPct: Number(summaryRes.total_unrealized_pl_pct),
            dayPL: Number(summaryRes.day_pl ?? stocks.reduce((a, s) => a + s.dayPL, 0)),
            dayPct: Number(summaryRes.day_pl_pct ?? 0),
          }
        : buildSummary(stocks, cash, undefined, undefined, pendingOrders);

      set({ stocks, summary, tradeSignals: tradeRes.signals, bundleWarnings, loadError: null });
    } catch (e) {
      set({
        stocks: [],
        summary: null,
        tradeSignals: [],
        bundleWarnings: [],
        loadError: e instanceof Error ? e.message : "Portföy yüklenemedi.",
      });
    } finally {
      set({ loading: false });
    }
  },

  refreshMarket: async () => {
    const symbols = get().stocks.map((s) => s.t);
    if (!symbols.length) return;
    try {
      const [snapRes, tradeRes] = await Promise.all([
        api.getMarketSnapshots(symbols),
        api.getTradeSignalsPortfolio().catch(() => ({ signals: get().tradeSignals, count: 0 })),
      ]);
      get().applyMarketUpdate(parseSnapshots(snapRes.snapshots as Record<string, unknown>), tradeRes.signals);
    } catch {
      /* sessiz */
    }
  },

  applyMarketUpdate: (rawSnapshots, tradeSignals) => {
    const snapshots = parseSnapshots(rawSnapshots as Record<string, unknown>);
    const flashedPrice: string[] = [];
    const flashedSignal: string[] = [];
    const stocks = get().stocks.map((s) => {
      const snap = snapshots[s.t];
      if (!snap || snap.error) return s;
      const prevSignal = s.signal;
      const merged = mergeStockSnapshot(s, snap);
      if (merged.priceFlash) flashedPrice.push(s.t);
      if (merged.signal !== prevSignal) flashedSignal.push(s.t);
      return merged;
    });
    const prevSummary = get().summary;
    const cash = prevSummary?.cash ?? 0;
    const pending = prevSummary?.pendingOrders ?? 0;
    const rebuilt = buildSummary(stocks, cash, undefined, undefined, pending);
    const summary = prevSummary
      ? { ...rebuilt, dayPL: prevSummary.dayPL, dayPct: prevSummary.dayPct, pendingOrders: pending }
      : rebuilt;
    set({
      stocks,
      summary,
      ...(tradeSignals ? { tradeSignals } : {}),
    });
    if (flashedPrice.length || flashedSignal.length) {
      window.setTimeout(() => {
        set((state) => ({
          stocks: state.stocks.map((st) =>
            flashedPrice.includes(st.t) || flashedSignal.includes(st.t)
              ? { ...st, priceFlash: null, signalFlash: undefined }
              : st
          ),
        }));
      }, 800);
    }
  },

  setWsConnected: (wsConnected) => set({ wsConnected }),
}));
