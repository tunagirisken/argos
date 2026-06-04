import { useLocation, useParams } from "react-router-dom";
import { fmtPct, fmtUSD } from "../../lib/format";
import { usePortfolioStore } from "../../store/portfolioStore";
import { ThemeToggle } from "../ui/ThemeToggle";
import { MarketPill } from "./MarketPill";

const TITLES: Record<string, string> = {
  dashboard: "Genel Bakış",
  discovery: "Keşif Motoru",
  stock: "Hisse Detay",
  ai: "ARGOS Brain",
  alarms: "Alarmlar",
  docs: "Dokümantasyon",
  settings: "Ayarlar",
};

export function Header() {
  const location = useLocation();
  const { symbol } = useParams();
  const summary = usePortfolioStore((s) => s.summary);
  const stocks = usePortfolioStore((s) => s.stocks);

  const seg = location.pathname.split("/")[1] || "dashboard";
  let title = TITLES[seg] || "ARGOS";
  if (seg === "stock" && symbol) {
    const s = stocks.find((x) => x.t === symbol);
    title = s ? `${s.t} · ${s.name}` : "Hisse Detay";
  }

  const pos = (summary?.dayPL ?? 0) >= 0;

  return (
    <header className="header">
      <div className="header__title">{title}</div>
      <div className="header__spacer" />
      <ThemeToggle />
      <MarketPill />
      {summary && (
        <div className="header__portfolio">
          <div className="val">{fmtUSD(summary.totalValue, 2)}</div>
          <div className={`chg ${pos ? "pos" : "neg"}`}>
            {pos ? "▲" : "▼"} {fmtUSD(Math.abs(summary.dayPL), 0)} ·{" "}
            {fmtPct(summary.dayPct)}
          </div>
        </div>
      )}
    </header>
  );
}
