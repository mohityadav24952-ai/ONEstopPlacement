"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Download, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/portfolio";
import type { ConsentSummary, PortfolioSummary, PVersion, Theme } from "@/lib/api/portfolio";

const inputClass = "field";
const SECTIONS = ["about", "projects", "skills", "education", "achievements", "contact"];

export function PortfolioBuilder() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [list, setList] = useState<PortfolioSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, l] = await Promise.all([api.listThemes(), api.listPortfolios()]);
      setThemes(t);
      setList(l);
    } catch (err) {
      setError(describeError(err));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const out = await api.createPortfolio({
        title: String(data.get("title")).trim(),
        theme_id: String(data.get("theme_id")),
        sections: SECTIONS.filter((s) => data.get(`s-${s}`) === "on"),
      });
      setNotes(out.notes);
      setOpenId(out.version.id);
      await load();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Create a portfolio" description="The text is drafted from your profile. Email and location are never included unless you opt in. Output is a static site with no scripts.">
        <form onSubmit={onCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pf-title" className="text-sm font-medium">Name for this portfolio</label>
              <input id="pf-title" name="title" required maxLength={120} defaultValue="My portfolio" className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="pf-theme" className="text-sm font-medium">Theme</label>
              <select id="pf-theme" name="theme_id" className={inputClass} defaultValue="minimal">
                {themes.map((t) => <option key={t.id} value={t.id}>{t.name} — {t.description}</option>)}
              </select>
            </div>
          </div>
          <fieldset>
            <legend className="mb-1 text-sm font-medium">Sections</legend>
            <div className="flex flex-wrap gap-3">
              {SECTIONS.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm capitalize">
                  <input type="checkbox" name={`s-${s}`} defaultChecked /> {s}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" loading={busy}>Create draft</Button>
        </form>
        {error && <p role="alert" className="mt-3 text-sm text-err">{error}</p>}
        {notes.map((n) => <p key={n} role="status" className="mt-2 text-sm text-warn">{n}</p>)}
      </Card>

      <Card title="Your portfolios">
        {list === null ? <Skeleton className="h-16 w-full" /> : list.length === 0 ? (
          <EmptyState title="No portfolios yet" description="Complete your profile first, then create a draft above." />
        ) : (
          <ul className="space-y-3">
            {list.map((p) => (
              <li key={p.id} className="rounded-xl border border-edge p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{p.title}</p>
                  <button type="button" aria-label={`Delete ${p.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-err"
                    onClick={async () => {
                      if (!window.confirm("Delete this portfolio, all versions and exports?")) return;
                      try { await api.deletePortfolio(p.id); setOpenId(null); await load(); } catch (err) { setError(describeError(err)); }
                    }}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {p.versions.map((v) => (
                    <li key={v.id}>
                      <button type="button" onClick={() => setOpenId(v.id)} className="flex items-center gap-1.5 rounded-xl border border-edge px-2 py-1 text-xs hover:bg-surface-2">
                        {new Date(v.created_at).toLocaleDateString()}
                        <Badge tone={v.status === "APPROVED" ? "ok" : "warn"}>{v.status.toLowerCase()}</Badge>
                        {v.stale && <Badge tone="warn">profile changed</Badge>}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {openId && <VersionPanel key={openId} id={openId} themes={themes} onChanged={() => void load()} />}
    </div>
  );
}

function VersionPanel({ id, themes, onChanged }: { id: string; themes: Theme[]; onChanged: () => void }) {
  const [v, setV] = useState<PVersion | null>(null);
  const [html, setHtml] = useState<string>("");
  const [consent, setConsent] = useState<ConsentSummary | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [ver, preview] = await Promise.all([api.getVersion(id), api.getPreview(id)]);
      setV(ver);
      setHtml(preview);
      setConsent(null);
      setAgreed(false);
    } catch (err) {
      setError(describeError(err));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function run(action: () => Promise<unknown>, reload = true) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (reload) await refresh();
      onChanged();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    await run(async () => {
      const blob = await api.downloadExport(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "portfolio.zip";
      a.click();
      URL.revokeObjectURL(url);
    }, false);
  }

  if (!v) return error ? <p role="alert" className="text-sm text-err">{error}</p> : <Skeleton className="h-64 w-full" />;
  const draft = v.status === "DRAFT";
  const c = v.content;
  const report = v.validation_report;

  return (
    <Card title="Portfolio editor" description={draft ? "Edit, preview, validate, then approve." : "Approved. Export it and publish it yourself."} action={<Badge tone={draft ? "warn" : "ok"}>{v.status.toLowerCase()}</Badge>}>
      {error && <p role="alert" className="mb-3 text-sm text-err">{error}</p>}
      {v.stale && <p role="status" className="mb-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm">Your profile changed after this draft. Create a new draft to include the changes.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-sm font-medium">Theme
              <select disabled={!draft || busy} value={v.theme_id} onChange={(e) => run(() => api.editVersion(id, { theme_id: e.target.value }))} className={inputClass}>
                {themes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">Accent
              <select disabled={!draft || busy} value={v.theme_options.accent ?? "blue"} onChange={(e) => run(() => api.editVersion(id, { accent: e.target.value }))} className={inputClass}>
                {(themes[0]?.options.accent ?? ["blue"]).map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
          </div>

          <TextEdit label="About" value={c.about.text} disabled={!draft || busy} rows={4} onSave={(t) => run(() => api.editVersion(id, { about_text: t }))} />

          {c.projects.map((p) => (
            <div key={p.id} className="rounded-xl border border-edge p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{p.title}</p>
                {draft && <button type="button" className="text-xs text-muted hover:text-err hover:underline" onClick={() => run(() => api.editVersion(id, { remove_project_ids: [p.id] }))}>Remove</button>}
              </div>
              <TextEdit label={`${p.title} description`} value={p.blurb} disabled={!draft || busy} rows={2} onSave={(t) => run(() => api.editVersion(id, { project_blurbs: { [p.id]: t } }))} />
            </div>
          ))}

          <fieldset className="space-y-1.5 rounded-xl border border-edge p-3" disabled={!draft || busy}>
            <legend className="px-1 text-sm font-medium">Sensitive details (off by default)</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.contact.include_email} onChange={(e) => run(() => api.editVersion(id, { include_email: e.target.checked }))} /> Publish my email address{c.contact.email ? ` (${c.contact.email})` : ""}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.contact.include_location} onChange={(e) => run(() => api.editVersion(id, { include_location: e.target.checked }))} /> Publish my location{c.contact.location ? ` (${c.contact.location})` : ""}</label>
          </fieldset>
        </div>

        <div>
          <p className="mb-1 text-sm font-medium">Preview</p>
          {/* sandbox="" blocks scripts, forms and navigation inside the preview */}
          <iframe title="Portfolio preview" sandbox="" srcDoc={html} className="h-[28rem] w-full rounded-xl border border-edge bg-white" />
        </div>
      </div>

      {draft && (
        <div className="mt-6 space-y-3 border-t border-edge pt-4">
          <Button variant="secondary" loading={busy} onClick={() => run(async () => { await api.validateVersion(id); })}>Check before approving</Button>
          {report && (
            <div role="status" className="space-y-1 text-sm">
              {report.errors.map((e, i) => <p key={`e${i}`} className="text-err">Blocking: {e.message} ({e.where})</p>)}
              {report.warnings.map((w, i) => <p key={`w${i}`} className="text-warn">Note: {w.message}</p>)}
              {report.ok && <p className="text-ok">No blocking problems found.</p>}
            </div>
          )}
          {report?.ok && !consent && <Button variant="secondary" onClick={() => run(async () => setConsent(await api.consentSummary(id)), false)}>Review what will be public</Button>}
          {consent && (
            <div className="rounded-xl border border-primary/40 p-3 text-sm">
              <p className="font-medium">{consent.statement}</p>
              <ul className="mt-2 list-disc pl-5">{consent.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <label className="mt-3 flex items-center gap-2"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> I have reviewed this and agree it may be made public.</label>
              <Button className="mt-3" disabled={!agreed} loading={busy} onClick={() => run(() => api.approveVersion(id, consent.summary_hash))}>Approve portfolio</Button>
            </div>
          )}
        </div>
      )}

      {!draft && (
        <div className="mt-6 space-y-3 border-t border-edge pt-4">
          {!v.has_export ? (
            <Button loading={busy} onClick={() => run(() => api.exportVersion(id))}>Create export (ZIP)</Button>
          ) : (
            <Button loading={busy} onClick={download}><Download className="h-4 w-4" aria-hidden="true" /> Download portfolio.zip</Button>
          )}
          <p className="text-sm text-muted">
            The ZIP is a plain static site (index.html and style.css). Publish it yourself: drag the unzipped folder onto Netlify Drop, run{" "}
            <code>vercel --prod</code> in it, or push it to a GitHub repository with Pages enabled. Nothing is published automatically.
          </p>
        </div>
      )}
    </Card>
  );
}

function TextEdit({ label, value, disabled, rows, onSave }: { label: string; value: string; disabled: boolean; rows: number; onSave: (t: string) => void }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(value);
  }, [value]);
  const id = `te-${label.replace(/\W+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <textarea id={id} rows={rows} maxLength={2000} value={text} disabled={disabled} onChange={(e) => setText(e.target.value)} onBlur={() => text !== value && onSave(text)} className={inputClass} />
    </div>
  );
}
