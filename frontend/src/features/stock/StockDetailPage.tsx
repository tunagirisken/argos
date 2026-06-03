import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MacdMini } from "../../components/charts/MacdMini";
import { PriceChart } from "../../components/charts/PriceChart";
import { RsiGauge } from "../../components/charts/RsiGauge";
import { Icon } from "../../components/icons/Icon";
import { fmtPct, fmtUSD } from "../../lib/format";
import { api } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";

export function StockDetailPage() {
  const { symbol = "MRVL" } = useParams();
  const navigate = useNavigate();
  const stocks = usePortfolioStore((s) => s.stocks);
  const load = usePortfolioStore((s) => s.load);
  const s = stocks.find((x) => x.t === symbol) || stocks[0];
  const [range, setRange] = useState("3A");
  const [mode, setMode] = useState<"candle" | "area">("candle");
  const [overlays, setOverlays] = useState({ ema20: true, ema50: true, ema200: false, bollinger: false });
  const [stop, setStop] = useState(s?.stop ?? 0);
  const [target, setTarget] = useState(s?.target ?? 0);
  const [note, setNote] = useState("");
  const [news, setNews] = useState<{ title: string; url?: string }[]>([]);

  useEffect(() => {
    if (s) {
      setStop(s.stop);
      setTarget(s.target);
    }
  }, [symbol, s]);

  useEffect(() => {
    if (!symbol) return;
    api.getNews(symbol).then(setNews).catch(() => setNews([]));
  }, [symbol]);

  if (!s) return <div className="page">Hisse bulunamadı</div>;

  const dayPos = s.dayPct >= 0;
  const sigClass =
    s.signal === "AL" || s.signal === "GÜÇLÜ AL" ? "buy" : s.signal === "SAT" || s.signal === "GÜÇLÜ SAT" ? "sell" : "hold";

  const savePosition = async () => {
    await api.updatePosition(s.t, { stop_loss: stop, target, note });
    await load();
  };

  return (
    <div className="page">
      <button type="button" className="btn btn--ghost" onClick={() => navigate("/dashboard")} style={{ marginBottom: 18 }}>
        <Icon name="back" size={16} /> Geri
      </button>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.85fr) minmax(280px, 1fr)", gap: 18 }}>
        <div className="card">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <span className="ticker-logo" style={{ background: s.logo, width: 44, height: 44 }}>
              {s.t.slice(0, 2)}
            </span>
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span className="mono" style={{ fontSize: 20, fontWeight: 700 }}>
                  {s.t}
                </span>
                <span className="muted">{s.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 8 }}>
                <span className="mono" style={{ fontSize: 38, fontWeight: 700 }}>
                  {fmtUSD(s.price)}
                </span>
                <span className={`mono ${dayPos ? "pos" : "neg"}`} style={{ fontSize: 15, fontWeight: 600 }}>
                  {dayPos ? "▲" : "▼"} {fmtPct(s.dayPct)} bugün
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "20px 0 6px" }}>
            {["1G", "1H", "3A", "6A", "1Y"].map((r) => (
              <button key={r} type="button" className={`chip${range === r ? " active" : ""}`} onClick={() => setRange(r)}>
                {r}
              </button>
            ))}
            <button type="button" className={`chip${mode === "candle" ? " active" : ""}`} onClick={() => setMode("candle")}>
              Mum
            </button>
            <button type="button" className={`chip${mode === "area" ? " active" : ""}`} onClick={() => setMode("area")}>
              Alan
            </button>
            {(["ema20", "ema50", "ema200", "bollinger"] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`chip${overlays[k] ? " active" : ""}`}
                onClick={() => setOverlays((o) => ({ ...o, [k]: !o[k] }))}
              >
                {k.toUpperCase()}
              </button>
            ))}
          </div>
          <PriceChart stock={s} range={range} mode={mode} overlays={overlays} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card">
            <div className="section-label">Teknik Sinyal</div>
            <span className={`badge badge--${sigClass}`} style={{ fontSize: 16, padding: "8px 18px" }}>
              ● {s.signal}
            </span>
            <div className="rangebar" style={{ margin: "14px 0" }}>
              <div className="rangebar__fill" style={{ width: `${s.confidence}%`, background: "var(--t-accent)" }} />
            </div>
            <RsiGauge value={s.rsi} />
            <MacdMini data={s.macd} />
          </div>
          <div className="card">
            <div className="section-label">Pozisyon</div>
            <div className="mono" style={{ fontSize: 13, marginBottom: 12 }}>
              {s.qty} hisse · maliyet {fmtUSD(s.cost)} · P/L {fmtPct(s.totalPct)}
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <label className="faint" style={{ flex: 1 }}>
                Stop
                <input className="input mono" type="number" value={stop} onChange={(e) => setStop(+e.target.value)} style={{ marginTop: 4 }} />
              </label>
              <label className="faint" style={{ flex: 1 }}>
                Hedef
                <input className="input mono" type="number" value={target} onChange={(e) => setTarget(+e.target.value)} style={{ marginTop: 4 }} />
              </label>
            </div>
            <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Not" />
            <button type="button" className="btn btn--accent" style={{ width: "100%", marginTop: 12 }} onClick={savePosition}>
              Güncelle
            </button>
          </div>
          <div className="card">
            <div className="section-label">Haberler</div>
            {news.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>
                Haber yok veya API anahtarı eksik.
              </p>
            ) : (
              news.slice(0, 5).map((n, i) => (
                <div key={i} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                  <a href={n.url} target="_blank" rel="noreferrer" style={{ color: "var(--text-primary)", fontSize: 13 }}>
                    {n.title}
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
