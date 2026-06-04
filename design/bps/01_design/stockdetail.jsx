// ============================================================
// ARGOS — Hisse Detay
// ============================================================
function OverlayToggle({ label, color, on, onClick }) {
  return (
    <button className={"chip" + (on ? " active" : "")} onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 9, height: 2.5, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </button>
  );
}

function StockDetail({ ticker, onOpen, onBack }) {
  const s = STOCKS.find((x) => x.t === ticker) || STOCKS[0];
  const [range, setRange] = React.useState("3A");
  const [mode, setMode] = React.useState("candle");
  const [overlays, setOverlays] = React.useState({ ema20: true, ema50: true, ema200: false, bollinger: false });
  const [stop, setStop] = React.useState(s.stop);
  const [target, setTarget] = React.useState(s.target);
  const [note, setNote] = React.useState("Kademeli kâr al — $360 üzeri 1/3 sat. Stop'u maliyetin üzerine çek.");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => { setStop(s.stop); setTarget(s.target); }, [ticker]);

  const dayPos = s.dayPct >= 0;
  const totPos = s.totalPct >= 0;
  const tog = (k) => setOverlays((o) => ({ ...o, [k]: !o[k] }));
  const news = NEWS[s.t] || defaultNews(s.t);
  const sigClass = s.signal === "AL" ? "buy" : s.signal === "SAT" ? "sell" : "hold";
  const sentColor = { pos: "var(--positive)", neg: "var(--negative)", neu: "var(--text-muted)" };
  const sentDot = { pos: "🟢", neg: "🔴", neu: "⚪" };

  return (
    <div className="page">
      <button className="btn btn--ghost" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 18, padding: "7px 12px" }}>
        <Icon name="back" size={16} /> Geri
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "65fr 35fr", gap: 18, alignItems: "start" }}>
        {/* ---- SOL ---- */}
        <div className="card" style={{ padding: 22 }}>
          {/* fiyat başlığı */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span className="ticker-logo" style={{ background: s.logo, width: 44, height: 44, fontSize: 15 }}>{s.t.slice(0, 2)}</span>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{s.t}</span>
                <span className="muted">{s.name}</span>
                <span className="badge badge--accent" style={{ marginLeft: 4 }}>{s.sector}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 38, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmtUSD(s.price)}</span>
                <span className={"mono " + (dayPos ? "pos" : "neg")} style={{ fontSize: 15, fontWeight: 600 }}>
                  {dayPos ? "▲" : "▼"} {fmtPct(s.dayPct)} bugün
                </span>
              </div>
            </div>
          </div>

          {/* kontroller */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "20px 0 6px" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["1G", "1H", "3A", "6A", "1Y"].map((r) => (
                <button key={r} className={"chip" + (range === r ? " active" : "")} onClick={() => setRange(r)}>{r}</button>
              ))}
            </div>
            <div style={{ width: 1, background: "var(--border-default)", margin: "0 4px" }} />
            <button className={"chip" + (mode === "candle" ? " active" : "")} onClick={() => setMode("candle")}>Mum</button>
            <button className={"chip" + (mode === "area" ? " active" : "")} onClick={() => setMode("area")}>Alan</button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <OverlayToggle label="EMA20" color="#9b8cff" on={overlays.ema20} onClick={() => tog("ema20")} />
              <OverlayToggle label="EMA50" color="#ffb547" on={overlays.ema50} onClick={() => tog("ema50")} />
              <OverlayToggle label="EMA200" color="#40c8ff" on={overlays.ema200} onClick={() => tog("ema200")} />
              <OverlayToggle label="BB" color="rgba(124,108,248,.7)" on={overlays.bollinger} onClick={() => tog("bollinger")} />
            </div>
          </div>

          <PriceChart stock={s} range={range} mode={mode} overlays={overlays} />
        </div>

        {/* ---- SAĞ ---- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Teknik Sinyal */}
          <div className="card">
            <div className="section-label">Teknik Sinyal</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <span className={"badge badge--" + sigClass} style={{ fontSize: 18, padding: "8px 18px" }}>● {s.signal}</span>
              <div>
                <div className="faint" style={{ fontSize: 11 }}>Güven Skoru</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 700 }}>%{s.confidence}</div>
              </div>
            </div>
            <div className="rangebar" style={{ marginBottom: 18 }}>
              <div className="rangebar__fill" style={{ width: s.confidence + "%", background: "var(--t-accent)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, alignItems: "center" }}>
              <RsiGauge value={s.rsi} />
              <div>
                <div className="faint" style={{ fontSize: 11, marginBottom: 4 }}>MACD (12,26,9)</div>
                <MacdMini data={s.macd} />
              </div>
            </div>
          </div>

          {/* Pozisyon */}
          <div className="card">
            <div className="section-label">Pozisyon</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 16px", fontSize: 13, marginBottom: 16 }}>
              <Row k="Adet" v={s.qty.toString()} />
              <Row k="Maliyet" v={fmtUSD(s.cost)} />
              <Row k="Piyasa Değeri" v={fmtUSD(s.value, 0)} />
              <Row k="Toplam P&L" v={fmtPct(s.totalPct)} tone={totPos ? "pos" : "neg"} />
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
              <Field label="Stop-Loss" value={stop} onChange={setStop} />
              <Field label="Hedef" value={target} onChange={setTarget} />
            </div>
            <div className="faint" style={{ fontSize: 11, marginBottom: 6 }}>Not</div>
            <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} rows={3} style={{ resize: "none", fontSize: 13, lineHeight: 1.5 }} />
            <button className="btn btn--accent" style={{ width: "100%", marginTop: 12 }}
              onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1600); }}>
              {saved ? "✓ Kaydedildi" : "Pozisyonu Güncelle"}
            </button>
          </div>

          {/* Haberler */}
          <div className="card">
            <div className="section-label">Haberler</div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {news.map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 11, padding: "12px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                  <span style={{ fontSize: 13, lineHeight: 1.2 }}>{sentDot[n.sentiment]}</span>
                  <div>
                    <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 4 }}>{n.title}</div>
                    <div className="faint" style={{ fontSize: 11 }}>{n.src} · {n.min < 60 ? n.min + " dk önce" : Math.round(n.min / 60) + " sa önce"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* diğer hisselere hızlı geçiş */}
      <div style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 12, alignSelf: "center", marginRight: 4 }}>Diğer pozisyonlar:</span>
        {STOCKS.filter((x) => x.t !== s.t).map((x) => (
          <button key={x.t} className="chip" onClick={() => onOpen(x.t)} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: x.logo }} /> {x.t}
            <span className={x.dayPct >= 0 ? "pos" : "neg"} style={{ fontSize: 11 }}>{fmtPct(x.dayPct)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Row({ k, v, tone }) {
  return <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span className="muted">{k}</span>
    <span className={"mono " + (tone || "")} style={{ fontWeight: 600 }}>{v}</span>
  </div>;
}
function Field({ label, value, onChange }) {
  return <label style={{ flex: 1 }}>
    <div className="faint" style={{ fontSize: 11, marginBottom: 6 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "8px 10px" }}>
      <span className="faint mono">$</span>
      <input className="mono" type="number" value={value} onChange={(e) => onChange(+e.target.value)}
        style={{ background: "transparent", border: "none", color: "var(--text-primary)", width: "100%", fontSize: 14, outline: "none", fontFamily: "var(--font-mono)" }} />
    </div>
  </label>;
}

Object.assign(window, { StockDetail });
