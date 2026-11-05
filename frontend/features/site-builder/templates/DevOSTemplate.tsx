"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { BatteryFull, Briefcase, ChartColumn, ExternalLink, FileText, FolderOpen, House, Moon, SquareTerminal, Sun, Wifi } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { MascotWidget } from "../mascots/MascotWidget";
import { accentFor } from "../lib/accent";
import { firstName, hostOf, initials, publicUrl, safeHref } from "../lib/links";
import { useThemeMode } from "../lib/useThemeMode";
import { DevOSDock } from "./DevOSDock";
import type { DockItem } from "./DevOSDock";
import { DevOSTerminal } from "./DevOSTerminal";
import type { PortfolioData, PortfolioProject, TemplateProps } from "@/types/portfolio";

/* ───────── helpers ───────── */
type SectionKey = "home" | "projects" | "coding" | "experience" | "terminal";
type TabId = "overview.tsx" | "projects.json" | "coding_profiles.py" | "experience.md" | "terminal.sh";
const TAB_OF: Record<SectionKey, TabId> = {
  home: "overview.tsx",
  projects: "projects.json",
  coding: "coding_profiles.py",
  experience: "experience.md",
  terminal: "terminal.sh",
};
const KEY_OF: Record<TabId, SectionKey> = {
  "overview.tsx": "home",
  "projects.json": "projects",
  "coding_profiles.py": "coding",
  "experience.md": "experience",
  "terminal.sh": "terminal",
};

const num = (v: number | undefined | null): string | null =>
  typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("en-US") : null;

const SKILL_LABELS: Array<[keyof PortfolioData["skills"], string]> = [
  ["languages", "Languages"],
  ["frameworks", "Frameworks"],
  ["databasesAndCloud", "Databases & Cloud"],
  ["aiAndMl", "AI & ML"],
  ["coreCsAndTools", "Core CS & Tools"],
];

function subscribeMq(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener("change", cb);
    return () => mq.removeEventListener("change", cb);
  };
}
const NARROW = "(max-width: 767px)";
const subscribeNarrow = subscribeMq(NARROW);

/** One shared once-a-second tick for the menu-bar clock (server snapshot is 0, so no hydration mismatch). */
function subscribeClock(cb: () => void) {
  const id = window.setInterval(cb, 1000);
  return () => window.clearInterval(id);
}
const clockNow = () => Math.floor(Date.now() / 1000) * 1000;

const CSS = `
.sdo-root{font-family:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,sans-serif;color:var(--sdo-fg);background:var(--sdo-wall);background-attachment:local}
.sdo-root *{scrollbar-width:thin}
.sdo-dock{background:var(--sdo-dock);border-color:var(--sdo-bd);backdrop-filter:blur(22px) saturate(1.4);-webkit-backdrop-filter:blur(22px) saturate(1.4);box-shadow:0 12px 40px -10px rgba(0,0,0,.45)}
.sdo-di{position:relative;display:flex;flex:none;align-items:center;justify-content:center;width:2.25rem;height:2.25rem;border-radius:.7rem;color:var(--sdo-fg);background:var(--sdo-card);border:1px solid var(--sdo-bd);transform-origin:bottom center;transition:transform .16s cubic-bezier(.3,.8,.3,1),background .16s}
@media (min-width:640px){.sdo-di{width:2.75rem;height:2.75rem}}
.sdo-di:hover,.sdo-di:focus-visible{transform:scale(1.55) translateY(-6px);z-index:3;background:var(--sdo-win)}
.sdo-di:hover + .sdo-di,.sdo-di:has(+ .sdo-di:hover),.sdo-di:focus-visible + .sdo-di,.sdo-di:has(+ .sdo-di:focus-visible){transform:scale(1.22) translateY(-2px);z-index:2}
.sdo-di:focus-visible{outline:2px solid var(--sdo-ac);outline-offset:2px}
.sdo-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) scale(.65);transform-origin:bottom;opacity:0;pointer-events:none;white-space:nowrap;font-size:11px;font-weight:600;padding:3px 8px;border-radius:7px;background:var(--sdo-win);color:var(--sdo-fg);border:1px solid var(--sdo-bd);transition:opacity .12s}
.sdo-di:hover .sdo-tip,.sdo-di:focus-visible .sdo-tip{opacity:1}
.sdo-dot{position:absolute;bottom:-7px;left:50%;width:4px;height:4px;margin-left:-2px;border-radius:9999px;background:var(--sdo-ac)}
.sdo-line{animation:sdo-in .22s ease-out both}
@keyframes sdo-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
@keyframes sdo-pulse{0%,100%{box-shadow:0 0 0 0 var(--sdo-acs)}50%{box-shadow:0 0 0 6px transparent}}
.sdo-live{animation:sdo-pulse 2.4s ease-in-out infinite}
.sdo-card{background:var(--sdo-card);border:1px solid var(--sdo-bd);transition:transform .18s ease,border-color .18s ease}
.sdo-card:hover{transform:translateY(-2px);border-color:var(--sdo-ac)}
.sdo-shot img{transition:transform .5s ease}
.sdo-card:hover .sdo-shot img{transform:scale(1.04)}
.sdo-menu-item:hover,.sdo-menu-item:focus-visible{background:var(--sdo-ac);color:var(--sdo-onac);outline:none}
@media (prefers-reduced-motion:reduce){.sdo-root *,.sdo-root *::before,.sdo-root *::after{animation:none!important;transition:none!important}.sdo-di:hover,.sdo-di:focus-visible{transform:none}}
`;

