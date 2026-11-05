"use client";

/**
 * Shared "is the user actually here?" clock. Only deliberate input counts (click/tap, key press,
 * scroll); an open tab on its own never does. Used by the controller (active-minutes for Chill and
 * the streak) and by the speech rules (Placey stays quiet when nobody is there).
 */
let lastInput = 0;

export const touch = (): void => {
  lastInput = Date.now();
};

/** Timestamp of the last input, or 0 if there has been none yet. */
export const lastInputAt = (): number => lastInput;

/** Milliseconds since the last input; Infinity if there has been none. */
export const msSinceInput = (): number => (lastInput ? Date.now() - lastInput : Infinity);

/** Start listening. Returns the cleanup. Safe to call from several places. */
export function startActivityTracking(): () => void {
  const opts = { passive: true } as const;
  window.addEventListener("pointerdown", touch, opts);
  window.addEventListener("keydown", touch);
  window.addEventListener("scroll", touch, opts);
  window.addEventListener("touchstart", touch, opts);
  return () => {
    window.removeEventListener("pointerdown", touch);
    window.removeEventListener("keydown", touch);
    window.removeEventListener("scroll", touch);
    window.removeEventListener("touchstart", touch);
  };
}
