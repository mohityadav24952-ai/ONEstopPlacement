/**
 * Visual-effects preferences: a purely presentational, per-browser setting stored in localStorage
 * (like the theme). Nothing here touches app data or the backend.
 *
 * The active effects are written to <html data-fx="spotlight glass ...">. CSS in app/effects.css
 * only switches an effect on when its name is in that list, so turning the master switch off (an
 * empty list) removes every optional effect at once while keeping each individual choice stored,
 * ready to come back when the master switch is turned on again.
 *
 * No React here: the root (server) layout imports the boot script. Hooks are in
 * components/effects/useEffects.ts.
 */
export const EFFECTS = [
  { id: "spotlight", label: "Cursor spotlight", hint: "A soft light that follows the mouse. Off on touch screens." },
  { id: "glass", label: "Glass surfaces", hint: "Frosted menus, dialogs and notifications." },
  { id: "ambient", label: "Ambient background", hint: "Slow, soft light in the background." },
  { id: "glow", label: "Accent glow", hint: "A restrained glow on primary buttons and the active page." },
  { id: "hover", label: "Hover effects", hint: "Cards lift slightly under the pointer." },
  { id: "borders", label: "Gradient borders", hint: "An accent border on a few featured cards." },
  { id: "entrance", label: "Entrance animations", hint: "Sections fade in, numbers and progress count up." },
  { id: "transitions", label: "Page transitions", hint: "A quick fade when you move between pages." },
] as const;

export type EffectId = (typeof EFFECTS)[number]["id"];
export const EFFECT_IDS: EffectId[] = EFFECTS.map((e) => e.id);

export type EffectsPrefs = {
  /** Master switch. Off disables every optional effect, whatever the individual choices are. */
  enabled: boolean;
  items: Record<EffectId, boolean>;
};

export const EFFECTS_KEY = "effects:v1";

export const DEFAULT_EFFECTS: EffectsPrefs = {
  enabled: true,
  items: Object.fromEntries(EFFECT_IDS.map((id) => [id, true])) as Record<EffectId, boolean>,
};

/** Tolerates missing, malformed or partial stored values: anything unknown falls back to the default. */
export function parseEffects(raw: string | null | undefined): EffectsPrefs {
  if (!raw) return DEFAULT_EFFECTS;
  try {
    const v = JSON.parse(raw) as { enabled?: unknown; items?: Record<string, unknown> } | null;
    if (!v || typeof v !== "object") return DEFAULT_EFFECTS;
    const items = { ...DEFAULT_EFFECTS.items };
    if (v.items && typeof v.items === "object") {
      for (const id of EFFECT_IDS) if (typeof v.items[id] === "boolean") items[id] = v.items[id] as boolean;
    }
    return { enabled: typeof v.enabled === "boolean" ? v.enabled : true, items };
  } catch {
    return DEFAULT_EFFECTS;
  }
}

/** The effects that should actually run: none when the master switch is off. */
export function activeEffects(p: EffectsPrefs): EffectId[] {
  return p.enabled ? EFFECT_IDS.filter((id) => p.items[id]) : [];
}

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: EffectsPrefs = DEFAULT_EFFECTS;

export function getEffects(): EffectsPrefs {
  if (typeof window === "undefined") return DEFAULT_EFFECTS;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(EFFECTS_KEY);
  } catch {
    return cached; // storage blocked: keep the in-memory value for this visit
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parseEffects(raw);
  }
  return cached;
}

function applyToDocument(p: EffectsPrefs): void {
  const root = document.documentElement;
  const list = activeEffects(p).join(" ");
  if (root.getAttribute("data-fx") !== list) root.setAttribute("data-fx", list);
}

export function setEffects(next: EffectsPrefs): void {
  const raw = JSON.stringify(next);
  if (raw === JSON.stringify(getEffects())) return; // no change: no storage write, no re-render
  cached = next;
  try {
    localStorage.setItem(EFFECTS_KEY, raw);
    cachedRaw = raw;
  } catch {
    cachedRaw = undefined; // not persisted (private mode), still applied for this visit
  }
  applyToDocument(next);
  listeners.forEach((l) => l());
}

export function setEffectsEnabled(enabled: boolean): void {
  const cur = getEffects();
  setEffects({ ...cur, enabled });
}

export function setEffect(id: EffectId, on: boolean): void {
  const cur = getEffects();
  setEffects({ ...cur, items: { ...cur.items, [id]: on } });
}

export function resetEffects(): void {
  setEffects(DEFAULT_EFFECTS);
}

export function subscribeEffects(cb: () => void): () => void {
  listeners.add(cb);
  // Another tab changed the setting: re-read it and keep this tab's <html> in step.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== EFFECTS_KEY) return;
    applyToDocument(getEffects());
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Runs before first paint (next to the theme script) so pages never flash effects the user turned
 * off. Also marks very low-end devices with data-fx-lite, which makes the costlier effects cheaper.
 */
export const effectsBootScript = `try{var d=document.documentElement,ids=${JSON.stringify(EFFECT_IDS)},on=ids,r=localStorage.getItem("${EFFECTS_KEY}");if(r){var v=JSON.parse(r);if(v&&v.enabled===false){on=[]}else if(v&&v.items){on=ids.filter(function(i){return v.items[i]!==false})}}d.setAttribute("data-fx",on.join(" "));var n=navigator;if((n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2))d.setAttribute("data-fx-lite","")}catch(e){document.documentElement.setAttribute("data-fx","${EFFECT_IDS.join(" ")}")}`;
