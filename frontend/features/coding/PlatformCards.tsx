"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Tooltip } from "@/components/ui/Tooltip";
import type { Metric, PlatformEntry, RepoSummary } from "@/lib/api/coding";
import { cn } from "@/lib/cn";
import { languageColor } from "@/features/coding/charts";

export type Connected = Extract<PlatformEntry, { connected: true }>;

/* ───────── motion: scoped styles + count-up ───────── */

/** Keyframes for the platform cards. Scoped `cd-` names; colours come from theme tokens or brand colours. */
export function CodingStyles() {
  return (
    <style>{`
      @keyframes cd-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      @keyframes cd-sheen { 0% { transform: translateX(-120%); } 60%, 100% { transform: translateX(120%); } }
      @keyframes cd-glow { 0%, 100% { box-shadow: 0 0 0 0 var(--cd-glow, rgba(255,161,22,.0)); } 50% { box-shadow: 0 0 22px 2px var(--cd-glow, rgba(255,161,22,.45)); } }
      @keyframes cd-star { 0% { opacity: 0; transform: scale(.2) rotate(-40deg); } 70% { transform: scale(1.25) rotate(8deg); } 100% { opacity: 1; transform: none; } }
      @keyframes cd-twinkle { 0%, 100% { filter: drop-shadow(0 0 2px rgba(126,87,194,.55)); } 50% { filter: drop-shadow(0 0 7px rgba(179,157,219,.95)); } }
      @keyframes cd-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
      .cd-card { animation: cd-rise .5s cubic-bezier(.2,.7,.2,1) both; }
      .cd-strip { position: relative; overflow: hidden; }
      .cd-strip::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,.45) 50%, transparent 70%); animation: cd-sheen 4.5s ease-in-out infinite; }
      .cd-tile { transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
      .cd-tile:hover { transform: translateY(-2px); border-color: var(--cd-brand, var(--primary)); box-shadow: var(--shadow-card); }
      .cd-knight { --cd-glow: rgba(255,161,22,.55); animation: cd-glow 2.8s ease-in-out infinite; position: relative; overflow: hidden; }
      .cd-knight::after { content: ""; position: absolute; inset: 0; background: linear-gradient(100deg, transparent 35%, rgba(255,255,255,.55) 50%, transparent 65%); animation: cd-sheen 3.2s ease-in-out infinite; }
      .cd-star { animation: cd-star .55s cubic-bezier(.3,1.4,.5,1) both, cd-twinkle 3s ease-in-out 1s infinite; transform-origin: center; }
      .cd-seg { transform-origin: left; animation: cd-grow .9s cubic-bezier(.2,.7,.2,1) both; }
      @media (prefers-reduced-motion: reduce) {
        .cd-card, .cd-strip::after, .cd-knight, .cd-knight::after, .cd-star, .cd-seg, .cd-tile { animation: none !important; transition: none !important; }
      }
    `}</style>
  );
}

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Counts up to `target` with requestAnimationFrame. With reduced motion it shows the final value at once. */
function useCountUp(target: number, ms = 900): number {
  const [reduced] = useState(reducedMotion);
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);
  useEffect(() => {
    if (reduced) return;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / ms);
      setProgress(p);
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, ms, reduced]);
  if (reduced) return target;
  const eased = 1 - Math.pow(1 - progress, 3);
  return Math.round(target * eased);
}

function Count({ value }: { value: number }) {
  const shown = useCountUp(value);
  return <>{shown.toLocaleString("en-IN")}</>;
}

/* ───────── metric helpers and small pieces ───────── */

function raw(entry: Connected, key: string): number | string | null {
  const m: Metric | undefined = entry.metrics[key];
  return m && m.available ? m.value : null;
}

function num(entry: Connected, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = raw(entry, k);
    if (typeof v === "number") return v;
  }
  return null;
}

function Tile({ label, value, brand, note }: { label: string; value: number | null; brand: string; note?: string }) {
  return (
    <div className="cd-tile rounded-2xl border border-edge-strong bg-surface-2/60 p-3.5" style={{ "--cd-brand": brand } as React.CSSProperties}>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-num mt-1.5 min-h-9 text-3xl font-bold leading-none">
        {value === null ? <span className="text-sm font-semibold text-muted">Not available</span> : <Count value={value} />}
      </dd>
      {note && value !== null && <p className="mt-1 text-[11px] text-muted">{note}</p>}
    </div>
  );
}

/* ───────── LeetCode ───────── */

const LC = "#FFA116";

function KnightBadge() {
  return (
    <span
      className="cd-knight inline-flex items-center gap-2 rounded-full border border-[#FFA116] bg-gradient-to-r from-[#FFA116] to-[#ff7a18] px-3.5 py-1.5 text-sm font-extrabold text-[#2a1704]"
      title="LeetCode contest badge: Knight"
    >
      <Shield className="h-4 w-4 fill-[#2a1704]/20" aria-hidden="true" />
      Knight
    </span>
  );
}

