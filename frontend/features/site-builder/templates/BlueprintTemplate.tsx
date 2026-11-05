"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { Download, Globe, Mail, MapPin, Moon, Sun } from "lucide-react";
import { SiCodechef, SiCodeforces, SiGithub, SiLeetcode } from "react-icons/si";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";
import type { PortfolioData, PortfolioProject, TemplateProps } from "@/types/portfolio";
import { accentFor } from "../lib/accent";
import { firstName, hostOf, initials, safeHref } from "../lib/links";
import { useThemeMode } from "../lib/useThemeMode";
import { MascotWidget } from "../mascots/MascotWidget";

/* ───────── helpers ───────── */
const num = (v: number | null | undefined): string =>
  typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("en-US") : "—";
const pad = (i: number): string => String(i).padStart(2, "0");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type IconLike = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
type Social = { key: string; label: string; href: string; Icon: IconLike };

function socialLinks(data: PortfolioData): Social[] {
  const s = data.basics.socials;
  const all: Array<{ key: string; label: string; url?: string; Icon: IconLike }> = [
    { key: "github", label: "GitHub", url: s.github, Icon: SiGithub },
    { key: "linkedin", label: "LinkedIn", url: s.linkedin, Icon: FaLinkedin },
    { key: "twitter", label: "X / Twitter", url: s.twitter, Icon: FaXTwitter },
    { key: "leetcode", label: "LeetCode", url: s.leetcode, Icon: SiLeetcode },
    { key: "codechef", label: "CodeChef", url: s.codechef, Icon: SiCodechef },
    { key: "codeforces", label: "Codeforces", url: s.codeforces, Icon: SiCodeforces },
  ];
  const out: Social[] = [];
  for (const a of all) {
    const href = safeHref(a.url);
    if (href) out.push({ key: a.key, label: a.label, href, Icon: a.Icon });
  }
  const site = safeHref(s.website);
  if (site) out.push({ key: "website", label: hostOf(site) || "Website", href: site, Icon: Globe });
  return out;
}

function Img({ src, alt, className, onFail }: { src: string; alt: string; className?: string; onFail: () => void }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={className} onError={onFail} />;
}

function Avatar({ data, size }: { data: PortfolioData; size: number }) {
  const [failed, setFailed] = useState(false);
  const src = safeHref(data.basics.avatarUrl) ?? safeHref(data.codingStats.github?.avatarUrl);
  const box: CSSProperties = { width: size, height: size };
  if (src && !failed) {
    return (
      <div className="sbp-card shrink-0 overflow-hidden" style={box}>
        <Img src={src} alt={`${data.basics.fullName || "Portfolio owner"} avatar`} className="h-full w-full object-cover" onFail={() => setFailed(true)} />
      </div>
    );
  }
  return (
    <div className="sbp-card sbp-mono flex shrink-0 items-center justify-center text-2xl font-bold" style={{ ...box, color: "var(--acc)" }} aria-hidden="true">
      {initials(data.basics.fullName || data.config.handle)}
    </div>
  );
}

function ExtLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/* ───────── project card ───────── */
function ProjectCard({ p, index }: { p: PortfolioProject; index: number }) {
  const [failed, setFailed] = useState(false);
  const shot = safeHref(p.imageUrl);
  const repo = safeHref(p.githubUrl);
  const live = safeHref(p.liveUrl);
  return (
    <article className={`sbp-card flex flex-col ${p.featured ? "md:col-span-2" : ""}`}>
      <header className="sbp-mono sbp-titleblock flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] tracking-widest">
        <span>{`FIG ${pad(index + 1)} // PROJECT ARCHITECTURE`}</span>
        <span className="flex items-center gap-2">
          {p.featured && <span className="sbp-stamp">FEATURED</span>}
          {p.year && <span>{p.year}</span>}
        </span>
      </header>
      <div className={p.featured ? "grid gap-0 md:grid-cols-2" : "flex flex-col"}>
        <div className="sbp-shot" style={{ aspectRatio: "16 / 9" }}>
          {shot && !failed ? (
            <Img src={shot} alt={`Screenshot of ${p.title || "project"}`} className="h-full w-full object-cover" onFail={() => setFailed(true)} />
          ) : (
            <div className="sbp-banner sbp-mono flex h-full w-full flex-col items-start justify-end gap-2 p-4" role="img" aria-label={`${p.title || "Project"} tech stack banner`}>
              <span className="text-xs tracking-widest" style={{ color: "var(--mut)" }}>NO PREVIEW // STACK</span>
              <span className="text-lg font-bold leading-tight" style={{ color: "var(--acc)" }}>
                {p.techStack.slice(0, 4).join(" · ") || p.title}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <h3 className="text-lg font-bold leading-snug">{p.title}</h3>
            {p.tagline && <p className="sbp-mono mt-1 text-xs" style={{ color: "var(--acc)" }}>{p.tagline}</p>}
          </div>
          {p.description && <p className="text-sm leading-relaxed" style={{ color: "var(--mut)" }}>{p.description}</p>}
          {p.metrics && (
            <p className="sbp-mono sbp-stamp self-start text-[11px] tracking-wide" aria-label={`Key metrics: ${p.metrics}`}>
              ◈ {p.metrics}
            </p>
          )}
          {p.techStack.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
              {p.techStack.map((t) => (
                <li key={t} className="sbp-tag">{t}</li>
              ))}
            </ul>
          )}
          {(repo || live) && (
            <div className="mt-auto flex flex-wrap gap-2 pt-1">
              {repo && <ExtLink href={repo} className="sbp-btn">[ SOURCE CODE ↗ ]</ExtLink>}
              {live && <ExtLink href={live} className="sbp-btn sbp-btn-solid">[ LIVE DEPLOYMENT ↗ ]</ExtLink>}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ───────── telemetry ───────── */
function Telemetry({ title, big, sub, href, children, wide }: { title: string; big: string; sub?: string; href?: string; children?: ReactNode; wide?: boolean }) {
  return (
    <div className={`sbp-card flex flex-col gap-2 p-4 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="sbp-label">{title}</span>
        {href && <ExtLink href={href} className="sbp-mono text-[11px] tracking-wider underline-offset-4 hover:underline" >VERIFY ↗<span className="sr-only"> {title} profile (opens in a new tab)</span></ExtLink>}
      </div>
      <p className="sbp-mono text-4xl font-bold leading-none tracking-tight" style={{ color: "var(--fg)" }}>{big}</p>
      {sub && <p className="sbp-mono text-xs" style={{ color: "var(--mut)" }}>{sub}</p>}
      {children}
    </div>
  );
}

function Section({ n, title, id, children }: { n: string; title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`sbp-${id}`} data-sbp-sec={id} className="grid gap-4 md:grid-cols-[44px_1fr]">
      <h2 id={`sbp-${id}`} className="sbp-label sbp-vlabel flex items-center gap-2 text-xs md:text-[11px]" style={{ letterSpacing: "0.22em" }}>
        {`${n} // ${title}`}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

const SKILL_ROWS: Array<{ key: keyof PortfolioData["skills"]; label: string }> = [
  { key: "languages", label: "Languages" },
  { key: "frameworks", label: "Frameworks" },
  { key: "databasesAndCloud", label: "Databases & Cloud" },
  { key: "aiAndMl", label: "AI & ML" },
  { key: "coreCsAndTools", label: "Core CS & Tools" },
];

/* ───────── template ───────── */
export function BlueprintTemplate({ data }: TemplateProps) {
  const [mode, , toggle] = useThemeMode(data.config.themeMode);
  const accent = accentFor(data.config.accentColor);
  const dark = mode === "dark";
  const rootRef = useRef<HTMLDivElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);

  // Live CAD coordinates: one DOM write per animation frame, no React state.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      raf = 0;
      if (coordRef.current) coordRef.current.textContent = `X: ${String(x).padStart(4, "0")} Y: ${String(y).padStart(4, "0")}`;
    };
    const move = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      x = Math.min(9999, Math.max(0, Math.round(e.clientX - r.left)));
      y = Math.min(9999, Math.max(0, Math.round(e.clientY - r.top)));
      if (!raf) raf = requestAnimationFrame(paint);
    };
    root.addEventListener("pointermove", move, { passive: true });
    return () => {
      root.removeEventListener("pointermove", move);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const { basics, codingStats: cs, skills, config } = data;
  const vars = {
    "--bg": dark ? "#060B16" : "#F8FAFC",
    "--grid": dark ? "rgba(56,189,248,0.09)" : "rgba(29,78,216,0.08)",
    "--line": dark ? "rgba(56,189,248,0.28)" : "#BFDBFE",
    "--card": dark ? "rgba(8,18,36,0.78)" : "#FFFFFF",
    "--fg": dark ? "#E2E8F0" : "#0F172A",
    "--mut": dark ? "#94A3B8" : "#475569",
    "--acc": dark ? accent.base : accent.strong,
    "--accsoft": accent.soft,
    "--onacc": dark ? accent.onBase : "#FFFFFF",
  } as CSSProperties;

  const links = socialLinks(data);
  const resume = safeHref(basics.resumeUrl);
  const mail = EMAIL_RE.test(basics.email.trim()) ? `mailto:${basics.email.trim()}` : undefined;
  const lc = cs.leetcode;
  const cc = cs.codechef;
  const cf = cs.codeforces;
  const gh = cs.github;
  const hasStats = config.showCodingStats && !!(lc || cc || cf || gh);
  const projects = [...data.projects].sort((a, b) => Number(b.featured) - Number(a.featured));
  const skillRows = SKILL_ROWS.filter((r) => skills[r.key].length > 0);

  let counter = 0;
  const next = () => pad(++counter);

  const lcSum = lc ? lc.easySolved + lc.mediumSolved + lc.hardSolved : 0;
  const seg = (v: number) => (lcSum > 0 ? `${(v / lcSum) * 100}%` : "0%");

  return (
    <div ref={rootRef} className="sbp-root relative min-h-full w-full overflow-x-clip" style={vars} data-theme-mode={mode}>
      <style>{CSS}</style>

      {/* Engineering header bar */}
      <header className="sbp-header sticky top-0 z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <p className="sbp-mono min-w-0 truncate text-xs font-bold tracking-[0.18em]" style={{ color: "var(--acc)" }}>
          {`CAD-SPEC // ${config.handle.toUpperCase()}`}
        </p>
        <span ref={coordRef} className="sbp-mono hidden text-[11px] tracking-widest md:inline" style={{ color: "var(--mut)" }} aria-hidden="true">
          X: 0000 Y: 0000
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggle} className="sbp-btn inline-flex items-center gap-1.5" aria-label={`Switch to ${dark ? "light" : "dark"} blueprint`} aria-pressed={dark}>
            {dark ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : <Moon className="h-3.5 w-3.5" aria-hidden="true" />}
            <span className="hidden sm:inline">{dark ? "LIGHT" : "DARK"}</span>
          </button>
          {resume && (
            <ExtLink href={resume} className="sbp-btn sbp-btn-solid inline-flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">EXPORT </span>RESUME.PDF
            </ExtLink>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-14 px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {/* Hero + telemetry: split 12-column grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          <section aria-label="Identity" className={`flex flex-col gap-5 ${hasStats ? "lg:col-span-5" : "lg:col-span-12"}`}>
            <p className="sbp-mono flex flex-wrap items-center gap-2 text-[11px] tracking-[0.16em]" style={{ color: "var(--acc)" }}>
              <span className="sbp-dot" aria-hidden="true" /> SYSTEM ONLINE{basics.availabilityText ? ` — ${basics.availabilityText.toUpperCase()}` : ""}
            </p>
            <div className="flex items-center gap-4">
              <Avatar data={data} size={84} />
              <div className="min-w-0">
                <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{basics.fullName || config.handle}</h1>
                {basics.headline && <p className="sbp-mono mt-1 text-sm" style={{ color: "var(--acc)" }}>{basics.headline}</p>}
              </div>
            </div>
            {basics.shortBio && <p className="max-w-xl text-base leading-relaxed" style={{ color: "var(--mut)" }}>{basics.shortBio}</p>}
            {!hasStats && basics.longBio && <p className="max-w-3xl text-sm leading-relaxed" style={{ color: "var(--mut)" }}>{basics.longBio}</p>}
            <ul className="sbp-mono flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: "var(--mut)" }}>
              {basics.location && (
                <li className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{basics.location}</li>
              )}
              {mail && (
                <li className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" aria-hidden="true" /><a href={mail} className="underline-offset-4 hover:underline">{basics.email.trim()}</a></li>
              )}
            </ul>
            {links.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Social ports">
                {links.map(({ key, label, href, Icon }) => (
                  <li key={key}>
                    <ExtLink href={href} className="sbp-port inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="sbp-mono text-[11px] tracking-wider">{label}</span>
                      <span className="sr-only">(opens in a new tab)</span>
                    </ExtLink>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {hasStats && (
            <section aria-label="Coding profile telemetry" className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
              {cc && (
                <Telemetry title="CODECHEF" big={num(cc.rating)} sub={[cc.stars, cc.maxRating ? `MAX ${num(cc.maxRating)}` : "", cc.globalRank ? `GLOBAL #${num(cc.globalRank)}` : ""].filter(Boolean).join(" · ")} href={safeHref(cc.profileUrl)}>
                  {cc.maxRating > 0 && cc.rating > 0 && (
                    <div className="sbp-bar" role="img" aria-label={`Current rating ${cc.rating} of max ${cc.maxRating}`}>
                      <span className="sbp-seg" style={{ width: `${Math.min(100, (cc.rating / cc.maxRating) * 100)}%`, background: "var(--acc)" }} />
                    </div>
                  )}
                </Telemetry>
              )}
              {lc && (
                <Telemetry title="LEETCODE SOLVED" big={num(lc.totalSolved)} sub={[lc.rating ? `CONTEST ${num(Math.round(lc.rating))}` : "", typeof lc.topPercentage === "number" ? `TOP ${lc.topPercentage}%` : ""].filter(Boolean).join(" · ")} href={safeHref(lc.profileUrl)}>
                  {lcSum > 0 && (
                    <>
                      <div className="sbp-bar" role="img" aria-label={`Easy ${lc.easySolved}, medium ${lc.mediumSolved}, hard ${lc.hardSolved}`}>
                        <span className="sbp-seg" style={{ width: seg(lc.easySolved), background: "#10B981" }} />
                        <span className="sbp-seg" style={{ width: seg(lc.mediumSolved), background: "#F59E0B" }} />
                        <span className="sbp-seg" style={{ width: seg(lc.hardSolved), background: "#EF4444" }} />
                      </div>
                      <p className="sbp-mono flex gap-3 text-[11px]" style={{ color: "var(--mut)" }}>
                        <span style={{ color: "#10B981" }}>E {num(lc.easySolved)}</span>
                        <span style={{ color: "#F59E0B" }}>M {num(lc.mediumSolved)}</span>
                        <span style={{ color: "#EF4444" }}>H {num(lc.hardSolved)}</span>
                      </p>
                    </>
                  )}
                </Telemetry>
              )}
              {cf && (
                <Telemetry title="CODEFORCES" big={num(cf.rating)} sub={[cf.rank ? cf.rank.toUpperCase() : "", cf.maxRating ? `MAX ${num(cf.maxRating)}` : ""].filter(Boolean).join(" · ")} href={safeHref(cf.profileUrl)} />
              )}
              {gh && (
                <Telemetry title="GITHUB REPOS" big={num(gh.publicRepos)} sub={`${num(gh.totalStars)} STARS · ${num(gh.followers)} FOLLOWERS`} href={safeHref(gh.profileUrl)}>
                  {gh.topLanguages.length > 0 && (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Top languages">
                      {gh.topLanguages.slice(0, 5).map((l) => <li key={l} className="sbp-tag">{l}</li>)}
                    </ul>
                  )}
                </Telemetry>
              )}
              {basics.longBio && (
                <div className="sbp-card p-4 sm:col-span-2">
                  <p className="sbp-label mb-2">ABOUT</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--mut)" }}>{basics.longBio}</p>
                </div>
              )}
            </section>
          )}
        </div>

        {projects.length > 0 && (
          <Section n={next()} title="PROJECTS" id="projects">
            <div className="grid gap-6 md:grid-cols-2">
              {projects.map((p, i) => <ProjectCard key={p.id} p={p} index={i} />)}
            </div>
          </Section>
        )}

        {data.experience.length > 0 && (
          <Section n={next()} title="EXPERIENCE" id="experience">
            <ol className="sbp-card divide-y" style={{ borderColor: "var(--line)" }}>
              {data.experience.map((e) => {
                const co = safeHref(e.companyUrl);
                return (
                  <li key={e.id} className="grid gap-3 p-4 sm:grid-cols-[170px_1fr]" style={{ borderColor: "var(--line)" }}>
                    <p className="sbp-mono text-xs leading-relaxed" style={{ color: "var(--mut)" }}>
                      {[e.startDate, e.endDate].filter(Boolean).join(" → ")}
                      {e.location && <><br />{e.location}</>}
                    </p>
                    <div>
                      <h3 className="font-bold">{e.role}{e.role && e.company ? " · " : ""}{co ? <ExtLink href={co} className="underline-offset-4 hover:underline" >{e.company}</ExtLink> : e.company}</h3>
                      {e.descriptionBullets.length > 0 && (
                        <ul className="mt-2 list-none space-y-1.5 text-sm" style={{ color: "var(--mut)" }}>
                          {e.descriptionBullets.map((b, i) => (
                            <li key={i} className="flex gap-2"><span className="sbp-mono" style={{ color: "var(--acc)" }} aria-hidden="true">▸</span><span>{b}</span></li>
                          ))}
                        </ul>
                      )}
                      {e.techUsed.length > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Technologies used">
                          {e.techUsed.map((t) => <li key={t} className="sbp-tag">{t}</li>)}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>
        )}

        {skillRows.length > 0 && (
          <Section n={next()} title="TECH MATRIX" id="skills">
            <dl className="sbp-card divide-y" style={{ borderColor: "var(--line)" }}>
              {skillRows.map((r) => (
                <div key={r.key} className="grid gap-2 p-4 sm:grid-cols-[170px_1fr]" style={{ borderColor: "var(--line)" }}>
                  <dt className="sbp-label">{r.label.toUpperCase()}</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-1.5">
                      {skills[r.key].map((s) => <li key={s} className="sbp-tag sbp-tag-strong">{s}</li>)}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {data.education.length > 0 && (
          <Section n={next()} title="EDUCATION" id="education">
            <div className="grid gap-4 md:grid-cols-2">
              {data.education.map((ed) => (
                <article key={ed.id} className="sbp-card flex flex-col gap-1.5 p-4">
                  <h3 className="font-bold leading-snug">{ed.degree}</h3>
                  <p className="text-sm" style={{ color: "var(--mut)" }}>{[ed.institution, ed.location].filter(Boolean).join(" · ")}</p>
                  <p className="sbp-mono text-xs" style={{ color: "var(--acc)" }}>
                    {[[ed.startYear, ed.endYear].filter(Boolean).join(" → "), ed.score].filter(Boolean).join("  |  ")}
                  </p>
                  {ed.highlights && ed.highlights.length > 0 && (
                    <ul className="mt-1 space-y-1 text-sm" style={{ color: "var(--mut)" }}>
                      {ed.highlights.map((h, i) => <li key={i} className="flex gap-2"><span aria-hidden="true" style={{ color: "var(--acc)" }}>▸</span>{h}</li>)}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </Section>
        )}

        {data.achievements.length > 0 && (
          <Section n={next()} title="HONORS" id="honors">
            <div className="grid gap-4 md:grid-cols-2">
              {data.achievements.map((a) => {
                const proof = safeHref(a.proofUrl);
                return (
                  <article key={a.id} className="sbp-card flex flex-col gap-1.5 p-4">
                    <h3 className="font-bold leading-snug">{a.title}</h3>
                    <p className="sbp-mono text-xs" style={{ color: "var(--acc)" }}>{[a.issuer, a.date].filter(Boolean).join(" · ")}</p>
                    {a.description && <p className="text-sm" style={{ color: "var(--mut)" }}>{a.description}</p>}
                    {proof && <ExtLink href={proof} className="sbp-mono mt-1 self-start text-[11px] tracking-wider underline-offset-4 hover:underline">VIEW PROOF ↗<span className="sr-only"> for {a.title} (opens in a new tab)</span></ExtLink>}
                  </article>
                );
              })}
            </div>
          </Section>
        )}

        {/* Contact footer */}
        <footer className="sbp-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Contact">
          <div>
            <p className="sbp-label mb-1">END OF DRAWING // REV-{new Date().getFullYear()}</p>
            <p className="text-lg font-bold">Let&apos;s build something{basics.fullName ? ` with ${firstName(basics.fullName)}` : ""}.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {mail && <a href={mail} className="sbp-btn sbp-btn-solid inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" aria-hidden="true" />CONTACT</a>}
            {links.slice(0, 3).map(({ key, label, href }) => (
              <ExtLink key={key} href={href} className="sbp-btn">{label.toUpperCase()} ↗</ExtLink>
            ))}
          </div>
        </footer>
      </main>

      <MascotWidget data={data} themeMode={mode} />
    </div>
  );
}

const CSS = `
.sbp-root{background-color:var(--bg);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:32px 32px;color:var(--fg);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;transition:background-color .25s,color .25s}
.sbp-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.sbp-header{background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.sbp-card{position:relative;border:1px solid var(--line);background:var(--card)}
.sbp-card::before,.sbp-card::after{content:"+";position:absolute;font:700 14px/1 ui-monospace,Menlo,monospace;color:var(--acc);pointer-events:none}
.sbp-card::before{top:-8px;left:-5px}
.sbp-card::after{bottom:-8px;right:-5px}
.sbp-titleblock{border-bottom:1px solid var(--line);color:var(--mut);background:var(--accsoft)}
.sbp-label{font:700 .68rem/1.2 ui-monospace,Menlo,monospace;letter-spacing:.16em;color:var(--acc)}
.sbp-vlabel{white-space:nowrap}
@media (min-width:768px){.sbp-vlabel{writing-mode:vertical-rl;transform:rotate(180deg);justify-content:flex-end}}
.sbp-btn{border:1px solid var(--acc);color:var(--acc);background:transparent;padding:.45rem .85rem;font:700 .7rem/1 ui-monospace,Menlo,monospace;letter-spacing:.08em;cursor:pointer;transition:background-color .18s,color .18s,transform .18s}
.sbp-btn:hover{background:var(--acc);color:var(--onacc);transform:translateY(-1px)}
.sbp-btn-solid{background:var(--acc);color:var(--onacc)}
.sbp-btn-solid:hover{filter:brightness(1.1)}
.sbp-port{border:1px solid var(--line);padding:.4rem .7rem;color:var(--fg);transition:border-color .18s,color .18s,background-color .18s}
.sbp-port:hover{border-color:var(--acc);color:var(--acc);background:var(--accsoft)}
.sbp-tag{border:1px solid var(--line);padding:.15rem .5rem;font:500 .68rem/1.4 ui-monospace,Menlo,monospace;color:var(--mut)}
.sbp-tag-strong{color:var(--fg);background:var(--accsoft)}
.sbp-stamp{border:1px solid var(--acc);color:var(--acc);padding:.15rem .5rem;font:700 .65rem/1.4 ui-monospace,Menlo,monospace;letter-spacing:.1em}
.sbp-bar{display:flex;height:8px;background:var(--line);overflow:hidden}
.sbp-seg{display:block;height:100%;transform-origin:left;animation:sbp-grow .9s cubic-bezier(.2,.7,.2,1) both}
.sbp-shot{position:relative;overflow:hidden;background:var(--accsoft)}
.sbp-shot img{transition:transform .5s}
.sbp-card:hover .sbp-shot img{transform:scale(1.04)}
.sbp-shot::after{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--acc) 1px,transparent 1px),linear-gradient(90deg,var(--acc) 1px,transparent 1px);background-size:24px 24px;opacity:0;transition:opacity .25s;mix-blend-mode:soft-light;pointer-events:none}
.sbp-card:hover .sbp-shot::after{opacity:.55}
.sbp-banner{background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);background-size:20px 20px}
.sbp-dot{width:8px;height:8px;border-radius:9999px;background:var(--acc);box-shadow:0 0 0 0 var(--acc);animation:sbp-pulse 2s infinite}
.sbp-root :focus-visible{outline:2px solid var(--acc);outline-offset:2px}
@keyframes sbp-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes sbp-pulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--acc) 60%,transparent)}70%{box-shadow:0 0 0 8px transparent}100%{box-shadow:0 0 0 0 transparent}}
@media (prefers-reduced-motion:reduce){.sbp-root *,.sbp-root *::before,.sbp-root *::after{animation:none!important;transition:none!important}}
`;
