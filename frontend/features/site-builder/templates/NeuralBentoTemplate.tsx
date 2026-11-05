"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Briefcase, Check, Copy, Download, GraduationCap, MapPin, Moon, Sun, Trophy, X } from "lucide-react";
import { FaGithub, FaGlobe, FaLinkedin, FaXTwitter } from "react-icons/fa6";
import type { PortfolioData, PortfolioProject, TemplateProps } from "@/types/portfolio";
import { accentFor } from "../lib/accent";
import { firstName, hostOf, initials, safeHref } from "../lib/links";
import { useThemeMode } from "../lib/useThemeMode";
import { MascotWidget } from "../mascots/MascotWidget";

/* ───────── helpers ───────── */

const num = (n: number | undefined | null): string => (typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "-");
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9+#]/g, "");
const dateRange = (a: string, b: string): string => [a, b].filter(Boolean).join(" - ");
const validEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+$/.test(e);

const SKILL_GROUPS: { key: keyof PortfolioData["skills"]; label: string }[] = [
  { key: "languages", label: "Languages" },
  { key: "frameworks", label: "Frameworks" },
  { key: "databasesAndCloud", label: "Databases & Cloud" },
  { key: "aiAndMl", label: "AI & ML" },
  { key: "coreCsAndTools", label: "Core CS & Tools" },
];

const LANG_SHADES = [1, 0.8, 0.62, 0.46, 0.32, 0.22];

function palette(mode: "dark" | "light") {
  return mode === "dark"
    ? { bg: "#050508", card: "#0C0D12", border: "rgba(255,255,255,0.09)", text: "#F4F4F5", muted: "#A1A1AA", chip: "rgba(255,255,255,0.06)", dot: "rgba(255,255,255,0.075)", shadow: "0 1px 0 rgba(255,255,255,0.03) inset" }
    : { bg: "#F4F4F5", card: "#FFFFFF", border: "#E4E4E7", text: "#18181B", muted: "#52525B", chip: "#F4F4F5", dot: "rgba(24,24,27,0.10)", shadow: "0 1px 2px rgba(24,24,27,0.06), 0 12px 32px -20px rgba(24,24,27,0.18)" };
}

/* ───────── small pieces ───────── */

