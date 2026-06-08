// ============================================================
// ARGOS — AI Analiz (ARGOS BRAIN)
// ============================================================
const QUICK = [
  "Portföyümü analiz et",
  "MRVL için ne yapmalıyım?",
  "Bu hafta riskler neler?",
  "Stop-loss seviyelerimi gözden geçir",
];

// Basit kural tabanlı yanıt üreteci (gerçekçi demo)
function argosReply(q) {
  const t = q.toLocaleLowerCase("tr");
  const p = PORTFOLIO;
  if (t.includes("portföy") && t.includes("analiz")) {
    const best = [...STOCKS].sort((a, b) => b.totalPct - a.totalPct)[0];
    const worst = [...STOCKS].sort((a, b) => a.totalPct - b.totalPct)[0];
    return [
      `Portföyün toplam değeri **${fmtUSD(p.totalValue, 0)}**, başlangıçtan getirin **${fmtPct(p.totalReturnPct)}**.`,
      `En güçlü pozisyon **${best.t}** (${fmtPct(best.totalPct)}), en zayıf **${worst.t}** (${fmtPct(worst.totalPct)}).`,
      `Yarı iletken ağırlığın yüksek (MRVL, NVDA, AMD) — sektörel yoğunlaşma riski var. Nakit oranın %${((p.cash / p.totalValue) * 100).toFixed(0)}, fırsat alımları için uygun.`,
    ];
  }
  if (t.includes("mrvl")) {
    const s = STOCKS.find((x) => x.t === "MRVL");
    return [
      `**MRVL** şu an ${fmtUSD(s.price)}, bugün ${fmtPct(s.dayPct)}. RSI ${s.rsi} — aşırı alıma yaklaşıyor.`,
      `Maliyetin ${fmtUSD(s.cost)}, getirin ${fmtPct(s.totalPct)}. Hedefe ($${s.target}) %${(((s.target - s.price) / s.price) * 100).toFixed(0)} kaldı.`,
      `Önerim: kademeli kâr al. Stop-loss'u maliyetin üzerine ($290) çekerek kazancı kilitle. Sinyal: **AL** (güven %${s.confidence}).`,
    ];
  }
  if (t.includes("risk")) {
    const tsla = STOCKS.find((x) => x.t === "TSLA");
    const pltr = STOCKS.find((x) => x.t === "PLTR");
    return [
      `Bu hafta öne çıkan riskler:`,
      `• **TSLA** maliyetin %${Math.abs(tsla.totalPct).toFixed(0)} altında, stop'a (${fmtUSD(tsla.stop, 0)}) %${tsla.stopDist.toFixed(0)} uzaklıkta.`,
      `• **PLTR** SAT sinyali veriyor (RSI ${pltr.rsi}), stop $38'e yakın — pozisyon küçültmeyi düşün.`,
      `• Yarı iletken yoğunlaşması: tek bir sektör haberi portföyü %3-4 oynatabilir.`,
    ];
  }
  if (t.includes("stop")) {
    const risky = STOCKS.filter((x) => x.stopDist < 8).sort((a, b) => a.stopDist - b.stopDist);
    const lines = ["Stop-loss seviyeleri incelemesi:"];
    STOCKS.forEach((x) => {
      const z = x.stopDist < 5 ? "🔴 kritik" : x.stopDist < 10 ? "🟡 izle" : "🟢 güvenli";
      lines.push(`• **${x.t}** → stop ${fmtUSD(x.stop, 0)}, uzaklık %${x.stopDist.toFixed(1)} ${z}`);
    });
    if (risky.length) lines.push(`Öncelik: ${risky.map((r) => r.t).join(", ")} için stop'ları gözden geçir.`);
    return lines;
  }
  return [
    `Sorunu aldım. Portföyünde ${STOCKS.length} pozisyon ve ${fmtUSD(p.cash, 0)} nakit var.`,
    `Belirli bir hisse, risk analizi veya strateji hakkında daha spesifik sorabilirsin — örneğin "NVDA'yı analiz et" ya da "nakiti nereye koyayım?".`,
  ];
}

