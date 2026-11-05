"use client";

import { useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { PlaceyActor } from "@/components/placey/PlaceyActor";
import { PlaceySpeechBubble } from "@/components/placey/PlaceySpeechBubble";
import { usePlaceyIdle, usePlaceyMotion } from "@/components/placey/motion";
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
  const m = usePlaceyMotion();
  const [offscreen, setOffscreen] = useState(true);
  const [bubble, setBubble] = useState<string | null>(null);
  const [face, setFace] = useState<FaceName | undefined>(undefined);
  const [burst, setBurst] = useState(0);
  const [inIntro, setInIntro] = useState(false);
  const runId = useRef(0);
  const mRef = useRef(m);
  useEffect(() => {
    mRef.current = m;
  });

  usePlaceyIdle(m, { enabled: !inIntro && !offscreen && !prefs.hidden, movement: prefs.movement, range: REST_RANGE });

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
      if (!getPrefs().muted) {
        setBubble(RETURN_GREETINGS[Math.floor(Math.random() * RETURN_GREETINGS.length)]);
        await sleep(3800);
        if (alive()) setBubble(null);
      }
    }

    void (p.introDone ? greet() : intro());

    return () => {
      // runId is a plain counter (not a DOM node), so reading .current at cleanup time is intended.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      runId.current++;
      mm.cancel();
    };
  }, []);

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
    <div className="pointer-events-none fixed bottom-[5.25rem] right-2 z-40 w-28 sm:right-4 sm:w-32 lg:bottom-3 lg:right-6 lg:w-36">
      <PlaceyActor mode="classic" motion={m} face={face} offscreen={offscreen} label="Placey, your tiny placement buddy" className="w-full">
        {burst > 0 && <SparkleBurst key={burst} />}
        {inIntro && !bubble && !offscreen && (
          <button type="button" onClick={skipIntro} className="pointer-events-auto absolute bottom-[96%] right-2 rounded-full border border-[#d8d6ff] bg-white px-3 py-1 text-[11px] font-bold text-[#6a68b8] shadow-sm hover:bg-[#f1f0ff]">
            Skip intro
          </button>
        )}
        {bubble && !prefs.muted && (
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
