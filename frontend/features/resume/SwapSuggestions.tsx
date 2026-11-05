"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, ExternalLink } from "lucide-react";
import { PlatformIcon } from "@/components/shared/PlatformIcon";
import { getSwapSuggestions } from "@/lib/api/swap";
import type { SwapSuggestion } from "@/lib/api/swap";

/**
 * Agentic swap suggestions for a JD-tailored draft: when one of your GitHub projects (judged from its
 * README) shows skills the job asks for that this resume does not, offer to swap it in for the project that
 * adds the least. Nothing changes until you click.
 */
export function SwapSuggestions({ versionId, draft, busy, projectsKey, onSwap }: {
  versionId: string;
  draft: boolean;
  busy: boolean;
  /** Changes whenever the resume's projects change, so suggestions are re-computed after a swap. */
  projectsKey: string;
  onSwap: (repoId: string, replaceProjectId: string) => void;
}) {
  const [items, setItems] = useState<SwapSuggestion[]>([]);

  useEffect(() => {
    if (!draft) return;
    let live = true;
    getSwapSuggestions(versionId)
      .then((r) => {
        if (live) setItems(r.suggestions);
      })
      .catch(() => {
        if (live) setItems([]); // suggestions are a bonus: failing quietly keeps the editor usable
      });
    return () => {
      live = false;
    };
  }, [versionId, draft, projectsKey]);

  if (!draft || items.length === 0) return null;

  return (
    <section aria-label="Project swap suggestions" className="mb-5 space-y-2">
      <h3 className="font-display font-semibold">Better-matching projects from your GitHub</h3>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
            <button type="button" disabled={busy} onClick={() => onSwap(s.repo.id, s.replace.project_id)}
              className="group flex w-full items-start gap-3 rounded-lg text-left transition-colors hover:text-primary disabled:opacity-60">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><ArrowLeftRight className="h-4 w-4" aria-hidden="true" /></span>
              <span className="font-semibold leading-snug underline-offset-2 group-hover:underline">{s.message}</span>
            </button>
            <div className="ml-11 mt-2 space-y-1.5">
              <p className="flex items-center gap-2 text-xs text-muted">
                <PlatformIcon platform="GITHUB" size={20} />
                <a href={s.repo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-fg hover:underline">
                  {s.repo.full_name} <ExternalLink className="h-3 w-3" aria-label="(opens in a new tab)" />
                </a>
                {s.repo.language && <span>· {s.repo.language}</span>}
              </p>
              <ul className="space-y-1">
                {s.gains.map((g) => (
                  <li key={g.skill} className="text-xs">
                    <span className="font-bold text-ok">Adds {g.skill}</span>
                    {g.evidence && <span className="text-muted"> · from its README: &ldquo;{g.evidence}&rdquo;</span>}
                  </li>
                ))}
                {s.loses.length > 0 && <li className="text-xs text-warn">Gives up: {s.loses.join(", ")}</li>}
              </ul>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Swapping adds the repository to your profile as a project and replaces the other one in this draft only.</p>
    </section>
  );
}
