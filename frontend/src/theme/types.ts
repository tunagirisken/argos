export type ThemeMode = "dark" | "light";

export type Density = "compact" | "regular" | "comfy";

export interface TweakState {
  accent: string;
  glow: number;
  radius: number;
  density: Density;
  showSparkline: boolean;
}

export const TWEAK_DEFAULTS: TweakState = {
  accent: "#2962ff",
  glow: 1,
  radius: 8,
  density: "regular",
  showSparkline: true,
};
