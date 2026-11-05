/**
 * Pure rules for WHEN Placey may speak and for HOW LONG a bubble stays. No React, no clocks, so
 * every rule can be tested directly.
 *
 * Kinds, strongest first:
 *   milestone  a celebration (plan done, resume approved, 5 questions...). Always allowed, and it
 *              is then protected: nothing else may replace it while it is on screen.
 *   user       the user poked Placey. Always answered, unless a celebration is showing.
 *   event      the result of something the user just did (first question, streak, a new module).
 *   ambient    unprompted chatter. Cooldown, never over another bubble, never while the user is
 *              typing, never in a hidden tab, never when nobody has touched anything for a while.
 */
export type SpeechKind = "milestone" | "user" | "event" | "ambient";

export const SPEECH_RULES = {
  /** Minimum gap between unprompted bubbles. */
  cooldownMs: 90_000,
  /** No input for this long = nobody is there, so ambient chatter stops. */
  idleCutoffMs: 2 * 60_000,
  minShowMs: 3_600,
  maxShowMs: 9_000,
  /** A celebration lingers a little longer, up to this cap. */
  milestoneExtraMs: 1_500,
  milestoneMaxMs: 10_500,
} as const;

export type SpeechState = {
  now: number;
  lastSpoke: number;
  /** While now < holdUntil a celebration is on screen and must not be interrupted. */
  holdUntil: number;
  hasBubble: boolean;
  typing: boolean;
  tabHidden: boolean;
  /** Milliseconds since the user last gave input (Infinity if never). */
  idleMs: number;
  muted: boolean;
  /** Placey is visible, settled and not in the introduction. */
  active: boolean;
};

export function canSpeak(kind: SpeechKind, s: SpeechState): boolean {
  if (!s.active || s.muted) return false;
  if (kind === "milestone") return true;
  if (s.now < s.holdUntil) return false; // never interrupt a celebration
  if (kind === "user" || kind === "event") return true;
  // ambient
  if (s.now - s.lastSpoke < SPEECH_RULES.cooldownMs) return false;
  if (s.hasBubble || s.typing || s.tabHidden) return false;
  if (s.idleMs > SPEECH_RULES.idleCutoffMs) return false;
  return true;
}

/** Reading time: a floor, plus a little per character, capped. */
export function displayMs(text: string, kind: SpeechKind = "ambient"): number {
  const base = Math.min(SPEECH_RULES.maxShowMs, Math.max(SPEECH_RULES.minShowMs, 3_200 + text.length * 55));
  return kind === "milestone" ? Math.min(SPEECH_RULES.milestoneMaxMs, base + SPEECH_RULES.milestoneExtraMs) : base;
}
