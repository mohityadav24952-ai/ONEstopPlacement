"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowUpRight, BrainCircuit, Briefcase, Cpu, FileText, GraduationCap, Layers, Mail, Star, Trophy, Wrench } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { SiCodechef, SiCodeforces, SiLeetcode } from "react-icons/si";
import type { PortfolioData, PortfolioProject, TemplateProps } from "@/types/portfolio";
import { accentFor } from "../lib/accent";
import { firstName, initials, projectImage, safeHref } from "../lib/links";
import { MascotWidget } from "../mascots/MascotWidget";

/*
 * "Neon 3D Dev": deep black, oversized uppercase type, neon purple/pink holographic accents,
 * an infinite tech marquee, CSS-only 3D floating shapes and a glowing cursor trail.
 * Everything shown comes from the portfolio data; sections without data are left out.
 */

/* ───────── helpers ───────── */

const num = (n: number | undefined | null): string => (typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "-");
const validEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+$/.test(e);
const dateRange = (a: string, b: string): string => [a, b].filter(Boolean).join(" - ");
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (list: string[], s: string): boolean => list.some((k) => s.toLowerCase().includes(k));

// Words highlighted in the About text when they appear there (plus every skill the owner listed).
const KEYWORDS = [
  "high-performance", "scalable", "system design", "full-stack", "full stack", "distributed systems", "competitive programming",
  "data structures", "algorithms", "dsa", "codeforces", "leetcode", "codechef", "machine learning", "open source", "real-time",
];

// The data has five skill buckets; the spec's rows split them further by name.
const FRONTEND = ["react", "next", "vue", "angular", "svelte", "tailwind", "html", "css", "redux", "bootstrap", "sass", "jquery", "three", "framer", "vite", "remix", "astro", "flutter", "react native"];
const DEVOPS = ["docker", "kubernetes", "k8s", "aws", "gcp", "google cloud", "azure", "ci/cd", "jenkins", "terraform", "vercel", "netlify", "github actions", "nginx", "linux", "ansible", "heroku", "render", "cloudflare"];

type SkillRow = { label: string; items: string[] };

function skillRows(s: PortfolioData["skills"]): SkillRow[] {
  const frontend = s.frameworks.filter((x) => has(FRONTEND, x));
  const backend = s.frameworks.filter((x) => !has(FRONTEND, x));
  const devops = [...s.databasesAndCloud, ...s.coreCsAndTools].filter((x) => has(DEVOPS, x));
  const databases = s.databasesAndCloud.filter((x) => !has(DEVOPS, x));
  const core = s.coreCsAndTools.filter((x) => !has(DEVOPS, x));
  return [
    { label: "Languages", items: s.languages },
    { label: "Frontend", items: frontend },
    { label: "Backend", items: backend },
    { label: "Databases", items: databases },
    { label: "DevOps", items: devops },
    { label: "AI & ML", items: s.aiAndMl },
    { label: "Core CS", items: core },
  ].filter((r) => r.items.length > 0);
}

