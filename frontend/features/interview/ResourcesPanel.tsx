"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { describeError } from "@/lib/api/errors";
import { getResources } from "@/lib/api/interview";
import type { ResourceLink, Resources, Topic } from "@/lib/api/interview";
import { cn } from "@/lib/cn";

const TOPIC_NAME: Record<Topic, string> = {
  DSA: "DSA", OOP: "OOP", DBMS: "DBMS", OS: "OS", CN: "Networks", HR: "HR", PROJECT: "Projects",
};

const KIND_LABEL: Record<ResourceLink["kind"], string> = {
  interview_experiences: "Experiences",
  topic_guide: "Guide",
  practice: "Practice",
  discussion: "Discussion",
  search: "Search",
};

function LinkRow({ r }: { r: ResourceLink }) {
  const host = new URL(r.url).hostname.replace(/^www\./, "");
  return (
    <li>
      <a
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 rounded-xl border border-edge p-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <PlatformIcon platform={r.source} size={38} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold leading-snug">{r.title}</span>
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">{KIND_LABEL[r.kind]}</span>
          </span>
          <span className="block text-xs leading-snug text-muted">{r.description}</span>
          <span className="block text-[11px] text-muted/80">{host}</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted group-hover:text-primary" aria-label="Opens in a new tab" />
      </a>
    </li>
  );
}

type Props = {
  company?: string;
  /** Topics to offer as tabs (e.g. the topics of the preparation plan). */
  topics: Topic[];
  title?: string;
  description?: string;
  className?: string;
};

/**
 * "Top curated resources and discussions": links to GeeksforGeeks and LeetCode Discuss for the
 * company and for each topic. The links come from the backend (resources.py), which only emits
 * landing, topic and search pages, never invented article URLs.
 */
export function ResourcesPanel({ company, topics, title = "Top curated resources and discussions", description, className }: Props) {
  const [topic, setTopic] = useState<Topic | undefined>(topics[0]);
  const [data, setData] = useState<Resources | null>(null);
  const [error, setError] = useState<string | null>(null);

  // keep the selected tab valid if the plan's topics change
  const active = topic && topics.includes(topic) ? topic : topics[0];

  useEffect(() => {
    let cancelled = false;
    getResources({ company, topic: active })
      .then((r) => {
        if (cancelled) return;
        setData(r);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(describeError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [company, active]);

  return (
    <Card
      accent="lavender"
      eyebrow="Curated resources"
      title={title}
      description={description ?? "Hand-picked starting points on GeeksforGeeks and LeetCode Discuss. They open the sites themselves in a new tab."}
      className={className}
    >
      {error && <p role="alert" className="text-sm font-medium text-coral">Could not load resources. {error}</p>}
      {!error && !data && (
        <div role="status" className="space-y-2">
          <span className="sr-only">Loading resources</span>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {data.company_resources.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-bold">
                About <span className="capitalize">{data.company}</span>
              </h3>
              <ul className="grid gap-2 md:grid-cols-2">{data.company_resources.map((r) => <LinkRow key={r.id} r={r} />)}</ul>
            </div>
          )}

          {topics.length > 0 && (
            <div>
              <div role="tablist" aria-label="Topic" className="mb-3 flex flex-wrap gap-1.5">
                {topics.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={t === active}
                    onClick={() => {
                      setData(null);
                      setTopic(t);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-bold transition-colors",
                      t === active ? "border-lavender bg-lavender text-on-accent" : "border-edge-strong text-muted hover:border-lavender hover:text-fg",
                    )}
                  >
                    {TOPIC_NAME[t]}
                  </button>
                ))}
              </div>
              <ul className="grid gap-2 md:grid-cols-2">{data.topic_resources.map((r) => <LinkRow key={r.id} r={r} />)}</ul>
            </div>
          )}

          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {data.note}
          </p>
        </div>
      )}
    </Card>
  );
}
