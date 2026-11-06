import { describe, expect, it } from "vitest";
import { DEFAULT_EFFECTS, EFFECT_IDS, EFFECTS_KEY, activeEffects, effectsBootScript, parseEffects } from "@/lib/effects";

/** Runs the pre-paint boot script against a fake document/storage and returns what it wrote. */
function boot(stored: string | null, nav: Record<string, number> = {}): { fx: string | null; lite: boolean } {
  const attrs = new Map<string, string>();
  const document = { documentElement: { setAttribute: (k: string, v: string) => attrs.set(k, v) } };
  const localStorage = { getItem: (k: string) => (k === EFFECTS_KEY ? stored : null) };
  new Function("document", "localStorage", "navigator", effectsBootScript)(document, localStorage, nav);
  return { fx: attrs.get("data-fx") ?? null, lite: attrs.has("data-fx-lite") };
}

describe("effects preferences", () => {
  it("defaults to everything on for first-time visitors", () => {
    expect(parseEffects(null)).toEqual(DEFAULT_EFFECTS);
    expect(activeEffects(parseEffects(null))).toEqual(EFFECT_IDS);
  });

  it("survives malformed or partial stored values", () => {
    expect(parseEffects("{not json")).toEqual(DEFAULT_EFFECTS);
    expect(parseEffects("null")).toEqual(DEFAULT_EFFECTS);
    expect(parseEffects('"x"')).toEqual(DEFAULT_EFFECTS);
    const p = parseEffects(JSON.stringify({ enabled: "yes", items: { glass: false, spotlight: 1, bogus: false } }));
    expect(p.enabled).toBe(true);
    expect(p.items.glass).toBe(false);
    expect(p.items.spotlight).toBe(true);
    expect(Object.keys(p.items).sort()).toEqual([...EFFECT_IDS].sort());
  });

  it("the master switch overrides individual choices but keeps them", () => {
    const off = parseEffects(JSON.stringify({ enabled: false, items: { glass: false } }));
    expect(activeEffects(off)).toEqual([]);
    expect(off.items.glass).toBe(false);
    expect(off.items.spotlight).toBe(true);
    const back = { ...off, enabled: true };
    expect(activeEffects(back)).toEqual(EFFECT_IDS.filter((id) => id !== "glass"));
  });

  it("the boot script writes the same list the app computes", () => {
    const cases = [
      null,
      "{broken",
      JSON.stringify({ enabled: false, items: {} }),
      JSON.stringify({ enabled: true, items: { ambient: false, borders: false } }),
    ];
    for (const raw of cases) {
      expect(boot(raw).fx).toBe(activeEffects(parseEffects(raw)).join(" "));
    }
  });

  it("marks only very low-end devices as lite", () => {
    expect(boot(null, { hardwareConcurrency: 4, deviceMemory: 8 }).lite).toBe(false);
    expect(boot(null, { hardwareConcurrency: 2 }).lite).toBe(true);
    expect(boot(null, { deviceMemory: 2 }).lite).toBe(true);
  });
});
