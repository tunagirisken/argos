import { useRef, useState } from "react";
import { Icon } from "../../components/icons/Icon";
import { fmtPct, fmtUSD } from "../../lib/format";
import { api } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";

const QUICK = [
  "Portföyümü analiz et",
  "MRVL için ne yapmalıyım?",
  "Bu hafta riskler neler?",
  "Stop-loss seviyelerimi gözden geçir",
];

const REPORTS = [
  { kind: "Sabah Brifingi", date: "3 Haz 2026 · 08:30", summary: "Portföy gece güçlü. Yarı iletken momentumu izlenmeli.", tone: "pos" },
  { kind: "Kapanış Raporu", date: "2 Haz 2026 · 23:05", summary: "Gün pozitif kapandı. Stop seviyelerine dikkat.", tone: "pos" },
];

function Bubble({ from, text }: { from: "user" | "argos"; text: string }) {
  const isUser = from === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 10, marginBottom: 12 }}>
      {!isUser && (
        <span className="ticker-logo" style={{ background: "color-mix(in srgb, var(--t-accent) 25%, var(--bg-elevated))", color: "var(--t-accent)" }}>
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
        }}
      >
        {text}
      </div>
    </div>
  );
}

export function AiAnalysisPage() {
  const summary = usePortfolioStore((s) => s.summary);
  const [msgs, setMsgs] = useState<{ from: "user" | "argos"; text: string }[]>([
    {
      from: "argos",
      text: `Merhaba, ben ARGOS. Portföyünü izliyorum. Bugün ${summary ? fmtPct(summary.dayPct) : "—"} durumda. Ne öğrenmek istersin?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const send = async (q: string) => {
    if (!q.trim()) return;
    setMsgs((m) => [...m, { from: "user", text: q }]);
    setInput("");
    setTyping(true);
    try {
      const res = await api.analysisChat(q);
      setMsgs((m) => [...m, { from: "argos", text: res.response }]);
    } catch {
      setMsgs((m) => [
        ...m,
        { from: "argos", text: "Claude API yapılandırılmamış veya backend kapalı. .env dosyasını kontrol edin." },
      ]);
    } finally {
      setTyping(false);
      ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
    }
  };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 1fr)", gap: 18 }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", minHeight: 480 }}>
        <div ref={ref} style={{ flex: 1, overflowY: "auto", paddingRight: 8 }}>
          {msgs.map((m, i) => (
            <Bubble key={i} from={m.from} text={m.text} />
          ))}
          {typing && (
            <div className="muted" style={{ fontSize: 12 }}>
              ARGOS yazıyor…
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "12px 0" }}>
          {QUICK.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder="ARGOS'a sor…" />
          <button type="button" className="btn btn--accent" onClick={() => send(input)}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
      <div>
        <div className="section-label">Otomatik Raporlar</div>
        {REPORTS.map((r) => (
          <div key={r.date} className="card" style={{ marginBottom: 12 }}>
            <div className="muted" style={{ fontSize: 11 }}>
              {r.kind} · {r.date}
            </div>
            <p style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{r.summary}</p>
          </div>
        ))}
        {summary && (
          <p className="faint mono" style={{ fontSize: 11, marginTop: 8 }}>
            Portföy: {fmtUSD(summary.totalValue, 0)}
          </p>
        )}
      </div>
    </div>
  );
}
