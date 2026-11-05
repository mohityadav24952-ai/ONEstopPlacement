"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import type { BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/resume";
import type { Analysis } from "@/lib/api/resume";

const inputClass = "field";
const TONE: Record<string, BadgeTone> = { matched: "ok", partial: "warn", missing: "err" };

export function TargetRolePanel({ onDraft }: { onDraft: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  async function onAnalyse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const opt = (k: string) => String(data.get(k) ?? "").trim() || undefined;
    setBusy(true);
    setError(null);
    try {
      const jd = await api.createJd({ text: String(data.get("text") ?? ""), company: opt("company"), role_title: opt("role_title") });
      setAnalysis(await api.analyse(jd.id));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onCreate() {
    if (!analysis) return;
    setBusy(true);
    setError(null);
    try {
      const v = await api.createVersion(analysis.id);
      onDraft(v.id);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card accent="coral" eyebrow="Step 2" title="Target role" description="Paste a job description. Requirements are matched to your profile by code, not guessed.">
      <form onSubmit={onAnalyse} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="jd-company" className="text-sm font-medium">Company (optional)</label>
            <input id="jd-company" name="company" maxLength={200} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="jd-role" className="text-sm font-medium">Role (optional)</label>
            <input id="jd-role" name="role_title" maxLength={200} className={inputClass} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="jd-text" className="text-sm font-medium">Job description</label>
          <textarea id="jd-text" name="text" required minLength={50} maxLength={15000} rows={7} className={inputClass} />
        </div>
        <Button type="submit" loading={busy}>Analyse</Button>
      </form>

      {error && <p role="alert" className="mt-3 text-sm text-err">{error}</p>}

      {analysis && (
        <div className="mt-5 space-y-3">
          {analysis.jd_quality === "low" && (
            <p role="status" className="text-sm text-warn">Few requirements could be found. A fuller job description gives better results.</p>
          )}
          <MatchSummary analysis={analysis} />
          <ul className="space-y-2">
            {analysis.requirements.map((r) => {
              const m = analysis.matches.find((x) => x.requirement_id === r.id);
              return (
                <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-edge p-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{r.text} <span className="text-xs font-normal text-muted">({r.importance})</span></p>
                    <p className="text-xs text-muted">“{r.jd_quote}”</p>
                  </div>
                  {m && <Badge tone={TONE[m.status]}>{m.status}</Badge>}
                </li>
              );
            })}
          </ul>
          <Button onClick={onCreate} loading={busy}>Create tailored draft</Button>
        </div>
      )}
    </Card>
  );
}

function MatchSummary({ analysis }: { analysis: Analysis }) {
  const total = analysis.matches.length;
  const count = (s: string) => analysis.matches.filter((m) => m.status === s).length;
  if (total === 0) return null;
  const parts = [
    { label: "Matched", n: count("matched"), bar: "bg-mint" },
    { label: "Partial", n: count("partial"), bar: "bg-orange" },
    { label: "Missing", n: count("missing"), bar: "bg-coral" },
  ];
  return (
    <div className="rounded-2xl border border-edge-strong bg-surface-2/50 p-4">
      <p className="font-display text-xl font-semibold">
        {count("matched")} of {total} requirements matched by your profile
      </p>
      <div role="img" aria-label={parts.map((p) => `${p.label} ${p.n}`).join(", ")} className="mt-3 flex h-3 overflow-hidden rounded-full border border-edge-strong">
        {parts.map((p) => p.n > 0 && <span key={p.label} className={p.bar} style={{ width: `${(p.n / total) * 100}%` }} />)}
      </div>
      <ul className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-1.5"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm border border-edge-strong ${p.bar}`} />{p.label} {p.n}</li>
        ))}
      </ul>
    </div>
  );
}
