"use client";

import { IncomingDataPanel } from "@/features/intake/IncomingDataPanel";
import { INTAKE_APPLIED } from "@/lib/api/intake";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, FolderGit2, RefreshCw, Search, Unplug,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tooltip } from "@/components/ui/Tooltip";
import { ResourcesPanel } from "@/features/interview/ResourcesPanel";
import { isUserFixable } from "@/lib/api/errors";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { usePlacey } from "@/components/placey/PlaceyProvider";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/coding";
import type { Platform, PlatformEntry, RepoSummary } from "@/lib/api/coding";
import type { Accent } from "@/lib/accent";
import { cn } from "@/lib/cn";
import { LanguageBar, MonthBars, languageColor, languageShares, monthlyActivity } from "@/features/coding/charts";
import { CodeChefBody, CodeforcesBody, CodingStyles, GenericBody, GithubBody, HackerRankBody, LeetCodeBody } from "@/features/coding/PlatformCards";
import { readmeSummary } from "@/features/coding/PlatformCards";
import type { Connected } from "@/features/coding/PlatformCards";

const PLATFORM: Record<Platform, { label: string; accent: Accent; brand: string; blurb: string; placeholder: string }> = {
  GITHUB: { label: "GitHub", accent: "ink", brand: "#6e7681", blurb: "Your project repositories and what their READMEs say.", placeholder: "your-github-username" },
  LEETCODE: { label: "LeetCode", accent: "orange", brand: "#FFA116", blurb: "Questions solved, contest rating, streak and badge.", placeholder: "your-leetcode-username" },
  CODECHEF: { label: "CodeChef", accent: "coral", brand: "#7e57c2", blurb: "Rating, stars, questions solved, contests and rank.", placeholder: "your-codechef-username" },
  CODEFORCES: { label: "Codeforces", accent: "cobalt", brand: "#1F8ACB", blurb: "Rank, rating, max rating, contests and questions solved.", placeholder: "your-codeforces-handle" },
  HACKERRANK: { label: "HackerRank", accent: "mint", brand: "#2ec866", blurb: "Star badges for Problem Solving, Java, C++ and Python.", placeholder: "your-hackerrank-username" },
};

const MANUAL_FIELDS: { name: keyof api.ManualStats; label: string }[] = [
  { name: "problems_solved_total", label: "Problems solved" },
  { name: "rating_current", label: "Current rating" },
  { name: "rating_max", label: "Max rating" },
  { name: "contests_count", label: "Contests" },
  { name: "stars", label: "Stars (0-7)" },
];

function describe(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong.";
}

