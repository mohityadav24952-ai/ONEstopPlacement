"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Minus } from "lucide-react";
import type { AccentColor, MascotId, PortfolioData, ThemeMode } from "@/types/portfolio";
import { accentFor } from "../lib/accent";
import { firstName } from "../lib/links";
import { AiOrb } from "./AiOrb";
import { CoderCat } from "./CoderCat";
import { CyberAlien } from "./CyberAlien";
import { TerminalDino } from "./TerminalDino";
import { VoxelBot } from "./VoxelBot";
import { FACES, MascotStyles, buildHighlights, buildLines, buildTelemetry, useEyeTracking } from "./shared";
import type { CharProps } from "./shared";

type RealMascot = Exclude<MascotId, "none">;

export const MASCOTS: { id: RealMascot; name: string; blurb: string }[] = [
  { id: "cyber-alien", name: "Cyber-Alien", blurb: "Galactic 10x engineer in a glass UFO. Click for a tractor beam." },
  { id: "voxel-bot", name: "Voxel-Bot", blurb: "Isometric mecha-dev with an LED face. Click for a jetpack boost." },
  { id: "coder-cat", name: "Coder-Cat", blurb: "Hoodie cat at a laptop. Types as you scroll; click for party mode." },
  { id: "ai-orb", name: "AI-Orb", blurb: "Sentient neural core. Hover for a live telemetry HUD." },
  { id: "terminal-dino", name: "Terminal-Dino", blurb: "Retro T-Rex in Matrix shades. Click to dodge the 404 BUG." },
];

const CHARACTERS: Record<RealMascot, ComponentType<CharProps>> = {
  "cyber-alien": CyberAlien,
  "voxel-bot": VoxelBot,
  "coder-cat": CoderCat,
  "ai-orb": AiOrb,
  "terminal-dino": TerminalDino,
};

/** A static, idle character with no widget chrome, for the Customize tab cards. */
export function MascotPreview({ id, size = 96, accent = "emerald" }: { id: RealMascot; size?: number; accent?: AccentColor }) {
  const Character = CHARACTERS[id];
  return (
    <>
      <MascotStyles />
      <Character accent={accentFor(accent)} size={size} />
    </>
  );
}

type Props = { data: PortfolioData; mascotId?: MascotId; themeMode?: ThemeMode };

/**
 * The floating companion. It never uses position:fixed (templates are previewed inside a scroll
 * frame): a zero-height sticky wrapper keeps it at the bottom-right of whatever scrolls.
 */
export function MascotWidget({ data, mascotId, themeMode }: Props) {
  const id = mascotId ?? data.config.mascotId;
  if (id === "none" || !data.config.showMascot) return null;
  return <MascotInner key={id} id={id} data={data} themeMode={themeMode ?? data.config.themeMode} />;
}

