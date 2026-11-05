"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Heart, SlidersHorizontal } from "lucide-react";
import { PlaceyActor } from "@/components/placey/PlaceyActor";
import { PlaceyPanel } from "@/components/placey/PlaceyPanel";
import { PlaceySpeechBubble } from "@/components/placey/PlaceySpeechBubble";
import { modeForRoute } from "@/components/placey/modes";
import { clickLine, isHype, modeLine } from "@/components/placey/quotes";
import { usePlaceySpeech } from "@/components/placey/speech";
import { usePlaceyIdle, usePlaceyMotion } from "@/components/placey/motion";
import { usePlacey } from "@/components/placey/PlaceyProvider";
import { getPrefs, setPrefs, usePlaceyPrefs } from "@/components/placey/prefs";
import type { FaceName } from "@/components/placey/PlaceyCharacter";

/** Intro lines, one at a time, exactly as written in the brief. */
export const INTRO_LINES = [
  "HEYYYY! I'M PLACEY! 💜",
  "Your tiny placement buddy!",
  "I'll be right here while you learn, code and prepare for your dream career!",
  "Let's make those dreams happen together! ✨",
];

export const RETURN_GREETINGS = [
  "You're backkk! 💜",
  "Ready for another productive day?",
  "Let's get things done!",
  "Missed me? Hehe.",
];

const GREETED_KEY = "placey:greeted";
const REST_RANGE: [number, number] = [-120, 0];

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function SparkleBurst() {
  const stars = [
    { dx: -46, dy: -58, c: "#ffd45e" }, { dx: 0, dy: -74, c: "#ff9ccc" }, { dx: 46, dy: -58, c: "#7de7ff" },
    { dx: -66, dy: -22, c: "#ff9ccc" }, { dx: 66, dy: -22, c: "#ffd45e" }, { dx: -30, dy: -90, c: "#a78bfa" }, { dx: 32, dy: -92, c: "#ffd45e" },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/3 h-0 w-0">
      {stars.map((s, i) => (
        <svg key={i} viewBox="0 0 20 20" className="placey-burst absolute -left-2 -top-2 h-4 w-4" style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, animationDelay: `${i * 40}ms` } as React.CSSProperties}>
          <path d="M10 0 l2.6 6.4 7.4 .8 -5.6 4.8 1.7 7 -6.1 -3.7 -6.1 3.7 1.7 -7 -5.6 -4.8 7.4 -.8z" fill={s.c} />
        </svg>
      ))}
    </div>
  );
}

/**
 * Placey's home in the app: one instance, mounted once in the signed-in layout.
 * Phase 5 scope: the first-visit introduction, the returning-user greeting, idle life,
 * and a way back if hidden. Route/activity modes and the controls panel come next.
 */
