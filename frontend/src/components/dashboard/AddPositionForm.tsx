import { useEffect, useState } from "react";
import { StockSymbolSearch } from "../stocks/StockSymbolSearch";
import { Icon } from "../icons/Icon";
import { api } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";

export function AddPositionForm() {
  const load = usePortfolioStore((s) => s.load);
  const stocks = usePortfolioStore((s) => s.stocks);
  const [open, setOpen] = useState(false);
  const [sym, setSym] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reset = () => {
    setSym("");
    setName("");
    setShares("");
    setCost("");
    setErr("");
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    reset();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy]);

  const canAdd = sym.trim().length > 0 && +shares > 0 && +cost > 0;

  const submit = async () => {
    if (!canAdd) return;
    const symbol = sym.trim().toUpperCase();
    if (stocks.some((s) => s.t === symbol)) {
      setErr(`${symbol} zaten portföyünüzde.`);
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api.addPosition({
        symbol,
        name: name || undefined,
        shares: +shares,
        avg_cost: +cost,
      });
      await load();
      close();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Pozisyon eklenemedi.";
      try {
        const parsed = JSON.parse(msg) as { detail?: string };
        setErr(parsed.detail || msg);
      } catch {
        setErr(msg.replace(/^"|"$/g, "") || "Pozisyon eklenemedi.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost"
        style={{ padding: "6px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
        onClick={() => setOpen(true)}
      >
        <Icon name="plus" size={14} />
        Hisse Ekle
      </button>

      {open ? (
        <div className="scrim" onClick={close} role="presentation">
          <div
            className="setup__card"
            style={{ width: "min(560px, calc(100vw - 32px))", padding: "22px 24px" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-position-title"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 id="add-position-title" style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                Yeni Hisse
              </h2>
              <button
                type="button"
                className="btn btn--ghost"
                style={{ marginLeft: "auto", padding: 7, lineHeight: 0 }}
                aria-label="Kapat"
                onClick={close}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="setup-stock-row setup-stock-row--search">
              <StockSymbolSearch
                value={sym}
                onChange={setSym}
                onSelect={(pick) => setName(pick.name)}
                placeholder="NVDA, Apple…"
                disabled={busy}
              />
              <div className="field__wrap" style={{ padding: "0 10px" }}>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Adet"
                  value={shares}
                  disabled={busy}
                  onChange={(e) => setShares(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <div className="field__wrap" style={{ padding: "0 10px" }}>
                <span className="faint mono">$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ort. Alış"
                  value={cost}
                  disabled={busy}
                  onChange={(e) => setCost(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>
              <button
                type="button"
                className="btn btn--accent"
                disabled={busy || !canAdd}
                onClick={submit}
              >
                {busy ? "…" : "Ekle"}
              </button>
            </div>

            {err ? (
              <div style={{ color: "var(--negative)", fontSize: 13, marginTop: 10 }}>{err}</div>
            ) : (
              <p className="faint" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
                Stop ve hedef otomatik belirlenir.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
