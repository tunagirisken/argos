import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { StockLogo } from "../../components/stocks/StockLogo";
import { Icon } from "../../components/icons/Icon";
import { fmtPct, fmtUSD } from "../../lib/format";
import {
  api,
  type EngineFeedItem,
  type EngineStatus,
  type EngineStrategy,
  type EngineTrade,
  type PortfolioAdvice,
  type PortfolioAdviceItem,
} from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";
import { useTheme } from "../../theme/ThemeContext";
import "../../styles/trade.css";

const DECISION_CLASS: Record<string, string> = {
  AL: "buy",
  SAT: "sell",
  İZLE: "hold",
};

function EquityCurve({ theme }: { theme: string }) {
  const [data, setData] = useState<{ time: string; value: number }[]>([]);

  useEffect(() => {
    api.getEngineEquity().then((r) => setData(r.equity)).catch(() => setData([]));
  }, []);

  const svg = useMemo(() => {
    if (!data.length) return null;
    const W = 760;
    const H = 220;
    const padL = 6;
    const padR = 52;
    const padB = 22;
    const padT = 10;
    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const rng = max - min || 1;
    const plotW = W - padR;
    const x = (i: number) => padL + (i / (data.length - 1)) * (plotW - padL);
    const y = (v: number) => padT + (1 - (v - min) / rng) * (H - padT - padB);
    const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
    const area = `${line} L${plotW} ${H - padB} L${padL} ${H - padB} Z`;
    const gid = `eqg-${theme}`;
    const last = values[values.length - 1];
    const grids = 4;
    return { W, H, padL, padT, padB, plotW, min, max, rng, area, line, gid, last, y, grids, x, data };
  }, [data, theme]);

  if (!svg) {
    return <div className="faint" style={{ padding: 40, textAlign: "center" }}>Veri yükleniyor…</div>;
  }

  const { W, H, padL, padT, padB, plotW, max, rng, area, line, gid, last, y, grids } = svg;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--t-accent)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="var(--t-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: grids + 1 }).map((_, g) => {
        const gy = padT + (g / grids) * (H - padT - padB);
        const val = max - (g / grids) * rng;
        return (
          <g key={g}>
            <line x1={padL} y1={gy} x2={plotW} y2={gy} stroke="var(--border-subtle)" strokeWidth="1" />
            <text x={plotW + 6} y={gy + 3} fill="var(--text-muted)" fontSize="10" fontFamily="var(--font-mono)">
              ${(val / 1000).toFixed(0)}k
            </text>
          </g>
        );
      })}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="var(--t-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <line x1={padL} y1={y(last)} x2={plotW} y2={y(last)} stroke="var(--t-accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
    </svg>
  );
}

function TeMetric({ k, v, sub, tone }: { k: string; v: string; sub?: string; tone?: string }) {
  return (
    <div className="te-metric">
      <span className="te-metric__k">{k}</span>
      <span className={`te-metric__v ${tone || ""}`}>{v}</span>
      {sub ? <span className={`te-metric__sub ${tone || "muted"}`}>{sub}</span> : null}
    </div>
  );
}

function TeSwitch({ on, onClick, label }: { on: boolean; onClick: () => void; label?: string }) {
  return (
    <button type="button" className={`te-switch${on ? " on" : ""}`} onClick={onClick} aria-label={label || "Aç/Kapa"}>
      <span />
    </button>
  );
}

const TONE_COLOR: Record<string, string> = {
  buy: "var(--positive)",
  sell: "var(--negative)",
  hold: "var(--warning)",
  info: "var(--info)",
};

function AdviceLevel({ cur, sug, needs }: { cur?: number | null; sug?: number; needs?: boolean }) {
  if (sug == null) return <span className="muted">—</span>;
  return (
    <div className="te-advice-levels">
      <span className="mono faint">{cur != null ? fmtUSD(cur) : "—"}</span>
      <span className="te-advice-arrow">→</span>
      <span className={`mono ${needs ? "pos" : ""}`} style={{ fontWeight: needs ? 600 : 400 }}>
        {fmtUSD(sug)}
      </span>
    </div>
  );
}

