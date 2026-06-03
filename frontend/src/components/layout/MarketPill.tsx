import { useEffect, useState } from "react";

export function MarketPill() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours();
  const open = h >= 16 && h < 23;
  const time = now.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return (
    <div className={`market-pill ${open ? "open" : "closed"}`}>
      <span className="dot" />
      <span className="label">{open ? "NYSE AÇIK" : "NYSE KAPALI"}</span>
      <span className="time">{time}</span>
    </div>
  );
}
