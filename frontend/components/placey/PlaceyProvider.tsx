"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { PlaceyMode } from "@/components/placey/accessories";
import { lastInputAt, startActivityTracking } from "@/components/placey/activity";
import { PLACEY_CONFIG, nextExpiry, recent, resolveMode, withOverride } from "@/components/placey/controller";
import type { Override } from "@/components/placey/controller";
import { modeForRoute } from "@/components/placey/modes";
import { usePlaceyPrefs } from "@/components/placey/prefs";
import { planReaction } from "@/components/placey/reactions";
import type { PlaceyEvent, Reaction } from "@/components/placey/reactions";
import { ACTIVE_MINUTES_FOR_A_DAY, readStreak, recordActivity } from "@/lib/streak";

export type { PlaceyEvent, Reaction } from "@/components/placey/reactions";

type Ctx = {
  /** The outfit to wear right now (manual choice > reactions/activity > page). */
  mode: PlaceyMode;
  pageMode: PlaceyMode;
  /** Why the mode differs from the page's, if it does. */
  reason: "manual" | "activity" | null;
  /** Bumps when a reaction (celebration, cheer, ...) should play once. */
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
const FIRST_Q_KEY = "placey:firstQuestion";
/** Away from the tab at least this long counts as "coming back after a while". */
const AWAY_MS = 30 * 60_000;

function firstQuestionPending(): boolean {
  try {
    return localStorage.getItem(FIRST_Q_KEY) !== "1";
  } catch {
    return false; // can't remember it, so never claim "first"
  }
}

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
  const activeMs = useRef(0);
  const codingMs = useRef(0);
  const chillOffered = useRef(false);
  const onCoding = useRef(false);
  const reactionId = useRef(0);
  const lastMistakeAt = useRef(0);

  useEffect(() => {
    onCoding.current = pathname === "/coding" || pathname.startsWith("/coding/");
  }, [pathname]);

  useEffect(() => startActivityTracking(), []);

  const addOverride = useCallback((mode: PlaceyMode, ms: number) => {
    const t = Date.now();
    setOverrides((list) => withOverride(list, mode, t + ms, t));
    setNow(t);
  }, []);

  const react = useCallback((r: Omit<Reaction, "id">) => {
    reactionId.current += 1;
    setReaction({ ...r, id: reactionId.current });
  }, []);

  /** Mark today active; if that just extended the streak to 2+ days, say so. Returns true if it did. */
  const markActive = useCallback((): boolean => {
    const before = readStreak().current;
    recordActivity();
    const after = readStreak().current;
    return after > before && after >= 2;
  }, []);

  const emit = useCallback(
    (e: PlaceyEvent) => {
      const t = Date.now();
      const streakGrew = e.type === "action_failed" ? false : markActive();

      if (e.type === "question_done") questionStamps.current = recent([...questionStamps.current, t], t, C.questionWindowMs);
      const plan = planReaction(e, {
        questionsInWindow: questionStamps.current.length,
        isFirstQuestionEver: e.type === "question_done" && firstQuestionPending(),
        now: t,
        lastMistakeAt: lastMistakeAt.current,
      });

      if (e.type === "question_done") {
        try {
          localStorage.setItem(FIRST_Q_KEY, "1");
        } catch {
          // ignore: worst case "first question" can be said again next visit
        }
      }
      if (plan.resetQuestionCount) questionStamps.current = [];
      if (e.type === "action_failed" && plan.reaction) lastMistakeAt.current = t;
      if (plan.override) addOverride(plan.override.mode, plan.override.ms);

      if (e.type === "coding_action") {
        codingStamps.current = recent([...codingStamps.current, t], t, C.hackerIdleMs);
        if (codingMs.current / 60_000 >= C.hackerCodingMinutes && codingStamps.current.length >= C.hackerCodingActions) {
          addOverride("hacker", C.hackerIdleMs); // renewed by every further action
        }
      }

      // A streak that just grew beats a small reaction, but never a milestone.
      if (streakGrew && (!plan.reaction || plan.reaction.tier !== "milestone")) {
        react({ kind: "cheer", tier: "event", special: "streak" });
      } else if (plan.reaction) {
        react(plan.reaction);
      }
    },
    [C, addOverride, react, markActive],
  );

  // Slow tick: accumulate active time (real input only), offer Chill after a long continuous session.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const t = Date.now();
      const li = lastInputAt();
      const sinceInput = t - li;
      if (li && sinceInput > C.breakResetMs) {
        activeMs.current = 0; // they took a break; the continuous session starts over
        chillOffered.current = false;
      } else if (li && sinceInput <= C.activeInputGapMs) {
        activeMs.current += TICK_MS;
        if (onCoding.current) codingMs.current += TICK_MS;
      }
      if (activeMs.current >= ACTIVE_MINUTES_FOR_A_DAY * 60_000 && markActive()) {
        react({ kind: "cheer", tier: "event", special: "streak" });
      }
      setDebug({ activeMinutes: Math.floor(activeMs.current / 60_000), codingMinutes: Math.floor(codingMs.current / 60_000) });
      if (!chillOffered.current && activeMs.current >= C.chillActiveMinutes * 60_000) {
        chillOffered.current = true;
        addOverride("chill", C.chillMs);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [C, addOverride, react, markActive]);

  // Back to the tab after a long absence.
  useEffect(() => {
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) {
        hiddenAt = 0;
        react({ kind: "happy", tier: "event", special: "returned" });
      } else {
        hiddenAt = 0;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [react]);

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