function Bubble({ from, lines }) {
  const isUser = from === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: 10 }}>
      {!isUser && (
        <span className="ticker-logo" style={{ background: "color-mix(in srgb, var(--t-accent) 25%, var(--bg-elevated))", color: "var(--t-accent)", flexShrink: 0, animation: "argos-halo 3s infinite" }}>
          <Icon name="eye" size={18} />
        </span>
      )}
      <div style={{
        maxWidth: "78%", padding: "12px 15px", borderRadius: 14, fontSize: 13.5, lineHeight: 1.6,
        background: isUser ? "var(--t-accent)" : "var(--bg-elevated)",
        color: isUser ? "#fff" : "var(--text-primary)",
        border: isUser ? "none" : "1px solid var(--border-subtle)",
        borderBottomRightRadius: isUser ? 4 : 14, borderBottomLeftRadius: isUser ? 14 : 4,
      }}>
        {lines.map((l, i) => <div key={i} style={{ marginTop: i ? 6 : 0 }} dangerouslySetInnerHTML={{ __html: l.replace(/\*\*(.+?)\*\*/g, '<b style="font-family:var(--font-mono);font-weight:600">$1</b>') }} />)}
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <span className="ticker-logo" style={{ background: "color-mix(in srgb, var(--t-accent) 25%, var(--bg-elevated))", color: "var(--t-accent)", flexShrink: 0 }}>
        <Icon name="eye" size={18} />
      </span>
      <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "14px 16px", background: "var(--bg-elevated)", borderRadius: 14, borderBottomLeftRadius: 4, border: "1px solid var(--border-subtle)" }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--text-secondary)", animation: `typing-bounce 1.4s ${i * 0.18}s infinite` }} />)}
      </div>
    </div>
  );
}

function AiAnalysis() {
  const [msgs, setMsgs] = React.useState([
    { from: "argos", lines: ["Merhaba 👁️ Ben **ARGOS**. Portföyünü 7/24 izliyorum.", "Bugün portföyün " + fmtPct(PORTFOLIO.dayPct) + " durumda. Ne öğrenmek istersin?"] },
  ]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, typing]);

  const send = (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setMsgs((m) => [...m, { from: "user", lines: [q] }]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { from: "argos", lines: argosReply(q) }]);
    }, 1100);
  };

  const toneColor = { pos: "var(--positive)", neg: "var(--negative)", warn: "var(--warning)", neu: "var(--info)" };

  return (
    <div className="page" style={{ display: "grid", gridTemplateColumns: "55fr 45fr", gap: 18, height: "100%", overflow: "hidden", paddingBottom: 0 }}>
      {/* ---- Chat ---- */}
      <div className="card" style={{ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span className="ticker-logo glow-accent" style={{ background: "color-mix(in srgb, var(--t-accent) 22%, var(--bg-elevated))", color: "var(--t-accent)" }}>
            <Icon name="eye" size={20} />
          </span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>ARGOS Brain</div>
            <div className="muted" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--positive)", animation: "pulse-dot 2s infinite" }} /> Aktif · gerçek zamanlı
            </div>
          </div>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {msgs.map((m, i) => <Bubble key={i} from={m.from} lines={m.lines} />)}
          {typing && <Typing />}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 11 }}>
            {QUICK.map((q) => <button key={q} className="chip" onClick={() => send(q)}>{q}</button>)}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <input className="input" placeholder="ARGOS'a sor…" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()} />
            <button className="btn btn--accent" onClick={() => send()} style={{ flexShrink: 0, display: "grid", placeItems: "center", width: 46, padding: 0 }}>
              <Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Rapor Arşivi (accordion) ---- */}
      <div style={{ display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 28, paddingRight: 2 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
          <span className="section-label" style={{ margin: 0 }}>Rapor Arşivi</span>
          <span className="faint" style={{ marginLeft: "auto", fontSize: 11 }}>{REPORTS.length} rapor</span>
        </div>
        <ReportArchive />
      </div>
    </div>
  );
}

function ReportArchive() {
  const [open, setOpen] = React.useState(REPORTS[0].id);
  const toneColor = { pos: "var(--positive)", neg: "var(--negative)", warn: "var(--warning)", neu: "var(--info)" };
  return (
    <div>
      {REPORTS.map((r) => {
        const isOpen = open === r.id;
        return (
          <div key={r.id} className={"report-acc" + (isOpen ? " open" : "")}>
            <div className="report-acc__head" onClick={() => setOpen(isOpen ? null : r.id)}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: toneColor[r.tone], flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{r.kind}</div>
                <div className="faint tnum" style={{ fontSize: 11 }}>{r.date}</div>
              </div>
              <span className="report-acc__chev"><Icon name="chevron-down" size={16} /></span>
            </div>
            {isOpen && <div className="report-acc__body">{r.summary}</div>}
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { AiAnalysis });
