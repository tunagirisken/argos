import { useEffect, useRef, useState } from "react";
import { TradeSignalCard } from "../../components/trade/TradeSignalCard";
import { Icon } from "../../components/icons/Icon";
import { fmtPct } from "../../lib/format";
import { api } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";

const QUICK = [
  "Portföyümü analiz et",
  "Pozisyonlarım için ne yapmalıyım?",
  "Bu hafta riskler neler?",
  "Stop-loss seviyelerimi gözden geçir",
];

const ALERT_KIND: Record<string, string> = {
  STOP_LOSS_URGENT: "Acil Stop-Loss",
  STOP_LOSS_WARN: "Stop Uyarısı",
  TARGET_HIT: "Hedef Vuruldu",
  BIG_MOVE: "Büyük Hareket",
  RSI_OVERBOUGHT: "RSI Aşırı Alım",
  RSI_OVERSOLD: "RSI Aşırı Satım",
  CUSTOM: "Alarm",
  TRADE_SIGNAL: "Trade Sinyali",
};

type ReportRow = {
  id: string;
  kind: string;
  date: string;
  summary: string;
  tone: "pos" | "neg" | "warn" | "neu";
};

function toneForAlert(type: string): ReportRow["tone"] {
  if (type.includes("TARGET") || type.includes("OVERSOLD")) return "pos";
  if (type.includes("STOP") || type.includes("OVERBOUGHT")) return "warn";
  if (type.includes("BIG")) return "neu";
  return "neu";
}

function formatLogDate(ts?: string) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function renderLines(lines: string[]) {
  return lines.map((l, i) => (
    <div
      key={i}
      style={{ marginTop: i ? 6 : 0 }}
      dangerouslySetInnerHTML={{
        __html: l.replace(/\*\*(.+?)\*\*/g, '<b style="font-family:var(--font-mono);font-weight:600">$1</b>'),
      }}
    />
  ));
}

