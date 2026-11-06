"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, FileCode2, FileUp, Link2, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFeedback } from "@/components/ui/Feedback";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/resume";
import type { LatexLink, Parsed, ResumeDoc } from "@/lib/api/resume";
import { cn } from "@/lib/cn";

const SECTIONS = ["education", "experience", "projects", "skills", "achievements"] as const;

function label(section: string, fields: Record<string, unknown>): string {
  const key = { education: "institution", experience: "title", projects: "title", skills: "name", achievements: "title" }[section] ?? "title";
  return String(fields[key] ?? "");
}

export function DocumentsPanel() {
  const { toast, confirm } = useFeedback();
  const [dragging, setDragging] = useState(false);
  const [docs, setDocs] = useState<ResumeDoc[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<{ id: string; parsed: Parsed } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setDocs(await api.listDocuments());
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  const onFile = (file: File | undefined) =>
    file &&
    run(async () => {
      await api.uploadDocument(file);
      await load();
      toast(`Uploaded ${file.name}. Press Parse to read it.`);
    });

  const openReview = (doc: ResumeDoc) =>
    run(async () => {
      const result = doc.parse_status === "PARSED" ? await api.getParsed(doc.id) : await api.parseDocument(doc.id);
      const found = (result as { intake?: { created: number } }).intake?.created ?? 0;
      if (found > 0) {
        toast(`Found ${found} extra item(s) in your resume (coding links and profile details). Review them on the Coding Dashboard or Profile and use Approve All.`);
        window.dispatchEvent(new Event("intake-changed"));
      }
      const everything = new Set<string>();
      SECTIONS.forEach((s) => result.parsed[s]?.forEach((_, i) => everything.add(`${s}:${i}`)));
      setPicked(everything);
      setReview({ id: doc.id, parsed: result.parsed });
      await load();
    });

  const onTex = (doc: ResumeDoc, file: File | undefined) =>
    file &&
    run(async () => {
      const updated = await api.uploadLatex(doc.id, file);
      await load();
      const n = updated.latex_links?.length ?? 0;
      toast(n ? `Found ${n} hyperlink(s) in ${file.name}. Choose which ones may go on your resume.` : `No hyperlinks found in ${file.name}.`);
    });

  const decideLinks = (doc: ResumeDoc, decisions: Record<string, "approved" | "rejected">) =>
    run(async () => {
      await api.decideLatexLinks(doc.id, decisions);
      await load();
      toast("Saved. Allowed links are added to the drafts you create from now on.");
    });

  const doImport = () =>
    review &&
    run(async () => {
      const items: Record<string, Record<string, unknown>[]> = {};
      SECTIONS.forEach((s) => {
        items[s] = (review.parsed[s] ?? []).filter((_, i) => picked.has(`${s}:${i}`)).map((it) => it.fields);
      });
      const r = await api.importItems(review.id, items);
      setMessage(`${r.proposals_created} suggestion(s) created${r.skipped_duplicates ? `, ${r.skipped_duplicates} duplicate skill(s) skipped` : ""}.`);
      toast(`${r.proposals_created} suggestion(s) created. Approve them on your profile page.`);
      setReview(null);
    });

  return (
    <Card accent="coral" eyebrow="Step 1" title="Import your existing resume" description="Optional. Upload a text-based PDF or DOCX (max 5 MB) to pre-fill your profile. Nothing is added until you approve it.">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void onFile(e.dataTransfer.files?.[0]); }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center transition-colors ${dragging ? "border-coral bg-coral/10" : "border-edge-strong hover:border-edge-strong hover:bg-surface-2/60"}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-edge-strong bg-coral/20 shadow-pop">
          <FileUp className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="font-display text-lg font-semibold">Drop a PDF or DOCX here</span>
        <span className="text-sm text-muted">or click to choose a file. Text-based files up to 5 MB.</span>
        <input type="file" accept=".pdf,.docx" className="sr-only" disabled={busy} onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </label>

      {error && <p role="alert" className="mt-3 text-sm text-err">{error}</p>}
      {message && (
        <p role="status" className="mt-3 text-sm text-ok">
          {message} <Link href="/profile" className="underline">Review on your profile</Link>
        </p>
      )}

      {docs && docs.length === 0 && <EmptyState className="mt-4" title="No resume uploaded" description="You can also build your profile by hand." />}
      <ul className="mt-4 space-y-2">
        {docs?.map((d) => (
          <li key={d.id} className="rounded-xl border border-edge p-3">
           <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{d.original_name}</p>
              <Badge tone={d.parse_status === "PARSED" ? "ok" : d.parse_status === "FAILED" ? "err" : "neutral"}>{d.parse_status.toLowerCase()}</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-edge-strong px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-2", busy && "pointer-events-none opacity-60")}
                title="Optional: the LaTeX source of this resume, so its hyperlinks can be kept">
                <FileCode2 className="h-3.5 w-3.5" aria-hidden="true" /> {d.latex_links?.length ? "Replace .tex" : "Add .tex (optional)"}
                <input type="file" accept=".tex" className="sr-only" disabled={busy} onChange={(e) => { void onTex(d, e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => openReview(d)}>
                {d.parse_status === "PARSED" ? "Review" : d.parse_status === "FAILED" ? "Retry parse" : "Parse"}
              </Button>
              <button type="button" aria-label={`Delete ${d.original_name}`} disabled={busy} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-err"
                onClick={async () => {
                  const ok = await confirm({ title: "Delete this file?", message: `“${d.original_name}” and everything extracted from it will be permanently deleted.`, confirmLabel: "Delete", tone: "danger" });
                  if (!ok) return;
                  await run(async () => { await api.deleteDocument(d.id); if (review?.id === d.id) setReview(null); await load(); toast("File deleted."); });
                }}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
           </div>
            {d.latex_links && d.latex_links.length > 0 && <LinkPermissions links={d.latex_links} busy={busy} onDecide={(dec) => decideLinks(d, dec)} />}
          </li>
        ))}
      </ul>

      {review && (
        <div className="mt-5 space-y-4 rounded-xl border border-primary/40 p-4">
          <h3 className="font-display font-semibold">Import review</h3>
          <p className="text-sm text-muted">
            Extracted automatically. Tick what is correct. Each ticked item becomes a suggestion you still approve on your profile page.
            {review.parsed.dropped_count > 0 && ` ${review.parsed.dropped_count} item(s) were dropped because they could not be matched to your file.`}
          </p>
          {review.parsed.needs_manual_entry && <p role="status" className="text-sm text-warn">Nothing could be extracted reliably. Please add details on your profile page.</p>}
          {SECTIONS.map((s) =>
            review.parsed[s]?.length ? (
              <fieldset key={s}>
                <legend className="mb-1 text-sm font-medium capitalize">{s}</legend>
                <ul className="space-y-1">
                  {review.parsed[s].map((it, i) => {
                    const id = `${s}:${i}`;
                    return (
                      <li key={id} className="flex items-start gap-2 text-sm">
                        <input id={id} type="checkbox" className="mt-1" checked={picked.has(id)}
                          onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(id); else n.delete(id); return n; })} />
                        <label htmlFor={id}>
                          {label(s, it.fields)}
                          {s === "skills" && typeof it.fields.category === "string" && <span className="ml-1 rounded-full border border-edge px-1.5 text-[11px] font-semibold">{it.fields.category}</span>}
                          {" "}<span className="text-xs text-muted">({it.confidence} confidence)</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ) : null,
          )}
          <div className="flex gap-2">
            <Button onClick={doImport} loading={busy} disabled={picked.size === 0}>Create suggestions ({picked.size})</Button>
            <Button variant="ghost" onClick={() => setReview(null)}>Close</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Asks the user, link by link, whether a hyperlink from their .tex file may be injected into generated resumes. */
function LinkPermissions({ links, busy, onDecide }: { links: LatexLink[]; busy: boolean; onDecide: (d: Record<string, "approved" | "rejected">) => void }) {
  const pending = links.filter((l) => l.status === "pending");
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold"><Link2 className="h-4 w-4" aria-hidden="true" />Hyperlinks found in your LaTeX file</p>
      <p className="text-xs text-muted">May we put these links into the resumes we generate for you? Nothing is added unless you allow it.</p>
      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.url} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="min-w-0 break-all"><span className="font-semibold">{l.text}</span> <span className="text-xs text-muted">{l.url}</span></span>
            <span className="flex shrink-0 gap-1.5">
              <button type="button" disabled={busy || l.status === "approved"} aria-pressed={l.status === "approved"} onClick={() => onDecide({ [l.url]: "approved" })}
                className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", l.status === "approved" ? "border-ok bg-ok/15 text-ok" : "border-edge-strong hover:bg-ok/10")}>
                <Check className="h-3 w-3" aria-hidden="true" />{l.status === "approved" ? "Allowed" : "Allow"}
              </button>
              <button type="button" disabled={busy || l.status === "rejected"} aria-pressed={l.status === "rejected"} onClick={() => onDecide({ [l.url]: "rejected" })}
                className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold", l.status === "rejected" ? "border-err bg-err/15 text-err" : "border-edge-strong hover:bg-err/10")}>
                <X className="h-3 w-3" aria-hidden="true" />{l.status === "rejected" ? "Refused" : "Refuse"}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {pending.length > 1 && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onDecide(Object.fromEntries(pending.map((l) => [l.url, "approved" as const])))}>
          Allow the {pending.length} remaining links
        </Button>
      )}
    </div>
  );
}
