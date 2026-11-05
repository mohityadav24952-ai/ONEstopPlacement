"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileText, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState } from "@/components/shared/EmptyState";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/resume";
import type { VersionSummary } from "@/lib/api/resume";
import { cn } from "@/lib/cn";
import { DocumentsPanel } from "@/features/resume/DocumentsPanel";
import { TargetRolePanel } from "@/features/resume/TargetRolePanel";
import { VersionEditor } from "@/features/resume/VersionEditor";

const STEPS = [
  { id: "step-import", n: 1, title: "Import", hint: "Optional. Fill your profile from a file." },
  { id: "step-role", n: 2, title: "Target role", hint: "Paste the job description." },
  { id: "step-drafts", n: 3, title: "Drafts", hint: "Pick or create a version." },
  { id: "step-review", n: 4, title: "Review and approve", hint: "Edit, approve, download." },
] as const;

export function ResumeStudio() {
  const { toast, confirm } = useFeedback();
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reviewRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      setVersions(await api.listVersions());
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function open(id: string) {
    setOpenId(id);
    window.setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function createGeneral() {
    try {
      const v = await api.createVersion();
      await load();
      open(v.id);
      toast("General draft created from your profile.");
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function remove(v: VersionSummary) {
    const ok = await confirm({
      title: "Delete this resume version?",
      message: `“${v.title}” and its PDF will be permanently deleted.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await api.deleteVersion(v.id);
      if (openId === v.id) setOpenId(null);
      await load();
      toast("Resume version deleted.");
    } catch (err) {
      setError(describeError(err));
    }
  }

  const hasDrafts = (versions?.length ?? 0) > 0;
  const hasApproved = versions?.some((v) => v.status === "APPROVED") ?? false;
  const done: Record<string, boolean> = { "step-drafts": hasDrafts, "step-review": hasApproved };

  return (
    <div className="grid gap-10 lg:grid-cols-[230px_1fr]">
      {/* Workflow rail */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-coral">Workflow</p>
        <ol className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
          {STEPS.map((s) => (
            <li key={s.id} className="shrink-0">
              <a href={`#${s.id}`} className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2">
                <span className={cn("font-num flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink text-sm font-bold", done[s.id] ? "bg-mint text-white" : "bg-surface")}>
                  {done[s.id] ? <Check className="h-4 w-4" aria-hidden="true" /> : s.n}
                </span>
                <span className="hidden min-w-0 lg:block">
                  <span className="block text-sm font-bold">{s.title}</span>
                  <span className="block text-xs leading-snug text-muted">{s.hint}</span>
                </span>
                <span className="text-sm font-bold lg:hidden">{s.title}</span>
              </a>
            </li>
          ))}
        </ol>
        <p className="mt-5 hidden rounded-xl border-2 border-dashed border-ink/25 p-3 text-xs leading-relaxed text-muted lg:block">
          Your resume only ever contains facts from your profile. Anything the job asks for that you have not shown is flagged for you to decide.
        </p>
      </aside>

      <div className="min-w-0 space-y-8">
        <div id="step-import" className="scroll-mt-24"><DocumentsPanel /></div>
        <div id="step-role" className="scroll-mt-24">
          <TargetRolePanel onDraft={(id) => { void load(); open(id); toast("Tailored draft created. Review it below."); }} />
        </div>

        <div id="step-drafts" className="scroll-mt-24">
          <Card
            accent="coral"
            eyebrow="Step 3"
            title="Your resume versions"
            description="Drafts are editable. Approved versions are locked and can be downloaded as a PDF."
            action={<button type="button" className="text-sm font-bold text-cobalt hover:underline" onClick={createGeneral}>+ New general draft</button>}
          >
            {error && <p role="alert" className="mb-3 text-sm font-medium text-coral">{error}</p>}
            {versions && versions.length === 0 ? (
              <EmptyState icon={FileText} title="No resumes yet" description="Add profile details, then create a draft from a job description or a general one." />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {versions?.map((v) => (
                  <li key={v.id} className={cn("relative rounded-2xl border-2 p-4 transition-all", openId === v.id ? "border-ink bg-coral/10 shadow-[4px_4px_0_var(--ink)]" : "border-ink/20 hover:border-ink")}>
                    <button type="button" onClick={() => open(v.id)} className="block w-full pr-8 text-left">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-coral" aria-hidden="true" />
                        <span className="truncate font-display text-lg font-semibold">{v.title}</span>
                      </span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <Badge tone={v.status === "APPROVED" ? "ok" : "warn"}>{v.status.toLowerCase()}</Badge>
                        {v.stale && <Badge tone="warn">profile changed</Badge>}
                        {v.status === "DRAFT" && v.unresolved_flags > 0 && <Badge tone="err">{v.unresolved_flags} to resolve</Badge>}
                        {v.has_pdf && <Badge tone="primary">pdf ready</Badge>}
                      </span>
                      <span className="mt-2 block text-xs text-muted">Created {new Date(v.created_at).toLocaleDateString()}</span>
                    </button>
                    <button type="button" aria-label={`Delete ${v.title}`} onClick={() => remove(v)} className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-coral/15 hover:text-coral">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div id="step-review" ref={reviewRef} className="scroll-mt-24">
          {openId ? (
            <VersionEditor key={openId} id={openId} onChanged={() => void load()} />
          ) : (
            <Card accent="coral" eyebrow="Step 4" title="Review and approve" description="Select a version above to edit it, resolve any flagged items, approve it and download the PDF.">
              <EmptyState icon={FileText} title="Nothing open" description="Create or pick a draft in step 3." />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
