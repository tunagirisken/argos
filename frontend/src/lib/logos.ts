/** Sembol logo gradyanları — yalnızca görsel; fiyat verisi değil */
export const LOGO_COLORS: Record<string, string> = {
  MRVL: "linear-gradient(135deg,#0a4d8c,#1789e0)",
  NVDA: "linear-gradient(135deg,#1a7a1a,#76b900)",
  AVAV: "linear-gradient(135deg,#0a4d8c,#1789e0)",
  TSLA: "linear-gradient(135deg,#7a1320,#e31937)",
  AAPL: "linear-gradient(135deg,#444,#888)",
  AMD: "linear-gradient(135deg,#0a6b3b,#11b569)",
  PLTR: "linear-gradient(135deg,#111,#3b3b55)",
};

export function logoFor(symbol: string): string {
  return LOGO_COLORS[symbol.toUpperCase()] ?? "linear-gradient(135deg,#2962ff,#5b8cff)";
}
