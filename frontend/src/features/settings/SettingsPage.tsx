import { useCallback, useEffect, useState } from "react";
import { Icon } from "../../components/icons/Icon";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { usePortfolioStore } from "../../store/portfolioStore";
import "../../styles/settings.css";

function StSwitch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`st-switch${on ? " on" : ""}`} onClick={onClick} aria-label="Aç/Kapa">
      <span />
    </button>
  );
}

function StSection({
  icon,
  title,
  desc,
  children,
}: {
  icon: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="st-section">
      <div className="st-section__head">
        <span className="st-section__icon">
          <Icon name={icon} size={17} />
        </span>
        <div>
          <div className="st-section__title">{title}</div>
          {desc ? <div className="st-section__desc">{desc}</div> : null}
        </div>
      </div>
      <div className="st-section__body">{children}</div>
    </div>
  );
}

function StRow({
  k,
  sub,
  children,
  last,
}: {
  k: string;
  sub?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className="st-row" style={last ? { borderBottom: "none" } : undefined}>
      <div style={{ minWidth: 0 }}>
        <div className="st-row__k">{k}</div>
        {sub ? <div className="st-row__sub">{sub}</div> : null}
      </div>
      <div className="st-row__ctl">{children}</div>
    </div>
  );
}

type KeyStatus = "ok" | "fail" | "idle";

