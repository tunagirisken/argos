// ============================================================
// ARGOS — Landing + Giriş ekranı
// loggedIn=false iken gösterilir. A'dan Z'ye: navbar → hero →
// özellikler → nasıl çalışır → login → footer.
// styles.css'e dokunulmaz; sayfa-özel stiller alttaki <style>'da.
// ============================================================
const { useState: useLpState, useEffect: useLpEffect, useRef: useLpRef } = React;

const LP_FEATURES = [
  { icon: "eye", title: "7/24 İzleme", desc: "Piyasa açıkken de kapalıyken de portföyünüz sürekli takip edilir; önemli her hareket anında yakalanır." },
  { icon: "spark", title: "Akıllı Sinyaller", desc: "RSI, MACD, Bollinger ve EMA tek bir skorda birleşir; AL, SAT ya da BEKLE kararı bir bakışta netleşir." },
  { icon: "bell", title: "Telegram Bildirimleri", desc: "Stop-loss, hedef ya da RSI eşiği tetiklendiğinde Telegram'a anında mesaj gelir." },
  { icon: "stocks", title: "Teknik Analiz", desc: "Profesyonel mum grafikleri, indikatör katmanları ve hacim. Terminal kalitesinde analiz." },
  { icon: "ai", title: "Yapay Zekâ Raporları", desc: "Sabah brifingi ve kapanış raporları yapay zekâ ile özetlenir, riskler önceden işaretlenir." },
  { icon: "target", title: "Fırsat Keşfi", desc: "Aşırı satım, kırılım ve momentum sinyalleriyle yeni fırsatlar gözden kaçmaz." },
];

const LP_STEPS = [
  { n: "1", title: "Kurun", desc: "API anahtarlarınızı girin, portföyünüzü ekleyin. 5 dakikada hazır." },
  { n: "2", title: "İzleyin", desc: "Canlı fiyatlar ve teknik sinyaller otomatik akmaya başlar." },
  { n: "3", title: "Kazanın", desc: "Telegram bildirimleriyle fırsatları ve riskleri anında yakalayın." },
];

// ---- Canlı dashboard önizleme (hero sağ kolon) ----
function LpPreview() {
  const [rows, setRows] = useLpState([
    { t: "NVDA", price: 178.34, pct: 2.81 },
    { t: "TSLA", price: 248.12, pct: -3.42 },
    { t: "AMD", price: 164.05, pct: 4.12 },
  ]);
  const [flash, setFlash] = useLpState({});
  useLpEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => prev.map((r) => {
        const d = (Math.random() - 0.5) * r.price * 0.003;
        const np = +(r.price + d).toFixed(2);
        setFlash((f) => ({ ...f, [r.t]: np >= r.price ? "pos" : "neg" }));
        return { ...r, price: np };
      }));
      setTimeout(() => setFlash({}), 350);
    }, 2000);
    return () => clearInterval(id);
  }, []);
  const colors = { NVDA: "linear-gradient(135deg,#1a7a1a,#76b900)", TSLA: "linear-gradient(135deg,#7a1320,#e31937)", AMD: "linear-gradient(135deg,#0a6b3b,#11b569)" };
  return (
    <div className="lp-preview card">
      <div className="lp-preview__bar">
        <span className="lp-live"><span className="lp-live__dot" /> CANLI</span>
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>ARGOS Dashboard</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-default)" }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--border-default)" }} />
        </span>
      </div>
      <div className="lp-preview__body">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r) => {
            const pos = r.pct >= 0;
            return (
              <div key={r.t} className={"lp-row " + (flash[r.t] ? "flash-" + flash[r.t] : "")}>
                <span className="ticker-logo" style={{ background: colors[r.t], width: 26, height: 26, fontSize: 9, borderRadius: 6 }}>{r.t.slice(0, 2)}</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>{r.t}</span>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 13 }}>{fmtUSD(r.price)}</span>
                <span className={"mono " + (pos ? "pos" : "neg")} style={{ fontSize: 12, fontWeight: 600, width: 56, textAlign: "right" }}>{fmtPct(r.pct)}</span>
              </div>
            );
          })}
          <div className="lp-sigs">
            <span className="sigbadge buy">● AL</span>
            <span className="sigbadge hold">● BEKLE</span>
            <span className="sigbadge sell">● SAT</span>
          </div>
        </div>
        <div className="lp-gauge">
          <RsiMini value={61} w={84} />
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>NVDA · Nötr</span>
        </div>
      </div>
    </div>
  );
}

