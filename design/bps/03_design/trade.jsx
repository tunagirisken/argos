// ============================================================
// ARGOS — Trade Engine (Otomatik İşlem Motoru)
// Strateji + canlı sinyal akışı + motor pozisyonları + performans
// styles.css'e dokunulmaz; sayfa-özel stiller alttaki <style>'da.
// ============================================================
const { useState: useTeState, useEffect: useTeEffect, useRef: useTeRef } = React;

// ---- Motor tarafından yönetilen işlemler ----
const TE_TRADES = [
  { sym: "MRVL", side: "AL", qty: 40, entry: 295.10, exit: 319.58, status: "açık", pnlPct: 8.29, strat: "Momentum Kırılım", time: "2 gün önce" },
  { sym: "AMD", side: "AL", qty: 60, entry: 151.20, exit: 164.05, status: "açık", pnlPct: 8.50, strat: "EMA Geçiş", time: "4 gün önce" },
  { sym: "NVDA", side: "AL", qty: 80, entry: 168.40, exit: 178.34, status: "açık", pnlPct: 5.90, strat: "RSI Dönüş", time: "1 hafta önce" },
  { sym: "PLTR", side: "SAT", qty: 120, entry: 44.80, exit: 41.22, status: "kapalı", pnlPct: 7.99, strat: "Stop Koruma", time: "Dün" },
  { sym: "TSLA", side: "SAT", qty: 30, entry: 262.10, exit: 248.12, status: "kapalı", pnlPct: 5.34, strat: "Trend Zayıflama", time: "3 gün önce" },
];

// ---- Strateji tanımları ----
const TE_STRATEGIES = [
  { id: "momentum", name: "Momentum Kırılım", desc: "20 günlük direnç kırılımı + hacim onayı", active: true, wr: 68, trades: 42 },
  { id: "ema", name: "EMA Geçiş", desc: "EMA20 / EMA50 altın kesişimi", active: true, wr: 61, trades: 35 },
  { id: "rsi", name: "RSI Dönüş", desc: "RSI 30 altından dönüş + MACD onayı", active: true, wr: 64, trades: 28 },
  { id: "meanrev", name: "Ortalamaya Dönüş", desc: "Bollinger alt bandı + aşırı satım", active: false, wr: 57, trades: 19 },
];

// ---- Motor karar akışı (canlı log) ----
const TE_FEED_SEED = [
  { t: "10:42:18", sym: "MRVL", msg: "Momentum kırılımı onaylandı, AL sinyali", tone: "buy" },
  { t: "10:39:02", sym: "AMD", msg: "Hacim ortalamanın 1.8x üzerinde, pozisyon korunuyor", tone: "info" },
  { t: "10:31:47", sym: "TSLA", msg: "Trend zayıflama, kısmi kapatma", tone: "sell" },
  { t: "10:24:55", sym: "NVDA", msg: "RSI 61, nötr bölge, bekle", tone: "hold" },
  { t: "10:18:30", sym: "PLTR", msg: "Stop-loss tetiklendi, pozisyon kapatıldı", tone: "sell" },
];

