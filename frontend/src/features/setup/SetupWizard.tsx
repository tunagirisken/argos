import { useState } from "react";
import { Icon } from "../../components/icons/Icon";
import { fmtUSD } from "../../lib/format";
import { api } from "../../services/api";
import { ThemeToggle } from "../../components/ui/ThemeToggle";

const V = {
  anthropic: (v: string) => /^sk-ant-[\w-]{6,}/.test(v.trim()),
  botToken: (v: string) => /^\d{6,}:[\w-]{20,}$/.test(v.trim()),
  chatId: (v: string) => /^-?\d{5,}$/.test(v.trim()),
  firecrawl: (v: string) => /^fc-[\w-]{4,}/.test(v.trim()),
  exa: (v: string) => v.trim().length >= 8,
  sentry: (v: string) => /^https?:\/\/.+/.test(v.trim()),
};

const API_FIELDS = [
  { key: "anthropic", label: "Anthropic API Key", req: true, ph: "sk-ant-...", link: "https://console.anthropic.com" },
  { key: "botToken", label: "Telegram Bot Token", req: true, ph: "1234567890:AAF...", link: "https://t.me/BotFather" },
  { key: "chatId", label: "Telegram Chat ID", req: true, ph: "-100123456789", link: "https://t.me/userinfobot" },
  { key: "firecrawl", label: "Firecrawl API Key", req: false, ph: "fc-...", link: "https://firecrawl.dev" },
  { key: "exa", label: "Exa API Key", req: false, ph: "exa anahtarınız", link: "https://exa.ai" },
  { key: "sentry", label: "Sentry DSN", req: false, ph: "https://...@sentry.io/...", link: "https://sentry.io" },
] as const;

type EnvKey = (typeof API_FIELDS)[number]["key"];

interface PositionRow {
  id: number;
  symbol: string;
  shares: number;
  avg_cost: number;
  enter?: boolean;
}

