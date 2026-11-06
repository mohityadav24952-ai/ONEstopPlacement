"use client";

import { Fragment, useId, useMemo, useState } from "react";
import { ChevronDown, Download, Moon, Search, Sun, X } from "lucide-react";
import { FaGithub, FaGlobe, FaLinkedin, FaXTwitter } from "react-icons/fa6";
import type { PortfolioAchievement, PortfolioEducation, PortfolioExperience, PortfolioProject, TemplateProps } from "@/types/portfolio";
import { accentFor } from "../lib/accent";
import { firstName, hostOf, initials, safeHref, slugify, projectCover } from "../lib/links";
import { useThemeMode } from "../lib/useThemeMode";
import { MascotWidget } from "../mascots/MascotWidget";

/* ───────── search helpers ───────── */

type Tab = "all" | "projects" | "coding" | "experience" | "skills" | "education";

const num = (n: number | undefined | null): string => (typeof n === "number" && Number.isFinite(n) ? n.toLocaleString("en-US") : "-");
const dateRange = (a: string, b: string): string => [a, b].filter(Boolean).join(" - ");

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[.,;:!?()"'“”]+|[.,;:!?()"'“”]+$/g, ""))
    .filter((t) => /[a-z0-9]/.test(t));
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matches(tokens: string[], ...parts: Array<string | string[] | undefined | null>): boolean {
  if (tokens.length === 0) return true;
  const hay = parts
    .flat()
    .filter((p): p is string => typeof p === "string")
    .join(" \n ")
    .toLowerCase();
  return tokens.every((t) => hay.includes(t));
}

function Hl({ text, tokens }: { text: string; tokens: string[] }) {
  if (tokens.length === 0 || !text) return <>{text}</>;
  const re = new RegExp(`(${tokens.map(escapeRe).join("|")})`, "gi");
  const bits = text.split(re);
  return (
    <>
      {bits.map((b, i) => (i % 2 === 1 ? <mark key={i} className="sds-mark">{b}</mark> : <Fragment key={i}>{b}</Fragment>))}
    </>
  );
}

function palette(mode: "dark" | "light") {
  return mode === "dark"
    ? { bg: "#202124", bar: "#303134", card: "#303134", border: "#3C4043", text: "#E8EAED", muted: "#BDC1C6", link: "#8AB4F8", crumb: "#81C995", hover: "#3C4043", mark: "rgba(253,214,99,0.28)" }
    : { bg: "#FFFFFF", bar: "#F8F9FA", card: "#FFFFFF", border: "#DADCE0", text: "#202124", muted: "#4D5156", link: "#1A0DAB", crumb: "#188038", hover: "#F1F3F4", mark: "rgba(253,214,99,0.55)" };
}

/* ───────── small pieces ───────── */

function Thumb({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const href = safeHref(src);
  if (!href || failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={href} alt={`Screenshot of ${title || "project"}`} loading="lazy" onError={() => setFailed(true)} className="sds-thumb" />;
}

function Portrait({ src, name }: { src?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const href = safeHref(src);
  if (!href || failed) {
    return (
      <span aria-hidden="true" className="sds-portrait sds-portrait-fallback">
        {initials(name)}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={href} alt={`${name || "Portfolio owner"} photo`} onError={() => setFailed(true)} className="sds-portrait" />;
}

function ResultHead({ letter, crumb, children }: { letter: string; crumb: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="sds-fav">{letter.charAt(0).toUpperCase() || "?"}</span>
        <p className="sds-crumb min-w-0 truncate">{crumb}</p>
      </div>
      <h3 className="sds-title">{children}</h3>
    </>
  );
}

function TitleLink({ href, children }: { href?: string; children: React.ReactNode }) {
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="sds-titlelink">
      {children}
    </a>
  ) : (
    <span className="sds-titlelink sds-titletext">{children}</span>
  );
}

/* ───────── template ───────── */

export function DevSearchTemplate({ data, onUpdateConfig }: TemplateProps) {
  const { config, basics, codingStats, skills, projects, experience, education, achievements } = data;
  const [mode, , toggleMode] = useThemeMode(config.themeMode);
  const accent = accentFor(config.accentColor);
  const pal = palette(mode);
  const acc = mode === "dark" ? accent.base : accent.strong;
  const name = basics.fullName || config.handle;
  const fn = firstName(basics.fullName || config.handle);
  const initialQuery = useMemo(() => [basics.fullName, basics.headline].filter(Boolean).join(" — ") || config.handle, [basics.fullName, basics.headline, config.handle]);
  const [query, setQuery] = useState(initialQuery);
  const [tab, setTab] = useState<Tab>("all");
  const [open, setOpen] = useState<number | null>(null);
  const uid = useId();

  const pristine = query === initialQuery;
  const tokens = useMemo(() => (pristine ? [] : tokenize(query)), [pristine, query]);
  const base = `https://${config.handle}.onestop.tech`;

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    toggleMode();
    onUpdateConfig?.({ themeMode: next });
  };

  /* ---- filtered result sets ---- */
  const fProjects = useMemo(() => projects.filter((p) => matches(tokens, p.title, p.tagline, p.description, p.techStack, p.metrics, p.year)), [projects, tokens]);
  const fExperience = useMemo(() => experience.filter((e) => matches(tokens, e.role, e.company, e.location, e.descriptionBullets, e.techUsed, e.startDate, e.endDate)), [experience, tokens]);
  const fEducation = useMemo(() => education.filter((e) => matches(tokens, e.degree, e.institution, e.location, e.score, e.highlights ?? [])), [education, tokens]);
  const fAchievements = useMemo(() => achievements.filter((a) => matches(tokens, a.title, a.issuer, a.description, a.date)), [achievements, tokens]);

  const skillGroups = useMemo(
    () =>
      [
        ["Languages", skills.languages],
        ["Frameworks", skills.frameworks],
        ["Databases & Cloud", skills.databasesAndCloud],
        ["AI & ML", skills.aiAndMl],
        ["Core CS & Tools", skills.coreCsAndTools],
      ]
        .map(([label, list]) => ({ label: label as string, items: (list as string[]).filter((s) => matches(tokens, s, label as string)) }))
        .filter((g) => g.items.length > 0),
    [skills, tokens],
  );
  const skillCount = skillGroups.reduce((n, g) => n + g.items.length, 0);
  const allSkillCount = skills.languages.length + skills.frameworks.length + skills.databasesAndCloud.length + skills.aiAndMl.length + skills.coreCsAndTools.length;

  const { leetcode, codechef, codeforces, github } = codingStats;
  const coding = useMemo(() => {
    if (!config.showCodingStats) return [];
    const out: { id: string; platform: string; title: string; url?: string; snippet: string }[] = [];
    if (leetcode)
      out.push({
        id: "leetcode",
        platform: "LeetCode",
        title: `${leetcode.username} - LeetCode profile`,
        url: safeHref(leetcode.profileUrl),
        snippet: `${num(leetcode.totalSolved)} problems solved (${num(leetcode.easySolved)} easy, ${num(leetcode.mediumSolved)} medium, ${num(leetcode.hardSolved)} hard).${typeof leetcode.rating === "number" && leetcode.rating > 0 ? ` Contest rating ${num(Math.round(leetcode.rating))}.` : ""}`,
      });
    if (codechef)
      out.push({
        id: "codechef",
        platform: "CodeChef",
        title: `${codechef.username} - CodeChef profile`,
        url: safeHref(codechef.profileUrl),
        snippet: `${[codechef.stars, codechef.rating > 0 ? `rating ${num(codechef.rating)}` : ""].filter(Boolean).join(", ")}${codechef.maxRating > 0 ? `. Highest rating ${num(codechef.maxRating)}` : ""}.`,
      });
    if (codeforces)
      out.push({
        id: "codeforces",
        platform: "Codeforces",
        title: `${codeforces.username} - Codeforces profile`,
        url: safeHref(codeforces.profileUrl),
        snippet: `${[codeforces.rank, codeforces.rating > 0 ? `rating ${num(codeforces.rating)}` : ""].filter(Boolean).join(", ")}${codeforces.maxRating > 0 ? `. Max rating ${num(codeforces.maxRating)}` : ""}.`,
      });
    if (github)
      out.push({
        id: "github",
        platform: "GitHub",
        title: `${github.username} - GitHub profile`,
        url: safeHref(github.profileUrl),
        snippet: `${num(github.publicRepos)} public repositories, ${num(github.totalStars)} stars, ${num(github.followers)} followers.${github.topLanguages.length ? ` Top languages: ${github.topLanguages.join(", ")}.` : ""}`,
      });
    return out;
  }, [config.showCodingStats, leetcode, codechef, codeforces, github]);
  const fCoding = useMemo(() => coding.filter((c) => matches(tokens, c.platform, c.title, c.snippet)), [coding, tokens]);

  const counts = {
    projects: fProjects.length,
    coding: fCoding.length,
    experience: fExperience.length,
    skills: skillCount,
    education: fEducation.length + fAchievements.length,
  };
  const total = counts.projects + counts.coding + counts.experience + counts.skills + counts.education;

  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "all", label: "All", show: true },
    { id: "projects", label: `Projects (${counts.projects})`, show: projects.length > 0 },
    { id: "coding", label: "Coding Profiles", show: coding.length > 0 },
    { id: "experience", label: "Experience", show: experience.length > 0 },
    { id: "skills", label: "Skills", show: allSkillCount > 0 },
    { id: "education", label: "Education & Honors", show: education.length + achievements.length > 0 },
  ];
  const activeTab: Tab = tabs.find((t) => t.id === tab && t.show) ? tab : "all";
  const see = (t: Tab) => activeTab === "all" || activeTab === t;

  /* ---- people also ask: answers come straight from the data ---- */
  const featured = projects.filter((p) => p.featured);
  const topProjects = (featured.length > 0 ? featured : projects).slice(0, 3);
  const paa: { q: string; a: React.ReactNode }[] = [];
  if (topProjects.length > 0)
    paa.push({
      q: `What are ${fn}'s top projects?`,
      a: (
        <ul className="list-disc space-y-1 pl-5">
          {topProjects.map((p) => (
            <li key={p.id}>
              <b>{p.title}</b>
              {p.tagline ? `: ${p.tagline}` : ""}
            </li>
          ))}
        </ul>
      ),
    });
  if (coding.length > 0)
    paa.push({
      q: `What are ${fn}'s competitive programming and coding profile stats?`,
      a: (
        <ul className="list-disc space-y-1 pl-5">
          {coding.map((c) => (
            <li key={c.id}>
              <b>{c.platform}:</b> {c.snippet}
            </li>
          ))}
        </ul>
      ),
    });
  if (experience.length > 0)
    paa.push({
      q: `What is ${fn}'s work experience?`,
      a: (
        <ul className="list-disc space-y-1 pl-5">
          {experience.map((e) => (
            <li key={e.id}>
              <b>{e.role}</b>
              {e.company ? ` at ${e.company}` : ""}
              {dateRange(e.startDate, e.endDate) ? ` (${dateRange(e.startDate, e.endDate)})` : ""}
            </li>
          ))}
        </ul>
      ),
    });
  const emailOk = /^[^\s@]+@[^\s@]+$/.test(basics.email);
  const socialList = [
    { label: "GitHub", url: safeHref(basics.socials.github), icon: <FaGithub aria-hidden="true" /> },
    { label: "LinkedIn", url: safeHref(basics.socials.linkedin), icon: <FaLinkedin aria-hidden="true" /> },
    { label: "X / Twitter", url: safeHref(basics.socials.twitter), icon: <FaXTwitter aria-hidden="true" /> },
    { label: "Website", url: safeHref(basics.socials.website), icon: <FaGlobe aria-hidden="true" /> },
  ].filter((s): s is { label: string; url: string; icon: React.ReactElement } => !!s.url);
  if (emailOk || socialList.length > 0)
    paa.push({
      q: `How can I hire or contact ${fn}?`,
      a: (
        <p>
          {emailOk && (
            <>
              Email <a className="sds-link" href={`mailto:${basics.email}`}>{basics.email}</a>.{" "}
            </>
          )}
          {socialList.length > 0 && (
            <>
              Also on{" "}
              {socialList.map((s, i) => (
                <Fragment key={s.label}>
                  {i > 0 ? ", " : ""}
                  <a className="sds-link" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
                </Fragment>
              ))}
              .
            </>
          )}
          {basics.availabilityText ? ` ${basics.availabilityText}.` : ""}
        </p>
      ),
    });

  const resumeHref = safeHref(basics.resumeUrl);
  const snippetSkills = [...skills.languages, ...skills.frameworks, ...skills.aiAndMl].slice(0, 8);
  const showSnippet = pristine && activeTab === "all" && (basics.shortBio || basics.longBio || achievements.length > 0 || snippetSkills.length > 0);

  const facts: [string, React.ReactNode][] = [];
  if (basics.location) facts.push(["Location", basics.location]);
  if (education[0]) facts.push(["Education", [education[0].degree, education[0].institution].filter(Boolean).join(", ")]);
  if (config.showCodingStats) {
    if (leetcode) facts.push(["LeetCode", `${num(leetcode.totalSolved)} solved`]);
    if (codechef) facts.push(["CodeChef", [codechef.stars, codechef.rating > 0 ? num(codechef.rating) : ""].filter(Boolean).join(" ") || codechef.username]);
    if (codeforces) facts.push(["Codeforces", [codeforces.rank, codeforces.rating > 0 ? num(codeforces.rating) : ""].filter(Boolean).join(" ") || codeforces.username]);
    if (github) facts.push(["GitHub", `${num(github.publicRepos)} repositories`]);
  }

  const cssVars = {
    "--sds-bg": pal.bg,
    "--sds-bar": pal.bar,
    "--sds-card": pal.card,
    "--sds-border": pal.border,
    "--sds-text": pal.text,
    "--sds-muted": pal.muted,
    "--sds-link": pal.link,
    "--sds-crumb": pal.crumb,
    "--sds-hover": pal.hover,
    "--sds-mark": pal.mark,
    "--sds-accent": acc,
    "--sds-on-accent": mode === "dark" ? accent.onBase : "#FFFFFF",
  } as React.CSSProperties;

  const noResults = total === 0 && !pristine;
  const statsLine = pristine
    ? `${total} entr${total === 1 ? "y" : "ies"} in ${name}'s portfolio`
    : `${total} result${total === 1 ? "" : "s"} for “${query.trim()}”`;

  return (
    <div className="sds-root min-h-full w-full" style={cssVars}>
      <style>{CSS}</style>

      <header className="sds-header">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 pt-3 sm:px-6">
          <span className="sds-logo" aria-label="DevSearch">
            <span style={{ color: "var(--sds-accent)" }}>Dev</span>Search
          </span>
          <form role="search" className="sds-search order-3 w-full sm:order-none sm:w-auto sm:flex-1" onSubmit={(e) => e.preventDefault()}>
            <Search size={17} aria-hidden="true" className="sds-search-icon" />
            <label htmlFor={`${uid}-q`} className="sr-only">
              Search this portfolio
            </label>
            <input id={`${uid}-q`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" spellCheck={false} placeholder="Search projects, skills, experience…" />
            {query && (
              <button type="button" className="sds-clear" aria-label="Clear search" onClick={() => setQuery("")}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </form>
          <button type="button" onClick={toggle} className="sds-iconbtn ml-auto sm:ml-0" aria-label={mode === "dark" ? "Switch to light theme" : "Switch to dark theme"} aria-pressed={mode === "light"}>
            {mode === "dark" ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div role="tablist" aria-label="Result categories" className="sds-tabs">
            {tabs
              .filter((t) => t.show)
              .map((t) => (
                <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} className="sds-tab" onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        {/* The layout imitates search results, so the page title is not visible; screen readers and
            search engines still get one. */}
        <h1 className="sr-only">{basics.headline ? `${name}, ${basics.headline}` : name}</h1>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 max-w-[680px]">
            <p role="status" aria-live="polite" className="sds-muted mb-4 text-sm">
              {statsLine}
            </p>

            {noResults && (
              <div className="sds-card">
                <p className="font-medium">Nothing in {fn}&apos;s portfolio matched “{query.trim()}”.</p>
                <p className="sds-muted mt-1 text-sm">Try a technology name such as a language or framework, or clear the search.</p>
                <button type="button" className="sds-link mt-2 underline" onClick={() => setQuery("")}>
                  Clear search
                </button>
              </div>
            )}

            {showSnippet && (
              <section aria-label="Featured snippet" className="sds-card mb-6">
                {(basics.shortBio || basics.longBio) && <p className="leading-relaxed">{basics.shortBio || basics.longBio}</p>}
                {achievements.length > 0 && (
                  <>
                    <p className="sds-label mt-3">Highlights</p>
                    <ul className="list-disc pl-5 text-sm leading-relaxed">
                      {achievements.slice(0, 3).map((a) => (
                        <li key={a.id}>{a.title}</li>
                      ))}
                    </ul>
                  </>
                )}
                {snippetSkills.length > 0 && (
                  <>
                    <p className="sds-label mt-3">Core tech stack</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {snippetSkills.map((s) => (
                        <li key={s}>
                          <button type="button" className="sds-chip" onClick={() => setQuery(s)}>
                            {s}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <p className="sds-crumb mt-3 truncate">{base}</p>
              </section>
            )}

            {activeTab === "all" && pristine && paa.length > 0 && (
              <section aria-label="People also ask" className="mb-6">
                <h2 className="mb-2 text-lg font-medium">People also ask</h2>
                <div className="sds-paa">
                  {paa.map((item, i) => {
                    const isOpen = open === i;
                    return (
                      <div key={item.q} className="sds-paa-item">
                        <h3>
                          <button type="button" aria-expanded={isOpen} aria-controls={`${uid}-paa-${i}`} id={`${uid}-paa-h-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                            <span>{item.q}</span>
                            <ChevronDown size={18} aria-hidden="true" className={isOpen ? "rotate-180" : ""} />
                          </button>
                        </h3>
                        <div id={`${uid}-paa-${i}`} role="region" aria-labelledby={`${uid}-paa-h-${i}`} hidden={!isOpen} className="sds-paa-body text-sm leading-relaxed">
                          {item.a}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {see("projects") && fProjects.length > 0 && (
              <section aria-label="Projects" className="mb-6 space-y-6">
                {activeTab === "all" && <h2 className="sds-section">Projects</h2>}
                {fProjects.map((p: PortfolioProject) => {
                  const href = safeHref(p.liveUrl) ?? safeHref(p.githubUrl);
                  const gh = safeHref(p.githubUrl);
                  const live = safeHref(p.liveUrl);
                  return (
                    <article key={p.id} className="flex gap-4">
                      <div className="min-w-0 flex-1">
                        <ResultHead letter={p.title} crumb={`${base} › projects › ${slugify(p.title)}`}>
                          <TitleLink href={href}>
                            <Hl text={p.title} tokens={tokens} />
                          </TitleLink>
                        </ResultHead>
                        <p className="sds-snippet">
                          {p.year ? <span className="sds-muted">{p.year} — </span> : null}
                          <Hl text={p.description || p.tagline} tokens={tokens} />
                        </p>
                        {p.metrics && (
                          <p className="sds-snippet sds-muted mt-1">
                            <Hl text={p.metrics} tokens={tokens} />
                          </p>
                        )}
                        {(p.techStack.length > 0 || gh || live) && (
                          <ul className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            {p.techStack.map((t) => (
                              <li key={t}>
                                <button type="button" className="sds-sublink" onClick={() => setQuery(t)} aria-label={`Search for ${t}`}>
                                  <Hl text={t} tokens={tokens} />
                                </button>
                              </li>
                            ))}
                            {live && (
                              <li>
                                <a className="sds-sublink sds-ext" href={live} target="_blank" rel="noopener noreferrer">
                                  Live ({hostOf(live)})
                                </a>
                              </li>
                            )}
                            {gh && (
                              <li>
                                <a className="sds-sublink sds-ext" href={gh} target="_blank" rel="noopener noreferrer">
                                  Source
                                </a>
                              </li>
                            )}
                          </ul>
                        )}
                      </div>
                      <Thumb key={p.imageUrl ?? p.id} src={projectCover(p)} title={p.title} />
                    </article>
                  );
                })}
              </section>
            )}

            {see("coding") && fCoding.length > 0 && (
              <section aria-label="Coding profiles" className="mb-6 space-y-5">
                {activeTab === "all" && <h2 className="sds-section">Coding profiles</h2>}
                {fCoding.map((c) => (
                  <article key={c.id}>
                    <ResultHead letter={c.platform} crumb={`${base} › coding › ${c.id}`}>
                      <TitleLink href={c.url}>
                        <Hl text={c.title} tokens={tokens} />
                      </TitleLink>
                    </ResultHead>
                    <p className="sds-snippet">
                      <Hl text={c.snippet} tokens={tokens} />
                    </p>
                  </article>
                ))}
              </section>
            )}

            {see("experience") && fExperience.length > 0 && (
              <section aria-label="Experience" className="mb-6 space-y-5">
                {activeTab === "all" && <h2 className="sds-section">Experience</h2>}
                {fExperience.map((e: PortfolioExperience) => (
                  <article key={e.id}>
                    <ResultHead letter={e.company || e.role} crumb={`${base} › experience › ${slugify(e.company || e.role)}`}>
                      <TitleLink href={safeHref(e.companyUrl)}>
                        <Hl text={[e.role, e.company].filter(Boolean).join(" · ")} tokens={tokens} />
                      </TitleLink>
                    </ResultHead>
                    <p className="sds-muted text-sm">{[dateRange(e.startDate, e.endDate), e.location].filter(Boolean).join(" · ")}</p>
                    {e.descriptionBullets.length > 0 && (
                      <ul className="sds-snippet mt-1 list-disc pl-5">
                        {e.descriptionBullets.map((b, i) => (
                          <li key={i}>
                            <Hl text={b} tokens={tokens} />
                          </li>
                        ))}
                      </ul>
                    )}
                    {e.techUsed.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                        {e.techUsed.map((t) => (
                          <li key={t}>
                            <button type="button" className="sds-sublink" onClick={() => setQuery(t)} aria-label={`Search for ${t}`}>
                              <Hl text={t} tokens={tokens} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
              </section>
            )}

            {see("skills") && skillGroups.length > 0 && (
              <section aria-label="Skills" className="mb-6">
                {activeTab === "all" && <h2 className="sds-section mb-2">Skills</h2>}
                <div className="space-y-3">
                  {skillGroups.map((g) => (
                    <div key={g.label}>
                      <p className="sds-label">{g.label}</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {g.items.map((s) => (
                          <li key={s}>
                            <button type="button" className="sds-chip" onClick={() => setQuery(s)} aria-label={`Search for ${s}`}>
                              <Hl text={s} tokens={tokens} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {see("education") && (fEducation.length > 0 || fAchievements.length > 0) && (
              <section aria-label="Education and honors" className="mb-6 space-y-5">
                {activeTab === "all" && <h2 className="sds-section">Education &amp; honors</h2>}
                {fEducation.map((ed: PortfolioEducation) => (
                  <article key={ed.id}>
                    <ResultHead letter={ed.institution || ed.degree} crumb={`${base} › education › ${slugify(ed.institution || ed.degree)}`}>
                      <span className="sds-titlelink sds-titletext">
                        <Hl text={[ed.degree, ed.institution].filter(Boolean).join(" · ")} tokens={tokens} />
                      </span>
                    </ResultHead>
                    <p className="sds-muted text-sm">{[dateRange(ed.startYear, ed.endYear), ed.location, ed.score].filter(Boolean).join(" · ")}</p>
                    {ed.highlights && ed.highlights.length > 0 && (
                      <ul className="sds-snippet mt-1 list-disc pl-5">
                        {ed.highlights.map((h, i) => (
                          <li key={i}>
                            <Hl text={h} tokens={tokens} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>
                ))}
                {fAchievements.map((a: PortfolioAchievement) => (
                  <article key={a.id}>
                    <ResultHead letter={a.title} crumb={`${base} › honors › ${slugify(a.title)}`}>
                      <TitleLink href={safeHref(a.proofUrl)}>
                        <Hl text={a.title} tokens={tokens} />
                      </TitleLink>
                    </ResultHead>
                    <p className="sds-muted text-sm">{[a.issuer, a.date].filter(Boolean).join(" · ")}</p>
                    {a.description && (
                      <p className="sds-snippet">
                        <Hl text={a.description} tokens={tokens} />
                      </p>
                    )}
                  </article>
                ))}
              </section>
            )}
          </div>

          {/* Knowledge graph panel */}
          <aside aria-label={`About ${name}`} className="max-lg:order-first">
            <div className="sds-kg">
              <div className="flex items-start gap-4">
                <Portrait src={basics.avatarUrl} name={name} />
                <div className="min-w-0">
                  <h2 className="text-2xl leading-tight">{name}</h2>
                  {basics.headline && <p className="sds-muted mt-0.5 text-sm">{basics.headline}</p>}
                </div>
              </div>
              {resumeHref && (
                <a href={resumeHref} target="_blank" rel="noopener noreferrer" className="sds-cta">
                  <Download size={15} aria-hidden="true" /> Download Resume
                </a>
              )}
              {facts.length > 0 && (
                <dl className="sds-facts">
                  {facts.map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {socialList.length > 0 && (
                <>
                  <p className="sds-label mt-4">Profiles</p>
                  <ul className="flex flex-wrap gap-2">
                    {socialList.map((s) => (
                      <li key={s.label}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer" className="sds-social" aria-label={s.label} title={s.label}>
                          {s.icon}
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      <MascotWidget data={data} themeMode={mode} />
    </div>
  );
}

/* ───────── styles (scoped by the sds- prefix) ───────── */

const CSS = `
.sds-root{background:var(--sds-bg);color:var(--sds-text);font-family:Arial,var(--font-inter),ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;transition:background .3s,color .3s}
.sds-root *{box-sizing:border-box}
.sds-header{position:sticky;top:0;z-index:30;background:var(--sds-bg);border-bottom:1px solid var(--sds-border)}
.sds-logo{font-size:24px;font-weight:700;letter-spacing:-.04em}
.sds-search{position:relative;display:flex;align-items:center;max-width:690px;min-width:0}
.sds-search input{width:100%;height:44px;border-radius:999px;border:1px solid var(--sds-border);background:var(--sds-bar);color:var(--sds-text);padding:0 42px 0 44px;font-size:15px;font-family:inherit;transition:box-shadow .2s,border-color .2s}
.sds-search input:hover,.sds-search input:focus{outline:none;border-color:transparent;box-shadow:0 1px 8px rgba(0,0,0,.28)}
.sds-search input:focus-visible{outline:2px solid var(--sds-accent);outline-offset:1px}
.sds-search input::-webkit-search-cancel-button{display:none}
.sds-search-icon{position:absolute;left:15px;color:var(--sds-muted);pointer-events:none}
.sds-clear{position:absolute;right:10px;display:inline-flex;padding:5px;border-radius:999px;color:var(--sds-muted);background:transparent;border:0;cursor:pointer}
.sds-clear:hover{background:var(--sds-hover)}
.sds-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;color:var(--sds-muted);background:transparent;border:0;cursor:pointer;transition:background .2s}
.sds-iconbtn:hover{background:var(--sds-hover)}
.sds-tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;margin-top:6px}
.sds-tab{white-space:nowrap;padding:10px 12px;font-size:14px;color:var(--sds-muted);background:transparent;border:0;border-bottom:3px solid transparent;cursor:pointer;font-family:inherit;transition:color .2s}
.sds-tab:hover{color:var(--sds-text)}
.sds-tab[aria-selected="true"]{color:var(--sds-accent);border-bottom-color:var(--sds-accent);font-weight:600}
.sds-muted{color:var(--sds-muted)}
.sds-card{border:1px solid var(--sds-border);border-radius:12px;padding:16px 18px;background:var(--sds-card)}
.sds-label{margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sds-muted)}
.sds-section{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sds-muted);margin:0}
.sds-fav{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:26px;height:26px;border-radius:999px;background:var(--sds-accent);color:var(--sds-on-accent);font-size:12px;font-weight:700}
.sds-crumb{font-size:13px;color:var(--sds-crumb);line-height:1.3}
.sds-title{margin:2px 0 0;font-size:20px;line-height:1.3;font-weight:400}
.sds-titlelink{color:var(--sds-link)}
a.sds-titlelink:hover{text-decoration:underline}
.sds-titletext{cursor:default}
.sds-snippet{margin:4px 0 0;font-size:14px;line-height:1.58;color:var(--sds-muted)}
.sds-mark{background:var(--sds-mark);color:inherit;border-radius:2px;padding:0 1px;font-weight:600}
.sds-sublink{background:none;border:0;padding:0;font:inherit;font-size:14px;color:var(--sds-link);cursor:pointer}
.sds-sublink:hover{text-decoration:underline}
.sds-ext{color:var(--sds-crumb)}
.sds-link{color:var(--sds-link);cursor:pointer;background:none;border:0;padding:0;font:inherit}
.sds-link:hover{text-decoration:underline}
.sds-chip{border-radius:999px;border:1px solid var(--sds-border);background:var(--sds-bar);color:var(--sds-text);padding:4px 12px;font-size:13px;font-family:inherit;cursor:pointer;transition:background .2s,border-color .2s}
.sds-chip:hover{background:var(--sds-hover);border-color:var(--sds-accent)}
.sds-thumb{width:112px;height:76px;flex-shrink:0;object-fit:cover;object-position:top;border-radius:8px;border:1px solid var(--sds-border);align-self:flex-start}
@media (max-width:520px){.sds-thumb{width:84px;height:60px}}
.sds-paa{border:1px solid var(--sds-border);border-radius:12px;overflow:hidden}
.sds-paa-item+.sds-paa-item{border-top:1px solid var(--sds-border)}
.sds-paa-item h3{margin:0;font-weight:400}
.sds-paa-item button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:transparent;border:0;color:var(--sds-text);font:inherit;font-size:15px;text-align:left;cursor:pointer;transition:background .15s}
.sds-paa-item button:hover{background:var(--sds-hover)}
.sds-paa-item button svg{flex-shrink:0;color:var(--sds-muted);transition:transform .2s}
.sds-paa-body{padding:0 16px 16px;color:var(--sds-muted)}
.sds-paa-body b{color:var(--sds-text)}
.sds-kg{border:1px solid var(--sds-border);border-radius:14px;padding:18px;background:var(--sds-card);position:sticky;top:132px}
@media (max-width:1023px){.sds-kg{position:static}}
.sds-portrait{width:84px;height:84px;flex-shrink:0;border-radius:14px;object-fit:cover;border:1px solid var(--sds-border)}
.sds-portrait-fallback{display:inline-flex;align-items:center;justify-content:center;background:var(--sds-accent);color:var(--sds-on-accent);font-size:28px;font-weight:700}
.sds-cta{margin-top:14px;display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:600;background:var(--sds-accent);color:var(--sds-on-accent);transition:filter .2s,transform .15s}
.sds-cta:hover{filter:brightness(1.08)}
.sds-cta:active{transform:scale(.98)}
.sds-facts{margin:16px 0 0}
.sds-facts>div{display:flex;gap:10px;padding:7px 0;border-top:1px solid var(--sds-border);font-size:14px}
.sds-facts dt{width:92px;flex-shrink:0;font-weight:700}
.sds-facts dd{margin:0;color:var(--sds-muted);min-width:0;overflow-wrap:anywhere}
.sds-social{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:999px;border:1px solid var(--sds-border);color:var(--sds-text);transition:background .2s,border-color .2s}
.sds-social:hover{background:var(--sds-hover);border-color:var(--sds-accent)}
.sds-root a:focus-visible,.sds-root button:focus-visible{outline:2px solid var(--sds-accent);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.sds-root *{transition:none!important;animation:none!important}}
`;
