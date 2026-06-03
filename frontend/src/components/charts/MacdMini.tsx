export function MacdMini({ data }: { data: number[] }) {
  const slice = data.slice(-40);
  const max = Math.max(...slice.map(Math.abs)) || 1;
  return (
    <svg width="100%" height="44" viewBox="0 0 200 44" preserveAspectRatio="none">
      <line x1="0" y1="22" x2="200" y2="22" stroke="var(--border-default)" strokeWidth="0.5" />
      {slice.map((v, i) => {
        const h = (Math.abs(v) / max) * 20;
        const x = (i / slice.length) * 200;
        return (
          <rect
            key={i}
            x={x}
            y={v >= 0 ? 22 - h : 22}
            width={200 / slice.length - 0.6}
            height={h}
            fill={v >= 0 ? "var(--positive)" : "var(--negative)"}
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
}
