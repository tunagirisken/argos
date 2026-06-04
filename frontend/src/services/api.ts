import { getAuthToken } from "../store/authStore";
import type { TradeSignal } from "../types";

const BASE = "";

function headers(extra?: HeadersInit): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) h.Authorization = `Bearer ${token}`;
  if (extra) {
    const e = extra as Record<string, string>;
    Object.assign(h, e);
  }
  return h;
}

export type SymbolSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  match?: string;
};

export type DiscoveryOpportunity = {
  symbol: string;
  name: string;
  sector: string;
  score: number;
  decision_horizon: string;
  breakdown: Record<string, number>;
  current_price: number;
  entry_zone: string;
  thesis: string;
  main_risk: string;
  news_count: number;
  disclaimer: string;
};

export type DiscoveryReport = {
  generated_at: string;
  scanned_count: number;
  prefilter_count?: number;
  opportunities: DiscoveryOpportunity[];
  disclaimer: string;
};

export type AnalystTarget = {
  symbol: string;
  source: string;
  current_price?: number;
  target_mean?: number;
  target_high?: number;
  target_low?: number;
  analyst_count?: number;
  recommendation?: string;
  recommended_target?: number;
  confidence: string;
  web?: { source: string; target_mean: number; samples: number; urls?: string[] };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: headers(init?.headers as HeadersInit),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  authLogin: (username: string, password: string) =>
    request<{
      token: string;
      user: { username: string; is_admin: boolean };
      bootstrap_applied?: boolean;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  authRegister: (username: string, password: string) =>
    request<{ token: string; user: { username: string; is_admin: boolean } }>(
      "/api/auth/register",
      { method: "POST", body: JSON.stringify({ username, password }) }
    ),

  authMe: () =>
    request<{ username: string; is_admin: boolean }>("/api/auth/me"),

  authLogout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),

  setupStatus: () =>
    request<{
      setup_complete: boolean;
      has_env: boolean;
      has_portfolio: boolean;
    }>("/api/setup/status"),

  setupIntegrations: () =>
    request<{
      llm: boolean;
      telegram: boolean;
      firecrawl: boolean;
      exa: boolean;
      sentry: boolean;
    }>("/api/setup/integrations"),

  setupEnv: (body: Record<string, string | undefined>) =>
    request<{ ok: boolean }>("/api/setup/env", {
      method: "POST",
      body: JSON.stringify({
        llm_provider: body.llmProvider || "gemini",
        anthropic_api_key: body.anthropic || null,
        gemini_api_key: body.gemini || null,
        telegram_bot_token: body.botToken,
        telegram_chat_id: body.chatId,
        firecrawl_api_key: body.firecrawl || null,
        exa_api_key: body.exa || null,
        sentry_dsn: body.sentry || null,
      }),
    }),

  setupPortfolio: (body: unknown) =>
    request<{ ok: boolean }>("/api/setup/portfolio", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  setupComplete: () =>
    request<{ ok: boolean }>("/api/setup/complete", { method: "POST" }),

  setupReset: () =>
    request<{ ok: boolean }>("/api/setup/reset", { method: "DELETE" }),

  searchSymbols: (q: string, limit = 40) =>
    request<{ query: string; results: SymbolSearchResult[]; total: number }>(
      `/api/symbols/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),

  getMarketHours: () =>
    request<{ open: boolean; label: string; local_time: string; timezone: string }>(
      "/api/market/hours"
    ),

  getPortfolio: () => request<Record<string, unknown>>("/api/portfolio"),

  addPosition: (body: {
    symbol: string;
    name?: string;
    shares: number;
    avg_cost: number;
    stop_loss?: number;
    target?: number;
    note?: string;
  }) =>
    request<{ ok: boolean; symbol: string; stop_loss?: number; target?: number }>(
      "/api/portfolio/position",
      { method: "POST", body: JSON.stringify(body) }
    ),

  deletePosition: (symbol: string) =>
    request<{ ok: boolean }>(`/api/portfolio/position/${encodeURIComponent(symbol)}`, {
      method: "DELETE",
    }),

  getSummary: () => request<Record<string, unknown>>("/api/portfolio/summary"),

  getPrices: () =>
    request<Record<string, { price: number; change_pct: number }>>("/api/prices/all"),

  getChartSeries: (symbol: string) =>
    request<{
      symbol: string;
      daily: { time: string; open: number; high: number; low: number; close: number }[];
      dailyVol: { time: string; value: number; color?: string }[];
      intra: { time: number; open: number; high: number; low: number; close: number }[];
      intraVol: { time: number; value: number; color?: string }[];
    }>(`/api/prices/${encodeURIComponent(symbol)}/chart`),

  getMarketBundle: (symbol: string) =>
    request<import("../lib/stockFromMarket").MarketBundle>(
      `/api/market/${encodeURIComponent(symbol)}/bundle`
    ),

  getMarketSnapshots: (symbols: string[]) =>
    request<{ snapshots: Record<string, import("../lib/stockFromMarket").MarketSnapshot> }>(
      "/api/market/snapshot",
      { method: "POST", body: JSON.stringify({ symbols }) }
    ),

  getMarketBundles: (symbols: string[]) =>
    request<{ bundles: Record<string, import("../lib/stockFromMarket").MarketBundle> }>(
      "/api/market/bundle",
      { method: "POST", body: JSON.stringify({ symbols }) }
    ),

  getSignal: (symbol: string) =>
    request<{
      signal: string;
      confidence: number;
      reasons: string[];
      risk_level: string;
    }>(`/api/technical/${symbol}/signal`),

  getTechnical: (symbol: string) =>
    request<{ rsi?: number; price?: number; macd?: number; macd_signal?: number }>(
      `/api/technical/${symbol}`
    ),

  getTradeSignal: (symbol: string) =>
    request<TradeSignal>(`/api/analysis/trade-signal/${symbol}`),

  getTradeSignalsPortfolio: () =>
    request<{ signals: TradeSignal[]; count: number }>("/api/analysis/trade-signals/portfolio"),

  getNews: (symbol: string) =>
    request<{ title: string; url: string; published_at: string }[]>(
      `/api/news/${symbol}`
    ),

  getAlerts: () => request<Record<string, unknown>[]>("/api/alerts"),

  createAlert: (body: unknown) =>
    request<unknown>("/api/alerts", { method: "POST", body: JSON.stringify(body) }),

  deleteAlert: (id: string) =>
    request<{ ok: boolean }>(`/api/alerts/${id}`, { method: "DELETE" }),

  getAlertLog: () => request<Record<string, unknown>[]>("/api/alerts/log"),

  analysisChat: (message: string) =>
    request<{ response: string }>("/api/analysis/chat", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  updatePosition: (symbol: string, body: Record<string, unknown>) =>
    request<{ ok: boolean }>(`/api/portfolio/position/${symbol}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  getDocsTelegram: () =>
    request<{ commands: { command: string; description: string; example: string }[]; markdown: string }>(
      "/api/docs/telegram"
    ),

  getDocsTargets: () => request<{ markdown: string }>("/api/docs/targets"),

  getAnalystTarget: (symbol: string) =>
    request<AnalystTarget>(`/api/portfolio/targets/${symbol}`),

  syncTargets: () =>
    request<{
      ok: boolean;
      results: {
        symbol: string;
        old_target: number | null;
        new_target: number | null;
        confidence: string;
        applied: boolean;
      }[];
    }>("/api/portfolio/sync-targets", { method: "POST" }),

  getPortfolioNews: () =>
    request<Record<string, { title: string; url: string; published_at: string }[]>>(
      "/api/news/portfolio"
    ),

  analyzePortfolio: () =>
    request<{ analysis: string; telegram_sent: boolean }>("/api/analysis/portfolio", {
      method: "POST",
    }),

  analyzeSymbol: (symbol: string) =>
    request<{ symbol: string; analysis: string }>(`/api/analysis/${encodeURIComponent(symbol)}`),

  getDiscoveryLatest: () =>
    request<DiscoveryReport>("/api/discovery/latest"),

  runDiscoveryScan: (opts?: { force?: boolean; sendTelegram?: boolean }) =>
    request<DiscoveryReport & { ok: boolean; telegram_sent: boolean }>("/api/discovery/scan", {
      method: "POST",
      body: JSON.stringify({
        force: opts?.force ?? false,
        send_telegram: opts?.sendTelegram ?? false,
      }),
    }),
};
