"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Heart, SlidersHorizontal } from "lucide-react";
import { useFeedback } from "@/components/ui/Feedback";
import { PlaceyActor } from "@/components/placey/PlaceyActor";
import { PlaceyPanel } from "@/components/placey/PlaceyPanel";
import { PlaceySpeechBubble } from "@/components/placey/PlaceySpeechBubble";
import { SPECIAL, isHype, modeLine } from "@/components/placey/quotes";
import { reactionText, speechKindFor } from "@/components/placey/reactions";
import { usePlaceySpeech } from "@/components/placey/speech";
import { usePlaceyIdle, usePlaceyMotion } from "@/components/placey/motion";
import { usePlacey } from "@/components/placey/PlaceyProvider";
import { getPrefs, setPrefs, usePlaceyPrefs } from "@/components/placey/prefs";
import type { FaceName } from "@/components/placey/PlaceyCharacter";
import type { MotionName } from "@/components/placey/motion";
import type { Reaction } from "@/components/placey/reactions";

/** First-visit introduction, one line at a time, exactly as written in the brief. */
export const INTRO_LINES = [
  "HEYYYY! I'M PLACEY! 💜",
  "Your tiny placement buddy!",
  "I'll be right here while you learn, code and prepare for your dream career!",
  "Let's make those dreams happen together! ✨",
];

const GREETED_KEY = "placey:greeted";
const VISITED_KEY = "placey:visitedModules";
const SUMMONED_KEY = "placey:summoned";
const LAST_SEEN_KEY = "placey:lastSeen";
/** Back after at least this long away (between visits) earns the "THERE YOU ARE" greeting. */
const LONG_AWAY_MS = 3 * 60 * 60_000;
const MODULE_PATHS = ["/coding", "/resume", "/prep", "/portfolio"];
const REST_RANGE: [number, number] = [0, 40]; // Placey sits at the left of the top bar: short steps to the right only

const REACTION_MOTION: Record<Reaction["kind"], MotionName> = { celebrate: "celebrate", cheer: "bounce", happy: "jump", oops: "tilt" };

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function readSet(key: string): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(key) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, set: Set<string>): void {
  try {
    sessionStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    // ignore: the line may be said again this session
  }
}

