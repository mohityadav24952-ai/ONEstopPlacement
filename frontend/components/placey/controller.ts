import type { PlaceyMode } from "@/components/placey/accessories";

/**
 * Pure rules for which outfit Placey wears. No React, no timers, so it can be tested directly.
 *
 * Priority (highest first): Victory > Motivated > Study > Hacker > Tech Explorer > Chill > Classic.
 * Resume and Portfolio are page variants of Classic and share its (lowest) rank.
 * Consequence: Chill (long session) never interrupts a Study or Tech page, and Hacker (sustained
 * coding) beats the plain Tech page. A mode the user picked by hand beats all of these.
 */
export const PRIORITY: Record<PlaceyMode, number> = {
  victory: 7,
  motivated: 6,
  study: 5,
  hacker: 4,
  tech: 3,
  chill: 2,
  classic: 1,
  resume: 1,
  portfolio: 1,
};

/** Every threshold in one place. All durations in milliseconds unless the name says otherwise. */
export const PLACEY_CONFIG = {
  /** How long a Victory reaction lasts before Placey returns to the page's mode. */
  victoryMs: 12_000,
  motivatedMs: 12_000,
  /** This many questions marked done within the window triggers Motivated. */
  questionsForMotivated: 3,
  questionWindowMs: 10 * 60_000,
  /** Hacker needs this long on the Coding page AND this many coding actions... */
  hackerCodingMinutes: 10,
  hackerCodingActions: 3,
  /** ...and ends this long after the last coding action. */
  hackerIdleMs: 5 * 60_000,
  /** Active (not merely open) time before Chill is offered, and how long it stays. */
  chillActiveMinutes: 60,
  chillMs: 5 * 60_000,
  /** Input within this gap counts as "active". */
  activeInputGapMs: 2 * 60_000,
  /** No input for this long counts as a break and resets the continuous-session clock. */
  breakResetMs: 10 * 60_000,
} as const;

export type Override = { mode: PlaceyMode; until: number };

/** The highest-priority unexpired override beats the page mode; otherwise the page mode stands. */
export function resolveMode(pageMode: PlaceyMode, overrides: Override[], now: number): { mode: PlaceyMode; override: Override | null } {
  let best: Override | null = null;
  for (const o of overrides) {
    if (o.until <= now) continue;
    if (!best || PRIORITY[o.mode] > PRIORITY[best.mode]) best = o;
  }
  if (best && PRIORITY[best.mode] > PRIORITY[pageMode]) return { mode: best.mode, override: best };
  return { mode: pageMode, override: null };
}

/** Add or extend an override. The same mode keeps whichever expiry is later. */
export function withOverride(list: Override[], mode: PlaceyMode, until: number, now: number): Override[] {
  const live = list.filter((o) => o.until > now && o.mode !== mode);
  const existing = list.find((o) => o.mode === mode && o.until > now);
  return [...live, { mode, until: Math.max(until, existing?.until ?? 0) }];
}

/** Earliest future expiry, so the caller can schedule exactly one timer. */
export function nextExpiry(list: Override[], now: number): number | null {
  const future = list.map((o) => o.until).filter((u) => u > now);
  return future.length ? Math.min(...future) : null;
}

/** Keep only timestamps inside the window. */
export function recent(stamps: number[], now: number, windowMs: number): number[] {
  return stamps.filter((t) => now - t <= windowMs);
}
