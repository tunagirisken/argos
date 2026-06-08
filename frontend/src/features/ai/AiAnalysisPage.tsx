import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/icons/Icon";
import { fmtPct, fmtUSD } from "../../lib/format";
import { api, type ChatSession } from "../../services/api";
import { usePortfolioStore } from "../../store/portfolioStore";

const QUICK = [
  "Portföyümü analiz et",
  "Risk değerlendirmesi yap",
  "En güçlü pozisyonum hangisi?",
  "Zayıf pozisyonlarımı göster",
  "Nakit stratejisi öner",
  "Stop-loss seviyelerimi kontrol et",
];

const BRAIN_TOOLS = [
  {
    icon: "bell",
    title: "Risk Raporu",
    desc: "Stop, sektör yoğunlaşması ve volatilite analizi",
    message: "Portföyümün risk değerlendirmesini yap",
    accent: "var(--warning)",
  },
  {
    icon: "stocks",
    title: "Sinyal Özeti",
    desc: "Tüm pozisyonların AL / SAT / BEKLE durumu",
    message: "Tüm hisselerimin teknik sinyallerini özetle",
    accent: "var(--positive)",
  },
  {
    icon: "spark",
    title: "Nakit Stratejisi",
    desc: "Likidite oranı ve alım fırsatları",
    message: "Nakit pozisyonum için strateji öner",
    accent: "var(--t-accent)",
  },
  {
    icon: "shield",
    title: "Stop-Loss Kontrolü",
    desc: "Kritik stop seviyelerini gözden geçir",
    message: "Stop-loss seviyelerimi gözden geçir",
    accent: "var(--negative)",
  },
  {
    icon: "target",
    title: "Hedef & Kâr",
    desc: "Hedefe yakın pozisyonlar ve kâr alma önerisi",
    message: "Hedef fiyatlarıma yakın pozisyonlarımı analiz et",
    accent: "var(--info)",
  },
  {
    icon: "ai",
    title: "Haftalık Özet",
    desc: "Performans, trend ve öncelikli aksiyonlar",
    message: "Bu hafta portföyüm için özet ve öneriler ver",
    accent: "var(--t-accent)",
  },
];

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
    <div className="card" style={{ padding: 16, marginBottom: 12 }}>
      <button type="button" className="btn btn--accent" style={{ width: "100%" }} disabled={loading} onClick={run}>
        <Icon name="spark" size={14} /> {loading ? "Analiz ediliyor…" : "Portföyümü Analiz Et"}
      </button>
      {error ? (
        <p className="neg" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          {error}
        </p>
      ) : (
        <p className="faint" style={{ fontSize: 11, marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
          Gemini/Claude ile tam portföy raporu · Telegram bildirimi
        </p>
      )}
    </div>
  );
}

