import { useNavigate } from "react-router-dom";
import { Sparkline } from "../../components/charts/Sparkline";
import { Icon } from "../../components/icons/Icon";
import { fmtPct, fmtUSD } from "../../lib/format";
import { usePortfolioStore } from "../../store/portfolioStore";
import type { Stock } from "../../types";

function stopZone(dist: number) {
  if (dist > 10) return "ok";
  if (dist >= 5) return "warn";
  return "danger";
}

function HeroCard({
  label,
  value,
  sub,
  subTone,
  glow,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  subTone?: string;
  glow?: string;
  icon?: string;
}) {
  return (
    <div className={`card ${glow || ""}`} style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        {icon && (
          <span style={{ color: "var(--text-muted)" }}>
            <Icon name={icon} size={16} />
          </span>
        )}
        <span className="section-label" style={{ margin: 0 }}>
          {label}
        </span>
      </div>
      <div className="mono" style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      {sub && (
        <div className={`mono ${subTone || "muted"}`} style={{ fontSize: 13, marginTop: 12 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function StockCard({ s, onOpen }: { s: Stock; onOpen: (t: string) => void }) {
  const dayPos = s.dayPct >= 0;
  const totPos = s.totalPct >= 0;
  const fillPct = Math.max(4, Math.min(96, ((s.price - s.stop) / (s.target - s.stop)) * 100));
  const zone = stopZone(s.stopDist);
  const sigClass = s.signal === "AL" || s.signal === "GÜÇLÜ AL" ? "buy" : s.signal === "SAT" || s.signal === "GÜÇLÜ SAT" ? "sell" : "hold";

  return (
    <div className="card card--hover" onClick={() => onOpen(s.t)} role="button" tabIndex={0}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <span className="ticker-logo" style={{ background: s.logo }}>
          {s.t.slice(0, 2)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "var(--font-mono)" }}>{s.t}</div>
          <div className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.name}
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Sparkline data={s.closes.slice(-30)} positive={totPos} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
        <span className="mono" style={{ fontSize: 24, fontWeight: 700 }}>
          {fmtUSD(s.price)}
        </span>
        <span className={`mono ${dayPos ? "pos" : "neg"}`} style={{ fontSize: 13, fontWeight: 600 }}>
          {dayPos ? "▲" : "▼"} {fmtPct(s.dayPct)}{" "}
          <span className="faint" style={{ fontWeight: 400 }}>
            bugün
          </span>
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 13 }}>
        <span className="muted">
          Maliyet <span className="mono" style={{ color: "var(--text-primary)" }}>{fmtUSD(s.cost)}</span>
        </span>
        <span className="muted">
          Getiri{" "}
          <span className={`mono ${totPos ? "pos" : "neg"}`} style={{ fontWeight: 600 }}>
            {fmtPct(s.totalPct)}
          </span>
        </span>
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="rangebar">
          <div className={`rangebar__fill ${zone}`} style={{ width: `${fillPct}%` }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontSize: 11 }}>
          <span className="faint mono">Stop {fmtUSD(s.stop, 0)}</span>
          <span className="faint mono">Hedef {fmtUSD(s.target, 0)}</span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 16,
          paddingTop: 14,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <span className={`badge badge--${sigClass}`}>● {s.signal}</span>
        <span className="muted" style={{ fontSize: 12 }}>
          Sinyal
        </span>
        <span style={{ marginLeft: "auto", fontSize: 12 }} className="muted">
          RSI{" "}
          <span
            className="mono"
            style={{
              color:
                s.rsi >= 70 ? "var(--negative)" : s.rsi <= 30 ? "var(--positive)" : "var(--text-primary)",
            }}
          >
            {s.rsi}
          </span>
        </span>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { stocks, summary } = usePortfolioStore();
  const p = summary;

  if (!p) return <div className="page">Yükleniyor…</div>;

  return (
    <div className="page">
      <div style={{ display: "flex", gap: 18, marginBottom: 26 }}>
        <HeroCard
          label="Toplam Değer"
          icon="shield"
          value={fmtUSD(p.totalValue, 0)}
          sub={`Başlangıçtan ${fmtPct(p.totalReturnPct)} · ${fmtUSD(p.totalReturn, 0)}`}
          subTone="pos"
          glow="glow-accent"
        />
        <HeroCard
          label="Bugünkü P&L"
          icon="spark"
          value={(p.dayPL >= 0 ? "+" : "−") + fmtUSD(Math.abs(p.dayPL), 0).slice(1)}
          sub={`${fmtPct(p.dayPct)} günlük değişim`}
          subTone={p.dayPL >= 0 ? "pos" : "neg"}
          glow={p.dayPL >= 0 ? "glow-pos" : "glow-neg"}
        />
        <HeroCard label="Nakit" icon="target" value={fmtUSD(p.cash, 0)} sub="Bekleyen emirler —" />
      </div>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <span className="section-label" style={{ margin: 0 }}>
          Pozisyonlar · {stocks.length} hisse
        </span>
        <span className="faint" style={{ marginLeft: "auto", fontSize: 12 }}>
          Detay için karta tıkla →
        </span>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 18,
        }}
      >
        {stocks.map((s) => (
          <StockCard key={s.t} s={s} onOpen={(t) => navigate(`/stock/${t}`)} />
        ))}
      </div>
    </div>
  );
}