export function SettingsPage({ onResetSetup }: { onResetSetup: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const wsConnected = usePortfolioStore((s) => s.wsConnected);
  const [toast, setToast] = useState<string | null>(null);
  const [llm, setLlm] = useState("gemini");
  const [notif, setNotif] = useState({ price: true, stop: true, rsi: true, daily: true, news: false });
  const [sched, setSched] = useState({ morning: "08:30", close: "23:05", morning_on: true, close_on: true });
  const [currency, setCurrency] = useState("USD");
  const [refreshing, setRefreshing] = useState(false);
  const [keyStatus, setKeyStatus] = useState<Record<string, KeyStatus>>({
    llm: "idle",
    telegram: "idle",
    firecrawl: "idle",
    exa: "idle",
    sentry: "idle",
  });

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    api
      .getAppConfig()
      .then((cfg) => {
        setLlm(cfg.llm_provider);
        setNotif(cfg.notifications as typeof notif);
        setSched({
          morning: cfg.scheduler.morning,
          close: cfg.scheduler.close,
          morning_on: cfg.scheduler.morning_on,
          close_on: cfg.scheduler.close_on,
        });
        setCurrency(cfg.preferences.currency);
        const integ = cfg.integrations || {};
        setKeyStatus({
          llm: integ.llm ? "ok" : "fail",
          telegram: integ.telegram ? "ok" : "fail",
          firecrawl: integ.firecrawl ? "ok" : "idle",
          exa: integ.exa ? "ok" : "idle",
          sentry: integ.sentry ? "ok" : "idle",
        });
      })
      .catch(() => {});
  }, []);

  const testKey = async (service: string) => {
    flash("Bağlantı test ediliyor…");
    try {
      const r = await api.testIntegration(service);
      setKeyStatus((k) => ({ ...k, [service]: r.ok ? "ok" : "fail" }));
      flash(r.message);
    } catch {
      setKeyStatus((k) => ({ ...k, [service]: "fail" }));
      flash("Test başarısız");
    }
  };

  const saveScheduler = async (patch: Partial<typeof sched>) => {
    const next = { ...sched, ...patch };
    setSched(next);
    try {
      await api.setScheduler(next);
      flash("Zamanlayıcı kaydedildi");
    } catch {
      flash("Kayıt başarısız");
    }
  };

  const saveNotif = async (id: keyof typeof notif, v: boolean) => {
    const next = { ...notif, [id]: v };
    setNotif(next);
    try {
      await api.setNotifications(next);
    } catch {
      flash("Bildirim ayarı kaydedilemedi");
    }
  };

  const refreshSymbols = async () => {
    setRefreshing(true);
    try {
      const r = await api.refreshSymbols();
      flash(`Sembol listesi güncellendi (${r.count ?? "?"} sembol)`);
    } catch {
      flash("Sembol yenileme başarısız");
    } finally {
      setRefreshing(false);
    }
  };

  const statusLabel = (st: KeyStatus) =>
    st === "ok" ? { c: "var(--positive)", t: "Bağlı", i: "check" as const } : st === "fail" ? { c: "var(--negative)", t: "Hata", i: "x" as const } : { c: "var(--text-muted)", t: "Test edilmedi", i: "bell" as const };

  const keys = [
    { id: "llm", label: "LLM (Gemini/Claude)", req: true },
    { id: "telegram", label: "Telegram Bot", req: true },
    { id: "firecrawl", label: "Firecrawl API", req: false },
    { id: "exa", label: "Exa API", req: false },
    { id: "sentry", label: "Sentry DSN", req: false },
  ];

  return (
    <div className="page st">
      <div className="st-wrap">
        <StSection icon="settings" title="Hesap & Tercihler" desc="Genel uygulama ayarları">
          <StRow k="Kullanıcı" sub={user?.is_admin ? "Admin" : "Üye"}>
            <span style={{ fontWeight: 600 }}>{user?.username}</span>
            <button type="button" className="btn btn--ghost" onClick={logout}>
              Çıkış
            </button>
          </StRow>
          <StRow k="Para Birimi" sub="Fiyatların gösterim birimi">
            <select
              className="select st-select"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                api.setPreferences({ currency: e.target.value }).catch(() => {});
              }}
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="TRY">TRY (₺)</option>
            </select>
          </StRow>
          <StRow k="Saat Dilimi" sub="Rapor ve seans saatleri">
            <span className="mono" style={{ fontSize: 13 }}>
              İstanbul (GMT+3)
            </span>
          </StRow>
          <StRow k="Veri Kaynağı" sub="Canlı fiyat akışı" last>
            <span className="st-pill">
              <span className={`st-dot${wsConnected ? "" : ""}`} style={!wsConnected ? { background: "var(--text-muted)", boxShadow: "none" } : undefined} />
              WebSocket · {wsConnected ? "bağlı" : "bekleniyor"}
            </span>
          </StRow>
        </StSection>

        <StSection icon="spark" title="Entegrasyonlar" desc="API anahtarları ve servis bağlantıları">
          {keys.map((k, i) => {
            const s = statusLabel(keyStatus[k.id] || "idle");
            return (
              <StRow key={k.id} k={k.label} sub={k.req ? "Zorunlu" : "Opsiyonel"} last={i === keys.length - 1}>
                <span className="st-status" style={{ color: s.c }}>
                  <Icon name={s.i} size={13} /> {s.t}
                </span>
                <button type="button" className="btn btn--ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => testKey(k.id === "llm" ? (llm === "gemini" ? "gemini" : "anthropic") : k.id)}>
                  Test
                </button>
              </StRow>
            );
          })}
        </StSection>

        <StSection icon="ai" title="LLM Sağlayıcı" desc="AI analiz ve rapor motoru">
          <StRow k="Aktif sağlayıcı" sub="Analiz ve chat için kullanılır" last>
            <div className="seg">
              <button
                type="button"
                className={llm === "anthropic" ? "on" : ""}
                onClick={() => {
                  setLlm("anthropic");
                  api.setLlmProvider("anthropic").then(() => flash("Claude seçildi")).catch(() => flash("Kayıt başarısız"));
                }}
              >
                Claude
              </button>
              <button
                type="button"
                className={llm === "gemini" ? "on" : ""}
                onClick={() => {
                  setLlm("gemini");
                  api.setLlmProvider("gemini").then(() => flash("Gemini seçildi")).catch(() => flash("Kayıt başarısız"));
                }}
              >
                Gemini
              </button>
            </div>
          </StRow>
        </StSection>

        <StSection icon="bell" title="Bildirimler" desc="Telegram bildirim tipleri">
          {(
            [
              ["price", "Fiyat alarmları", "Hedef fiyat ulaşıldığında"],
              ["stop", "Stop-loss uyarıları", "Stop seviyesi tetiklendiğinde"],
              ["rsi", "RSI eşik bildirimleri", "Aşırı alım/satım bölgesinde"],
              ["daily", "Günlük raporlar", "Sabah brifingi ve kapanış"],
              ["news", "Haber bildirimleri", "Önemli haber akışında"],
            ] as const
          ).map(([id, k, sub], i, arr) => (
            <StRow key={id} k={k} sub={sub} last={i === arr.length - 1}>
              <StSwitch on={notif[id]} onClick={() => saveNotif(id, !notif[id])} />
            </StRow>
          ))}
        </StSection>

        <StSection icon="settings" title="Zamanlayıcı" desc="Otomatik rapor saatleri">
          <StRow k="Sabah Brifingi" sub="Seans öncesi portföy özeti">
            <div className="st-sched">
              <input
                type="time"
                className="input st-time"
                value={sched.morning}
                onChange={(e) => saveScheduler({ morning: e.target.value })}
              />
              <StSwitch on={sched.morning_on} onClick={() => saveScheduler({ morning_on: !sched.morning_on })} />
            </div>
          </StRow>
          <StRow k="Kapanış Raporu" sub="Seans sonrası performans" last>
            <div className="st-sched">
              <input
                type="time"
                className="input st-time"
                value={sched.close}
                onChange={(e) => saveScheduler({ close: e.target.value })}
              />
              <StSwitch on={sched.close_on} onClick={() => saveScheduler({ close_on: !sched.close_on })} />
            </div>
          </StRow>
        </StSection>

        <StSection icon="eye" title="Görünüm" desc="Tema ve arayüz">
          <StRow k="Tema" sub="Açık / koyu mod (sağ üstten de değiştirilebilir)">
            <span className="muted" style={{ fontSize: 13 }}>
              Üst çubuktaki anahtardan
            </span>
          </StRow>
          <StRow k="Tweaks paneli" sub="Aksan rengi, glow, yoğunluk, köşe yuvarlaklığı" last>
            <span className="muted" style={{ fontSize: 13 }}>
              Araç çubuğundan aç
            </span>
          </StRow>
        </StSection>

        {user?.is_admin ? (
          <StSection icon="shield" title="Yönetici" desc="Sistem bakımı">
            <StRow k="Sembol Listesi" sub="NYSE/NASDAQ sembol önbelleğini yenile" last>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={refreshing}
                onClick={refreshSymbols}
                style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
              >
                {refreshing ? "Yenileniyor…" : "Listeyi Yenile"}
              </button>
            </StRow>
          </StSection>
        ) : null}

        <StSection icon="docs" title="Kurulum" desc="Yeniden yapılandırma">
          <StRow k="Kurulum Sihirbazı" sub="API anahtarları ve portföyü baştan ayarla" last>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={async () => {
                await api.setupReset();
                onResetSetup();
              }}
            >
              Yeniden çalıştır
            </button>
          </StRow>
        </StSection>

        <div className="st-foot">© 2026 ARGOS · Tüm hakları saklıdır · Tuna Girişken</div>
      </div>

      {toast ? <div className="st-toast">{toast}</div> : null}
    </div>
  );
}
