// ============================================================
// ARGOS — Setup Wizard (3 adımlı onboarding)
// Backend localhost:8000 bu prototipte MOCK'lanır (gecikmeli promise).
// Gerçek entegrasyon için: ARGOS-setup-wizard.md
// ============================================================
const { useState } = React;

// ---- Mock backend ----
const setupApi = {
  status() {
    return Promise.resolve({
      setup_complete: localStorage.getItem("argos.setup_complete") === "1",
      has_env: localStorage.getItem("argos.has_env") === "1",
      has_portfolio: localStorage.getItem("argos.has_portfolio") === "1",
    });
  },
  postEnv(body) { return new Promise((r) => setTimeout(() => { localStorage.setItem("argos.has_env", "1"); r({ ok: true }); }, 700)); },
  postPortfolio(body) { return new Promise((r) => setTimeout(() => { localStorage.setItem("argos.has_portfolio", "1"); r({ ok: true }); }, 700)); },
  complete() { return new Promise((r) => setTimeout(() => { localStorage.setItem("argos.setup_complete", "1"); r({ ok: true }); }, 600)); },
};

// ---- Format doğrulayıcılar ----
const V = {
  anthropic: (v) => /^sk-ant-[\w-]{6,}/.test(v.trim()),
  botToken: (v) => /^\d{6,}:[\w-]{20,}$/.test(v.trim()),
  chatId: (v) => /^-?\d{5,}$/.test(v.trim()),
  firecrawl: (v) => /^fc-[\w-]{4,}/.test(v.trim()),
  exa: (v) => v.trim().length >= 8,
  sentry: (v) => /^https?:\/\/.+/.test(v.trim()),
};

const API_FIELDS = [
  { key: "anthropic", label: "Anthropic API Key", req: true, ph: "sk-ant-...", link: "https://console.anthropic.com" },
  { key: "botToken", label: "Telegram Bot Token", req: true, ph: "1234567890:AAF...", link: "https://t.me/BotFather" },
  { key: "chatId", label: "Telegram Chat ID", req: true, ph: "-100123456789", link: "https://t.me/userinfobot" },
  { key: "firecrawl", label: "Firecrawl API Key", req: false, ph: "fc-...", link: "https://firecrawl.dev" },
  { key: "exa", label: "Exa API Key", req: false, ph: "exa anahtarınız", link: "https://exa.ai" },
  { key: "sentry", label: "Sentry DSN", req: false, ph: "https://...@sentry.io/...", link: "https://sentry.io" },
];

// ---- Tek alan ----
function SecretField({ f, value, onChange }) {
  const [show, setShow] = useState(false);
  const v = value || "";
  const valid = V[f.key](v);
  const touched = v.trim().length > 0;
  const state = !touched ? "" : valid ? "valid" : "invalid";
  return (
    <div className="field">
      <div className="field__top">
        <label>{f.label}</label>
        <span className={"req-badge " + (f.req ? "req" : "opt")}>{f.req ? "ZORUNLU" : "OPSİYONEL"}</span>
        <a className="field__link" href={f.link} target="_blank" rel="noreferrer" title={f.link}><Icon name="external" size={15} /></a>
      </div>
      <div className={"field__wrap " + state}>
        <input type={show ? "text" : "password"} placeholder={f.ph} value={v}
          autoComplete="off" spellCheck="false"
          onChange={(e) => onChange(f.key, e.target.value)} />
        <button className="field__icon-btn" onClick={() => setShow((s) => !s)} tabIndex={-1} title={show ? "Gizle" : "Göster"}>
          <Icon name={show ? "moon" : "eye"} size={15} />
        </button>
        <span className="field__status">
          {touched && (valid
            ? <span className="pos"><Icon name="check" size={16} /></span>
            : <span className="neg"><Icon name="x" size={16} /></span>)}
        </span>
      </div>
    </div>
  );
}

