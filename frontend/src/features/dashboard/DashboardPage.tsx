import { useNavigate } from "react-router-dom";
import { AddPositionForm } from "../../components/dashboard/AddPositionForm";
import { SummaryBar, TVStockCard } from "../../components/dashboard/TVDashboard";
import { api } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";

export function DashboardPage() {
  const navigate = useNavigate();
  const { stocks, summary, load, loadError, loading, bundleWarnings } = usePortfolioStore();

  const removeStock = async (symbol: string) => {
    await api.deletePosition(symbol);
    await load();
  };

  if (loading && !summary) return <div className="page">Yükleniyor…</div>;

  if (loadError && !summary) {
    return (
      <div className="page" style={{ textAlign: "center", padding: 32 }}>
        <p className="neg" style={{ marginBottom: 12 }}>
          {loadError}
        </p>
        <button type="button" className="btn btn--accent" onClick={() => load()}>
          Tekrar dene
        </button>
      </div>
    );
  }

  if (!summary) return <div className="page">Yükleniyor…</div>;

  return (
    <div className="page">
      <SummaryBar summary={summary} positionCount={stocks.length} />

      {bundleWarnings.length > 0 && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderColor: "var(--t-warn)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong>Bazı hisseler için canlı grafik verisi alınamadı.</strong> Pozisyonlar kayıtlı fiyatlarla
          gösteriliyor.
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {bundleWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, gap: 12 }}>
        <span className="section-label" style={{ margin: 0 }}>
          Pozisyonlar
        </span>
        <AddPositionForm />
        <span className="faint" style={{ marginLeft: "auto", fontSize: 12 }}>
          Detay için karta tıkla →
        </span>
      </div>
      <div className="tv-grid">
        {stocks.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "32px 16px",
              color: "var(--text-muted)",
              fontSize: 13,
              border: "1px dashed var(--border-default)",
              borderRadius: "var(--radius-md)",
              lineHeight: 1.6,
            }}
          >
            Henüz pozisyon yok.
            <br />
            Yukarıdaki &quot;Hisse Ekle&quot; ile başlayın.
          </div>
        ) : (
          stocks.map((s) => (
            <TVStockCard
              key={s.t}
              s={s}
              onOpen={(t) => navigate(`/stock/${t}`)}
              onRemove={removeStock}
            />
          ))
        )}
      </div>
    </div>
  );
}
