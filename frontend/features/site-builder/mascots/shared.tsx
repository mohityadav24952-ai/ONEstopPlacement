"use client";

import { useEffect } from "react";
import type { CSSProperties, Ref, RefObject } from "react";
import type { AccentSet } from "../lib/accent";
import { firstName } from "../lib/links";
import type { PortfolioData } from "@/types/portfolio";

/** Props every character receives. Characters are pure SVG: all behaviour lives in MascotWidget. */
export type CharProps = {
  accent: AccentSet;
  size?: number;
  /** A click reaction is playing (beam, jetpack, ...). */
  active?: boolean;
  /** The visitor is scrolling or moving the mouse (coder-cat types). */
  typing?: boolean;
  /** coder-cat: neon party mode instead of the warm bulb. */
  party?: boolean;
  /** voxel-bot: index into FACES. */
  face?: number;
  /** terminal-dino: mid-jump. */
  jumping?: boolean;
  svgRef?: Ref<SVGSVGElement>;
};

export const FACES = ["{ ^ _ ^ }", "{ > _ < }", "{ 10x }", "{ ♥ }"];

/** Pupils read --ex/--ey (-1..1), which useEyeTracking writes straight onto the <svg>: no React state per mouse move. */
export function look(strength: number): CSSProperties {
  return {
    transform: `translate(calc(var(--ex, 0) * ${strength}px), calc(var(--ey, 0) * ${strength}px))`,
    transition: "transform 0.08s linear",
  };
}

export function useEyeTracking(ref: RefObject<SVGSVGElement | null>, resetKey: unknown): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let mx = 0;
    let my = 0;
    const apply = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const dx = mx - (r.left + r.width / 2);
      const dy = my - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dist / 160);
      el.style.setProperty("--ex", String((dx / dist) * k));
      el.style.setProperty("--ey", String((dy / dist) * k));
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref, resetKey]);
}

const CSS = `
@keyframes sbm-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes sbm-pulse{0%,100%{opacity:.25}50%{opacity:.8}}
@keyframes sbm-rise{0%{transform:translateY(0);opacity:0}15%{opacity:1}100%{transform:translateY(-46px);opacity:0}}
@keyframes sbm-flame{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.6)}}
@keyframes sbm-conf{0%{transform:translate(0,0) rotate(0);opacity:1}100%{transform:translate(var(--x),var(--y)) rotate(240deg);opacity:0}}
@keyframes sbm-type{0%,100%{transform:translateY(0)}50%{transform:translateY(2.5px)}}
@keyframes sbm-spin{to{transform:rotate(360deg)}}
@keyframes sbm-flip{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.18)}}
@keyframes sbm-jump{0%{transform:translateY(0)}45%{transform:translateY(-30px)}100%{transform:translateY(0)}}
@keyframes sbm-boost{0%{transform:translateY(0)}40%{transform:translateY(-14px)}100%{transform:translateY(0)}}
@keyframes sbm-cactus{from{left:calc(100% - 26px)}to{left:22px}}
@keyframes sbm-steam{0%{transform:translateY(0);opacity:0}30%{opacity:.75}100%{transform:translateY(-9px);opacity:0}}
@keyframes sbm-party{to{filter:hue-rotate(360deg)}}
@keyframes sbm-pop{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}
@keyframes sbm-beam{0%{opacity:0}25%,80%{opacity:1}100%{opacity:0}}
@keyframes sbm-core{0%,100%{transform:scale(1)}50%{transform:scale(1.18)}}
@keyframes sbm-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}
.sbm-a-bob{animation:sbm-bob 3.2s ease-in-out infinite}
.sbm-a-pulse{animation:sbm-pulse 2s ease-in-out infinite}
.sbm-a-rise{animation:sbm-rise 1.6s ease-out infinite}
.sbm-a-flame{animation:sbm-flame .22s ease-in-out infinite}
.sbm-a-conf{animation:sbm-conf 1.2s ease-out both}
.sbm-a-type{animation:sbm-type .16s ease-in-out infinite}
.sbm-a-spin{animation:sbm-spin 14s linear infinite}
.sbm-a-flip{animation:sbm-flip 6s ease-in-out infinite}
.sbm-a-jump{animation:sbm-jump .65s ease-out}
.sbm-a-boost{animation:sbm-boost 1.4s ease-in-out}
.sbm-a-cactus{animation:sbm-cactus 1.9s linear infinite}
.sbm-a-steam{animation:sbm-steam 2.4s ease-in infinite}
.sbm-a-party{animation:sbm-party 2s linear infinite}
.sbm-a-pop{animation:sbm-pop .25s ease-out both}
.sbm-a-beam{animation:sbm-beam 2.4s ease-in-out both}
.sbm-a-core{animation:sbm-core 2.2s ease-in-out infinite}
.sbm-a-shake{animation:sbm-shake .3s ease-in-out}
@media (prefers-reduced-motion: reduce){[class*="sbm-a-"]{animation:none !important}}
`;

