"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Download, FileText, Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useFeedback } from "@/components/ui/Feedback";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/resume";
import type { TemplateId, TemplateInfo, Version } from "@/lib/api/resume";
import { cn } from "@/lib/cn";

/** Tiny paper miniatures. They sit on white "paper" in every app theme, like the real PDF. */
function Mini({ id }: { id: TemplateId }) {
  const line = (w: string, c = "#9ca3af", h = 3) => <span className="block rounded-full" style={{ width: w, height: h, background: c }} />;
  const rule = (c = "#111827") => <span className="my-1 block h-px w-full" style={{ background: c }} />;
  return (
    <div aria-hidden="true" className="h-[132px] w-full overflow-hidden rounded-md border border-[#e5e7eb] bg-white p-2.5">
      {id === "classic" && (
        <div className="space-y-1">
          <div className="mx-auto w-1/2">{line("100%", "#111827", 5)}</div>
          <div className="mx-auto w-2/3">{line("100%", "#9ca3af", 2)}</div>
          {["Education", "Experience", "Projects"].map((h) => (
            <div key={h}>{line("34%", "#111827", 3)}{rule()}<div className="flex justify-between">{line("48%")}{line("20%")}</div></div>
          ))}
        </div>
      )}
      {id === "intern" && (
        <div className="space-y-1.5">
          {line("45%", "#111827", 6)}
          {line("70%", "#9ca3af", 2)}
          {["Skills", "Projects", "Experience"].map((h) => (
            <div key={h}>{line("28%", "#0f766e", 3)}{rule("#0f766e")}<span className="mt-0.5 block h-2.5 w-4/5 rounded-sm bg-[#e5e7eb] font-mono" />{line("55%")}</div>
          ))}
        </div>
      )}
      {id === "modern" && (
        <div className="space-y-1.5">
          <div className="rounded-sm bg-[#4f46e5] p-1.5">{line("42%", "#ffffff", 5)}<div className="mt-1">{line("65%", "#c7d2fe", 2)}</div></div>
          {["Summary", "Projects", "Experience"].map((h) => (<div key={h}>{line("24%", "#4f46e5", 3)}<div className="mt-1 space-y-1">{line("90%")}{line("60%")}</div></div>))}
        </div>
      )}
      {id === "clone" && (
        <div className="relative flex h-full flex-col items-center justify-center gap-1 text-center">
          <FileText className="h-7 w-7 text-[#6b7280]" />
          <span className="text-[11px] font-semibold text-[#374151]">Your own layout</span>
          <span className="text-[10px] text-[#6b7280]">fonts, header, section order</span>
        </div>
      )}
    </div>
  );
}

type Props = {
  version: Version;
  /** Called whenever the picker changed the version (fields saved, PDF exported). */
  onVersion: (v: Version) => void;
  onChanged: () => void;
};

