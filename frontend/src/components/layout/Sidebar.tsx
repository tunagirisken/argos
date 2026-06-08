import { useNavigate, useLocation } from "react-router-dom";
import { ArgosCube } from "../brand/ArgosCube";
import { Icon } from "../icons/Icon";
import { usePortfolioStore } from "../../store/portfolioStore";

const NAV = [
  { id: "dashboard", path: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { id: "stocks", path: "/stock", icon: "stocks", label: "Hisseler" },
  { id: "ai", path: "/ai", icon: "ai", label: "AI Analiz" },
  { id: "discovery", path: "/discovery", icon: "target", label: "Keşif Motoru" },
  { id: "trade", path: "/trade", icon: "spark", label: "Otomatik Motor" },
  { id: "alarms", path: "/alarms", icon: "bell", label: "Alarmlar" },
  { id: "docs", path: "/docs", icon: "docs", label: "Dokümantasyon" },
  { id: "settings", path: "/settings", icon: "settings", label: "Ayarlar" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const wsConnected = usePortfolioStore((s) => s.wsConnected);
  const stocks = usePortfolioStore((s) => s.stocks);
  const base = location.pathname.split("/")[1] || "dashboard";

  const stocksPath = stocks[0] ? `/stock/${stocks[0].t}` : "/dashboard";

  return (
    <aside className="sidebar">
      <div
        className="sidebar__logo glow-accent"
        onClick={() => navigate("/dashboard")}
        title="ARGOS"
        role="button"
        tabIndex={0}
      >
        <ArgosCube size={20} />
      </div>
      <nav className="sidebar__nav">
        {NAV.map((n) => {
          const active = base === n.id || (base === "stock" && n.id === "stocks");
          return (
            <button
              key={n.id}
              type="button"
              className={`nav-item${active ? " active" : ""}`}
              onClick={() => navigate(n.id === "stocks" ? stocksPath : n.path)}
            >
              <Icon name={n.icon} />
              <span className="nav-tooltip">{n.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="nav-item" style={{ cursor: "default" }} title={wsConnected ? "Canlı bağlı" : "Bağlantı bekleniyor"}>
        <span
          style={{
            position: "relative",
            display: "grid",
            placeItems: "center",
            width: 10,
            height: 10,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: wsConnected ? "var(--positive)" : "var(--text-muted)",
              boxShadow: wsConnected ? "0 0 8px var(--positive)" : "none",
              animation: wsConnected ? "pulse-dot 2s infinite" : "none",
            }}
          />
        </span>
        <span className="nav-tooltip">
          {wsConnected ? "Canlı · WebSocket bağlı" : "WebSocket bekleniyor"}
        </span>
      </div>
    </aside>
  );
}
