// ============================================================
// ARGOS — Ayarlar (işlevsel)
// Hesap · Entegrasyonlar · Bildirimler · Zamanlayıcı · Görünüm · Admin · Kurulum
// styles.css'e dokunulmaz; sayfa-özel stiller alttaki <style>'da.
// ============================================================
const { useState: useSetState } = React;

function Switch({ on, onClick }) {
  return <button className={"st-switch" + (on ? " on" : "")} onClick={onClick} aria-label="Aç/Kapa"><span /></button>;
}

function StSection({ icon, title, desc, children }) {
  return (
    <div className="st-section">
      <div className="st-section__head">
        <span className="st-section__icon"><Icon name={icon} size={17} /></span>
        <div>
          <div className="st-section__title">{title}</div>
          {desc && <div className="st-section__desc">{desc}</div>}
        </div>
      </div>
      <div className="st-section__body">{children}</div>
    </div>
  );
}

function Row({ k, sub, children, last }) {
  return (
    <div className="st-row" style={last ? { borderBottom: "none" } : {}}>
      <div style={{ minWidth: 0 }}>
        <div className="st-row__k">{k}</div>
        {sub && <div className="st-row__sub">{sub}</div>}
      </div>
      <div className="st-row__ctl">{children}</div>
    </div>
  );
}

// API anahtarı satırı: maskeli önizleme + test
function KeyRow({ label, value, required, status, onTest, last }) {
  const masked = value ? value.slice(0, 6) + "•".repeat(8) + value.slice(-2) : "tanımlı değil";
  const stMap = { ok: { c: "var(--positive)", t: "Bağlı", i: "check" }, fail: { c: "var(--negative)", t: "Hata", i: "x" }, idle: { c: "var(--text-muted)", t: "Test edilmedi", i: "clock" } };
  const s = stMap[status] || stMap.idle;
  return (
    <div className="st-row" style={last ? { borderBottom: "none" } : {}}>
      <div style={{ minWidth: 0 }}>
        <div className="st-row__k">{label} {required && <span className="st-req">zorunlu</span>}</div>
        <div className="st-row__sub mono">{masked}</div>
      </div>
      <div className="st-row__ctl" style={{ gap: 10 }}>
        <span className="st-status" style={{ color: s.c }}><Icon name={s.i} size={13} /> {s.t}</span>
        <button className="btn btn--ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={onTest}>Test</button>
      </div>
    </div>
  );
}