export function TemplatePicker({ version, onVersion, onChanged }: Props) {
  const { toast } = useFeedback();
  const [templates, setTemplates] = useState<TemplateInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [chosen, setSelected] = useState<TemplateId>((version.template_id as TemplateId) || "classic");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const draft = version.status === "DRAFT";
  const contentKey = JSON.stringify(version.content);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let live = true;
    api.listTemplates().then((t) => live && setTemplates(t)).catch((e) => live && setLoadError(describeError(e)));
    return () => {
      live = false;
    };
  }, []);

  const clone = templates?.find((t) => t.id === "clone");
  // If template 4 is unavailable, use template 1 rather than showing a broken preview.
  const selected: TemplateId = chosen === "clone" && templates && !clone?.available ? "classic" : chosen;
  const info = templates?.find((t) => t.id === selected);

  // Live preview of the version's CURRENT content, refreshed (debounced) when it changes.
  useEffect(() => {
    if (!templates) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewing(true);
    const t = window.setTimeout(async () => {
      try {
        const blob = await api.previewTemplate(version.id, selected, selected === "clone" ? clone?.document_id : null);
        if (!live) return;
        const next = URL.createObjectURL(blob);
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = next;
        setPreviewUrl(next);
        setPreviewError(null);
      } catch (err) {
        if (live) setPreviewError(describeError(err));
      } finally {
        if (live) setPreviewing(false);
      }
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [version.id, selected, contentKey, templates, clone?.document_id]);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  async function exportPdf() {
    setBusy(true);
    try {
      const summary = await api.exportTemplate(version.id, selected, selected === "clone" ? clone?.document_id : null);
      const blob = await api.downloadPdf(version.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
      onVersion({ ...version, ...summary });
      onChanged();
      toast("PDF created and downloaded.");
    } catch (err) {
      toast(describeError(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="tpl-title" className="mt-8 space-y-5 border-t border-edge pt-6">
      <div>
        <h3 id="tpl-title" className="font-display text-xl font-semibold">Choose a resume template</h3>
        <p className="text-sm text-muted">Same content, four looks. The preview updates as you edit.</p>
      </div>

      {loadError && <p role="alert" className="text-sm text-err">{loadError}</p>}
      {!templates && !loadError && <Skeleton className="h-52 w-full" />}

      {templates && (
        <div role="radiogroup" aria-label="Resume template" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {templates.map((t) => {
            const on = selected === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!t.available}
                onClick={() => setSelected(t.id)}
                className={cn(
                  "relative flex flex-col gap-2 rounded-2xl border p-3 text-left transition-all",
                  on ? "border-primary bg-primary/10 shadow-pop" : "border-edge-strong hover:border-primary/60",
                  !t.available && "cursor-not-allowed opacity-60 hover:border-edge-strong",
                )}
              >
                <Mini id={t.id} />
                <span className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold">{t.number}</span>
                  <span className="text-sm font-bold leading-tight">{t.name}</span>
                </span>
                <span className="text-xs leading-snug text-muted">{t.available || t.id !== "clone" ? t.description : (t.reason ?? t.description)}</span>
                {on && <span aria-hidden="true" className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary"><Check className="h-3 w-3" /></span>}
              </button>
            );
          })}
        </div>
      )}

      {info?.id === "clone" && info.available && (
        <div className="rounded-2xl border border-edge-strong bg-surface-2 p-4 text-sm">
          <p className="font-bold">Matches your uploaded resume{info.source_name ? `: ${info.source_name}` : ""}</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {info.matched?.map((m) => <li key={m} className="rounded-full border border-edge-strong px-2.5 py-0.5 text-xs font-semibold">{m}</li>)}
          </ul>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{info.note}</p>
        </div>
      )}
      {clone && !clone.available && (
        <p className="flex items-start gap-1.5 text-xs text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Template 4 is unavailable: {clone.reason}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        {/* Fixed height: no layout shift while a new preview loads. */}
        <div className="relative h-[560px] overflow-hidden rounded-2xl border border-edge-strong bg-surface-2">
          {previewUrl && !previewError && <iframe title="Resume preview" src={`${previewUrl}#toolbar=0&navpanes=0`} className={cn("h-full w-full bg-white transition-opacity", previewing && "opacity-60")} />}
          {(!previewUrl || previewing) && !previewError && (
            <div role="status" className="absolute inset-x-0 top-3 flex justify-center"><span className="rounded-full bg-surface px-3 py-1 text-xs font-semibold shadow-card">Updating preview...</span></div>
          )}
          {previewError && <p role="alert" className="p-4 text-sm text-err">{previewError}</p>}
        </div>

        <div className="space-y-4">
          {draft ? <FieldsEditor version={version} onVersion={onVersion} onChanged={onChanged} /> : (
            <p className="rounded-xl border border-edge p-3 text-sm text-muted">This version is approved, so its content is locked. Pick a template and create your PDF.</p>
          )}
          <p className="text-xs text-muted">Edit the summary and each bullet in the resume above. Both the preview and the PDF use your latest edits.</p>
          {draft ? (
            <p className="text-sm text-muted">Approve this version to create the PDF in the template you chose.</p>
          ) : (
            <Button loading={busy} onClick={() => void exportPdf()} disabled={!info?.available}>
              <Download className="h-4 w-4" aria-hidden="true" /> Create PDF in this template
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/** Contact details and skills. Skills can be reordered or removed; adding one needs a profile entry first. */
function FieldsEditor({ version, onVersion, onChanged }: { version: Version; onVersion: (v: Version) => void; onChanged: () => void }) {
  const { toast } = useFeedback();
  const h = version.content.header;
  const [form, setForm] = useState({ name: h.name ?? "", headline: h.headline ?? "", email: h.email ?? "", location: h.location ?? "" });
  const [skills, setSkills] = useState<string[]>(version.content.skills);
  const [busy, setBusy] = useState(false);
  const dirty = form.name !== (h.name ?? "") || form.headline !== (h.headline ?? "") || form.email !== (h.email ?? "") || form.location !== (h.location ?? "")
    || JSON.stringify(skills) !== JSON.stringify(version.content.skills);

  async function save() {
    setBusy(true);
    try {
      const next = await api.editFields(version.id, { ...form, skills });
      onVersion(next);
      onChanged();
      toast("Saved.");
    } catch (err) {
      toast(describeError(err), "error");
    } finally {
      setBusy(false);
    }
  }
  const move = (i: number, d: number) => setSkills((s) => {
    const n = [...s];
    const j = i + d;
    if (j < 0 || j >= n.length) return s;
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  return (
    <fieldset className="space-y-3 rounded-2xl border border-edge-strong p-4">
      <legend className="px-1 text-sm font-bold">Contact details and skills</legend>
      {([["name", "Name"], ["headline", "Headline"], ["email", "Email"], ["location", "Location"]] as const).map(([k, label]) => (
        <div key={k} className="space-y-1">
          <label htmlFor={`tf-${k}`} className="text-xs font-semibold">{label}</label>
          <input id={`tf-${k}`} className="field !py-1.5" value={form[k]} maxLength={k === "email" ? 320 : 200} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
        </div>
      ))}
      {skills.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold">Skills (order and removal)</p>
          <ul className="space-y-1">
            {skills.map((s, i) => (
              <li key={s} className="flex items-center gap-1 rounded-lg border border-edge px-2 py-1 text-sm">
                <span className="min-w-0 flex-1 truncate">{s}</span>
                <button type="button" aria-label={`Move ${s} up`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
                <button type="button" aria-label={`Move ${s} down`} disabled={i === skills.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
                <button type="button" aria-label={`Remove ${s}`} onClick={() => setSkills((x) => x.filter((v) => v !== s))} className="rounded p-1 text-muted hover:bg-coral/15 hover:text-coral"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button size="sm" loading={busy} disabled={!dirty || !form.name.trim()} onClick={() => void save()}>Save details</Button>
    </fieldset>
  );
}
