// ============================================================
// ARGOS — Alarmlar
// ============================================================
function Alarms() {
  const [alarms, setAlarms] = React.useState(ALARMS);
  const [ticker, setTicker] = React.useState(STOCKS[0].t);
  const [atype, setAtype] = React.useState("Fiyat ↑");
  const [level, setLevel] = React.useState("");
  const [flash, setFlash] = React.useState(null);

  const TYPES = ["Fiyat ↑", "Fiyat ↓", "Stop-loss", "RSI > 70", "Hacim"];

  const add = () => {
    if (!level) return;
    const s = STOCKS.find((x) => x.t === ticker);
    const id = Date.now();
    setAlarms((a) => [{ id, ticker, type: atype, level: +level, current: s.price, status: "aktif" }, ...a]);
    setLevel("");
    setFlash(id);
    setTimeout(() => setFlash(null), 700);
  };
  const remove = (id) => setAlarms((a) => a.filter((x) => x.id !== id));

  const histIcon = { up: "arrow-up", down: "arrow-down", bell: "bell" };
  const histTone = { pos: "var(--positive)", neg: "var(--negative)", warn: "var(--warning)", info: "var(--info)" };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 18, alignItems: "start" }}>
      {/* ---- Sol: tablo + timeline ---- */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {/* Aktif alarmlar */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="section-label" style={{ margin: 0 }}>Aktif Alarmlar</span>
            <span className="badge badge--accent" style={{ marginLeft: 10 }}>{alarms.filter((a) => a.status === "aktif").length}</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {["Hisse", "Tür", "Seviye", "Mevcut", "Uzaklık", "Durum", ""].map((h, i) => (
                  <th key={i} style={{ textAlign: i > 1 && i < 5 ? "right" : "left", padding: "10px 20px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alarms.map((a) => {
                const dist = ((a.level - a.current) / a.current) * 100;
                const near = Math.abs(dist) < 4;
                const triggered = a.status === "tetiklendi";
                return (
                  <tr key={a.id} className={flash === a.id ? "flash-pos" : ""}
                    style={{ borderTop: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "13px 20px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        <span style={{ width: 7, height: 7, borderRadius: 2, background: STOCKS.find((s) => s.t === a.ticker)?.logo || "var(--accent-primary)" }} />
                        {a.ticker}
                      </span>
                    </td>
                    <td style={{ padding: "13px 20px" }} className="muted">{a.type}</td>
                    <td style={{ padding: "13px 20px", textAlign: "right" }} className="mono">{a.type.includes("RSI") ? a.level : fmtUSD(a.level, 0)}</td>
                    <td style={{ padding: "13px 20px", textAlign: "right" }} className="mono muted">{a.type.includes("RSI") ? a.current : fmtUSD(a.current, 0)}</td>
                    <td style={{ padding: "13px 20px", textAlign: "right" }} className={"mono " + (near ? "neg" : "")}>
                      {a.type.includes("RSI") ? (a.level - a.current).toFixed(0) : fmtPct(dist, 1)}
                    </td>
                    <td style={{ padding: "13px 20px" }}>
                      <span className={"badge " + (triggered ? "badge--sell" : "badge--buy")} style={triggered ? { animation: "pulse-danger 1.4s infinite" } : {}}>
                        {triggered ? "● tetiklendi" : "● aktif"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 12px", textAlign: "right" }}>
                      <button className="btn btn--ghost" onClick={() => remove(a.id)} style={{ padding: 6, lineHeight: 0 }}><Icon name="x" size={14} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Timeline */}
        <div>
          <div className="section-label">Alarm Geçmişi</div>
          <div className="card" style={{ padding: "8px 20px" }}>
            {ALARM_HISTORY.map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                <span style={{ width: 30, height: 30, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, background: "color-mix(in srgb, " + histTone[h.tone] + " 16%, transparent)", color: histTone[h.tone] }}>
                  <Icon name={histIcon[h.icon] || "bell"} size={15} />
                </span>
                <span style={{ fontSize: 13 }}>{h.msg}</span>
                <span className="faint" style={{ marginLeft: "auto", fontSize: 11, whiteSpace: "nowrap" }}>{h.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Sağ: yeni alarm ---- */}
      <div className="card" style={{ position: "sticky", top: 0 }}>
        <div className="section-label">Yeni Alarm</div>
        <label className="faint" style={{ fontSize: 11 }}>Hisse</label>
        <select className="select" value={ticker} onChange={(e) => setTicker(e.target.value)} style={{ margin: "6px 0 16px" }}>
          {STOCKS.map((s) => <option key={s.t} value={s.t}>{s.t} · {s.name}</option>)}
        </select>

        <label className="faint" style={{ fontSize: 11 }}>Alarm Tipi</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "8px 0 16px" }}>
          {TYPES.map((tp) => <button key={tp} className={"chip" + (atype === tp ? " active" : "")} onClick={() => setAtype(tp)}>{tp}</button>)}
        </div>

        <label className="faint" style={{ fontSize: 11 }}>{atype.includes("RSI") ? "RSI Seviyesi" : "Fiyat ($)"}</label>
        <input className="input" type="number" placeholder={atype.includes("RSI") ? "70" : "330.00"} value={level} onChange={(e) => setLevel(e.target.value)} style={{ margin: "6px 0 16px" }} />

        <button className="btn btn--accent" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }} onClick={add}>
          <Icon name="plus" size={16} /> Alarm Ekle
        </button>

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", fontSize: 12 }} className="muted">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="bell" size={14} /> Tetiklenen alarmlar anlık bildirim ve sabah brifingine eklenir.
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Alarms });