function Settings({ onResetSetup }) {
  const [notif, setNotif] = useSetState({ price: true, stop: true, rsi: true, daily: true, news: false });
  const [sched, setSched] = useSetState({ morning: "08:30", close: "23:05", morningOn: true, closeOn: true });
  const [keys, setKeys] = useSetState({
    anthropic: { v: "sk-ant-api03x9", st: "ok" },
    telegram: { v: "1234567890:AAF", st: "ok" },
    chatId: { v: "-100123456789", st: "ok" },
    firecrawl: { v: "fc-7d2a90", st: "idle" },
    exa: { v: "", st: "idle" },
    sentry: { v: "", st: "idle" },
  });
  const [llm, setLlm] = useSetState("anthropic");
  const [refreshing, setRefreshing] = useSetState(false);
  const [refreshed, setRefreshed] = useSetState(false);
  const [toast, setToast] = useSetState(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 1800); };
  const testKey = (id) => {
    flash("Bağlantı test ediliyor...");
    setTimeout(() => {
      setKeys((k) => ({ ...k, [id]: { ...k[id], st: k[id].v ? "ok" : "fail" } }));
      flash(keys[id].v ? "Bağlantı başarılı" : "Anahtar tanımlı değil");
    }, 700);
  };
  const refreshSymbols = () => {
    setRefreshing(true);
    setTimeout(() => { setRefreshing(false); setRefreshed(true); flash("Sembol listesi güncellendi (8.412 sembol)"); setTimeout(() => setRefreshed(false), 2500); }, 1400);
  };

  return (
    <div className="page st">
      <StStyles />
      <div className="st-wrap">

        {/* Hesap & Tercihler */}
        <StSection icon="settings" title="Hesap & Tercihler" desc="Genel uygulama ayarları">
          <Row k="Para Birimi" sub="Fiyatların gösterim birimi">
            <select className="select st-select" defaultValue="USD"><option>USD ($)</option><option>EUR (€)</option><option>TRY (₺)</option></select>
          </Row>
          <Row k="Saat Dilimi" sub="Rapor ve seans saatleri">
            <select className="select st-select" defaultValue="IST"><option value="IST">İstanbul (GMT+3)</option><option value="NY">New York (GMT-5)</option></select>
          </Row>
          <Row k="Veri Kaynağı" sub="Canlı fiyat akışı" last>
            <span className="st-pill"><span className="st-dot" /> WebSocket · bağlı</span>
          </Row>
        </StSection>

        {/* Entegrasyonlar */}
        <StSection icon="spark" title="Entegrasyonlar" desc="API anahtarları ve servis bağlantıları">
          <KeyRow label="Anthropic API" value={keys.anthropic.v} required status={keys.anthropic.st} onTest={() => testKey("anthropic")} />
          <KeyRow label="Telegram Bot Token" value={keys.telegram.v} required status={keys.telegram.st} onTest={() => testKey("telegram")} />
          <KeyRow label="Telegram Chat ID" value={keys.chatId.v} required status={keys.chatId.st} onTest={() => testKey("chatId")} />
          <KeyRow label="Firecrawl API" value={keys.firecrawl.v} status={keys.firecrawl.st} onTest={() => testKey("firecrawl")} />
          <KeyRow label="Exa API" value={keys.exa.v} status={keys.exa.st} onTest={() => testKey("exa")} />
          <KeyRow label="Sentry DSN" value={keys.sentry.v} status={keys.sentry.st} onTest={() => testKey("sentry")} last />
        </StSection>

        {/* LLM Sağlayıcı */}
        <StSection icon="ai" title="LLM Sağlayıcı" desc="AI analiz ve rapor motoru">
          <Row k="Aktif sağlayıcı" sub="Analiz ve chat için kullanılır" last>
            <div className="seg">
              <button className={llm === "anthropic" ? "on" : ""} onClick={() => setLlm("anthropic")}>Claude</button>
              <button className={llm === "gemini" ? "on" : ""} onClick={() => setLlm("gemini")}>Gemini</button>
            </div>
          </Row>
        </StSection>

        {/* Bildirimler */}
        <StSection icon="bell" title="Bildirimler" desc="Telegram bildirim tipleri">
          {[
            ["price", "Fiyat alarmları", "Hedef fiyat ulaşıldığında"],
            ["stop", "Stop-loss uyarıları", "Stop seviyesi tetiklendiğinde"],
            ["rsi", "RSI eşik bildirimleri", "Aşırı alım/satım bölgesinde"],
            ["daily", "Günlük raporlar", "Sabah brifingi ve kapanış"],
            ["news", "Haber bildirimleri", "Önemli haber akışında"],
          ].map(([id, k, sub], i, arr) => (
            <Row key={id} k={k} sub={sub} last={i === arr.length - 1}>
              <Switch on={notif[id]} onClick={() => setNotif((n) => ({ ...n, [id]: !n[id] }))} />
            </Row>
          ))}
        </StSection>

        {/* Zamanlayıcı */}
        <StSection icon="clock" title="Zamanlayıcı" desc="Otomatik rapor saatleri (scheduler)">
          <Row k="Sabah Brifingi" sub="Seans öncesi portföy özeti">
            <div className="st-sched">
              <input type="time" className="input st-time" value={sched.morning} onChange={(e) => setSched((s) => ({ ...s, morning: e.target.value }))} />
              <Switch on={sched.morningOn} onClick={() => setSched((s) => ({ ...s, morningOn: !s.morningOn }))} />
            </div>
          </Row>
          <Row k="Kapanış Raporu" sub="Seans sonrası performans" last>
            <div className="st-sched">
              <input type="time" className="input st-time" value={sched.close} onChange={(e) => setSched((s) => ({ ...s, close: e.target.value }))} />
              <Switch on={sched.closeOn} onClick={() => setSched((s) => ({ ...s, closeOn: !s.closeOn }))} />
            </div>
          </Row>
        </StSection>

        {/* Görünüm */}
        <StSection icon="eye" title="Görünüm" desc="Tema ve arayüz">
          <Row k="Tema" sub="Açık / koyu mod (sağ üstten de değiştirilebilir)">
            <span className="muted" style={{ fontSize: 13 }}>Üst çubuktaki anahtardan</span>
          </Row>
          <Row k="Tweaks paneli" sub="Aksan rengi, glow, yoğunluk, köşe yuvarlaklığı" last>
            <span className="muted" style={{ fontSize: 13 }}>Araç çubuğundan aç</span>
          </Row>
        </StSection>

        {/* Admin */}
        <StSection icon="shield" title="Yönetici" desc="Sistem bakımı">
          <Row k="Sembol Listesi" sub="NYSE/NASDAQ sembol önbelleğini yenile" last>
            <button className="btn btn--ghost" onClick={refreshSymbols} disabled={refreshing} style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ display: refreshing ? "inline-grid" : "none", animation: "spin 1s linear infinite", placeItems: "center" }}><Icon name="settings" size={13} /></span>
              {refreshing ? "Yenileniyor..." : refreshed ? "✓ Güncellendi" : "Listeyi Yenile"}
            </button>
          </Row>
        </StSection>

        {/* Kurulum */}
        <StSection icon="docs" title="Kurulum" desc="Yeniden yapılandırma">
          <Row k="Kurulum Sihirbazı" sub="API anahtarları ve portföyü baştan ayarla" last>
            <button className="btn btn--ghost" onClick={onResetSetup}>Yeniden çalıştır</button>
          </Row>
        </StSection>

        <div className="st-foot">© 2026 ARGOS · Tüm hakları saklıdır · Tuna Girişken</div>
      </div>

      {toast && <div className="st-toast">{toast}</div>}
    </div>
  );
}

