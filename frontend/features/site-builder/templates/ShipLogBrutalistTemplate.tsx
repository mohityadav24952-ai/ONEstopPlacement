"use client";

import { useRef, useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { Download, Globe, Mail, MapPin, Moon, Sun } from "lucide-react";
import { SiCodechef, SiCodeforces, SiGithub, SiLeetcode } from "react-icons/si";
import { FaLinkedin, FaXTwitter } from "react-icons/fa6";
import type { PortfolioData, PortfolioProject, TemplateProps } from "@/types/portfolio";
import { accentFor } from "../lib/accent";
import { initials, safeHref, projectImage } from "../lib/links";
import { TechLogo, techIcon } from "../lib/techIcons";
import { useThemeMode } from "../lib/useThemeMode";
import { MascotWidget } from "../mascots/MascotWidget";

/* ───────── helpers ───────── */
const num = (v: number | null | undefined): string =>
  typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("en-US") : "—";
const pad = (i: number): string => String(i).padStart(2, "0");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Small deterministic string hash (decoration only: barcode bars and commit ids). */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hex7(text: string): string {
  return (hash(text).toString(16) + hash(text + "x").toString(16)).padStart(7, "0").slice(0, 7);
}

type IconLike = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
type Social = { key: string; label: string; href: string; Icon: IconLike };

function socialLinks(data: PortfolioData): Social[] {
  const s = data.basics.socials;
  const all: Array<{ key: string; label: string; url?: string; Icon: IconLike }> = [
    { key: "github", label: "GitHub", url: s.github, Icon: SiGithub },
    { key: "linkedin", label: "LinkedIn", url: s.linkedin, Icon: FaLinkedin },
    { key: "twitter", label: "X", url: s.twitter, Icon: FaXTwitter },
    { key: "leetcode", label: "LeetCode", url: s.leetcode, Icon: SiLeetcode },
    { key: "codechef", label: "CodeChef", url: s.codechef, Icon: SiCodechef },
    { key: "codeforces", label: "Codeforces", url: s.codeforces, Icon: SiCodeforces },
    { key: "website", label: "Website", url: s.website, Icon: Globe },
  ];
  const out: Social[] = [];
  for (const a of all) {
    const href = safeHref(a.url);
    if (href) out.push({ key: a.key, label: a.label, href, Icon: a.Icon });
  }
  return out;
}

function Img({ src, alt, className, onFail }: { src: string; alt: string; className?: string; onFail: () => void }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className={className} onError={onFail} />;
}

function Ext({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

/** Deterministic barcode from the handle. Purely decorative. */
function Barcode({ seed }: { seed: string }) {
  const bars: Array<{ x: number; w: number }> = [];
  let x = 0;
  let h = hash(seed);
  for (let i = 0; i < 44; i++) {
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
    const w = 1 + (h % 4);
    if (i % 2 === 0) bars.push({ x, w });
    x += w + 1;
  }
  return (
    <svg viewBox={`0 0 ${x} 40`} className="h-10 w-full" preserveAspectRatio="none" role="img" aria-label={`Barcode for ${seed}`}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={40} fill="currentColor" />)}
    </svg>
  );
}

/* ───────── project crate cover: a mesh gradient unique to each project ───────── */

/** Four to five layered radial gradients whose hues and positions come from a hash of the title,
 * so a project always gets the same look and no two crates look alike. No images, no API. */
function meshFor(seed: string): CSSProperties {
  const h = hash(seed);
  const base = h % 360;
  const step = 28 + ((h >>> 9) % 34); // 28-61 degrees apart: an analogous palette that never mixes to mud
  const hue = (i: number) => (base + i * step) % 360;
  const at = (i: number) => {
    const v = hash(`${seed}#${i}`);
    return `${v % 100}% ${(v >>> 8) % 100}%`;
  };
  const blobs = [1, 2, 3, 4].map((i) => `radial-gradient(at ${at(i)}, hsl(${hue(i)} 92% 62%) 0px, transparent 55%)`);
  return {
    backgroundColor: `hsl(${base} 88% 56%)`,
    backgroundImage: [
      "radial-gradient(rgba(0,0,0,.22) 1px, transparent 1.3px)", // halftone print dots
      ...blobs,
    ].join(", "),
    backgroundSize: "9px 9px, 100% 100%, 100% 100%, 100% 100%, 100% 100%",
  };
}

function TechBadge({ name }: { name: string }) {
  return (
    <li className="ssl-sticker ssl-mono inline-flex items-center gap-1.5 text-[11px] font-black" style={{ background: "#fff", color: "#000" }}>
      <TechLogo name={name} className="h-3.5 w-3.5" />
      {name}
    </li>
  );
}

function CrateCover({ p, index }: { p: PortfolioProject; index: number }) {
  const [failed, setFailed] = useState(false);
  const shot = projectImage(p);
  const stack = p.techStack.slice(0, 4);
  const mark = p.techStack.find((t) => techIcon(t));
  const showShot = shot && !failed;
  return (
    <div className="ssl-cover relative overflow-hidden border-b-2" style={{ borderColor: "var(--ink)", aspectRatio: "16 / 9", ...(showShot ? { background: "var(--m)" } : meshFor(p.title || p.id)) }}>
      {showShot ? (
        <Img src={shot} alt={`Screenshot of ${p.title || "project"}`} className="h-full w-full object-cover" onFail={() => setFailed(true)} />
      ) : (
        <div role="img" aria-label={`${p.title || "Project"} cover`} className="absolute inset-0">
          {/* watermark: the main technology's logo, big and faint */}
          {mark && <TechLogo name={mark} className="ssl-mark absolute -bottom-6 -right-4 h-44 w-44 rotate-[-12deg]" />}
          {/* the crate label: stencil title with a hard offset shadow */}
          <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <p className="ssl-mono text-[10px] font-black tracking-[.25em]" style={{ color: "#000" }}>
              CRATE_{pad(index + 1)}{" // "}{hex7(p.title || p.id).toUpperCase()}
            </p>
            <p className="ssl-display ssl-stencil mt-1 line-clamp-2 text-3xl leading-[.95] sm:text-4xl">{p.title || "Untitled"}</p>
          </div>
        </div>
      )}
      {stack.length > 0 && (
        <ul aria-label="Main technologies" className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          {stack.map((t) => <TechBadge key={t} name={t} />)}
        </ul>
      )}
    </div>
  );
}

/* ───────── project crate ───────── */
function Crate({ p, index }: { p: PortfolioProject; index: number }) {
  const repo = safeHref(p.githubUrl);
  const live = safeHref(p.liveUrl);
  // Status only states what the links prove.
  const status = live ? "DEPLOYED" : repo ? "SOURCE AVAILABLE" : "LOGGED";
  return (
    <article className="ssl-box flex flex-col">
      <header className="ssl-mono flex flex-wrap items-center justify-between gap-2 border-b-2 px-3 py-2 text-xs font-bold" style={{ borderColor: "var(--ink)", background: "var(--y)", color: "#000" }}>
        <span>CRATE #{pad(index + 1)}</span>
        <span>STATUS: {status}</span>
      </header>
      <CrateCover key={`${p.imageUrl ?? ""}|${p.liveUrl ?? ""}`} p={p} index={index} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="ssl-display text-2xl leading-none">{p.title}</h3>
          {p.tagline && <p className="ssl-mono mt-1.5 text-xs font-bold uppercase" style={{ color: "var(--acc)" }}>{p.tagline}</p>}
        </div>
        {p.description && <p className="text-sm leading-relaxed">{p.description}</p>}
        {p.metrics && (
          <p className="ssl-sticker ssl-mono self-start text-xs font-black" style={{ background: "var(--o)", color: "#000" }}>
            IMPACT: {p.metrics}
          </p>
        )}
        {p.techStack.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tech stack">
            {p.techStack.map((t, i) => (
              <li key={t} className="ssl-sticker ssl-mono text-[11px] font-bold" style={{ background: i % 3 === 0 ? "var(--y)" : i % 3 === 1 ? "var(--m)" : "var(--card)", color: i % 3 === 2 ? "var(--ink)" : "#000" }}>{t}</li>
            ))}
          </ul>
        )}
        {(repo || live) && (
          <div className="mt-auto flex flex-wrap gap-3 pt-2">
            {repo && <Ext href={repo} className="ssl-press ssl-mono">SOURCE ↗<span className="sr-only"> (opens in a new tab)</span></Ext>}
            {live && <Ext href={live} className="ssl-press ssl-press-hot ssl-mono">LIVE DEMO ↗<span className="sr-only"> (opens in a new tab)</span></Ext>}
          </div>
        )}
      </div>
    </article>
  );
}