export function LeetCodeBody({ entry }: { entry: Connected }) {
  const total = num(entry, "problems_solved_total");
  const easy = num(entry, "problems_easy");
  const medium = num(entry, "problems_medium");
  const hard = num(entry, "problems_hard");
  const badge = raw(entry, "rating_badge");
  const splitKnown = easy !== null && medium !== null && hard !== null && easy + medium + hard > 0;
  const segments = splitKnown
    ? [
        { label: "Easy", n: easy, color: "#00b8a3" },
        { label: "Medium", n: medium, color: "#ffc01e" },
        { label: "Hard", n: hard, color: "#ef4743" },
      ]
    : [];
  const sum = segments.reduce((a, s) => a + s.n, 0);

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Total questions solved</p>
            <p className="font-num mt-1 min-h-14 text-6xl font-bold leading-none" style={{ color: LC }}>
              {total === null ? <span className="text-base font-semibold text-muted">Not available</span> : <Count value={total} />}
            </p>
          </div>
          {typeof badge === "string" && (badge === "Knight" ? <KnightBadge /> : <Badge tone="warn">{badge}</Badge>)}
        </div>
        {segments.length > 0 && (
          <>
            <div role="img" aria-label={`Easy ${easy}, medium ${medium}, hard ${hard}`} className="mt-4 flex h-3 overflow-hidden rounded-full border border-edge-strong bg-surface-2">
              {segments.map((s) => (
                <span key={s.label} className="cd-seg h-full" style={{ width: `${(s.n / sum) * 100}%`, background: s.color }} title={`${s.label}: ${s.n}`} />
              ))}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold">
              {segments.map((s) => (
                <li key={s.label} className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label} <span className="font-num text-muted">{s.n}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Current rating" value={num(entry, "rating_current")} brand={LC} />
        <Tile label="Peak rating" value={num(entry, "rating_peak", "rating_max")} brand={LC} />
        <Tile label="Contests" value={num(entry, "contests_count")} brand={LC} />
        <Tile label="Current streak" value={num(entry, "streak_current")} brand={LC} note="days" />
      </dl>
    </div>
  );
}

/* ───────── CodeChef ───────── */

const CC = "#7e57c2";

function PurpleStars({ count }: { count: number }) {
  const total = Math.max(5, count);
  return (
    <div role="img" aria-label={`${count} star${count === 1 ? "" : "s"}`} className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          className={cn("h-8 w-8", i < count ? "cd-star" : "text-ink/15")}
          style={i < count ? { fill: "#7e57c2", color: "#b39ddb", animationDelay: `${i * 90}ms, ${1000 + i * 150}ms` } : undefined}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function CodeChefBody({ entry }: { entry: Connected }) {
  const stars = num(entry, "stars");
  const best = num(entry, "best_contest_rank");
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Stars</p>
        {stars === null ? <p className="text-sm font-semibold text-muted">Not available</p> : <PurpleStars count={stars} />}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Current rating" value={num(entry, "rating_current")} brand={CC} />
        <Tile label="Peak rating" value={num(entry, "rating_peak", "rating_max")} brand={CC} />
        <Tile label="Questions solved" value={num(entry, "problems_solved_total")} brand={CC} />
        <Tile label="Contests" value={num(entry, "contests_count")} brand={CC} />
      </dl>
      <div>
        <div className="mb-2 flex items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Rank</p>
          <Tooltip side="top" text="Country rank is your current one; best contest rank is your best finish in a single contest.">
            <button type="button" aria-label="About CodeChef ranks" className="flex h-4 w-4 items-center justify-center rounded-full border border-edge-strong text-[10px] font-bold text-muted hover:text-fg">?</button>
          </Tooltip>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <Tile label="Country" value={num(entry, "country_rank")} brand={CC} />
          <Tile label="Best contest" value={best} brand={CC} />
        </dl>
      </div>
    </div>
  );
}

/* ───────── Codeforces ───────── */

const CF = "#1F8ACB";

export function CodeforcesBody({ entry }: { entry: Connected }) {
  const rank = raw(entry, "rank");
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">Current rank</p>
        {typeof rank === "string" ? (
          <span className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-extrabold" style={{ borderColor: CF, color: CF, background: `color-mix(in srgb, ${CF} 12%, transparent)` }}>
            {rank}
          </span>
        ) : (
          <p className="text-sm font-semibold text-muted">Unrated</p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Current rating" value={num(entry, "rating_current")} brand={CF} />
        <Tile label="Max rating" value={num(entry, "rating_max")} brand={CF} />
        <Tile label="Contests" value={num(entry, "contests_count")} brand={CF} />
        <Tile label="Questions solved" value={num(entry, "problems_solved_total")} brand={CF} />
      </dl>
    </div>
  );
}

/* ───────── HackerRank ───────── */

const HR = "#2ec866";
const HR_TRACKS: { key: string; label: string }[] = [
  { key: "stars_problem_solving", label: "Problem Solving" },
  { key: "stars_java", label: "Java" },
  { key: "stars_cpp", label: "C++" },
  { key: "stars_python", label: "Python" },
];

function GreenStars({ count }: { count: number }) {
  const total = Math.max(5, count);
  return (
    <div role="img" aria-label={`${count} of ${total} stars`} className="flex gap-1">
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          className={cn("h-5 w-5", i < count ? "cd-star" : "text-ink/15")}
          style={i < count ? { fill: HR, color: HR, animationDelay: `${i * 80}ms, ${900 + i * 120}ms` } : undefined}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function HackerRankBody({ entry }: { entry: Connected }) {
  const liveTracks = HR_TRACKS.some((t) => t.key in entry.metrics);
  if (!liveTracks) return <GenericBody entry={entry} brand={HR} />;
  return (
    <ul className="space-y-2.5">
      {HR_TRACKS.map((t) => {
        const stars = num(entry, t.key);
        return (
          <li key={t.key} className="cd-tile flex items-center justify-between gap-3 rounded-2xl border border-edge-strong bg-surface-2/60 px-4 py-3" style={{ "--cd-brand": HR } as React.CSSProperties}>
            <span className="text-sm font-bold">{t.label}</span>
            {stars === null ? <span className="text-xs font-semibold text-muted">No badge yet</span> : <GreenStars count={stars} />}
          </li>
        );
      })}
    </ul>
  );
}

/** Manual entries and anything without a dedicated layout: the stats the user typed, nothing invented. */
export function GenericBody({ entry, brand }: { entry: Connected; brand: string }) {
  const stars = num(entry, "stars");
  const tiles: [string, number | null][] = [
    ["Problems solved", num(entry, "problems_solved_total")],
    ["Current rating", num(entry, "rating_current")],
    ["Peak rating", num(entry, "rating_peak", "rating_max")],
    ["Contests", num(entry, "contests_count")],
  ];
  const shown = tiles.filter(([, v]) => v !== null);
  if (shown.length === 0 && stars === null) return <p className="text-sm text-muted">No stats available yet.</p>;
  return (
    <div className="space-y-4">
      {shown.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shown.map(([label, v]) => <Tile key={label} label={label} value={v} brand={brand} />)}
        </dl>
      )}
      {stars !== null && (
        <div>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Stars</p>
          <GreenStars count={stars} />
        </div>
      )}
    </div>
  );
}

/* ───────── GitHub: project repositories and what their READMEs say ───────── */

/** The first readable sentence(s) of a README: skips headings, badges, images, HTML and links-only lines. */
export function readmeSummary(excerpt: string | null | undefined, max = 170): string | null {
  if (!excerpt) return null;
  const lines = excerpt
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^(#|!\[|\[!\[|<|```|---|===|\||\*\*\*|>)/.test(l) && !/^\[[^\]]*\]\([^)]*\)$/.test(l));
  const text = lines
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length < 12) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export function GithubBody({ entry, repos }: { entry: Connected; repos: RepoSummary[] }) {
  const projects = repos.filter((r) => !r.is_fork && !r.is_archived);
  const shown = [...projects].sort((a, b) => (b.pushed_at ?? "").localeCompare(a.pushed_at ?? "")).slice(0, 6);
  const withReadme = projects.filter((r) => readmeSummary(r.readme_excerpt)).length;
  const count = num(entry, "project_repos");
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3">
        <Tile label="Project repositories" value={count ?? (projects.length || null)} brand="var(--primary)" />
        <Tile label="READMEs read" value={projects.length ? withReadme : null} brand="var(--primary)" note={`of ${projects.length}`} />
      </dl>
      {entry.languages && Object.keys(entry.languages).length > 0 && (
        <ul aria-label="Main languages" className="flex flex-wrap gap-1.5">
          {Object.entries(entry.languages).slice(0, 8).map(([name, n], i) => (
            <li key={name} className="flex items-center gap-1.5 rounded-md border border-edge-strong px-2 py-1 text-xs font-semibold">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: languageColor(name, i) }} />
              {name}
              <span className="font-num text-muted">{n}</span>
            </li>
          ))}
        </ul>
      )}
      {shown.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((r) => {
            const summary = readmeSummary(r.readme_excerpt) ?? r.description;
            return (
              <li key={r.id} className="cd-tile rounded-2xl border border-edge-strong bg-surface-2/60 p-4" style={{ "--cd-brand": "var(--primary)" } as React.CSSProperties}>
                <div className="flex items-center gap-2">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-display text-lg font-semibold hover:text-primary">
                    {r.full_name.split("/").pop()}
                  </a>
                  {r.language && (
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-edge-strong px-2 py-0.5 text-[11px] font-bold">
                      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: languageColor(r.language, 0) }} />
                      {r.language}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-3 text-sm leading-snug text-muted">{summary ?? "No README or description yet."}</p>
                <p className="mt-2 text-[11px] font-semibold text-muted">{readmeSummary(r.readme_excerpt) ? "From the README" : r.description ? "From the description" : ""}</p>
              </li>
            );
          })}
        </ul>
      )}
      {shown.length === 0 && <p className="text-sm text-muted">No project repositories found. Forks and your profile README repository are not counted.</p>}
    </div>
  );
}