/* ───────── small building blocks ───────── */
function Heading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 font-mono text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--sdo-mut)" }}>
      <span style={{ color: "var(--sdo-ac)" }}>{"//"}</span> {children}
    </h3>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border px-2 py-0.5 font-mono text-[11px]" style={{ borderColor: "var(--sdo-bd)", background: "var(--sdo-acs)", color: "var(--sdo-fg)" }}>
      {children}
    </span>
  );
}

function ExtLink({ href, children }: { href?: string; children: ReactNode }) {
  const safe = safeHref(href);
  if (!safe) return null;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition hover:brightness-110 focus-visible:outline focus-visible:outline-2"
      style={{ borderColor: "var(--sdo-bd)", color: "var(--sdo-ac)", outlineColor: "var(--sdo-ac)" }}
    >
      {children} <ExternalLink className="h-3 w-3" aria-hidden="true" />
    </a>
  );
}

function Avatar({ name, url, size = 96 }: { name: string; url?: string; size?: number }) {
  const [bad, setBad] = useState(false);
  const src = safeHref(url);
  const style: CSSProperties = { width: size, height: size };
  if (src && !bad) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={`${name || "Portfolio owner"} profile photo`} onError={() => setBad(true)} className="shrink-0 rounded-2xl border object-cover" style={{ ...style, borderColor: "var(--sdo-bd)" }} />;
  }
  return (
    <div aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-2xl border text-3xl font-bold" style={{ ...style, borderColor: "var(--sdo-bd)", background: "var(--sdo-ac)", color: "var(--sdo-onac)" }}>
      {initials(name)}
    </div>
  );
}

function Shot({ p }: { p: PortfolioProject }) {
  const [bad, setBad] = useState(false);
  const src = safeHref(p.imageUrl);
  if (src && !bad) {
    return (
      <div className="sdo-shot aspect-[16/9] overflow-hidden border-b" style={{ borderColor: "var(--sdo-bd)", background: "var(--sdo-side)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`Screenshot of ${p.title || "project"}`} loading="lazy" onError={() => setBad(true)} className="h-full w-full object-cover object-top" />
      </div>
    );
  }
  return (
    <div className="flex aspect-[16/9] flex-col justify-end border-b p-3" style={{ borderColor: "var(--sdo-bd)", background: "linear-gradient(135deg,var(--sdo-acs),var(--sdo-side))" }} role="img" aria-label={`${p.title || "Project"} (no screenshot available)`}>
      <span className="font-mono text-[11px]" style={{ color: "var(--sdo-ac)" }}>{p.techStack.slice(0, 4).join(" · ") || "project"}</span>
    </div>
  );
}

/* ───────── sections ───────── */
function Hero({ data, onCopyEmail }: { data: PortfolioData; onCopyEmail: () => void }) {
  const b = data.basics;
  const socials: Array<[string, string | undefined]> = [
    ["GitHub", b.socials.github],
    ["LinkedIn", b.socials.linkedin],
    ["X / Twitter", b.socials.twitter],
    ["LeetCode", b.socials.leetcode],
    ["CodeChef", b.socials.codechef],
    ["Codeforces", b.socials.codeforces],
    ["Website", b.socials.website],
  ];
  const resume = safeHref(b.resumeUrl);
  return (
    <section aria-label="About" className="flex flex-col gap-5 sm:flex-row">
      <Avatar name={b.fullName} url={b.avatarUrl} />
      <div className="min-w-0 flex-1">
        {b.availabilityText && (
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold" style={{ borderColor: "var(--sdo-bd)", background: "var(--sdo-acs)" }}>
            <span className="sdo-live h-2 w-2 rounded-full" style={{ background: "var(--sdo-ac)" }} aria-hidden="true" /> {b.availabilityText}
          </p>
        )}
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{b.fullName || data.config.handle}</h2>
        {b.headline && <p className="mt-1 text-base font-medium" style={{ color: "var(--sdo-ac)" }}>{b.headline}</p>}
        {b.location && <p className="mt-1 font-mono text-xs" style={{ color: "var(--sdo-mut)" }}>{b.location}</p>}
        {b.shortBio && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed">{b.shortBio}</p>}
        {b.longBio && <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--sdo-mut)" }}>{b.longBio}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {resume && (
            <a href={resume} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ background: "var(--sdo-ac)", color: "var(--sdo-onac)", outlineColor: "var(--sdo-ac)" }}>
              <FileText className="h-4 w-4" aria-hidden="true" /> Download Resume
            </a>
          )}
          {b.email && (
            <button type="button" onClick={onCopyEmail} className="inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-semibold transition hover:bg-[var(--sdo-acs)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: "var(--sdo-bd)", outlineColor: "var(--sdo-ac)" }}>
              Copy email
            </button>
          )}
          {socials.map(([label, url]) => (url ? <ExtLink key={label} href={url}>{label}</ExtLink> : null))}
        </div>
      </div>
    </section>
  );
}