function Heading({ tag, title, id }: { tag: string; title: string; id: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <h2 id={`ssl-${id}`} className="ssl-display text-3xl sm:text-5xl">{title}</h2>
      <span className="ssl-mono ssl-sticker text-xs font-black" style={{ background: "var(--ink)", color: "var(--bg)" }}>{tag}</span>
    </div>
  );
}

const SKILL_ROWS: Array<{ key: keyof PortfolioData["skills"]; label: string }> = [
  { key: "languages", label: "LANGUAGES" },
  { key: "frameworks", label: "FRAMEWORKS" },
  { key: "databasesAndCloud", label: "DATABASES & CLOUD" },
  { key: "aiAndMl", label: "AI & ML" },
  { key: "coreCsAndTools", label: "CORE CS & TOOLS" },
];

/* ───────── template ───────── */
export function ShipLogBrutalistTemplate({ data }: TemplateProps) {
  const [mode, , toggle] = useThemeMode(data.config.themeMode);
  const accent = accentFor(data.config.accentColor);
  const dark = mode === "dark";
  const rootRef = useRef<HTMLDivElement>(null);
  const { basics, codingStats: cs, skills, config } = data;

  const vars = {
    "--bg": dark ? "#0A0A0A" : "#F4F0EA",
    "--ink": dark ? "#F4F0EA" : "#000000",
    "--card": dark ? "#141414" : "#FFFBF5",
    "--shadow": dark ? accent.base : "#000000",
    "--acc": dark ? accent.base : accent.strong,
    "--onacc": dark ? accent.onBase : "#FFFFFF",
    "--y": "#FDE047",
    "--m": "#6EE7B7",
    "--o": "#FF5722",
  } as CSSProperties;

  const links = socialLinks(data);
  const resume = safeHref(basics.resumeUrl);
  const email = basics.email.trim();
  const mail = EMAIL_RE.test(email) ? `mailto:${email}` : undefined;
  const lc = cs.leetcode;
  const cc = cs.codechef;
  const cf = cs.codeforces;
  const gh = cs.github;
  const showStats = config.showCodingStats;
  const hasStats = showStats && !!(lc || cc || cf || gh);
  const projects = [...data.projects].sort((a, b) => Number(b.featured) - Number(a.featured));
  const skillRows = SKILL_ROWS.filter((r) => skills[r.key].length > 0);
  const name = (basics.fullName || config.handle).trim();

  // Ticker: only facts that exist in the data.
  const ticker: string[] = [];
  if (basics.availabilityText) ticker.push(basics.availabilityText.toUpperCase());
  if (basics.headline) ticker.push(basics.headline.toUpperCase());
  if (showStats && lc && lc.totalSolved > 0) ticker.push(`LEETCODE ${num(lc.totalSolved)} SOLVED`);
  if (showStats && cc && cc.rating > 0) ticker.push(`CODECHEF ${num(cc.rating)}${cc.stars ? ` (${cc.stars})` : ""}`);
  if (showStats && cf && cf.rating > 0) ticker.push(`CODEFORCES ${num(cf.rating)}${cf.rank ? ` ${cf.rank.toUpperCase()}` : ""}`);
  if (showStats && gh && gh.publicRepos > 0) ticker.push(`GITHUB ${num(gh.publicRepos)} REPOS`);
  if (ticker.length === 0) ticker.push(name.toUpperCase(), `@${config.handle.toUpperCase()}`);
  const tickerLine = ticker.join("  ★  ");

  const passStats: Array<{ label: string; value: string }> = [];
  if (showStats) {
    if (cc && cc.rating > 0) passStats.push({ label: "CODECHEF", value: `${num(cc.rating)}${cc.stars ? ` ${cc.stars}` : ""}` });
    if (lc && lc.totalSolved > 0) passStats.push({ label: "LEETCODE", value: `${num(lc.totalSolved)} solved` });
    if (cf && cf.rating > 0) passStats.push({ label: "CODEFORCES", value: `${num(cf.rating)}` });
    if (gh && gh.publicRepos > 0) passStats.push({ label: "GITHUB", value: `${num(gh.publicRepos)} repos` });
  }

  const jump = (id: string) => {
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-ssl-sec="${id}"]`);
    const reduce = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const nav: Array<{ id: string; label: string; show: boolean }> = [
    { id: "stats", label: "STATS", show: hasStats },
    { id: "crates", label: "CRATES", show: projects.length > 0 },
    { id: "log", label: "LOG", show: data.experience.length > 0 },
    { id: "specs", label: "SPECS", show: skillRows.length > 0 },
    { id: "edu", label: "EDU", show: data.education.length > 0 || data.achievements.length > 0 },
  ];

  return (
    <div ref={rootRef} className="ssl-root relative min-h-full w-full overflow-x-clip" style={vars} data-theme-mode={mode}>
      <style>{CSS}</style>

      {/* Scrolling ticker */}
      <div className="ssl-ticker border-b-2" style={{ borderColor: "var(--ink)", background: "var(--y)", color: "#000" }}>
        <div className="ssl-track ssl-mono" aria-hidden="true">
          <span>★ {tickerLine} ★&nbsp;&nbsp;</span>
          <span>★ {tickerLine} ★&nbsp;&nbsp;</span>
        </div>
        <p className="sr-only">{tickerLine}</p>
      </div>

      {/* Sticky nav */}
      <nav aria-label="Sections" className="ssl-nav sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2 border-b-2 px-4 py-2 sm:px-6" style={{ borderColor: "var(--ink)" }}>
        <span className="ssl-display text-lg">@{config.handle}</span>
        <div className="flex flex-wrap items-center gap-2">
          {nav.filter((n) => n.show).map((n) => (
            <button key={n.id} type="button" onClick={() => jump(n.id)} className="ssl-navbtn ssl-mono hidden sm:inline-block">{n.label}</button>
          ))}
          <button type="button" onClick={toggle} aria-pressed={dark} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} className="ssl-press ssl-mono inline-flex items-center gap-1.5 !px-3 !py-1.5">
            {dark ? <Sun className="h-3.5 w-3.5" aria-hidden="true" /> : <Moon className="h-3.5 w-3.5" aria-hidden="true" />}
            {dark ? "LIGHT" : "DARK"}
          </button>
        </div>
      </nav>

      <main className="mx-auto flex max-w-6xl flex-col gap-16 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
        {/* Hero + access pass */}
        <section aria-label="Introduction" className="grid items-center gap-10 lg:grid-cols-[1.35fr_1fr]">
          <div className="flex flex-col gap-6">
            {basics.availabilityText && (
              <p className="ssl-sticker ssl-mono self-start text-xs font-black" style={{ background: "var(--m)", color: "#000" }}>{basics.availabilityText.toUpperCase()}</p>
            )}
            <h1 className="ssl-display ssl-giant break-words">{name.toUpperCase()}</h1>
            {basics.headline && <p className="ssl-mono text-sm font-bold uppercase sm:text-base" style={{ color: "var(--acc)" }}>{basics.headline}</p>}
            {basics.shortBio && <p className="max-w-xl text-base font-medium leading-relaxed sm:text-lg">{basics.shortBio}</p>}
            <div className="flex flex-wrap gap-4 pt-1">
              {mail && <a href={mail} className="ssl-press ssl-press-hot ssl-mono inline-flex items-center gap-2"><Mail className="h-4 w-4" aria-hidden="true" />HIRE ME</a>}
              {resume && <Ext href={resume} className="ssl-press ssl-mono inline-flex items-center gap-2"><Download className="h-4 w-4" aria-hidden="true" />RESUME<span className="sr-only"> (opens in a new tab)</span></Ext>}
              {projects.length > 0 && <button type="button" onClick={() => jump("crates")} className="ssl-press ssl-mono">SEE THE CRATES ↓</button>}
            </div>
            {links.length > 0 && (
              <ul className="flex flex-wrap gap-2" aria-label="Social links">
                {links.map(({ key, label, href, Icon }) => (
                  <li key={key}>
                    <Ext href={href} className="ssl-chip ssl-mono inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" aria-hidden="true" />{label}<span className="sr-only"> (opens in a new tab)</span>
                    </Ext>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Access pass on a lanyard */}
          <div className="ssl-lanyard mx-auto flex w-full max-w-xs flex-col items-center">
            <div aria-hidden="true" className="h-10 w-3 border-x-2" style={{ borderColor: "var(--ink)", background: "var(--o)" }} />
            <div className="ssl-pass ssl-box w-full">
              <div className="flex justify-center pt-3" aria-hidden="true">
                <span className="block h-3 w-16 rounded-full border-2" style={{ borderColor: "var(--ink)", background: "var(--bg)" }} />
              </div>
              <div className="flex flex-col items-center gap-3 p-5 text-center">
                <PassPhoto data={data} />
                <div>
                  <p className="ssl-mono text-[10px] font-black tracking-widest" style={{ color: "var(--acc)" }}>ACCESS PASS</p>
                  <p className="ssl-display text-2xl leading-tight">{name}</p>
                  {basics.headline && <p className="ssl-mono mt-1 text-[11px] font-bold uppercase">{basics.headline}</p>}
                </div>
                {passStats.length > 0 && (
                  <dl className="grid w-full grid-cols-2 gap-1.5 text-left">
                    {passStats.map((s) => (
                      <div key={s.label} className="border-2 px-2 py-1" style={{ borderColor: "var(--ink)" }}>
                        <dt className="ssl-mono text-[9px] font-black tracking-widest" style={{ opacity: 0.7 }}>{s.label}</dt>
                        <dd className="ssl-mono text-xs font-black">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="w-full" style={{ color: "var(--ink)" }}>
                  <Barcode seed={config.handle} />
                  <p className="ssl-mono mt-1 text-[10px] font-black tracking-[0.3em]">@{config.handle.toUpperCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {hasStats && (
          <section aria-labelledby="ssl-stats" data-ssl-sec="stats">
            <Heading tag="SYNCED_STATS" title="SCOREBOARD" id="stats" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cc && (
                <StatBox label="CODECHEF" value={num(cc.rating)} sub={[cc.stars, cc.maxRating ? `MAX ${num(cc.maxRating)}` : ""].filter(Boolean).join(" · ")} href={safeHref(cc.profileUrl)} bg="var(--y)" />
              )}
              {lc && (
                <StatBox label="LEETCODE" value={num(lc.totalSolved)} sub="PROBLEMS SOLVED" href={safeHref(lc.profileUrl)} bg="var(--m)">
                  {lc.easySolved + lc.mediumSolved + lc.hardSolved > 0 && (
                    <>
                      <div className="mt-3 flex h-4 border-2" style={{ borderColor: "#000" }} role="img" aria-label={`Easy ${lc.easySolved}, medium ${lc.mediumSolved}, hard ${lc.hardSolved}`}>
                        <span style={{ flex: lc.easySolved, background: "#16A34A" }} />
                        <span style={{ flex: lc.mediumSolved, background: "#F59E0B" }} />
                        <span style={{ flex: lc.hardSolved, background: "#DC2626" }} />
                      </div>
                      <p className="ssl-mono mt-1.5 text-[11px] font-black">E {num(lc.easySolved)} / M {num(lc.mediumSolved)} / H {num(lc.hardSolved)}</p>
                    </>
                  )}
                </StatBox>
              )}
              {cf && <StatBox label="CODEFORCES" value={num(cf.rating)} sub={[cf.rank, cf.maxRating ? `MAX ${num(cf.maxRating)}` : ""].filter(Boolean).join(" · ")} href={safeHref(cf.profileUrl)} bg="var(--card)" dark={dark} />}
              {gh && (
                <StatBox label="GITHUB" value={num(gh.publicRepos)} sub={`REPOS · ${num(gh.totalStars)} STARS · ${num(gh.followers)} FOLLOWERS`} href={safeHref(gh.profileUrl)} bg="var(--o)">
                  {gh.topLanguages.length > 0 && <p className="ssl-mono mt-2 text-[11px] font-black">{gh.topLanguages.slice(0, 5).join(" / ")}</p>}
                </StatBox>
              )}
            </div>
          </section>
        )}

        {basics.longBio && (
          <section aria-labelledby="ssl-about" className="ssl-box p-5 sm:p-7">
            <h2 id="ssl-about" className="ssl-display mb-3 text-2xl">THE MANIFESTO</h2>
            <p className="max-w-3xl text-base leading-relaxed">{basics.longBio}</p>
          </section>
        )}

        {projects.length > 0 && (
          <section aria-labelledby="ssl-crates" data-ssl-sec="crates">
            <Heading tag="SHIPMENT_LOG // PROOF OF WORK" title="PROJECT CRATES" id="crates" />
            <div className="grid gap-7 md:grid-cols-2">
              {projects.map((p, i) => <Crate key={p.id} p={p} index={i} />)}
            </div>
          </section>
        )}

        {data.experience.length > 0 && (
          <section aria-labelledby="ssl-log" data-ssl-sec="log">
            <Heading tag="git log --oneline" title="EXPERIENCE LOG" id="log" />
            <ol className="ssl-mono flex flex-col gap-5">
              {data.experience.map((e, i) => {
                const co = safeHref(e.companyUrl);
                return (
                  <li key={e.id} className="ssl-box p-4 text-sm">
                    <p className="font-black" style={{ color: "var(--acc)" }}>
                      commit {hex7(e.id + e.role + e.company)}
                      {i === 0 && <span className="ml-2" style={{ color: "var(--o)" }}>(HEAD → main)</span>}
                    </p>
                    {basics.fullName && <p className="mt-1">Author: {basics.fullName}</p>}
                    {(e.startDate || e.endDate) && <p>Date:   {[e.startDate, e.endDate].filter(Boolean).join(" → ")}{e.location ? `  ·  ${e.location}` : ""}</p>}
                    <p className="mt-3 text-base font-black">
                      {e.role}{e.role && e.company ? " @ " : ""}{co ? <Ext href={co} className="underline decoration-2 underline-offset-4">{e.company}</Ext> : e.company}
                    </p>
                    {e.descriptionBullets.length > 0 && (
                      <ul className="mt-2 space-y-1.5 font-sans text-sm leading-relaxed">
                        {e.descriptionBullets.map((b, bi) => <li key={bi} className="flex gap-2"><span className="ssl-mono font-black" aria-hidden="true">+</span><span>{b}</span></li>)}
                      </ul>
                    )}
                    {e.techUsed.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Technologies used">
                        {e.techUsed.map((t) => <li key={t} className="ssl-sticker text-[11px] font-bold" style={{ background: "var(--m)", color: "#000" }}>{t}</li>)}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {skillRows.length > 0 && (
          <section aria-labelledby="ssl-specs" data-ssl-sec="specs">
            <Heading tag="SPEC_TABLE" title="SPECIFICATIONS" id="specs" />
            <dl className="ssl-box">
              {skillRows.map((r, i) => (
                <div key={r.key} className={`grid gap-2 p-4 sm:grid-cols-[200px_1fr] ${i > 0 ? "border-t-2" : ""}`} style={{ borderColor: "var(--ink)" }}>
                  <dt className="ssl-mono text-xs font-black tracking-widest" style={{ color: "var(--acc)" }}>{r.label}</dt>
                  <dd>
                    <ul className="flex flex-wrap gap-1.5">
                      {skills[r.key].map((s, si) => (
                        <li key={s} className="ssl-sticker ssl-mono text-[11px] font-bold" style={{ background: si % 3 === 0 ? "var(--y)" : si % 3 === 1 ? "var(--m)" : "var(--card)", color: si % 3 === 2 ? "var(--ink)" : "#000" }}>{s}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {(data.education.length > 0 || data.achievements.length > 0) && (
          <section aria-labelledby="ssl-edu" data-ssl-sec="edu" className="grid gap-10 lg:grid-cols-2">
            {data.education.length > 0 && (
              <div>
                <Heading tag="CREDENTIALS" title="EDUCATION" id="edu" />
                <div className="flex flex-col gap-5">
                  {data.education.map((ed) => (
                    <article key={ed.id} className="ssl-box p-4">
                      <h3 className="ssl-display text-xl leading-tight">{ed.degree}</h3>
                      <p className="mt-1 text-sm font-medium">{[ed.institution, ed.location].filter(Boolean).join(" · ")}</p>
                      <p className="ssl-mono mt-1 text-xs font-bold" style={{ color: "var(--acc)" }}>{[[ed.startYear, ed.endYear].filter(Boolean).join(" → "), ed.score].filter(Boolean).join("  |  ")}</p>
                      {ed.highlights && ed.highlights.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm">{ed.highlights.map((h, i) => <li key={i}>— {h}</li>)}</ul>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            )}
            {data.achievements.length > 0 && (
              <div>
                <Heading tag="TROPHY_CASE" title="ACHIEVEMENTS" id="ach" />
                <div className="flex flex-col gap-5">
                  {data.achievements.map((a, i) => {
                    const proof = safeHref(a.proofUrl);
                    return (
                      <article key={a.id} className="ssl-box p-4" style={{ background: i % 2 === 0 ? "var(--y)" : "var(--m)", color: "#000" }}>
                        <h3 className="ssl-display text-xl leading-tight">{a.title}</h3>
                        <p className="ssl-mono mt-1 text-xs font-black">{[a.issuer, a.date].filter(Boolean).join(" · ")}</p>
                        {a.description && <p className="mt-1.5 text-sm font-medium">{a.description}</p>}
                        {proof && <Ext href={proof} className="ssl-mono mt-2 inline-block text-xs font-black underline decoration-2 underline-offset-4">PROOF ↗<span className="sr-only"> for {a.title} (opens in a new tab)</span></Ext>}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Contact footer */}
        <footer className="ssl-box flex flex-col gap-5 p-6 sm:p-8" aria-label="Contact">
          <p className="ssl-display text-4xl leading-none sm:text-6xl">LET&apos;S SHIP SOMETHING.</p>
          <div className="flex flex-wrap gap-4">
            {mail && <a href={mail} className="ssl-press ssl-press-hot ssl-mono inline-flex items-center gap-2"><Mail className="h-4 w-4" aria-hidden="true" />{email}</a>}
            {basics.location && <span className="ssl-chip ssl-mono inline-flex items-center gap-2"><MapPin className="h-4 w-4" aria-hidden="true" />{basics.location}</span>}
          </div>
          {links.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Find me online">
              {links.map(({ key, label, href, Icon }) => (
                <li key={key}><Ext href={href} className="ssl-chip ssl-mono inline-flex items-center gap-2"><Icon className="h-4 w-4" aria-hidden="true" />{label}<span className="sr-only"> (opens in a new tab)</span></Ext></li>
              ))}
            </ul>
          )}
        </footer>
      </main>

      <MascotWidget data={data} themeMode={mode} />
    </div>
  );
}

function PassPhoto({ data }: { data: PortfolioData }) {
  const [failed, setFailed] = useState(false);
  const src = safeHref(data.basics.avatarUrl) ?? safeHref(data.codingStats.github?.avatarUrl);
  const name = data.basics.fullName || data.config.handle;
  return (
    <div className="h-28 w-28 overflow-hidden border-2" style={{ borderColor: "var(--ink)", background: "var(--m)" }}>
      {src && !failed ? (
        <Img src={src} alt={`${name} photo`} className="h-full w-full object-cover" onFail={() => setFailed(true)} />
      ) : (
        <div className="ssl-display flex h-full w-full items-center justify-center text-4xl" style={{ color: "#000" }} aria-hidden="true">{initials(name)}</div>
      )}
    </div>
  );
}

function StatBox({ label, value, sub, href, bg, dark, children }: { label: string; value: string; sub?: string; href?: string; bg: string; dark?: boolean; children?: ReactNode }) {
  const fg = bg === "var(--card)" && dark ? "var(--ink)" : "#000";
  return (
    <div className="ssl-box flex flex-col p-4" style={{ background: bg, color: fg }}>
      <div className="flex items-center justify-between gap-2">
        <span className="ssl-mono text-xs font-black tracking-widest">{label}</span>
        {href && <Ext href={href} className="ssl-mono text-[11px] font-black underline decoration-2 underline-offset-4">OPEN ↗<span className="sr-only"> {label} profile (opens in a new tab)</span></Ext>}
      </div>
      <p className="ssl-display mt-2 text-5xl leading-none">{value}</p>
      {sub && <p className="ssl-mono mt-1 text-[11px] font-black">{sub}</p>}
      {children}
    </div>
  );
}

const CSS = `
.ssl-root{background:var(--bg);color:var(--ink);font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;transition:background-color .2s,color .2s}
.ssl-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ssl-display{font-family:"Arial Black","Archivo Black",Impact,ui-sans-serif,system-ui,sans-serif;font-weight:900;letter-spacing:-.02em;text-transform:uppercase}
.ssl-giant{font-size:clamp(2.6rem,9vw,6.2rem);line-height:.92}
.ssl-box{border:2px solid var(--ink);background:var(--card);box-shadow:5px 5px 0 0 var(--shadow)}
.ssl-sticker{display:inline-block;border:2px solid #000;padding:.15rem .5rem;box-shadow:2px 2px 0 0 #000}
.ssl-chip{border:2px solid var(--ink);padding:.35rem .7rem;font-size:.75rem;font-weight:700;background:var(--card);transition:transform .12s,box-shadow .12s}
.ssl-chip:hover{transform:translate(-2px,-2px);box-shadow:3px 3px 0 0 var(--shadow)}
.ssl-press{display:inline-block;border:2px solid var(--ink);background:var(--card);color:var(--ink);padding:.7rem 1.15rem;font-size:.8rem;font-weight:900;letter-spacing:.05em;cursor:pointer;box-shadow:5px 5px 0 0 var(--shadow);transition:transform .08s,box-shadow .08s}
.ssl-press:hover,.ssl-press:focus-visible{transform:translate(3px,3px);box-shadow:2px 2px 0 0 var(--shadow)}
.ssl-press:active{transform:translate(5px,5px);box-shadow:0 0 0 0 var(--shadow)}
.ssl-press-hot{background:var(--acc);color:var(--onacc)}
.ssl-nav{background:var(--bg)}
.ssl-navbtn{border:2px solid transparent;padding:.25rem .6rem;font-size:.75rem;font-weight:900;color:var(--ink);background:transparent;cursor:pointer}
.ssl-navbtn:hover{border-color:var(--ink);background:var(--y);color:#000}
.ssl-ticker{overflow:hidden;white-space:nowrap}
.ssl-track{display:inline-flex;font-weight:900;font-size:.8rem;padding:.45rem 0;animation:ssl-marquee 38s linear infinite}
.ssl-ticker:hover .ssl-track{animation-play-state:paused}
.ssl-stencil{color:#fff;text-shadow:3px 3px 0 #000;-webkit-text-stroke:1.5px #000;paint-order:stroke fill}
.ssl-mark{color:#000;opacity:.16;transition:transform .35s cubic-bezier(.3,1.4,.5,1)}
.ssl-box:hover .ssl-mark{transform:rotate(-4deg) scale(1.06)}
.ssl-cover{transition:background-position .6s ease}
.ssl-stripes{background-image:repeating-linear-gradient(45deg,var(--y) 0 14px,var(--bg) 14px 28px)}
.ssl-lanyard .ssl-pass{transform:rotate(2.5deg);transform-origin:50% 0;transition:transform .35s cubic-bezier(.3,1.4,.5,1)}
.ssl-lanyard:hover .ssl-pass{transform:rotate(-1deg)}
.ssl-root :focus-visible{outline:3px solid var(--acc);outline-offset:3px}
@keyframes ssl-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){.ssl-root *,.ssl-root *::before,.ssl-root *::after{animation:none!important;transition:none!important}.ssl-ticker{overflow-x:auto}}
`;
