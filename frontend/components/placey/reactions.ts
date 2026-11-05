import type { PlaceyMode } from "@/components/placey/accessories";
import { PLACEY_CONFIG } from "@/components/placey/controller";
import { SPECIAL, modeLine } from "@/components/placey/quotes";
import type { SpecialKey } from "@/components/placey/quotes";
import type { SpeechKind } from "@/components/placey/speech-rules";

/**
 * Things that really happened in the app. Emit one only after the action succeeded.
 * Anything not emitted here is simply unknown to Placey, and it never guesses.
 */
export type PlaceyEvent =
  | { type: "question_done" }
  | { type: "plan_complete" }
  | { type: "resume_approved" }
  | { type: "portfolio_approved" }
  | { type: "portfolio_exported" }
  | { type: "portfolio_created" }
  | { type: "coding_action" }
  /** A request the user can fix themselves was rejected (a 4xx), not a server fault. */
  | { type: "action_failed" };

export type Reaction = {
  id: number;
  /** Which motion plays: celebrate (big), cheer (bounce), happy (small hop), oops (head tilt). */
  kind: "celebrate" | "cheer" | "happy" | "oops";
  tier: "milestone" | "event" | "ambient";
  /** A one-off situational line... */
  special?: SpecialKey;
  /** ...or a line from this mood's pool. With neither, the reaction is silent motion only. */
  line?: "victory" | "motivated";
};

export type PlanState = {
  /** Questions marked done inside the window, INCLUDING the one just reported. */
  questionsInWindow: number;
  /** The very first question the user has ever completed in this app. */
  isFirstQuestionEver: boolean;
  now: number;
  lastMistakeAt: number;
};

export type ReactionPlan = {
  reaction: Omit<Reaction, "id"> | null;
  override: { mode: PlaceyMode; ms: number } | null;
  resetQuestionCount: boolean;
};

const NONE: ReactionPlan = { reaction: null, override: null, resetQuestionCount: false };
const MISTAKE_GAP_MS = 5 * 60_000;

/** Pure: what should Placey do about this event? Decides outfit override, motion and which line. */
export function planReaction(e: PlaceyEvent, s: PlanState): ReactionPlan {
  const C = PLACEY_CONFIG;
  switch (e.type) {
    case "question_done":
      if (s.questionsInWindow >= C.questionsForMotivated) {
        return { reaction: { kind: "cheer", tier: "milestone", line: "motivated" }, override: { mode: "motivated", ms: C.motivatedMs }, resetQuestionCount: true };
      }
      if (s.isFirstQuestionEver) return { ...NONE, reaction: { kind: "cheer", tier: "event", special: "firstQuestion" } };
      return { ...NONE, reaction: { kind: "happy", tier: "event" } }; // instant, silent: a little hop
    case "plan_complete":
      return { ...NONE, reaction: { kind: "celebrate", tier: "milestone", special: "prepDone" }, override: { mode: "victory", ms: C.victoryMs } };
    case "resume_approved":
      return { ...NONE, reaction: { kind: "celebrate", tier: "milestone", special: "resumeDone" }, override: { mode: "victory", ms: C.victoryMs } };
    case "portfolio_approved":
      return { ...NONE, reaction: { kind: "celebrate", tier: "milestone", line: "victory" }, override: { mode: "victory", ms: C.victoryMs } };
    case "portfolio_created":
      return { ...NONE, reaction: { kind: "cheer", tier: "event", special: "portfolioCreated" } };
    case "action_failed":
      if (s.now - s.lastMistakeAt < MISTAKE_GAP_MS) return NONE;
      return { ...NONE, reaction: { kind: "oops", tier: "ambient", special: "mistake" } };
    case "portfolio_exported":
    case "coding_action":
      return NONE;
  }
}

/** The words for a reaction, or null for a silent one. */
export function reactionText(r: Pick<Reaction, "special" | "line">): string | null {
  if (r.special) return SPECIAL[r.special];
  if (r.line) return modeLine(r.line);
  return null;
}

export const speechKindFor = (tier: Reaction["tier"]): SpeechKind => (tier === "milestone" ? "milestone" : tier === "ambient" ? "ambient" : "event");
