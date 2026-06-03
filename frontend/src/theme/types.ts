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
  accent: "#7c6cf8",
  glow: 1,
  radius: 14,
  density: "regular",
  showSparkline: true,
};
