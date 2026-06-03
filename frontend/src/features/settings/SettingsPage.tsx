import { api } from "../../services/api";
import { Icon } from "../../components/icons/Icon";

export function SettingsPage({ onResetSetup }: { onResetSetup: () => void }) {
  const rows = [
    { k: "Para Birimi", v: "USD ($)" },
    { k: "Saat Dilimi", v: "İstanbul (GMT+3)" },
    { k: "Sabah Brifingi", v: "09:00 · Açık" },
    { k: "Kapanış Raporu", v: "23:05 · Açık" },
  ];

  return (
    <div className="page">
      <div style={{ maxWidth: 560 }}>
        <div className="section-label">Hesap & Tercihler</div>
        <div className="card" style={{ padding: "6px 20px" }}>
          {rows.map((r, i) => (
            <div
              key={r.k}
              style={{
                display: "flex",
                justifyContent: "space-between",
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
        <div className="card" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 14 }}>
          <Icon name="settings" size={18} />
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
