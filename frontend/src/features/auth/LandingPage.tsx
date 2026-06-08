import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { ArgosCube } from "../../components/brand/ArgosCube";
import { RsiMini } from "../../components/charts/RsiMini";
import { Icon } from "../../components/icons/Icon";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { fmtPct, fmtUSD } from "../../lib/format";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import "../../styles/landing.css";

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

const ROW_COLORS: Record<string, string> = {
  NVDA: "linear-gradient(135deg,#1a7a1a,#76b900)",
  TSLA: "linear-gradient(135deg,#7a1320,#e31937)",
  AMD: "linear-gradient(135deg,#0a6b3b,#11b569)",
};

function LpPreview() {
  const [rows, setRows] = useState([
    { t: "NVDA", price: 178.34, pct: 2.81 },
    { t: "TSLA", price: 248.12, pct: -3.42 },
    { t: "AMD", price: 164.05, pct: 4.12 },
  ]);
  const [flash, setFlash] = useState<Record<string, string>>({});

  useEffect(() => {
    const id = window.setInterval(() => {
      setRows((prev) =>
        prev.map((r) => {
          const d = (Math.random() - 0.5) * r.price * 0.003;
          const np = +(r.price + d).toFixed(2);
          setFlash((f) => ({ ...f, [r.t]: np >= r.price ? "pos" : "neg" }));
          return { ...r, price: np };
        })
      );
      window.setTimeout(() => setFlash({}), 350);
    }, 2000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="lp-preview card">
      <div className="lp-preview__bar">
        <span className="lp-live">
          <span className="lp-live__dot" /> CANLI
        </span>
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
              <div key={r.t} className={`lp-row${flash[r.t] ? ` flash-${flash[r.t]}` : ""}`}>
                <span
                  className="ticker-logo"
                  style={{
                    background: ROW_COLORS[r.t],
                    width: 26,
                    height: 26,
                    fontSize: 9,
                    borderRadius: 6,
                  }}
                >
                  {r.t.slice(0, 2)}
                </span>
                <span className="mono" style={{ fontWeight: 700, fontSize: 13 }}>
                  {r.t}
                </span>
                <span className="mono" style={{ marginLeft: "auto", fontSize: 13 }}>
                  {fmtUSD(r.price)}
                </span>
                <span
                  className={`mono ${pos ? "pos" : "neg"}`}
                  style={{ fontSize: 12, fontWeight: 600, width: 56, textAlign: "right" }}
                >
                  {fmtPct(r.pct)}
                </span>
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
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
            NVDA · Nötr
          </span>
        </div>
      </div>
    </div>
  );
}

function LpLogin() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!username.trim() || pass.length < 4) {
      setErr("Geçersiz bilgi — kullanıcı adı ve en az 4 karakter şifre girin.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const res = await api.authLogin(username.trim(), pass);
      setSession(res.token, res.user, remember);
      navigate("/", { replace: true });
    } catch {
      setErr("Giriş başarısız. Kullanıcı adı veya şifre hatalı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card lp-login" style={{ borderColor: "var(--border-default)" }}>
      <label className="lp-field">
        <span>Kullanıcı adı</span>
        <input
          className="input"
          type="text"
          placeholder="admin"
          value={username}
          autoComplete="username"
          style={err ? { borderColor: "var(--negative)" } : undefined}
          onChange={(e) => {
            setUsername(e.target.value);
            setErr("");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </label>
      <label className="lp-field">
        <span>Şifre</span>
        <div style={{ position: "relative" }}>
          <input
            className="input"
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            value={pass}
            autoComplete="current-password"
            style={err ? { borderColor: "var(--negative)", paddingRight: 40 } : { paddingRight: 40 }}
            onChange={(e) => {
              setPass(e.target.value);
              setErr("");
            }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
          <button
            className="lp-eye"
            onClick={() => setShowPass((s) => !s)}
            tabIndex={-1}
            type="button"
            aria-label="Şifreyi göster/gizle"
          >
            <Icon name={showPass ? "moon" : "eye"} size={16} />
          </button>
        </div>
      </label>
      <label className="lp-remember">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        <span>Beni hatırla</span>
      </label>
      {err ? (
        <div style={{ color: "var(--negative)", fontSize: 13, marginTop: 2 }}>{err}</div>
      ) : null}
      <button
        type="button"
        className="btn btn--accent"
        style={{ width: "100%", padding: 12, marginTop: 4 }}
        disabled={busy}
        onClick={submit}
      >
        {busy ? "Giriş yapılıyor…" : "Giriş Yap"}
      </button>
      <div className="lp-sublinks">
        <button type="button" onClick={() => {}}>
          Şifremi unuttum
        </button>
        <span style={{ color: "var(--border-default)" }}>|</span>
        <button type="button" onClick={() => navigate("/register")}>
          Hesap oluştur
        </button>
      </div>
    </div>
  );
}

export function LandingPage({ scrollToLogin }: { scrollToLogin?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);

  const scrollTo = (id: string) => {
    const el = rootRef.current?.querySelector(`#${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (scrollToLogin) scrollTo("login");
  }, [scrollToLogin]);

  const navLinks: [string, string][] = [
    ["features", "Özellikler"],
    ["how", "Nasıl Çalışır"],
  ];

  return (
    <div className="lp" ref={rootRef}>
      <nav className="lp-nav">
        <button type="button" className="lp-nav__brand" onClick={() => scrollTo("hero")}>
          <ArgosCube size={24} />
          <span className="lp-word">ARGOS</span>
        </button>
        <div className="lp-nav__links">
          {navLinks.map(([id, label]) => (
            <button key={id} type="button" onClick={() => scrollTo(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="lp-nav__right">
          <ThemeToggle />
          <button type="button" className="btn btn--accent" onClick={() => scrollTo("login")}>
            Giriş Yap
          </button>
        </div>
      </nav>

      <section className="lp-hero" id="hero">
        <div className="lp-hero__grid" />
        <div className="lp-hero__glow lp-hero__glow--tl" />
        <div className="lp-hero__glow lp-hero__glow--br" />
        <div className="lp-hero__inner">
          <div className="lp-hero__left">
            <span className="lp-badge">
              <span className="lp-live__dot" /> Yapay Zekâ Destekli Analiz
            </span>
            <h1 className="lp-title">
              <span className="lp-title__mono">ARGOS</span>
              <span className="lp-title__sub">Piyasayı sizin için izler</span>
            </h1>
            <p className="lp-desc">
              ARGOS, portföyünüzü <strong>gerçek zamanlı</strong> izler; RSI, MACD ve Bollinger gibi teknik
              sinyalleri tek ekranda toplar. Önemli bir fırsat ya da risk belirdiğinde anında haber verir.
            </p>
            <div className="lp-cta">
              <button type="button" className="btn btn--accent lp-cta__main" onClick={() => scrollTo("login")}>
                Ücretsiz Başla
              </button>
              <button type="button" className="lp-cta__demo" onClick={() => scrollTo("how")}>
                <span className="lp-cta__play">
                  <Icon name="play" size={12} />
                </span>
                Nasıl çalışır?
              </button>
            </div>
            <div className="lp-trust">
              <span>Ücretsiz</span>
              <span>5 dakikada kurulum</span>
              <span>Telegram bildirimleri</span>
            </div>
          </div>
          <div className="lp-hero__right">
            <LpPreview />
          </div>
        </div>
      </section>

      <section className="lp-section" id="features">
        <div className="lp-section__head" data-reveal>
          <h2>Neden ARGOS?</h2>
          <p>Profesyonel analiz araçları, sade bir arayüzde.</p>
        </div>
        <div className="lp-features">
          {LP_FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="card lp-feature"
              data-reveal
              style={{ "--d": `${i * 0.08}s` } as CSSProperties}
            >
              <span className="lp-feature__icon">
                <Icon name={f.icon} size={20} />
              </span>
              <div className="lp-feature__title">{f.title}</div>
              <div className="lp-feature__desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-section lp-section--alt" id="how">
        <div className="lp-section__head" data-reveal>
          <h2>3 Adımda Başlayın</h2>
          <p>Kurulumdan ilk bildirime, sadece dakikalar.</p>
        </div>
        <div className="lp-steps">
          {LP_STEPS.map((s, i) => (
            <Fragment key={s.n}>
              <div className="lp-step" data-reveal style={{ "--d": `${i * 0.1}s` } as CSSProperties}>
                <span className="lp-step__n">{s.n}</span>
                <div className="lp-step__title">{s.title}</div>
                <div className="lp-step__desc">{s.desc}</div>
              </div>
              {i < LP_STEPS.length - 1 ? (
                <span className="lp-step__arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </Fragment>
          ))}
        </div>
      </section>

      <section className="lp-section" id="login">
        <div className="lp-section__head" data-reveal>
          <h2>ARGOS'a Giriş Yap</h2>
          <p>Demo için herhangi bir e-posta ve şifre yeterli.</p>
        </div>
        <div data-reveal>
          <LpLogin />
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer__cols">
          <div>
            <div className="lp-nav__brand" style={{ marginBottom: 12 }}>
              <ArgosCube size={20} />
              <span className="lp-word" style={{ fontSize: 16 }}>
                ARGOS
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 250, lineHeight: 1.6 }}>
              Yapay zekâ destekli yatırım asistanı. Portföyünüzü gerçek zamanlı izler, teknik analizle yorumlar ve
              önemli gelişmeleri anında bildirir.
            </p>
          </div>
          <div>
            <div className="lp-footer__h">Linkler</div>
            {(
              [
                ["features", "Özellikler"],
                ["how", "Nasıl Çalışır"],
                ["login", "Giriş Yap"],
              ] as const
            ).map(([id, l]) => (
              <button key={id} type="button" className="lp-footer__link" onClick={() => scrollTo(id)}>
                {l}
              </button>
            ))}
          </div>
          <div>
            <div className="lp-footer__h">İletişim</div>
            <div className="lp-footer__link" style={{ cursor: "default" }}>
              github.com/tunagirisken/argos
            </div>
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
