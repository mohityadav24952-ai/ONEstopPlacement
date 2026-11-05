"use client";

import { useCallback, useEffect, useRef } from "react";
import { SPEECH_CONFIG, readMs } from "@/components/placey/quotes";

export type SpeechKind =
  /** The user poked Placey: always answer (unless muted). */
  | "user"
  /** The result of something the user just did (celebration, outfit change). */
  | "event"
  /** Unprompted: route entry, idle chatter, break reminders. Cooldown applies. */
  | "ambient";

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

type Options = {
  bubble: string | null;
  setBubble: (text: string | null) => void;
  /** Placey is visible, settled and not mid-introduction. */
  active: boolean;
  muted: boolean;
  /** A line for occasional idle chatter. */
  ambientLine: () => string;
};

/**
 * One bubble at a time, with rules so Placey never becomes annoying:
 *  - muted means silent, always;
 *  - unprompted lines wait out a cooldown, never replace an open bubble, never fire while the user
 *    is typing in a field or the tab is hidden;
 *  - every bubble closes itself after a reading-time delay and can be dismissed.
 */
export function usePlaceySpeech({ bubble, setBubble, active, muted, ambientLine }: Options) {
  const lastSpoke = useRef(0);
  const dismissTimer = useRef<number | null>(null);
  const bubbleRef = useRef(bubble);
  const flags = useRef({ active, muted, ambientLine });
  useEffect(() => {
    bubbleRef.current = bubble;
    flags.current = { active, muted, ambientLine };
  });

  const say = useCallback(
    (text: string, kind: SpeechKind): boolean => {
      const f = flags.current;
      if (!f.active || f.muted) return false;
      const now = Date.now();
      if (kind === "ambient") {
        if (now - lastSpoke.current < SPEECH_CONFIG.cooldownMs) return false;
        if (bubbleRef.current || document.hidden || isTyping()) return false;
      }
      lastSpoke.current = now;
      setBubble(text);
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
      dismissTimer.current = window.setTimeout(() => {
        if (bubbleRef.current === text) setBubble(null);
      }, readMs(text));
      return true;
    },
    [setBubble],
  );

  // Occasional idle chatter, at a random moment every few minutes.
  useEffect(() => {
    if (!active || muted) return;
    let t: number;
    const schedule = () => {
      const span = SPEECH_CONFIG.ambientMaxMs - SPEECH_CONFIG.ambientMinMs;
      t = window.setTimeout(() => {
        say(flags.current.ambientLine(), "ambient");
        schedule();
      }, SPEECH_CONFIG.ambientMinMs + Math.random() * span);
    };
    schedule();
    return () => window.clearTimeout(t);
  }, [active, muted, say]);

  useEffect(
    () => () => {
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
    },
    [],
  );

  return say;
}
