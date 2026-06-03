import { useCallback, useEffect, useState } from "react";
import { TWEAK_DEFAULTS, type TweakState } from "./types";

const STORAGE_KEY = "argos.tweaks";

function loadTweaks(): TweakState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...TWEAK_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* yoksay */
  }
  return { ...TWEAK_DEFAULTS };
}

/** Prototip useTweaks — CSS değişkenlerini document'e uygular */
export function useTweaks() {
  const [tweaks, setTweaks] = useState<TweakState>(loadTweaks);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--t-accent", tweaks.accent);
    root.style.setProperty("--t-glow", String(tweaks.glow));
    root.style.setProperty("--radius-lg", `${tweaks.radius}px`);
    root.style.setProperty("--radius-xl", `${tweaks.radius + 6}px`);
    const fontSize = { compact: 13, regular: 14, comfy: 15 }[tweaks.density];
    document.body.style.fontSize = `${fontSize}px`;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks));
  }, [tweaks]);

  const setTweak = useCallback(<K extends keyof TweakState>(key: K, value: TweakState[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { tweaks, setTweak, setTweaks };
}
