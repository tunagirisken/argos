import { Icon } from "../icons/Icon";
import type { TradeSignal } from "../../types";

const COMPONENT_LABELS: Record<string, string> = {
  rsi: "RSI",
  macd: "MACD",
  bb: "Bollinger",
  ema: "EMA20",
  momentum: "Momentum",
  news: "Haber",
};

function decisionClass(decision: string) {
  if (decision === "AL") return "buy";
  if (decision === "SAT") return "sell";
  return "hold";
}

type Props = {
  data: TradeSignal | null;
  loading?: boolean;
  error?: string;
  compact?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
};

export function TradeSignalCard({ data, loading, error, compact, onRefresh, refreshing }: Props) {
  if (loading) {
    return (
      <div className="card">
        <div className="section-label">Trade Asistanı</div>
        <p className="muted" style={{ fontSize: 13 }}>
          Skor hesaplanıyor…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="section-label">Trade Asistanı</div>
        <p className="neg" style={{ fontSize: 13 }}>
          {error}
        </p>
        {onRefresh ? (
          <button type="button" className="btn btn--ghost" style={{ marginTop: 10 }} onClick={onRefresh}>
            Tekrar dene
          </button>
        ) : null}
      </div>
    );
  }

  if (!data) return null;

  const cls = decisionClass(data.decision);
  const scorePct = Math.min(100, Math.max(0, ((data.score_display + 5) / 10) * 100));

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div className="section-label" style={{ margin: 0 }}>
          Trade Asistanı
        </div>
        {onRefresh ? (
          <button
            type="button"
            className="btn btn--ghost"
            style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12 }}
            disabled={refreshing}
            onClick={onRefresh}
          >
            <Icon name="spark" size={14} /> {refreshing ? "…" : "Yenile"}
          </button>
        ) : null}
      </div>
      <span className={`badge badge--${cls}`} style={{ fontSize: compact ? 14 : 16, padding: compact ? "6px 14px" : "8px 18px" }}>
        ● {data.decision}
      </span>
      <div className="mono muted" style={{ fontSize: 12, marginTop: 8 }}>
        Skor {data.score_display}/5 · Güven {data.confidence}
        {data.price != null ? ` · ${data.price.toFixed(2)} USD` : ""}
      </div>
      <div className="rangebar" style={{ margin: "12px 0" }}>
        <div
          className={`rangebar__fill ${cls === "buy" ? "" : cls === "sell" ? "neg" : ""}`}
          style={{
            width: `${scorePct}%`,
            background: cls === "buy" ? "var(--positive)" : cls === "sell" ? "var(--negative)" : "var(--t-accent)",
          }}
        />
      </div>
      {!compact ? (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 12 }}>
          {Object.entries(data.components).map(([k, v]) => (
            <li
              key={k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <span className="muted">{COMPONENT_LABELS[k] || k}</span>
              <span className={`mono ${v > 0 ? "pos" : v < 0 ? "neg" : ""}`}>
                {v > 0 ? "+" : ""}
                {v}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          Teknik {data.tech_sum ?? "—"} · Haber {data.news_score ?? 0}
        </p>
      )}
      {data.position?.avg_cost != null ? (
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Pozisyon maliyet ${data.position.avg_cost.toFixed(2)} · getiri{" "}
          <span className={data.position.return_pct >= 0 ? "pos" : "neg"}>
            {data.position.return_pct >= 0 ? "+" : ""}
            {data.position.return_pct.toFixed(2)}%
          </span>
        </p>
      ) : null}
      {data.last_decision && data.last_decision !== data.decision ? (
        <p className="faint" style={{ fontSize: 11, marginTop: 6 }}>
          Son Telegram kararı: {data.last_decision}
        </p>
      ) : null}
      <p className="faint" style={{ fontSize: 11, marginTop: 10 }}>
        Teknik %70 + haber %30 · eşik ±2.5
      </p>
    </div>
  );
}
