import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TVChart } from "../../components/charts/TVChart";
import { ScoreDial } from "../../components/charts/RsiMini";
import { Icon } from "../../components/icons/Icon";
import { useMinuteTick } from "../../hooks/useMinuteTick";
import { fmtPct, fmtUSD, formatNewsAge } from "../../lib/format";
import { buildWatchStockFromMarket } from "../../lib/stockFromMarket";
import { ratingLabel, type LwSeries } from "../../lib/lwc";
import type { Time } from "lightweight-charts";
import { api, type AnalystTarget } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";
import { useTheme } from "../../theme/ThemeContext";
import type { NewsItem, SignalIndicator } from "../../types";
import { TradeSignalCard } from "../../components/trade/TradeSignalCard";

const TIME_RANGES = ["1G", "5G", "1A", "3A", "6A", "1Y"];

function ScoreRow({ ind }: { ind: SignalIndicator }) {
  const cls = ind.val > 0 ? "pos" : ind.val < 0 ? "neg" : "zero";
  const txt = ind.val > 0 ? "AL" : ind.val < 0 ? "SAT" : "NÖTR";
  const col = ind.val > 0 ? "var(--positive)" : ind.val < 0 ? "var(--negative)" : "var(--warning)";
  return (
    <div className="score-row">
      <span className="lbl">{ind.key}</span>
      <span className="note">{ind.note}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span className={`score-ind ${cls}`}>
          <i className="lo" />
          <i className="mid" />
          <i className="hi" />
        </span>
        <span className="tnum" style={{ fontSize: 10, fontWeight: 700, color: col, width: 30, textAlign: "right" }}>
          {txt}
        </span>
      </span>
    </div>
  );
}

function DRow({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <span className="muted">{k}</span>
      <span className={`tnum ${tone || ""}`} style={{ fontWeight: 600 }}>
        {v}
      </span>
    </div>
  );
}

function DField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label style={{ flex: 1 }}>
      <div className="faint" style={{ fontSize: 10.5, marginBottom: 5 }}>
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "var(--bg-base)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          padding: "7px 9px",
        }}
      >
        <span className="faint tnum">$</span>
        <input
          className="tnum"
          type="number"
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-primary)",
            width: "100%",
            fontSize: 13,
            outline: "none",
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>
    </label>
  );
}

