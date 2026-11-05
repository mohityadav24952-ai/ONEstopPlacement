"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Download, Globe, Lock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { usePlacey } from "@/components/placey/PlaceyProvider";
import { useFeedback } from "@/components/ui/Feedback";
import { EmptyState } from "@/components/shared/EmptyState";
import { describeError } from "@/lib/api/errors";
import * as api from "@/lib/api/portfolio";
import type { ConsentSummary, PortfolioSummary, PVersion, Theme } from "@/lib/api/portfolio";
import { cn } from "@/lib/cn";

const SECTIONS = ["about", "projects", "skills", "education", "achievements", "contact"];

/** Mirrors the real theme palettes so thumbnails show what the generated site looks like. */
const LOOK: Record<string, { bg: string; fg: string; card: string; edge: string; serif?: boolean }> = {
  minimal: { bg: "#ffffff", fg: "#111827", card: "#ffffff", edge: "#e5e7eb" },
  midnight: { bg: "#0b1220", fg: "#e5ecf9", card: "#111a2e", edge: "#23304d" },
  classic: { bg: "#faf7f2", fg: "#1f1b16", card: "#fffdf9", edge: "#ddd3c4", serif: true },
};
const ACCENT_HEX: Record<string, string> = { blue: "#2563eb", green: "#15803d", purple: "#7c3aed", orange: "#c2410c" };

