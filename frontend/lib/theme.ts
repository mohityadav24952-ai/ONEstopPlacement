export type ThemeId = "classic" | "emerald" | "golden";

export type ThemeInfo = {
  id: ThemeId;
  label: string;
  /** Swatch colours for the picker: [background, accent]. Previews only; real colours live in globals.css. */
  swatch: [string, string];
};

export const THEMES: ThemeInfo[] = [
  { id: "classic", label: "Classic Light", swatch: ["#f6f7f3", "#1d7a59"] },
  { id: "emerald", label: "Emerald Forest", swatch: ["#071c18", "#37c99a"] },
  { id: "golden", label: "Golden Horizon", swatch: ["#19120d", "#f4a62a"] },
];

export const THEME_KEY = "theme";
export const DEFAULT_THEME: ThemeId = "classic";

/** Accepts the current ids plus the two legacy values ("light", "dark") from the previous design. */
export function parseTheme(value: string | null | undefined): ThemeId {
  if (value === "classic" || value === "emerald" || value === "golden") return value;
  if (value === "dark") return "emerald";
  return DEFAULT_THEME;
}

export function readTheme(): ThemeId {
  if (typeof document === "undefined") return DEFAULT_THEME;
  return parseTheme(document.documentElement.getAttribute("data-theme"));
}

const listeners = new Set<() => void>();

export function subscribeTheme(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.setAttribute("data-theme", id);
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // Storage can be blocked (private mode). The theme still applies for this visit.
  }
  listeners.forEach((l) => l());
}

/** Runs before first paint so there is no flash of the wrong theme. */
export const themeBootScript = `try{var v=localStorage.getItem("${THEME_KEY}");var t=v==="classic"||v==="emerald"||v==="golden"?v:v==="dark"?"emerald":"classic";document.documentElement.setAttribute("data-theme",t);requestAnimationFrame(function(){requestAnimationFrame(function(){document.documentElement.classList.add("theme-ready")})})}catch(e){document.documentElement.setAttribute("data-theme","classic")}`;