// ---- Login kartı ----
function LpLogin({ onLogin }) {
  const [email, setEmail] = useLpState("");
  const [pass, setPass] = useLpState("");
  const [showPass, setShowPass] = useLpState(false);
  const [remember, setRemember] = useLpState(true);
  const [err, setErr] = useLpState(false);

  const submit = () => {
    if (email.includes("@") && pass.length >= 4) { setErr(false); onLogin(); }
    else setErr(true);
  };
  return (
    <div className="card lp-login" style={{ borderColor: "var(--border-default)" }}>
      <label className="lp-field">
        <span>E-posta</span>
        <input className="input" type="email" placeholder="ornek@email.com" value={email}
          style={err ? { borderColor: "var(--negative)" } : {}}
          onChange={(e) => { setEmail(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
      </label>
      <label className="lp-field">
        <span>Şifre</span>
        <div style={{ position: "relative" }}>
          <input className="input" type={showPass ? "text" : "password"} placeholder="••••••••" value={pass}
            style={err ? { borderColor: "var(--negative)", paddingRight: 40 } : { paddingRight: 40 }}
            onChange={(e) => { setPass(e.target.value); setErr(false); }}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
          <button className="lp-eye" onClick={() => setShowPass((s) => !s)} tabIndex={-1} type="button" aria-label="Şifreyi göster/gizle">
            <Icon name={showPass ? "moon" : "eye"} size={16} />
          </button>
        </div>
      </label>
      <label className="lp-remember">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>Beni hatırla</span>
      </label>
      {err && <div style={{ color: "var(--negative)", fontSize: 13, marginTop: 2 }}>Geçersiz bilgi. E-posta ve en az 4 karakter şifre girin.</div>}
      <button className="btn btn--accent" style={{ width: "100%", padding: "12px", marginTop: 4 }} onClick={submit}>Giriş Yap</button>
      <div className="lp-sublinks">
        <span onClick={() => console.log("şifremi unuttum")}>Şifremi unuttum</span>
        <span style={{ color: "var(--border-default)" }}>|</span>
        <span onClick={() => console.log("hesap oluştur")}>Hesap oluştur</span>
      </div>
    </div>
  );
}

function Landing({ onLogin, theme, onToggleTheme }) {
  const rootRef = useLpRef(null);
  const scrollTo = (id) => {
    const el = rootRef.current && rootRef.current.querySelector("#" + id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // scroll-reveal
  useLpEffect(() => {
    const els = rootRef.current.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const navLinks = [["features", "Özellikler"], ["how", "Nasıl Çalışır"]];

  return (
    <div className="lp" ref={rootRef}>
      <LpStyles />

      {/* ---- Navbar ---- */}
      <nav className="lp-nav">
        <div className="lp-nav__brand" onClick={() => scrollTo("hero")}>
          <ArgosCube size={30} />
          <span className="lp-word">ARGOS</span>
        </div>
        <div className="lp-nav__links">
          {navLinks.map(([id, label]) => <button key={id} onClick={() => scrollTo(id)}>{label}</button>)}
        </div>
        <div className="lp-nav__right">
          <button className="theme-toggle" onClick={onToggleTheme} aria-label="Tema değiştir">
            <span className={"theme-toggle__track theme-toggle__track--" + theme}>
              <span className="theme-toggle__thumb"><Icon name={theme === "light" ? "sun" : "moon"} size={13} /></span>
            </span>
          </button>
          <button className="btn btn--accent" onClick={() => scrollTo("login")}>Giriş Yap</button>
        </div>
      </nav>

      {/* ---- Hero ---- */}
      <section className="lp-hero" id="hero">
        <div className="lp-hero__grid" />
        <div className="lp-hero__glow lp-hero__glow--tl" />
        <div className="lp-hero__glow lp-hero__glow--br" />
        <div className="lp-hero__inner">
          <div className="lp-hero__left">
            <span className="lp-badge"><span className="lp-live__dot" /> Yapay Zekâ Destekli Analiz</span>
            <h1 className="lp-title">
              <span className="lp-title__mono">ARGOS</span>
              <span className="lp-title__sub">Piyasayı sizin için izler</span>
            </h1>
            <p className="lp-desc">
              ARGOS, portföyünüzü <strong>gerçek zamanlı</strong> izler; RSI, MACD ve Bollinger gibi teknik
              sinyalleri tek ekranda toplar. Önemli bir fırsat ya da risk belirdiğinde anında haber verir.
            </p>
            <div className="lp-cta">
              <button className="btn btn--accent lp-cta__main" onClick={() => scrollTo("login")}>Ücretsiz Başla</button>
              <button className="lp-cta__demo" onClick={() => scrollTo("how")}>
                <span className="lp-cta__play"><Icon name="play" size={12} /></span>
                Nasıl çalışır?
              </button>
            </div>
            <div className="lp-trust">
              <span>Ücretsiz</span><span>5 dakikada kurulum</span><span>Telegram bildirimleri</span>
            </div>
          </div>
          <div className="lp-hero__right"><LpPreview /></div>
        </div>
      </section>

      {/* ---- Özellikler ---- */}
      <section className="lp-section" id="features">
        <div className="lp-section__head" data-reveal>
          <h2>Neden ARGOS?</h2>
          <p>Profesyonel analiz araçları, sade bir arayüzde.</p>
        </div>
        <div className="lp-features">
          {LP_FEATURES.map((f, i) => (
            <div key={f.title} className="card lp-feature" data-reveal style={{ "--d": i * 0.08 + "s" }}>
              <span className="lp-feature__icon"><Icon name={f.icon} size={20} /></span>
              <div className="lp-feature__title">{f.title}</div>
              <div className="lp-feature__desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Nasıl Çalışır ---- */}
      <section className="lp-section lp-section--alt" id="how">
        <div className="lp-section__head" data-reveal>
          <h2>3 Adımda Başlayın</h2>
          <p>Kurulumdan ilk bildirime, sadece dakikalar.</p>
        </div>
        <div className="lp-steps">
          {LP_STEPS.map((s, i) => (
            <React.Fragment key={s.n}>
              <div className="lp-step" data-reveal style={{ "--d": i * 0.1 + "s" }}>
                <span className="lp-step__n">{s.n}</span>
                <div className="lp-step__title">{s.title}</div>
                <div className="lp-step__desc">{s.desc}</div>
              </div>
              {i < LP_STEPS.length - 1 && <span className="lp-step__arrow" aria-hidden="true">→</span>}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* ---- Login ---- */}
      <section className="lp-section" id="login">
        <div className="lp-section__head" data-reveal>
          <h2>ARGOS'a Giriş Yapın</h2>
          <p>Demo için herhangi bir e-posta ve şifre yeterli.</p>
        </div>
        <div data-reveal><LpLogin onLogin={onLogin} /></div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="lp-footer">
        <div className="lp-footer__cols">
          <div>
            <div className="lp-nav__brand" style={{ marginBottom: 12 }}>
              <ArgosCube size={26} />
              <span className="lp-word" style={{ fontSize: 16 }}>ARGOS</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 250, lineHeight: 1.6 }}>Yapay zekâ destekli yatırım asistanı. Portföyünüzü gerçek zamanlı izler, teknik analizle yorumlar ve önemli gelişmeleri anında bildirir.</p>
          </div>
          <div>
            <div className="lp-footer__h">Linkler</div>
            {[["features", "Özellikler"], ["how", "Nasıl Çalışır"], ["login", "Giriş Yap"]].map(([id, l]) => (
              <button key={id} className="lp-footer__link" onClick={() => scrollTo(id)}>{l}</button>
            ))}
          </div>
          <div>
            <div className="lp-footer__h">İletişim</div>
            <div className="lp-footer__link" style={{ cursor: "default" }}>github.com/tunagirisken/argos</div>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <span>© 2026 ARGOS · Tüm hakları saklıdır · Tuna Girişken</span>
          <span style={{ fontStyle: "italic" }}>Bu uygulama yatırım tavsiyesi vermez.</span>
        </div>
      </footer>
    </div>
  );
}

Object.assign(window, { Landing });

function LpStyles() {
  return <style>{`
.lp { height: 100%; overflow-y: auto; overflow-x: hidden; scroll-behavior: smooth; background: var(--bg-base); }
.lp * { box-sizing: border-box; }

/* ---- Navbar ---- */
.lp-nav { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 24px;
  height: 62px; padding: 0 32px; background: color-mix(in srgb, var(--bg-base) 85%, transparent);
  backdrop-filter: blur(12px); border-bottom: 1px solid var(--border-subtle); }
.lp-nav__brand { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.lp-word { font-family: var(--font-mono); font-weight: 700; font-size: 18px; letter-spacing: 0.06em; }
.lp-nav__links { display: flex; gap: 6px; margin: 0 auto; }
.lp-nav__links button { background: none; border: none; color: var(--text-secondary); font-family: inherit;
  font-size: 14px; padding: 8px 12px; border-radius: var(--radius-md); cursor: pointer; transition: color .15s, background .15s; }
.lp-nav__links button:hover { color: var(--text-primary); background: var(--bg-elevated); }
.lp-nav__right { display: flex; align-items: center; gap: 14px; }
.lp-nav__right .btn { white-space: nowrap; }

/* ---- Hero ---- */
.lp-hero { position: relative; min-height: calc(100vh - 62px); display: flex; align-items: center; overflow: hidden; padding: 40px 32px; }
.lp-hero__grid { position: absolute; inset: 0; opacity: .4; pointer-events: none;
  background-image: linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px);
  background-size: 40px 40px;
  -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%);
  mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, #000 40%, transparent 100%); }
.lp-hero__glow { position: absolute; width: 480px; height: 480px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, var(--t-accent), transparent 65%); opacity: .08; filter: blur(20px); }
.lp-hero__glow--tl { top: -160px; left: -120px; }
.lp-hero__glow--br { bottom: -180px; right: -100px; }
.lp-hero__inner { position: relative; z-index: 1; width: 100%; max-width: 1180px; margin: 0 auto;
  display: grid; grid-template-columns: 55fr 45fr; gap: 48px; align-items: center; }
.lp-hero__left { display: flex; flex-direction: column; align-items: flex-start; gap: 22px; }
.lp-badge { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--t-accent);
  background: color-mix(in srgb, var(--t-accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--t-accent) 30%, transparent);
  padding: 6px 13px; border-radius: 99px; }
.lp-live__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--t-accent); box-shadow: 0 0 8px var(--t-accent); animation: pulse-dot 2s infinite; }
.lp-title { margin: 0; display: flex; flex-direction: column; gap: 4px; }
.lp-title__mono { font-family: var(--font-mono); font-weight: 700; font-size: clamp(40px, 6vw, 72px); letter-spacing: -0.02em; line-height: 1; }
.lp-title__sub { font-family: var(--font-sans); font-weight: 600; font-size: clamp(20px, 2.6vw, 30px); color: var(--text-secondary); letter-spacing: -0.01em; }
.lp-desc { font-size: 16px; color: var(--text-secondary); max-width: 480px; line-height: 1.7; margin: 0; }
.lp-desc strong { color: var(--text-primary); font-weight: 600; }
.lp-cta { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
.lp-cta__main { padding: 13px 28px; font-size: 15px; font-weight: 600; border-radius: var(--radius-md);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--t-accent) 32%, transparent); transition: transform .15s, box-shadow .2s, filter .15s; }
.lp-cta__main:hover { transform: translateY(-2px); box-shadow: 0 14px 32px color-mix(in srgb, var(--t-accent) 45%, transparent); filter: brightness(1.05); }
.lp-cta__demo { display: inline-flex; align-items: center; gap: 11px; background: none; border: none; cursor: pointer;
  font-family: inherit; font-size: 15px; font-weight: 500; color: var(--text-primary); padding: 8px 4px; }
.lp-cta__play { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
  border: 1px solid var(--border-default); color: var(--t-accent); transition: background .15s, border-color .15s, transform .15s; }
.lp-cta__demo:hover .lp-cta__play { background: color-mix(in srgb, var(--t-accent) 14%, transparent); border-color: var(--t-accent); transform: scale(1.08); }
.lp-trust { display: flex; gap: 22px; flex-wrap: wrap; font-size: 12.5px; color: var(--text-muted); }
.lp-trust span { display: inline-flex; align-items: center; gap: 7px; }
.lp-trust span::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--positive); }

/* ---- Hero preview card ---- */
.lp-preview { padding: 0; overflow: hidden; border-color: var(--border-default); transform: rotate(-2deg); transition: transform .4s ease;
  box-shadow: 0 30px 60px rgba(0,0,0,.35); }
.lp-preview:hover { transform: rotate(0deg); }
:root[data-theme="light"] .lp-preview { box-shadow: 0 30px 60px rgba(22,24,42,.16); }
.lp-preview__bar { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); }
.lp-live { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--positive); letter-spacing: 0.04em; }
.lp-live__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--positive); box-shadow: 0 0 8px var(--positive); }
.lp-preview__body { display: flex; gap: 14px; padding: 16px; }
.lp-row { display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: var(--radius-md); background: var(--bg-base); border: 1px solid var(--border-subtle); }
.lp-sigs { display: flex; gap: 6px; margin-top: 4px; }
.lp-gauge { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 6px; border-left: 1px solid var(--border-subtle); }

/* ---- Sections ---- */
.lp-section { max-width: 1100px; margin: 0 auto; padding: 80px 32px; }
.lp-section--alt { max-width: none; background: var(--bg-surface); border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle); }
.lp-section--alt .lp-steps, .lp-section--alt .lp-section__head { max-width: 1000px; margin-left: auto; margin-right: auto; }
.lp-section__head { text-align: center; margin-bottom: 44px; }
.lp-section__head h2 { font-size: clamp(26px, 3.4vw, 34px); font-weight: 700; letter-spacing: -0.01em; margin: 0 0 10px; }
.lp-section__head p { font-size: 15px; color: var(--text-secondary); margin: 0; }

.lp-features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.lp-feature { display: flex; flex-direction: column; gap: 10px; transition: transform .18s, border-color .18s; }
.lp-feature:hover { transform: translateY(-4px); border-color: var(--border-default); }
.lp-feature__icon { width: 40px; height: 40px; border-radius: var(--radius-lg); display: grid; place-items: center;
  color: var(--t-accent); background: color-mix(in srgb, var(--t-accent) 15%, transparent); }
.lp-feature__title { font-size: 15px; font-weight: 600; }
.lp-feature__desc { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

.lp-steps { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: center; gap: 8px; }
.lp-step { text-align: center; padding: 0 16px; }
.lp-step__n { font-family: var(--font-mono); font-size: 48px; font-weight: 700; color: var(--t-accent); line-height: 1; display: block; margin-bottom: 14px; }
.lp-step__title { font-size: 17px; font-weight: 600; margin-bottom: 8px; }
.lp-step__desc { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; max-width: 240px; margin: 0 auto; }
.lp-step__arrow { color: var(--text-muted); font-size: 24px; }

/* ---- Login ---- */
.lp-login { max-width: 420px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; padding: 26px; }
.lp-field { display: flex; flex-direction: column; gap: 6px; }
.lp-field > span { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.lp-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); display: grid; place-items: center; padding: 4px; }
.lp-eye:hover { color: var(--text-secondary); }
.lp-remember { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); cursor: pointer; }
.lp-remember input { accent-color: var(--t-accent); width: 15px; height: 15px; }
.lp-sublinks { display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 13px; color: var(--text-muted); margin-top: 2px; }
.lp-sublinks span:not([style]) { cursor: pointer; transition: color .15s; }
.lp-sublinks span:not([style]):hover { color: var(--t-accent); }

/* ---- Footer ---- */
.lp-footer { background: var(--bg-surface); border-top: 1px solid var(--border-subtle); padding: 40px 32px 24px; }
.lp-footer__cols { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 32px; }
.lp-footer__h { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 12px; }
.lp-footer__link { display: block; background: none; border: none; color: var(--text-secondary); font-family: inherit; font-size: 13px; padding: 4px 0; cursor: pointer; text-align: left; transition: color .15s; }
.lp-footer__link:hover { color: var(--t-accent); }
.lp-footer__bottom { max-width: 1100px; margin: 24px auto 0; padding-top: 24px; border-top: 1px solid var(--border-subtle);
  display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; font-size: 12px; color: var(--text-muted); }

/* ---- Reveal animations (transform-only resting-visible; paused = görünür) ---- */
@media (prefers-reduced-motion: no-preference) {
  .lp-hero__left { animation: lp-up .7s ease .1s both; }
  .lp-hero__right { animation: lp-up .7s ease .3s both; }
  .lp-badge { animation: lp-pop .5s ease both; }
  [data-reveal] { opacity: 0; transform: translateY(20px); transition: opacity .6s ease var(--d, 0s), transform .6s ease var(--d, 0s); }
  [data-reveal].in { opacity: 1; transform: none; }
}
@keyframes lp-up { from { transform: translateY(30px); } to { transform: none; } }
@keyframes lp-pop { from { transform: scale(.85); } to { transform: none; } }

/* ---- Responsive ---- */
@media (max-width: 900px) {
  .lp-hero__inner { grid-template-columns: 1fr; gap: 32px; }
  .lp-hero__right { display: none; }
  .lp-nav__links { display: none; }
  .lp-features { grid-template-columns: 1fr 1fr; }
  .lp-steps { grid-template-columns: 1fr; gap: 28px; }
  .lp-step__arrow { transform: rotate(90deg); }
  .lp-footer__cols { grid-template-columns: 1fr; gap: 24px; }
}
@media (max-width: 560px) {
  .lp-features { grid-template-columns: 1fr; }
  .lp-footer__bottom { flex-direction: column; gap: 8px; }
}
`}</style>;
}