export function StockDetailPage() {
  const { symbol } = useParams();
  const sym = (symbol || "").toUpperCase();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const stocks = usePortfolioStore((s) => s.stocks);
  const load = usePortfolioStore((s) => s.load);
  const refreshMarket = usePortfolioStore((s) => s.refreshMarket);
  const tradeSignals = usePortfolioStore((s) => s.tradeSignals);
  const portfolioStock = sym ? stocks.find((x) => x.t === sym) : undefined;
  const [watchStock, setWatchStock] = useState<import("../../types").Stock | null>(null);
  const [watchLoading, setWatchLoading] = useState(false);
  const s = portfolioStock ?? watchStock ?? null;
  const isWatchMode = !portfolioStock && !!watchStock;
  const [localTradeSignal, setLocalTradeSignal] = useState<import("../../types").TradeSignal | null>(null);
  const tradeSignal =
    tradeSignals.find((x) => x.symbol === sym) ?? localTradeSignal;

  const [range, setRange] = useState("3A");
  const [mode, setMode] = useState<"candle" | "line">("candle");
  const [overlays, setOverlays] = useState({ ema20: true, ema50: true, bb: false });
  const [stop, setStop] = useState(s?.stop ?? 0);
  const [target, setTarget] = useState(s?.target ?? 0);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [chartLw, setChartLw] = useState<LwSeries | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [analyst, setAnalyst] = useState<AnalystTarget | null>(null);
  const [analystLoading, setAnalystLoading] = useState(true);
  const [syncingTarget, setSyncingTarget] = useState(false);
  const [tradeRefreshing, setTradeRefreshing] = useState(false);
  const newsTick = useMinuteTick();

  useEffect(() => {
    if (!sym || portfolioStock) {
      setWatchStock(null);
      return;
    }
    let cancelled = false;
    setWatchLoading(true);
    api
      .getMarketBundle(sym)
      .then((bundle) => {
        if (cancelled) return;
        setWatchStock(buildWatchStockFromMarket(sym, bundle));
      })
      .catch(() => {
        if (!cancelled) setWatchStock(null);
      })
      .finally(() => {
        if (!cancelled) setWatchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sym, portfolioStock]);

  useEffect(() => {
    if (!sym) return;
    let cancelled = false;
    setChartLoading(true);
    api
      .getMarketBundle(sym)
      .then((data) => {
        if (cancelled) return;
        setChartLw({
          daily: data.daily?.map((b) => ({ ...b, time: b.time as Time })) ?? [],
          dailyVol: data.dailyVol?.map((b) => ({ ...b, time: b.time as Time })) ?? [],
          intra: data.intra?.map((b) => ({ ...b, time: b.time as Time })) ?? [],
          intraVol: data.intraVol?.map((b) => ({ ...b, time: b.time as Time })) ?? [],
        });
      })
      .catch(() => {
        if (!cancelled && s?.lw) setChartLw(s.lw);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sym, s?.lw]);

  useEffect(() => {
    if (s) {
      setStop(s.stop);
      setTarget(s.target);
      setNote(s.note ?? "");
    }
  }, [symbol, s]);

  useEffect(() => {
    if (!s?.lw?.daily?.length) return;
    setChartLw({
      daily: s.lw.daily,
      dailyVol: s.lw.dailyVol,
      intra: s.lw.intra,
      intraVol: s.lw.intraVol,
    });
  }, [s?.lw, s?.t, s?.price]);

  useEffect(() => {
    if (!sym) return;
    api.getNews(sym).then(setNews).catch(() => setNews([]));
  }, [sym]);

  useEffect(() => {
    if (!symbol) return;
    setAnalystLoading(true);
    api
      .getAnalystTarget(sym)
      .then(setAnalyst)
      .catch(() => setAnalyst(null))
      .finally(() => setAnalystLoading(false));
  }, [sym]);

  useEffect(() => {
    if (!sym) return;
    if (portfolioStock) return;
    api
      .getTradeSignal(sym)
      .then(setLocalTradeSignal)
      .catch(() => setLocalTradeSignal(null));
  }, [sym, portfolioStock]);

  const refreshTrade = async () => {
    setTradeRefreshing(true);
    try {
      const sig = await api.getTradeSignal(sym);
      setLocalTradeSignal(sig);
      if (portfolioStock) await refreshMarket();
    } finally {
      setTradeRefreshing(false);
    }
  };

  const applyAnalystTarget = async () => {
    if (!analyst?.recommended_target) return;
    setTarget(analyst.recommended_target);
    await api.updatePosition(sym, { target: analyst.recommended_target });
    await load();
  };

  const syncAllTargets = async () => {
    setSyncingTarget(true);
    try {
      await api.syncTargets();
      const info = await api.getAnalystTarget(sym);
      setAnalyst(info);
      if (info.recommended_target) setTarget(info.recommended_target);
      await load();
    } finally {
      setSyncingTarget(false);
    }
  };

  if (watchLoading && !s) return <div className="page">Hisse yükleniyor…</div>;
  if (!s) return <div className="page">Hisse bulunamadı veya veri alınamadı.</div>;

  const totPos = s.totalPct >= 0;
  const dayPos = s.dayPct >= 0;
  const rating = ratingLabel(s.signalSum);
  const tog = (k: keyof typeof overlays) => setOverlays((o) => ({ ...o, [k]: !o[k] }));
  const sentColor: Record<string, string> = {
    pos: "var(--positive)",
    neg: "var(--negative)",
    neu: "var(--text-muted)",
  };

  const ovBtn = (k: keyof typeof overlays, label: string, color: string) => (
    <button
      type="button"
      className={`chip${overlays[k] ? " active" : ""}`}
      onClick={() => tog(k)}
      style={{ display: "flex", alignItems: "center", gap: 6 }}
    >
      <span style={{ width: 9, height: 2.5, borderRadius: 2, background: color, display: "inline-block" }} /> {label}
    </button>
  );

  const savePosition = async () => {
    await api.updatePosition(s.t, { stop_loss: stop, target, note });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    await load();
  };

  const removePosition = async () => {
    setDeleting(true);
    try {
      await api.deletePosition(s.t);
      await load();
      navigate("/dashboard");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div
      className="page"
      style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", paddingBottom: 18 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => navigate("/dashboard")}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 11px" }}
        >
          <Icon name="back" size={15} /> Geri
        </button>
        <span className="ticker-logo" style={{ background: s.logo, width: 30, height: 30, fontSize: 11, borderRadius: 6 }}>
          {s.t.slice(0, 2)}
        </span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 17 }}>{s.t}</span>
          <span className="muted" style={{ fontSize: 13 }}>
            {s.name}
          </span>
          <span className="badge badge--accent">{s.sector}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {stocks
            .filter((x) => x.t !== s.t)
            .map((x) => (
              <button
                key={x.t}
                type="button"
                className="chip"
                onClick={() => navigate(`/stock/${x.t}`)}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span style={{ width: 6, height: 6, borderRadius: 2, background: x.logo }} /> {x.t}
              </button>
            ))}
        </div>
      </div>

      <div className="detail" style={{ flex: 1, minHeight: 0 }}>
        <div className="detail__main">
          <div className="panel panel--chart">
            <div className="chart-toolbar">
              <div className="seg">
                {TIME_RANGES.map((r) => (
                  <button key={r} type="button" className={range === r ? "on" : ""} onClick={() => setRange(r)}>
                    {r}
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 20, background: "var(--border-default)" }} />
              {ovBtn("ema20", "EMA20", "#ff9800")}
              {ovBtn("ema50", "EMA50", "#ab47bc")}
              {ovBtn("bb", "BB", "rgba(120,123,134,0.9)")}
              <div className="seg" style={{ marginLeft: "auto" }}>
                <button type="button" className={mode === "candle" ? "on" : ""} onClick={() => setMode("candle")}>
                  <Icon name="candles" size={14} /> Mum
                </button>
                <button type="button" className={mode === "line" ? "on" : ""} onClick={() => setMode("line")}>
                  <Icon name="line" size={14} /> Çizgi
                </button>
              </div>
            </div>
            <div className="chart-body">
              {chartLoading ? (
                <div
                  className="faint"
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    zIndex: 2,
                    fontSize: 13,
                  }}
                >
                  Grafik yükleniyor…
                </div>
              ) : null}
              {chartLw ? (
                <TVChart lw={chartLw} range={range} mode={mode} overlays={overlays} theme={theme} />
              ) : (
                <div className="faint" style={{ padding: 40, textAlign: "center" }}>
                  Grafik verisi alınamadı.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="detail__side">
          <div className="panel">
            <div className="panel__body" style={{ paddingBottom: 12 }}>
              <div
                className={`tnum ${s.priceFlash === "pos" ? "flash-pos" : s.priceFlash === "neg" ? "flash-neg" : ""}`}
                key={s.price}
                style={{ display: "inline-block", borderRadius: 4 }}
              >
                <span style={{ fontSize: 30, fontWeight: 700 }}>{fmtUSD(s.price)}</span>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 6, alignItems: "center" }}>
                <span className={`tnum ${dayPos ? "pos" : "neg"}`} style={{ fontSize: 14, fontWeight: 600 }}>
                  {dayPos ? "▲" : "▼"} {fmtPct(s.dayPct)}
                </span>
                <span className="faint" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--positive)",
                      animation: "pulse-dot 2s infinite",
                    }}
                  />{" "}
                  canlı
                </span>
              </div>
            </div>
          </div>

          {!isWatchMode ? (
          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Pozisyon</span>
            </div>
            <div className="panel__body">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px 14px",
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                <DRow k="Adet" v={s.qty.toString()} />
                <DRow k="Maliyet" v={fmtUSD(s.cost)} />
                <DRow k="Değer" v={fmtUSD(s.value, 0)} />
                <DRow k="Getiri" v={fmtPct(s.totalPct)} tone={totPos ? "pos" : "neg"} />
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <DField label="Stop-Loss" value={stop} onChange={setStop} />
                <DField label="Hedef" value={target} onChange={setTarget} />
              </div>
              <textarea
                className="input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                style={{ resize: "none", fontSize: 12, lineHeight: 1.5 }}
                placeholder="Not…"
              />
              <button
                type="button"
                className="btn btn--accent"
                style={{ width: "100%", marginTop: 10, padding: 8 }}
                onClick={savePosition}
              >
                {saved ? "✓ Kaydedildi" : "Güncelle"}
              </button>
              {confirmDelete ? (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{ flex: 1, color: "var(--negative)", fontSize: 12 }}
                    disabled={deleting}
                    onClick={removePosition}
                  >
                    {deleting ? "Kaldırılıyor…" : "Evet, kaldır"}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost"
                    style={{ fontSize: 12 }}
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost"
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "7px 8px",
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                  onClick={() => setConfirmDelete(true)}
                >
                  Pozisyonu kaldır
                </button>
              )}
            </div>
          </div>
          ) : (
            <div className="panel">
              <div className="panel__body">
                <p className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                  İzleme modu — bu sembol portföyünüzde değil. Pozisyon eklemek için dashboard&apos;daki &quot;Hisse Ekle&quot; kullanın.
                </p>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Analist Hedefi</span>
              <Icon name="target" size={16} style={{ marginLeft: 6, opacity: 0.6 }} />
            </div>
            <div className="panel__body">
              {analystLoading ? (
                <p className="muted" style={{ fontSize: 12 }}>
                  yfinance + Firecrawl yükleniyor…
                </p>
              ) : !analyst?.recommended_target ? (
                <p className="muted" style={{ fontSize: 12 }}>
                  Analist konsensüsü bulunamadı.
                </p>
              ) : (
                <>
                  <div className="tnum" style={{ fontSize: 22, fontWeight: 700 }}>
                    {fmtUSD(analyst.recommended_target)}
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    Güven: {analyst.confidence}
                    {analyst.analyst_count ? ` · ${analyst.analyst_count} analist` : ""}
                  </p>
                  {analyst.target_low != null && analyst.target_high != null ? (
                    <p className="faint" style={{ fontSize: 11, marginTop: 4 }}>
                      Aralık {fmtUSD(analyst.target_low)} – {fmtUSD(analyst.target_high)}
                    </p>
                  ) : null}
                  {analyst.web?.target_mean ? (
                    <p className="faint" style={{ fontSize: 11, marginTop: 4 }}>
                      Web tarama: {fmtUSD(analyst.web.target_mean)} ({analyst.web.samples} örnek)
                    </p>
                  ) : null}
                  {analyst.recommendation ? (
                    <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      Öneri: {analyst.recommendation}
                    </p>
                  ) : null}
                </>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {!isWatchMode ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ fontSize: 12, flex: 1 }}
                      disabled={!analyst?.recommended_target || syncingTarget}
                      onClick={applyAnalystTarget}
                    >
                      Hedefe uygula
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      style={{ fontSize: 12 }}
                      disabled={syncingTarget}
                      onClick={syncAllTargets}
                    >
                      {syncingTarget ? "…" : "Portföy sync"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <TradeSignalCard
            data={tradeSignal}
            onRefresh={refreshTrade}
            refreshing={tradeRefreshing}
          />

          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Sinyal Skoru</span>
              <span className={`sigbadge ${rating.cls}${s.signalFlash ? " flash-signal" : ""}`} style={{ marginLeft: "auto" }}>
                {rating.t}
              </span>
            </div>
            <div className="panel__body">
              <div className="score-head">
                <div className="score-dial">
                  <ScoreDial sum={s.signalSum} />
                </div>
                <div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    5 göstergeden bileşik
                  </div>
                  <div className="tnum" style={{ fontSize: 13, fontWeight: 600 }}>
                    {s.signals.filter((x) => x.val > 0).length} AL · {s.signals.filter((x) => x.val < 0).length} SAT ·{" "}
                    {s.signals.filter((x) => x.val === 0).length} NÖTR
                  </div>
                </div>
              </div>
              <div className="score-rows">
                {s.signals.map((ind) => (
                  <ScoreRow key={ind.key} ind={ind} />
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel__head">
              <span className="ttl">Son Haberler</span>
            </div>
            <div className="panel__body" style={{ paddingTop: 4, paddingBottom: 6 }}>
              {news.length === 0 ? (
                <p className="muted" style={{ fontSize: 12 }}>
                  Haber bulunamadı. Birkaç dakika sonra yenileyin.
                </p>
              ) : (
                news.slice(0, 5).map((n, i) => (
                  <a
                    key={`${n.url || i}`}
                    className="news-row"
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <span
                      className="news-row__dot"
                      style={{ background: sentColor[n.sentiment || "neu"] || sentColor.neu }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.45 }}>{n.title}</div>
                      <div className="faint" style={{ fontSize: 10.5, marginTop: 3 }}>
                        {(n.source || n.provider || "Kaynak")} · {formatNewsAge(n.published_at || n.fetched_at, newsTick)}
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
