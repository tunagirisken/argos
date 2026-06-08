// ============================================================
// ARGOS — Dashboard (TradingView seviyesi)
// Kompakt summary bar + yeniden tasarlanan hisse kartları
// ============================================================
const { useState: useDashState } = React;

function stopZone(dist) {
  if (dist > 10) return "ok";
  if (dist >= 5) return "warn";
  return "danger";
}

// ---- Portföy özet barı ----
function SummaryBar() {
  const p = PORTFOLIO;
  const dPos = p.dayPL >= 0, tPos = p.totalReturn >= 0;
  return (
    <div className="summary-bar">
      <div className="summary-bar__cell accent-edge">
        <span className="k">Toplam Değer</span>
        <span className="v">{fmtUSD(p.totalValue, 2)}</span>
      </div>
      <div className="summary-bar__cell">
        <span className="k">Günlük P&L</span>
        <span className={"v " + (dPos ? "pos" : "neg")}>{(dPos ? "+" : "−") + fmtUSD(Math.abs(p.dayPL), 0).slice(1)}</span>
        <span className={"sub " + (dPos ? "pos" : "neg")}>{fmtPct(p.dayPct)}</span>
      </div>
      <div className="summary-bar__cell">
        <span className="k">Toplam Getiri</span>
        <span className={"v " + (tPos ? "pos" : "neg")}>{fmtPct(p.totalReturnPct)}</span>
        <span className={"sub " + (tPos ? "pos" : "neg")}>{(tPos ? "+" : "−") + fmtUSD(Math.abs(p.totalReturn), 0).slice(1)}</span>
      </div>
      <div className="summary-bar__cell">
        <span className="k">Nakit</span>
        <span className="v">{fmtUSD(p.cash, 0)}</span>
        <span className="sub muted">Bekleyen {fmtUSD(p.pendingOrders, 0)}</span>
      </div>
      <div className="summary-bar__cell grow" style={{ alignItems: "flex-end", justifyContent: "center" }}>
        <span className="k">Pozisyon</span>
        <span className="v">{STOCKS.length}</span>
      </div>
    </div>
  );
}

function MiniToggle({ mode, onMode }) {
  return (
    <div className="seg mini" onClick={(e) => e.stopPropagation()} title="Grafik tipi">
      <button className={mode === "candle" ? "on" : ""} onClick={() => onMode("candle")} aria-label="Mum"><Icon name="candles" size={14} /></button>
      <button className={mode === "line" ? "on" : ""} onClick={() => onMode("line")} aria-label="Çizgi"><Icon name="line" size={14} /></button>
    </div>
  );
}

function TVStockCard({ s, onOpen, theme }) {
  const [mode, setMode] = useDashState("candle");
  const dayPos = s.dayPct >= 0;
  const totPos = s.totalPct >= 0;
  const sigClass = s.signal === "AL" ? "buy" : s.signal === "SAT" ? "sell" : "hold";
  const fillPct = Math.max(4, Math.min(96, ((s.price - s.stop) / (s.target - s.stop)) * 100));
  const zone = stopZone(s.stopDist);
  return (
    <div className={"tv-card sig-" + sigClass} onClick={() => onOpen(s.t)}>
      <div className="tv-card__top">
        {/* sol */}
        <div className="tv-card__id">
          <div className="tv-card__sym">
            <span className="ticker-logo" style={{ background: s.logo, width: 26, height: 26, fontSize: 10, borderRadius: 6 }}>{s.t.slice(0, 2)}</span>
            <span className="t">{s.t}</span>
          </div>
          <div className="tv-card__name">{s.name}</div>
          <div className="tv-card__price">{fmtUSD(s.price)}</div>
          <div className={"tv-card__chg " + (dayPos ? "pos" : "neg")}>{dayPos ? "▲" : "▼"} {fmtPct(s.dayPct)}</div>
        </div>
        {/* orta: mini grafik */}
        <div style={{ position: "relative", height: 76, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ position: "absolute", top: 0, right: 0, zIndex: 2 }}><MiniToggle mode={mode} onMode={setMode} /></div>
          <div className="tv-card__chart"><MiniChart stock={s} mode={mode} theme={theme} /></div>
        </div>
        {/* sağ: RSI + sinyal */}
        <div className="tv-card__right">
          <span className={"sigbadge " + sigClass}>● {s.signal}</span>
          <RsiMini value={s.rsi} />
        </div>
      </div>

      {/* alt: pozisyon detayı */}
      <div className="tv-card__foot">
        <div className="tv-card__metric"><div className="k">Maliyet</div><div className="v">{fmtUSD(s.cost)}</div></div>
        <div className="tv-card__metric"><div className="k">Getiri</div><div className={"v " + (totPos ? "pos" : "neg")}>{fmtPct(s.totalPct)}</div></div>
        <div className="tv-card__metric"><div className="k">Stop</div><div className="v">{fmtUSD(s.stop, 0)}</div></div>
        <div className="tv-card__metric"><div className="k">Hedef</div><div className="v">{fmtUSD(s.target, 0)}</div></div>
        <div className="tv-card__bar-wrap">
          <div className="rangebar"><div className={"rangebar__fill " + zone} style={{ width: fillPct + "%" }} /></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10 }} className="faint tnum">
            <span>Stop'a %{s.stopDist.toFixed(1)}</span>
            <span>Hedefe %{(((s.target - s.price) / s.price) * 100).toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ onOpen, theme }) {
  return (
    <div className="page">
      <SummaryBar />
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <span className="section-label" style={{ margin: 0 }}>Pozisyonlar</span>
        <span className="faint" style={{ marginLeft: "auto", fontSize: 12 }}>Detay için karta tıkla →</span>
      </div>
      <div className="tv-grid">
        {STOCKS.map((s) => <TVStockCard key={s.t} s={s} onOpen={onOpen} theme={theme} />)}
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, TVStockCard, SummaryBar, stopZone });