Object.assign(window, { Settings });

function StStyles() {
  return <style>{`
.st-wrap { max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.st-section { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; }
.st-section__head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border-subtle); }
.st-section__icon { width: 34px; height: 34px; border-radius: var(--radius-md); display: grid; place-items: center; color: var(--t-accent); background: color-mix(in srgb, var(--t-accent) 14%, transparent); flex-shrink: 0; }
.st-section__title { font-size: 15px; font-weight: 600; }
.st-section__desc { font-size: 12px; color: var(--text-muted); margin-top: 1px; }
.st-section__body { padding: 4px 18px; }

.st-row { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--border-subtle); }
.st-row__k { font-size: 14px; font-weight: 500; }
.st-row__sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; word-break: break-all; }
.st-row__ctl { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.st-req { font-size: 9px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--t-accent); background: color-mix(in srgb, var(--t-accent) 14%, transparent); padding: 2px 6px; border-radius: 4px; vertical-align: middle; margin-left: 4px; }
.st-status { font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }

.st-switch { width: 38px; height: 21px; border-radius: 99px; border: none; background: var(--bg-elevated); cursor: pointer; padding: 0; position: relative; flex-shrink: 0; transition: background .2s; }
.st-switch span { position: absolute; top: 2px; left: 2px; width: 17px; height: 17px; border-radius: 50%; background: var(--text-muted); transition: transform .2s, background .2s; }
.st-switch.on { background: var(--t-accent); }
.st-switch.on span { transform: translateX(17px); background: #fff; }

.st-select { width: auto; min-width: 150px; padding: 7px 10px; font-size: 13px; }
.st-time { width: 110px; padding: 7px 10px; font-size: 13px; }
.st-sched { display: flex; align-items: center; gap: 10px; }
.st-pill { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-secondary); }
.st-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--positive); box-shadow: 0 0 6px var(--positive); animation: pulse-dot 2s infinite; }

.st-foot { text-align: center; font-size: 12px; color: var(--text-muted); padding: 8px 0 4px; }
.st-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--bg-overlay); border: 1px solid var(--border-default); color: var(--text-primary); padding: 11px 18px; border-radius: var(--radius-md); font-size: 13px; box-shadow: 0 12px 30px rgba(0,0,0,.4); z-index: 300; animation: fade-in .2s ease; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 640px) { .st-row { flex-wrap: wrap; } }
`}</style>;
}