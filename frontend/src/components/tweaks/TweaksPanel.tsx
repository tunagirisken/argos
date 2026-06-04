import { useEffect, useRef, useState } from "react";
import { useTheme } from "../../theme/ThemeContext";
import type { Density } from "../../theme/types";
import "../../styles/tweaks.css";

const ACCENT_OPTIONS = ["#2962ff", "#26a69a", "#ff9800", "#ab47bc", "#089981"];

export function TweaksPanel() {
  const { tweaks, setTweak } = useTheme();
  const [open, setOpen] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef({ x: 16, y: 16 });
  const PAD = 16;

  const clampToViewport = () => {
    const panel = dragRef.current;
    if (!panel) return;
    const w = panel.offsetWidth;
    const h = panel.offsetHeight;
    const maxRight = Math.max(PAD, window.innerWidth - w - PAD);
    const maxBottom = Math.max(PAD, window.innerHeight - h - PAD);
    offsetRef.current = {
      x: Math.min(maxRight, Math.max(PAD, offsetRef.current.x)),
      y: Math.min(maxBottom, Math.max(PAD, offsetRef.current.y)),
    };
    panel.style.right = `${offsetRef.current.x}px`;
    panel.style.bottom = `${offsetRef.current.y}px`;
  };

  useEffect(() => {
    if (!open) return;
    clampToViewport();
    const onResize = () => clampToViewport();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const onDragStart = (e: React.MouseEvent) => {
    const panel = dragRef.current;
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = e.clientX;
    const sy = e.clientY;
    const startRight = window.innerWidth - r.right;
    const startBottom = window.innerHeight - r.bottom;
    const move = (ev: MouseEvent) => {
      offsetRef.current = {
        x: startRight - (ev.clientX - sx),
        y: startBottom - (ev.clientY - sy),
      };
      clampToViewport();
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <>
      <button
        type="button"
        className="twk-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label="Görünüm ayarları"
        title="Tweaks"
      >
        ◑
      </button>
      {open ? (
        <div
          ref={dragRef}
          className="twk-panel"
          style={{ right: offsetRef.current.x, bottom: offsetRef.current.y }}
        >
          <div className="twk-hd" onMouseDown={onDragStart}>
            <b>Tweaks</b>
            <button
              type="button"
              className="twk-x"
              aria-label="Kapat"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="twk-body">
            <div className="twk-sect">Marka</div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Aksan rengi</span>
              </div>
              <div className="twk-chips">
                {ACCENT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="twk-chip"
                    data-on={tweaks.accent === c ? "1" : "0"}
                    style={{ background: c }}
                    aria-label={c}
                    onClick={() => setTweak("accent", c)}
                  />
                ))}
              </div>
            </div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Glow yoğunluğu</span>
                <span className="twk-val">{tweaks.glow}</span>
              </div>
              <input
                type="range"
                className="twk-slider"
                min={0}
                max={2}
                step={0.1}
                value={tweaks.glow}
                onChange={(e) => setTweak("glow", Number(e.target.value))}
              />
            </div>

            <div className="twk-sect">Yerleşim</div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Yoğunluk</span>
              </div>
              <div className="twk-seg">
                {(["compact", "regular", "comfy"] as Density[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={tweaks.density === d ? "active" : ""}
                    onClick={() => setTweak("density", d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="twk-row">
              <div className="twk-lbl">
                <span>Köşe yuvarlaklığı</span>
                <span className="twk-val">{tweaks.radius}px</span>
              </div>
              <input
                type="range"
                className="twk-slider"
                min={2}
                max={16}
                step={1}
                value={tweaks.radius}
                onChange={(e) => setTweak("radius", Number(e.target.value))}
              />
            </div>
            <div className="twk-row twk-row-h">
              <div className="twk-lbl">
                <span>Mini grafik</span>
              </div>
              <button
                type="button"
                className={`twk-toggle${tweaks.showSparkline ? " on" : ""}`}
                aria-pressed={tweaks.showSparkline}
                onClick={() => setTweak("showSparkline", !tweaks.showSparkline)}
              >
                {tweaks.showSparkline ? "Açık" : "Kapalı"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