function SparkleBurst() {
  const stars = [
    { dx: -46, dy: 58, c: "#ffd45e" }, { dx: 0, dy: 74, c: "#ff9ccc" }, { dx: 46, dy: 58, c: "#7de7ff" },
    { dx: -66, dy: 22, c: "#ff9ccc" }, { dx: 66, dy: 22, c: "#ffd45e" }, { dx: -30, dy: 90, c: "#a78bfa" }, { dx: 32, dy: 92, c: "#ffd45e" },
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
      {stars.map((s, i) => (
        <svg key={i} viewBox="0 0 20 20" className="placey-burst absolute -left-2 -top-2 h-4 w-4" style={{ "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, animationDelay: `${i * 40}ms` } as React.CSSProperties}>
          <path d="M10 0 l2.6 6.4 7.4 .8 -5.6 4.8 1.7 7 -6.1 -3.7 -6.1 3.7 1.7 -7 -5.6 -4.8 7.4 -.8z" fill={s.c} />
        </svg>
      ))}
    </div>
  );
}

/**
 * Placey's home in the app: one instance, mounted once in the signed-in layout (top-right, below
 * the top bar). It owns the introduction, the greeting, reactions to real events, idle life,
 * and the speech bubble. WHAT it says comes from quotes.ts; WHEN it may speak comes from
 * speech-rules.ts; which events matter comes from reactions.ts.
 */
export function PlaceyHost() {
  const prefs = usePlaceyPrefs();
  const { toast } = useFeedback();
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
  const runId = useRef(0);
  const mRef = useRef(m);
  useEffect(() => {
    mRef.current = m;
  });

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

  // Remember when we were last here (for "THERE YOU ARE!" on a later visit).
  useEffect(() => {
    const stamp = () => {
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      } catch {
        // ignore
      }
    };
    const id = window.setInterval(stamp, 60_000);
    window.addEventListener("pagehide", stamp);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pagehide", stamp);
    };
  }, []);

  // Classic during the intro; afterwards the page/activity decides, unless the user chose a mode.
  const mode = inIntro ? "classic" : wantedMode;
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  });
  const prevMode = useRef(mode);
  const settled = !inIntro && !offscreen && !prefs.hidden;
  const say = usePlaceySpeech({ bubble, setBubble, active: settled, muted: prefs.muted, ambientLine: () => modeLine(modeRef.current) });
  const sayRef = useRef(say);
  useEffect(() => {
    sayRef.current = say;
  });

  // Outfit change: a quick squash-pop with a little sparkle. Hacker/Chill arrivals get one line in their voice.
  useEffect(() => {
    if (prevMode.current === mode) return;
    prevMode.current = mode;
    if (!settled) return;
    mRef.current.play("swap");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBurst((b) => b + 1);
    if (reason === "activity" && (mode === "hacker" || mode === "chill")) {
      // a break reminder is gentle: it waits if you are typing and obeys the cooldown
      sayRef.current(modeLine(mode), mode === "chill" ? "ambient" : "event");
    }
  }, [mode, settled, reason]);

  // Opening a module for the FIRST time this session gets one line. Ordinary navigation is silent.
  const prevPath = useRef(pathname);
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    if (!MODULE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    const visited = readSet(VISITED_KEY);
    if (visited.has(pathname)) return;
    visited.add(pathname);
    writeSet(VISITED_KEY, visited);
    if (settled) sayRef.current(SPECIAL.newModule, "ambient");
  }, [pathname, settled]);

  // Reactions to real events (see reactions.ts): motion always, words only when the plan has them.
  const lastReaction = useRef<number | null>(reaction?.id ?? null);
  useEffect(() => {
    if (!reaction || reaction.id === lastReaction.current) return;
    lastReaction.current = reaction.id;
    if (!settled) return;
    mRef.current.play(REACTION_MOTION[reaction.kind]);
    if (reaction.kind === "celebrate" || reaction.kind === "cheer") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBurst((b) => b + 1);
    }
    const text = reactionText(reaction);
    if (text) sayRef.current(text, speechKindFor(reaction.tier));
  }, [reaction, settled]);

  usePlaceyIdle(m, { enabled: settled, movement: prefs.movement, range: REST_RANGE, lively: mode !== "chill" });

  // Now and then Placey does a little happy bounce on its own (never while busy, muted-in-Chill, or in a background tab).
  useEffect(() => {
    if (!settled || mode === "chill" || !tabVisible) return;
    let t = 0;
    const schedule = () => {
      t = window.setTimeout(() => {
        if (!mRef.current.isBusy()) mRef.current.play("bounce");
        schedule();
      }, 30_000 + Math.random() * 45_000);
    };
    schedule();
    return () => window.clearTimeout(t);
  }, [settled, mode, tabVisible]);

  // A particularly excited line makes Placey jump for joy (never in sleepy Chill).
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
      mm.jumpTo(wide ? 40 : 20);
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

    /** One short greeting when the app opens, chosen by what actually happened. */
    async function greet() {
      let seen = false;
      let awayMs = 0;
      let reloaded = false;
      try {
        seen = sessionStorage.getItem(GREETED_KEY) === "1";
        const last = Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
        awayMs = last ? Date.now() - last : 0;
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
        reloaded = nav?.type === "reload";
      } catch {
        // storage/perf blocked: fall back to a plain greeting
      }
      await sleep(seen ? 150 : 900);
      if (!alive()) return;
      setOffscreen(false);
      if (seen && !reloaded) return; // same session, ordinary navigation: just be there
      try {
        sessionStorage.setItem(GREETED_KEY, "1");
      } catch {
        // ignore
      }
      mm.play("enter", "wave");
      await sleep(1300);
      if (!alive()) return;
      const line = reloaded ? SPECIAL.refreshed : awayMs >= LONG_AWAY_MS ? SPECIAL.returned : modeLine(modeRef.current);
      sayRef.current(line, "event");
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
    // The first poke of a session gets the "summoned" line; after that Placey answers in the voice of its current mood.
    const summoned = readSet(SUMMONED_KEY);
    if (!summoned.has("1")) {
      summoned.add("1");
      writeSet(SUMMONED_KEY, summoned);
      say(SPECIAL.summoned, "user");
    } else {
      say(modeLine(mode), "user");
    }
  }

  function hidePlacey() {
    setPrefs({ hidden: true });
    setPanelOpen(false);
    toast(`Placey: ${SPECIAL.hidden}`);
  }

  function showPlacey() {
    // If Placey was hidden when the page loaded it never made its entrance, so bring it in now.
    runId.current++;
    setPrefs({ hidden: false, introDone: true });
    m.jumpTo(0);
    setInIntro(false);
    setOffscreen(false);
    m.play("enter");
    window.setTimeout(() => sayRef.current(SPECIAL.shown, "event"), 1400);
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
        onClick={showPlacey}
        aria-label="Show Placey"
        className="absolute left-0 top-[18px] z-40 flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-edge-strong bg-surface px-3 text-xs font-semibold shadow-card hover:border-primary"
      >
        <Heart className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> Show Placey
      </button>
    );
  }

  return (
    <div
      data-placey=""
      className={`pointer-events-none absolute left-0 top-[22px] z-40 w-full ${typing ? "max-lg:hidden" : ""}`}
    >
      <PlaceyActor mode={mode} tint={prefs.tint} motion={m} face={face} offscreen={offscreen} paused={!tabVisible} className="w-full">
        {burst > 0 && <SparkleBurst key={burst} />}
        {inIntro && !bubble && !offscreen && (
          <button type="button" onClick={skipIntro} className="pointer-events-auto absolute left-2 top-[96%] whitespace-nowrap rounded-full border border-[#d8d6ff] bg-white px-3 py-1 text-[11px] font-bold text-[#6a68b8] shadow-sm hover:bg-[#f1f0ff]">
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
              className="pointer-events-auto absolute -right-2 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-edge-strong bg-surface text-muted opacity-80 shadow-card transition hover:text-primary hover:opacity-100 focus-visible:opacity-100"
            >
              <SlidersHorizontal className="h-3 w-3" aria-hidden="true" />
            </button>
          </>
        )}
        {panelOpen && (
          <PlaceyPanel
            prefs={prefs}
            mode={mode}
            reason={reason === "manual" || reason === "activity" ? reason : null}
            activeMinutes={debug.activeMinutes}
            onClose={() => setPanelOpen(false)}
            onHide={hidePlacey}
            toggleRef={toggleRef}
          />
        )}
        {bubble && !prefs.muted && !panelOpen && (
          <PlaceySpeechBubble
            key={bubble}
            text={bubble}
            mode={mode}
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
