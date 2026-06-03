import { create } from "zustand";
import { FIXTURE_STOCKS, enrichStock } from "../fixtures/stocks";
import { api } from "../services/api";
import type { PortfolioSummary, Stock } from "../types";

interface PortfolioState {
  stocks: Stock[];
  summary: PortfolioSummary | null;
  wsConnected: boolean;
  loading: boolean;
  load: () => Promise<void>;
  applyWsPrices: (prices: Record<string, { price: number; change_pct: number }>) => void;
  setWsConnected: (v: boolean) => void;
}

function buildSummary(stocks: Stock[], cash: number): PortfolioSummary {
  const invested = stocks.reduce((a, s) => a + s.value, 0);
  const totalCost = stocks.reduce((a, s) => a + s.totalCost, 0);
  const dayPL = stocks.reduce((a, s) => a + s.dayPL, 0);
  const totalValue = invested + cash;
  return {
    totalValue,
    invested,
    cash,
    pendingOrders: 0,
    totalCost,
    totalReturn: invested - totalCost,
    totalReturnPct: totalCost ? ((invested - totalCost) / totalCost) * 100 : 0,
    dayPL,
    dayPct: totalValue - dayPL ? (dayPL / (totalValue - dayPL)) * 100 : 0,
  };
}

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  stocks: FIXTURE_STOCKS,
  summary: buildSummary(FIXTURE_STOCKS, 226),
  wsConnected: false,
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const [portfolio, prices, summaryRes] = await Promise.all([
        api.getPortfolio(),
        api.getPrices().catch(() => ({})),
        api.getSummary().catch(() => null),
      ]);

      const positions = (portfolio.positions as Record<string, unknown>[]) || [];
      const cash = Number(portfolio.cash_usd) || 0;

      const stocks: Stock[] = positions.map((pos) => {
        const sym = String(pos.symbol);
        const pd = (prices as Record<string, { price: number; change_pct: number }>)[sym];
        return enrichStock({
          t: sym,
          name: String(pos.name || sym),
          price: pd?.price ?? Number(pos.current_price) ?? Number(pos.avg_cost),
          dayPct: pd?.change_pct ?? Number(pos.change_pct) ?? 0,
          cost: Number(pos.avg_cost),
          qty: Number(pos.shares),
          stop: Number(pos.stop_loss) || Number(pos.avg_cost) * 0.92,
          target: Number(pos.target) || Number(pos.avg_cost) * 1.15,
          signal: "BEKLE",
          rsi: 50,
        });
      });

      const summary = summaryRes
        ? {
            totalValue: Number(summaryRes.total_market_value),
            invested: Number(summaryRes.total_cost_basis),
            cash: Number(summaryRes.cash_usd),
            pendingOrders: 0,
            totalCost: Number(summaryRes.total_cost_basis),
            totalReturn: Number(summaryRes.total_unrealized_pl),
            totalReturnPct: Number(summaryRes.total_unrealized_pl_pct),
            dayPL: stocks.reduce((a, s) => a + s.dayPL, 0),
            dayPct: 0,
          }
        : buildSummary(stocks, cash);

      set({ stocks, summary });
    } catch {
      set({
        stocks: FIXTURE_STOCKS,
        summary: buildSummary(FIXTURE_STOCKS, 226),
      });
    } finally {
      set({ loading: false });
    }
  },

  applyWsPrices: (prices) => {
    const stocks = get().stocks.map((s) => {
      const p = prices[s.t];
      if (!p) return s;
      const price = p.price;
      const dayPct = p.change_pct;
      const value = price * s.qty;
      const totalPL = value - s.totalCost;
      const totalPct = (totalPL / s.totalCost) * 100;
      return {
        ...s,
        price,
        dayPct,
        value,
        totalPL,
        totalPct,
        dayPL: value * (dayPct / (100 + dayPct)),
        stopDist: ((price - s.stop) / price) * 100,
      };
    });
    const cash = get().summary?.cash ?? 0;
    set({ stocks, summary: buildSummary(stocks, cash) });
  },

  setWsConnected: (wsConnected) => set({ wsConnected }),
}));
