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

/** Haber yaşı — published_at veya fetched_at; 0 dk'dan başlar, canlı güncellenir. */
export function formatNewsAge(iso?: string | null, now = Date.now()): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const sec = Math.max(0, Math.floor((now - ts) / 1000));
  if (sec < 60) return "0 dk";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} dk`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} sa`;
  const day = Math.floor(hr / 24);
  return `${day} g`;
}
