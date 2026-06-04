// ============================================================
// ARGOS — Hisse Detay (TradingView seviyesi)
// Tam grafik + 300px sağ panel + 5'li sinyal skoru
// ============================================================
const { useState: useDetState, useEffect: useDetEffect, useRef: useDetRef } = React;

// canlı fiyat simülasyonu (WS yerine)
function useLivePrice(base) {
  const [p, setP] = useDetState(base);
  const [dir, setDir] = useDetState(0);
  const baseRef = useDetRef(base);
  useDetEffect(() => { baseRef.current = base; setP(base); }, [base]);
  useDetEffect(() => {
    const id = setInterval(() => {
      setP((prev) => {
        const drift = (Math.random() - 0.5) * baseRef.current * 0.0012;
        const next = +(prev + drift).toFixed(2);
        setDir(next >= prev ? 1 : -1);
        return next;
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return [p, dir];
}

const TIME_RANGES = ["1G", "5G", "1A", "3A", "6A", "1Y"];

function ScoreRow({ ind }) {
  const cls = ind.val > 0 ? "pos" : ind.val < 0 ? "neg" : "zero";
  const txt = ind.val > 0 ? "AL" : ind.val < 0 ? "SAT" : "NÖTR";
  const col = ind.val > 0 ? "var(--positive)" : ind.val < 0 ? "var(--negative)" : "var(--warning)";
  return (
    <div className="score-row">
      <span className="lbl">{ind.key}</span>
      <span className="note">{ind.note}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className={"score-ind " + cls}>
          <i className="lo" /><i className="mid" /><i className="hi" />
        </span>
        <span className="tnum" style={{ fontSize: 10, fontWeight: 700, color: col, width: 30, textAlign: "right" }}>{txt}</span>
      </span>
    </div>
  );
}

function StockDetail({ ticker, onOpen, onBack, theme }) {
  const s = STOCKS.find((x) => x.t === ticker) || STOCKS[0];
  const [range, setRange] = useDetState("3A");
  const [mode, setMode] = useDetState("candle");
  const [overlays, setOverlays] = useDetState({ ema20: true, ema50: true, bb: false });
  const [stop, setStop] = useDetState(s.stop);
  const [target, setTarget] = useDetState(s.target);
  const [note, setNote] = useDetState("Kademeli kâr al — $360 üzeri 1/3 sat.");
  const [saved, setSaved] = useDetState(false);
  const [live, dir] = useLivePrice(s.price);

  useDetEffect(() => { setStop(s.stop); setTarget(s.target); setNote("Pozisyon notu…"); }, [ticker]);

  const totPos = s.totalPct >= 0;
  const dayPos = s.dayPct >= 0;
  const tog = (k) => setOverlays((o) => ({ ...o, [k]: !o[k] }));
  const news = NEWS[s.t] || defaultNews(s.t);
  const rating = ratingLabel(s.signalSum);
  const sentColor = { pos: "var(--positive)", neg: "var(--negative)", neu: "var(--text-muted)" };

  const ovBtn = (k, label, color) => (
    <button className={"chip" + (overlays[k] ? " active" : "")} onClick={() => tog(k)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 9, height: 2.5, borderRadius: 2, background: color, display: "inline-block" }} /> {label}
    </button>
  );

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", paddingBottom: 18 }}>
      {/* üst breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="btn btn--ghost" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px" }}>
          <Icon name="back" size={15} /> Geri
        </button>
        <span className="ticker-logo" style={{ background: s.logo, width: 30, height: 30, fontSize: 11, borderRadius: 6 }}>{s.t.slice(0, 2)}</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 17 }}>{s.t}</span>
          <span className="muted" style={{ fontSize: 13 }}>{s.name}</span>
          <span className="badge badge--accent">{s.sector}</span>
        </div>
        {/* diğer pozisyonlar */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {STOCKS.filter((x) => x.t !== s.t).map((x) => (
            <button key={x.t} className="chip" onClick={() => onOpen(x.t)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 2, background: x.logo }} /> {x.t}
            </button>
          ))}
        </div>
      </div>

      <div className="detail" style={{ flex: 1, minHeight: 0 }}>
        {/* ---- SOL: grafik ---- */}
        <div className="detail__main">
          <div className="panel">
            <div className="chart-toolbar">
              <div className="seg">
                {TIME_RANGES.map((r) => <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r}</button>)}
              </div>
              <div style={{ width: 1, height: 20, background: "var(--border-default)" }} />
              {ovBtn("ema20", "EMA20", "#ff9800")}
              {ovBtn("ema50", "EMA50", "#ab47bc")}
              {ovBtn("bb", "BB", "rgba(120,123,134,0.9)")}
              <div className="seg" style={{ marginLeft: "auto" }}>
                <button className={mode === "candle" ? "on" : ""} onClick={() => setMode("candle")}><Icon name="candles" size={14} /> Mum</button>
                <button className={mode === "line" ? "on" : ""} onClick={() => setMode("line")}><Icon name="line" size={14} /> Çizgi</button>
              </div>
            </div>
            <TVChart stock={s} range={range} mode={mode} overlays={overlays} theme={theme} />
          </div>
        </div>

        {/* ---- SAĞ: 300px panel ---- */}
        <div className="detail__side">
          {/* Fiyat */}
          <div className="panel">
            <div className="panel__body" style={{ paddingBottom: 12 }}>
              <div className={"tnum " + (dir >= 0 ? "flash-pos" : "flash-neg")} key={live} style={{ display: "inline-block", borderRadius: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 700 }}>{fmtUSD(live)}</span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
                <span className={"tnum " + (dayPos ? "pos" : "neg")} style={{ fontSize: 14, fontWeight: 600 }}>{dayPos ? "▲" : "▼"} {fmtPct(s.dayPct)}</span>
                <span className="faint" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--positive)", animation: "pulse-dot 2s infinite" }} /> canlı
                </span>
              </div>
            </div>
          </div>

          {/* Pozisyon */}
          <div className="panel">
            <div className="panel__head"><span className="ttl">Pozisyon</span></div>
            <div className="panel__body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", fontSize: 13, marginBottom: 14 }}>
                <DRow k="Adet" v={s.qty.toString()} />
                <DRow k="Maliyet" v={fmtUSD(s.cost)} />
                <DRow k="Değer" v={fmtUSD(s.value, 0)} />
                <DRow k="Getiri" v={fmtPct(s.totalPct)} tone={totPos ? "pos" : "neg"} />
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <DField label="Stop-Loss" value={stop} onChange={setStop} />
                <DField label="Hedef" value={target} onChange={setTarget} />
              </div>
              <textarea className="input" value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ resize: "none", fontSize: 12, lineHeight: 1.5 }} placeholder="Not…" />
              <button className="btn btn--accent" style={{ width: "100%", marginTop: 10, padding: "8px" }}
                onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 1500); }}>
                {saved ? "✓ Kaydedildi" : "Güncelle"}
              </button>
            </div>
          </div>

          {/* Sinyal skoru */}
          <div className="panel">
            <div className="panel__head"><span className="ttl">Sinyal Skoru</span><span className={"sigbadge " + rating.cls} style={{ marginLeft: "auto" }}>{rating.t}</span></div>
            <div className="panel__body">
              <div className="score-head">
                <div className="score-dial"><ScoreDial sum={s.signalSum} /></div>
                <div>
                  <div className="muted" style={{ fontSize: 11 }}>5 göstergeden bileşik</div>
                  <div className="tnum" style={{ fontSize: 13, fontWeight: 600 }}>
                    {s.signals.filter((x) => x.val > 0).length} AL · {s.signals.filter((x) => x.val < 0).length} SAT · {s.signals.filter((x) => x.val === 0).length} NÖTR
                  </div>
                </div>
              </div>
              <div className="score-rows">
                {s.signals.map((ind) => <ScoreRow key={ind.key} ind={ind} />)}
              </div>
            </div>
          </div>

          {/* Haberler */}
          <div className="panel">
            <div className="panel__head"><span className="ttl">Son Haberler</span></div>
            <div className="panel__body" style={{ paddingTop: 4, paddingBottom: 6 }}>
              {news.slice(0, 5).map((n, i) => (
                <div className="news-row" key={i}>
                  <span className="news-row__dot" style={{ background: sentColor[n.sentiment] }} />
                  <div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{n.title}</div>
                    <div className="faint" style={{ fontSize: 10.5, marginTop: 3 }}>{n.src} · {n.min < 60 ? n.min + " dk önce" : Math.round(n.min / 60) + " sa önce"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DRow({ k, v, tone }) {
  return <div style={{ display: "flex", justifyContent: "space-between" }}>
    <span className="muted">{k}</span>
    <span className={"tnum " + (tone || "")} style={{ fontWeight: 600 }}>{v}</span>
  </div>;
}
function DField({ label, value, onChange }) {
  return <label style={{ flex: 1 }}>
    <div className="faint" style={{ fontSize: 10.5, marginBottom: 5 }}>{label}</div>
    <div style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", padding: "7px 9px" }}>
      <span className="faint tnum">$</span>
      <input className="tnum" type="number" value={value} onChange={(e) => onChange(+e.target.value)}
        style={{ background: "transparent", border: "none", color: "var(--text-primary)", width: "100%", fontSize: 13, outline: "none", fontFamily: "var(--font-mono)" }} />
    </div>
  </label>;
}

Object.assign(window, { StockDetail });
