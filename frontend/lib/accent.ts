/** Static class maps for module accent colours (Tailwind needs full class names). */
export type Accent = "cobalt" | "coral" | "lavender" | "mint" | "orange" | "ink";

export type AccentStyle = {
  text: string;
  bg: string;
  soft: string;
  softer: string;
  border: string;
  dot: string;
  onSolid: string;
  ring: string;
};

export const ACCENT: Record<Accent, AccentStyle> = {
  cobalt: { text: "text-cobalt", bg: "bg-cobalt", soft: "bg-cobalt/12", softer: "bg-cobalt/6", border: "border-cobalt/35", dot: "bg-cobalt", onSolid: "text-white", ring: "var(--primary)" },
  coral: { text: "text-coral", bg: "bg-coral", soft: "bg-coral/14", softer: "bg-coral/7", border: "border-coral/35", dot: "bg-coral", onSolid: "text-white", ring: "var(--coral)" },
  lavender: { text: "text-lavender", bg: "bg-lavender", soft: "bg-lavender/16", softer: "bg-lavender/8", border: "border-lavender/40", dot: "bg-lavender", onSolid: "text-white", ring: "var(--lavender)" },
  mint: { text: "text-mint", bg: "bg-mint", soft: "bg-mint/16", softer: "bg-mint/8", border: "border-mint/40", dot: "bg-mint", onSolid: "text-white", ring: "var(--mint)" },
  orange: { text: "text-orange", bg: "bg-orange", soft: "bg-orange/16", softer: "bg-orange/8", border: "border-orange/40", dot: "bg-orange", onSolid: "text-white", ring: "var(--orange)" },
  ink: { text: "text-ink", bg: "bg-ink", soft: "bg-ink/8", softer: "bg-ink/4", border: "border-ink/30", dot: "bg-ink", onSolid: "text-app", ring: "var(--ink)" },
};

/** The accent colour of each product module. */
export const MODULE_ACCENT: Record<string, Accent> = {
  "/coding": "cobalt",
  "/resume": "coral",
  "/prep": "lavender",
  "/portfolio": "mint",
  "/profile": "orange",
  "/settings": "ink",
  "/": "cobalt",
};
