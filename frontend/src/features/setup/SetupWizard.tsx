import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArgosCube } from "../../components/brand/ArgosCube";
import { StockLogo } from "../../components/stocks/StockLogo";
import { StockSymbolSearch } from "../../components/stocks/StockSymbolSearch";
import { Icon } from "../../components/icons/Icon";
import { fmtUSD } from "../../lib/format";
import { api } from "../../services/api";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { useAuthStore } from "../../store/authStore";

const V = {
  anthropic: (v: string) => /^sk-ant-[\w-]{6,}/.test(v.trim()),
  gemini: (v: string) => v.trim().length >= 8,
  botToken: (v: string) => /^\d{6,}:[\w-]{20,}$/.test(v.trim()),
  chatId: (v: string) => /^-?\d{5,}$/.test(v.trim()),
  firecrawl: (v: string) => !v.trim() || /^fc-[\w-]{4,}/.test(v.trim()),
  exa: (v: string) => !v.trim() || v.trim().length >= 8,
  sentry: (v: string) => !v.trim() || /^https?:\/\/.+/.test(v.trim()),
};

const API_FIELDS = [
  { key: "botToken" as const, label: "Telegram Bot Token", req: true, ph: "1234567890:AAF...", link: "https://t.me/BotFather" },
  { key: "chatId" as const, label: "Telegram Chat ID", req: true, ph: "-100123456789", link: "https://t.me/userinfobot" },
  { key: "firecrawl" as const, label: "Firecrawl API Key", req: false, ph: "fc-...", link: "https://firecrawl.dev" },
  { key: "exa" as const, label: "Exa API Key", req: false, ph: "exa anahtarınız", link: "https://exa.ai" },
  { key: "sentry" as const, label: "Sentry DSN", req: false, ph: "https://...@sentry.io/...", link: "https://sentry.io" },
];

const LLM_FIELDS = [
  { key: "gemini" as const, label: "Gemini API Key", provider: "gemini" as const, ph: "AIza...", link: "https://aistudio.google.com/apikey" },
  { key: "anthropic" as const, label: "Anthropic API Key", provider: "anthropic" as const, ph: "sk-ant-...", link: "https://console.anthropic.com" },
];

type EnvKey = (typeof API_FIELDS)[number]["key"] | (typeof LLM_FIELDS)[number]["key"];

type SecretFieldConfig = {
  key: EnvKey;
  label: string;
  req: boolean;
  ph: string;
  link: string;
};

function SecretField({
  f,
  value,
  onChange,
}: {
  f: SecretFieldConfig;
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
          {touched &&
            (valid ? (
              <span className="pos">
                <Icon name="check" size={16} />
              </span>
            ) : (
              <span className="neg">
                <Icon name="x" size={16} />
              </span>
            ))}
        </span>
      </div>
    </div>
  );
}

