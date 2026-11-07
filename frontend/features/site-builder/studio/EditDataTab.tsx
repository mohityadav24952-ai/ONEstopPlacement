"use client";

import { useEffect, useRef, useState } from "react";
import { CloudUpload, Loader2, RefreshCw, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useFeedback } from "@/components/ui/Feedback";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/site";
import { getDashboard } from "@/lib/api/coding";
import type { PortfolioData } from "@/types/portfolio";
import { cn } from "@/lib/cn";
import { Field } from "@/features/site-builder/studio/fields";
import { BasicsEditor, EducationAchievementsEditor, ExperienceEditor, ProjectsEditor, SkillsEditor } from "@/features/site-builder/studio/editors";

const SUBTABS = [
  ["basics", "Basics & Socials"],
  ["projects", "Projects"],
  ["experience", "Experience"],
  ["skills", "Skills"],
  ["edu", "Education & Achievements"],
] as const;
type Sub = (typeof SUBTABS)[number][0];

const HANDLE_KEYS = ["github", "leetcode", "codechef", "codeforces"] as const;
const LABELS = { github: "GitHub username", leetcode: "LeetCode username", codechef: "CodeChef username", codeforces: "Codeforces username" };

type Props = {
  data: PortfolioData;
  /** Saves the draft and returns the server copy (or null if it failed). */
  onSave: (draft: PortfolioData) => Promise<PortfolioData | null>;
  onResult: (r: api.SiteResult) => void;
  uploadRef: React.RefObject<(() => void) | null>;
};

export function EditDataTab({ data, onSave, onResult, uploadRef }: Props) {
  const { toast, confirm } = useFeedback();
  const [draft, setDraft] = useState<PortfolioData>(data);
  const [sub, setSub] = useState<Sub>("basics");
  const [busy, setBusy] = useState<"save" | "sync" | "upload" | null>(null);
  const elapsed = useElapsedSeconds(busy === "upload");
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [handles, setHandles] = useState<Record<(typeof HANDLE_KEYS)[number], string>>(() =>
    Object.fromEntries(HANDLE_KEYS.map((k) => [k, data.codingStats[k]?.username ?? ""])) as Record<(typeof HANDLE_KEYS)[number], string>,
  );
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  // Accounts already connected in the Coding dashboard fill any empty handle here, so the same
  // username (and the backend's cached GitHub data) is reused instead of typed and fetched again.
  useEffect(() => {
    let cancelled = false;
    getDashboard()
      .then((entries) => {
        if (cancelled) return;
        const connected: Partial<Record<(typeof HANDLE_KEYS)[number], string>> = {};
        for (const e of entries) {
          const key = e.platform.toLowerCase() as (typeof HANDLE_KEYS)[number];
          if (e.connected && HANDLE_KEYS.includes(key) && e.username) connected[key] = e.username;
        }
        setHandles((prev) => {
          const next = { ...prev };
          for (const k of HANDLE_KEYS) if (!next[k].trim() && connected[k]) next[k] = connected[k]!;
          return next;
        });
      })
      .catch(() => {}); // optional convenience; the fields still work without it
    return () => {
      cancelled = true;
    };
  }, []);

  // The header's "Upload Resume PDF" button opens the same picker.
  useEffect(() => {
    uploadRef.current = () => fileRef.current?.click();
    return () => {
      uploadRef.current = null;
    };
  }, [uploadRef]);

  async function save() {
    setBusy("save");
    try {
      const saved = await onSave(draft);
      if (saved) {
        setDraft(saved);
        toast("Saved.");
      }
    } finally {
      setBusy(null);
    }
  }

  async function sync() {
    setBusy("sync");
    setWarnings([]);
    try {
      if (dirty && !(await onSave(draft))) return;
      const result = await api.syncStats(Object.fromEntries(HANDLE_KEYS.map((k) => [k, handles[k].trim() || undefined])));
      onResult(result);
      setDraft(result.data);
      setWarnings(result.warnings);
      toast(result.warnings.length ? "Synced with some notes below." : "Live stats updated.");
    } catch (err) {
      toast(describeError(err), "error");
    } finally {
      setBusy(null);
    }
  }

  async function upload(file: File) {
    const hasContent = data.projects.length + data.experience.length + data.education.length > 0;
    if (hasContent && !(await confirm({ title: "Replace your sections with this resume?", message: "Projects, experience, education, skills and achievements will be replaced by what is in the PDF. Your template, theme and links are kept.", confirmLabel: "Import resume" }))) return;
    setBusy("upload");
    setWarnings([]);
    try {
      const result = await api.uploadResume(file);
      onResult(result);
      setDraft(result.data);
      setHandles(Object.fromEntries(HANDLE_KEYS.map((k) => [k, result.data.codingStats[k]?.username ?? ""])) as typeof handles);
      setWarnings(result.warnings);
      toast("Resume imported. Review each tab, then publish when you are happy.");
    } catch (err) {
      toast(describeError(err), "error");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const Editor = { basics: BasicsEditor, projects: ProjectsEditor, experience: ExperienceEditor, skills: SkillsEditor, edu: EducationAchievementsEditor }[sub];

  return (
    <div className="space-y-6 pb-24">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card accent="mint" eyebrow="AI resume import" title="Upload your resume PDF" description="Reads your text and hidden links, fills every section, then fetches live coding stats and project screenshots. Review the result: it is a draft.">
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Resume PDF" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
          <button type="button" disabled={busy !== null} onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void upload(f); }}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-edge-strong p-8 text-center transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60">
            {busy === "upload" ? (
              <Loader2 className="h-8 w-8 text-primary motion-safe:animate-spin" aria-hidden="true" />
            ) : (
              <CloudUpload className="h-8 w-8 text-primary" aria-hidden="true" />
            )}
            <span className="text-sm font-bold">{busy === "upload" ? "Uploading and reading your PDF..." : "Drop a PDF here, or click to choose"}</span>
            <span className="text-xs text-muted">Text-based PDF, up to 5 MB. Scanned images cannot be read.</span>
          </button>
          {busy === "upload" && <ParsingNotice seconds={elapsed} />}
        </Card>

        <Card accent="lavender" eyebrow="Live coding profiles" title="Sync live stats" description="Fetches public numbers from each site. If a site is slow, your existing values are kept.">
          <div className="grid gap-3 sm:grid-cols-2">
            {HANDLE_KEYS.map((k) => (
              <Field key={k} label={LABELS[k]} value={handles[k]} onChange={(v) => setHandles((h) => ({ ...h, [k]: v }))} maxLength={60} />
            ))}
          </div>
          <Button className="mt-4" variant="secondary" loading={busy === "sync"} disabled={busy !== null && busy !== "sync"} onClick={() => void sync()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Sync Live Stats Now
          </Button>
        </Card>
      </div>

      {warnings.length > 0 && (
        <ul role="status" className="space-y-1 rounded-2xl border border-warn/40 bg-warn/10 p-4 text-sm">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}

      <div role="tablist" aria-label="Sections" className="flex flex-wrap gap-1.5">
        {SUBTABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={sub === id} onClick={() => setSub(id)}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-bold transition-colors", sub === id ? "border-primary bg-primary text-on-primary" : "border-edge-strong text-muted hover:border-primary hover:text-fg")}>
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="panel rounded-2xl p-5 sm:p-6"><Editor data={draft} onChange={setDraft} /></div>

      <div className="sticky bottom-4 z-30 flex justify-center">
        <div className={cn("sticker flex items-center gap-3 rounded-full px-4 py-2 transition-opacity", !dirty && "opacity-70")}>
          <span role="status" className="text-sm font-semibold">{dirty ? "You have unsaved changes" : "All changes saved"}</span>
          {dirty && <Button size="sm" variant="ghost" onClick={() => setDraft(data)}>Discard</Button>}
          <Button size="sm" loading={busy === "save"} disabled={!dirty} onClick={() => void save()}><Save className="h-4 w-4" aria-hidden="true" /> Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

/** Whole seconds since `running` became true; 0 while it is false. */
function useElapsedSeconds(running: boolean): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) return;
    const started = Date.now();
    const id = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      window.clearInterval(id);
      setSeconds(0); // the next upload starts from 0
    };
  }, [running]);
  return running ? seconds : 0;
}

