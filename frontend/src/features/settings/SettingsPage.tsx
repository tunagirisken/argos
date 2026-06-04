import { useEffect, useState } from "react";
import { Icon } from "../../components/icons/Icon";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";
import { IntegrationsSettings } from "./IntegrationsSettings";

type Integrations = {
  llm: boolean;
  telegram: boolean;
  firecrawl: boolean;
  exa: boolean;
  sentry: boolean;
};

export function SettingsPage({ onResetSetup }: { onResetSetup: () => void }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [integrations, setIntegrations] = useState<Integrations | null>(null);

  const refreshIntegrations = () => {
    api.setupIntegrations().then(setIntegrations).catch(() => setIntegrations(null));
  };

  useEffect(() => {
    refreshIntegrations();
  }, []);

  const rows = [
    { k: "Para Birimi", v: "USD ($)" },
    { k: "Saat Dilimi", v: "İstanbul (GMT+3)" },
    { k: "Sabah Brifingi", v: "08:30 · Açık" },
    { k: "Kapanış Raporu", v: "23:05 · Açık" },
    { k: "Anlık Bildirimler", v: "Açık" },
    { k: "Veri Kaynağı", v: "Canlı · WebSocket" },
  ];

  const intRows = integrations
    ? [
        { k: "LLM (Gemini/Claude)", ok: integrations.llm },
        { k: "Telegram", ok: integrations.telegram },
        { k: "Firecrawl (haber)", ok: integrations.firecrawl },
        { k: "Exa (haber yedek)", ok: integrations.exa },
        { k: "Sentry", ok: integrations.sentry },
      ]
    : [];

  return (
    <div className="page">
      <div style={{ maxWidth: 560 }}>
        <div className="section-label">Hesap & Tercihler</div>
        <div className="card" style={{ padding: "6px 20px", marginBottom: 18 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "15px 0",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{user?.username}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {user?.is_admin ? "Admin" : "Üye"}
              </div>
            </div>
            <button type="button" className="btn btn--ghost" onClick={logout}>
              Çıkış
            </button>
          </div>
        </div>

        <IntegrationsSettings />

        <div className="card" style={{ padding: "6px 20px", marginBottom: 18 }}>
          <div className="section-label" style={{ padding: "12px 0 8px" }}>
            Bağlantı durumu
          </div>
          {intRows.map((r, i) => (
            <div
              key={r.k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderTop: i ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <span className="muted">{r.k}</span>
              <span className={`badge ${r.ok ? "badge--buy" : "badge--hold"}`}>{r.ok ? "Bağlı" : "Eksik"}</span>
            </div>
          ))}
          <button type="button" className="btn btn--ghost" style={{ margin: "8px 0 12px" }} onClick={refreshIntegrations}>
            Durumu yenile
          </button>
        </div>

        <div className="card" style={{ padding: "6px 20px" }}>
          {rows.map((r, i) => (
            <div
              key={r.k}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "15px 0",
                borderTop: i ? "1px solid var(--border-subtle)" : "none",
              }}
            >
              <span className="muted">{r.k}</span>
              <span className="mono" style={{ fontSize: 13 }}>
                {r.v}
              </span>
            </div>
          ))}
        </div>

        <div
          className="card glow-accent"
          style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14, padding: 16 }}
        >
          <span
            className="ticker-logo"
            style={{
              background: "color-mix(in srgb, var(--t-accent) 22%, var(--bg-elevated))",
              color: "var(--t-accent)",
            }}
          >
            <Icon name="eye" size={20} />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>Görünümü değiştir</div>
            <div className="muted" style={{ fontSize: 12 }}>
              Sağ üstteki Tweaks panelinden aksan rengi, glow ve yoğunluğu ayarla.
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14, padding: 16 }}>
          <span className="ticker-logo" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
            <Icon name="settings" size={18} />
          </span>
          <div>
            <div style={{ fontWeight: 600 }}>Kurulum sihirbazı</div>
            <div className="muted" style={{ fontSize: 12 }}>
              API anahtarları ve portföyü yeniden yapılandır.
            </div>
          </div>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ marginLeft: "auto" }}
            onClick={async () => {
              await api.setupReset();
              onResetSetup();
            }}
          >
            Yeniden çalıştır
          </button>
        </div>
      </div>
    </div>
  );
}