function MascotInner({ id, data, themeMode }: { id: RealMascot; data: PortfolioData; themeMode: ThemeMode }) {
  const accent = accentFor(data.config.accentColor);
  const first = firstName(data.basics.fullName);
  const meta = MASCOTS.find((m) => m.id === id)!;
  const Character = CHARACTERS[id];
  const dark = themeMode === "dark";

  const lines = useMemo(() => buildLines(data), [data]);
  const highlights = useMemo(() => buildHighlights(data), [data]);
  const telemetry = useMemo(() => buildTelemetry(data), [data]);

  const [minimized, setMinimized] = useState(false);
  const [idx, setIdx] = useState(0);
  const [override, setOverride] = useState<string | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const [active, setActive] = useState(false);
  const [typing, setTyping] = useState(false);
  const [party, setParty] = useState(false);
  const [face, setFace] = useState(0);
  const [hover, setHover] = useState(false);
  const [game, setGame] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [hit, setHit] = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);
  const pausedUntil = useRef(0);
  const activeTimer = useRef(0);
  const jumpTimer = useRef(0);
  const hitTimer = useRef(0);
  const typingTimer = useRef(0);
  const typingOn = useRef(false);
  const jumpingRef = useRef(false);
  const scoreRef = useRef(0);
  const hoverRef = useRef(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  }, []);

  useEyeTracking(svgRef, minimized);

  // Cycle the speech bubble. Pauses after a click or "Ask me", while hovered, and in background tabs.
  useEffect(() => {
    if (minimized) return;
    const t = window.setInterval(() => {
      if (document.hidden || hoverRef.current || Date.now() < pausedUntil.current) return;
      setOverride(null);
      setIdx((i) => i + 1);
    }, 8000);
    return () => window.clearInterval(t);
  }, [minimized]);

  // coder-cat types while the visitor scrolls (capture: scroll does not bubble from a preview frame) or moves the mouse.
  useEffect(() => {
    if (id !== "coder-cat") return;
    const mark = () => {
      if (!typingOn.current) {
        typingOn.current = true;
        setTyping(true);
      }
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => {
        typingOn.current = false;
        setTyping(false);
      }, 450);
    };
    window.addEventListener("scroll", mark, { capture: true, passive: true });
    window.addEventListener("pointermove", mark, { passive: true });
    return () => {
      window.removeEventListener("scroll", mark, true);
      window.removeEventListener("pointermove", mark);
      window.clearTimeout(typingTimer.current);
    };
  }, [id]);

  useEffect(
    () => () => {
      window.clearTimeout(activeTimer.current);
      window.clearTimeout(jumpTimer.current);
      window.clearTimeout(hitTimer.current);
    },
    [],
  );

  const say = (text: string, holdMs = 9000) => {
    pausedUntil.current = Date.now() + holdMs;
    setOverride(text);
  };

  const jump = () => {
    if (jumpingRef.current) return;
    jumpingRef.current = true;
    setJumping(true);
    window.clearTimeout(jumpTimer.current);
    jumpTimer.current = window.setTimeout(() => {
      jumpingRef.current = false;
      setJumping(false);
    }, 650);
  };

  const onCharacterClick = () => {
    setActive(true);
    window.clearTimeout(activeTimer.current);
    activeTimer.current = window.setTimeout(() => setActive(false), 2400);
    switch (id) {
      case "cyber-alien":
        say(`Tractor beam engaged. Scanning ${first}'s portfolio... 🛸`);
        break;
      case "voxel-bot": {
        const next = (face + 1) % FACES.length;
        setFace(next);
        say(`Jetpack boost! Face mode ${FACES[next]} 🚀`);
        break;
      }
      case "coder-cat":
        setParty(!party);
        say(party ? "Cozy warm light is back 💡" : "Party mode ON! 🎉");
        break;
      case "ai-orb":
        say(`Core online. Ask me anything about ${first}.`);
        break;
      case "terminal-dino":
        if (reducedRef.current) {
          jump();
          say("Reduced motion is on, so the 404 BUG game is off. 🦖");
        } else if (!game) {
          setGame(true);
          say("Click me to jump over the 404 BUG! 🌵");
        } else {
          jump();
        }
        break;
    }
  };

  const onCactusPass = () => {
    if (jumpingRef.current) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      setBest((b) => Math.max(b, scoreRef.current));
    } else {
      scoreRef.current = 0;
      setScore(0);
      setHit(true);
      window.clearTimeout(hitTimer.current);
      hitTimer.current = window.setTimeout(() => setHit(false), 500);
    }
  };

  const ask = () => {
    const text = highlights[highlightIdx % highlights.length];
    setHighlightIdx((i) => i + 1);
    say(text, 12000);
  };

  const bubble = override ?? lines[idx % lines.length];
  const showHud = id === "ai-orb" && hover && telemetry.length > 0;

  const card = {
    background: dark ? "rgba(11,16,32,0.95)" : "rgba(255,255,255,0.97)",
    color: dark ? "#e5e7eb" : "#111827",
    border: `1px solid ${dark ? `${accent.base}55` : "#d1d5db"}`,
    boxShadow: dark ? `0 10px 30px -12px ${accent.base}55` : "0 10px 30px -14px rgba(15,23,42,0.35)",
  } as const;
  const accentText = dark ? accent.base : accent.strong;

  if (minimized) {
    return (
      <aside role="region" aria-label={`${meta.name} mascot`} className="pointer-events-none sticky bottom-4 z-40 h-0">
        <MascotStyles />
        <button
          type="button"
          onClick={() => setMinimized(false)}
          aria-label={`Show ${meta.name} mascot`}
          className="pointer-events-auto absolute bottom-0 right-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-full"
          style={card}
        >
          <Character accent={accent} size={52} />
        </button>
      </aside>
    );
  }

  return (
    <aside role="region" aria-label={`${meta.name} mascot`} className="pointer-events-none sticky bottom-4 z-40 h-0">
      <MascotStyles />
      <div
        className="pointer-events-auto absolute bottom-0 right-4 flex w-[min(15rem,calc(100vw-2rem))] flex-col items-end gap-1"
        onPointerEnter={() => {
          hoverRef.current = true;
          setHover(true);
        }}
        onPointerLeave={() => {
          hoverRef.current = false;
          setHover(false);
        }}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        {/* speech bubble (or the orb's telemetry HUD) */}
        <div className="sbm-a-pop relative w-full rounded-2xl p-3 text-[13px] leading-snug" style={card}>
          {showHud ? (
            <div aria-live="polite">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accentText }}>Live telemetry</p>
              <dl className="space-y-1">
                {telemetry.map((t) => (
                  <div key={t.label} className="flex gap-2">
                    <dt className="shrink-0 font-semibold opacity-70">{t.label}:</dt>
                    <dd className="min-w-0 break-words font-medium">{t.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p key={bubble} aria-live="polite" className="sbm-a-pop pr-5 font-medium">{bubble}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={ask}
              aria-label={`Ask me about ${first}`}
              className="rounded-full px-3 py-1 text-xs font-bold transition-transform hover:-translate-y-px active:translate-y-0"
              style={{ background: accent.base, color: accent.onBase }}
            >
              Ask me about {first}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            aria-label="Minimise mascot"
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full opacity-70 hover:opacity-100"
          >
            <Minus className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* terminal-dino: the 404 BUG mini game */}
        {id === "terminal-dino" && game && (
          <div className="relative h-9 w-full overflow-hidden rounded-lg" style={card} role="group" aria-label={`Jump game. Score ${score}, best ${best}.`}>
            <div
              className={`sbm-a-cactus absolute bottom-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${hit ? "sbm-a-shake" : ""}`}
              style={{ background: "#dc2626", color: "#fff", fontFamily: "ui-monospace, Menlo, Consolas, monospace" }}
              onAnimationIteration={onCactusPass}
            >
              404 BUG
            </div>
            <div className="absolute left-2 top-1 flex items-center gap-1.5 text-[10px] font-bold" aria-live="off">
              <span className="rounded-full px-1.5 py-0.5" style={{ background: accent.base, color: accent.onBase }}>Jumps {score}</span>
              <span className="opacity-70">Best {best}</span>
              {hit && <span style={{ color: "#ef4444" }}>Bug hit!</span>}
            </div>
          </div>
        )}

        {/* the character */}
        <button
          type="button"
          onClick={onCharacterClick}
          aria-label={`${meta.name}. Activate for a reaction.`}
          className="rounded-2xl outline-offset-2 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2"
          style={{ outlineColor: accent.base }}
        >
          <Character accent={accent} size={112} active={active} typing={typing} party={party} face={face} jumping={jumping} svgRef={svgRef} />
        </button>
      </div>
    </aside>
  );
}
