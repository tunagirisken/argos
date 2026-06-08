// ============================================================
// ARGOS — App root: routing + tweaks
// ============================================================
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2962ff",
  "glow": 1,
  "radius": 8,
  "density": "regular",
  "showSparkline": true
}/*EDITMODE-END*/;

function Settings({ onResetSetup }) {
  const rows = [
    { k: "Para Birimi", v: "USD ($)" },
    { k: "Saat Dilimi", v: "İstanbul (GMT+3)" },
    { k: "Sabah Brifingi", v: "08:30 · Açık" },
    { k: "Kapanış Raporu", v: "23:05 · Açık" },
    { k: "Anlık Bildirimler", v: "Açık" },
    { k: "Veri Kaynağı", v: "Canlı · WebSocket" },
  ];
  return (
    <div className="page">
      <div style={{ maxWidth: 560 }}>
        <div className="section-label">Hesap & Tercihler</div>
        <div className="card" style={{ padding: "6px 20px" }}>
          {rows.map((r, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
              <span className="muted">{r.k}</span>
              <span className="mono" style={{ fontSize: 13 }}>{r.v}</span>
            </div>
          ))}
        </div>
        <div className="card glow-accent" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <span className="ticker-logo" style={{ background: "color-mix(in srgb, var(--t-accent) 22%, var(--bg-elevated))", color: "var(--t-accent)" }}><Icon name="eye" size={20} /></span>
          <div>
            <div style={{ fontWeight: 600 }}>Görünümü değiştir</div>
            <div className="muted" style={{ fontSize: 12 }}>Sağ üstteki Tweaks panelinden aksan rengi, glow ve yoğunluğu ayarla.</div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <span className="ticker-logo" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}><Icon name="settings" size={18} /></span>
          <div>
            <div style={{ fontWeight: 600 }}>Kurulum sihirbazı</div>
            <div className="muted" style={{ fontSize: 12 }}>API anahtarları ve portföyü yeniden yapılandır.</div>
          </div>
          <button className="btn btn--ghost" style={{ marginLeft: "auto" }} onClick={onResetSetup}>Yeniden çalıştır</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState(() => localStorage.getItem("argos.route") || "dashboard");
  const [theme, setTheme] = useState(() => localStorage.getItem("argos.theme") || "dark");
  const [loggedIn, setLoggedIn] = useState(() => localStorage.getItem("argos.auth") === "1");
  const [setupDone, setSetupDone] = useState(() => localStorage.getItem("argos.setup_complete") === "1");

  useEffect(() => { localStorage.setItem("argos.route", route); }, [route]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("argos.theme", theme);
  }, [theme]);
  const toggleTheme = () => setTheme((p) => (p === "dark" ? "light" : "dark"));

  // tweaks → CSS (must run every render, before any early return)
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty("--t-accent", t.accent);
    r.style.setProperty("--t-glow", String(t.glow));
    r.style.setProperty("--radius-lg", t.radius + "px");
    r.style.setProperty("--radius-xl", (t.radius + 6) + "px");
    document.body.style.fontSize = ({ compact: 13, regular: 14, comfy: 15 }[t.density]) + "px";
  }, [t]);

  if (!loggedIn) {
    return <Landing theme={theme} onToggleTheme={toggleTheme}
      onLogin={() => { localStorage.setItem("argos.auth", "1"); setLoggedIn(true); }} />;
  }

  if (!setupDone) {
    return <SetupWizard theme={theme} onToggleTheme={toggleTheme} onComplete={() => { setSetupDone(true); setRoute("dashboard"); }} />;
  }

  const nav = (id) => setRoute(id === "stocks" ? "stock:" + STOCKS[0].t : id);
  const openStock = (ticker) => setRoute("stock:" + ticker);
  const base = route.split(":")[0];

  let screen;
  if (base === "dashboard") screen = <Dashboard onOpen={openStock} theme={theme} />;
  else if (base === "stock") screen = <StockDetail ticker={route.split(":")[1]} onOpen={openStock} onBack={() => setRoute("dashboard")} theme={theme} />;
  else if (base === "ai") screen = <AiAnalysis />;
  else if (base === "alarms") screen = <Alarms />;
  else if (base === "docs") screen = <Docs />;
  else if (base === "settings") screen = <Settings onResetSetup={() => { localStorage.removeItem("argos.setup_complete"); localStorage.removeItem("argos.has_env"); localStorage.removeItem("argos.has_portfolio"); setSetupDone(false); }} />;
  else screen = <Dashboard onOpen={openStock} theme={theme} />;

  return (
    <div className="app">
      <Sidebar route={route} onNav={nav} />
      <div className="main">
        <Header route={route} theme={theme} onToggleTheme={toggleTheme} />
        {/* key → sayfa geçiş animasyonu */}
        <React.Fragment key={base === "stock" ? route : base}>{screen}</React.Fragment>
      </div>

      <TweaksPanel>
        <TweakSection label="Marka" />
        <TweakColor label="Aksan rengi" value={t.accent}
          options={["#2962ff", "#26a69a", "#ff9800", "#ab47bc", "#089981"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSlider label="Glow yoğunluğu" value={t.glow} min={0} max={2} step={0.1}
          onChange={(v) => setTweak("glow", v)} />
        <TweakSection label="Yerleşim" />
        <TweakRadio label="Yoğunluk" value={t.density} options={["compact", "regular", "comfy"]}
          onChange={(v) => setTweak("density", v)} />
        <TweakSlider label="Köşe yuvarlaklığı" value={t.radius} min={2} max={16} unit="px"
          onChange={(v) => setTweak("radius", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