function Avatar({ src, name, size = 72 }: { src?: string; name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const href = safeHref(src);
  if (!href || failed) {
    return (
      <span aria-hidden="true" className="snb-avatar" style={{ width: size, height: size, fontSize: size * 0.34 }}>
        {initials(name)}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={href} alt={`${name || "Portfolio owner"} avatar`} width={size} height={size} onError={() => setFailed(true)} className="snb-avatar-img" style={{ width: size, height: size }} />;
}

function Shot({ src, project }: { src?: string; project: PortfolioProject }) {
  const [failed, setFailed] = useState(false);
  const href = safeHref(src);
  const host = hostOf(project.liveUrl) || hostOf(project.githubUrl) || "preview";
  return (
    <div className="snb-frame">
      <div className="snb-frame-bar" aria-hidden="true">
        <i /> <i /> <i />
        <span>{host}</span>
      </div>
      <div className="snb-frame-body">
        {href && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={href} alt={`Screenshot of ${project.title || "project"}`} loading="lazy" onError={() => setFailed(true)} className="snb-shot" />
        ) : (
          <div className="snb-fallback" role="img" aria-label={`${project.title || "Project"} - preview unavailable`}>
            <span className="snb-fallback-letter">{(project.title || "?").charAt(0).toUpperCase()}</span>
            <span className="snb-fallback-tech">{project.techStack.slice(0, 3).join(" / ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SolveRing({ easy, medium, hard, total }: { easy: number; medium: number; hard: number; total: number }) {
  const sum = easy + medium + hard;
  const R = 42;
  const C = 2 * Math.PI * R;
  const segs = [
    { n: easy, color: "#22C55E", label: "Easy" },
    { n: medium, color: "#F59E0B", label: "Medium" },
    { n: hard, color: "#EF4444", label: "Hard" },
  ];
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 100 100" width="104" height="104" role="img" aria-label={`${total} LeetCode problems solved: ${easy} easy, ${medium} medium, ${hard} hard`} className="snb-ring shrink-0">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--snb-chip)" strokeWidth="9" />
        {sum > 0 &&
          segs.map((s) => {
            const len = (s.n / sum) * C;
            const el = (
              <circle key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="9" strokeLinecap="butt" strokeDasharray={`${Math.max(len - 2, 0)} ${C - Math.max(len - 2, 0)}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" />
            );
            offset += len;
            return s.n > 0 ? el : null;
          })}
        <text x="50" y="52" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--snb-text)">{num(total)}</text>
        <text x="50" y="66" textAnchor="middle" fontSize="8" fill="var(--snb-muted)">solved</text>
      </svg>
      {sum > 0 && (
        <ul className="space-y-1 text-xs">
          {segs.map((s) => (
            <li key={s.label} className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="snb-muted w-14">{s.label}</span>
              <span className="font-semibold tabular-nums">{num(s.n)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────── template ───────── */

export function NeuralBentoTemplate({ data, onUpdateConfig }: TemplateProps) {
  const { config, basics, codingStats, skills, projects, experience, education, achievements } = data;
  const [mode, , toggleMode] = useThemeMode(config.themeMode);
  const accent = accentFor(config.accentColor);
  const pal = palette(mode);
  const acc = mode === "dark" ? accent.base : accent.strong;
  const name = basics.fullName || config.handle;
  const fn = firstName(basics.fullName || config.handle);

  const gridRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const pos = useRef({ x: 0, y: 0 });
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const [selected, setSelected] = useState<string | null>(null);
  const copyTimer = useRef(0);

  useEffect(() => () => {
    cancelAnimationFrame(raf.current);
    window.clearTimeout(copyTimer.current);
  }, []);

  // Spotlight border glow: only CSS variables change, never React state.
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    pos.current = { x: e.clientX, y: e.clientY };
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      gridRef.current?.querySelectorAll<HTMLElement>(".snb-card").forEach((el) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${pos.current.x - r.left}px`);
        el.style.setProperty("--my", `${pos.current.y - r.top}px`);
      });
    });
  }, []);

  async function copyEmail() {
    window.clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(basics.email);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    copyTimer.current = window.setTimeout(() => setCopied("idle"), 2600);
  }

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    toggleMode();
    onUpdateConfig?.({ themeMode: next });
  };

  const showStats = config.showCodingStats;
  const { leetcode, codechef, codeforces, github } = codingStats;
  const hasCP = showStats && !!(leetcode || codechef || codeforces);
  const hasGh = showStats && !!github;

  const flatSkills = useMemo(() => {
    const seen = new Set<string>();
    const out: { label: string; key: string }[] = [];
    for (const g of SKILL_GROUPS) {
      for (const s of skills[g.key]) {
        const k = norm(s);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        out.push({ label: s, key: k });
      }
    }
    return out;
  }, [skills]);
  const hasSkills = flatSkills.length > 0;

  const orderedProjects = useMemo(() => [...projects].sort((a, b) => Number(b.featured) - Number(a.featured)), [projects]);
  const nonFeatured = orderedProjects.filter((p) => !p.featured);
  const lastLoneId = nonFeatured.length % 2 === 1 ? nonFeatured[nonFeatured.length - 1].id : null;
  const matchCount = selected ? projects.filter((p) => p.techStack.some((t) => norm(t) === selected)).length : 0;
  const selectedLabel = flatSkills.find((s) => s.key === selected)?.label ?? selected ?? "";

  const socials = [
    { label: "GitHub", url: safeHref(basics.socials.github), icon: <FaGithub aria-hidden="true" /> },
    { label: "LinkedIn", url: safeHref(basics.socials.linkedin), icon: <FaLinkedin aria-hidden="true" /> },
    { label: "X / Twitter", url: safeHref(basics.socials.twitter), icon: <FaXTwitter aria-hidden="true" /> },
    { label: "Website", url: safeHref(basics.socials.website), icon: <FaGlobe aria-hidden="true" /> },
  ].filter((s): s is { label: string; url: string; icon: React.ReactElement } => !!s.url);

  const resumeHref = safeHref(basics.resumeUrl);
  const heroSpan = hasCP ? "md:col-span-8" : "md:col-span-12";
  const ghSpan = hasSkills ? "md:col-span-4" : "md:col-span-12";
  const skillSpan = hasGh ? "md:col-span-8" : "md:col-span-12";
  const expSpan = education.length > 0 ? "md:col-span-7" : "md:col-span-12";
  const eduSpan = experience.length > 0 ? "md:col-span-5" : "md:col-span-12";

  const cssVars = {
    "--snb-bg": pal.bg,
    "--snb-card": pal.card,
    "--snb-border": pal.border,
    "--snb-text": pal.text,
    "--snb-muted": pal.muted,
    "--snb-chip": pal.chip,
    "--snb-dot": pal.dot,
    "--snb-shadow": pal.shadow,
    "--snb-accent": acc,
    "--snb-accent-soft": accent.soft,
    "--snb-on-accent": mode === "dark" ? accent.onBase : "#FFFFFF",
  } as React.CSSProperties;

  return (
    <div className="snb-root min-h-full w-full" style={cssVars}>
      <style>{CSS}</style>

      <header className="snb-header">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            <span aria-hidden="true" className="snb-logo">{initials(name)}</span>
            <span className="truncate">{name}</span>
          </span>
          <nav aria-label="Sections" className="hidden items-center gap-1 text-xs font-medium sm:flex">
            {hasCP || hasGh ? <a className="snb-navlink" href="#snb-stats">Stats</a> : null}
            {projects.length > 0 ? <a className="snb-navlink" href="#snb-projects">Projects</a> : null}
            {experience.length > 0 ? <a className="snb-navlink" href="#snb-experience">Experience</a> : null}
            {education.length > 0 ? <a className="snb-navlink" href="#snb-education">Education</a> : null}
          </nav>
          <button type="button" onClick={toggle} className="snb-iconbtn" aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={mode === "light"}>
            {mode === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
        <div ref={gridRef} onPointerMove={onPointerMove} className="grid grid-cols-12 gap-4">
          {/* Cell 1: hero */}
          <section aria-label="Introduction" className={`snb-card col-span-12 ${heroSpan} p-6 sm:p-8`}>
            <div className="relative z-10">
              {basics.availabilityText && (
                <p className="snb-pill mb-5">
                  <span aria-hidden="true" className="snb-pulse" />
                  {basics.availabilityText}
                </p>
              )}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Avatar src={basics.avatarUrl} name={name} size={84} />
                <div className="min-w-0">
                  <h1 className="snb-display text-3xl font-bold leading-[1.08] tracking-tight sm:text-5xl">{name}</h1>
                  {basics.headline && <p className="snb-muted mt-2 text-base sm:text-lg">{basics.headline}</p>}
                </div>
              </div>
              {(basics.shortBio || basics.longBio) && <p className="mt-5 max-w-2xl text-[15px] leading-relaxed">{basics.shortBio || basics.longBio}</p>}
              {basics.location && (
                <p className="snb-muted mt-3 flex items-center gap-1.5 text-sm">
                  <MapPin size={14} aria-hidden="true" /> {basics.location}
                </p>
              )}
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {validEmail(basics.email) && (
                  <button type="button" onClick={copyEmail} className="snb-btn snb-btn-primary">
                    {copied === "ok" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                    {copied === "ok" ? "Copied!" : "Copy Email"}
                  </button>
                )}
                {resumeHref && (
                  <a href={resumeHref} target="_blank" rel="noopener noreferrer" className="snb-btn">
                    <Download size={15} aria-hidden="true" /> Download Resume
                  </a>
                )}
                <ul className="ml-1 flex items-center gap-1">
                  {socials.map((s) => (
                    <li key={s.label}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label} className="snb-iconbtn">
                        {s.icon}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <p role="status" aria-live="polite" className="snb-muted mt-3 min-h-[1.25rem] text-xs">
                {copied === "ok" ? "Email address copied to your clipboard." : copied === "fail" ? `Couldn't copy automatically. My email is ${basics.email}` : ""}
              </p>
            </div>
          </section>

          {/* Cell 2: competitive programming */}
          {hasCP && (
            <section id="snb-stats" aria-label="Competitive programming" className="snb-card col-span-12 p-6 md:col-span-4">
              <div className="relative z-10 space-y-5">
                <h2 className="snb-eyebrow">Competitive programming</h2>
                {leetcode && (
                  <div>
                    <SolveRing easy={leetcode.easySolved} medium={leetcode.mediumSolved} hard={leetcode.hardSolved} total={leetcode.totalSolved} />
                    <p className="mt-2 text-xs">
                      {safeHref(leetcode.profileUrl) ? (
                        <a className="snb-link" href={safeHref(leetcode.profileUrl)} target="_blank" rel="noopener noreferrer">
                          LeetCode @{leetcode.username} <ArrowUpRight size={12} aria-hidden="true" />
                        </a>
                      ) : (
                        <span>LeetCode @{leetcode.username}</span>
                      )}
                      {typeof leetcode.rating === "number" && leetcode.rating > 0 && <span className="snb-muted"> · contest rating {num(Math.round(leetcode.rating))}</span>}
                    </p>
                  </div>
                )}
                <ul className="flex flex-wrap gap-2">
                  {codechef && (
                    <li>
                      <a className="snb-stat" href={safeHref(codechef.profileUrl)} target="_blank" rel="noopener noreferrer" aria-label={`CodeChef ${codechef.username}: ${codechef.stars} ${codechef.rating > 0 ? `rating ${codechef.rating}` : ""}`}>
                        <span className="snb-muted text-[11px]">CodeChef</span>
                        <b>{[codechef.stars, codechef.rating > 0 ? num(codechef.rating) : ""].filter(Boolean).join(" ") || "-"}</b>
                        {codechef.maxRating > 0 && <span className="snb-muted text-[11px]">max {num(codechef.maxRating)}</span>}
                      </a>
                    </li>
                  )}
                  {codeforces && (
                    <li>
                      <a className="snb-stat" href={safeHref(codeforces.profileUrl)} target="_blank" rel="noopener noreferrer" aria-label={`Codeforces ${codeforces.username}: ${codeforces.rank} ${codeforces.rating > 0 ? `rating ${codeforces.rating}` : ""}`}>
                        <span className="snb-muted text-[11px]">Codeforces</span>
                        <b>{[codeforces.rank, codeforces.rating > 0 ? num(codeforces.rating) : ""].filter(Boolean).join(" ") || "-"}</b>
                        {codeforces.maxRating > 0 && <span className="snb-muted text-[11px]">max {num(codeforces.maxRating)}</span>}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </section>
          )}

          {/* Cell 3: GitHub pulse */}
          {hasGh && github && (
            <section aria-label="GitHub activity" className={`snb-card col-span-12 ${ghSpan} p-6`}>
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="snb-eyebrow">GitHub pulse</h2>
                  {safeHref(github.profileUrl) && (
                    <a className="snb-link text-xs" href={safeHref(github.profileUrl)} target="_blank" rel="noopener noreferrer">
                      @{github.username} <ArrowUpRight size={12} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Repos", github.publicRepos],
                    ["Stars", github.totalStars],
                    ["Followers", github.followers],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="snb-tile">
                      <dd className="text-xl font-bold tabular-nums">{num(value as number)}</dd>
                      <dt className="snb-muted text-[11px]">{label}</dt>
                    </div>
                  ))}
                </dl>
                {github.topLanguages.length > 0 && (
                  <div className="mt-4">
                    <div className="flex h-2 overflow-hidden rounded-full" role="img" aria-label={`Top languages: ${github.topLanguages.join(", ")}`}>
                      {github.topLanguages.map((l, i) => (
                        <span key={l} className="h-full flex-1" style={{ background: "var(--snb-accent)", opacity: LANG_SHADES[Math.min(i, LANG_SHADES.length - 1)] }} />
                      ))}
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      {github.topLanguages.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                    <p className="snb-muted mt-1.5 text-[11px]">Most-used languages across public repos. Bar segments are equal-sized, not a usage share.</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Cell 4: skills filter */}
          {hasSkills && (
            <section aria-label="Tech stack" className={`snb-card col-span-12 ${skillSpan} p-6`}>
              <div className="relative z-10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="snb-eyebrow">Tech stack</h2>
                  <p role="status" aria-live="polite" className="snb-muted text-xs">
                    {selected ? (
                      <>
                        {matchCount} project{matchCount === 1 ? "" : "s"} use {selectedLabel}{" "}
                        <button type="button" className="snb-link inline-flex items-center gap-0.5 underline" onClick={() => setSelected(null)}>
                          <X size={11} aria-hidden="true" /> clear
                        </button>
                      </>
                    ) : projects.length > 0 ? (
                      "Select a skill to highlight matching projects."
                    ) : (
                      ""
                    )}
                  </p>
                </div>
                <div className="snb-marquee mt-4" data-count={flatSkills.length}>
                  <div className="snb-track">
                    {[0, 1].map((copy) => (
                      <ul key={copy} className="snb-row" aria-hidden={copy === 1 ? true : undefined}>
                        {flatSkills.map((s) => (
                          <li key={s.key}>
                            <button type="button" tabIndex={copy === 1 ? -1 : 0} aria-pressed={selected === s.key} onClick={() => setSelected((cur) => (cur === s.key ? null : s.key))} className="snb-skill">
                              {s.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </div>
                <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {SKILL_GROUPS.filter((g) => skills[g.key].length > 0).map((g) => (
                    <div key={g.key} className="text-xs">
                      <dt className="snb-eyebrow !mb-0.5 !text-[10px]">{g.label}</dt>
                      <dd className="snb-muted">{skills[g.key].join(", ")}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          )}

          {/* Projects */}
          {orderedProjects.length > 0 && (
            <>
              <h2 id="snb-projects" className="col-span-12 mt-6 scroll-mt-20 text-2xl font-bold tracking-tight">
                Projects
              </h2>
              {orderedProjects.map((p) => {
                const span = p.featured || p.id === lastLoneId ? "md:col-span-12" : "md:col-span-6";
                const match = selected ? p.techStack.some((t) => norm(t) === selected) : false;
                const dim = selected && !match;
                const src = safeHref(p.githubUrl);
                const live = safeHref(p.liveUrl);
                const wide = p.featured || p.id === lastLoneId;
                return (
                  <article key={p.id} className={`snb-card snb-project col-span-12 ${span} p-4 sm:p-5 ${match ? "snb-match" : ""} ${dim ? "snb-dim" : ""}`}>
                    <div className={`relative z-10 gap-5 ${wide ? "md:grid md:grid-cols-2 md:items-center" : "flex flex-col"}`}>
                      <Shot key={p.imageUrl ?? p.id} src={p.imageUrl} project={p} />
                      <div className={`min-w-0 ${wide ? "mt-4 md:mt-0" : "mt-4"}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          {p.featured && <span className="snb-badge">Featured</span>}
                          {p.year && <span className="snb-muted text-xs">{p.year}</span>}
                        </div>
                        <h3 className="mt-1 text-xl font-semibold leading-snug">{p.title}</h3>
                        {p.tagline && <p className="snb-muted mt-1 text-sm">{p.tagline}</p>}
                        {p.description && <p className="mt-3 text-sm leading-relaxed">{p.description}</p>}
                        {p.metrics && <p className="snb-metric mt-3">{p.metrics}</p>}
                        {p.techStack.length > 0 && (
                          <ul className="mt-3 flex flex-wrap gap-1.5">
                            {p.techStack.map((t) => (
                              <li key={t}>
                                <button type="button" className="snb-tag" aria-pressed={selected === norm(t)} onClick={() => setSelected((cur) => (cur === norm(t) ? null : norm(t)))}>
                                  {t}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {(src || live) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {live && (
                              <a href={live} target="_blank" rel="noopener noreferrer" className="snb-btn snb-btn-primary snb-magnet">
                                Live demo <ArrowUpRight size={14} aria-hidden="true" />
                              </a>
                            )}
                            {src && (
                              <a href={src} target="_blank" rel="noopener noreferrer" className="snb-btn snb-magnet">
                                <FaGithub aria-hidden="true" /> Source
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </>
          )}

          {/* Experience & education */}
          {experience.length > 0 && (
            <section id="snb-experience" aria-label="Experience" className={`snb-card col-span-12 ${expSpan} scroll-mt-20 p-6`}>
              <div className="relative z-10">
                <h2 className="snb-eyebrow flex items-center gap-1.5">
                  <Briefcase size={13} aria-hidden="true" /> Experience
                </h2>
                <ol className="snb-timeline mt-4 space-y-6">
                  {experience.map((e) => (
                    <li key={e.id} className="snb-node">
                      <p className="snb-muted text-xs">{dateRange(e.startDate, e.endDate)}</p>
                      <h3 className="mt-0.5 font-semibold leading-snug">
                        {e.role}
                        {e.company && (
                          <>
                            {" "}
                            <span className="snb-muted font-normal">at</span>{" "}
                            {safeHref(e.companyUrl) ? (
                              <a className="snb-link" href={safeHref(e.companyUrl)} target="_blank" rel="noopener noreferrer">
                                {e.company}
                              </a>
                            ) : (
                              e.company
                            )}
                          </>
                        )}
                      </h3>
                      {e.location && <p className="snb-muted text-xs">{e.location}</p>}
                      {e.descriptionBullets.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed">
                          {e.descriptionBullets.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      )}
                      {e.techUsed.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {e.techUsed.map((t) => (
                            <li key={t} className="snb-tag snb-tag-static">
                              {t}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {education.length > 0 && (
            <section id="snb-education" aria-label="Education" className={`snb-card col-span-12 ${eduSpan} scroll-mt-20 p-6`}>
              <div className="relative z-10">
                <h2 className="snb-eyebrow flex items-center gap-1.5">
                  <GraduationCap size={13} aria-hidden="true" /> Education
                </h2>
                <ol className="snb-timeline mt-4 space-y-6">
                  {education.map((ed) => (
                    <li key={ed.id} className="snb-node">
                      <p className="snb-muted text-xs">{dateRange(ed.startYear, ed.endYear)}</p>
                      <h3 className="mt-0.5 font-semibold leading-snug">{ed.degree}</h3>
                      <p className="text-sm">{[ed.institution, ed.location].filter(Boolean).join(", ")}</p>
                      {ed.score && <p className="snb-metric mt-2">{ed.score}</p>}
                      {ed.highlights && ed.highlights.length > 0 && (
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-relaxed">
                          {ed.highlights.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          )}

          {achievements.length > 0 && (
            <section aria-label="Achievements" className="snb-card col-span-12 p-6">
              <div className="relative z-10">
                <h2 className="snb-eyebrow flex items-center gap-1.5">
                  <Trophy size={13} aria-hidden="true" /> Achievements
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.map((a) => (
                    <li key={a.id} className="snb-tile text-left">
                      <p className="font-semibold leading-snug">{a.title}</p>
                      <p className="snb-muted text-xs">{[a.issuer, a.date].filter(Boolean).join(" · ")}</p>
                      {a.description && <p className="mt-1.5 text-sm leading-relaxed">{a.description}</p>}
                      {safeHref(a.proofUrl) && (
                        <a className="snb-link mt-2 inline-flex items-center gap-1 text-xs" href={safeHref(a.proofUrl)} target="_blank" rel="noopener noreferrer">
                          View proof <ArrowUpRight size={12} aria-hidden="true" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* Contact */}
          <section aria-label="Contact" className="snb-card col-span-12 p-6 text-center sm:p-10">
            <div className="relative z-10">
              <h2 className="snb-display text-2xl font-bold sm:text-3xl">Get in touch{fn ? `, say hi to ${fn}` : ""}</h2>
              {basics.availabilityText && <p className="snb-muted mx-auto mt-2 max-w-md text-sm">{basics.availabilityText}</p>}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                {validEmail(basics.email) && (
                  <a href={`mailto:${basics.email}`} className="snb-btn snb-btn-primary">
                    {basics.email}
                  </a>
                )}
                {socials.map((s) => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="snb-btn">
                    {s.icon} {s.label}
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <MascotWidget data={data} themeMode={mode} />
    </div>
  );
}

/* ───────── styles (scoped by the snb- prefix) ───────── */

const CSS = `
.snb-root{position:relative;background-color:var(--snb-bg);color:var(--snb-text);background-image:radial-gradient(var(--snb-dot) 1px,transparent 1px);background-size:22px 22px;font-family:var(--font-inter),ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;transition:background-color .3s ease,color .3s ease}
.snb-root *{box-sizing:border-box}
.snb-header{position:sticky;top:0;z-index:30;background:color-mix(in srgb,var(--snb-bg) 82%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--snb-border)}
.snb-logo{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:8px;background:var(--snb-accent);color:var(--snb-on-accent);font-size:11px;font-weight:700}
.snb-navlink{padding:6px 10px;border-radius:8px;color:var(--snb-muted);transition:color .2s,background .2s}
.snb-navlink:hover{color:var(--snb-text);background:var(--snb-chip)}
.snb-card{position:relative;border-radius:20px;background:var(--snb-card);border:1px solid var(--snb-border);box-shadow:var(--snb-shadow);transition:transform .25s ease,opacity .25s ease,box-shadow .25s ease;overflow:hidden}
.snb-card::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:radial-gradient(320px circle at var(--mx,50%) var(--my,0%),var(--snb-accent),transparent 62%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);opacity:0;transition:opacity .3s ease;pointer-events:none;z-index:1}
.snb-card::after{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),var(--snb-accent-soft),transparent 60%);opacity:0;transition:opacity .3s ease;pointer-events:none}
.snb-card:hover::before,.snb-card:hover::after,.snb-card:focus-within::before{opacity:1}
.snb-muted{color:var(--snb-muted)}
.snb-eyebrow{margin-bottom:.25rem;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--snb-muted)}
.snb-display{background:linear-gradient(120deg,var(--snb-text) 30%,var(--snb-accent));-webkit-background-clip:text;background-clip:text;color:transparent}
.snb-pill{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:600;color:var(--snb-accent);background:var(--snb-accent-soft);border:1px solid color-mix(in srgb,var(--snb-accent) 35%,transparent)}
.snb-pulse{width:7px;height:7px;border-radius:999px;background:var(--snb-accent);box-shadow:0 0 0 0 var(--snb-accent);animation:snb-pulse 2s infinite}
@keyframes snb-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--snb-accent) 60%,transparent)}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}
.snb-avatar,.snb-avatar-img{flex-shrink:0;border-radius:22px}
.snb-avatar{display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--snb-accent),color-mix(in srgb,var(--snb-accent) 40%,var(--snb-card)));color:var(--snb-on-accent);font-weight:700}
.snb-avatar-img{object-fit:cover;border:1px solid var(--snb-border)}
.snb-btn{display:inline-flex;align-items:center;gap:7px;border-radius:12px;padding:9px 15px;font-size:13px;font-weight:600;color:var(--snb-text);background:var(--snb-chip);border:1px solid var(--snb-border);cursor:pointer;transition:transform .18s ease,background .2s,border-color .2s}
.snb-btn:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--snb-accent) 55%,var(--snb-border))}
.snb-btn:active{transform:translateY(0) scale(.98)}
.snb-btn-primary{background:var(--snb-accent);color:var(--snb-on-accent);border-color:transparent}
.snb-btn-primary:hover{filter:brightness(1.08)}
.snb-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;color:var(--snb-muted);background:transparent;border:1px solid transparent;cursor:pointer;transition:color .2s,background .2s,border-color .2s}
.snb-iconbtn:hover{color:var(--snb-text);background:var(--snb-chip);border-color:var(--snb-border)}
.snb-link{color:var(--snb-accent);font-weight:600;display:inline-flex;align-items:center;gap:2px}
.snb-link:hover{text-decoration:underline}
.snb-stat{display:flex;flex-direction:column;gap:1px;min-width:112px;border-radius:12px;padding:8px 12px;background:var(--snb-chip);border:1px solid var(--snb-border);font-size:14px;transition:border-color .2s,transform .2s}
.snb-stat:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--snb-accent) 55%,var(--snb-border))}
.snb-tile{border-radius:14px;padding:12px;background:var(--snb-chip);border:1px solid var(--snb-border)}
.snb-badge{border-radius:999px;padding:2px 9px;font-size:11px;font-weight:700;color:var(--snb-accent);background:var(--snb-accent-soft)}
.snb-metric{display:inline-block;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600;color:var(--snb-accent);background:var(--snb-accent-soft)}
.snb-tag{border-radius:8px;padding:3px 9px;font-size:12px;color:var(--snb-text);background:var(--snb-chip);border:1px solid var(--snb-border);cursor:pointer;transition:border-color .2s,background .2s}
.snb-tag:hover,.snb-tag[aria-pressed="true"]{border-color:var(--snb-accent);background:var(--snb-accent-soft)}
.snb-tag-static{cursor:default}
.snb-tag-static:hover{border-color:var(--snb-border);background:var(--snb-chip)}
.snb-skill{border-radius:999px;padding:6px 14px;font-size:13px;white-space:nowrap;color:var(--snb-text);background:var(--snb-chip);border:1px solid var(--snb-border);cursor:pointer;transition:border-color .2s,background .2s,transform .2s}
.snb-skill:hover{transform:translateY(-1px)}
.snb-skill:hover,.snb-skill[aria-pressed="true"]{border-color:var(--snb-accent);background:var(--snb-accent-soft);color:var(--snb-text)}
.snb-marquee{overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.snb-track{display:flex;width:max-content;animation:snb-scroll 38s linear infinite}
.snb-marquee:hover .snb-track,.snb-marquee:focus-within .snb-track{animation-play-state:paused}
.snb-row{display:flex;gap:8px;padding-right:8px;list-style:none;margin:0}
@keyframes snb-scroll{to{transform:translateX(-50%)}}
.snb-project.snb-match{box-shadow:0 0 0 1.5px var(--snb-accent),0 0 32px -8px var(--snb-accent)}
.snb-project.snb-dim{opacity:.42}
.snb-frame{border-radius:14px;overflow:hidden;border:1px solid var(--snb-border);background:var(--snb-chip)}
.snb-frame-bar{display:flex;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--snb-border);font-size:11px;color:var(--snb-muted)}
.snb-frame-bar i{width:9px;height:9px;border-radius:999px;background:var(--snb-border);display:inline-block}
.snb-frame-bar span{margin-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.snb-frame-body{aspect-ratio:16/9;overflow:hidden;position:relative}
.snb-shot{width:100%;height:100%;object-fit:cover;object-position:top;transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.snb-project:hover .snb-shot{transform:scale(1.045)}
.snb-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,var(--snb-accent-soft),transparent 70%),var(--snb-chip)}
.snb-fallback-letter{font-size:44px;font-weight:800;color:var(--snb-accent)}
.snb-fallback-tech{font-size:12px;color:var(--snb-muted)}
.snb-magnet{transition:transform .2s cubic-bezier(.2,.9,.3,1.4)}
.snb-magnet:hover{transform:translateY(-2px) scale(1.03)}
.snb-timeline{position:relative;margin-left:5px;border-left:1px solid var(--snb-border);padding-left:20px;list-style:none}
.snb-node{position:relative}
.snb-node::before{content:"";position:absolute;left:-26px;top:5px;width:11px;height:11px;border-radius:999px;background:var(--snb-card);border:2px solid var(--snb-accent)}
.snb-ring circle{transition:stroke-dasharray .6s ease}
.snb-root a:focus-visible,.snb-root button:focus-visible{outline:2px solid var(--snb-accent);outline-offset:2px}
@media (prefers-reduced-motion:reduce){
  .snb-root *,.snb-root *::before,.snb-root *::after{animation:none!important;transition:none!important}
  .snb-track{width:auto;flex-wrap:wrap}
  .snb-row{flex-wrap:wrap}
  .snb-row[aria-hidden="true"]{display:none}
  .snb-marquee{-webkit-mask-image:none;mask-image:none}
}
@media (max-width:640px){.snb-track{animation-duration:30s}}
`;
