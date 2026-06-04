import { useState } from "react";
import { MiniChart } from "../charts/MiniChart";
import { RsiMini } from "../charts/RsiMini";
import { Icon } from "../icons/Icon";
import { fmtPct, fmtUSD } from "../../lib/format";
import { signalClass, stopZone } from "../../lib/lwc";
import { useTheme } from "../../theme/ThemeContext";
import type { PortfolioSummary, Stock } from "../../types";

export function SummaryBar({ summary, positionCount }: { summary: PortfolioSummary; positionCount: number }) {
  const p = summary;
  const dPos = p.dayPL >= 0;
  const tPos = p.totalReturn >= 0;
  return (
    <div className="summary-bar">
      <div className="summary-bar__cell accent-edge">
        <span className="k">Toplam Değer</span>
        <span className="v">{fmtUSD(p.totalValue, 2)}</span>
      </div>
      <div className="summary-bar__cell">
        <span className="k">Günlük P&L</span>
        <span className={`v ${dPos ? "pos" : "neg"}`}>
          {(dPos ? "+" : "−") + fmtUSD(Math.abs(p.dayPL), 0).slice(1)}
        </span>
        <span className={`sub ${dPos ? "pos" : "neg"}`}>{fmtPct(p.dayPct)}</span>
      </div>
      <div className="summary-bar__cell">
        <span className="k">Toplam Getiri</span>
        <span className={`v ${tPos ? "pos" : "neg"}`}>{fmtPct(p.totalReturnPct)}</span>
        <span className={`sub ${tPos ? "pos" : "neg"}`}>
          {(tPos ? "+" : "−") + fmtUSD(Math.abs(p.totalReturn), 0).slice(1)}
        </span>
      </div>
      <div className="summary-bar__cell">
        <span className="k">Nakit</span>
        <span className="v">{fmtUSD(p.cash, 0)}</span>
        <span className="sub muted">Bekleyen {fmtUSD(p.pendingOrders, 0)}</span>
      </div>
      <div className="summary-bar__cell grow" style={{ alignItems: "flex-end", justifyContent: "center" }}>
        <span className="k">Pozisyon</span>
        <span className="v">{positionCount}</span>
      </div>
    </div>
  );
}

function MiniToggle({ mode, onMode }: { mode: "candle" | "line"; onMode: (m: "candle" | "line") => void }) {
  return (
    <div className="seg mini" onClick={(e) => e.stopPropagation()} title="Grafik tipi">
      <button
        type="button"
        className={mode === "candle" ? "on" : ""}
        onClick={() => onMode("candle")}
        aria-label="Mum"
      >
        <Icon name="candles" size={14} />
      </button>
      <button
        type="button"
        className={mode === "line" ? "on" : ""}
        onClick={() => onMode("line")}
        aria-label="Çizgi"
      >
        <Icon name="line" size={14} />
      </button>
    </div>
  );
}

export function TVStockCard({
  s,
  onOpen,
  onRemove,
}: {
  s: Stock;
  onOpen: (t: string) => void;
  onRemove?: (t: string) => Promise<void>;
}) {
  const { theme, tweaks } = useTheme();
  const [mode, setMode] = useState<"candle" | "line">("candle");
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const dayPos = s.dayPct >= 0;
  const totPos = s.totalPct >= 0;
  const sig = signalClass(String(s.signal));
  const fillPct = Math.max(4, Math.min(96, ((s.price - s.stop) / (s.target - s.stop)) * 100));
  const zone = stopZone(s.stopDist);

  const remove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemove || removing) return;
    setRemoving(true);
    try {
      await onRemove(s.t);
      setConfirmRemove(false);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div
      className={`tv-card sig-${sig}`}
      onClick={() => onOpen(s.t)}
      onKeyDown={(e) => e.key === "Enter" && onOpen(s.t)}
      role="button"
      tabIndex={0}
    >
      {onRemove ? (
        <div className={`tv-card__remove${confirmRemove ? " is-open" : ""}`}>
          {confirmRemove ? (
            <>
              <span className="tv-card__remove-confirm">Kaldır?</span>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={removing}
                style={{ fontSize: 11, padding: "4px 8px", color: "var(--negative)" }}
                onClick={remove}
              >
                {removing ? "…" : "Sil"}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={removing}
                style={{ fontSize: 11, padding: "4px 8px" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmRemove(false);
                }}
              >
                İptal
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn--ghost"
              aria-label={`${s.t} pozisyonunu kaldır`}
              title="Pozisyonu kaldır"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmRemove(true);
              }}
            >
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      ) : null}
      <div className="tv-card__top">
        <div className="tv-card__id">
          <div className="tv-card__sym">
            <span
              className="ticker-logo"
              style={{ background: s.logo, width: 26, height: 26, fontSize: 10, borderRadius: 6 }}
            >
              {s.t.slice(0, 2)}
            </span>
            <span className="t">{s.t}</span>
          </div>
          <div className="tv-card__name">{s.name}</div>
          <div className={`tv-card__price${s.priceFlash ? ` flash-${s.priceFlash}` : ""}`}>
            {fmtUSD(s.price)}
          </div>
          <div className={`tv-card__chg ${dayPos ? "pos" : "neg"}`}>
            {dayPos ? "▲" : "▼"} {fmtPct(s.dayPct)}
          </div>
        </div>
        <div
          style={{
            position: "relative",
            height: 76,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <div style={{ position: "absolute", top: 0, right: 0, zIndex: 2 }}>
            <MiniToggle mode={mode} onMode={setMode} />
          </div>
          <div className="tv-card__chart">
            {tweaks.showSparkline && s.lw ? (
              <MiniChart lw={s.lw} mode={mode} theme={theme} />
            ) : null}
          </div>
        </div>
        <div className="tv-card__right">
          <span className={`sigbadge ${sig}${s.signalFlash ? " flash-signal" : ""}`}>● {s.signal}</span>
          <RsiMini value={s.rsi} />
        </div>
      </div>
      <div className="tv-card__foot">
        <div className="tv-card__metric">
          <div className="k">Maliyet</div>
          <div className="v">{fmtUSD(s.cost)}</div>
        </div>
        <div className="tv-card__metric">
          <div className="k">Getiri</div>
          <div className={`v ${totPos ? "pos" : "neg"}`}>{fmtPct(s.totalPct)}</div>
        </div>
        <div className="tv-card__metric">
          <div className="k">Stop</div>
          <div className="v">{fmtUSD(s.stop, 0)}</div>
        </div>
        <div className="tv-card__metric">
          <div className="k">Hedef</div>
          <div className="v">{fmtUSD(s.target, 0)}</div>
        </div>
        <div className="tv-card__bar-wrap">
          <div className="rangebar">
            <div className={`rangebar__fill ${zone}`} style={{ width: `${fillPct}%` }} />
          </div>
          <div
            style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10 }}
            className="faint tnum"
          >
            <span>Stop'a %{s.stopDist.toFixed(1)}</span>
            <span>Hedefe %{(((s.target - s.price) / s.price) * 100).toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
