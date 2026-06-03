export function RsiGauge({ value }: { value: number }) {
  const a = Math.PI * (1 - value / 100);
  const cx = 70;
  const cy = 64;
  const r = 52;
  const ex = cx + r * Math.cos(a);
  const ey = cy - r * Math.sin(a);
  const zone =
    value >= 70 ? "var(--negative)" : value <= 30 ? "var(--positive)" : "var(--warning)";
  const zoneLabel =
    value >= 70 ? "Aşırı Alım" : value <= 30 ? "Aşırı Satım" : "Nötr";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="140" height="84" viewBox="0 0 140 84">
        <path
          d="M18 64 A52 52 0 0 1 122 64"
          fill="none"
          stroke="var(--bg-elevated)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={`M18 64 A52 52 0 0 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`}
          fill="none"
          stroke={zone}
          strokeWidth="9"
          strokeLinecap="round"
        />
        <text
          x="70"
          y="56"
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize="26"
          fontWeight="700"
          fill="var(--text-primary)"
        >
          {value}
        </text>
        <text x="70" y="74" textAnchor="middle" fontSize="10" fill="var(--text-secondary)">
          RSI
        </text>
      </svg>
      <div style={{ fontSize: 12, color: zone, fontWeight: 600, marginTop: -4 }}>{zoneLabel}</div>
    </div>
  );
}
