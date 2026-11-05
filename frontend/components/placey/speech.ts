"use client";

import { useCallback, useEffect, useRef } from "react";
import { msSinceInput } from "@/components/placey/activity";
import { SPEECH_CONFIG } from "@/components/placey/quotes";
import { canSpeak, displayMs } from "@/components/placey/speech-rules";
import type { SpeechKind } from "@/components/placey/speech-rules";

export type { SpeechKind } from "@/components/placey/speech-rules";

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
  /** A line for occasional idle chatter (from the current mode's own pool). */
  ambientLine: () => string;
};

/**
 * One bubble at a time. The rules themselves live in speech-rules.ts (and are unit tested); this
 * hook only supplies the live facts (clock, typing, tab visibility, last input) and the timers
 * that close a bubble after its reading time.
 */
export function usePlaceySpeech({ bubble, setBubble, active, muted, ambientLine }: Options) {
  const lastSpoke = useRef(0);
  const holdUntil = useRef(0);
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
      const now = Date.now();
      const ok = canSpeak(kind, {
        now,
        lastSpoke: lastSpoke.current,
        holdUntil: holdUntil.current,
        hasBubble: bubbleRef.current !== null,
        typing: isTyping(),
        tabHidden: document.hidden,
        idleMs: msSinceInput(),
        muted: f.muted,
        active: f.active,
      });
      if (!ok) return false;
      const ms = displayMs(text, kind);
      lastSpoke.current = now;
      holdUntil.current = kind === "milestone" ? now + ms : 0; // a celebration protects itself
      setBubble(text);
      if (dismissTimer.current !== null) window.clearTimeout(dismissTimer.current);
      dismissTimer.current = window.setTimeout(() => {
        if (bubbleRef.current === text) setBubble(null);
      }, ms);
      return true;
    },
    [setBubble],
  );

  // Occasional chatter at a random moment every few minutes. canSpeak() decides whether it
  // really happens (cooldown, typing, hidden tab, user gone quiet).
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