// ---- ADIM 1 ----
function Step1ApiKeys({ data, setData, dir }) {
  const set = (k, v) => setData((d) => ({ ...d, env: { ...d.env, [k]: v } }));
  return (
    <div className={"step-enter-" + dir}>
      <div className="setup__head">
        <h2><span style={{ color: "var(--t-accent)" }}><Icon name="eye" size={24} /></span> ARGOS'u Yapılandır</h2>
        <p>Servislere bağlanmak için API anahtarlarınızı girin. Anahtarlar yalnızca yerel <span className="mono">.env</span> dosyasına yazılır.</p>
      </div>
      {API_FIELDS.map((f) => <SecretField key={f.key} f={f} value={data.env[f.key]} onChange={set} />)}
    </div>
  );
}

// ---- ADIM 2 ----
function Step2Portfolio({ data, setData, dir }) {
  const [sym, setSym] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [editId, setEditId] = useState(null);
  const [showPending, setShowPending] = useState(false);
  const [pSym, setPSym] = useState(""); const [pSide, setPSide] = useState("AL"); const [pPrice, setPPrice] = useState(""); const [pShares, setPShares] = useState("");

  const positions = data.positions;
  const canAdd = sym.trim() && +shares > 0 && +cost > 0;

  const addOrSave = () => {
    if (!canAdd) return;
    const rec = { symbol: sym.trim().toUpperCase(), shares: +shares, avg_cost: +cost };
    if (editId) {
      setData((d) => ({ ...d, positions: d.positions.map((p) => p.id === editId ? { ...p, ...rec } : p) }));
      setEditId(null);
    } else {
      setData((d) => ({ ...d, positions: [...d.positions, { id: Date.now(), enter: true, ...rec }] }));
    }
    setSym(""); setShares(""); setCost("");
  };
  const edit = (p) => { setSym(p.symbol); setShares(String(p.shares)); setCost(String(p.avg_cost)); setEditId(p.id); };
  const del = (id) => setData((d) => ({ ...d, positions: d.positions.filter((p) => p.id !== id) }));

  const addPending = () => {
    if (!pSym.trim() || !+pPrice || !+pShares) return;
    setData((d) => ({ ...d, pending: [...d.pending, { id: Date.now(), symbol: pSym.trim().toUpperCase(), side: pSide, price: +pPrice, shares: +pShares }] }));
    setPSym(""); setPPrice(""); setPShares("");
  };
  const DOT = ["#1789e0", "#76b900", "#e31937", "#11b569", "#7c6cf8", "#ffb547"];

  return (
    <div className={"step-enter-" + dir}>
      <div className="setup__head">
        <h2><span style={{ color: "var(--t-accent)" }}><Icon name="dashboard" size={22} /></span> Portföyünüzü Ekleyin</h2>
        <p>Midas uygulamasındaki hisselerinizi manuel olarak girin. Stop-loss ve hedef ARGOS tarafından otomatik belirlenir.</p>
      </div>

      {/* Nakit */}
      <div className="field">
        <div className="field__top"><label>Mevcut USD Nakit</label></div>
        <div className="field__wrap">
          <span className="faint mono">$</span>
          <input type="number" placeholder="0.00" value={data.cash} onChange={(e) => setData((d) => ({ ...d, cash: e.target.value }))} />
        </div>
      </div>

      {/* Hisse ekleme formu */}
      <div className="field">
        <div className="field__top"><label>{editId ? "Pozisyonu Düzenle" : "Hisse Ekle"}</label></div>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr 1fr auto", gap: 8 }}>
          <div className="field__wrap" style={{ padding: "0 10px" }}>
            <input placeholder="Sembol" value={sym} style={{ textTransform: "uppercase" }} onChange={(e) => setSym(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && addOrSave()} />
          </div>
          <div className="field__wrap" style={{ padding: "0 10px" }}>
            <input type="number" step="0.01" placeholder="Adet" value={shares} onChange={(e) => setShares(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOrSave()} />
          </div>
          <div className="field__wrap" style={{ padding: "0 10px" }}>
            <span className="faint mono">$</span>
            <input type="number" step="0.01" placeholder="Ort. Alış" value={cost} onChange={(e) => setCost(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOrSave()} />
          </div>
          <button className="btn btn--accent" disabled={!canAdd} style={{ opacity: canAdd ? 1 : 0.5, whiteSpace: "nowrap" }} onClick={addOrSave}>
            {editId ? "Kaydet" : "+ Ekle"}
          </button>
        </div>
      </div>

      {/* Eklenen hisseler */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
        {positions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "26px 16px", color: "var(--text-muted)", fontSize: 13, border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)", lineHeight: 1.6 }}>
            Henüz hisse eklenmedi.<br />Yukarıdaki formu kullanarak ilk pozisyonunuzu ekleyin.
          </div>
        ) : positions.map((p, i) => (
          <div key={p.id} className={"pos-row" + (p.enter ? " enter" : "")}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: DOT[i % DOT.length], flexShrink: 0 }} />
            <span className="mono" style={{ fontWeight: 700, minWidth: 56 }}>{p.symbol}</span>
            <span className="muted" style={{ fontSize: 13 }}>{p.shares} hisse</span>
            <span className="faint" style={{ fontSize: 13 }}>@</span>
            <span className="mono" style={{ fontSize: 13 }}>{fmtUSD(p.avg_cost)}</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <button className="btn btn--ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => edit(p)}>Düzenle</button>
              <button className="btn btn--ghost" style={{ padding: 7, lineHeight: 0 }} onClick={() => del(p.id)} title="Sil"><Icon name="trash" size={14} /></button>
            </span>
          </div>
        ))}
      </div>

      {/* Bekleyen emirler */}
      <div style={{ marginTop: 18, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
        <button className="btn btn--ghost" onClick={() => setShowPending((s) => !s)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between" }}>
          <span>Bekleyen Emirler <span className="faint">(opsiyonel)</span>{data.pending.length ? ` · ${data.pending.length}` : ""}</span>
          <span style={{ transform: showPending ? "rotate(180deg)" : "none", transition: "transform .2s", display: "grid" }}><Icon name="chevron-down" size={16} /></span>
        </button>
        {showPending && (
          <div className="step-enter-right" style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 0.9fr auto", gap: 8, alignItems: "stretch" }}>
              <div className="field__wrap" style={{ padding: "0 10px" }}><input placeholder="Sembol" value={pSym} style={{ textTransform: "uppercase" }} onChange={(e) => setPSym(e.target.value.toUpperCase())} /></div>
              <div style={{ display: "flex", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                {["AL", "SAT"].map((s) => <button key={s} onClick={() => setPSide(s)} className="mono" style={{ border: "none", cursor: "pointer", padding: "0 12px", fontSize: 12, fontWeight: 700, background: pSide === s ? (s === "AL" ? "var(--positive-dim)" : "var(--negative-dim)") : "transparent", color: pSide === s ? (s === "AL" ? "var(--positive)" : "var(--negative)") : "var(--text-muted)" }}>{s}</button>)}
              </div>
              <div className="field__wrap" style={{ padding: "0 10px" }}><span className="faint mono">$</span><input type="number" placeholder="Fiyat" value={pPrice} onChange={(e) => setPPrice(e.target.value)} /></div>
              <div className="field__wrap" style={{ padding: "0 10px" }}><input type="number" placeholder="Adet" value={pShares} onChange={(e) => setPShares(e.target.value)} /></div>
              <button className="btn btn--ghost" onClick={addPending}>+ Ekle</button>
            </div>
            {data.pending.map((o) => (
              <div key={o.id} className="pos-row enter" style={{ marginTop: 8 }}>
                <span className={"badge " + (o.side === "AL" ? "badge--buy" : "badge--sell")}>{o.side}</span>
                <span className="mono" style={{ fontWeight: 700 }}>{o.symbol}</span>
                <span className="muted" style={{ fontSize: 13 }}>{o.shares} @ {fmtUSD(o.price)}</span>
                <button className="btn btn--ghost" style={{ marginLeft: "auto", padding: 7, lineHeight: 0 }} onClick={() => setData((d) => ({ ...d, pending: d.pending.filter((x) => x.id !== o.id) }))}><Icon name="trash" size={14} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- ADIM 3 ----
function Step3Complete({ data, dir }) {
  return (
    <div className={"step-enter-" + dir}>
      <div className="setup__head" style={{ textAlign: "center", marginBottom: 24 }}>
        <h2 style={{ justifyContent: "center" }}><span className="pos"><Icon name="check" size={24} /></span> ARGOS Hazır!</h2>
        <p style={{ maxWidth: 360, margin: "7px auto 0" }}>Her şey ayarlandı. ARGOS artık portföyünüzü 7/24 izlemeye hazır.</p>
      </div>
      <div className="summary-card glow-accent">
        <div className="big-mark"><Icon name="eye" size={28} /></div>
        <div style={{ fontWeight: 700, letterSpacing: "0.14em", marginBottom: 14 }}>ARGOS</div>
        {[
          `${data.positions.length} hisse eklendi`,
          "API bağlantısı kuruldu",
          "Telegram bildirimleri aktif",
          "Alarm motoru hazır",
        ].map((l, i) => (
          <div className="summary-line" key={i}>
            <span className="tick"><Icon name="check" size={16} /></span> {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Progress ----
function SetupProgress({ step }) {
  const labels = ["API Anahtarları", "Portföy", "Hazır"];
  return (
    <div className="setup__progress">
      {labels.map((l, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className={"setup-line" + (step > i ? " done" : "")} />}
          <div className={"setup-step " + (step === i + 1 ? "active" : step > i + 1 ? "done" : "")}>
            <span className="ring">{step > i + 1 ? <Icon name="check" size={15} /> : i + 1}</span>
            <span className="lbl">{l}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

// ---- Wizard ----
function SetupWizard({ onComplete, theme, onToggleTheme }) {
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState("right");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState({ env: {}, cash: "", positions: [], pending: [] });

  const reqOk = API_FIELDS.filter((f) => f.req).every((f) => V[f.key]((data.env[f.key] || "")));
  const portfolioOk = data.positions.length >= 1;

  const next = async () => {
    setBusy(true);
    try {
      if (step === 1) { await setupApi.postEnv(data.env); setDir("right"); setStep(2); }
      else if (step === 2) { await setupApi.postPortfolio({ cash_usd: +data.cash || 0, positions: data.positions, pending_orders: data.pending }); setDir("right"); setStep(3); }
      else { await setupApi.complete(); onComplete(); return; }
    } finally { setBusy(false); }
  };
  const back = () => { setDir("left"); setStep((s) => Math.max(1, s - 1)); };

  const nextDisabled = busy || (step === 1 && !reqOk) || (step === 2 && !portfolioOk);
  const nextLabel = step === 1 ? "İleri →" : step === 2 ? "Kaydet ve Devam →" : "Dashboard'a Git →";

  return (
    <div className="setup">
      <button className="theme-toggle setup__theme" onClick={onToggleTheme} title="Tema değiştir" aria-label="Tema değiştir">
        <span className={"theme-toggle__track theme-toggle__track--" + theme}>
          <span className="theme-toggle__thumb"><Icon name={theme === "light" ? "sun" : "moon"} size={13} /></span>
        </span>
      </button>

      <div className="setup__brand">
        <span className="mark"><Icon name="eye" size={22} /></span>
        <span className="word">ARGOS</span>
      </div>

      <div className="setup__card">
        <SetupProgress step={step} />
        {step === 1 && <Step1ApiKeys data={data} setData={setData} dir={dir} />}
        {step === 2 && <Step2Portfolio data={data} setData={setData} dir={dir} />}
        {step === 3 && <Step3Complete data={data} dir={dir} />}

        <div className="setup__footer">
          {step > 1 && <button className="btn btn--ghost" onClick={back} disabled={busy}><Icon name="back" size={15} style={{ verticalAlign: "-2px" }} /> Geri</button>}
          <div className="spacer" />
          <button className="btn btn--accent" onClick={next} disabled={nextDisabled} style={{ opacity: nextDisabled ? 0.5 : 1, minWidth: 150 }}>
            {busy ? "Kaydediliyor…" : nextLabel}
          </button>
        </div>
      </div>

      {step === 1 && !reqOk && (
        <div className="muted" style={{ fontSize: 12, marginTop: 16, textAlign: "center", maxWidth: 420 }}>
          Devam etmek için 3 zorunlu alanı geçerli formatta doldurun.
        </div>
      )}
    </div>
  );
}

Object.assign(window, { SetupWizard, setupApi });