function SkillsBlock({ data }: { data: PortfolioData }) {
  const rows = SKILL_LABELS.filter(([k]) => data.skills[k].length > 0);
  if (rows.length === 0) return null;
  return (
    <section aria-label="Skills">
      <Heading>skills.json</Heading>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([k, label]) => (
          <div key={k} className="sdo-card rounded-xl p-3">
            <dt className="mb-2 text-xs font-semibold" style={{ color: "var(--sdo-mut)" }}>{label}</dt>
            <dd className="flex flex-wrap gap-1.5">{data.skills[k].map((s) => <Chip key={s}>{s}</Chip>)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function EducationBlock({ data }: { data: PortfolioData }) {
  if (data.education.length === 0) return null;
  return (
    <section aria-label="Education">
      <Heading>education.md</Heading>
      <ul className="space-y-3">
        {data.education.map((e) => (
          <li key={e.id} className="sdo-card rounded-xl p-4">
            <p className="font-semibold">{e.degree || e.institution}</p>
            <p className="text-sm" style={{ color: "var(--sdo-mut)" }}>
              {[e.degree ? e.institution : "", e.location, [e.startYear, e.endYear].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}
            </p>
            {e.score && <p className="mt-1 font-mono text-xs" style={{ color: "var(--sdo-ac)" }}>{e.score}</p>}
            {e.highlights && e.highlights.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{e.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AchievementsBlock({ data }: { data: PortfolioData }) {
  if (data.achievements.length === 0) return null;
  return (
    <section aria-label="Achievements">
      <Heading>achievements.md</Heading>
      <ul className="grid gap-3 sm:grid-cols-2">
        {data.achievements.map((a) => (
          <li key={a.id} className="sdo-card rounded-xl p-4">
            <p className="font-semibold">{a.title}</p>
            <p className="text-xs" style={{ color: "var(--sdo-mut)" }}>{[a.issuer, a.date].filter(Boolean).join(" · ")}</p>
            {a.description && <p className="mt-1.5 text-sm leading-relaxed">{a.description}</p>}
            {a.proofUrl && <div className="mt-2"><ExtLink href={a.proofUrl}>Proof</ExtLink></div>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProjectsBlock({ data }: { data: PortfolioData }) {
  if (data.projects.length === 0) return null;
  const sorted = [...data.projects].sort((a, b) => Number(b.featured) - Number(a.featured));
  return (
    <section aria-label="Projects">
      <ul className="grid gap-4 md:grid-cols-2">
        {sorted.map((p) => (
          <li key={p.id} className="sdo-card flex flex-col overflow-hidden rounded-xl">
            <Shot p={p} />
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold leading-snug">{p.title || "Untitled project"}</h4>
                {p.featured && <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold" style={{ background: "var(--sdo-ac)", color: "var(--sdo-onac)" }}>FEATURED</span>}
              </div>
              {p.tagline && <p className="mt-0.5 text-xs" style={{ color: "var(--sdo-ac)" }}>{p.tagline}</p>}
              {p.description && <p className="mt-2 text-sm leading-relaxed">{p.description}</p>}
              {p.metrics && <p className="mt-2 font-mono text-[11.5px]" style={{ color: "var(--sdo-mut)" }}>{p.metrics}</p>}
              {p.techStack.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{p.techStack.map((t) => <Chip key={t}>{t}</Chip>)}</div>}
              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <ExtLink href={p.githubUrl}>Source</ExtLink>
                <ExtLink href={p.liveUrl}>Live demo</ExtLink>
                {p.year && <span className="ml-auto self-center font-mono text-[11px]" style={{ color: "var(--sdo-mut)" }}>{p.year}</span>}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dd className="font-mono text-xl font-bold">{value}</dd>
      <dt className="text-[11px]" style={{ color: "var(--sdo-mut)" }}>{label}</dt>
    </div>
  );
}

function StatCard({ title, username, url, children }: { title: string; username: string; url?: string; children: ReactNode }) {
  return (
    <li className="sdo-card rounded-xl p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-mono text-sm font-semibold">{title}</p>
        {safeHref(url) ? <ExtLink href={url}>@{username}</ExtLink> : <span className="font-mono text-xs" style={{ color: "var(--sdo-mut)" }}>@{username}</span>}
      </div>
      {children}
    </li>
  );
}

function CodingBlock({ data }: { data: PortfolioData }) {
  const s = data.codingStats;
  const lc = s.leetcode;
  const diffTotal = lc ? lc.easySolved + lc.mediumSolved + lc.hardSolved : 0;
  const seg = (n: number) => (diffTotal > 0 ? `${(n / diffTotal) * 100}%` : "0%");
  return (
    <section aria-label="Coding profiles">
      <ul className="grid gap-4 md:grid-cols-2">
        {lc && (
          <StatCard title="LeetCode" username={lc.username} url={lc.profileUrl}>
            <dl className="grid grid-cols-3 gap-3">
              <Metric label="solved" value={num(lc.totalSolved)} />
              <Metric label="contest rating" value={num(lc.rating)} />
              <Metric label="top %" value={typeof lc.topPercentage === "number" ? `${lc.topPercentage}%` : null} />
            </dl>
            {diffTotal > 0 && (
              <>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full" role="img" aria-label={`Easy ${lc.easySolved}, Medium ${lc.mediumSolved}, Hard ${lc.hardSolved}`} style={{ background: "var(--sdo-side)" }}>
                  <span style={{ width: seg(lc.easySolved), background: "#22c55e" }} />
                  <span style={{ width: seg(lc.mediumSolved), background: "#f59e0b" }} />
                  <span style={{ width: seg(lc.hardSolved), background: "#ef4444" }} />
                </div>
                <p className="mt-1.5 font-mono text-[11px]" style={{ color: "var(--sdo-mut)" }}>
                  Easy {num(lc.easySolved)} · Medium {num(lc.mediumSolved)} · Hard {num(lc.hardSolved)}
                </p>
              </>
            )}
          </StatCard>
        )}
        {s.codechef && (
          <StatCard title="CodeChef" username={s.codechef.username} url={s.codechef.profileUrl}>
            <dl className="grid grid-cols-3 gap-3">
              <Metric label="rating" value={num(s.codechef.rating)} />
              <Metric label="max rating" value={num(s.codechef.maxRating)} />
              <Metric label="stars" value={s.codechef.stars} />
            </dl>
          </StatCard>
        )}
        {s.codeforces && (
          <StatCard title="Codeforces" username={s.codeforces.username} url={s.codeforces.profileUrl}>
            <dl className="grid grid-cols-3 gap-3">
              <Metric label="rating" value={num(s.codeforces.rating)} />
              <Metric label="max rating" value={num(s.codeforces.maxRating)} />
              <Metric label="rank" value={s.codeforces.rank} />
            </dl>
          </StatCard>
        )}
        {s.github && (
          <StatCard title="GitHub" username={s.github.username} url={s.github.profileUrl}>
            <dl className="grid grid-cols-3 gap-3">
              <Metric label="public repos" value={num(s.github.publicRepos)} />
              <Metric label="stars" value={num(s.github.totalStars)} />
              <Metric label="followers" value={num(s.github.followers)} />
            </dl>
            {s.github.topLanguages.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{s.github.topLanguages.map((l) => <Chip key={l}>{l}</Chip>)}</div>}
          </StatCard>
        )}
      </ul>
    </section>
  );
}

function ExperienceBlock({ data }: { data: PortfolioData }) {
  if (data.experience.length === 0) return null;
  return (
    <section aria-label="Experience">
      <ol className="relative space-y-4 border-l pl-5" style={{ borderColor: "var(--sdo-bd)" }}>
        {data.experience.map((e) => (
          <li key={e.id} className="relative">
            <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: "var(--sdo-ac)" }} aria-hidden="true" />
            <div className="sdo-card rounded-xl p-4">
              <p className="font-semibold">{e.role || e.company}</p>
              <p className="text-sm" style={{ color: "var(--sdo-mut)" }}>
                {e.role && e.company ? (safeHref(e.companyUrl) ? <a href={safeHref(e.companyUrl)} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted underline-offset-2" style={{ color: "var(--sdo-ac)" }}>{e.company}</a> : e.company) : null}
                {[e.location, [e.startDate, e.endDate].filter(Boolean).join(" – ")].filter(Boolean).map((t, i) => (
                  <span key={i}>{(e.role && e.company) || i > 0 ? " · " : ""}{t}</span>
                ))}
              </p>
              {e.descriptionBullets.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">{e.descriptionBullets.map((x, i) => <li key={i}>{x}</li>)}</ul>}
              {e.techUsed.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{e.techUsed.map((t) => <Chip key={t}>{t}</Chip>)}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────── window chrome ───────── */
function TrafficLights({ onClose, onMin, onMax }: { onClose?: () => void; onMin?: () => void; onMax?: () => void }) {
  const dot = "h-3 w-3 rounded-full border border-black/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Window controls">
      <button type="button" aria-label="Switch to full page scroll" onClick={onClose} disabled={!onClose} className={dot} style={{ background: "#ff5f57" }} />
      <button type="button" aria-label="Toggle file sidebar" onClick={onMin} disabled={!onMin} className={dot} style={{ background: "#febc2e" }} />
      <button type="button" aria-label="Toggle window size" onClick={onMax} disabled={!onMax} className={dot} style={{ background: "#28c840" }} />
    </div>
  );
}

function Win({ id, title, icon, children }: { id: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section id={`sdo-${id}`} aria-label={title} className="scroll-mt-14 overflow-hidden rounded-xl border shadow-xl" style={{ background: "var(--sdo-win)", borderColor: "var(--sdo-bd)", backdropFilter: "blur(18px)" }}>
      <header className="flex items-center gap-3 border-b px-3 py-2" style={{ background: "var(--sdo-bar)", borderColor: "var(--sdo-bd)" }}>
        <TrafficLights />
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--sdo-mut)" }}>{icon}{title}</span>
      </header>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

/* ───────── menu bar ───────── */
type MenuItem = { label: string; onSelect?: () => void; href?: string };
type MenuDef = { id: string; label: string; items: MenuItem[] };

function MenuBar({ menus, name, clock, view, onView, narrow, theme, onToggleTheme, toast }: {
  menus: MenuDef[]; name: string; clock: string; view: "ide" | "scroll"; onView: (v: "ide" | "scroll") => void;
  narrow: boolean; theme: "dark" | "light"; onToggleTheme: () => void; toast: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const key = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div className="sticky top-0 z-30 flex h-9 items-center justify-between gap-3 border-b px-3 text-[12.5px] sm:px-4" style={{ background: "var(--sdo-bar)", borderColor: "var(--sdo-bd)", backdropFilter: "blur(20px) saturate(1.5)" }}>
      <div ref={ref} className="flex min-w-0 items-center gap-1">
        <SquareTerminal className="mr-1 h-4 w-4 shrink-0" style={{ color: "var(--sdo-ac)" }} aria-hidden="true" />
        <span className="mr-2 max-w-[9rem] truncate font-bold sm:max-w-none">{name}</span>
        <div className="relative hidden items-center gap-0.5 md:flex" role="menubar" aria-label="Menu bar">
          {menus.map((m) => (
            <div key={m.id} className="relative">
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={open === m.id}
                onClick={() => setOpen(open === m.id ? null : m.id)}
                onMouseEnter={() => open && setOpen(m.id)}
                className="rounded px-2 py-0.5 font-medium transition hover:bg-[var(--sdo-acs)] focus-visible:outline focus-visible:outline-2"
                style={{ outlineColor: "var(--sdo-ac)", background: open === m.id ? "var(--sdo-acs)" : undefined }}
              >
                {m.label}
              </button>
              {open === m.id && (
                <ul role="menu" aria-label={m.label} className="absolute left-0 top-full z-40 mt-1 min-w-[12rem] rounded-lg border p-1 shadow-2xl" style={{ background: "var(--sdo-win)", borderColor: "var(--sdo-bd)", backdropFilter: "blur(22px)" }}>
                  {m.items.map((it) => (
                    <li key={it.label} role="none">
                      {it.href ? (
                        <a role="menuitem" href={it.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(null)} className="sdo-menu-item block rounded px-2.5 py-1.5">{it.label}</a>
                      ) : (
                        <button type="button" role="menuitem" onClick={() => { it.onSelect?.(); setOpen(null); }} className="sdo-menu-item block w-full rounded px-2.5 py-1.5 text-left">{it.label}</button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {toast && <span role="status" className="rounded px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--sdo-ac)", color: "var(--sdo-onac)" }}>{toast}</span>}
        {!narrow && (
          <div role="group" aria-label="View mode" className="flex overflow-hidden rounded-md border text-[11px] font-semibold" style={{ borderColor: "var(--sdo-bd)" }}>
            {([["ide", "IDE Window View"], ["scroll", "Full Page Scroll"]] as const).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => onView(v)} className="px-2 py-0.5 transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2" style={{ background: view === v ? "var(--sdo-ac)" : "transparent", color: view === v ? "var(--sdo-onac)" : "var(--sdo-fg)", outlineColor: "var(--sdo-ac)" }}>
                {label}
              </button>
            ))}
          </div>
        )}
        <span className="hidden items-center gap-2 sm:flex" style={{ color: "var(--sdo-mut)" }} aria-hidden="true">
          <Wifi className="h-3.5 w-3.5" />
          <BatteryFull className="h-4 w-4" />
        </span>
        <span className="min-w-[4.5rem] text-right font-medium tabular-nums" aria-label="Current time">{clock}</span>
        <button type="button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} className="rounded p-1 transition hover:bg-[var(--sdo-acs)] focus-visible:outline focus-visible:outline-2" style={{ outlineColor: "var(--sdo-ac)" }}>
          {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

/* ───────── the template ───────── */
export function DevOSTemplate({ data, onUpdateConfig }: TemplateProps) {
  const [theme, setTheme, toggleTheme] = useThemeMode(data.config.themeMode);
  const accent = accentFor(data.config.accentColor);
  const dark = theme === "dark";
  const ac = dark ? accent.base : accent.strong;
  const onAc = dark ? accent.onBase : "#ffffff";

  const [view, setView] = useState<"ide" | "scroll">("ide");
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW).matches, () => false);
  const effectiveView = narrow ? "scroll" : view;
  const [tab, setTab] = useState<TabId>("overview.tsx");
  const [sidebar, setSidebar] = useState(true);
  const [tall, setTall] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);

  const tick = useSyncExternalStore(subscribeClock, clockNow, () => 0);
  const clock = tick ? new Date(tick).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

  const b = data.basics;
  const name = b.fullName || data.config.handle;
  const s = data.codingStats;
  const hasStats = data.config.showCodingStats && !!(s.leetcode || s.codechef || s.codeforces || s.github);
  const hasSkills = SKILL_LABELS.some(([k]) => data.skills[k].length > 0);
  const gh = safeHref(b.socials.github);
  const li = safeHref(b.socials.linkedin);
  const resume = safeHref(b.resumeUrl);

  const has: Record<SectionKey, boolean> = {
    home: true,
    projects: data.projects.length > 0,
    coding: hasStats,
    experience: data.experience.length > 0,
    terminal: true,
  };
  const tabs = (Object.keys(TAB_OF) as SectionKey[]).filter((k) => has[k]).map((k) => TAB_OF[k]);
  const activeTab: TabId = tabs.includes(tab) ? tab : "overview.tsx";

  function say(msg: string) {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 1800);
  }
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      say(`${label} copied`);
    } catch {
      say("Copy is not available here");
    }
  }

  function go(key: SectionKey) {
    setTab(TAB_OF[key]);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = document.getElementById(effectiveView === "scroll" ? `sdo-${key}` : "sdo-ide");
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = tabs.indexOf(activeTab);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    setTab(next);
    document.getElementById(`sdo-tab-${next}`)?.focus();
  }

  const menus: MenuDef[] = [
    {
      id: "file",
      label: "File",
      items: [
        ...(resume ? [{ label: "Download Resume", href: resume }] : []),
        ...(b.email ? [{ label: "Copy Email", onSelect: () => void copy(b.email, "Email") }] : []),
        ...(gh ? [{ label: "Open GitHub", href: gh }] : []),
        ...(li ? [{ label: "Open LinkedIn", href: li }] : []),
        { label: "Copy Portfolio Link", onSelect: () => void copy(publicUrl(data.config.handle), "Link") },
      ],
    },
    {
      id: "edit",
      label: "Edit",
      items: [
        ...(b.shortBio ? [{ label: "Copy Short Bio", onSelect: () => void copy(b.shortBio, "Bio") }] : []),
        { label: "Copy Handle", onSelect: () => void copy(data.config.handle, "Handle") },
      ],
    },
    {
      id: "view",
      label: "View",
      items: [
        { label: "IDE Window View", onSelect: () => setView("ide") },
        { label: "Full Page Scroll", onSelect: () => setView("scroll") },
        { label: dark ? "Light Mode" : "Dark Mode", onSelect: () => toggleTheme() },
      ],
    },
    {
      id: "window",
      label: "Window",
      items: (Object.keys(TAB_OF) as SectionKey[]).filter((k) => has[k]).map((k) => ({
        label: { home: "Overview", projects: "Projects", coding: "Coding Stats", experience: "Experience", terminal: "Terminal" }[k],
        onSelect: () => go(k),
      })),
    },
    {
      id: "help",
      label: "Help",
      items: [
        { label: "Open Terminal (type help)", onSelect: () => go("terminal") },
        { label: "Keyboard: arrow keys switch tabs", onSelect: () => say("Use ← → on the tab bar") },
      ],
    },
  ];

  const flipTheme = () => {
    const next = dark ? "light" : "dark";
    setTheme(next);
    onUpdateConfig?.({ themeMode: next });
  };

  const dock: DockItem[] = [
    { key: "home", label: "Home", icon: <House className="h-full w-full" />, onClick: () => go("home"), active: activeTab === "overview.tsx" },
    ...(has.projects ? [{ key: "projects", label: "Projects", icon: <FolderOpen className="h-full w-full" />, onClick: () => go("projects"), active: activeTab === "projects.json" }] : []),
    ...(has.coding ? [{ key: "coding", label: "Coding Stats", icon: <ChartColumn className="h-full w-full" />, onClick: () => go("coding"), active: activeTab === "coding_profiles.py" }] : []),
    ...(has.experience ? [{ key: "experience", label: "Experience", icon: <Briefcase className="h-full w-full" />, onClick: () => go("experience"), active: activeTab === "experience.md" }] : []),
    { key: "terminal", label: "Terminal", icon: <SquareTerminal className="h-full w-full" />, onClick: () => go("terminal"), active: activeTab === "terminal.sh" },
    ...(gh ? [{ key: "github", label: "GitHub", icon: <FaGithub className="h-full w-full" />, href: gh }] : []),
    ...(li ? [{ key: "linkedin", label: "LinkedIn", icon: <FaLinkedin className="h-full w-full" />, href: li }] : []),
    ...(resume ? [{ key: "resume", label: "Resume", icon: <FileText className="h-full w-full" />, href: resume }] : []),
    { key: "theme", label: dark ? "Light mode" : "Dark mode", icon: dark ? <Sun className="h-full w-full" /> : <Moon className="h-full w-full" />, onClick: flipTheme },
  ];

  const vars = {
    "--sdo-ac": ac,
    "--sdo-acs": accent.soft,
    "--sdo-onac": onAc,
    "--sdo-fg": dark ? "#e6edf3" : "#1f2328",
    "--sdo-mut": dark ? "#9aa7b4" : "#59636e",
    "--sdo-win": dark ? "rgba(13,17,23,0.88)" : "rgba(255,255,255,0.84)",
    "--sdo-bar": dark ? "rgba(22,27,34,0.74)" : "rgba(246,247,250,0.78)",
    "--sdo-bd": dark ? "rgba(255,255,255,0.11)" : "rgba(15,23,42,0.13)",
    "--sdo-card": dark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.035)",
    "--sdo-side": dark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.04)",
    "--sdo-dock": dark ? "rgba(30,36,48,0.55)" : "rgba(255,255,255,0.55)",
    "--sdo-wall": dark
      ? `radial-gradient(60% 50% at 12% 8%, rgba(88,101,242,0.38), transparent 60%), radial-gradient(48% 42% at 88% 18%, ${accent.soft}, transparent 62%), radial-gradient(60% 55% at 50% 100%, rgba(20,184,166,0.26), transparent 62%), #090d18`
      : `radial-gradient(60% 50% at 10% 6%, rgba(165,180,252,0.65), transparent 60%), radial-gradient(48% 42% at 90% 16%, rgba(253,186,216,0.55), transparent 62%), radial-gradient(60% 55% at 50% 100%, rgba(153,246,228,0.55), transparent 62%), #eef1f8`,
  } as CSSProperties;

  const overview = (
    <div className="space-y-8">
      <Hero data={data} onCopyEmail={() => void copy(b.email, "Email")} />
      <SkillsBlock data={data} />
      <EducationBlock data={data} />
      <AchievementsBlock data={data} />
    </div>
  );

  const content: Record<TabId, ReactNode> = {
    "overview.tsx": overview,
    "projects.json": <ProjectsBlock data={data} />,
    "coding_profiles.py": <CodingBlock data={data} />,
    "experience.md": <ExperienceBlock data={data} />,
    "terminal.sh": <DevOSTerminal data={data} accent={ac} />,
  };

  const ide = (
    <section id="sdo-ide" aria-label="Portfolio IDE window" className="scroll-mt-14 overflow-hidden rounded-xl border shadow-2xl" style={{ background: "var(--sdo-win)", borderColor: "var(--sdo-bd)", backdropFilter: "blur(22px)" }}>
      <header className="flex items-center gap-3 border-b px-3 py-2" style={{ background: "var(--sdo-bar)", borderColor: "var(--sdo-bd)" }}>
        <TrafficLights onClose={() => setView("scroll")} onMin={() => setSidebar((v) => !v)} onMax={() => setTall((v) => !v)} />
        <span className="truncate text-xs font-semibold" style={{ color: "var(--sdo-mut)" }}>{data.config.handle} — Visual Studio Portfolio</span>
      </header>
      <div role="tablist" aria-label="Open files" onKeyDown={onTabKey} className="flex overflow-x-auto border-b font-mono text-xs" style={{ borderColor: "var(--sdo-bd)", background: "var(--sdo-side)" }}>
        {tabs.map((t) => {
          const on = t === activeTab;
          return (
            <button key={t} id={`sdo-tab-${t}`} type="button" role="tab" aria-selected={on} aria-controls="sdo-panel" tabIndex={on ? 0 : -1} onClick={() => setTab(t)} className="shrink-0 border-r px-3.5 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2" style={{ borderColor: "var(--sdo-bd)", background: on ? "var(--sdo-win)" : "transparent", color: on ? "var(--sdo-fg)" : "var(--sdo-mut)", boxShadow: on ? `inset 0 2px 0 ${ac}` : undefined, outlineColor: ac }}>
              {t}
            </button>
          );
        })}
      </div>
      <nav aria-label="Breadcrumb" className="border-b px-4 py-1.5 font-mono text-[11px]" style={{ borderColor: "var(--sdo-bd)", color: "var(--sdo-mut)" }}>
        src › portfolio › {data.config.handle} › <span style={{ color: "var(--sdo-fg)" }}>{activeTab}</span>
      </nav>
      <div className="flex" style={{ height: tall ? 780 : 600 }}>
        {sidebar && (
          <aside aria-label="File explorer" className="hidden w-52 shrink-0 overflow-y-auto border-r p-2 font-mono text-xs lg:block" style={{ borderColor: "var(--sdo-bd)", background: "var(--sdo-side)" }}>
            <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--sdo-mut)" }}>Explorer</p>
            <p className="px-2 py-1" style={{ color: "var(--sdo-mut)" }}>▾ {data.config.handle}</p>
            <ul className="ml-2">
              {tabs.map((t) => (
                <li key={t}>
                  <button type="button" onClick={() => go(KEY_OF[t])} aria-current={t === activeTab ? "page" : undefined} className="block w-full truncate rounded px-2 py-1 text-left transition hover:bg-[var(--sdo-acs)] focus-visible:outline focus-visible:outline-2" style={{ background: t === activeTab ? "var(--sdo-acs)" : undefined, outlineColor: ac }}>
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
        <div id="sdo-panel" role="tabpanel" aria-labelledby={`sdo-tab-${activeTab}`} tabIndex={0} className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-7 focus-visible:outline-none">
          {content[activeTab]}
        </div>
      </div>
    </section>
  );

  const stack = (
    <div className="space-y-6">
      <Win id="home" title="About — overview.tsx" icon={<House className="h-3.5 w-3.5" aria-hidden="true" />}>
        <Hero data={data} onCopyEmail={() => void copy(b.email, "Email")} />
      </Win>
      {has.projects && (
        <Win id="projects" title="Projects — Finder" icon={<FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />}>
          <ProjectsBlock data={data} />
        </Win>
      )}
      {has.coding && (
        <Win id="coding" title="Coding Stats — Activity Monitor" icon={<ChartColumn className="h-3.5 w-3.5" aria-hidden="true" />}>
          <CodingBlock data={data} />
        </Win>
      )}
      {has.experience && (
        <Win id="experience" title="Experience — Log" icon={<Briefcase className="h-3.5 w-3.5" aria-hidden="true" />}>
          <ExperienceBlock data={data} />
        </Win>
      )}
      {(hasSkills || data.education.length > 0) && (
        <Win id="inspector" title="Education & Skills — Inspector" icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}>
          <div className="space-y-8">
            <SkillsBlock data={data} />
            <EducationBlock data={data} />
          </div>
        </Win>
      )}
      {data.achievements.length > 0 && (
        <Win id="achievements" title="Achievements" icon={<FileText className="h-3.5 w-3.5" aria-hidden="true" />}>
          <AchievementsBlock data={data} />
        </Win>
      )}
      <Win id="terminal" title="Terminal — terminal.sh" icon={<SquareTerminal className="h-3.5 w-3.5" aria-hidden="true" />}>
        <DevOSTerminal data={data} accent={ac} />
      </Win>
    </div>
  );

  return (
    <div className="sdo-root min-h-full w-full" style={vars}>
      <style>{CSS}</style>
      <MenuBar menus={menus} name={name} clock={clock} view={effectiveView} onView={setView} narrow={narrow} theme={theme} onToggleTheme={flipTheme} toast={toast} />
      <main className="mx-auto w-full max-w-[1180px] px-3 pb-4 pt-6 sm:px-6">
        <p className="mb-4 hidden font-mono text-[11px] sm:block" style={{ color: "var(--sdo-mut)" }}>
          {hostOf(b.socials.website) ? `${hostOf(b.socials.website)} · ` : ""}hi, I&apos;m {firstName(name)}. Click a tab, scroll, or open the terminal.
        </p>
        {effectiveView === "ide" ? ide : stack}
      </main>
      <DevOSDock items={dock} />
      <MascotWidget data={data} themeMode={theme} />
    </div>
  );
}
