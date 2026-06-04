import type { MarketSnapshot } from "../lib/stockFromMarket";
import type { TradeSignal } from "../types";

export type MarketWsPayload = {
  type: "market";
  data: Record<string, MarketSnapshot>;
  trade_signals: TradeSignal[];
  market_open: boolean;
};

type MarketHandler = (payload: MarketWsPayload) => void;

type WsHandlers = {
  onMarket: MarketHandler;
  onConnected?: (connected: boolean) => void;
  onFallback?: () => void;
};

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;
let stopped = false;

const RECONNECT_MS = 5000;
const FALLBACK_MS = 60000;

function clearTimers() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (fallbackTimer) {
    clearInterval(fallbackTimer);
    fallbackTimer = null;
  }
}

function parseMarketPayload(msg: Record<string, unknown>): MarketWsPayload | null {
  if (msg.type !== "market" || !msg.data) return null;
  return msg as unknown as MarketWsPayload;
}

function connectOnce(handlers: WsHandlers): void {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/ws/prices`;

  try {
    socket = new WebSocket(url);
  } catch {
    handlers.onConnected?.(false);
    scheduleReconnect(handlers);
    return;
  }

  socket.onopen = () => {
    handlers.onConnected?.(true);
  };

  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data) as Record<string, unknown>;
      if (msg.type === "heartbeat") {
        handlers.onConnected?.(true);
        return;
      }
      const market = parseMarketPayload(msg);
      if (market) {
        handlers.onConnected?.(true);
        handlers.onMarket(market);
        return;
      }
      if (msg.type === "prices" && msg.data) {
        handlers.onConnected?.(true);
        const data = msg.data as Record<string, { price: number; change_pct: number }>;
        const snapshots: Record<string, MarketSnapshot> = {};
        for (const [sym, p] of Object.entries(data)) {
          snapshots[sym] = {
            symbol: sym,
            price: p.price,
            change_pct: p.change_pct,
            signal: "BEKLE",
            signal_components: [],
            signal_sum: 0,
          };
        }
        handlers.onMarket({
          type: "market",
          data: snapshots,
          trade_signals: [],
          market_open: Boolean(msg.market_open),
        });
      }
    } catch {
      /* yoksay */
    }
  };

  socket.onerror = () => {
    handlers.onConnected?.(false);
  };

  socket.onclose = () => {
    socket = null;
    handlers.onConnected?.(false);
    if (!stopped) scheduleReconnect(handlers);
  };
}

function scheduleReconnect(handlers: WsHandlers) {
  if (stopped || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!stopped) connectOnce(handlers);
  }, RECONNECT_MS);
}

export function connectMarketStream(
  onMarket: MarketHandler,
  opts?: { onConnected?: (connected: boolean) => void; onFallback?: () => void }
): () => void {
  stopped = false;
  const handlers: WsHandlers = {
    onMarket,
    onConnected: opts?.onConnected,
    onFallback: opts?.onFallback,
  };

  connectOnce(handlers);

  if (opts?.onFallback) {
    fallbackTimer = setInterval(() => {
      if (stopped) return;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        opts.onFallback?.();
      }
    }, FALLBACK_MS);
  }

  return () => {
    stopped = true;
    clearTimers();
    socket?.close();
    socket = null;
    opts?.onConnected?.(false);
  };
}