export function PlaceyHost() {
  const prefs = usePlaceyPrefs();
  const { mode: wantedMode, reaction, reason, debug } = usePlacey();
  const pathname = usePathname();
  const m = usePlaceyMotion();
  const [offscreen, setOffscreen] = useState(true);
  const [bubble, setBubble] = useState<string | null>(null);
  const [face, setFace] = useState<FaceName | undefined>(undefined);
  const [burst, setBurst] = useState(0);
  const [inIntro, setInIntro] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const lastHover = useRef(0);
  const [tabVisible, setTabVisible] = useState(true);
  const [typing, setTyping] = useState(false);

  // Pause ambient animation while the tab is in the background.
  useEffect(() => {
    const f = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, []);

  // On small screens Placey steps out of the way while a form field has focus, so it can never
  // cover an input, a button under it, or the on-screen keyboard area.
  useEffect(() => {
    const isField = (t: EventTarget | null) =>
      t instanceof HTMLElement && !t.closest("[data-placey]") && (t.matches("input, textarea, select") || t.isContentEditable);
    const on = (e: FocusEvent) => {
      if (isField(e.target)) setTyping(true);
    };
    const off = () => setTyping(false);
    document.addEventListener("focusin", on);
    document.addEventListener("focusout", off);
    return () => {
      document.removeEventListener("focusin", on);
      document.removeEventListener("focusout", off);
    };
  }, []);
  const runId = useRef(0);
  const mRef = useRef(m);
  useEffect(() => {
    mRef.current = m;
  });

  // Classic during the intro; afterwards the page decides, unless the user chose a mode by hand.
  const mode = inIntro ? "classic" : wantedMode;
  const prevMode = useRef(mode);
  const settled = !inIntro && !offscreen && !prefs.hidden;
  const say = usePlaceySpeech({ bubble, setBubble, active: settled, muted: prefs.muted, ambientLine: () => modeLine(mode) });
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  });
  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    if (!settled) return;
    // an outfit change: a quick squash-pop with a little sparkle, no overlap with other motions
    mRef.current.play("swap");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBurst((b) => b + 1);
    if (reason === "activity" && (mode === "hacker" || mode === "chill")) {
      // a break reminder is gentle: it waits if you are typing and obeys the cooldown
      sayRef.current(modeLine(mode), mode === "chill" ? "ambient" : "event");
    }
  }, [mode, settled, reason]);

  // Entering a page: one friendly line, subject to the cooldown.
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (!settled) return;
    sayRef.current(modeLine(modeForRoute(pathname)), "ambient");
  }, [pathname, settled]);

  // One-shot reactions (celebrate / cheer) from real events. Queued after any outfit change.
  const lastReaction = useRef<number | null>(reaction?.id ?? null);
  useEffect(() => {
    if (!reaction || reaction.id === lastReaction.current) return;
    lastReaction.current = reaction.id;
    if (!settled) return;
    mRef.current.play(reaction.kind === "celebrate" ? "celebrate" : "bounce");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBurst((b) => b + 1);
    sayRef.current(modeLine(reaction.kind === "celebrate" ? "victory" : "motivated"), "event");
  }, [reaction, settled]);

  usePlaceyIdle(m, { enabled: !inIntro && !offscreen && !prefs.hidden, movement: prefs.movement, range: REST_RANGE, lively: mode !== "chill" });

  // A particularly motivating line makes Placey jump for joy (never while asleep-ish in Chill).
  useEffect(() => {
    if (!bubble || !settled || mode === "chill" || prefs.muted) return;
    if (isHype(bubble) && !mRef.current.isBusy()) mRef.current.play("jump");
  }, [bubble, settled, mode, prefs.muted]);

  useEffect(() => {
    const p = getPrefs();
    if (p.hidden) return;
    const id = ++runId.current;
    const alive = () => runId.current === id;
    const mm = mRef.current;

    async function intro() {
      setInIntro(true);
      const wide = window.innerWidth >= 1024;
      mm.jumpTo(wide ? -Math.min(360, window.innerWidth * 0.28) : -Math.min(90, window.innerWidth * 0.2));
      await sleep(1100); // let the interface settle first
      if (!alive()) return;
      setOffscreen(false);
      mm.play("enter");
      await sleep(1250);
      if (!alive()) return;
      setFace("excited");
      mm.play("wave");
      await sleep(1000);
      for (let i = 0; i < INTRO_LINES.length; i++) {
        if (!alive()) return;
        setBubble(INTRO_LINES[i]);
        if (i === 0) setFace("happy");
        if (i === 2) mm.play("nod");
        await sleep(i === 2 ? 3800 : 2400);
      }
      if (!alive()) return;
      setBubble(null);
      setFace("happy");
      setBurst((b) => b + 1);
      mm.play("jump");
      await sleep(900);
      if (!alive()) return;
      setFace(undefined);
      mm.runTo(0);
      await sleep(1300);
      if (!alive()) return;
      setPrefs({ introDone: true });
      setInIntro(false);
    }

    async function greet() {
      let seen = false;
      try {
        seen = sessionStorage.getItem(GREETED_KEY) === "1";
      } catch {
        // storage blocked: greet each load
      }
      await sleep(seen ? 150 : 900);
      if (!alive()) return;
      setOffscreen(false);
      if (seen) return; // same browser session: just be there, no repeat greeting
      try {
        sessionStorage.setItem(GREETED_KEY, "1");
      } catch {
        // storage blocked: greet each load
      }
      mm.play("enter", "wave");
      await sleep(1300);
      if (!alive()) return;
      sayRef.current(RETURN_GREETINGS[Math.floor(Math.random() * RETURN_GREETINGS.length)], "event");
    }

    void (p.introDone ? greet() : intro());

    return () => {
      // runId is a plain counter (not a DOM node), so reading .current at cleanup time is intended.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      runId.current++;
      mm.cancel();
    };
  }, []);

  function pet() {
    if (!m.isBusy()) m.play("jump");
    setBurst((b) => b + 1);
    setFace("happy");
    window.setTimeout(() => setFace(undefined), 1400);
    say(clickLine(), "user");
  }

  function onHoverMove(e: React.PointerEvent<HTMLButtonElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    m.setLook(Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2))));
  }

  function onHoverEnter() {
    const t = Date.now();
    if (t - lastHover.current > 6000 && !m.isBusy() && !inIntro) {
      lastHover.current = t;
      m.play("hop");
    }
  }

  function skipIntro() {
    runId.current++;
    m.cancel();
    m.jumpTo(0);
    setBubble(null);
    setFace(undefined);
    setOffscreen(false);
    setInIntro(false);
    setPrefs({ introDone: true });
  }

  if (prefs.hidden) {
    return (
      <button
        type="button"
        onClick={() => setPrefs({ hidden: false })}
        aria-label="Show Placey"
        className="fixed bottom-[5.5rem] right-3 z-40 flex h-9 items-center gap-1.5 rounded-full border border-edge-strong bg-surface px-3 text-xs font-semibold shadow-card hover:border-primary lg:bottom-4 lg:right-5"
      >
        <Heart className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Show Placey
      </button>
    );
  }

  return (
    <div
      data-placey=""
      className={`pointer-events-none fixed bottom-[5.25rem] right-2 z-40 sm:right-4 lg:bottom-3 lg:right-6 ${typing ? "max-lg:hidden" : ""}`}
      style={{ width: "clamp(5rem, 14vw, 9rem)" }}
    >
      <PlaceyActor mode={mode} motion={m} face={face} offscreen={offscreen} paused={!tabVisible} className="w-full">
        {burst > 0 && <SparkleBurst key={burst} />}
        {inIntro && !bubble && !offscreen && (
          <button type="button" onClick={skipIntro} className="pointer-events-auto absolute bottom-[96%] right-2 rounded-full border border-[#d8d6ff] bg-white px-3 py-1 text-[11px] font-bold text-[#6a68b8] shadow-sm hover:bg-[#f1f0ff]">
            Skip intro
          </button>
        )}
        {settled && (
          <>
            <button
              type="button"
              onClick={pet}
              onPointerMove={onHoverMove}
              onPointerEnter={onHoverEnter}
              onPointerLeave={() => m.setLook(0)}
              aria-label="Say hi to Placey"
              className="pointer-events-auto absolute inset-x-[8%] inset-y-[6%] cursor-pointer rounded-[40%] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <button
              ref={toggleRef}
              type="button"
              onClick={() => setPanelOpen((o) => !o)}
              aria-label="Placey settings"
              aria-expanded={panelOpen}
              className="pointer-events-auto absolute -right-1 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-edge-strong bg-surface text-muted opacity-80 shadow-card transition hover:text-primary hover:opacity-100 focus-visible:opacity-100"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          </>
        )}
        {panelOpen && (
          <PlaceyPanel prefs={prefs} mode={mode} reason={reason === "manual" || reason === "activity" ? reason : null} activeMinutes={debug.activeMinutes} onClose={() => setPanelOpen(false)} toggleRef={toggleRef} />
        )}
        {bubble && !prefs.muted && !panelOpen && (
          <PlaceySpeechBubble
            key={bubble}
            text={bubble}
            onDismiss={inIntro ? undefined : () => setBubble(null)}
            footer={
              inIntro ? (
                <button type="button" onClick={skipIntro} className="text-[11px] font-bold text-[#6a68b8] underline-offset-2 hover:underline">
                  Skip intro
                </button>
              ) : undefined
            }
          />
        )}
      </PlaceyActor>
    </div>
  );
}
