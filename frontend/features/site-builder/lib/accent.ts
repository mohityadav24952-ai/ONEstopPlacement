import type { AccentColor } from "@/types/portfolio";

export type AccentSet = { name: string; base: string; strong: string; soft: string; onBase: string };

/** `base` for dark backgrounds, `strong` for light backgrounds (contrast), `soft` is a translucent tint. */
export const ACCENTS: Record<AccentColor, AccentSet> = {
  emerald: { name: "Emerald (Pista Green)", base: "#10B981", strong: "#047857", soft: "rgba(16,185,129,0.14)", onBase: "#04130d" },
  cyan: { name: "Cyan (Blueprint)", base: "#38BDF8", strong: "#0369A1", soft: "rgba(56,189,248,0.14)", onBase: "#04131c" },
  violet: { name: "Violet (Neural)", base: "#A78BFA", strong: "#6D28D9", soft: "rgba(167,139,250,0.16)", onBase: "#0d0720" },
  amber: { name: "Amber (Solar)", base: "#FBBF24", strong: "#B45309", soft: "rgba(251,191,36,0.16)", onBase: "#1c1204" },
  rose: { name: "Rose (Crimson)", base: "#FB7185", strong: "#BE123C", soft: "rgba(251,113,133,0.15)", onBase: "#200509" },
};

export function accentFor(id: AccentColor): AccentSet {
  return ACCENTS[id] ?? ACCENTS.emerald;
}
