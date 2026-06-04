import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../components/icons/Icon";
import { fmtUSD } from "../../lib/format";
import { api, type DiscoveryOpportunity, type DiscoveryReport } from "../../services/api";

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? "var(--positive)" : pct >= 50 ? "var(--t-accent)" : "var(--warning)";
  return (
    <div className="rangebar" style={{ marginTop: 8 }}>
      <div className="rangebar__fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function OpportunityCard({ opp, onOpen }: { opp: DiscoveryOpportunity; onOpen: (sym: string) => void }) {
  const breakdown = Object.entries(opp.breakdown || {});
  return (
    <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div className="panel__head">
        <button
          type="button"
          className="chip"
          onClick={() => onOpen(opp.symbol)}
          style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}
        >
          {opp.symbol}
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          {opp.name}
        </span>
        <span className="badge badge--accent" style={{ marginLeft: "auto" }}>
          {opp.sector}
        </span>
      </div>
      <div className="panel__body">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span className="tnum" style={{ fontSize: 22, fontWeight: 700 }}>
            {opp.score}
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            /100 skor · {opp.decision_horizon}
          </span>
        </div>
        <ScoreBar score={opp.score} />
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, flexWrap: "wrap" }}>
          <span>
            Fiyat <span className="tnum">{fmtUSD(opp.current_price)}</span>
          </span>
          <span>
            Giriş <span className="tnum">{opp.entry_zone}</span>
          </span>
          <span className="muted">{opp.news_count} haber</span>
        </div>
        {breakdown.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
              gap: 6,
              marginTop: 12,
              fontSize: 11,
            }}
          >
            {breakdown.map(([k, v]) => (
              <div key={k} style={{ background: "var(--bg-base)", borderRadius: 6, padding: "6px 8px" }}>
                <div className="faint">{k}</div>
                <div className="tnum" style={{ fontWeight: 600 }}>
                  {Math.round(v)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <p style={{ fontSize: 13, lineHeight: 1.55, marginTop: 14, whiteSpace: "pre-wrap" }}>{opp.thesis}</p>
        <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          ⚠️ {opp.main_risk}
        </p>
      </div>
    </div>
  );
}

export function DiscoveryPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<DiscoveryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDiscoveryLatest();
      setReport(data);
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : "Henüz keşif raporu yok.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatest();
  }, [loadLatest]);

  const runScan = async (force = false) => {
    setScanning(true);
    setError(null);
    try {
      const data = await api.runDiscoveryScan({ force, sendTelegram: false });
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tarama başarısız.");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <span
          className="ticker-logo glow-accent"
          style={{
            background: "color-mix(in srgb, var(--t-accent) 22%, var(--bg-elevated))",
            color: "var(--t-accent)",
          }}
        >
          <Icon name="spark" size={20} />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Keşif Motoru</h1>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
            yfinance tarama · teknik skor · Firecrawl haber · LLM tez
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className="btn btn--ghost" disabled={loading} onClick={loadLatest}>
            Yenile
          </button>
          <button type="button" className="btn btn--accent" disabled={scanning} onClick={() => runScan(false)}>
            <Icon name="play" size={14} /> {scanning ? "Taranıyor…" : "Tara"}
          </button>
          <button type="button" className="btn btn--ghost" disabled={scanning} onClick={() => runScan(true)}>
            Zorla tara
          </button>
        </div>
      </div>

      {report ? (
        <div
          className="faint"
          style={{
            display: "flex",
            gap: 16,
            fontSize: 12,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <span>Son tarama: {formatDate(report.generated_at)}</span>
          <span>{report.scanned_count} hisse tarandı</span>
          {report.prefilter_count != null ? <span>{report.prefilter_count} aday</span> : null}
          <span>{report.opportunities.length} fırsat</span>
        </div>
      ) : null}

      {loading ? (
        <p className="muted">Yükleniyor…</p>
      ) : error && !report ? (
        <div
          style={{
            padding: 24,
            border: "1px dashed var(--border-default)",
            borderRadius: "var(--radius-md)",
            textAlign: "center",
          }}
        >
          <p className="muted" style={{ marginBottom: 12 }}>
            {error.includes("404") || error.includes("Henüz") ? "Henüz keşif raporu yok." : error}
          </p>
          <button type="button" className="btn btn--accent" disabled={scanning} onClick={() => runScan(true)}>
            İlk taramayı başlat
          </button>
        </div>
      ) : report && report.opportunities.length === 0 ? (
        <p className="muted">Tarama tamamlandı; fırsat bulunamadı.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {report?.opportunities.map((opp) => (
            <OpportunityCard key={opp.symbol} opp={opp} onOpen={(sym) => navigate(`/stock/${sym}`)} />
          ))}
        </div>
      )}

      <p className="faint" style={{ fontSize: 11, marginTop: 20 }}>
        {report?.disclaimer || "Yatırım tavsiyesi değildir; kişisel analiz amaçlıdır."}
      </p>
    </div>
  );
}