function EquityCurve({ theme }) {
  // Bağımlılıksız SVG area chart — her ortamda güvenilir render.
  const W = 760, H = 220, padL = 6, padR = 52, padB = 22, padT = 10;
  const data = React.useMemo(() => {
    let eq = 100000; const out = [];
    for (let i = 0; i < 90; i++) {
      const r = Math.sin(i * 0.6) * 0.004 + (i / 90) * 0.006 + 0.002;
      eq = eq * (1 + r); out.push(eq);
    }
    return out;
  }, []);
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const plotW = W - padR;
  const x = (i) => padL + (i / (data.length - 1)) * (plotW - padL);
  const y = (v) => padT + (1 - (v - min) / rng) * (H - padT - padB);
  const line = data.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const area = line + ` L${plotW} ${H - padB} L${padL} ${H - padB} Z`;
  const gid = "eqg-" + theme;
  const last = data[data.length - 1];
  const grids = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--t-accent)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--t-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: grids + 1 }).map((_, g) => {
        const gy = padT + (g / grids) * (H - padT - padB);
        const val = max - (g / grids) * rng;
        return (
          <g key={g}>
            <line x1={padL} y1={gy} x2={plotW} y2={gy} stroke="var(--border-subtle)" strokeWidth="1" />
            <text x={plotW + 6} y={gy + 3} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)">${(val / 1000).toFixed(0)}k</text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="var(--t-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <line x1={padL} y1={y(last)} x2={plotW} y2={y(last)} stroke="var(--t-accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
      <circle cx={x(data.length - 1)} cy={y(last)} r="3.5" fill="var(--t-accent)" />
    </svg>
  );
}

function TeMetric({ k, v, sub, tone }) {
  return (
    <div className="te-metric">
      <span className="te-metric__k">{k}</span>
      <span className={"te-metric__v " + (tone || "")}>{v}</span>
      {sub && <span className={"te-metric__sub " + (tone || "muted")}>{sub}</span>}
    </div>
  );
}

function TradeEngine({ theme }) {
  const [running, setRunning] = useTeState(true);
  const [mode, setMode] = useTeState("paper"); // paper | live
  const [risk, setRisk] = useTeState(2);
  const [maxPos, setMaxPos] = useTeState(6);
  const [strats, setStrats] = useTeState(TE_STRATEGIES);
  const [feed, setFeed] = useTeState(TE_FEED_SEED);
  const [autoTelegram, setAutoTelegram] = useTeState(true);

  // canlı feed simülasyonu
  useTeEffect(() => {
    if (!running) return;
    const samples = [
      { sym: "MRVL", msg: "Fiyat hedef bandında, trailing stop yükseltildi", tone: "info" },
      { sym: "AMD", msg: "EMA20 üzerinde kapanış, pozisyon korunuyor", tone: "buy" },
      { sym: "NVDA", msg: "Hacim düşüşü, sinyal zayıflıyor", tone: "hold" },
      { sym: "AAPL", msg: "Momentum taraması: aday bulunamadı", tone: "info" },
    ];
    const id = setInterval(() => {
      const s = samples[Math.floor(Math.random() * samples.length)];
      const now = new Date();
      const t = now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      setFeed((f) => [{ t, ...s }, ...f].slice(0, 12));
    }, 4000);
    return () => clearInterval(id);
  }, [running]);

  const toggleStrat = (id) => setStrats((s) => s.map((x) => x.id === id ? { ...x, active: !x.active } : x));
  const openTrades = TE_TRADES.filter((t) => t.status === "açık");
  const totalPnl = TE_TRADES.reduce((a, t) => a + t.pnlPct, 0);
  const wins = TE_TRADES.filter((t) => t.pnlPct > 0).length;
  const winRate = Math.round((wins / TE_TRADES.length) * 100);

  const toneColor = { buy: "var(--positive)", sell: "var(--negative)", hold: "var(--warning)", info: "var(--info)" };

  return (
    <div className="page te">
      <TeStyles />

      {/* ---- Üst durum şeridi ---- */}
      <div className="te-status">
        <div className="te-status__left">
          <span className={"te-pulse " + (running ? "on" : "off")} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>İşlem Motoru {running ? "Çalışıyor" : "Duraklatıldı"}</div>
            <div className="muted" style={{ fontSize: 12 }}>{strats.filter((s) => s.active).length} aktif strateji · {mode === "paper" ? "Kağıt İşlem (simülasyon)" : "Canlı İşlem"}</div>
          </div>
        </div>
        <div className="te-status__right">
          <div className="seg">
            <button className={mode === "paper" ? "on" : ""} onClick={() => setMode("paper")}>Kağıt</button>
            <button className={mode === "live" ? "on" : ""} onClick={() => setMode("live")}>Canlı</button>
          </div>
          <button className={"btn " + (running ? "btn--ghost" : "btn--accent")} onClick={() => setRunning((r) => !r)} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Icon name={running ? "moon" : "play"} size={15} /> {running ? "Duraklat" : "Başlat"}
          </button>
        </div>
      </div>

      {mode === "live" && (
        <div className="te-warn">
          <Icon name="bell" size={15} />
          <span><strong>Canlı mod aktif.</strong> Motor gerçek emirler iletecek. Risk limitlerini kontrol edin.</span>
        </div>
      )}

      {/* ---- Metrik şeridi ---- */}
      <div className="te-metrics">
        <TeMetric k="Toplam Getiri" v={fmtPct(totalPnl / 2)} sub="motor başlangıcından" tone="pos" />
        <TeMetric k="Kazanma Oranı" v={"%" + winRate} sub={`${wins}/${TE_TRADES.length} işlem`} tone={winRate >= 60 ? "pos" : "muted"} />
        <TeMetric k="Açık Pozisyon" v={openTrades.length + "/" + maxPos} sub="aktif slot" />
        <TeMetric k="İşlem Başına Risk" v={"%" + risk} sub="portföy oranı" />
        <TeMetric k="Sharpe" v="1.84" sub="90 günlük" tone="pos" />
      </div>

      <div className="te-grid">
        {/* ---- SOL: equity + işlemler ---- */}
        <div className="te-col">
          {/* Equity curve */}
          <div className="panel">
            <div className="panel__head"><span className="ttl">Sermaye Eğrisi</span><span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>Son 90 gün</span></div>
            <div style={{ height: 240, padding: "8px 4px" }}><EquityCurve theme={theme} /></div>
          </div>

          {/* İşlemler tablosu */}
          <div className="panel">
            <div className="panel__head"><span className="ttl">Motor İşlemleri</span></div>
            <div style={{ overflowX: "auto" }}>
              <table className="te-table">
                <thead>
                  <tr>{["Hisse", "Yön", "Strateji", "Giriş", "Güncel", "P&L", "Durum"].map((h) => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {TE_TRADES.map((t, i) => (
                    <tr key={i}>
                      <td className="mono" style={{ fontWeight: 700 }}>{t.sym}</td>
                      <td><span className={"sigbadge " + (t.side === "AL" ? "buy" : "sell")}>{t.side}</span></td>
                      <td className="muted" style={{ fontSize: 12 }}>{t.strat}</td>
                      <td className="mono tr">{fmtUSD(t.entry)}</td>
                      <td className="mono tr">{fmtUSD(t.exit)}</td>
                      <td className={"mono tr pos"} style={{ fontWeight: 600 }}>+{t.pnlPct.toFixed(2)}%</td>
                      <td><span className={"te-chip " + (t.status === "açık" ? "open" : "closed")}>{t.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ---- SAĞ: strateji + risk + feed ---- */}
        <div className="te-col">
          {/* Stratejiler */}
          <div className="panel">
            <div className="panel__head"><span className="ttl">Stratejiler</span></div>
            <div className="panel__body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {strats.map((s) => (
                <div key={s.id} className={"te-strat" + (s.active ? " active" : "")}>
                  <button className={"te-switch" + (s.active ? " on" : "")} onClick={() => toggleStrat(s.id)} aria-label="Aç/Kapa"><span /></button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{s.desc}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="mono" style={{ fontSize: 13, fontWeight: 600, color: s.wr >= 60 ? "var(--positive)" : "var(--text-secondary)" }}>%{s.wr}</div>
                    <div className="faint" style={{ fontSize: 10 }}>{s.trades} işlem</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk kontrolleri */}
          <div className="panel">
            <div className="panel__head"><span className="ttl">Risk Kontrolleri</span></div>
            <div className="panel__body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="te-slider-top"><span>İşlem başına risk</span><span className="mono" style={{ color: "var(--t-accent)" }}>%{risk}</span></div>
                <input type="range" min="0.5" max="5" step="0.5" value={risk} onChange={(e) => setRisk(+e.target.value)} className="te-range" />
              </div>
              <div>
                <div className="te-slider-top"><span>Maksimum açık pozisyon</span><span className="mono" style={{ color: "var(--t-accent)" }}>{maxPos}</span></div>
                <input type="range" min="1" max="12" step="1" value={maxPos} onChange={(e) => setMaxPos(+e.target.value)} className="te-range" />
              </div>
              <label className="te-toggle-row">
                <span>Telegram'a otomatik bildir</span>
                <button className={"te-switch" + (autoTelegram ? " on" : "")} onClick={() => setAutoTelegram((v) => !v)} aria-label="Aç/Kapa"><span /></button>
              </label>
            </div>
          </div>

          {/* Canlı feed */}
          <div className="panel">
            <div className="panel__head"><span className="ttl">Karar Akışı</span><span className="te-live" style={{ marginLeft: "auto" }}><span className="te-live__dot" />canlı</span></div>
            <div className="te-feed">
              {feed.map((f, i) => (
                <div key={i} className="te-feed__row" style={{ opacity: i === 0 ? 1 : 0.9 }}>
                  <span className="mono faint" style={{ fontSize: 10.5, flexShrink: 0 }}>{f.t}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: toneColor[f.tone], flexShrink: 0, marginTop: 5 }} />
                  <div style={{ minWidth: 0 }}>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 700 }}>{f.sym}</span>
                    <span style={{ fontSize: 12, marginLeft: 6, color: "var(--text-secondary)" }}>{f.msg}</span>
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

Object.assign(window, { TradeEngine });

function TeStyles() {
  return <style>{`
.te .panel { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
.te .panel__head { padding: 11px 14px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 8px; }
.te .panel__head .ttl { font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--text-muted); }
.te .panel__body { padding: 14px; }

.te-status { display: flex; align-items: center; gap: 16px; padding: 16px 18px; background: var(--bg-surface);
  border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); margin-bottom: 14px; }
.te-status__left { display: flex; align-items: center; gap: 13px; }
.te-status__right { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.te-pulse { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.te-pulse.on { background: var(--positive); box-shadow: 0 0 0 4px color-mix(in srgb, var(--positive) 22%, transparent); animation: pulse-dot 1.8s infinite; }
.te-pulse.off { background: var(--text-muted); }

.te-warn { display: flex; align-items: center; gap: 10px; padding: 11px 15px; margin-bottom: 14px; font-size: 13px;
  color: var(--warning); background: var(--warning-dim); border: 1px solid color-mix(in srgb, var(--warning) 40%, transparent); border-radius: var(--radius-md); }
.te-warn strong { color: var(--text-primary); }

.te-metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 14px; }
.te-metric { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
.te-metric__k { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.te-metric__v { font-family: var(--font-mono); font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; }
.te-metric__sub { font-size: 11px; }

.te-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; }
.te-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.te-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.te-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); padding: 10px 14px; border-bottom: 1px solid var(--border-default); }
.te-table th.tr, .te-table td.tr { text-align: right; }
.te-table td { padding: 11px 14px; border-bottom: 1px solid var(--border-subtle); }
.te-table tbody tr:last-child td { border-bottom: none; }
.te-table tbody tr:hover { background: var(--bg-elevated); }

.te-chip { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 99px; }
.te-chip.open { background: var(--positive-dim); color: var(--positive); }
.te-chip.closed { background: var(--bg-elevated); color: var(--text-secondary); }

.te-strat { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-base); transition: border-color .15s; }
.te-strat.active { border-color: color-mix(in srgb, var(--t-accent) 35%, var(--border-default)); }

.te-switch { width: 36px; height: 20px; border-radius: 99px; border: none; background: var(--bg-elevated); cursor: pointer; padding: 0; position: relative; flex-shrink: 0; transition: background .2s; }
.te-switch span { position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted); transition: transform .2s, background .2s; }
.te-switch.on { background: var(--t-accent); }
.te-switch.on span { transform: translateX(16px); background: #fff; }

.te-slider-top { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
.te-range { width: 100%; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 99px; background: var(--bg-elevated); outline: none; }
.te-range::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: var(--t-accent); cursor: pointer; box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent) 22%, transparent); }
.te-range::-moz-range-thumb { width: 16px; height: 16px; border: none; border-radius: 50%; background: var(--t-accent); cursor: pointer; }
.te-toggle-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--text-secondary); cursor: pointer; }

.te-live { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--positive); text-transform: uppercase; letter-spacing: 0.05em; }
.te-live__dot { width: 6px; height: 6px; border-radius: 50%; background: var(--positive); box-shadow: 0 0 6px var(--positive); animation: pulse-dot 1.8s infinite; }
.te-feed { padding: 6px 14px 12px; max-height: 280px; overflow-y: auto; }
.te-feed__row { display: flex; gap: 9px; padding: 9px 0; border-top: 1px solid var(--border-subtle); }
.te-feed__row:first-child { border-top: none; }

@media (max-width: 1100px) {
  .te-grid { grid-template-columns: 1fr; }
  .te-metrics { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 640px) { .te-metrics { grid-template-columns: 1fr 1fr; } .te-status { flex-direction: column; align-items: flex-start; } .te-status__right { margin-left: 0; } }
`}</style>;
}