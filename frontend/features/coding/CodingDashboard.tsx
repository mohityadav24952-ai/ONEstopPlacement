"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { RefreshCw, Unplug } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/coding";
import type { Platform, PlatformEntry, RepoSummary } from "@/lib/api/coding";

const LABEL: Record<Platform, string> = {
  GITHUB: "GitHub",
  LEETCODE: "LeetCode",
  CODECHEF: "CodeChef",
  HACKERRANK: "HackerRank",
};

const METRIC_LABEL: Record<string, string> = {
  public_repos: "Public repositories",
  followers: "Followers",
  stars_received: "Stars on your own repos",
  last_push: "Last push",
  problems_solved_total: "Problems solved",
  rating_current: "Current rating",
  rating_max: "Max rating",
  contests_count: "Contests",
  stars: "Stars",
};

const MANUAL_FIELDS: { name: keyof api.ManualStats; label: string }[] = [
  { name: "problems_solved_total", label: "Problems solved" },
  { name: "rating_current", label: "Current rating" },
  { name: "rating_max", label: "Max rating" },
  { name: "contests_count", label: "Contests" },
  { name: "stars", label: "Stars (0-7)" },
];

const inputClass =
  "h-10 w-full rounded-md border border-edge bg-app px-3 text-sm text-fg placeholder:text-muted";

function describe(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong.";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString();
}

type State =
  | { kind: "loading" }
  | { kind: "error"; error: unknown }
  | { kind: "ready"; entries: PlatformEntry[]; repos: RepoSummary[] };

export function CodingDashboard() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const [entries, repos] = await Promise.all([
        api.getDashboard(),
        api.listRepositories(),
      ]);
      setState({ kind: "ready", entries, repos });
    } catch (error) {
      setState({ kind: "error", error });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div role="status" className="grid gap-4 md:grid-cols-2">
        <span className="sr-only">Loading your coding profiles</span>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <ErrorState
        title="Could not load the dashboard"
        message={describe(state.error)}
        referenceId={
          state.error instanceof ApiError ? state.error.requestId : undefined
        }
        action={
          <Button onClick={() => { setState({ kind: "loading" }); void load(); }}>
            Try again
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        {state.entries.map((entry) => (
          <PlatformCard key={entry.platform} entry={entry} onChanged={load} />
        ))}
      </div>
      {state.repos.length > 0 && <Repositories repos={state.repos} />}
    </div>
  );
}

function StatusBadge({ entry }: { entry: Extract<PlatformEntry, { connected: true }> }) {
  if (entry.source_method === "MANUAL") {
    return <Badge tone="neutral">You entered</Badge>;
  }
  return entry.status === "OK" ? (
    <Badge tone="ok">Fresh</Badge>
  ) : (
    <Badge tone="warn">{entry.status === "STALE" ? "Stale" : entry.status}</Badge>
  );
}

