"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { usePlacey } from "@/components/placey/PlaceyProvider";
import { useFeedback } from "@/components/ui/Feedback";
import { describeError, isUserFixable } from "@/lib/api/errors";
import { TemplatePicker } from "@/features/resume/TemplatePicker";
import { SwapSuggestions } from "@/features/resume/SwapSuggestions";
import * as swapApi from "@/lib/api/swap";
import * as api from "@/lib/api/resume";
import type { Bullet, Version } from "@/lib/api/resume";
import { cn } from "@/lib/cn";

const inputClass = "field";

export function VersionEditor({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { toast } = useFeedback();
  const { emit } = usePlacey();
  const [version, setVersion] = useState<Version | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setVersion(await api.getVersion(id));
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVersion(null);
    void load();
  }, [load]);

  async function run(action: () => Promise<Version | unknown>, success?: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result && typeof result === "object" && "content" in result) setVersion(result as Version);
      else await load();
      onChanged();
      if (success) toast(success);
    } catch (err) {
      if (isUserFixable(err)) emit({ type: "action_failed" });
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      if (!version?.has_pdf) await api.renderPdf(id);
      const blob = await api.downloadPdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
      await load();
      toast("PDF downloaded.");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <ErrorState title="Could not load this resume" message={loadError} action={<Button onClick={() => void load()}>Try again</Button>} />;
  if (!version) return <Skeleton className="h-64 w-full" />;

  const draft = version.status === "DRAFT";
  const c = version.content;
  const pending = version.change_list.filter((p) => p.status === "pending");
  const openFlags = version.claim_flags.filter((f) => !f.resolved);

  return (
    <Card
      accent="coral"
      eyebrow="Step 4"
      title={version.title}
      description={draft ? "Draft: review, edit, then approve." : "Approved. This version can no longer change."}
      action={<Badge tone={draft ? "warn" : "ok"}>{version.status.toLowerCase()}</Badge>}
    >
      {version.stale && (
        <p role="status" className="mb-4 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">
          Your profile changed after this version was created. It still shows the old content. Create a new draft to include your changes.
        </p>
      )}
      {version.notes?.map((n) => <p key={n} role="status" className="mb-2 text-sm text-warn">{n}</p>)}
      {error && <p role="alert" className="mb-3 text-sm text-err">{error}</p>}

      {openFlags.length > 0 && (
        <section aria-label="Unverified claims" className="mb-5 space-y-2">
          <h3 className="font-display font-semibold">Needs your decision</h3>
          {openFlags.map((f) => (
            <div key={f.id} className="rounded-xl border border-warn/40 p-3 text-sm">
              <p>{f.question}</p>
              <div className="mt-2 flex gap-2">
                {f.requirement && <Button size="sm" variant="secondary" disabled={busy} onClick={() => run(() => api.resolveFlag(id, f.id, "recheck"))}>I added evidence — re-check</Button>}
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => api.resolveFlag(id, f.id, "dismiss"))}>Dismiss (do not claim)</Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {pending.length > 0 && (
        <section aria-label="Suggested rewordings" className="mb-5 space-y-2">
          <h3 className="font-display font-semibold">Suggested rewordings</h3>
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border border-ai/40 p-3 text-sm">
              <p className="text-muted line-through">{p.before}</p>
              <p>{p.after}</p>
              <p className="mt-1 text-xs text-muted">{p.rationale}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" disabled={busy || !draft} onClick={() => run(() => api.decideProposal(id, p.id, "accept"))}>Accept</Button>
                <Button size="sm" variant="ghost" disabled={busy || !draft} onClick={() => run(() => api.decideProposal(id, p.id, "reject"))}>Reject</Button>
              </div>
            </div>
          ))}
        </section>
      )}

      <SwapSuggestions
        versionId={id}
        draft={draft}
        busy={busy}
        projectsKey={c.projects.map((p) => p.id).join("|")}
        onSwap={(repoId, projectId) => run(() => swapApi.applySwap(id, repoId, projectId), "Project swapped in. Your profile now includes it.")}
      />

      <div
        className="mx-auto max-w-[780px] space-y-6 rounded-sm border border-[#e5dfd0] bg-white p-7 text-[#17150f] shadow-[0_2px_0_rgba(0,0,0,.05),0_28px_50px_-26px_rgba(23,21,15,.5)] sm:p-12"
        style={{ "--fg": "#17150f", "--muted": "#6b6455", "--edge": "#e5dfd0", "--surface-2": "#f1ece0", "--ink": "#17150f" } as React.CSSProperties}
      >
        <EditableHeader header={c.header} disabled={!draft || busy} onSave={(h) => run(() => api.editFields(id, h), "Contact details saved.")} />

        <section className="space-y-1.5" aria-label="Summary">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Summary</h4>
            {c.summary.user_edited ? <Badge tone="neutral">You edited</Badge>
              : c.summary.source === "ai" ? <Badge tone="ai"><Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />AI-written for this job. Read it before you approve.</Badge>
              : c.summary.source === "template" ? <Badge tone="neutral">Built from your profile (no AI text was usable)</Badge> : null}
            {draft && (
              <button type="button" disabled={busy} onClick={() => void run(() => api.regenerateSummary(id), "New summary written.")} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50">
                <RefreshCw className="h-3 w-3" aria-hidden="true" /> Write a new one
              </button>
            )}
          </div>
          <EditableText label="Summary" hideLabel value={c.summary.text ?? ""} disabled={!draft || busy} onSave={(t) => run(() => api.editVersion(id, { summary: t }))} />
        </section>

        {c.education.length > 0 && (
          <Block title="Education">
            {c.education.map((e) => <p key={e.id} className="text-sm">{[e.degree, e.field, e.institution].filter(Boolean).join(", ")}</p>)}
          </Block>
        )}

        {c.experience.length > 0 && (
          <Block title="Experience">
            {c.experience.map((e) => (
              <div key={e.id}>
                <p className="text-sm font-medium">{e.title} · {e.organization}</p>
                <Bullets bullets={e.bullets} draft={draft} busy={busy} onEdit={(bid, t) => run(() => api.editVersion(id, { bullet_edits: { [bid]: t } }))} onRemove={(bid) => run(() => api.editVersion(id, { remove_ids: [bid] }))} />
              </div>
            ))}
          </Block>
        )}

        {c.projects.length > 0 && (
          <Block title="Projects">
            {c.projects.map((p) => (
              <div key={p.id}>
                <p className="text-sm font-medium">{p.title}{p.tech.length ? ` (${p.tech.join(", ")})` : ""}</p>
                <Bullets bullets={p.bullets} draft={draft} busy={busy} onEdit={(bid, t) => run(() => api.editVersion(id, { bullet_edits: { [bid]: t } }))} onRemove={(bid) => run(() => api.editVersion(id, { remove_ids: [bid] }))} />
              </div>
            ))}
          </Block>
        )}

        {c.skills.length > 0 && <Block title="Skills"><p className="text-sm">{c.skills.join(", ")}</p></Block>}
      </div>

      <TemplatePicker version={version} onVersion={setVersion} onChanged={onChanged} />

      <div className="mt-6 flex flex-wrap gap-2 border-t border-edge pt-4">
        {draft ? (
          <Button loading={busy} disabled={openFlags.length > 0} onClick={() => run(async () => {
            const approved = await api.approveVersion(id);
            emit({ type: "resume_approved" });
            return approved;
          }, "Resume approved. You can now download the PDF.")}>
            Approve this version
          </Button>
        ) : (
          <Button loading={busy} onClick={download}><Download className="h-4 w-4" aria-hidden="true" /> Download PDF</Button>
        )}
        {draft && openFlags.length > 0 && <p className="self-center text-sm text-muted">Resolve the items above to approve.</p>}
      </div>
    </Card>
  );
}

