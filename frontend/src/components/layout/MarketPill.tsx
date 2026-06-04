import { useEffect, useState } from "react";
import { api } from "../../services/api";

export function MarketPill() {
  const [now, setNow] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("NYSE KAPALI");

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const st = await api.getMarketHours();
        if (!cancelled) {
          setOpen(st.open);
          setLabel(st.label);
        }
      } catch {
        /* sessiz — yerel saat gösterilir */
      }
    };
    refresh();
    const poll = setInterval(refresh, 60000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  const time = now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className={`market-pill ${open ? "open" : "closed"}`}>
      <span className="dot" />
      <span className="label">{label}</span>
      <span className="time">{time}</span>
    </div>
  );
}