function PlatformCard({
  entry,
  onChanged,
}: {
  entry: PlatformEntry;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(false);
  const label = LABEL[entry.platform];
  const apiCapable = entry.platform === "GITHUB";

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setManual(false);
      await onChanged();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  async function onConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const username = String(new FormData(event.currentTarget).get("username") ?? "").trim();
    await run(() => api.connectGithub(username));
  }

  async function onManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: api.ManualStats = {
      username: String(data.get("username") ?? "").trim(),
    };
    for (const f of MANUAL_FIELDS) {
      const raw = String(data.get(f.name) ?? "").trim();
      if (raw !== "") (body[f.name] as number) = Number(raw);
    }
    await run(() => api.saveManual(entry.platform, body));
  }

  const manualForm = (username: string) => (
    <form onSubmit={onManual} className="mt-3 space-y-3">
      <label className="block text-sm font-medium" htmlFor={`${entry.platform}-u`}>
        Username
      </label>
      <input id={`${entry.platform}-u`} name="username" required defaultValue={username} className={inputClass} />
      <div className="grid grid-cols-2 gap-3">
        {MANUAL_FIELDS.map((f) => (
          <div key={f.name}>
            <label className="block text-xs text-muted" htmlFor={`${entry.platform}-${f.name}`}>
              {f.label}
            </label>
            <input id={`${entry.platform}-${f.name}`} name={f.name} type="number" min={0} className={inputClass} />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">Leave blank what you do not know. Blank is shown as “not available”, never 0.</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={busy}>Save</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setManual(false)}>Cancel</Button>
      </div>
    </form>
  );

  if (!entry.connected) {
    return (
      <Card title={label} description={apiCapable ? "Connect your public GitHub username." : "No verified integration yet. Enter your stats yourself."}>
        {apiCapable && !manual && (
          <form onSubmit={onConnect} className="flex gap-2">
            <label htmlFor="gh-username" className="sr-only">GitHub username</label>
            <input id="gh-username" name="username" required placeholder="octocat" className={inputClass} />
            <Button type="submit" loading={busy}>Connect</Button>
          </form>
        )}
        {manual ? (
          manualForm("")
        ) : (
          <Button variant="ghost" size="sm" className="mt-3" onClick={() => setManual(true)}>
            Enter stats manually
          </Button>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-err">{error}</p>}
      </Card>
    );
  }

  const metrics = Object.entries(entry.metrics);
  return (
    <Card
      title={label}
      description={`@${entry.username}`}
      action={<StatusBadge entry={entry} />}
    >
      {metrics.length === 0 ? (
        <p className="text-sm text-muted">No stats available yet.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-3">
          {metrics.map(([key, m]) => (
            <div key={key}>
              <dt className="text-xs text-muted">{METRIC_LABEL[key] ?? key}</dt>
              <dd className="text-lg font-semibold">
                {m.available
                  ? key === "last_push"
                    ? new Date(String(m.value)).toLocaleDateString()
                    : String(m.value)
                  : <span className="text-sm font-normal text-muted">Not available</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {entry.languages && Object.keys(entry.languages).length > 0 && (
        <p className="mt-3 text-sm text-muted">
          Languages: {Object.keys(entry.languages).slice(0, 6).join(", ")}
        </p>
      )}

      <p className="mt-3 text-xs text-muted">
        {entry.source_method === "MANUAL" ? "Entered" : "Fetched from GitHub"}{" "}
        {formatWhen(entry.fetched_at)}
      </p>

      {entry.warnings.map((w) => (
        <p key={w} role="status" className="mt-1 text-xs text-warn">{w}</p>
      ))}
      {error && <p role="alert" className="mt-2 text-sm text-err">{error}</p>}

      {manual && manualForm(entry.username)}

      <div className="mt-4 flex flex-wrap gap-2">
        {entry.source_method !== "MANUAL" && (
          <Button size="sm" variant="secondary" loading={busy} onClick={() => run(() => api.refreshAccount(entry.platform))}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Refresh
          </Button>
        )}
        {entry.source_method === "MANUAL" && !manual && (
          <Button size="sm" variant="secondary" onClick={() => setManual(true)}>Update stats</Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`Disconnect ${label}? Saved snapshots will be deleted.`)) return;
            const deleteData = apiCapable
              ? window.confirm("Also delete your cached repositories?")
              : false;
            void run(() => api.disconnectAccount(entry.platform, deleteData));
          }}
        >
          <Unplug className="h-4 w-4" aria-hidden="true" /> Disconnect
        </Button>
      </div>
    </Card>
  );
}

function Repositories({ repos }: { repos: RepoSummary[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function suggest(repo: RepoSummary) {
    setError(null);
    setMessage(null);
    try {
      await api.proposeProject(repo.id);
      setMessage(`Suggested “${repo.full_name}” as a project. Review it on your Profile page.`);
    } catch (err) {
      setError(describe(err));
    }
  }

  return (
    <Card title="Repositories" description="Public, non-archived repositories from GitHub. Nothing is added to your profile until you approve it.">
      {message && (
        <p role="status" className="mb-3 text-sm text-ok">
          {message} <Link href="/profile" className="underline">Open profile</Link>
        </p>
      )}
      {error && <p role="alert" className="mb-3 text-sm text-err">{error}</p>}
      <ul className="divide-y divide-edge">
        {repos.map((repo) => (
          <li key={repo.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-medium underline-offset-2 hover:underline">
                {repo.full_name}
              </a>
              {repo.description && <p className="text-sm text-muted">{repo.description}</p>}
              <p className="text-xs text-muted">
                {[repo.language, `${repo.stars} stars`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => suggest(repo)}>
              Suggest as project
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