function ago(iso: string | null): string {
  if (!iso) return "never";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

type State =
  | { kind: "loading" }
  | { kind: "error"; error: unknown }
  | { kind: "ready"; entries: PlatformEntry[]; repos: RepoSummary[] };

export function CodingDashboard() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const [entries, repos] = await Promise.all([api.getDashboard(), api.listRepositories()]);
      setState({ kind: "ready", entries, repos });
    } catch (error) {
      setState({ kind: "error", error });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Approve All in the incoming-data panel may connect accounts: reload the dashboard.
  useEffect(() => {
    const reload = () => void load();
    window.addEventListener(INTAKE_APPLIED, reload);
    return () => window.removeEventListener(INTAKE_APPLIED, reload);
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div role="status" className="space-y-6">
        <span className="sr-only">Loading your coding profiles</span>
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-64 lg:col-span-7" />
          <Skeleton className="h-64 lg:col-span-5" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <ErrorState
        title="Could not load the dashboard"
        message={describe(state.error)}
        referenceId={state.error instanceof ApiError ? state.error.requestId : undefined}
        action={<Button onClick={() => { setState({ kind: "loading" }); void load(); }}>Try again</Button>}
      />
    );
  }

  const { entries, repos } = state;
  const github = entries.find((e) => e.platform === "GITHUB");
  const hasRepos = repos.length > 0;

  return (
    <div className="space-y-12">
      <CodingStyles />
      <IncomingDataPanel />
      <OverviewBand entries={entries} repos={repos} />

      {hasRepos && (
        <section aria-labelledby="insights-heading" className="grid gap-6 lg:grid-cols-12">
          <h2 id="insights-heading" className="sr-only">Repository insights</h2>
          <Card className="lg:col-span-7" accent="cobalt" eyebrow="Languages" title="What you build with" description="Share of your project repositories by main language. Forks are not counted.">
            <LanguageBar shares={languageShares(repos)} />
          </Card>
          <Card className="lg:col-span-5" accent="orange" eyebrow="Activity" title="Pushes, last 12 months">
            <MonthBars buckets={monthlyActivity(repos)} />
          </Card>
        </section>
      )}

      <section aria-labelledby="platforms-heading">
        <div className="mb-6">
          <h2 id="platforms-heading" className="font-display text-3xl font-bold">Your platforms</h2>
          <p className="mt-1 text-sm text-muted">Connect a username and the public profile is fetched live. If a site cannot be reached you can enter stats by hand; those are always labelled as yours.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {github && <PlatformCard entry={github} repos={repos} onChanged={load} className="md:col-span-2" />}
          {entries.filter((e) => e.platform !== "GITHUB").map((e) => (
            <PlatformCard key={e.platform} entry={e} repos={repos} onChanged={load} />
          ))}
        </div>
      </section>

      {hasRepos ? (
        <RepoTable repos={repos} />
      ) : (
        github && !github.connected && (
          <EmptyState title="No repositories yet" description="Connect your GitHub username above and every public repository will be listed here." />
        )
      )}

      <ResourcesPanel topics={["DSA"]} title="Practice and discussions" description="Where to practise problems and read what other candidates share. These open GeeksforGeeks and LeetCode in a new tab." />
    </div>
  );
}

/* ───────── Overview band ───────── */
function OverviewBand({ entries, repos }: { entries: PlatformEntry[]; repos: RepoSummary[] }) {
  const linked = entries.filter((e) => e.connected).length;
  const projects = repos.filter((r) => !r.is_fork);
  const languages = new Set(projects.filter((r) => r.language).map((r) => r.language)).size;
  const readmes = projects.filter((r) => r.readme_excerpt).length;
  const lastPush = repos.map((r) => r.pushed_at).filter(Boolean).sort().pop() ?? null;
  const cells = [
    { label: "Project repositories", value: projects.length ? String(projects.length) : "–", note: projects.length ? "forks not counted" : "Connect GitHub" },
    { label: "READMEs read", value: projects.length ? String(readmes) : "–", note: "used to understand your projects" },
    { label: "Languages", value: projects.length ? String(languages) : "–", note: "main languages used" },
    { label: "Platforms linked", value: `${linked}/${entries.length}`, note: lastPush ? `last push ${ago(lastPush)}` : "none synced yet" },
  ];
  return (
    <section aria-label="Overview" className="animate-in grid grid-cols-2 overflow-hidden rounded-3xl border border-edge-strong hero-surface text-fg shadow-pop lg:grid-cols-4">
      {cells.map((c, i) => (
        <div key={c.label} className={cn("relative p-6", i % 2 === 1 && "border-l border-edge", i >= 2 && "border-t border-edge lg:border-t-0", i >= 1 && "lg:border-l lg:border-edge")}>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">{c.label}</p>
          <p className="font-num mt-3 text-5xl font-bold leading-none tracking-tight sm:text-6xl">{c.value}</p>
          <p className="mt-3 text-xs font-medium text-muted">{c.note}</p>
        </div>
      ))}
    </section>
  );
}

/* ───────── Platform cards ───────── */
function StatusBadge({ entry }: { entry: Connected }) {
  if (entry.source_method === "MANUAL") return <Badge tone="neutral">Entered by you</Badge>;
  return entry.status === "OK" ? <Badge tone="ok">Fresh</Badge> : <Badge tone="warn">{entry.status === "STALE" ? "Stale" : entry.status}</Badge>;
}

