import type { CSSProperties } from "react";

const FACES = ["f-front", "f-back", "f-right", "f-left", "f-top", "f-bottom"] as const;

/** ARGOS marka logosu — CSS 3D dönen küp (design/04_design). */
export function ArgosCube({
  size = 24,
  spin = true,
  className = "",
}: {
  size?: number;
  spin?: boolean;
  className?: string;
}) {
  const s = `${size}px`;
  const style = { width: s, height: s, "--cs": s } as CSSProperties;

  return (
    <span className={`argos-cube-wrap ${className}`.trim()} style={{ width: s, height: s }}>
      <span className={`argos-cube${spin ? " spin" : ""}`} style={style}>
        {FACES.map((f) => (
          <span key={f} className={`argos-cube__face ${f}`} />
        ))}
      </span>
    </span>
  );
}
