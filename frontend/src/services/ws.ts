type PriceHandler = (data: Record<string, { price: number; change_pct: number }>) => void;

let socket: WebSocket | null = null;

export function connectPrices(onData: PriceHandler): () => void {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const url = `${proto}://${location.host}/ws/prices`;
  try {
    socket = new WebSocket(url);
    socket.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "prices" && msg.data) onData(msg.data);
      } catch {
        /* yoksay */
      }
    };
  } catch {
    /* backend kapalı */
  }
  return () => {
    socket?.close();
    socket = null;
  };
}