type Header = { name: string | null; headline: string | null; location: string | null; email: string | null };

/** The name and contact line of the resume. Click it to change any of them; saved to this draft only. */
function EditableHeader({ header, disabled, onSave }: { header: Header; disabled: boolean; onSave: (h: { name: string; headline: string; email: string; location: string }) => void }) {
  const initial = { name: header.name ?? "", headline: header.headline ?? "", email: header.email ?? "", location: header.location ?? "" };
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ name: header.name ?? "", headline: header.headline ?? "", email: header.email ?? "", location: header.location ?? "" });
  }, [header.name, header.headline, header.email, header.location]);

  if (!editing) {
    return (
      <div
        className={cn("border-b border-[#17150f] pb-4", !disabled && "cursor-text rounded-t-md transition-colors hover:bg-primary/5")}
        {...(!disabled ? { role: "button", tabIndex: 0, "aria-label": "Edit name and contact details", onClick: () => setEditing(true), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); } } } : {})}
      >
        <h3 className="font-display text-4xl font-bold leading-tight">{header.name ?? "Add your name on the profile page"}</h3>
        <p className="text-sm text-muted">{[header.headline, header.email, header.location].filter(Boolean).join(" · ")}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2 border-b border-[#17150f] pb-4">
      {([["name", "Name"], ["headline", "Headline"], ["email", "Email"], ["location", "Location"]] as const).map(([k, label]) => (
        <div key={k} className="space-y-1">
          <label htmlFor={`hd-${k}`} className="text-xs font-semibold">{label}</label>
          <input id={`hd-${k}`} className={inputClass} value={form[k]} maxLength={k === "email" ? 320 : 200} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" disabled={!form.name.trim()} onClick={() => { setEditing(false); onSave(form); }}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => { setForm(initial); setEditing(false); }}>Cancel</Button>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h4 className="border-b border-[#17150f]/40 pb-1 text-[11px] font-bold uppercase tracking-[0.2em]">{title}</h4>
      {children}
    </section>
  );
}

function Bullets({ bullets, draft, busy, onEdit, onRemove }: { bullets: Bullet[]; draft: boolean; busy: boolean; onEdit: (id: string, text: string) => void; onRemove: (id: string) => void }) {
  return (
    <ul className="mt-1 space-y-1.5">
      {bullets.map((b) => (
        <li key={b.id} className="text-sm">
          <EditableText label="Bullet" hideLabel value={b.text} disabled={!draft || busy} onSave={(t) => onEdit(b.id, t)} onRemove={() => onRemove(b.id)} />
          {(b.user_edited || b.ai_assisted) && <Badge tone={b.user_edited ? "neutral" : "ai"}>{b.user_edited ? "You edited" : "AI-assisted, you accepted"}</Badge>}
        </li>
      ))}
    </ul>
  );
}

function EditableText({ label, value, disabled, onSave, onRemove, hideLabel }: { label: string; value: string; disabled: boolean; onSave: (t: string) => void; onRemove?: () => void; hideLabel?: boolean }) {
  const [text, setText] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(value);
  }, [value]);

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        {/* Clicking the text itself starts editing, so nothing has to be hunted for. */}
        <div
          className={cn("min-w-0 flex-1 rounded-md", !disabled && "cursor-text transition-colors hover:bg-primary/5 focus-visible:bg-primary/5")}
          {...(!disabled ? { role: "button", tabIndex: 0, "aria-label": `Edit ${label.toLowerCase()}`, onClick: () => setEditing(true), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setEditing(true); } } } : {})}
        >
          {!hideLabel && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>}
          <p className="text-sm">{value || <span className="text-muted">Nothing here yet.</span>}</p>
        </div>
        {!disabled && (
          <div className="flex shrink-0 gap-2 text-xs">
            <button type="button" className="text-primary hover:underline" onClick={() => setEditing(true)}>Edit</button>
            {onRemove && <button type="button" className="text-muted hover:text-err hover:underline" onClick={onRemove}>Remove</button>}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`edit-${label}-${value.slice(0, 8)}`}>{label}</label>
      <textarea id={`edit-${label}-${value.slice(0, 8)}`} rows={3} maxLength={label === "Summary" ? 2000 : 500} value={text} onChange={(e) => setText(e.target.value)} className={inputClass} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => { setEditing(false); onSave(text); }}>Save</Button>
        <Button size="sm" variant="ghost" onClick={() => { setText(value); setEditing(false); }}>Cancel</Button>
      </div>
    </div>
  );
}