function Bubble({ from, lines }: { from: "user" | "argos"; lines: string[] }) {
  const isUser = from === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 10 }}>
      {!isUser && (
        <span
          className="ticker-logo"
          style={{
            background: "color-mix(in srgb, var(--t-accent) 25%, var(--bg-elevated))",
            color: "var(--t-accent)",
            flexShrink: 0,
            animation: "argos-halo 3s infinite",
          }}
        >
          <Icon name="eye" size={18} />
        </span>
      )}
      <div
        style={{
          maxWidth: "78%",
          padding: "12px 15px",
          borderRadius: 14,
          fontSize: 13.5,
          lineHeight: 1.6,
          background: isUser ? "var(--t-accent)" : "var(--bg-elevated)",
          color: isUser ? "#fff" : "var(--text-primary)",
          border: isUser ? "none" : "1px solid var(--border-subtle)",
          borderBottomRightRadius: isUser ? 4 : 14,
          borderBottomLeftRadius: isUser ? 14 : 4,
        }}
      >
        {renderLines(lines)}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span
        className="ticker-logo"
        style={{
          background: "color-mix(in srgb, var(--t-accent) 25%, var(--bg-elevated))",
          color: "var(--t-accent)",
          flexShrink: 0,
        }}
      >
        <Icon name="eye" size={18} />
      </span>
      <div
        style={{
          display: "flex",
          gap: 5,
          alignItems: "center",
          padding: "14px 16px",
          background: "var(--bg-elevated)",
          borderRadius: 14,
          borderBottomLeftRadius: 4,
          border: "1px solid var(--border-subtle)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--text-secondary)",
              animation: `typing-bounce 1.4s ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PortfolioNewsPanel() {
  const stocks = usePortfolioStore((s) => s.stocks);
  const [newsBySymbol, setNewsBySymbol] = useState<Record<string, { title: string; url: string; published_at: string }[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stocks.length === 0) {
      setNewsBySymbol({});
      return;
    }
    setLoading(true);
    api
      .getPortfolioNews()
      .then(setNewsBySymbol)
      .catch(() => setNewsBySymbol({}))
      .finally(() => setLoading(false));
  }, [stocks.length]);

  const flat = Object.entries(newsBySymbol).flatMap(([sym, items]) =>
    items.slice(0, 2).map((n) => ({ ...n, symbol: sym }))
  );

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, marginTop: 24 }}>
        <span className="section-label" style={{ margin: 0 }}>
          Portföy Haberleri
        </span>
        <span className="faint" style={{ marginLeft: "auto", fontSize: 11 }}>
          Firecrawl · Exa
        </span>
      </div>
      {loading ? (
        <p className="muted" style={{ fontSize: 13 }}>
          Haberler yükleniyor…
        </p>
      ) : flat.length === 0 ? (
        <p className="faint" style={{ fontSize: 13 }}>
          Haber yok veya API anahtarı eksik.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {flat.slice(0, 8).map((n, i) => (
            <a
              key={`${n.symbol}-${i}`}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 12.5,
                lineHeight: 1.45,
                color: "var(--text-primary)",
                textDecoration: "none",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: 8,
              }}
            >
              <span className="badge badge--accent" style={{ marginRight: 6, fontSize: 10 }}>
                {n.symbol}
              </span>
              {n.title}
            </a>
          ))}
        </div>
      )}
    </>
  );
}

function TradeSignalsPanel() {
  const tradeSignals = usePortfolioStore((s) => s.tradeSignals);

  if (!tradeSignals.length) return null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14, marginTop: 24 }}>
        <span className="section-label" style={{ margin: 0 }}>
          Trade Skorları
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {tradeSignals.map((sig) => (
          <TradeSignalCard key={sig.symbol} data={sig} compact />
        ))}
      </div>
    </>
  );
}

function PortfolioAnalyzeButton({ onResult }: { onResult: (text: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.analyzePortfolio();
      onResult(res.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analiz başarısız.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <button type="button" className="btn btn--accent" style={{ width: "100%" }} disabled={loading} onClick={run}>
        <Icon name="spark" size={14} /> {loading ? "Analiz ediliyor…" : "Portföy Analizi (LLM)"}
      </button>
      {error ? (
        <p className="neg" style={{ fontSize: 12, marginTop: 8 }}>
          {error}
        </p>
      ) : null}
      <p className="faint" style={{ fontSize: 11, marginTop: 6 }}>
        yfinance · teknik · haber · Gemini/Claude · Telegram bildirimi
      </p>
    </div>
  );
}

function ReportArchive() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const toneColor = { pos: "var(--positive)", neg: "var(--negative)", warn: "var(--warning)", neu: "var(--info)" };

  useEffect(() => {
    api
      .getAlertLog()
      .then((log) => {
        const rows = (log as Record<string, unknown>[]).slice(0, 12).map((e) => ({
          id: String(e.id ?? e.timestamp),
          kind: ALERT_KIND[String(e.type)] ?? String(e.type ?? "Kayıt"),
          date: formatLogDate(String(e.timestamp)),
          summary: String(e.message ?? "—"),
          tone: toneForAlert(String(e.type)),
        }));
        setReports(rows);
        if (rows[0]) setOpen(rows[0].id);
      })
      .catch(() => setReports([]));
  }, []);
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
        <span className="section-label" style={{ margin: 0 }}>
          Rapor Arşivi
        </span>
        <span className="faint" style={{ marginLeft: "auto", fontSize: 11 }}>
          {reports.length} kayıt
        </span>
      </div>
      <div>
        {reports.length === 0 ? (
          <p className="faint" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Henüz alarm kaydı yok. Tetiklenen alarmlar burada görünür.
          </p>
        ) : null}
        {reports.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className={`report-acc${isOpen ? " open" : ""}`}>
              <div
                className="report-acc__head"
                onClick={() => setOpen(isOpen ? null : r.id)}
                role="button"
                tabIndex={0}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: toneColor[r.tone] }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.kind}</div>
                  <div className="faint tnum" style={{ fontSize: 11 }}>
                    {r.date}
                  </div>
                </div>
                <span className="report-acc__chev">
                  <Icon name="chevron-down" size={16} />
                </span>
              </div>
              {isOpen ? <div className="report-acc__body">{r.summary}</div> : null}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function AiAnalysisPage() {
  const summary = usePortfolioStore((s) => s.summary);
  const [msgs, setMsgs] = useState<{ from: "user" | "argos"; lines: string[] }[]>([
    {
      from: "argos",
      lines: [
        "Merhaba 👁️ Ben **ARGOS**. Portföyünü 7/24 izliyorum.",
        `Bugün portföyün ${summary ? fmtPct(summary.dayPct) : "—"} durumda. Ne öğrenmek istersin?`,
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing]);

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "user", lines: [q] }]);
    setInput("");
    setTyping(true);
    try {
      const res = await api.analysisChat(q);
      const lines = res.response.split(/\n+/).filter(Boolean);
      setMsgs((m) => [...m, { from: "argos", lines: lines.length ? lines : [res.response] }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { from: "argos", lines: ["LLM yapılandırılmamış veya backend kapalı. `.env` dosyasını kontrol edin."] },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div
      className="page ai-layout"
      style={{ paddingBottom: 0, height: "100%", overflow: "hidden" }}
    >
      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden", minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span
            className="ticker-logo glow-accent"
            style={{
              background: "color-mix(in srgb, var(--t-accent) 22%, var(--bg-elevated))",
              color: "var(--t-accent)",
            }}
          >
            <Icon name="eye" size={20} />
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>ARGOS Brain</div>
            <div className="muted" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--positive)",
                  animation: "pulse-dot 2s infinite",
                }}
              />{" "}
              Aktif · gerçek zamanlı
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}
        >
          {msgs.map((m, i) => (
            <Bubble key={i} from={m.from} lines={m.lines} />
          ))}
          {typing ? <Typing /> : null}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
            {QUICK.map((q) => (
              <button key={q} type="button" className="chip" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input
              className="input"
              placeholder="ARGOS'a sor…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              type="button"
              className="btn btn--accent"
              onClick={() => send()}
              style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 46, padding: 0 }}
              aria-label="Gönder"
            >
              <Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 28, paddingRight: 2, minHeight: 0 }}>
        <PortfolioAnalyzeButton
          onResult={(text) => {
            const lines = text.split(/\n+/).filter(Boolean);
            setMsgs((m) => [...m, { from: "argos", lines: lines.length ? lines : [text] }]);
          }}
        />
        <TradeSignalsPanel />
        <PortfolioNewsPanel />
        <ReportArchive />
      </div>
    </div>
  );
}
