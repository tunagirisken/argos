import { useEffect, useState } from "react";
import { Icon } from "../../components/icons/Icon";
import { fmtPct, fmtUSD } from "../../lib/format";
import { api } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";
import type { AlarmRow } from "../../types";

const ALARM_TYPES = [
  { id: "price_above", label: "Fiyat ↑" },
  { id: "price_below", label: "Fiyat ↓" },
  { id: "stop_loss", label: "Stop-loss" },
  { id: "rsi_high", label: "RSI > 70" },
  { id: "volume", label: "Hacim" },
] as const;

type AlarmTypeId = (typeof ALARM_TYPES)[number]["id"];

function parseUiType(message: string, condition: string): string {
  const match = message.match(/^\[ui:([^\]]+)\]/);
  if (match) return match[1];
  const found = ALARM_TYPES.find((t) => t.id === condition);
  return found?.label ?? condition;
}

function toBackendCondition(type: AlarmTypeId): string {
  if (type === "price_below" || type === "stop_loss") return "price_below";
  return "price_above";
}

export function AlarmsPage() {
  const stocks = usePortfolioStore((s) => s.stocks);
  const [alarms, setAlarms] = useState<AlarmRow[]>([]);
  const [log, setLog] = useState<Record<string, unknown>[]>([]);
  const [ticker, setTicker] = useState(stocks[0]?.t ?? "");
  const [atype, setAtype] = useState<AlarmTypeId>("price_above");
  const [level, setLevel] = useState("");
  const [flashId, setFlashId] = useState<string | null>(null);

  const load = () => {
    api.getAlerts().then((a) =>
      setAlarms(
        (a as Record<string, unknown>[]).map((x) => ({
          id: String(x.id),
          ticker: String(x.symbol),
          type: parseUiType(String(x.message || ""), String(x.condition)),
          level: Number(x.value),
          current: Number(x.current_price) || 0,
          status: x.enabled === false ? "pasif" : "aktif",
        }))
      )
    );
    api.getAlertLog().then(setLog).catch(() => setLog([]));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (stocks[0]?.t) setTicker((t) => t || stocks[0].t);
  }, [stocks]);

  const add = async () => {
    if (!level) return;
    const label = ALARM_TYPES.find((t) => t.id === atype)?.label ?? atype;
    const res = await api.createAlert({
      symbol: ticker,
      condition: toBackendCondition(atype),
      value: +level,
      message: `[ui:${label}] ${ticker} ${label} ${level}`,
    });
    setLevel("");
    load();
    const newId = String((res as { id?: string }).id ?? Date.now());
    setFlashId(newId);
    window.setTimeout(() => setFlashId(null), 700);
  };

  const remove = async (id: string) => {
    await api.deleteAlert(id);
    load();
  };

  const histIcon: Record<string, string> = { up: "arrow-up", down: "arrow-down", bell: "bell" };
  const histTone = { pos: "var(--positive)", neg: "var(--negative)", warn: "var(--warning)", info: "var(--info)" };
  const isRsiType = (type: string) => type.includes("RSI");

  return (
    <div className="page alarms-layout">
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <span className="section-label" style={{ margin: 0 }}>
              Aktif Alarmlar
            </span>
            <span className="badge badge--accent" style={{ marginLeft: 10 }}>
              {alarms.filter((a) => a.status === "aktif").length}
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {["Hisse", "Tür", "Seviye", "Mevcut", "Uzaklık", "Durum", ""].map((h, i) => (
                  <th
                    key={h || i}
                    style={{ textAlign: i > 1 && i < 5 ? "right" : "left", padding: "10px 20px", fontWeight: 600 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alarms.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "24px 20px", textAlign: "center" }} className="muted">
                    Henüz alarm yok. Sağ panelden ekleyin.
                  </td>
                </tr>
              ) : (
                alarms.map((a) => {
                  const stock = stocks.find((s) => s.t === a.ticker);
                  const current = isRsiType(a.type) ? stock?.rsi ?? a.current : stock?.price ?? a.current;
                  const dist = current ? ((a.level - current) / current) * 100 : 0;
                  const near = !isRsiType(a.type) && Math.abs(dist) < 4;
                  const triggered = a.status === "tetiklendi";
                  return (
                    <tr
                      key={a.id}
                      className={flashId === a.id ? "flash-pos" : ""}
                      style={{ borderTop: "1px solid var(--border-subtle)" }}
                    >
                      <td style={{ padding: "13px 20px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 600,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 2,
                              background: stock?.logo || "var(--accent-primary)",
                            }}
                          />
                          {a.ticker}
                        </span>
                      </td>
                      <td style={{ padding: "13px 20px" }} className="muted">
                        {a.type}
                      </td>
                      <td style={{ padding: "13px 20px", textAlign: "right" }} className="mono">
                        {isRsiType(a.type) ? a.level : fmtUSD(a.level, 0)}
                      </td>
                      <td style={{ padding: "13px 20px", textAlign: "right" }} className="mono muted">
                        {isRsiType(a.type) ? current : fmtUSD(current, 0)}
                      </td>
                      <td style={{ padding: "13px 20px", textAlign: "right" }} className={`mono ${near ? "neg" : ""}`}>
                        {isRsiType(a.type) ? (a.level - current).toFixed(0) : fmtPct(dist, 1)}
                      </td>
                      <td style={{ padding: "13px 20px" }}>
                        <span
                          className={`badge ${triggered ? "badge--sell" : "badge--buy"}`}
                          style={triggered ? { animation: "pulse-danger 1.4s infinite" } : undefined}
                        >
                          {triggered ? "● tetiklendi" : "● aktif"}
                        </span>
                      </td>
                      <td style={{ padding: "13px 12px", textAlign: "right" }}>
                        <button type="button" className="btn btn--ghost" onClick={() => remove(String(a.id))} style={{ padding: 6 }}>
                          <Icon name="x" size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div>
          <div className="section-label">Alarm Geçmişi</div>
          <div className="card" style={{ padding: "8px 20px" }}>
            {log.length === 0 ? (
              <p className="muted" style={{ padding: "12px 0", fontSize: 13 }}>
                Henüz tetiklenmiş alarm kaydı yok.
              </p>
            ) : (
              log.map((h, i) => {
              const msg = String((h as { message?: string }).message || (h as { msg?: string }).msg || "");
              const time = String((h as { timestamp?: string }).timestamp || (h as { time?: string }).time || "");
              const tone = (h as { tone?: keyof typeof histTone }).tone || "info";
              const icon = (h as { icon?: string }).icon || "bell";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "13px 0",
                    borderTop: i ? "1px solid var(--border-subtle)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      background: `color-mix(in srgb, ${histTone[tone]} 16%, transparent)`,
                      color: histTone[tone],
                    }}
                  >
                    <Icon name={histIcon[icon] || "bell"} size={15} />
                  </span>
                  <span style={{ fontSize: 13 }}>{msg}</span>
                  <span className="faint" style={{ marginLeft: "auto", fontSize: 11, whiteSpace: "nowrap" }}>
                    {time.slice(0, 16)}
                  </span>
                </div>
              );
            })
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ position: "sticky", top: 0 }}>
        <div className="section-label">Yeni Alarm</div>
        <label className="faint" style={{ fontSize: 11 }}>
          Hisse
        </label>
        <select className="select" value={ticker} onChange={(e) => setTicker(e.target.value)} style={{ margin: "6px 0 16px" }}>
          {stocks.map((s) => (
            <option key={s.t} value={s.t}>
              {s.t} · {s.name}
            </option>
          ))}
        </select>
        <label className="faint" style={{ fontSize: 11 }}>
          Alarm Tipi
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: "8px 0 16px" }}>
          {ALARM_TYPES.map((tp) => (
            <button
              key={tp.id}
              type="button"
              className={`chip${atype === tp.id ? " active" : ""}`}
              onClick={() => setAtype(tp.id)}
            >
              {tp.label}
            </button>
          ))}
        </div>
        <label className="faint" style={{ fontSize: 11 }}>
          {atype === "rsi_high" ? "RSI Seviyesi" : "Fiyat ($)"}
        </label>
        <input
          className="input"
          type="number"
          placeholder={atype === "rsi_high" ? "70" : "330.00"}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={{ margin: "6px 0 16px" }}
        />
        <button
          type="button"
          className="btn btn--accent"
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
          onClick={add}
        >
          <Icon name="plus" size={16} /> Alarm Ekle
        </button>
        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 12,
          }}
          className="muted"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="bell" size={14} /> Tetiklenen alarmlar anlık bildirim ve sabah brifingine eklenir.
          </div>
        </div>
      </div>
    </div>
  );
}