function ChatHistorySidebar({
  sessions,
  activeId,
  loading,
  onSelect,
  onCreate,
  onDelete,
}: {
  sessions: ChatSession[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <aside className="ai-chat-sidebar">
      <button type="button" className="ai-chat-sidebar__new" onClick={onCreate}>
        <Icon name="plus" size={16} />
        Yeni sohbet
      </button>
      <div className="ai-chat-sidebar__label">Son sohbetler</div>
      <div className="ai-chat-sidebar__list">
        {loading ? (
          <div className="faint" style={{ fontSize: 12, padding: "8px 6px" }}>
            Yükleniyor…
          </div>
        ) : sessions.length === 0 ? (
          <div className="faint" style={{ fontSize: 12, padding: "8px 6px", lineHeight: 1.45 }}>
            Henüz sohbet yok.
          </div>
        ) : (
          sessions.map((s) => (
            <div key={s.id} className={`ai-chat-sidebar__item${activeId === s.id ? " on" : ""}`}>
              <button type="button" className="ai-chat-sidebar__item-btn" onClick={() => onSelect(s.id)} title={s.title}>
                {s.title}
              </button>
              <button
                type="button"
                className="ai-chat-sidebar__del"
                aria-label="Sohbeti sil"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(s.id);
                }}
              >
                <Icon name="trash" size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function PortfolioSnapshot() {
  const summary = usePortfolioStore((s) => s.summary);
  const stocks = usePortfolioStore((s) => s.stocks);
  if (!summary) return null;

  const cashPct = summary.totalValue ? (summary.cash / summary.totalValue) * 100 : 0;
  const risky = stocks.filter((s) => s.stopDist < 8).length;
  const buySignals = stocks.filter((s) => String(s.signal).includes("AL")).length;

  return (
    <div className="card" style={{ padding: 14, marginBottom: 12 }}>
      <div className="section-label" style={{ marginBottom: 10 }}>
        Portföy Özeti
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Toplam
          </div>
          <div className="tnum" style={{ fontWeight: 700, fontSize: 15 }}>
            {fmtUSD(summary.totalValue, 0)}
          </div>
        </div>
        <div>
          <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Günlük
          </div>
          <div className={`tnum ${summary.dayPct >= 0 ? "pos" : "neg"}`} style={{ fontWeight: 700, fontSize: 15 }}>
            {fmtPct(summary.dayPct)}
          </div>
        </div>
        <div>
          <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Nakit
          </div>
          <div className="tnum" style={{ fontSize: 13 }}>
            {fmtUSD(summary.cash, 0)} <span className="muted">(%{cashPct.toFixed(0)})</span>
          </div>
        </div>
        <div>
          <div className="faint" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Pozisyon
          </div>
          <div className="tnum" style={{ fontSize: 13 }}>
            {stocks.length} hisse · {buySignals} AL
            {risky > 0 ? <span className="warn" style={{ marginLeft: 4 }}>· {risky} riskli stop</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function BrainToolCard({
  icon,
  title,
  desc,
  accent,
  onClick,
}: {
  icon: string;
  title: string;
  desc: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="card"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        padding: "12px 14px",
        marginBottom: 8,
        cursor: "pointer",
        borderColor: "var(--border-subtle)",
        transition: "border-color 0.15s, background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.background = `color-mix(in srgb, ${accent} 6%, var(--bg-surface))`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border-subtle)";
        e.currentTarget.style.background = "var(--bg-surface)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--radius-md)",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
            color: accent,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          }}
        >
          <Icon name={icon} size={16} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</div>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.45, marginTop: 2 }}>
            {desc}
          </div>
        </div>
        <Icon name="chevron-down" size={14} style={{ flexShrink: 0, marginTop: 2, color: "var(--text-muted)", transform: "rotate(-90deg)" }} />
      </div>
    </button>
  );
}

function BrainToolsPanel({ onSend }: { onSend: (msg: string) => void }) {
  return (
    <>
      <div className="section-label" style={{ marginBottom: 10 }}>
        ARGOS Araçları
      </div>
      {BRAIN_TOOLS.map((tool) => (
        <BrainToolCard
          key={tool.title}
          icon={tool.icon}
          title={tool.title}
          desc={tool.desc}
          accent={tool.accent}
          onClick={() => onSend(tool.message)}
        />
      ))}
    </>
  );
}

export function AiAnalysisPage() {
  const summary = usePortfolioStore((s) => s.summary);
  const [msgs, setMsgs] = useState<{ from: "user" | "argos"; lines: string[] }[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const welcomeLines = [
    "Merhaba 👁️ Ben **ARGOS**. Portföyünü 7/24 izliyorum.",
    `Bugün portföyün ${summary ? fmtPct(summary.dayPct) : "—"} durumda. Ne öğrenmek istersin?`,
  ];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing]);

  const refreshSessions = async () => {
    try {
      const list = await api.listChats();
      setSessions(list.sessions);
      return list.sessions;
    } catch {
      setSessions([]);
      return [];
    }
  };

  const createNewChat = async () => {
    const created = await api.createChat();
    setActiveSessionId(created.id);
    setMsgs([{ from: "argos", lines: welcomeLines }]);
    await api.addChatMessage(created.id, "assistant", welcomeLines.join("\n"));
    await refreshSessions();
    return created.id;
  };

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setSessionsLoading(true);
      const list = await refreshSessions();
      if (!mounted) return;
      if (list.length > 0) {
        const first = list[0];
        setActiveSessionId(first.id);
        try {
          const full = await api.getChat(first.id);
          if (!mounted) return;
          const mapped: { from: "user" | "argos"; lines: string[] }[] = full.messages.map((m) => ({
            from: m.role === "assistant" ? "argos" : "user",
            lines: m.content.split(/\n+/).filter(Boolean),
          }));
          setMsgs(mapped.length ? mapped : [{ from: "argos", lines: welcomeLines }]);
        } catch {
          setMsgs([{ from: "argos", lines: welcomeLines }]);
        }
      } else {
        try {
          await createNewChat();
        } catch {
          setMsgs([{ from: "argos", lines: welcomeLines }]);
        }
      }
      if (mounted) setSessionsLoading(false);
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const openChat = async (id: string) => {
    setActiveSessionId(id);
    try {
      const full = await api.getChat(id);
      const mapped: { from: "user" | "argos"; lines: string[] }[] = full.messages.map((m) => ({
        from: m.role === "assistant" ? "argos" : "user",
        lines: m.content.split(/\n+/).filter(Boolean),
      }));
      setMsgs(mapped.length ? mapped : [{ from: "argos", lines: welcomeLines }]);
    } catch {
      setMsgs([{ from: "argos", lines: welcomeLines }]);
    }
  };

  const deleteChat = async (id: string) => {
    try {
      await api.deleteChat(id);
      const list = await refreshSessions();
      if (activeSessionId === id) {
        if (list[0]) await openChat(list[0].id);
        else await createNewChat();
      }
    } catch {
      /* sessiz */
    }
  };

  const appendArgos = async (text: string) => {
    const lines = text.split(/\n+/).filter(Boolean);
    setMsgs((m) => [...m, { from: "argos", lines: lines.length ? lines : [text] }]);
    if (activeSessionId) {
      await api.addChatMessage(activeSessionId, "assistant", text).catch(() => {});
      await refreshSessions();
    }
  };

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "user", lines: [q] }]);
    setInput("");
    let sid = activeSessionId;
    if (!sid) {
      try {
        sid = await createNewChat();
      } catch {
        sid = null;
      }
    }
    if (sid) {
      await api.addChatMessage(sid, "user", q).catch(() => {});
      await refreshSessions();
    }
    setTyping(true);
    try {
      const res = await api.analysisChat(q);
      await appendArgos(res.response);
    } catch {
      setMsgs((m) => [
        ...m,
        { from: "argos", lines: ["LLM yapılandırılmamış veya backend kapalı. `.env` dosyasını kontrol edin."] },
      ]);
      if (sid) {
        await api
          .addChatMessage(sid, "assistant", "LLM yapılandırılmamış veya backend kapalı. `.env` dosyasını kontrol edin.")
          .catch(() => {});
      }
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="page ai-layout" style={{ paddingBottom: 0, height: "100%", overflow: "hidden" }}>
      <ChatHistorySidebar
        sessions={sessions}
        activeId={activeSessionId}
        loading={sessionsLoading}
        onSelect={openChat}
        onCreate={() => createNewChat().catch(() => {})}
        onDelete={deleteChat}
      />

      <div className="card ai-chat-main" style={{ padding: 0, overflow: "hidden" }}>
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
            <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              Portföyün hakkında her şeyi sorabilirsin
            </div>
            <div className="muted" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--positive)",
                  animation: "pulse-dot 2s infinite",
                }}
              />
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

      <div className="ai-chat-tools">
        <PortfolioAnalyzeButton onResult={(text) => appendArgos(text).catch(() => {})} />
        <PortfolioSnapshot />
        <BrainToolsPanel onSend={send} />
      </div>
    </div>
  );
}

if (typeof window !== "undefined") {
  Object.assign(window, { AiAnalysis: AiAnalysisPage });
}