/** Scoped keyframes for every mascot. Rendering it more than once is harmless. */
export function MascotStyles() {
  return <style>{CSS}</style>;
}

/* ───────── what the mascot says: real fields only, nothing invented ───────── */

export function buildLines(data: PortfolioData): string[] {
  const first = firstName(data.basics.fullName);
  const s = data.codingStats;
  const out: string[] = [];
  if (s.codechef && s.codechef.rating > 0) out.push(`${first}'s CodeChef rating is ${s.codechef.rating}${s.codechef.stars ? ` (${s.codechef.stars})` : ""}! 🔥`);
  if (s.leetcode && s.leetcode.totalSolved > 0) out.push(`${s.leetcode.totalSolved} LeetCode problems solved${s.leetcode.hardSolved > 0 ? `, ${s.leetcode.hardSolved} of them Hard` : ""} 💪`);
  if (s.codeforces && s.codeforces.rating > 0) out.push(`Codeforces: ${s.codeforces.rating}${s.codeforces.rank ? ` (${s.codeforces.rank})` : ""} ⚡`);
  if (s.github && s.github.publicRepos > 0) out.push(`${s.github.publicRepos} public repos on GitHub${s.github.totalStars > 0 ? `, ${s.github.totalStars} stars total` : ""} ⭐`);
  if (data.projects.some((p) => p.liveUrl)) out.push("Click any project to test the live deployment 🚀");
  else if (data.projects.length > 0) out.push(`Have a look at "${data.projects[0].title}" in the projects section 👀`);
  if (data.basics.availabilityText) out.push(`${data.basics.availabilityText} ✅`);
  if (data.basics.headline) out.push(data.basics.headline);
  out.push("Psst... toggle Light/Dark mode to see the theme engine! 🌗");
  return out;
}

export function buildHighlights(data: PortfolioData): string[] {
  const first = firstName(data.basics.fullName);
  const out: string[] = [];
  const ed = data.education[0];
  if (ed && (ed.degree || ed.institution)) out.push(`Studying ${[ed.degree, ed.institution].filter(Boolean).join(" at ")}${ed.score ? ` (${ed.score})` : ""} 🎓`);
  const ex = data.experience[0];
  if (ex && (ex.role || ex.company)) out.push(`Latest role: ${[ex.role, ex.company].filter(Boolean).join(" at ")} 💼`);
  const stack = [...data.skills.languages, ...data.skills.frameworks].slice(0, 4);
  if (stack.length) out.push(`${first} works with ${stack.join(", ")} 🛠️`);
  if (data.projects.length) out.push(`${data.projects.length} project${data.projects.length > 1 ? "s" : ""} showcased, starting with "${data.projects[0].title}" 📦`);
  const ach = data.achievements[0];
  if (ach?.title) out.push(`Achievement: ${ach.title}${ach.issuer ? ` (${ach.issuer})` : ""} 🏆`);
  if (data.basics.location) out.push(`Based in ${data.basics.location} 📍`);
  if (data.basics.email) out.push(`Want to talk? Email ${data.basics.email} ✉️`);
  if (!out.length) out.push(`${first} is still filling in this portfolio. Check back soon!`);
  return out;
}

/** Real telemetry for the ai-orb HUD. A row appears only when the data exists. */
export function buildTelemetry(data: PortfolioData): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const solved = data.codingStats.leetcode?.totalSolved ?? 0;
  if (solved > 0) rows.push({ label: "DSA Solved", value: String(solved) });
  const counts = new Map<string, number>();
  for (const t of data.projects.flatMap((p) => p.techStack)) counts.set(t, (counts.get(t) ?? 0) + 1);
  const fromProjects = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  const top = (data.skills.languages.length ? data.skills.languages : fromProjects).slice(0, 3);
  if (top.length) rows.push({ label: "Top Stack", value: top.join(", ") });
  if (data.basics.availabilityText) rows.push({ label: "Status", value: data.basics.availabilityText });
  return rows;
}
