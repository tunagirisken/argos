import { useState } from "react";

function hashColor(symbol: string): string {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = symbol.charCodeAt(i) + ((h << 5) - h);
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 45% 38%)`;
}

export function StockLogo({
  symbol,
  size = 36,
}: {
  symbol: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const sym = symbol.toUpperCase();
  const url = `https://financialmodelingprep.com/image-stock/${sym}.png`;

  if (failed) {
    return (
      <span
        className="stock-logo stock-logo--fallback"
        style={{ width: size, height: size, background: hashColor(sym), fontSize: size * 0.32 }}
        aria-hidden
      >
        {sym.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      className="stock-logo"
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
