"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { firstName, safeHref } from "../lib/links";
import type { PortfolioData } from "@/types/portfolio";

type Kind = "in" | "out" | "err" | "ok";
type Line = { k: Kind; t: string };

const CHIPS = ["./show-projects.sh", "cat skills.json", "fetch --coding-stats", "whoami", "contact --email"] as const;

const num = (v: number | undefined | null): string | null =>
  typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("en-US") : null;

const join = (parts: Array<string | null | undefined | false>, sep = "  "): string =>
  parts.filter((p): p is string => typeof p === "string" && p.length > 0).join(sep);

/** Pure: builds command output ONLY from the portfolio's own data. Returns null for `clear`. */
export function runCommand(raw: string, data: PortfolioData): Line[] | null {
  const cmd = raw.trim().replace(/\s+/g, " ");
  const lc = cmd.toLowerCase();
  const { basics: b, config: c } = data;
  const out = (t: string): Line => ({ k: "out", t });
  const name = b.fullName || c.handle;

  if (lc === "") return [];
  if (lc === "clear") return null;

  if (lc === "help") {
    return [
      out("Available commands:"),
      out("  help                  show this list"),
      out("  whoami                who is behind this portfolio"),
      out("  ls                    list files"),
      out("  cat skills.json       print the skills"),
      out("  ./show-projects.sh    list projects"),
      out("  fetch --coding-stats  show coding profile numbers"),
      out("  contact --email       show the contact email"),
      out("  hire                  how to get in touch"),
      out("  clear                 clear the screen"),
    ];
  }

  if (lc === "whoami") {
    const lines = [out(name), b.headline ? out(b.headline) : null, b.location ? out(`location: ${b.location}`) : null, b.availabilityText ? out(b.availabilityText) : null];
    return lines.filter((l): l is Line => l !== null);
  }

  if (lc === "ls") {
    const files = ["overview.tsx", "projects.json", "coding_profiles.py", "experience.md", "terminal.sh"];
    if (data.education.length) files.push("education.md");
    if (data.achievements.length) files.push("achievements.md");
    files.push("skills.json");
    return [out(files.join("  "))];
  }

  if (lc === "cat skills.json") {
    const s = data.skills;
    const entries: Array<[string, string[]]> = [
      ["languages", s.languages],
      ["frameworks", s.frameworks],
      ["databasesAndCloud", s.databasesAndCloud],
      ["aiAndMl", s.aiAndMl],
      ["coreCsAndTools", s.coreCsAndTools],
    ];
    const filled = entries.filter(([, v]) => v.length > 0);
    if (filled.length === 0) return [out("skills.json is empty: no skills have been added yet.")];
    return JSON.stringify(Object.fromEntries(filled), null, 2).split("\n").map(out);
  }

  if (lc === "./show-projects.sh") {
    if (data.projects.length === 0) return [out("No projects have been added yet.")];
    const lines: Line[] = [];
    data.projects.forEach((p, i) => {
      lines.push({ k: "ok", t: `[${i + 1}] ${p.title || "Untitled project"}${p.year ? ` (${p.year})` : ""}` });
      if (p.tagline) lines.push(out(`    ${p.tagline}`));
      if (p.techStack.length) lines.push(out(`    stack: ${p.techStack.join(", ")}`));
      if (p.metrics) lines.push(out(`    impact: ${p.metrics}`));
      const src = safeHref(p.githubUrl);
      const live = safeHref(p.liveUrl);
      if (src) lines.push(out(`    source: ${src}`));
      if (live) lines.push(out(`    live:   ${live}`));
    });
    return lines;
  }

  if (lc === "fetch --coding-stats") {
    if (!c.showCodingStats) return [out("Coding stats are hidden by the owner of this portfolio.")];
    const s = data.codingStats;
    const lines: Line[] = [];
    if (s.leetcode) {
      const l = s.leetcode;
      lines.push(out(join(["leetcode", `@${l.username}`, num(l.totalSolved) && `solved ${num(l.totalSolved)}`, `(E${num(l.easySolved) ?? 0}/M${num(l.mediumSolved) ?? 0}/H${num(l.hardSolved) ?? 0})`, num(l.rating) && `contest ${num(l.rating)}`])));
    }
    if (s.codechef) {
      const l = s.codechef;
      lines.push(out(join(["codechef", `@${l.username}`, num(l.rating) && `rating ${num(l.rating)}`, num(l.maxRating) && `max ${num(l.maxRating)}`, l.stars])));
    }
    if (s.codeforces) {
      const l = s.codeforces;
      lines.push(out(join(["codeforces", `@${l.username}`, num(l.rating) && `rating ${num(l.rating)}`, num(l.maxRating) && `max ${num(l.maxRating)}`, l.rank])));
    }
    if (s.github) {
      const l = s.github;
      lines.push(out(join(["github", `@${l.username}`, `repos ${num(l.publicRepos) ?? 0}`, `stars ${num(l.totalStars) ?? 0}`, `followers ${num(l.followers) ?? 0}`])));
    }
    return lines.length ? lines : [out("No coding profiles are linked yet.")];
  }

  if (lc === "contact --email") {
    return [b.email ? { k: "ok", t: b.email } : out("No public email has been set.")];
  }

  if (lc === "hire") {
    const lines: Line[] = [{ k: "ok", t: `Hiring ${firstName(name)}? Great call.` }];
    if (b.availabilityText) lines.push(out(b.availabilityText));
    if (b.email) lines.push(out(`email:    ${b.email}`));
    const resume = safeHref(b.resumeUrl);
    const li = safeHref(b.socials.linkedin);
    const gh = safeHref(b.socials.github);
    if (resume) lines.push(out(`resume:   ${resume}`));
    if (li) lines.push(out(`linkedin: ${li}`));
    if (gh) lines.push(out(`github:   ${gh}`));
    if (lines.length === 1) lines.push(out("No public contact details have been set yet."));
    return lines;
  }

  if (lc.startsWith("cat ")) return [{ k: "err", t: `cat: ${cmd.slice(4)}: No such file. Try 'ls'.` }];
  return [{ k: "err", t: `command not found: ${cmd.split(" ")[0]}. Type 'help' to see what works.` }];
}