/** Bio text with keywords wrapped in a bright span, the rest dimmed. */
function Highlighted({ text, words }: { text: string; words: string[] }) {
  const parts = useMemo(() => {
    const list = [...new Set(words.map((w) => w.trim()).filter((w) => w.length > 1))].sort((a, b) => b.length - a.length).slice(0, 120);
    if (list.length === 0) return [text];
    const re = new RegExp(`(?<![A-Za-z0-9])(${list.map(escapeRe).join("|")})(?![A-Za-z0-9])`, "gi");
    return text.split(re);
  }, [text, words]);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <strong key={i} className="n3d-hl">{p}</strong> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

/* ───────── effects ───────── */

/** A glowing dot plus a trailing iridescent ring. Fine pointers only, off for reduced motion.
 * Positions are written straight to the DOM (no React state per frame). The native cursor stays. */
function NeonCursor({ rootRef }: { rootRef: React.RefObject<HTMLDivElement | null> }) {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = { x: -100, y: -100 };
    const trail = { x: -100, y: -100 };
    let frame = 0;
    let shown = false;
    const tick = () => {
      trail.x += (target.x - trail.x) * 0.18;
      trail.y += (target.y - trail.y) * 0.18;
      if (dot.current) dot.current.style.transform = `translate3d(${target.x}px,${target.y}px,0)`;
      if (ring.current) ring.current.style.transform = `translate3d(${trail.x}px,${trail.y}px,0)`;
      frame = Math.abs(target.x - trail.x) + Math.abs(target.y - trail.y) > 0.3 ? requestAnimationFrame(tick) : 0;
    };
    const show = (on: boolean) => {
      shown = on;
      dot.current?.classList.toggle("is-on", on);
      ring.current?.classList.toggle("is-on", on);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!shown) {
        trail.x = target.x;
        trail.y = target.y;
        show(true);
      }
      ring.current?.classList.toggle("is-hover", !!(e.target as Element | null)?.closest?.("a,button"));
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const leave = () => show(false);
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerleave", leave);
    return () => {
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, [rootRef]);
  return (
    <>
      <div ref={ring} aria-hidden="true" className="n3d-cursor-ring" />
      <div ref={dot} aria-hidden="true" className="n3d-cursor-dot" />
    </>
  );
}

/** Decorative CSS-3D shapes: a moon, a building block, a spinning cube and a holographic torus. */
function FloatingShapes({ set }: { set: "hero" | "about" }) {
  if (set === "hero") {
    return (
      <div aria-hidden="true" className="n3d-shapes">
        <span className="n3d-moon" style={{ top: "12%", left: "6%" }} />
        <span className="n3d-cube-wrap" style={{ bottom: "16%", right: "8%" }}>
          <span className="n3d-cube">{["f", "b", "l", "r", "t", "d"].map((s) => <i key={s} className={`n3d-face n3d-${s}`} />)}</span>
        </span>
        <span className="n3d-torus" style={{ top: "18%", right: "14%" }} />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="n3d-shapes">
      <span className="n3d-brick" style={{ top: "10%", right: "6%" }}><i /><i /><i /><i /></span>
      <span className="n3d-torus n3d-torus-sm" style={{ bottom: "12%", left: "4%" }} />
    </div>
  );
}

/* ───────── small pieces ───────── */

function HoloAvatar({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const href = safeHref(src);
  return (
    <div className="n3d-avatar">
      <span aria-hidden="true" className="n3d-avatar-halo" />
      {href && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={href} alt={`${name || "Portfolio owner"} portrait`} onError={() => setFailed(true)} className="n3d-avatar-img" />
      ) : (
        <span aria-hidden="true" className="n3d-orb">{initials(name)}</span>
      )}
    </div>
  );
}

function ProjectTile({ p }: { p: PortfolioProject }) {
  const [failed, setFailed] = useState(false);
  const src = projectImage(p); // a real picture only; otherwise the neon cover below
  const repo = safeHref(p.githubUrl);
  const live = safeHref(p.liveUrl);
  return (
    <article className="n3d-project" tabIndex={repo || live ? undefined : 0} aria-label={repo || live ? undefined : p.title}>
      <div className="n3d-thumb">
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={`Preview of ${p.title || "project"}`} loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <div className="n3d-thumb-fallback" aria-hidden="true">
            <span className="n3d-thumb-letter">{(p.title || "?").charAt(0).toUpperCase()}</span>
            {p.techStack.length > 0 && <span className="n3d-thumb-tech">{p.techStack.slice(0, 3).join(" · ")}</span>}
          </div>
        )}
        <div className="n3d-overlay">
          {p.description && <p className="n3d-overlay-desc">{p.description}</p>}
          {p.techStack.length > 0 && (
            <ul className="n3d-overlay-tech" aria-label="Tech stack">
              {p.techStack.slice(0, 8).map((t) => <li key={t}>{t}</li>)}
            </ul>
          )}
          {(repo || live) && (
            <div className="n3d-overlay-links">
              {live && <a href={live} target="_blank" rel="noopener noreferrer" className="n3d-mini">Live <ArrowUpRight size={13} aria-hidden="true" /><span className="sr-only"> demo of {p.title}</span></a>}
              {repo && <a href={repo} target="_blank" rel="noopener noreferrer" className="n3d-mini"><FaGithub aria-hidden="true" /> Code<span className="sr-only"> of {p.title}</span></a>}
            </div>
          )}
        </div>
      </div>
      <div className="n3d-project-meta">
        <h3>{p.title}</h3>
        {p.tagline && <p>{p.tagline}</p>}
      </div>
    </article>
  );
}

type StatCard = { key: string; icon: ReactNode; metric: string; sub: string; detail?: string; href?: string };

/* ───────── template ───────── */

