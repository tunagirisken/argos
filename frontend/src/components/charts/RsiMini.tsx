export function RsiMini({ value, w = 92 }: { value: number; w?: number }) {
  const h = w * 0.62;
  const cx = w / 2;
  const cy = h - 8;
  const r = w * 0.4;
  const a = Math.PI * (1 - value / 100);
  const ex = cx + r * Math.cos(a);
  const ey = cy - r * Math.sin(a);
  const zone = value >= 70 ? "var(--negative)" : value <= 30 ? "var(--positive)" : "var(--warning)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block" }}>
      <path
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="var(--bg-elevated)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
        fill="none"
        stroke={zone}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize={w * 0.2}
        fontWeight="700"
        fill="var(--text-primary)"
      >
        {value}
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize="8" fill="var(--text-muted)">
        RSI
      </text>
    </svg>
  );
}

export function ScoreDial({ sum, size = 56 }: { sum: number; size?: number }) {
  const pct = (sum + 5) / 10;
  const a = Math.PI * (1 - pct);
  const cx = size / 2;
  const cy = size - 8;
  const r = size * 0.4;
  const ex = cx + r * Math.cos(a);
  const ey = cy - r * Math.sin(a);
  const col = sum >= 2 ? "var(--positive)" : sum <= -2 ? "var(--negative)" : "var(--warning)";
  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
      <path
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="var(--bg-elevated)"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
        fill="none"
        stroke={col}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <text
        x={cx}
        y={cy - 3}
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="15"
        fontWeight="700"
        fill={col}
      >
        {sum > 0 ? `+${sum}` : sum}
      </text>
    </svg>
  );
}