interface PositionRow {
  id: number;
  symbol: string;
  shares: number;
  avg_cost: number;
  enter?: boolean;
}

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState("right");
  const [busy, setBusy] = useState(false);
  const [llmProvider, setLlmProvider] = useState<"gemini" | "anthropic">("gemini");
  const [env, setEnv] = useState<Record<string, string>>({});
  const [cash, setCash] = useState("");
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [sym, setSym] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [editId, setEditId] = useState<number | null>(null);

  const llmField = LLM_FIELDS.find((f) => f.provider === llmProvider)!;
  const llmOk = V[llmField.key](env[llmField.key] || "");
  const reqOk = llmOk && API_FIELDS.filter((f) => f.req).every((f) => V[f.key](env[f.key] || ""));
  const optionalOk = API_FIELDS.filter((f) => !f.req).every((f) => V[f.key](env[f.key] || ""));
  const step1Ok = reqOk && optionalOk;
  const canAdd = sym.trim() && +shares > 0 && +cost > 0;
  const portfolioOk = positions.length >= 1;

  const addOrSave = () => {
    if (!canAdd) return;
    const rec = { symbol: sym.trim().toUpperCase(), shares: +shares, avg_cost: +cost };
    if (editId) {
      setPositions((p) => p.map((row) => (row.id === editId ? { ...row, ...rec } : row)));
      setEditId(null);
    } else {
      setPositions((p) => [...p, { id: Date.now(), enter: true, ...rec }]);
    }
    setSym("");
    setShares("");
    setCost("");
  };

  const editPosition = (p: PositionRow) => {
    setSym(p.symbol);
    setShares(String(p.shares));
    setCost(String(p.avg_cost));
    setEditId(p.id);
  };

  const next = async () => {
    setBusy(true);
    try {
      if (step === 1) {
        await api.setupEnv({ ...env, llmProvider });
        setDir("right");
        setStep(2);
      } else if (step === 2) {
        await api.setupPortfolio({
          cash_usd: +cash || 0,
          positions: positions.map(({ symbol, shares: sh, avg_cost }) => ({
            symbol,
            shares: sh,
            avg_cost,
          })),
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
  const nextDisabled = busy || (step === 1 && !step1Ok) || (step === 2 && !portfolioOk);
  const nextLabel = step === 1 ? "İleri →" : step === 2 ? "Kaydet ve Devam →" : "Dashboard'a Git →";

  const goHome = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="setup">
      <div className="setup__theme">
        <ThemeToggle />
      </div>
      <button type="button" className="setup__brand" onClick={goHome} aria-label="Ana sayfaya dön">
        <span className="mark">
          <ArgosCube size={18} />
        </span>
        <span className="word">ARGOS</span>
      </button>
      <div className="setup__card">
        <div className="setup__progress">
          {labels.map((l, i) => (
            <span key={l} style={{ display: "contents" }}>
              {i > 0 && <span className={`setup-line${step > i ? " done" : ""}`} />}
              <div className={`setup-step ${step === i + 1 ? "active" : step > i + 1 ? "done" : ""}`}>
                <span className="ring">{step > i + 1 ? <Icon name="check" size={15} /> : i + 1}</span>
                <span className="lbl">{l}</span>
              </div>
            </span>
          ))}
        </div>

        {step === 1 && (
          <div className={`step-enter-${dir}`}>
            <div className="setup__head">
              <h2>
                <ArgosCube size={20} /> ARGOS'u Yapılandır
              </h2>
              <p>
                Servislere bağlanmak için API anahtarlarınızı girin. Anahtarlar yalnızca yerel{" "}
                <span className="mono">.env</span> dosyasına yazılır.
              </p>
            </div>
            <div className="field">
              <div className="field__top">
                <label>LLM Sağlayıcı</label>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(["gemini", "anthropic"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn ${llmProvider === p ? "btn--accent" : "btn--ghost"}`}
                    onClick={() => setLlmProvider(p)}
                  >
                    {p === "gemini" ? "Google Gemini" : "Anthropic Claude"}
                  </button>
                ))}
              </div>
            </div>
            <SecretField
              f={{ ...llmField, req: true }}
              value={env[llmField.key] || ""}
              onChange={(k, v) => setEnv((e) => ({ ...e, [k]: v }))}
            />
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
              <p>Midas uygulamasındaki hisselerinizi manuel olarak girin. Stop-loss ve hedef ARGOS tarafından otomatik belirlenir.</p>
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
                <label>{editId ? "Pozisyonu Düzenle" : "Hisse Ekle"}</label>
              </div>
              <div className="setup-stock-row setup-stock-row--search">
                <StockSymbolSearch value={sym} onChange={setSym} placeholder="NVDA, Apple…" />
                <div className="field__wrap" style={{ padding: "0 10px" }}>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Adet"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addOrSave()}
                  />
                </div>
                <div className="field__wrap" style={{ padding: "0 10px" }}>
                  <span className="faint mono">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ort. Alış"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addOrSave()}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn--accent"
                  disabled={!canAdd}
                  style={{ opacity: canAdd ? 1 : 0.5, whiteSpace: "nowrap" }}
                  onClick={addOrSave}
                >
                  {editId ? "Kaydet" : "+ Ekle"}
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
              {positions.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "26px 16px",
                    color: "var(--text-muted)",
                    fontSize: 13,
                    border: "1px dashed var(--border-default)",
                    borderRadius: "var(--radius-md)",
                    lineHeight: 1.6,
                  }}
                >
                  Henüz hisse eklenmedi.
                  <br />
                  Yukarıdaki formu kullanarak ilk pozisyonunuzu ekleyin.
                </div>
              ) : (
                positions.map((p) => (
                  <div key={p.id} className={`pos-row${p.enter ? " enter" : ""}`}>
                    <StockLogo symbol={p.symbol} size={28} />
                    <span className="mono" style={{ fontWeight: 700, minWidth: 56 }}>
                      {p.symbol}
                    </span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      {p.shares} hisse
                    </span>
                    <span className="faint" style={{ fontSize: 13 }}>
                      @
                    </span>
                    <span className="mono" style={{ fontSize: 13 }}>
                      {fmtUSD(p.avg_cost)}
                    </span>
                    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button type="button" className="btn btn--ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => editPosition(p)}>
                        Düzenle
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        style={{ padding: 7, lineHeight: 0 }}
                        onClick={() => setPositions((x) => x.filter((r) => r.id !== p.id))}
                        title="Sil"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={`step-enter-${dir}`}>
            <div className="setup__head" style={{ textAlign: "center", marginBottom: 24 }}>
              <h2 style={{ justifyContent: "center" }}>
                <span className="pos">
                  <Icon name="check" size={24} />
                </span>{" "}
                ARGOS Hazır!
              </h2>
              <p style={{ maxWidth: 360, margin: "7px auto 0" }}>
                Her şey ayarlandı. ARGOS artık portföyünüzü 7/24 izlemeye hazır.
              </p>
            </div>
            <div className="summary-card glow-accent">
              <div className="big-mark">
                <ArgosCube size={24} />
              </div>
              <div style={{ fontWeight: 700, letterSpacing: "0.14em", marginBottom: 14 }}>ARGOS</div>
              {[
                `${positions.length} hisse eklendi`,
                "API bağlantısı kuruldu",
                "Telegram bildirimleri aktif",
                "Alarm motoru hazır",
              ].map((l) => (
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
            <button
              type="button"
              className="btn btn--ghost"
              disabled={busy}
              onClick={() => {
                setDir("left");
                setStep((s) => s - 1);
              }}
            >
              <Icon name="back" size={15} /> Geri
            </button>
          )}
          <div className="spacer" />
          <button
            type="button"
            className="btn btn--accent"
            onClick={next}
            disabled={nextDisabled}
            style={{ opacity: nextDisabled ? 0.5 : 1, minWidth: 150 }}
          >
            {busy ? "Kaydediliyor…" : nextLabel}
          </button>
        </div>
      </div>

      {step === 1 && !step1Ok ? (
        <div className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: "center", maxWidth: 420 }}>
          Devam etmek için 3 zorunlu alanı geçerli formatta doldurun.
        </div>
      ) : null}
    </div>
  );
}
