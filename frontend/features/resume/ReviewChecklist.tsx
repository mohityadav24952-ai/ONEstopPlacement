"use client";

import { useMemo } from "react";
import { Check, Lock, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ReviewItem } from "@/lib/api/resume";
import { cn } from "@/lib/cn";

const SECTION_TITLES: Record<string, string> = {
  summary: "Summary (AI-written or from your profile)",
  education: "Education",
  experience: "Experience bullets",
  projects: "Project bullets",
  skills: "Skills",
  coding: "Coding profiles",
  leadership: "Leadership / achievements",
  certification: "Certifications",
  links: "Hyperlinks from your .tex file",
};
const ORDER = ["summary", "education", "skills", "projects", "experience", "coding", "leadership", "certification", "links"];

type Decision = "approved" | "rejected";

/**
 * The approval gate. Every extracted point and every piece of AI text waits here until the user clicks
 * Approve or Reject; only approved items (and items the job description requires, shown locked) are put on
 * the final resume. The preview shows pending items so they can be judged in place.
 */
export function ReviewChecklist({ items, disabled, onDecide }: {
  items: ReviewItem[];
  disabled: boolean;
  onDecide: (decisions: Record<string, Decision>) => void;
}) {
  const groups = useMemo(() => {
    const by = new Map<string, ReviewItem[]>();
    for (const it of items) by.set(it.section, [...(by.get(it.section) ?? []), it]);
    return [...by.entries()].sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]));
  }, [items]);

  const pending = items.filter((i) => i.review === "pending").length;
  const locked = items.filter((i) => i.review === "locked").length;
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="review-title" className="mb-6 space-y-3 rounded-2xl border border-edge-strong p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="review-title" className="font-display text-lg font-semibold">Approve what goes on your resume</h3>
          <p className="text-sm text-muted">
            Click <b>Approve</b> or <b>Reject</b> for each item. Only approved items appear on the final PDF.
            {locked > 0 && ` ${locked} item(s) match the job description and are always included.`}
          </p>
        </div>
        <Badge tone={pending ? "warn" : "ok"}>{pending ? `${pending} waiting` : "all decided"}</Badge>
      </div>

      {groups.map(([section, list]) => {
        const waiting = list.filter((i) => i.review === "pending");
        return (
          <fieldset key={section} className="rounded-xl border border-edge p-3">
            <legend className="flex w-full flex-wrap items-center justify-between gap-2 px-1 text-sm font-bold">
              <span>{SECTION_TITLES[section] ?? section}</span>
            </legend>
            {waiting.length > 1 && (
              <div className="mb-2 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" disabled={disabled}
                  onClick={() => onDecide(Object.fromEntries(waiting.map((i) => [i.id, "approved" as const])))}>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Approve these {waiting.length}
                </Button>
              </div>
            )}
            <ul className="space-y-1.5">
              {list.map((it) => (
                <li key={it.id} className={cn(
                  "flex flex-wrap items-start gap-2 rounded-lg border px-2.5 py-2 text-sm",
                  it.review === "rejected" ? "border-edge opacity-60" : it.review === "pending" ? "border-warn/50 bg-warn/5" : "border-edge",
                )}>
                  <div className="min-w-0 flex-1">
                    {it.label && it.label !== it.text && <p className="text-xs font-semibold text-muted">{it.label}</p>}
                    <p className={cn("break-words", it.review === "rejected" && "line-through")}>{it.text}</p>
                    {it.review === "locked" && it.jd.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted">Job description asks for: {it.jd.join(", ")}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {it.review === "locked" ? (
                      <Badge tone="primary"><Lock className="mr-1 inline h-3 w-3" aria-hidden="true" />Required by JD</Badge>
                    ) : (
                      <>
                        <button type="button" disabled={disabled || it.review === "approved"} onClick={() => onDecide({ [it.id]: "approved" })}
                          aria-pressed={it.review === "approved"} aria-label={`Approve: ${it.text}`}
                          className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-default",
                            it.review === "approved" ? "border-ok bg-ok/15 text-ok" : "border-edge-strong hover:bg-ok/10")}>
                          <Check className="h-3 w-3" aria-hidden="true" /> {it.review === "approved" ? "Approved" : "Approve"}
                        </button>
                        <button type="button" disabled={disabled || it.review === "rejected"} onClick={() => onDecide({ [it.id]: "rejected" })}
                          aria-pressed={it.review === "rejected"} aria-label={`Reject: ${it.text}`}
                          className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-default",
                            it.review === "rejected" ? "border-err bg-err/15 text-err" : "border-edge-strong hover:bg-err/10")}>
                          <X className="h-3 w-3" aria-hidden="true" /> {it.review === "rejected" ? "Rejected" : "Reject"}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}
    </section>
  );
}
