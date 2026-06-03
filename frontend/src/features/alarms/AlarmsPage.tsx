import { useEffect, useState } from "react";
import { Icon } from "../../components/icons/Icon";
import { api } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";
import type { AlarmRow } from "../../types";

const TYPES = ["price_above", "price_below", "stop_loss"];
const TYPE_LABELS: Record<string, string> = {
  price_above: "Fiyat ↑",
  price_below: "Fiyat ↓",
  stop_loss: "Stop-loss",
};

const HIST = [
  { icon: "up", msg: "RSI aşırı alım uyarısı", time: "8 dk önce", tone: "warn" },
  { icon: "bell", msg: "Hedef fiyat yaklaşıyor", time: "1 sa önce", tone: "info" },
];

export function AlarmsPage() {
  const stocks = usePortfolioStore((s) => s.stocks);
  const [alarms, setAlarms] = useState<AlarmRow[]>([]);
  const [log, setLog] = useState<Record<string, unknown>[]>([]);
  const [ticker, setTicker] = useState(stocks[0]?.t ?? "MRVL");
  const [atype, setAtype] = useState("price_above");
  const [level, setLevel] = useState("");

  const load = () => {
    api.getAlerts().then((a) =>
      setAlarms(
        (a as Record<string, unknown>[]).map((x) => ({
          id: String(x.id),
          ticker: String(x.symbol),
          type: TYPE_LABELS[String(x.condition)] || String(x.condition),
          level: Number(x.value),
          current: 0,
          status: x.enabled === false ? "pasif" : "aktif",
        }))
      )
    );
    api.getAlertLog().then(setLog).catch(() => setLog([]));
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!level) return;
    await api.createAlert({
      symbol: ticker,
      condition: atype,
      value: +level,
      message: `${ticker} ${atype} ${level}`,
    });
    setLevel("");
    load();
  };

  const remove = async (id: string) => {
    await api.deleteAlert(id);
    load();
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 18 }}>
      <div>
        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <span className="section-label" style={{ margin: 0 }}>
              Aktif Alarmlar
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", fontSize: 11 }}>
                {["Hisse", "Tür", "Seviye", "Durum", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "10px 20px" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alarms.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <td className="mono" style={{ padding: "13px 20px", fontWeight: 600 }}>
                    {a.ticker}
                  </td>
                  <td style={{ padding: "13px 20px" }} className="muted">
                    {a.type}
                  </td>
                  <td className="mono" style={{ padding: "13px 20px" }}>
                    {a.level}
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <span className="badge badge--buy">{a.status}</span>
                  </td>
                  <td style={{ padding: "13px 20px" }}>
                    <button type="button" className="btn btn--ghost" onClick={() => remove(String(a.id))}>
                      <Icon name="x" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="section-label">Alarm Geçmişi</div>
        <div className="card">
          {(log.length ? log : HIST).map((h, i) => (
            <div
              key={i}
              style={{
                padding: "13px 0",
                borderTop: i ? "1px solid var(--border-subtle)" : "none",
                fontSize: 13,
              }}
            >
              {String((h as { message?: string }).message || (h as { msg?: string }).msg || JSON.stringify(h))}
              <span className="faint" style={{ float: "right", fontSize: 11 }}>
                {String((h as { timestamp?: string }).timestamp || (h as { time?: string }).time || "")}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ position: "sticky", top: 0 }}>
        <div className="section-label">Yeni Alarm</div>
        <select className="select" value={ticker} onChange={(e) => setTicker(e.target.value)} style={{ marginBottom: 12 }}>
          {stocks.map((s) => (
            <option key={s.t} value={s.t}>
              {s.t}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
          {TYPES.map((tp) => (
            <button key={tp} type="button" className={`chip${atype === tp ? " active" : ""}`} onClick={() => setAtype(tp)}>
              {TYPE_LABELS[tp]}
            </button>
          ))}
        </div>
        <input className="input mono" type="number" placeholder="Seviye" value={level} onChange={(e) => setLevel(e.target.value)} />
        <button type="button" className="btn btn--accent" style={{ width: "100%", marginTop: 16 }} onClick={add}>
          <Icon name="plus" size={16} /> Alarm Ekle
        </button>
      </div>
    </div>
  );
}