function PlatformBody({ entry, repos }: { entry: Connected; repos: RepoSummary[] }) {
  if (entry.source_method === "MANUAL" && entry.platform !== "GITHUB") return <GenericBody entry={entry} brand={PLATFORM[entry.platform].brand} />;
  switch (entry.platform) {
    case "LEETCODE": return <LeetCodeBody entry={entry} />;
    case "CODECHEF": return <CodeChefBody entry={entry} />;
    case "CODEFORCES": return <CodeforcesBody entry={entry} />;
    case "HACKERRANK": return <HackerRankBody entry={entry} />;
    default: return <GithubBody entry={entry} repos={repos} />;
  }
}

function PlatformCard({ entry, repos, onChanged, className }: { entry: PlatformEntry; repos: RepoSummary[]; onChanged: () => Promise<void>; className?: string }) {
  const { toast, confirm } = useFeedback();
  const { emit } = usePlacey();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const meta = PLATFORM[entry.platform];
  const [pendingUsername, setPendingUsername] = useState("");

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      emit({ type: "coding_action" });
      setManual(false);
      await onChanged();
      toast(success);
    } catch (err) {
      if (isUserFixable(err)) emit({ type: "action_failed" });
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  /** Like run(), but if the live fetch fails the manual form opens so the user is never stuck. */
  async function connect(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError(null);
    try {
      await action();
      emit({ type: "coding_action" });
      await onChanged();
      toast(success);
    } catch (err) {
      if (isUserFixable(err)) emit({ type: "action_failed" });
      setError(`${describe(err)} You can enter your ${meta.label} stats by hand instead.`);
      if (entry.platform !== "GITHUB") setManual(true);
    } finally {
      setBusy(false);
    }
  }

  function onConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = String(new FormData(event.currentTarget).get("username") ?? "").trim();
    setPendingUsername(username);
    const platform = entry.platform;
    return connect(
      () => (platform === "GITHUB" ? api.connectGithub(username) : api.connectPlatform(platform, username)),
      `Connected ${meta.label} as ${username}.`,
    );
  }

  function onManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: api.ManualStats = { username: String(data.get("username") ?? "").trim() };
    for (const f of MANUAL_FIELDS) {
      const raw = String(data.get(f.name) ?? "").trim();
      if (raw !== "") (body[f.name] as number) = Number(raw);
    }
    return run(() => api.saveManual(entry.platform, body), `${meta.label} stats saved.`);
  }

  async function onDisconnect() {
    const ok = await confirm({
      title: `Disconnect ${meta.label}?`,
      message: "Your saved snapshots for this platform will be deleted. You can connect again at any time.",
      confirmLabel: "Disconnect",
      tone: "danger",
    });
    if (!ok) return;
    const deleteData = entry.platform === "GITHUB"
      ? await confirm({ title: "Also delete cached repositories?", message: "Remove the repository list stored for you, or keep it for now.", confirmLabel: "Delete them", tone: "danger" })
      : false;
    await run(() => api.disconnectAccount(entry.platform, deleteData), `${meta.label} disconnected.`);
  }

  const manualForm = (username: string) => (
    <form onSubmit={onManual} className="mt-4 space-y-3 rounded-2xl border border-dashed border-edge-strong bg-surface-2/40 p-4">
      <div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor={`${entry.platform}-u`}>Username</label>
        <input id={`${entry.platform}-u`} name="username" required defaultValue={username} className="field" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {MANUAL_FIELDS.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-muted" htmlFor={`${entry.platform}-${f.name}`}>{f.label}</label>
            <input id={`${entry.platform}-${f.name}`} name={f.name} type="number" min={0} className="field" />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Leave blank what you do not know. Blank shows as “not available”, never 0.</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy}>Save stats</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setManual(false)}>Cancel</Button>
      </div>
    </form>
  );

  const header = (
    <div className="flex items-start gap-4">
      <PlatformIcon platform={entry.platform} size={52} />
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-2xl font-bold leading-tight">{meta.label}</h3>
        <p className="truncate text-sm text-muted">
          {entry.connected ? (
            entry.profile_url ? <a href={entry.profile_url} target="_blank" rel="noopener noreferrer" className="hover:text-fg hover:underline">@{entry.username}</a> : `@${entry.username}`
          ) : meta.blurb}
        </p>
      </div>
      {entry.connected && <StatusBadge entry={entry} />}
    </div>
  );

  if (!entry.connected) {
    return (
      <section className={cn("panel animate-in rounded-3xl border border-dashed p-6", className)}>
        {header}
        {!manual && (
          <form onSubmit={onConnect} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`${entry.platform}-connect`} className="sr-only">{meta.label} username</label>
            <input id={`${entry.platform}-connect`} name="username" required placeholder={meta.placeholder} className="field" />
            <Button type="submit" loading={busy} className="shrink-0">Connect {meta.label}</Button>
          </form>
        )}
        {manual ? manualForm(pendingUsername) : (
          <Button variant="ghost" size="sm" className="mt-4" onClick={() => setManual(true)}>
            Enter stats manually
          </Button>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-medium text-coral">{error}</p>}
      </section>
    );
  }

  return (
    <section className={cn("panel cd-card overflow-hidden rounded-3xl", className)}>
      <div className="cd-strip h-2" style={{ background: `linear-gradient(90deg, ${meta.brand}, color-mix(in srgb, ${meta.brand} 45%, transparent))` }} aria-hidden="true" />
      <div className="p-6">
        {header}
        <div className="mt-6"><PlatformBody entry={entry} repos={repos} /></div>

        <p className="mt-5 text-xs text-muted">
          {entry.source_method === "MANUAL" ? "Entered" : `Fetched from ${meta.label}`} {entry.fetched_at ? new Date(entry.fetched_at).toLocaleString() : "never"}
          {entry.platform === "GITHUB" && repos.length > 0 && <> · <span className="font-semibold text-fg">{repos.length} project repositories</span> loaded</>}
        </p>
        {entry.platform !== "CODECHEF" && entry.warnings.map((w) => (
          <p key={w} role="status" className="mt-1.5 text-xs font-medium text-warn">{w}</p>
        ))}
        {error && <p role="alert" className="mt-2 text-sm font-medium text-coral">{error}</p>}
        {manual && manualForm(entry.username)}

        <div className="mt-5 flex flex-wrap gap-2">
          {entry.source_method !== "MANUAL" && (
            <Tooltip text="Fetch the latest data. Limited to once every 15 minutes." side="top">
              <Button size="sm" variant="secondary" loading={busy} onClick={() => run(() => api.refreshAccount(entry.platform), `${meta.label} refreshed.`)}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
              </Button>
            </Tooltip>
          )}
          {entry.source_method === "MANUAL" && !manual && (
            <Button size="sm" variant="secondary" onClick={() => setManual(true)}>Update stats</Button>
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDisconnect}>
            <Unplug className="h-4 w-4" aria-hidden="true" /> Disconnect
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ───────── Repository table ───────── */
type SortKey = "name" | "language" | "pushed";
type RepoFilter = "all" | "own" | "archived";
const PAGE = 25;

function RepoTable({ repos }: { repos: RepoSummary[] }) {
  const { toast } = useFeedback();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RepoFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "pushed", dir: -1 });
  const [limit, setLimit] = useState(PAGE);
  const [error, setError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<Set<string>>(new Set());

  async function suggest(repo: RepoSummary) {
    setError(null);
    try {
      await api.proposeProject(repo.id);
      setSuggested((s) => new Set(s).add(repo.id));
      toast(`Suggested “${repo.full_name.split("/").pop()}” as a project. Review it on your Profile page.`);
    } catch (err) {
      setError(describe(err));
    }
  }

  const counts = {
    all: repos.length,
    own: repos.filter((r) => !r.is_fork && !r.is_archived).length,
    archived: repos.filter((r) => r.is_archived).length,
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = repos.filter((r) => {
      if (filter === "own" && (r.is_fork || r.is_archived)) return false;
      if (filter === "archived" && !r.is_archived) return false;
      return !q || r.full_name.toLowerCase().includes(q) || (r.language ?? "").toLowerCase().includes(q);
    });
    const val = (r: RepoSummary): string | number =>
      sort.key === "name" ? r.full_name.toLowerCase() : sort.key === "language" ? (r.language ?? "~").toLowerCase() : (r.pushed_at ?? "");
    return [...list].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [repos, query, filter, sort]);

  function header(key: SortKey, label: string, className = "") {
    const active = sort.key === key;
    return (
      <th scope="col" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cn("px-4 py-3 text-left", className)}>
        <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === "name" || key === "language" ? 1 : -1 }))}
          className={cn("inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em]", active ? "text-ink" : "text-muted hover:text-ink")}>
          {label}
          {active && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" aria-hidden="true" /> : <ArrowDown className="h-3 w-3" aria-hidden="true" />)}
        </button>
      </th>
    );
  }

  const filters: { id: RepoFilter; label: string }[] = [
    { id: "all", label: "All" }, { id: "own", label: "Active" }, { id: "archived", label: "Archived" },
  ];

  return (
    <section aria-labelledby="repos-heading">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="repos-heading" className="font-display text-3xl font-bold">All repositories <span className="font-num text-2xl text-muted">{repos.length}</span></h2>
          <p className="mt-1 text-sm text-muted">Your project repositories (forks and your profile README repo are left out). Nothing reaches your profile until you approve it.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <label htmlFor="repo-search" className="sr-only">Search repositories</label>
          <input id="repo-search" value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }} placeholder="Search name or language" className="field w-56 pl-9" />
        </div>
      </div>

      <div role="group" aria-label="Filter repositories" className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setLimit(PAGE); }}
            className={cn("rounded-full border px-3.5 py-1 text-xs font-bold transition-colors", filter === f.id ? "border-edge-strong bg-ink text-app" : "border-edge-strong text-muted hover:border-edge-strong hover:text-ink")}>
            {f.label} <span className="font-num opacity-70">{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mb-3 text-sm font-medium text-coral">{error}</p>}

      <div className="panel overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">Your GitHub project repositories</caption>
          <thead className="border-b border-edge-strong bg-surface-2/60">
            <tr>
              {header("name", "Repository")}
              {header("language", "Language")}
              {header("pushed", "Updated")}
              <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {rows.slice(0, limit).map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-surface-2/50">
                <td className="max-w-[22rem] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4 shrink-0 text-cobalt" aria-hidden="true" />
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate font-semibold hover:text-cobalt">{r.full_name.split("/").pop()}</a>
                    {r.is_fork && <Badge tone="neutral">fork</Badge>}
                    {r.is_archived && <Badge tone="warn">archived</Badge>}
                  </div>
                  {(r.description || r.readme_excerpt) && <p className="mt-0.5 truncate pl-6 text-xs text-muted">{r.description ?? readmeSummary(r.readme_excerpt)}</p>}
                </td>
                <td className="px-4 py-3">
                  {r.language ? (
                    <span className="inline-flex items-center gap-2 text-xs font-semibold">
                      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border border-edge-strong" style={{ background: languageColor(r.language, 0) }} />
                      {r.language}
                    </span>
                  ) : <span className="text-xs text-muted">–</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">{ago(r.pushed_at)}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="secondary" disabled={suggested.has(r.id)} onClick={() => suggest(r)}>
                    {suggested.has(r.id) ? "Suggested" : "Suggest as project"}
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted">No repositories match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>Showing {Math.min(limit, rows.length)} of {rows.length}</span>
        <span className="flex gap-2">
          {rows.length > limit && <Button size="sm" variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>Show more</Button>}
          <Link href="/profile" className="inline-flex h-8 items-center rounded-lg px-3 text-[13px] font-semibold text-cobalt hover:underline">Review suggestions on profile</Link>
        </span>
      </div>
    </section>
  );
}
