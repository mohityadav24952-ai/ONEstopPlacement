import { cn } from "@/lib/cn";
import type { RepoSummary } from "@/lib/api/coding";

/** Colours GitHub uses for common languages, with a branded fallback cycle. */
const KNOWN: Record<string, string> = {
  Python: "#3572A5", TypeScript: "#3178c6", JavaScript: "#e8c500", Java: "#b07219", "C++": "#f34b7d",
  C: "#6e6e6e", HTML: "#e34c26", CSS: "#7a4fb0", Go: "#00ADD8", Rust: "#dea584", "Jupyter Notebook": "#DA5B0B",
  Shell: "#4eae2d", Kotlin: "#A97BFF", Dart: "#00B4AB", PHP: "#4F5D95", "C#": "#178600", Swift: "#F05138",
};
const FALLBACK = ["var(--primary)", "var(--orange)", "var(--coral)", "var(--lavender)", "var(--mint)", "var(--muted)"];

export function languageColor(name: string, index: number): string {
  return KNOWN[name] ?? FALLBACK[index % FALLBACK.length];
}

export type LanguageShare = { name: string; count: number; pct: number; color: string };

/** How many of your own (non-fork) repositories use each primary language. */
export function languageShares(repos: RepoSummary[]): LanguageShare[] {
  const counts = new Map<string, number>();
  for (const r of repos) {
    if (r.is_fork || !r.language) continue;
    counts.set(r.language, (counts.get(r.language) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count], i) => ({ name, count, pct: total ? (count / total) * 100 : 0, color: languageColor(name, i) }));
}

export function LanguageBar({ shares }: { shares: LanguageShare[] }) {
  if (shares.length === 0) {
    return <p className="text-sm text-muted">No language data yet. It appears once your repositories declare a main language.</p>;
  }
  return (
    <div>
      <div role="img" aria-label={`Language mix: ${shares.map((s) => `${s.name} ${Math.round(s.pct)}%`).join(", ")}`} className="flex h-5 overflow-hidden rounded-full border border-edge-strong">
        {shares.map((s) => (
          <span key={s.name} title={`${s.name}: ${s.count} repos`} style={{ width: `${s.pct}%`, background: s.color }} className="h-full border-r-2 border-edge-strong last:border-r-0" />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
        {shares.slice(0, 9).map((s) => (
          <li key={s.name} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm border border-edge-strong" style={{ background: s.color }} />
            <span className="truncate font-semibold">{s.name}</span>
            <span className="font-num ml-auto text-xs text-muted">{Math.round(s.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type MonthBucket = { key: string; label: string; count: number };

/** Repositories last pushed to in each of the last 12 months. */
export function monthlyActivity(repos: RepoSummary[], now = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      count: 0,
    });
  }
  for (const r of repos) {
    if (!r.pushed_at) continue;
    const d = new Date(r.pushed_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.count += 1;
  }
  return buckets;
}

export function MonthBars({ buckets }: { buckets: MonthBucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((a, b) => a + b.count, 0);
  if (total === 0) {
    return <p className="text-sm text-muted">No pushes in the last 12 months.</p>;
  }
  return (
    <figure>
      <div role="img" aria-label={`Repositories pushed per month: ${buckets.map((b) => `${b.label} ${b.count}`).join(", ")}`} className="flex h-36 items-end gap-1.5">
        {buckets.map((b, i) => (
          <div key={b.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${b.label}: ${b.count}`}>
            <span className={cn("font-num text-[10px] font-bold text-muted transition-opacity", b.count ? "opacity-0 group-hover:opacity-100" : "opacity-0")}>{b.count}</span>
            <div
              className={cn("w-full rounded-t-md border border-edge-strong transition-colors", i === buckets.length - 1 ? "bg-orange" : "bg-cobalt group-hover:bg-orange")}
              style={{ height: b.count ? `${Math.max(8, (b.count / max) * 100)}%` : "3px", opacity: b.count ? 1 : 0.25 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {buckets.map((b) => (
          <span key={b.key} className="flex-1 text-center text-[10px] font-semibold uppercase text-muted">{b.label.slice(0, 1)}</span>
        ))}
      </div>
      <figcaption className="mt-2 text-xs text-muted">{total} repositories pushed to in the last 12 months. Hover a bar for the count.</figcaption>
    </figure>
  );
}

export function TopStarred({ repos }: { repos: RepoSummary[] }) {
  const top = [...repos].filter((r) => r.stars > 0).sort((a, b) => b.stars - a.stars).slice(0, 5);
  if (top.length === 0) return <p className="text-sm text-muted">None of your repositories has a star yet.</p>;
  const max = top[0].stars;
  return (
    <ol className="space-y-3">
      {top.map((r) => (
        <li key={r.id}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="truncate font-semibold hover:text-cobalt">{r.full_name.split("/").pop()}</a>
            <span className="font-num text-xs font-bold">{r.stars}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-orange" style={{ width: `${(r.stars / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
