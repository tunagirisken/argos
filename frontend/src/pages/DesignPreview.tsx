import { ThemeToggle } from "../components/ui/ThemeToggle";
import { useTheme } from "../theme/ThemeContext";

const SWATCHES: { name: string; var: string }[] = [
  { name: "bg-base", var: "--bg-base" },
  { name: "bg-surface", var: "--bg-surface" },
  { name: "accent", var: "--accent-primary" },
  { name: "positive", var: "--positive" },
  { name: "negative", var: "--negative" },
];

/** Adım 1 doğrulama — token ve tipografi önizlemesi */
export function DesignPreview() {
  const { theme, tweaks } = useTheme();

  return (
    <div className="design-preview">
      <div className="design-preview__header">
        <div>
          <div className="section-label">Adım 1 · Tasarım sistemi</div>
          <h1 className="text-display">ARGOS</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Tema: <span className="mono">{theme}</span> · Aksan:{" "}
            <span className="mono">{tweaks.accent}</span>
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="card glow-accent">
        <div className="faint" style={{ fontSize: 12, marginBottom: 8 }}>
          Hero metrik (mono)
        </div>
        <div className="text-hero mono pos">$12,847.32</div>
        <div className="mono neg" style={{ fontSize: 14, marginTop: 6 }}>
          +2.41% bugün
        </div>
      </div>

      <div className="design-preview__grid">
        <div className="card card--hover">
          <div className="section-label">Token örnekleri</div>
          {SWATCHES.map((s) => (
            <div key={s.name} className="token-swatch">
              <span
                className="token-swatch__box"
                style={{ background: `var(${s.var})` }}
              />
              <span className="mono">{s.name}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="section-label">Badge & buton</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <span className="badge badge--buy">AL</span>
            <span className="badge badge--sell">SAT</span>
            <span className="badge badge--hold">BEKLE</span>
          </div>
          <button type="button" className="btn btn--accent">
            Accent
          </button>
          <button type="button" className="btn btn--ghost" style={{ marginLeft: 8 }}>
            Ghost
          </button>
        </div>

        <div className="card glow-pos">
          <div className="section-label">Range bar</div>
          <div className="rangebar" style={{ marginTop: 12 }}>
            <div className="rangebar__fill ok" style={{ width: "72%" }} />
          </div>
          <p className="faint mono" style={{ marginTop: 10, fontSize: 12 }}>
            NVDA $178.34
          </p>
        </div>
      </div>

      <p className="faint" style={{ marginTop: 24, fontSize: 12 }}>
        Sonraki adım: Shell + routing (Sidebar, Header, MarketPill)
      </p>
    </div>
  );
}
