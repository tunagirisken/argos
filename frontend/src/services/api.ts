const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  setupStatus: () =>
    request<{
      setup_complete: boolean;
      has_env: boolean;
      has_portfolio: boolean;
    }>("/api/setup/status"),

  setupEnv: (body: Record<string, string | undefined>) =>
    request<{ ok: boolean }>("/api/setup/env", {
      method: "POST",
      body: JSON.stringify({
        anthropic_api_key: body.anthropic,
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

  getPortfolio: () => request<Record<string, unknown>>("/api/portfolio"),

  getSummary: () => request<Record<string, unknown>>("/api/portfolio/summary"),

  getPrices: () =>
    request<Record<string, { price: number; change_pct: number }>>("/api/prices/all"),

  getSignal: (symbol: string) =>
    request<{
      signal: string;
      confidence: number;
      reasons: string[];
      risk_level: string;
    }>(`/api/technical/${symbol}/signal`),

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
};