function Thumb({ id, accent = "blue", large = false }: { id: string; accent?: string; large?: boolean }) {
  const t = LOOK[id] ?? LOOK.minimal;
  const a = ACCENT_HEX[accent] ?? ACCENT_HEX.blue;
  return (
    <div
      aria-hidden="true"
      className={cn("overflow-hidden rounded-lg border border-edge-strong", large ? "h-44" : "h-28")}
      style={{ background: t.bg, fontFamily: t.serif ? "Georgia, serif" : "system-ui, sans-serif" }}
    >
      <div className="px-3 pt-3">
        <div className="h-2.5 w-16 rounded-sm" style={{ background: t.fg }} />
        <div className="mt-1.5 h-1.5 w-24 rounded-sm opacity-50" style={{ background: t.fg }} />
        <div className="mt-3 h-1.5 w-10 rounded-sm" style={{ background: a }} />
        <div className="mt-1.5 space-y-1">
          <div className="h-1 w-full rounded-sm opacity-30" style={{ background: t.fg }} />
          <div className="h-1 w-4/5 rounded-sm opacity-30" style={{ background: t.fg }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-md border p-1.5" style={{ background: t.card, borderColor: t.edge }}>
              <div className="h-1.5 w-8 rounded-sm" style={{ background: t.fg }} />
              <div className="mt-1 h-1 w-full rounded-sm opacity-30" style={{ background: t.fg }} />
              <div className="mt-1.5 flex gap-1">
                <span className="h-1.5 w-4 rounded-full" style={{ background: a, opacity: 0.8 }} />
                <span className="h-1.5 w-3 rounded-full opacity-30" style={{ background: t.fg }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PortfolioBuilder() {
  const { toast, confirm } = useFeedback();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [list, setList] = useState<PortfolioSummary[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [theme, setTheme] = useState("minimal");
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
        theme_id: theme,
        sections: SECTIONS.filter((s) => data.get(`s-${s}`) === "on"),
      });
      setNotes(out.notes);
      setOpenId(out.version.id);
      await load();
      toast("Draft created. Review it below before anything is public.");
      window.setTimeout(() => document.getElementById("editor")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: PortfolioSummary) {
    const ok = await confirm({ title: "Delete this portfolio?", message: `“${p.title}”, all of its versions and exports will be permanently deleted.`, confirmLabel: "Delete", tone: "danger" });
    if (!ok) return;
    try {
      await api.deletePortfolio(p.id);
      setOpenId(null);
      await load();
      toast("Portfolio deleted.");
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <div className="space-y-12">
      {/* Studio */}
      <section className="grid gap-6 lg:grid-cols-12">
        <form onSubmit={onCreate} className="panel animate-in space-y-6 rounded-3xl p-6 lg:col-span-8">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-mint">New portfolio</p>
            <h2 className="font-display text-2xl font-bold">Pick a look, pick your sections</h2>
            <p className="mt-1 text-sm text-muted">Text is drafted from your profile. Your email and location are never included unless you opt in.</p>
          </div>

          <fieldset>
            <legend className="mb-3 text-sm font-bold">Theme</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              {themes.map((t) => (
                <label key={t.id} className={cn("group cursor-pointer rounded-2xl border p-3 transition-all", theme === t.id ? "border-edge-strong bg-mint/15 shadow-pop" : "border-edge-strong hover:border-edge-strong")}>
                  <input type="radio" name="theme" value={t.id} checked={theme === t.id} onChange={() => setTheme(t.id)} className="sr-only" />
                  <Thumb id={t.id} />
                  <span className="mt-3 flex items-center justify-between">
                    <span className="font-display text-lg font-semibold">{t.name}</span>
                    {theme === t.id && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-app"><Check className="h-3 w-3" aria-hidden="true" /></span>}
                  </span>
                  <span className="block text-xs text-muted">{t.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="pf-title" className="text-sm font-bold">Portfolio name</label>
              <input id="pf-title" name="title" required maxLength={120} defaultValue="My portfolio" className="field" />
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-bold">Sections</legend>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map((s) => (
                  <label key={s} className="cursor-pointer">
                    <input type="checkbox" name={`s-${s}`} defaultChecked className="peer sr-only" />
                    <span className="inline-flex rounded-full border border-edge-strong px-3 py-1 text-xs font-bold capitalize transition-colors peer-checked:border-edge-strong peer-checked:bg-ink peer-checked:text-app peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-cobalt">{s}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <Button type="submit" loading={busy}>Create draft</Button>
          {error && <p role="alert" className="text-sm font-medium text-coral">{error}</p>}
          {notes.map((n) => <p key={n} role="status" className="text-sm font-medium text-warn">{n}</p>)}
        </form>

        <aside className="animate-in rounded-3xl border border-edge-strong bg-mint/20 p-6 lg:col-span-4">
          <Lock className="h-6 w-6" aria-hidden="true" />
          <h3 className="font-display mt-3 text-xl font-bold">You stay in control</h3>
          <ol className="mt-4 space-y-3 text-sm">
            {["Draft: nothing is public.", "Check: we scan for emails, phone numbers and unknown links.", "Approve: you see the exact list of what becomes public.", "Export: a plain static site you publish yourself."].map((t, i) => (
              <li key={t} className="flex gap-3">
                <span className="font-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-edge-strong bg-surface text-xs font-bold">{i + 1}</span>
                <span className="leading-snug">{t}</span>
              </li>
            ))}
          </ol>
        </aside>
      </section>

      {/* Library */}
      <section aria-labelledby="lib-heading">
        <h2 id="lib-heading" className="font-display mb-5 text-3xl font-bold">Your portfolios</h2>
        {list === null ? (
          <Skeleton className="h-32 w-full" />
        ) : list.length === 0 ? (
          <EmptyState icon={Globe} title="No portfolios yet" description="Complete your profile first, then create a draft above." />
        ) : (
          <ul className="grid gap-5 md:grid-cols-2">
            {list.map((p) => (
              <li key={p.id} className="panel animate-in rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display truncate text-2xl font-semibold">{p.title}</h3>
                    <p className="text-xs text-muted">/{p.slug}</p>
                  </div>
                  <button type="button" aria-label={`Delete ${p.title}`} onClick={() => remove(p)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-coral/15 hover:text-coral">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <ul className="mt-4 space-y-2">
                  {p.versions.map((v) => (
                    <li key={v.id}>
                      <button type="button" onClick={() => { setOpenId(v.id); window.setTimeout(() => document.getElementById("editor")?.scrollIntoView({ behavior: "smooth" }), 80); }}
                        className={cn("flex w-full items-center gap-3 rounded-xl border p-2 text-left transition-colors", openId === v.id ? "border-edge-strong bg-mint/15" : "border-edge-strong hover:border-edge-strong")}>
                        <div className="w-20 shrink-0"><Thumb id={v.theme_id} /></div>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">{LOOK[v.theme_id] ? v.theme_id.charAt(0).toUpperCase() + v.theme_id.slice(1) : v.theme_id} theme</span>
                          <span className="block text-xs text-muted">{new Date(v.created_at).toLocaleDateString()}</span>
                        </span>
                        <span className="flex flex-col items-end gap-1">
                          <Badge tone={v.status === "APPROVED" ? "ok" : "warn"}>{v.status === "APPROVED" ? "Approved" : "Draft"}</Badge>
                          {v.stale && <Badge tone="warn">outdated</Badge>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div id="editor" className="scroll-mt-24">
        {openId && <VersionPanel key={openId} id={openId} themes={themes} onChanged={() => void load()} />}
      </div>
    </div>
  );
}

function VersionPanel({ id, themes, onChanged }: { id: string; themes: Theme[]; onChanged: () => void }) {
  const { toast } = useFeedback();
  const { emit } = usePlacey();
  const [v, setV] = useState<PVersion | null>(null);
  const [html, setHtml] = useState("");
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

  async function run(action: () => Promise<unknown>, success?: string, reload = true) {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (reload) await refresh();
      onChanged();
      if (success) toast(success);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  function download() {
    return run(async () => {
      const blob = await api.downloadExport(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "portfolio.zip";
      a.click();
      URL.revokeObjectURL(url);
    }, "portfolio.zip downloaded.", false);
  }

  if (!v) return error ? <p role="alert" className="text-sm font-medium text-coral">{error}</p> : <Skeleton className="h-96 w-full" />;
  const draft = v.status === "DRAFT";
  const c = v.content;
  const report = v.validation_report;
  const accent = v.theme_options.accent ?? "blue";
  const stage = !draft ? (v.has_export ? 4 : 3) : consent ? 2 : report?.ok ? 1 : 0;
  const steps = ["Check", "Review", "Approve", "Export"];

  return (
    <Card
      accent="mint"
      eyebrow={draft ? "Draft" : v.has_export ? "Approved and exported" : "Approved"}
      title="Portfolio editor"
      description={draft ? "Edit, preview, check, then approve. Nothing is public until you export and publish it yourself." : "Approved and locked. Export it and publish it yourself."}
      action={<Badge tone={draft ? "warn" : "ok"}>{draft ? "Draft" : "Approved"}</Badge>}
    >
      {error && <p role="alert" className="mb-3 text-sm font-medium text-coral">{error}</p>}
      {v.stale && <p role="status" className="mb-4 rounded-xl border border-orange/60 bg-orange/10 p-3 text-sm font-medium">Your profile changed after this draft was made. Create a new draft to include the changes.</p>}

      {/* Publish flow */}
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s} className={cn("rounded-xl border px-2 py-2 text-center text-xs font-bold", i < stage ? "border-edge-strong bg-mint text-on-accent" : i === stage ? "border-edge-strong bg-orange text-on-accent" : "border-edge-strong text-muted")}>
            <span className="font-num mr-1">{i + 1}</span>{s}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-bold">Theme</p>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => (
                <button key={t.id} type="button" disabled={!draft || busy} aria-pressed={v.theme_id === t.id}
                  onClick={() => run(() => api.editVersion(id, { theme_id: t.id }))}
                  className={cn("rounded-xl border p-1.5 text-left transition-all disabled:opacity-60", v.theme_id === t.id ? "border-edge-strong shadow-pop" : "border-edge-strong hover:border-edge-strong")}>
                  <Thumb id={t.id} accent={accent} />
                  <span className="mt-1 block px-0.5 text-xs font-bold">{t.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2" role="group" aria-label="Accent colour">
              <span className="text-xs font-bold text-muted">Accent</span>
              {(themes[0]?.options.accent ?? ["blue"]).map((a) => (
                <button key={a} type="button" disabled={!draft || busy} aria-label={a} aria-pressed={accent === a}
                  onClick={() => run(() => api.editVersion(id, { accent: a }))}
                  className={cn("h-7 w-7 rounded-full border border-edge-strong transition-transform hover:scale-110 disabled:opacity-60", accent === a && "ring-2 ring-ink ring-offset-2 ring-offset-surface")}
                  style={{ background: ACCENT_HEX[a] ?? "#2563eb" }} />
              ))}
            </div>
          </div>

          <TextEdit label="About" value={c.about.text} disabled={!draft || busy} rows={4} onSave={(t) => run(() => api.editVersion(id, { about_text: t }), "About text saved.")} />

          {c.projects.map((p) => (
            <div key={p.id} className="rounded-2xl border border-edge-strong p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold">{p.title}</p>
                {draft && <button type="button" className="text-xs font-semibold text-muted hover:text-coral hover:underline" onClick={() => run(() => api.editVersion(id, { remove_project_ids: [p.id] }), "Project removed from this draft.")}>Remove</button>}
              </div>
              <TextEdit label={`${p.title} description`} value={p.blurb} disabled={!draft || busy} rows={2} onSave={(t) => run(() => api.editVersion(id, { project_blurbs: { [p.id]: t } }), "Description saved.")} />
            </div>
          ))}

          <fieldset className="space-y-2 rounded-2xl border border-dashed border-edge-strong p-4" disabled={!draft || busy}>
            <legend className="px-1 text-sm font-bold">Sensitive details (off by default)</legend>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.contact.include_email} onChange={(e) => run(() => api.editVersion(id, { include_email: e.target.checked }))} /> Publish my email address{c.contact.email ? ` (${c.contact.email})` : ""}</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.contact.include_location} onChange={(e) => run(() => api.editVersion(id, { include_location: e.target.checked }))} /> Publish my location{c.contact.location ? ` (${c.contact.location})` : ""}</label>
          </fieldset>
        </div>

        {/* Browser-frame preview */}
        <div>
          <p className="mb-2 text-sm font-bold">Preview</p>
          <div className="overflow-hidden rounded-2xl border border-edge-strong shadow-pop">
            <div className="flex items-center gap-2 border-b border-edge-strong bg-surface-2 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full border border-edge-strong bg-coral" />
              <span className="h-2.5 w-2.5 rounded-full border border-edge-strong bg-orange" />
              <span className="h-2.5 w-2.5 rounded-full border border-edge-strong bg-mint" />
              <span className="ml-2 flex-1 truncate rounded-md border border-edge-strong bg-surface px-2 py-0.5 text-[11px] text-muted">your-site.example · preview, not public</span>
            </div>
            {/* sandbox="" blocks scripts, forms and navigation inside the preview */}
            <iframe title="Portfolio preview" sandbox="" srcDoc={html} className="h-[30rem] w-full bg-white" />
          </div>
        </div>
      </div>

      {draft && (
        <div className="mt-8 space-y-4 border-t border-edge-strong pt-6">
          <Button variant="secondary" loading={busy} onClick={() => run(async () => { await api.validateVersion(id); }, "Check complete.")}>Check before approving</Button>
          {report && (
            <div role="status" className="space-y-1.5 text-sm">
              {report.errors.map((e, i) => <p key={`e${i}`} className="font-medium text-coral">Blocking: {e.message} <span className="text-muted">({e.where})</span></p>)}
              {report.warnings.map((w, i) => <p key={`w${i}`} className="font-medium text-warn">Note: {w.message}</p>)}
              {report.ok && <p className="font-semibold text-ok">No blocking problems found.</p>}
            </div>
          )}
          {report?.ok && !consent && <Button variant="secondary" onClick={() => run(async () => setConsent(await api.consentSummary(id)), undefined, false)}>Review what will be public</Button>}
          {consent && (
            <div className="rounded-2xl border border-edge-strong bg-mint/15 p-5 text-sm">
              <p className="font-display text-lg font-semibold">{consent.statement}</p>
              <ul className="mt-2 list-disc space-y-0.5 pl-5">{consent.items.map((i) => <li key={i}>{i}</li>)}</ul>
              <label className="mt-4 flex items-start gap-2 font-medium"><input type="checkbox" className="mt-1" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> I have reviewed this and agree it may be made public.</label>
              <Button className="mt-4" disabled={!agreed} loading={busy} onClick={() => run(async () => {
              const approved = await api.approveVersion(id, consent.summary_hash);
              emit({ type: "portfolio_approved" });
              return approved;
            }, "Portfolio approved. You can export it now.")}>Approve portfolio</Button>
            </div>
          )}
        </div>
      )}

      {!draft && (
        <div className="mt-8 space-y-3 border-t border-edge-strong pt-6">
          {!v.has_export ? (
            <Button loading={busy} onClick={() => run(async () => {
              const made = await api.exportVersion(id);
              emit({ type: "portfolio_exported" });
              return made;
            }, "Export created.")}>Create export (ZIP)</Button>
          ) : (
            <Button loading={busy} onClick={download}><Download className="h-4 w-4" aria-hidden="true" /> Download portfolio.zip</Button>
          )}
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            The ZIP is a plain static site (index.html and style.css). Publish it yourself: drag the unzipped folder onto Netlify Drop, run <code className="rounded bg-surface-2 px-1">vercel --prod</code> in it, or push it to a GitHub repository with Pages enabled. Nothing is published automatically.
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
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <textarea id={id} rows={rows} maxLength={2000} value={text} disabled={disabled} onChange={(e) => setText(e.target.value)} onBlur={() => text !== value && onSave(text)} className="field" />
    </div>
  );
}