/** Friendly stage label for the upload. The server does not stream progress, so stages follow the typical
 * timing of each step (text extraction is quick; the AI step is the long one) rather than claiming a percentage. */
function parsingStage(seconds: number): string {
  if (seconds < 4) return "Reading PDF text...";
  if (seconds < 12) return "Extracting skills & experience...";
  if (seconds < 25) return "Sorting projects, education and achievements...";
  return "Almost there, final touches...";
}

/** Shown while the AI parses an uploaded resume, which can take a while: says what is happening and that
 * the page is not stuck. The elapsed time is real; there is no made-up progress percentage. */
function ParsingNotice({ seconds }: { seconds: number }) {
  return (
    <div role="status" aria-live="polite" className="mt-4 overflow-hidden rounded-2xl border border-primary/50 bg-primary/10 p-4 shadow-pop">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
          <Sparkles className="h-5 w-5 motion-safe:animate-pulse" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold sm:text-base">{parsingStage(seconds)}</p>
          <p className="mt-1 text-xs text-muted">
            Reading the text and links, sorting them into sections, then fetching live stats.{" "}
            <span aria-hidden="true" className="tabular-nums">{seconds}s elapsed.</span>
            {seconds >= 30 && " Still working: large resumes or a busy AI service can take up to a minute."}
          </p>
        </div>
      </div>
      <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/15">
        <div className="h-full w-1/3 rounded-full bg-primary motion-safe:animate-[parse-slide_1.4s_ease-in-out_infinite]" />
      </div>
      <style>{"@keyframes parse-slide{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}"}</style>
    </div>
  );
}