export function TradeEnginePage() {
  const { theme } = useTheme();
  const loadPortfolio = usePortfolioStore((s) => s.load);
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [strategies, setStrategies] = useState<EngineStrategy[]>([]);
  const [trades, setTrades] = useState<EngineTrade[]>([]);
  const [feed, setFeed] = useState<EngineFeedItem[]>([]);
  const [advice, setAdvice] = useState<PortfolioAdvice | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adviceBusy, setAdviceBusy] = useState(false);
  const [risk, setRisk] = useState(2);
  const [maxPos, setMaxPos] = useState(6);
  const [autoTelegram, setAutoTelegram] = useState(true);
  const [mode, setMode] = useState<"paper" | "live">("paper");
  const [running, setRunning] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [st, str, tr, fd] = await Promise.all([
      api.getEngineStatus(),
      api.getEngineStrategies(),
      api.getEngineTrades(),
      api.getEngineFeed(),
    ]);
    setStatus(st);
    setStrategies(str.strategies);
    setTrades(tr.trades);
    setFeed(fd.feed);
    setRunning(st.running);
    setMode(st.mode as "paper" | "live");
    setRisk(st.metrics.risk_per_trade);
    setMaxPos(st.metrics.max_positions);
  }, []);

  const refreshAdvice = useCallback(async () => {
    setAdviceBusy(true);
    try {
      const data = await api.getPortfolioAdvice();
      setAdvice(data);
      const actionable = new Set(
        data.positions
          .filter((p) => p.stop_needs_update || p.target_needs_update)
          .map((p) => p.symbol)
      );
      setSelected(actionable);
    } finally {
      setAdviceBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
    refreshAdvice().catch(() => {});
    const poll = window.setInterval(() => {
      api.getEngineFeed().then((r) => setFeed(r.feed)).catch(() => {});
    }, 8000);
    return () => window.clearInterval(poll);
  }, [refresh, refreshAdvice]);

  const toggleSelect = (sym: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) next.delete(sym);
      else next.add(sym);
      return next;
    });
  };

  const applyAdvice = async (symbols?: string[]) => {
    setAdviceBusy(true);
    try {
      await api.applyPortfolioAdvice(symbols);
      await loadPortfolio();
      await refreshAdvice();
    } finally {
      setAdviceBusy(false);
    }
  };

  const toggleRunning = async () => {
    setBusy(true);
    try {
      const r = await api.toggleEngine();
      setRunning(r.running);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const setEngineMode = async (m: "paper" | "live") => {
    setMode(m);
    await api.updateEngineConfig({ mode: m });
  };

  const saveConfig = async (patch: { risk_per_trade?: number; max_positions?: number; auto_telegram?: boolean }) => {
    await api.updateEngineConfig(patch);
  };

  const toggleStrategy = async (id: string, active: boolean) => {
    setStrategies((s) => s.map((x) => (x.id === id ? { ...x, active } : x)));
    try {
      await api.setEngineStrategy(id, active);
    } catch {
      await refresh();
    }
  };

  const metrics = status?.metrics;
  const openTrades = trades.filter((t) => t.status === "açık");
  const activeCount = strategies.filter((s) => s.active).length;

  const adviceRows = advice?.positions.filter((p) => !p.error) ?? [];

  return (
    <div className="page te">
      <div className="te-advice-hero">
        <div>
          <h1 className="te-advice-hero__title">Portföy Tavsiye Merkezi</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 4, maxWidth: 520 }}>
            Stop-loss, hedef fiyat ve işlem sinyalleri portföyünüz için otomatik analiz edilir. Tüm
            tavsiyeleri buradan yönetin.
          </p>
        </div>
        <div className="te-advice-hero__actions">
          <button type="button" className="btn btn--ghost" disabled={adviceBusy} onClick={() => refreshAdvice()}>
            <Icon name="spark" size={15} /> Yenile
          </button>
          <button
            type="button"
            className="btn btn--accent"
            disabled={adviceBusy || selected.size === 0}
            onClick={() => applyAdvice([...selected])}
          >
            Seçilenleri Uygula ({selected.size})
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={adviceBusy || adviceRows.length === 0}
            onClick={() => applyAdvice()}
          >
            Tümünü Uygula
          </button>
        </div>
      </div>

      {advice && (
        <div className="te-advice-metrics">
          <TeMetric k="Pozisyon" v={String(advice.position_count)} sub="portföyde" />
          <TeMetric
            k="Güncelleme Gerekli"
            v={String(advice.needs_action)}
            sub="stop veya hedef"
            tone={advice.needs_action > 0 ? "neg" : "pos"}
          />
          <TeMetric
            k="Yüksek Öncelik"
            v={String(advice.high_priority)}
            sub="SAT veya kritik"
            tone={advice.high_priority > 0 ? "neg" : "muted"}
          />
          <TeMetric k="Son Analiz" v={new Date(advice.generated_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} sub="yerel saat" />
        </div>
      )}

      <div className="panel te-advice-panel">
        <div className="panel__head">
          <span className="ttl">Pozisyon Önerileri</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          {adviceBusy && !advice ? (
            <p className="muted" style={{ padding: 24, textAlign: "center" }}>
              Portföy analiz ediliyor…
            </p>
          ) : adviceRows.length === 0 ? (
            <p className="muted" style={{ padding: 24, textAlign: "center" }}>
              Portföyde pozisyon yok. Dashboard&apos;dan hisse ekleyin.
            </p>
          ) : (
            <table className="te-table te-advice-table">
              <thead>
                <tr>
                  <th />
                  <th>Hisse</th>
                  <th className="tr">Fiyat</th>
                  <th className="tr">P&L</th>
                  <th>Stop</th>
                  <th>Hedef</th>
                  <th>Sinyal</th>
                  <th>Not</th>
                </tr>
              </thead>
              <tbody>
                {adviceRows.map((p: PortfolioAdviceItem) => {
                  const dec = p.trade_decision || "İZLE";
                  return (
                    <tr key={p.symbol} className={p.priority === "yüksek" ? "te-advice-row--hot" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(p.symbol)}
                          onChange={() => toggleSelect(p.symbol)}
                          aria-label={`${p.symbol} seç`}
                        />
                      </td>
                      <td>
                        <Link to={`/stock/${p.symbol}`} className="te-advice-sym">
                          <StockLogo symbol={p.symbol} size={26} />
                          <span className="mono" style={{ fontWeight: 700 }}>
                            {p.symbol}
                          </span>
                        </Link>
                      </td>
                      <td className="mono tr">{p.price != null ? fmtUSD(p.price) : "—"}</td>
                      <td className={`mono tr ${(p.pnl_pct ?? 0) >= 0 ? "pos" : "neg"}`}>
                        {p.pnl_pct != null ? fmtPct(p.pnl_pct) : "—"}
                      </td>
                      <td>
                        <AdviceLevel cur={p.current_stop} sug={p.suggested_stop} needs={p.stop_needs_update} />
                      </td>
                      <td>
                        <AdviceLevel cur={p.current_target} sug={p.suggested_target} needs={p.target_needs_update} />
                      </td>
                      <td>
                        <span className={`sigbadge ${DECISION_CLASS[dec] || "hold"}`}>{dec}</span>
                        {p.trade_score != null ? (
                          <span className="faint mono" style={{ fontSize: 10, marginLeft: 6 }}>
                            {p.trade_score}/5
                          </span>
                        ) : null}
                      </td>
                      <td className="muted" style={{ fontSize: 11.5, maxWidth: 200 }}>
                        {(p.notes || []).slice(0, 2).join(" · ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="te-section-divider">
        <span>İşlem Motoru</span>
      </div>

      <div className="te-status">
        <div className="te-status__left">
          <span className={`te-pulse ${running ? "on" : "off"}`} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              Otomatik Motor {running ? "Çalışıyor" : "Duraklatıldı"}
            </div>
            <div className="muted" style={{ fontSize: 12 }}>
              {activeCount} aktif strateji · {mode === "paper" ? "Kağıt İşlem (simülasyon)" : "Canlı İşlem"}
            </div>
          </div>
        </div>
        <div className="te-status__right">
          <div className="seg">
            <button type="button" className={mode === "paper" ? "on" : ""} onClick={() => setEngineMode("paper")}>
              Kağıt
            </button>
            <button type="button" className={mode === "live" ? "on" : ""} onClick={() => setEngineMode("live")}>
              Canlı
            </button>
          </div>
          <button
            type="button"
            className={`btn ${running ? "btn--ghost" : "btn--accent"}`}
            disabled={busy}
            onClick={toggleRunning}
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <Icon name={running ? "moon" : "play"} size={15} />
            {running ? "Duraklat" : "Başlat"}
          </button>
        </div>
      </div>

      {mode === "live" && (
        <div className="te-warn">
          <Icon name="bell" size={15} />
          <span>
            <strong>Canlı mod aktif.</strong> Motor gerçek emirler iletecek. Risk limitlerini kontrol edin.
          </span>
        </div>
      )}

      {metrics && (
        <div className="te-metrics">
          <TeMetric k="Toplam Getiri" v={fmtPct(metrics.total_return_pct)} sub="motor başlangıcından" tone="pos" />
          <TeMetric
            k="Kazanma Oranı"
            v={`%${metrics.win_rate}`}
            sub={`${metrics.wins}/${metrics.trade_count} işlem`}
            tone={metrics.win_rate >= 60 ? "pos" : "muted"}
          />
          <TeMetric k="Açık Pozisyon" v={`${openTrades.length}/${maxPos}`} sub="aktif slot" />
          <TeMetric k="İşlem Başına Risk" v={`%${risk}`} sub="portföy oranı" />
          <TeMetric k="Sharpe" v={String(metrics.sharpe)} sub="90 günlük" tone="pos" />
        </div>
      )}

      <div className="te-grid">
        <div className="te-col">
          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Sermaye Eğrisi</span>
              <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
                Son 90 gün
              </span>
            </div>
            <div style={{ height: 240, padding: "8px 4px" }}>
              <EquityCurve theme={theme} />
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Motor İşlemleri</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="te-table">
                <thead>
                  <tr>
                    {["Hisse", "Yön", "Strateji", "Giriş", "Güncel", "P&L", "Durum"].map((h) => (
                      <th key={h} className={["Giriş", "Güncel", "P&L"].includes(h) ? "tr" : ""}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr key={`${t.symbol}-${i}`}>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        {t.symbol}
                      </td>
                      <td>
                        <span className={`sigbadge ${t.side === "AL" ? "buy" : "sell"}`}>{t.side}</span>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>
                        {t.strategy}
                      </td>
                      <td className="mono tr">{fmtUSD(t.entry)}</td>
                      <td className="mono tr">{fmtUSD(t.current)}</td>
                      <td className="mono tr pos" style={{ fontWeight: 600 }}>
                        +{t.pnl_pct.toFixed(2)}%
                      </td>
                      <td>
                        <span className={`te-chip ${t.status === "açık" ? "open" : "closed"}`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="te-col">
          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Stratejiler</span>
            </div>
            <div className="panel__body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {strategies.map((s) => (
                <div key={s.id} className={`te-strat${s.active ? " active" : ""}`}>
                  <TeSwitch on={s.active} onClick={() => toggleStrategy(s.id, !s.active)} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {s.desc}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: s.win_rate >= 60 ? "var(--positive)" : "var(--text-secondary)",
                      }}
                    >
                      %{s.win_rate}
                    </div>
                    <div className="faint" style={{ fontSize: 10 }}>
                      {s.trades} işlem
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Risk Kontrolleri</span>
            </div>
            <div className="panel__body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div className="te-slider-top">
                  <span>İşlem başına risk</span>
                  <span className="mono" style={{ color: "var(--t-accent)" }}>
                    %{risk}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.5"
                  value={risk}
                  className="te-range"
                  onChange={(e) => {
                    const v = +e.target.value;
                    setRisk(v);
                    saveConfig({ risk_per_trade: v });
                  }}
                />
              </div>
              <div>
                <div className="te-slider-top">
                  <span>Maksimum açık pozisyon</span>
                  <span className="mono" style={{ color: "var(--t-accent)" }}>
                    {maxPos}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={maxPos}
                  className="te-range"
                  onChange={(e) => {
                    const v = +e.target.value;
                    setMaxPos(v);
                    saveConfig({ max_positions: v });
                  }}
                />
              </div>
              <label className="te-toggle-row">
                <span>Telegram&apos;a otomatik bildir</span>
                <TeSwitch
                  on={autoTelegram}
                  onClick={() => {
                    const v = !autoTelegram;
                    setAutoTelegram(v);
                    saveConfig({ auto_telegram: v });
                  }}
                />
              </label>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Karar Akışı</span>
              <span className="te-live" style={{ marginLeft: "auto" }}>
                <span className="te-live__dot" />
                canlı
              </span>
            </div>
            <div className="te-feed">
              {feed.map((f, i) => (
                <div key={`${f.time}-${i}`} className="te-feed__row" style={{ opacity: i === 0 ? 1 : 0.9 }}>
                  <span className="mono faint" style={{ fontSize: 10.5, flexShrink: 0 }}>
                    {f.time}
                  </span>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: TONE_COLOR[f.tone] || TONE_COLOR.info,
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 700 }}>
                      {f.symbol}
                    </span>
                    <span style={{ fontSize: 12, marginLeft: 6, color: "var(--text-secondary)" }}>{f.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
