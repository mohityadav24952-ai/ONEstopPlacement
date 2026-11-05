"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { PlaceyMode } from "@/components/placey/accessories";
import { PLACEY_CONFIG, nextExpiry, recent, resolveMode, withOverride } from "@/components/placey/controller";
import type { Override } from "@/components/placey/controller";
import { modeForRoute } from "@/components/placey/modes";
import { usePlaceyPrefs } from "@/components/placey/prefs";
import { ACTIVE_MINUTES_FOR_A_DAY, recordActivity } from "@/lib/streak";

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
  | { type: "coding_action" };

export type Reaction = { id: number; kind: "celebrate" | "cheer" };

type Ctx = {
  /** The outfit to wear right now (manual choice > reactions/activity > page). */
  mode: PlaceyMode;
  pageMode: PlaceyMode;
  /** Why the mode differs from the page's, if it does. */
  reason: "manual" | "activity" | null;
  /** Bumps when a reaction (celebration, cheer) should play once. */
  reaction: Reaction | null;
  emit: (e: PlaceyEvent) => void;
  /** For the dev test page: live counters, never shown to users. */
  debug: { activeMinutes: number; codingMinutes: number; overrides: Override[] };
};

const NOOP: Ctx = {
  mode: "classic",
  pageMode: "classic",
  reason: null,
  reaction: null,
  emit: () => {},
  debug: { activeMinutes: 0, codingMinutes: 0, overrides: [] },
};

const PlaceyContext = createContext<Ctx>(NOOP);

/** Outside a provider this returns a harmless no-op, so shared components can always call it. */
export function usePlacey(): Ctx {
  return useContext(PlaceyContext);
}

const TICK_MS = 15_000;

export function PlaceyProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefs = usePlaceyPrefs();
  const C = PLACEY_CONFIG;

  const [overrides, setOverrides] = useState<Override[]>([]);
  const [now, setNow] = useState(0);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [debug, setDebug] = useState({ activeMinutes: 0, codingMinutes: 0 });

  const questionStamps = useRef<number[]>([]);
  const codingStamps = useRef<number[]>([]);
  const lastInput = useRef(0);
  const activeMs = useRef(0);
  const codingMs = useRef(0);
  const chillOffered = useRef(false);
  const onCoding = useRef(false);
  const reactionId = useRef(0);

  useEffect(() => {
    onCoding.current = pathname === "/coding" || pathname.startsWith("/coding/");
  }, [pathname]);

  const addOverride = useCallback((mode: PlaceyMode, ms: number) => {
    const t = Date.now();
    setOverrides((list) => withOverride(list, mode, t + ms, t));
    setNow(t);
  }, []);

  const react = useCallback((kind: Reaction["kind"]) => {
    reactionId.current += 1;
    setReaction({ id: reactionId.current, kind });
  }, []);

  const emit = useCallback(
    (e: PlaceyEvent) => {
      const t = Date.now();
      recordActivity(); // a real action: today counts
      switch (e.type) {
        case "question_done": {
          questionStamps.current = recent([...questionStamps.current, t], t, C.questionWindowMs);
          if (questionStamps.current.length >= C.questionsForMotivated) {
            questionStamps.current = []; // start counting again for the next streak
            addOverride("motivated", C.motivatedMs);
            react("cheer");
          }
          break;
        }
        case "plan_complete":
        case "resume_approved":
        case "portfolio_approved":
          addOverride("victory", C.victoryMs);
          react("celebrate");
          break;
        case "coding_action": {
          codingStamps.current = recent([...codingStamps.current, t], t, C.hackerIdleMs);
          const minutes = codingMs.current / 60_000;
          if (minutes >= C.hackerCodingMinutes && codingStamps.current.length >= C.hackerCodingActions) {
            addOverride("hacker", C.hackerIdleMs); // renewed by every further action
          }
          break;
        }
        case "portfolio_exported":
          break; // recorded for future use; approval is the milestone that celebrates
      }
    },
    [C, addOverride, react],
  );

  // Real input -> "active". An open tab alone never counts.
  useEffect(() => {
    const mark = () => {
      lastInput.current = Date.now();
    };
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", mark, opts);
    window.addEventListener("keydown", mark);
    window.addEventListener("scroll", mark, opts);
    return () => {
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("keydown", mark);
      window.removeEventListener("scroll", mark);
    };
  }, []);

  // Slow tick: accumulate active time, offer Chill after a long continuous session.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const t = Date.now();
      const sinceInput = t - lastInput.current;
      if (lastInput.current && sinceInput > C.breakResetMs) {
        activeMs.current = 0; // they took a break; the continuous session starts over
        chillOffered.current = false;
      } else if (lastInput.current && sinceInput <= C.activeInputGapMs) {
        activeMs.current += TICK_MS;
        if (onCoding.current) codingMs.current += TICK_MS;
      }
      if (activeMs.current >= ACTIVE_MINUTES_FOR_A_DAY * 60_000) recordActivity();
      setDebug({ activeMinutes: Math.floor(activeMs.current / 60_000), codingMinutes: Math.floor(codingMs.current / 60_000) });
      if (!chillOffered.current && activeMs.current >= C.chillActiveMinutes * 60_000) {
        chillOffered.current = true;
        addOverride("chill", C.chillMs);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [C, addOverride]);

  // One timer, aimed at the next expiry, so Placey returns to the page's mode on time.
  useEffect(() => {
    const t = Date.now();
    const at = nextExpiry(overrides, t);
    if (at === null) return;
    const id = window.setTimeout(() => setNow(Date.now()), at - t + 20);
    return () => window.clearTimeout(id);
  }, [overrides, now]);

  const pageMode = modeForRoute(pathname);
  const { mode: autoMode, override } = resolveMode(pageMode, overrides, now);
  const manual = prefs.mode !== "auto" ? prefs.mode : null;
  const mode = manual ?? autoMode;

  const value = useMemo<Ctx>(
    () => ({ mode, pageMode, reason: manual ? "manual" : override ? "activity" : null, reaction, emit, debug: { ...debug, overrides } }),
    [mode, pageMode, manual, override, reaction, emit, debug, overrides],
  );

  return <PlaceyContext.Provider value={value}>{children}</PlaceyContext.Provider>;
}
