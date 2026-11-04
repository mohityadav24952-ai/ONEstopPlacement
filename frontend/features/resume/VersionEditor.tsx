"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/resume";
import type { Bullet, Version } from "@/lib/api/resume";

const inputClass = "w-full rounded-md border border-edge bg-app px-3 py-2 text-sm text-fg";

export function VersionEditor({ id, onChanged }: { id: string; onChanged: () => void }) {
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

  async function run(action: () => Promise<Version | unknown>) {
    setBusy(true);
    setError(null);
    try {
      const result = await action();
      if (result && typeof result === "object" && "content" in result) setVersion(result as Version);
      else await load();
      onChanged();
    } catch (err) {
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
      title={version.title}
      description={draft ? "Draft: review, edit, then approve." : "Approved. This version can no longer change."}
      action={<Badge tone={draft ? "warn" : "ok"}>{version.status.toLowerCase()}</Badge>}
    >
      {version.stale && (
        <p role="status" className="mb-4 rounded-md border border-warn/40 bg-warn/10 p-3 text-sm">
          Your profile changed after this version was created. It still shows the old content. Create a new draft to include your changes.
        </p>
      )}
      {version.notes?.map((n) => <p key={n} role="status" className="mb-2 text-sm text-warn">{n}</p>)}
      {error && <p role="alert" className="mb-3 text-sm text-err">{error}</p>}

      {openFlags.length > 0 && (
        <section aria-label="Unverified claims" className="mb-5 space-y-2">
          <h3 className="font-display font-semibold">Needs your decision</h3>
          {openFlags.map((f) => (
            <div key={f.id} className="rounded-md border border-warn/40 p-3 text-sm">
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
            <div key={p.id} className="rounded-md border border-ai/40 p-3 text-sm">
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

      <div className="space-y-5">
        <div>
          <h3 className="font-display text-lg font-bold">{c.header.name ?? "Add your name on the profile page"}</h3>
          <p className="text-sm text-muted">{[c.header.headline, c.header.email, c.header.location].filter(Boolean).join(" · ")}</p>
        </div>

        <EditableText label="Summary" value={c.summary.text ?? ""} disabled={!draft || busy} onSave={(t) => run(() => api.editVersion(id, { summary: t }))} />

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

      <div className="mt-6 flex flex-wrap gap-2 border-t border-edge pt-4">
        {draft ? (
          <Button loading={busy} disabled={openFlags.length > 0} onClick={() => run(() => api.approveVersion(id))}>
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

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h4>
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
        <div>
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
