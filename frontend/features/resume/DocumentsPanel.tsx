"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileUp, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { useFeedback } from "@/components/ui/Feedback";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/resume";
import type { Parsed, ResumeDoc } from "@/lib/api/resume";

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
      const everything = new Set<string>();
      SECTIONS.forEach((s) => result.parsed[s]?.forEach((_, i) => everything.add(`${s}:${i}`)));
      setPicked(everything);
      setReview({ id: doc.id, parsed: result.parsed });
      await load();
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
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${dragging ? "border-coral bg-coral/10" : "border-ink/30 hover:border-ink hover:bg-surface-2/60"}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-ink bg-coral/20 shadow-[3px_3px_0_var(--ink)]">
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
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-edge p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{d.original_name}</p>
              <Badge tone={d.parse_status === "PARSED" ? "ok" : d.parse_status === "FAILED" ? "err" : "neutral"}>{d.parse_status.toLowerCase()}</Badge>
            </div>
            <div className="flex gap-2">
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
                          {label(s, it.fields)} <span className="text-xs text-muted">({it.confidence} confidence)</span>
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