export function DevOSTerminal({ data, accent }: { data: PortfolioData; accent: string }) {
  const prompt = `${data.config.handle}@portfolio ~ %`;
  const [lines, setLines] = useState<Line[]>(() => [{ k: "out", t: `Welcome to ${data.basics.fullName || data.config.handle}'s terminal. Type 'help' or tap a command below.` }]);
  const [value, setValue] = useState("");
  const history = useRef<string[]>([]);
  const cursor = useRef(-1);
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the newest output in view by scrolling the terminal itself (never the page).
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function exec(raw: string) {
    const result = runCommand(raw, data);
    if (raw.trim()) {
      history.current.push(raw.trim());
      cursor.current = history.current.length;
    }
    if (result === null) {
      setLines([]);
      return;
    }
    setLines((prev) => [...prev, { k: "in" as Kind, t: raw.trim() }, ...result].slice(-300));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    exec(value);
    setValue("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    const h = history.current;
    if (e.key === "ArrowUp" && h.length) {
      e.preventDefault();
      cursor.current = Math.max(0, cursor.current - 1);
      setValue(h[cursor.current] ?? "");
    } else if (e.key === "ArrowDown" && h.length) {
      e.preventDefault();
      cursor.current = Math.min(h.length, cursor.current + 1);
      setValue(h[cursor.current] ?? "");
    }
  }

  const color = (k: Kind) => (k === "err" ? "#ff7b72" : k === "ok" ? accent : k === "in" ? "#e6edf3" : "#9fb0c3");

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0b0f17] font-mono text-[12.5px] leading-relaxed text-[#c9d1d9] shadow-lg">
      <div className="flex flex-wrap gap-1.5 border-b border-white/10 px-3 py-2" role="group" aria-label="Command shortcuts">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => exec(chip)}
            className="rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11.5px] text-[#c9d1d9] transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
            style={{ outlineColor: accent }}
          >
            {chip}
          </button>
        ))}
        <button type="button" onClick={() => exec("clear")} className="rounded-md border border-white/15 px-2 py-1 text-[11.5px] text-[#8b949e] transition hover:bg-white/10">
          clear
        </button>
      </div>
      <div ref={scroller} className="h-64 overflow-y-auto px-3 py-2" role="log" aria-live="polite" aria-label="Terminal output">
        {lines.map((l, i) => (
          <div key={i} className="sdo-line whitespace-pre-wrap break-words" style={{ color: color(l.k) }}>
            {l.k === "in" ? <span style={{ color: accent }}>{prompt} </span> : null}
            {l.t}
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-white/10 px-3 py-2">
        <label htmlFor="sdo-term-input" className="shrink-0" style={{ color: accent }}>
          <span className="sr-only">Terminal command. </span>
          <span aria-hidden="true">{prompt}</span>
        </label>
        <input
          id="sdo-term-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          maxLength={120}
          placeholder="type a command"
          className="min-w-0 flex-1 bg-transparent text-[#e6edf3] outline-none placeholder:text-[#566170]"
        />
      </form>
    </div>
  );
}