function SecretField({
  f,
  value,
  onChange,
}: {
  f: (typeof API_FIELDS)[number];
  value: string;
  onChange: (k: EnvKey, v: string) => void;
}) {
  const [show, setShow] = useState(false);
  const valid = V[f.key](value || "");
  const touched = (value || "").trim().length > 0;
  const state = !touched ? "" : valid ? "valid" : "invalid";
  return (
    <div className="field">
      <div className="field__top">
        <label>{f.label}</label>
        <span className={`req-badge ${f.req ? "req" : "opt"}`}>{f.req ? "ZORUNLU" : "OPSİYONEL"}</span>
        <a className="field__link" href={f.link} target="_blank" rel="noreferrer">
          <Icon name="external" size={15} />
        </a>
      </div>
      <div className={`field__wrap ${state}`}>
        <input
          type={show ? "text" : "password"}
          placeholder={f.ph}
          value={value}
          autoComplete="off"
          onChange={(e) => onChange(f.key, e.target.value)}
        />
        <button type="button" className="field__icon-btn" onClick={() => setShow((s) => !s)} tabIndex={-1}>
          <Icon name={show ? "moon" : "eye"} size={15} />
        </button>
        <span className="field__status">
          {touched && (valid ? <span className="pos"><Icon name="check" size={16} /></span> : <span className="neg"><Icon name="x" size={16} /></span>)}
        </span>
      </div>
    </div>
  );
}

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState("right");
  const [busy, setBusy] = useState(false);
  const [env, setEnv] = useState<Record<string, string>>({});
  const [cash, setCash] = useState("");
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [sym, setSym] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");

  const reqOk = API_FIELDS.filter((f) => f.req).every((f) => V[f.key](env[f.key] || ""));
  const portfolioOk = positions.length >= 1;

  const addPosition = () => {
    if (!sym.trim() || +shares <= 0 || +cost <= 0) return;
    setPositions((p) => [
      ...p,
      { id: Date.now(), symbol: sym.trim().toUpperCase(), shares: +shares, avg_cost: +cost, enter: true },
    ]);
    setSym("");
    setShares("");
    setCost("");
  };

  const next = async () => {
    setBusy(true);
    try {
      if (step === 1) {
        await api.setupEnv(env);
        setDir("right");
        setStep(2);
      } else if (step === 2) {
        await api.setupPortfolio({
          cash_usd: +cash || 0,
          positions: positions.map(({ symbol, shares, avg_cost }) => ({
            symbol,
            shares,
            avg_cost,
          })),
          pending_orders: [],
        });
        setDir("right");
        setStep(3);
      } else {
        await api.setupComplete();
        onComplete();
      }
    } finally {
      setBusy(false);
    }
  };

  const labels = ["API Anahtarları", "Portföy", "Hazır"];
  const nextDisabled = busy || (step === 1 && !reqOk) || (step === 2 && !portfolioOk);
  const nextLabel = step === 1 ? "İleri →" : step === 2 ? "Kaydet ve Devam →" : "Dashboard'a Git →";

  return (
    <div className="setup">
      <div className="setup__theme">
        <ThemeToggle />
      </div>
      <div className="setup__brand">
        <span className="mark">
          <Icon name="eye" size={22} />
        </span>
        <span className="word">ARGOS</span>
      </div>
      <div className="setup__card">
        <div className="setup__progress">
          {labels.map((l, i) => (
            <span key={l} style={{ display: "contents" }}>
              {i > 0 && <span className={`setup-line${step > i ? " done" : ""}`} />}
              <div className={`setup-step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
                <span className="ring">
                  {step > i + 1 ? <Icon name="check" size={15} /> : i + 1}
                </span>
                <span className="lbl">{l}</span>
              </div>
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className={`step-enter-${dir}`}>
            <div className="setup__head">
              <h2>
                <span style={{ color: "var(--t-accent)" }}>
                  <Icon name="eye" size={24} />
                </span>{" "}
                ARGOS'u Yapılandır
              </h2>
              <p>
                API anahtarları yalnızca yerel <span className="mono">.env</span> dosyasına yazılır.
              </p>
            </div>
            {API_FIELDS.map((f) => (
              <SecretField key={f.key} f={f} value={env[f.key] || ""} onChange={(k, v) => setEnv((e) => ({ ...e, [k]: v }))} />
            ))}
          </div>
        )}

        {step === 2 && (
          <div className={`step-enter-${dir}`}>
            <div className="setup__head">
              <h2>
                <Icon name="dashboard" size={22} /> Portföyünüzü Ekleyin
              </h2>
              <p>Stop-loss ve hedef ARGOS tarafından otomatik belirlenir.</p>
            </div>
            <div className="field">
              <div className="field__top">
                <label>Mevcut USD Nakit</label>
              </div>
              <div className="field__wrap">
                <span className="faint mono">$</span>
                <input type="number" placeholder="0.00" value={cash} onChange={(e) => setCash(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <div className="field__top">
                <label>Hisse Ekle</label>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 1fr auto", gap: 8 }}>
                <div className="field__wrap" style={{ padding: "0 10px" }}>
                  <input placeholder="Sembol" value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} />
                </div>
                <div className="field__wrap" style={{ padding: "0 10px" }}>
                  <input type="number" step="0.01" placeholder="Adet" value={shares} onChange={(e) => setShares(e.target.value)} />
                </div>
                <div className="field__wrap" style={{ padding: "0 10px" }}>
                  <span className="faint mono">$</span>
                  <input type="number" step="0.01" placeholder="Ort. Alış" value={cost} onChange={(e) => setCost(e.target.value)} />
                </div>
                <button type="button" className="btn btn--accent" onClick={addPosition}>
                  + Ekle
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {positions.length === 0 ? (
                <div style={{ textAlign: "center", padding: 26, color: "var(--text-muted)", fontSize: 13, border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)" }}>
                  Henüz hisse eklenmedi.
                </div>
              ) : (
                positions.map((p) => (
                  <div key={p.id} className={`pos-row${p.enter ? " enter" : ""}`}>
                    <span className="mono" style={{ fontWeight: 700 }}>{p.symbol}</span>
                    <span className="muted">{p.shares} hisse @ {fmtUSD(p.avg_cost)}</span>
                    <button type="button" className="btn btn--ghost" style={{ marginLeft: "auto" }} onClick={() => setPositions((x) => x.filter((r) => r.id !== p.id))}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={`step-enter-${dir}`}>
            <div className="setup__head" style={{ textAlign: "center" }}>
              <h2 style={{ justifyContent: "center" }}>
                <span className="pos">
                  <Icon name="check" size={24} />
                </span>{" "}
                ARGOS Hazır!
              </h2>
            </div>
            <div className="summary-card glow-accent">
              <div className="big-mark">
                <Icon name="eye" size={28} />
              </div>
              <div style={{ fontWeight: 700, letterSpacing: "0.14em", marginBottom: 14 }}>ARGOS</div>
              {[`${positions.length} hisse eklendi`, "API bağlantısı kuruldu", "Telegram bildirimleri aktif", "Alarm motoru hazır"].map((l) => (
                <div className="summary-line" key={l}>
                  <span className="tick">
                    <Icon name="check" size={16} />
                  </span>{" "}
                  {l}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="setup__footer">
          {step > 1 && (
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => { setDir("left"); setStep((s) => s - 1); }}>
              <Icon name="back" size={15} /> Geri
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="btn btn--accent" onClick={next} disabled={nextDisabled} style={{ opacity: nextDisabled ? 0.5 : 1 }}>
            {busy ? "Kaydediliyor…" : nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
