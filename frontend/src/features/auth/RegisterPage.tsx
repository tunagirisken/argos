import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/icons/Icon";
import { ThemeToggle } from "../../components/ui/ThemeToggle";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import "../../styles/landing.css";

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.authRegister(username.trim(), password);
      setSession(res.token, res.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lp">
      <nav className="lp-nav">
        <Link to="/" className="lp-nav__brand" style={{ textDecoration: "none", color: "inherit" }}>
          <span className="lp-mark">
            <Icon name="eye" size={20} />
          </span>
          <span className="lp-word">ARGOS</span>
        </Link>
        <div className="lp-nav__right" style={{ marginLeft: "auto" }}>
          <ThemeToggle />
        </div>
      </nav>

      <section className="lp-section" style={{ paddingTop: 60 }}>
        <div className="lp-section__head">
          <h2>Hesap Oluştur</h2>
          <p>ARGOS'a katıl — portföyünü izlemeye başla</p>
        </div>
        <form className="card lp-login" style={{ borderColor: "var(--border-default)" }} onSubmit={submit}>
          <label className="lp-field">
            <span>Kullanıcı adı</span>
            <input
              className="input"
              value={username}
              autoComplete="username"
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="lp-field">
            <span>Şifre (min 6)</span>
            <div style={{ position: "relative" }}>
              <input
                className="input"
                type={showPass ? "text" : "password"}
                value={password}
                autoComplete="new-password"
                style={{ paddingRight: 40 }}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="lp-eye"
                onClick={() => setShowPass((s) => !s)}
                tabIndex={-1}
                aria-label="Şifreyi göster/gizle"
              >
                <Icon name={showPass ? "moon" : "eye"} size={16} />
              </button>
            </div>
          </label>
          {error ? (
            <div style={{ color: "var(--negative)", fontSize: 13 }}>{error}</div>
          ) : null}
          <button type="submit" className="btn btn--accent" style={{ width: "100%", padding: 12 }} disabled={busy}>
            {busy ? "Kaydediliyor…" : "Hesap oluştur"}
          </button>
          <div className="lp-sublinks">
            <button type="button" onClick={() => navigate("/login")}>
              Zaten hesabın var mı? Giriş yap
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
