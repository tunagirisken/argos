// ============================================================
// ARGOS — Shell: Sidebar + Header
// ============================================================
const NAV = [
  { id: "dashboard", icon: "dashboard", label: "Dashboard" },
  { id: "stocks", icon: "stocks", label: "Hisseler" },
  { id: "ai", icon: "ai", label: "AI Analiz" },
  { id: "trade", icon: "spark", label: "İşlem Motoru" },
  { id: "alarms", icon: "bell", label: "Alarmlar" },
  { id: "docs", icon: "docs", label: "Dokümantasyon" },
  { id: "settings", icon: "settings", label: "Ayarlar" },
];

function Sidebar({ route, onNav }) {
  const base = route.split(":")[0];
  return (
    <aside className="sidebar">
      <div className="sidebar__logo glow-accent" onClick={() => onNav("dashboard")} title="ARGOS">
        <span style={{ color: "var(--t-accent)" }}><Icon name="eye" size={24} /></span>
      </div>
      <nav className="sidebar__nav">
        {NAV.map((n) => (
          <button key={n.id}
            className={"nav-item" + (base === n.id || (base === "stock" && n.id === "stocks") ? " active" : "")}
            onClick={() => onNav(n.id)}>
            <Icon name={n.icon} />
            <span className="nav-tooltip">{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="nav-item" style={{ cursor: "default" }} title="Bağlı">
        <span style={{ position: "relative", display: "grid", placeItems: "center", width: 10, height: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--positive)", boxShadow: "0 0 8px var(--positive)", animation: "pulse-dot 2s infinite" }} />
        </span>
        <span className="nav-tooltip">Canlı · WebSocket bağlı</span>
      </div>
    </aside>
  );
}

function MarketPill() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  // NYSE 16:30–23:00 TR saati civarı; demo için saate göre
  const h = now.getHours();
  const open = h >= 16 && h < 23;
  const time = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return (
    <div className={"market-pill " + (open ? "open" : "closed")}>
      <span className="dot" />
      <span className="label">{open ? "NYSE AÇIK" : "NYSE KAPALI"}</span>
      <span className="time">{time}</span>
    </div>
  );
}

const TITLES = {
  dashboard: "Genel Bakış",
  stocks: "Hisseler",
  ai: "ARGOS Brain",
  trade: "İşlem Motoru",
  alarms: "Alarmlar",
  docs: "Dokümantasyon",
  settings: "Ayarlar",
};

function Header({ route, theme, onToggleTheme }) {
  const base = route.split(":")[0];
  let title = TITLES[base] || "ARGOS";
  if (base === "stock") {
    const t = route.split(":")[1];
    const s = STOCKS.find((x) => x.t === t);
    title = s ? `${s.t} · ${s.name}` : "Hisse Detay";
  }
  const p = PORTFOLIO;
  const pos = p.dayPL >= 0;
  return (
    <header className="header">
      <div className="header__title">{title}</div>
      <div className="header__spacer" />
      <button className="theme-toggle" onClick={onToggleTheme} title={theme === "light" ? "Koyu temaya geç" : "Açık temaya geç"} aria-label="Tema değiştir">
        <span className={"theme-toggle__track theme-toggle__track--" + theme}>
          <span className="theme-toggle__thumb">
            <Icon name={theme === "light" ? "sun" : "moon"} size={13} />
          </span>
        </span>
      </button>
      <MarketPill />
      <div className="header__portfolio">
        <div className="val">{fmtUSD(p.totalValue, 2)}</div>
        <div className={"chg " + (pos ? "pos" : "neg")}>
          {pos ? "▲" : "▼"} {fmtUSD(Math.abs(p.dayPL), 0)} · {fmtPct(p.dayPct)}
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Header, MarketPill, NAV });
