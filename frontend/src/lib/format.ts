export function fmtUSD(n: number, dec = 2): string {
  return (
    "$" +
    n.toLocaleString("en-US", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    })
  );
}

export function fmtPct(n: number, dec = 2): string {
  return (n >= 0 ? "+" : "") + n.toFixed(dec) + "%";
}