export function Neon3DDevTemplate({ data }: TemplateProps) {
  const { config, basics, codingStats, skills, projects, experience, education, achievements } = data;
  const rootRef = useRef<HTMLDivElement>(null);
  const accent = accentFor(config.accentColor);
  const name = basics.fullName || config.handle;
  const first = firstName(basics.fullName || config.handle);
  const email = validEmail(basics.email) ? basics.email : "";
  const resume = safeHref(basics.resumeUrl);
  const github = safeHref(basics.socials.github);
  const linkedin = safeHref(basics.socials.linkedin);
  const showStats = config.showCodingStats;
  const { leetcode, codechef, codeforces, github: gh } = codingStats;

  const allSkills = useMemo(() => {
    const seen = new Set<string>();
    return [...skills.languages, ...skills.frameworks, ...skills.databasesAndCloud, ...skills.aiAndMl, ...skills.coreCsAndTools].filter((s) => {
      const k = s.toLowerCase().trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [skills]);
  const rows = useMemo(() => skillRows(skills), [skills]);

  // "SOFTWARE ENGINEER • SPECIALIST @CODEFORCES • 460 DSA": headline plus live CP stats.
  const subline = [
    basics.headline,
    showStats && codeforces?.rank ? `${codeforces.rank} @Codeforces` : "",
    showStats && codechef?.stars ? `${codechef.stars} @CodeChef` : "",
    showStats && leetcode && leetcode.totalSolved > 0 ? `${num(leetcode.totalSolved)} DSA problems` : "",
  ].filter(Boolean);

  const stats: StatCard[] = [];
  if (showStats && leetcode) {
    stats.push({ key: "lc", icon: <SiLeetcode />, metric: `${num(leetcode.totalSolved)} Problems`, sub: "Solved on LeetCode", detail: `${num(leetcode.easySolved)} easy · ${num(leetcode.mediumSolved)} medium · ${num(leetcode.hardSolved)} hard`, href: safeHref(leetcode.profileUrl) });
    if (typeof leetcode.rating === "number" && leetcode.rating > 0) {
      stats.push({ key: "lcr", icon: <SiLeetcode />, metric: `${num(Math.round(leetcode.rating))} Rating`, sub: "LeetCode contests", detail: typeof leetcode.topPercentage === "number" ? `Top ${leetcode.topPercentage}%` : undefined, href: safeHref(leetcode.profileUrl) });
    }
  }
  if (showStats && codeforces) {
    stats.push({ key: "cf", icon: <SiCodeforces />, metric: `${codeforces.rating > 0 ? num(codeforces.rating) : "-"} Rating`, sub: `Codeforces${codeforces.rank ? ` · ${codeforces.rank}` : ""}`, detail: codeforces.maxRating > 0 ? `Max ${num(codeforces.maxRating)}` : undefined, href: safeHref(codeforces.profileUrl) });
  }
  if (showStats && codechef) {
    stats.push({ key: "cc", icon: <SiCodechef />, metric: `${[codechef.stars, codechef.rating > 0 ? num(codechef.rating) : ""].filter(Boolean).join(" ") || "-"}`, sub: "CodeChef rating", detail: codechef.maxRating > 0 ? `Max ${num(codechef.maxRating)}` : undefined, href: safeHref(codechef.profileUrl) });
  }
  if (showStats && gh) {
    stats.push({ key: "gh", icon: <FaGithub />, metric: `${num(gh.publicRepos)} Repos`, sub: "Public on GitHub", detail: `${num(gh.totalStars)} stars · ${num(gh.followers)} followers`, href: safeHref(gh.profileUrl) });
  }
  for (const a of achievements) {
    stats.push({ key: a.id, icon: <Trophy />, metric: a.title, sub: [a.issuer, a.date].filter(Boolean).join(" · "), detail: a.description || undefined, href: safeHref(a.proofUrl) });
  }

  const services = [
    { title: "Full-Stack Development", icon: <Layers />, items: [...skills.frameworks, ...skills.databasesAndCloud] },
    { title: "DSA & Problem Solving", icon: <Cpu />, items: [...(showStats && leetcode ? [`${num(leetcode.totalSolved)} LeetCode problems`] : []), ...(showStats && codeforces?.rank ? [`Codeforces ${codeforces.rank}`] : []), ...skills.languages] },
    { title: "AI & Machine Learning", icon: <BrainCircuit />, items: skills.aiAndMl },
    { title: "Core CS & Tools", icon: <Wrench />, items: skills.coreCsAndTools },
  ].filter((s) => s.items.length > 0);

  const bio = basics.longBio || basics.shortBio;
  const hasAbout = !!bio || services.length > 0;

  const nav = [
    { id: "n3d-about", label: "About", show: hasAbout },
    { id: "n3d-education", label: "Education", show: education.length > 0 },
    { id: "n3d-skills", label: "Skills", show: rows.length > 0 },
    { id: "n3d-projects", label: "Projects", show: projects.length > 0 },
    { id: "n3d-stats", label: "CP Stats", show: stats.length > 0 },
    { id: "n3d-contact", label: "Contact", show: true },
  ].filter((n) => n.show);

  const cssVars = { "--n3d-accent": accent.base } as React.CSSProperties;

  return (
    <div ref={rootRef} className="n3d-root min-h-full w-full" style={cssVars}>
      <style>{CSS}</style>
      <NeonCursor rootRef={rootRef} />

      <header className="n3d-header">
        <div className="n3d-wrap flex items-center justify-between gap-3 py-3">
          <a href="#n3d-top" className="n3d-logo">{initials(name)}<span className="sr-only"> {name}, back to top</span></a>
          <nav aria-label="Sections" className="hidden items-center gap-5 lg:flex">
            {nav.map((n) => <a key={n.id} href={`#${n.id}`} className="n3d-navlink">{n.label}</a>)}
          </nav>
          {basics.availabilityText ? (
            <p className="n3d-available" title={basics.availabilityText}>
              <span aria-hidden="true" className="n3d-live" />
              <span className="truncate">{basics.availabilityText}</span>
            </p>
          ) : <span />}
        </div>
      </header>

      <main id="n3d-top">
        {/* Hero */}
        <section aria-label="Introduction" className="n3d-hero">
          <FloatingShapes set="hero" />
          <div className="n3d-wrap relative z-10 grid items-center gap-10 py-16 md:grid-cols-[1.35fr_1fr] md:py-24">
            <div className="min-w-0">
              <h1 className="n3d-display">
                Hi, I&apos;m <span className="n3d-holo-text">{first}</span>
              </h1>
              {basics.fullName && first !== basics.fullName && <p className="n3d-fullname">{basics.fullName}</p>}
              {subline.length > 0 && (
                <p className="n3d-subline">
                  {/* The bullet sticks to the end of the item before it, so a wrapped line never starts with one. */}
                  {subline.map((s, i) => (
                    <span key={s}>
                      {s}
                      {i < subline.length - 1 && <span aria-hidden="true" className="n3d-sep">{"  •"}</span>}
                    </span>
                  ))}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href={email ? `mailto:${email}` : "#n3d-contact"} className="n3d-cta">
                  <span>Contact me</span>
                </a>
                {resume && (
                  <a href={resume} target="_blank" rel="noopener noreferrer" className="n3d-btn">
                    <FileText size={15} aria-hidden="true" /> Resume
                  </a>
                )}
                <ul className="flex items-center gap-1">
                  {github && <li><a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="n3d-icon"><FaGithub aria-hidden="true" /></a></li>}
                  {linkedin && <li><a href={linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="n3d-icon"><FaLinkedin aria-hidden="true" /></a></li>}
                  {email && <li><a href={`mailto:${email}`} aria-label="Email" className="n3d-icon"><Mail size={17} aria-hidden="true" /></a></li>}
                </ul>
              </div>
            </div>
            <div className="flex justify-center md:justify-end">
              <HoloAvatar src={basics.avatarUrl} name={name} />
            </div>
          </div>
        </section>

        {/* Infinite tech marquee */}
        {allSkills.length > 0 && (
          <div className="n3d-marquee" role="region" aria-label="Tech stack">
            <div className="n3d-track">
              {[0, 1].map((copy) => (
                <ul key={copy} className="n3d-row" aria-hidden={copy === 1 ? true : undefined}>
                  {allSkills.map((s) => (
                    <li key={s}>
                      <span>{s}</span>
                      <span aria-hidden="true" className="n3d-star">✦</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        )}

        {/* About & what I do */}
        {hasAbout && (
          <section id="n3d-about" aria-labelledby="n3d-about-h" className="n3d-section n3d-about">
            <FloatingShapes set="about" />
            <div className="n3d-wrap relative z-10">
              <h2 id="n3d-about-h" className="n3d-h2">About me</h2>
              {bio && (
                <p className="n3d-bio">
                  <Highlighted text={bio} words={[...KEYWORDS, ...allSkills]} />
                </p>
              )}
              {services.length > 0 && (
                <>
                  <h3 className="n3d-h3 mt-16">What I do</h3>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {services.map((s) => (
                      <li key={s.title} className="n3d-card n3d-service">
                        <span aria-hidden="true" className="n3d-glyph">{s.icon}</span>
                        <div className="min-w-0">
                          <h4>{s.title}</h4>
                          <p>{[...new Set(s.items)].slice(0, 8).join(" · ")}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </section>
        )}

        {/* Achievements & CP stats */}
        {stats.length > 0 && (
          <section id="n3d-stats" aria-labelledby="n3d-stats-h" className="n3d-section">
            <div className="n3d-wrap">
              <h2 id="n3d-stats-h" className="n3d-h2">Achievements <span className="n3d-amp">&amp;</span> CP stats</h2>
              <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {stats.map((s) => {
                  const body = (
                    <>
                      <span aria-hidden="true" className="n3d-stat-icon">{s.icon}</span>
                      <p className="n3d-metric">{s.metric}</p>
                      {s.sub && <p className="n3d-stat-sub">{s.sub}</p>}
                      {s.detail && <p className="n3d-stat-detail">{s.detail}</p>}
                    </>
                  );
                  return (
                    <li key={s.key} className="n3d-card n3d-stat">
                      {s.href ? (
                        <a href={s.href} target="_blank" rel="noopener noreferrer" className="n3d-stat-link">
                          {body}
                          <ArrowUpRight size={14} aria-hidden="true" className="n3d-stat-arrow" />
                        </a>
                      ) : <div className="n3d-stat-link">{body}</div>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <section id="n3d-projects" aria-labelledby="n3d-projects-h" className="n3d-section">
            <div className="n3d-wrap">
              <h2 id="n3d-projects-h" className="n3d-h2">Projects</h2>
              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[...projects].sort((a, b) => Number(b.featured) - Number(a.featured)).map((p) => <ProjectTile key={p.id} p={p} />)}
              </div>
            </div>
          </section>
        )}

        {/* Experience (kept so no imported data is hidden) */}
        {experience.length > 0 && (
          <section id="n3d-experience" aria-labelledby="n3d-exp-h" className="n3d-section">
            <div className="n3d-wrap">
              <h2 id="n3d-exp-h" className="n3d-h2">Experience</h2>
              <ol className="n3d-timeline mt-10">
                {experience.map((e) => (
                  <li key={e.id} className="n3d-node">
                    <p className="n3d-when">{dateRange(e.startDate, e.endDate)}</p>
                    <h3 className="n3d-node-title"><Briefcase size={16} aria-hidden="true" /> {e.role}{e.company ? <span className="n3d-dim"> @ {e.company}</span> : null}</h3>
                    {e.location && <p className="n3d-dim text-sm">{e.location}</p>}
                    {e.descriptionBullets.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-300">
                        {e.descriptionBullets.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                    {e.techUsed.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">{e.techUsed.map((t) => <li key={t} className="n3d-pill">{t}</li>)}</ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* Technical skills */}
        {rows.length > 0 && (
          <section id="n3d-skills" aria-labelledby="n3d-skills-h" className="n3d-section">
            <div className="n3d-wrap">
              <h2 id="n3d-skills-h" className="n3d-h2">Technical skills</h2>
              <dl className="mt-10 divide-y divide-white/[0.07]">
                {rows.map((r) => (
                  <div key={r.label} className="grid gap-3 py-5 md:grid-cols-[200px_1fr] md:items-center">
                    <dt className="n3d-row-label">{r.label}</dt>
                    <dd>
                      <ul className="flex flex-wrap gap-2">{r.items.map((s) => <li key={s} className="n3d-pill">{s}</li>)}</ul>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        {/* Education timeline */}
        {education.length > 0 && (
          <section id="n3d-education" aria-labelledby="n3d-edu-h" className="n3d-section">
            <div className="n3d-wrap">
              <h2 id="n3d-edu-h" className="n3d-h2">Education</h2>
              <ol className="n3d-timeline mt-10">
                {education.map((ed) => (
                  <li key={ed.id} className="n3d-node">
                    <p className="n3d-when">{dateRange(ed.startYear, ed.endYear)}</p>
                    <h3 className="n3d-node-title"><GraduationCap size={17} aria-hidden="true" /> {ed.degree}</h3>
                    <p className="n3d-dim text-sm">{[ed.institution, ed.location].filter(Boolean).join(", ")}</p>
                    {ed.score && <p className="n3d-score"><Star size={13} aria-hidden="true" /> {ed.score}</p>}
                    {ed.highlights && ed.highlights.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-300">
                        {ed.highlights.map((h, i) => <li key={i}>{h}</li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* Contact */}
        <section id="n3d-contact" aria-labelledby="n3d-contact-h" className="n3d-section n3d-contact">
          <div className="n3d-wrap text-center">
            <h2 id="n3d-contact-h" className="n3d-display n3d-display-sm">Let&apos;s build <span className="n3d-holo-text">something</span></h2>
            {basics.availabilityText && <p className="n3d-dim mx-auto mt-4 max-w-xl">{basics.availabilityText}</p>}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {email && <a href={`mailto:${email}`} className="n3d-cta"><span>{email}</span></a>}
              {github && <a href={github} target="_blank" rel="noopener noreferrer" className="n3d-btn"><FaGithub aria-hidden="true" /> GitHub</a>}
              {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer" className="n3d-btn"><FaLinkedin aria-hidden="true" /> LinkedIn</a>}
            </div>
            <p className="n3d-dim mt-16 text-xs">© {new Date().getFullYear()} {name}</p>
          </div>
        </section>
      </main>

      <MascotWidget data={data} themeMode="dark" />
    </div>
  );
}

/* ───────── styles (scoped by the n3d- prefix) ───────── */

const CSS = `
.n3d-root{--n3d-bg:#000;--n3d-card:#0b0b0e;--n3d-line:rgba(255,255,255,.08);--n3d-text:#fafafa;--n3d-dim:#a1a1aa;--n3d-pink:#ec4899;--n3d-purple:#a855f7;
  --n3d-holo:linear-gradient(110deg,var(--n3d-purple),var(--n3d-pink) 35%,#f0abfc 50%,var(--n3d-accent) 70%,var(--n3d-purple));
  position:relative;background:var(--n3d-bg);color:var(--n3d-text);font-family:var(--font-inter),"Poppins",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased;overflow-x:clip}
.n3d-root *{box-sizing:border-box}
.n3d-wrap{width:100%;max-width:72rem;margin:0 auto;padding-left:1.25rem;padding-right:1.25rem}
@media (min-width:640px){.n3d-wrap{padding-left:2rem;padding-right:2rem}}
.n3d-dim{color:var(--n3d-dim)}

/* nav */
.n3d-header{position:sticky;top:0;z-index:40;background:rgba(0,0,0,.55);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid var(--n3d-line)}
.n3d-logo{display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:42px;padding:0 8px;border-radius:12px;font-weight:900;letter-spacing:.04em;color:#fff;border:1px solid var(--n3d-line);background:linear-gradient(#000,#000) padding-box,var(--n3d-holo) border-box;border-color:transparent}
.n3d-navlink{position:relative;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--n3d-dim);transition:color .2s}
.n3d-navlink::after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:2px;border-radius:2px;background:var(--n3d-holo);transform:scaleX(0);transform-origin:left;transition:transform .25s ease}
.n3d-navlink:hover{color:#fff}.n3d-navlink:hover::after,.n3d-navlink:focus-visible::after{transform:scaleX(1)}
.n3d-available{display:inline-flex;align-items:center;gap:8px;max-width:min(60vw,320px);border-radius:999px;padding:6px 14px;font-size:12px;font-weight:600;color:#d4d4d8;background:rgba(255,255,255,.04);border:1px solid var(--n3d-line)}
.n3d-live{flex-shrink:0;width:8px;height:8px;border-radius:999px;background:#22c55e;box-shadow:0 0 8px #22c55e,0 0 0 0 rgba(34,197,94,.6);animation:n3d-ping 2s infinite}
@keyframes n3d-ping{70%{box-shadow:0 0 8px #22c55e,0 0 0 8px rgba(34,197,94,0)}100%{box-shadow:0 0 8px #22c55e,0 0 0 0 rgba(34,197,94,0)}}

/* hero */
.n3d-hero{position:relative;overflow:hidden;background:radial-gradient(60% 50% at 75% 40%,rgba(168,85,247,.16),transparent 70%),radial-gradient(40% 40% at 15% 80%,rgba(236,72,153,.10),transparent 70%)}
.n3d-display{font-size:clamp(2.6rem,8.5vw,6.5rem);line-height:.95;font-weight:900;letter-spacing:-.03em;text-transform:uppercase;overflow-wrap:anywhere}
.n3d-display-sm{font-size:clamp(2.2rem,6.5vw,4.75rem)}
.n3d-holo-text{background:var(--n3d-holo);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:n3d-shift 6s linear infinite}
@keyframes n3d-shift{to{background-position:200% 0}}
.n3d-fullname{margin-top:14px;font-size:14px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--n3d-dim)}
.n3d-subline{margin-top:22px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#d4d4d8}
.n3d-sep{color:var(--n3d-pink);text-shadow:0 0 10px var(--n3d-pink)}
.n3d-cta{position:relative;display:inline-flex;align-items:center;border-radius:999px;padding:13px 26px;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#fff;background:linear-gradient(#0a0a0a,#0a0a0a) padding-box,var(--n3d-holo) border-box;border:2px solid transparent;box-shadow:0 0 22px -4px rgba(236,72,153,.55),0 0 40px -10px rgba(168,85,247,.6);transition:transform .2s ease,box-shadow .25s ease;overflow-wrap:anywhere}
.n3d-cta:hover{transform:translateY(-2px);box-shadow:0 0 30px -2px rgba(236,72,153,.75),0 0 60px -8px rgba(168,85,247,.8)}
.n3d-btn{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:12px 22px;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#e4e4e7;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.14);transition:border-color .2s,background .2s,transform .2s}
.n3d-btn:hover{border-color:rgba(236,72,153,.6);background:rgba(236,72,153,.08);transform:translateY(-2px)}
.n3d-icon{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;font-size:17px;color:var(--n3d-dim);transition:color .2s,background .2s,box-shadow .2s}
.n3d-icon:hover{color:#fff;background:rgba(255,255,255,.06);box-shadow:0 0 16px -4px var(--n3d-purple)}
.n3d-avatar{position:relative;width:min(300px,70vw);aspect-ratio:1;perspective:900px;animation:n3d-float 7s ease-in-out infinite}
.n3d-avatar-halo{position:absolute;inset:-6%;border-radius:999px;background:conic-gradient(from 0deg,var(--n3d-purple),var(--n3d-pink),#f0abfc,var(--n3d-accent),var(--n3d-purple));filter:blur(28px);opacity:.55;animation:n3d-spin 10s linear infinite}
.n3d-avatar-img,.n3d-orb{position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:999px;object-fit:cover;border:2px solid rgba(255,255,255,.12)}
.n3d-orb{font-size:clamp(3rem,10vw,5.5rem);font-weight:900;color:#fff;text-shadow:0 4px 30px rgba(0,0,0,.6);background:radial-gradient(circle at 32% 28%,#fff 0,#f5d0fe 8%,#c084fc 30%,#7e22ce 58%,#2e1065 82%,#09090b 100%);box-shadow:inset -18px -24px 50px rgba(0,0,0,.65),inset 10px 10px 30px rgba(255,255,255,.18),0 30px 80px -20px rgba(168,85,247,.7)}
@keyframes n3d-float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-14px) rotate(1deg)}}
@keyframes n3d-spin{to{transform:rotate(360deg)}}

/* floating 3D shapes */
.n3d-shapes{position:absolute;inset:0;pointer-events:none;z-index:0}
.n3d-shapes>span{position:absolute;opacity:.85}
.n3d-moon{width:64px;height:64px;border-radius:999px;background:radial-gradient(circle at 70% 30%,#f4f4f5,#a1a1aa 45%,#3f3f46 80%);box-shadow:inset -10px -8px 0 rgba(0,0,0,.35),0 0 40px rgba(244,244,245,.18);animation:n3d-bob 9s ease-in-out infinite}
.n3d-moon::before,.n3d-moon::after{content:"";position:absolute;border-radius:999px;background:rgba(63,63,70,.55)}
.n3d-moon::before{width:12px;height:12px;top:18px;left:16px}.n3d-moon::after{width:8px;height:8px;top:38px;left:34px}
.n3d-torus{width:92px;height:92px;border-radius:999px;border:14px solid transparent;background:conic-gradient(var(--n3d-purple),var(--n3d-pink),#f0abfc,var(--n3d-accent),var(--n3d-purple)) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box exclude,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) padding-box exclude,linear-gradient(#000 0 0);transform:rotateX(62deg);filter:drop-shadow(0 0 14px rgba(236,72,153,.5));animation:n3d-tilt 11s ease-in-out infinite}
.n3d-torus-sm{width:64px;height:64px;border-width:10px}
@keyframes n3d-tilt{0%,100%{transform:rotateX(62deg) rotateZ(0) translateY(0)}50%{transform:rotateX(50deg) rotateZ(180deg) translateY(-12px)}}
@keyframes n3d-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
.n3d-cube-wrap{width:56px;height:56px;perspective:600px;animation:n3d-bob 8s ease-in-out infinite reverse}
.n3d-cube{position:relative;display:block;width:100%;height:100%;transform-style:preserve-3d;animation:n3d-rot 14s linear infinite}
.n3d-face{position:absolute;inset:0;border:1px solid rgba(240,171,252,.55);background:linear-gradient(135deg,rgba(168,85,247,.35),rgba(236,72,153,.18));box-shadow:inset 0 0 18px rgba(236,72,153,.35)}
.n3d-f{transform:translateZ(28px)}.n3d-b{transform:rotateY(180deg) translateZ(28px)}.n3d-l{transform:rotateY(-90deg) translateZ(28px)}
.n3d-r{transform:rotateY(90deg) translateZ(28px)}.n3d-t{transform:rotateX(90deg) translateZ(28px)}.n3d-d{transform:rotateX(-90deg) translateZ(28px)}
@keyframes n3d-rot{to{transform:rotateX(360deg) rotateY(360deg)}}
.n3d-brick{display:grid!important;grid-template-columns:repeat(2,1fr);gap:6px;padding:16px 10px 10px;width:76px;height:54px;border-radius:8px;background:linear-gradient(160deg,#f472b6,#be185d);box-shadow:inset -6px -8px 0 rgba(0,0,0,.25),0 18px 40px -12px rgba(236,72,153,.6);transform:rotate(-14deg);animation:n3d-bob 10s ease-in-out infinite}
.n3d-brick i{position:relative;top:-24px;height:12px;border-radius:999px;background:linear-gradient(#f9a8d4,#db2777);box-shadow:inset 0 -3px 0 rgba(0,0,0,.25)}

/* marquee */
.n3d-marquee{overflow:hidden;border-block:1px solid var(--n3d-line);background:linear-gradient(90deg,rgba(168,85,247,.06),rgba(236,72,153,.06));padding:18px 0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.n3d-track{display:flex;width:max-content;animation:n3d-scroll 40s linear infinite}
.n3d-marquee:hover .n3d-track{animation-play-state:paused}
.n3d-row{display:flex;align-items:center;list-style:none;margin:0;padding:0}
.n3d-row li{display:flex;align-items:center;gap:28px;padding-right:28px;font-size:clamp(1.1rem,2.6vw,1.6rem);font-weight:800;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap;color:#e4e4e7}
.n3d-star{color:var(--n3d-pink);text-shadow:0 0 12px var(--n3d-pink);font-size:.8em}
@keyframes n3d-scroll{to{transform:translateX(-50%)}}

/* sections */
.n3d-section{position:relative;padding:6rem 0;border-top:1px solid rgba(255,255,255,.04)}
.n3d-about{overflow:hidden}
.n3d-h2{font-size:clamp(2rem,6vw,4rem);line-height:1;font-weight:900;letter-spacing:-.02em;text-transform:uppercase}
.n3d-amp{background:var(--n3d-holo);-webkit-background-clip:text;background-clip:text;color:transparent}
.n3d-h3{font-size:14px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:var(--n3d-dim)}
.n3d-bio{margin-top:2.5rem;max-width:62rem;font-size:clamp(1.25rem,2.6vw,2rem);line-height:1.45;font-weight:600;color:#8b8b94}
.n3d-hl{font-weight:800;color:#fff;background:linear-gradient(90deg,#fff,#f5d0fe);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
.n3d-card{position:relative;border-radius:22px;background:var(--n3d-card);border:1px solid var(--n3d-line);transition:border-color .3s ease,box-shadow .3s ease,transform .3s ease}
.n3d-card:hover,.n3d-card:focus-within{border-color:rgba(236,72,153,.45);box-shadow:0 0 0 1px rgba(168,85,247,.25),0 0 40px -12px rgba(236,72,153,.55);transform:translateY(-3px)}
.n3d-service{display:flex;gap:18px;padding:26px}
.n3d-service h4{font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
.n3d-service p{margin-top:8px;font-size:14px;line-height:1.6;color:var(--n3d-dim)}
.n3d-glyph{flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:14px;color:#f5d0fe;background:radial-gradient(circle,rgba(236,72,153,.35),rgba(168,85,247,.12) 70%);box-shadow:0 0 24px -6px var(--n3d-pink)}
.n3d-glyph svg{width:22px;height:22px}

/* stats */
.n3d-stat{text-align:center}
.n3d-stat-link{position:relative;border-radius:22px;display:flex;flex-direction:column;align-items:center;padding:30px 22px;height:100%;color:inherit}
.n3d-stat-arrow{position:absolute;top:16px;right:16px;color:var(--n3d-dim);transition:color .2s,transform .2s}
.n3d-stat:hover .n3d-stat-arrow{color:#fff;transform:translate(2px,-2px)}
.n3d-stat-icon{position:relative;display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;margin-bottom:18px;border-radius:999px;font-size:24px;color:#fff}
.n3d-stat-icon::before{content:"";position:absolute;inset:-10px;border-radius:999px;background:radial-gradient(circle,rgba(236,72,153,.55),rgba(168,85,247,.25) 45%,transparent 70%);filter:blur(6px);z-index:-1}
.n3d-stat-icon svg{width:24px;height:24px}
.n3d-metric{font-size:clamp(1.3rem,2.4vw,1.75rem);line-height:1.2;font-weight:900;letter-spacing:-.01em;overflow-wrap:anywhere}
.n3d-stat-sub{margin-top:8px;font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#d4d4d8}
.n3d-stat-detail{margin-top:8px;font-size:13px;line-height:1.5;color:var(--n3d-dim)}

/* projects */
.n3d-project{display:flex;flex-direction:column;gap:14px;border-radius:22px;outline:none}
.n3d-thumb{position:relative;aspect-ratio:4/3;overflow:hidden;border-radius:22px;border:1px solid var(--n3d-line);background:#09090b;transition:border-color .35s ease,box-shadow .35s ease}
.n3d-thumb img{width:100%;height:100%;object-fit:cover;transition:transform .7s cubic-bezier(.2,.7,.2,1),filter .5s ease}
.n3d-thumb-letter{font-size:84px;line-height:1;font-weight:900;background:var(--n3d-holo);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 24px rgba(236,72,153,.45))}
.n3d-thumb-tech{padding:0 16px;text-align:center;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a1a1aa}
.n3d-thumb-fallback{display:flex;flex-direction:column;gap:12px;align-items:center;justify-content:center;width:100%;height:100%;background:radial-gradient(circle at 30% 20%,rgba(236,72,153,.35),transparent 60%),radial-gradient(circle at 80% 80%,rgba(168,85,247,.35),transparent 60%),#09090b}
.n3d-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;gap:12px;padding:20px;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.92) 65%);opacity:0;transform:translateY(12px);transition:opacity .35s ease,transform .35s ease}
.n3d-overlay-desc{font-size:13px;line-height:1.55;color:#e4e4e7;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.n3d-overlay-tech{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin:0;padding:0}
.n3d-overlay-tech li{border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;color:#fae8ff;background:rgba(168,85,247,.25);border:1px solid rgba(240,171,252,.35)}
.n3d-overlay-links{display:flex;gap:8px}
.n3d-mini{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.2)}
.n3d-mini:hover{border-color:var(--n3d-pink);box-shadow:0 0 16px -4px var(--n3d-pink)}
.n3d-project:hover .n3d-thumb,.n3d-project:focus-within .n3d-thumb,.n3d-project:focus-visible .n3d-thumb{border-color:rgba(236,72,153,.55);box-shadow:0 0 0 1px rgba(168,85,247,.3),0 20px 60px -20px rgba(236,72,153,.6)}
.n3d-project:hover .n3d-thumb img,.n3d-project:focus-within .n3d-thumb img,.n3d-project:focus-visible .n3d-thumb img{transform:scale(1.08);filter:saturate(1.1)}
.n3d-project:hover .n3d-overlay,.n3d-project:focus-within .n3d-overlay,.n3d-project:focus-visible .n3d-overlay{opacity:1;transform:none}
@media (hover:none){.n3d-overlay{opacity:1;transform:none;background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,.92) 80%)}}
.n3d-project-meta h3{font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:.02em}
.n3d-project-meta p{margin-top:4px;font-size:14px;color:var(--n3d-dim)}

/* skills, timeline */
.n3d-row-label{font-size:13px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#e4e4e7}
.n3d-pill{border-radius:999px;padding:7px 16px;font-size:13px;font-weight:600;color:#a1a1aa;background:#0e0e11;border:1px solid rgba(255,255,255,.09);transition:color .2s,border-color .2s,box-shadow .2s}
.n3d-pill:hover{color:#fff;border-color:rgba(236,72,153,.45);box-shadow:0 0 18px -8px var(--n3d-pink)}
.n3d-timeline{position:relative;list-style:none;margin-left:8px;padding:0 0 0 30px;border-left:1px solid rgba(255,255,255,.1)}
.n3d-timeline::before{content:"";position:absolute;left:-1px;top:0;width:1px;height:100%;background:linear-gradient(var(--n3d-purple),var(--n3d-pink),transparent)}
.n3d-node{position:relative;padding-bottom:42px}
.n3d-node:last-child{padding-bottom:0}
.n3d-node::before{content:"";position:absolute;left:-38px;top:4px;width:15px;height:15px;border-radius:999px;background:#000;border:2px solid var(--n3d-pink);box-shadow:0 0 14px var(--n3d-pink)}
.n3d-when{font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#f0abfc}
.n3d-node-title{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px;font-size:clamp(1.15rem,2.2vw,1.5rem);font-weight:900;text-transform:uppercase;letter-spacing:.01em}
.n3d-score{display:inline-flex;align-items:center;gap:6px;margin-top:10px;border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700;color:#fae8ff;background:rgba(168,85,247,.16);border:1px solid rgba(240,171,252,.3)}
.n3d-contact{background:radial-gradient(50% 60% at 50% 100%,rgba(168,85,247,.18),transparent 70%)}

/* cursor */
.n3d-cursor-dot,.n3d-cursor-ring{position:fixed;left:0;top:0;z-index:60;pointer-events:none;border-radius:999px;opacity:0;transition:opacity .25s ease,width .2s ease,height .2s ease,margin .2s ease}
.n3d-cursor-dot{width:8px;height:8px;margin:-4px 0 0 -4px;background:#fff;box-shadow:0 0 12px var(--n3d-pink),0 0 24px var(--n3d-purple)}
.n3d-cursor-ring{width:38px;height:38px;margin:-19px 0 0 -19px;border:2px solid transparent;background:conic-gradient(var(--n3d-purple),var(--n3d-pink),#f0abfc,var(--n3d-accent),var(--n3d-purple)) border-box;-webkit-mask:linear-gradient(#000 0 0) padding-box exclude,linear-gradient(#000 0 0);mask:linear-gradient(#000 0 0) padding-box exclude,linear-gradient(#000 0 0);filter:drop-shadow(0 0 8px rgba(236,72,153,.7))}
.n3d-cursor-dot.is-on{opacity:1}.n3d-cursor-ring.is-on{opacity:.9}
.n3d-cursor-ring.is-hover{width:58px;height:58px;margin:-29px 0 0 -29px}

.n3d-root a:focus-visible,.n3d-root button:focus-visible,.n3d-project:focus-visible{outline:2px solid #f0abfc;outline-offset:3px}
@media (prefers-reduced-motion:reduce){
  .n3d-root *,.n3d-root *::before,.n3d-root *::after{animation:none!important;transition:none!important}
  .n3d-track{width:auto}
  .n3d-row{flex-wrap:wrap;justify-content:center;row-gap:10px;padding:0 16px}
  .n3d-row[aria-hidden="true"]{display:none}
  .n3d-marquee{-webkit-mask-image:none;mask-image:none}
  .n3d-cursor-dot,.n3d-cursor-ring{display:none}
}
@media (max-width:767px){.n3d-moon,.n3d-hero .n3d-torus{display:none}.n3d-avatar{width:min(260px,62vw)}}
@media (max-width:640px){.n3d-track{animation-duration:28s}.n3d-section{padding:4rem 0}}
`;
