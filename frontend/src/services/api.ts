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

export type EngineStrategy = {
  id: string;
  name: string;
  desc: string;
  active: boolean;
  win_rate: number;
  trades: number;
};

export type EngineTrade = {
  symbol: string;
  side: string;
  qty: number;
  entry: number;
  current: number;
  pnl_pct: number;
  status: string;
  strategy: string;
};

export type EngineFeedItem = {
  time: string;
  symbol: string;
  message: string;
  tone: string;
};

export type PortfolioAdviceItem = {
  symbol: string;
  name?: string;
  shares?: number;
  avg_cost?: number;
  price?: number;
  change_pct?: number;
  pnl_pct?: number;
  current_stop?: number | null;
  current_target?: number | null;
  suggested_stop?: number;
  suggested_target?: number;
  stop_reason?: string;
  target_reason?: string;
  stop_needs_update?: boolean;
  target_needs_update?: boolean;
  trade_decision?: string;
  trade_score?: number;
  trade_confidence?: string;
  technical_signal?: string;
  news_count?: number;
  notes?: string[];
  priority?: string;
  error?: string;
};

export type PortfolioAdvice = {
  generated_at: string;
  position_count: number;
  needs_action: number;
  high_priority: number;
  positions: PortfolioAdviceItem[];
};

export type EngineStatus = {
  running: boolean;
  mode: string;
  active_strategies: number;
  metrics: {
    total_return_pct: number;
    win_rate: number;
    open_positions: number;
    max_positions: number;
    risk_per_trade: number;
    sharpe: number;
    wins: number;
    trade_count: number;
  };
};

export type AppConfig = {
  llm_provider: string;
  notifications: Record<string, boolean>;
  scheduler: {
    morning: string;
    close: string;
    morning_on: boolean;
    close_on: boolean;
  };
  preferences: { currency: string; timezone: string };
  integrations?: Record<string, boolean>;
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

export type ChatSession = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
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
    request<
      {
        title: string;
        url: string;
        published_at: string;
        fetched_at?: string;
        source?: string;
        provider?: string;
        sentiment?: string;
      }[]
    >(`/api/news/${symbol}`),

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

  listChats: () => request<{ sessions: ChatSession[] }>("/api/chats"),

  createChat: (title?: string) =>
    request<{ id: string; title: string; created_at: string; updated_at: string }>("/api/chats", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  getChat: (id: string) =>
    request<{ id: string; title: string; created_at: string; updated_at: string; messages: ChatMessage[] }>(
      `/api/chats/${encodeURIComponent(id)}`
    ),

  addChatMessage: (id: string, role: "user" | "assistant", content: string) =>
    request<ChatMessage>(`/api/chats/${encodeURIComponent(id)}/messages`, {
      method: "POST",
      body: JSON.stringify({ role, content }),
    }),

  deleteChat: (id: string) =>
    request<{ ok: boolean }>(`/api/chats/${encodeURIComponent(id)}`, {
      method: "DELETE",
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

  getDocsLocalEnv: () => request<{ markdown: string }>("/api/docs/local-env"),

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

  getEngineStatus: () => request<EngineStatus>("/api/engine/status"),

  toggleEngine: () => request<{ running: boolean }>("/api/engine/toggle", { method: "POST" }),

  updateEngineConfig: (body: {
    mode?: string;
    risk_per_trade?: number;
    max_positions?: number;
    auto_telegram?: boolean;
  }) => request<{ ok: boolean }>("/api/engine/config", { method: "PUT", body: JSON.stringify(body) }),

  getEngineStrategies: () => request<{ strategies: EngineStrategy[] }>("/api/engine/strategies"),

  setEngineStrategy: (id: string, active: boolean) =>
    request<{ ok: boolean }>(`/api/engine/strategy/${id}`, {
      method: "PUT",
      body: JSON.stringify({ active }),
    }),

  getEngineTrades: () => request<{ trades: EngineTrade[] }>("/api/engine/trades"),

  getEngineEquity: (days = 90) =>
    request<{ equity: { time: string; value: number }[] }>(`/api/engine/equity?days=${days}`),

  getEngineFeed: () => request<{ feed: EngineFeedItem[] }>("/api/engine/feed"),

  getPortfolioAdvice: () => request<PortfolioAdvice>("/api/engine/portfolio-advice"),

  applyPortfolioAdvice: (symbols?: string[]) =>
    request<{ ok: boolean; applied: Record<string, unknown>[] }>("/api/engine/portfolio-advice/apply", {
      method: "POST",
      body: JSON.stringify(symbols ? { symbols } : {}),
    }),

  getAppConfig: () => request<AppConfig>("/api/config"),

  setLlmProvider: (provider: string) =>
    request<{ ok: boolean }>("/api/config/llm", { method: "PUT", body: JSON.stringify({ provider }) }),

  setNotifications: (body: Record<string, boolean>) =>
    request<{ ok: boolean }>("/api/config/notifications", { method: "PUT", body: JSON.stringify(body) }),

  setScheduler: (body: Record<string, string | boolean>) =>
    request<{ ok: boolean }>("/api/config/scheduler", { method: "PUT", body: JSON.stringify(body) }),

  setPreferences: (body: Record<string, string>) =>
    request<{ ok: boolean }>("/api/config/preferences", { method: "PUT", body: JSON.stringify(body) }),

  testIntegration: (service: string) =>
    request<{ ok: boolean; message: string }>(`/api/config/integrations/test/${service}`, { method: "POST" }),

  refreshSymbols: () =>
    request<{ ok: boolean; count?: number }>("/api/symbols/refresh", { method: "POST" }),
};
