"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ProgressRing } from "@/components/shared/ProgressRing";
import { ProvenanceChip } from "@/components/shared/ProvenanceChip";
import type { Provenance } from "@/components/shared/ProvenanceChip";
import { ApiError } from "@/lib/api/client";
import * as api from "@/lib/api/profile";
import type {
  MeResponse,
  Proposal,
  SectionItem,
  SectionName,
} from "@/lib/api/profile";
import { SECTIONS, toApiValue, toFormValue } from "@/features/profile/sections";
import type { SectionDef } from "@/features/profile/sections";

const inputClass = "field";

function describe(err: unknown): string {
  if (err instanceof ApiError) {
    const fields = (err.details as { fields?: { field: string; message: string }[] })
      ?.fields;
    if (fields?.length) {
      return `${err.message} ${fields.map((f) => `${f.field}: ${f.message}`).join("; ")}`;
    }
    return err.message;
  }
  return "Something went wrong.";
}

function provenanceOf(item: SectionItem): Provenance {
  if (item.verification_state === "PLATFORM_VERIFIED") return "platform_verified";
  if (item.verification_state === "USER_CONFIRMED") {
    return item.source_type === "AI_SUGGESTED" ? "ai_suggestion" : "user_confirmed";
  }
  if (item.source_type === "RESUME_EXTRACTED") return "from_resume";
  if (item.source_type === "AI_SUGGESTED") return "ai_suggestion";
  return "user_entered";
}

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; error: unknown }
  | {
      kind: "ready";
      me: MeResponse;
      items: Record<SectionName, SectionItem[]>;
      proposals: Proposal[];
    };

export function ProfileView() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const [me, proposals, ...lists] = await Promise.all([
        api.getMe(),
        api.listProposals(),
        ...SECTIONS.map((s) => api.listSection(s.name)),
      ]);
      const items = {} as Record<SectionName, SectionItem[]>;
      SECTIONS.forEach((s, i) => (items[s.name] = lists[i]));
      setState({ kind: "ready", me, items, proposals });
    } catch (error) {
      setState({ kind: "error", error });
    }
  }, []);

  useEffect(() => {
    // Initial fetch on mount; setState happens after the awaited requests.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (state.kind === "loading") {
    return (
      <div role="status" className="space-y-4">
        <span className="sr-only">Loading your profile</span>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (state.kind === "error") {
    const err = state.error;
    return (
      <ErrorState
        title="Could not load your profile"
        message={describe(err)}
        referenceId={err instanceof ApiError ? err.requestId : undefined}
        action={<Button onClick={() => { setState({ kind: "loading" }); void load(); }}>Try again</Button>}
      />
    );
  }

  const { me, items, proposals } = state;

  return (
    <div className="space-y-6">
      <Completeness me={me} />
      {proposals.length > 0 && (
        <ProposalsPanel proposals={proposals} onChanged={load} />
      )}
      <BasicsCard me={me} onSaved={load} />
      {SECTIONS.map((def) => (
        <SectionCard key={def.name} def={def} items={items[def.name]} onChanged={load} />
      ))}
    </div>
  );
}

function Completeness({ me }: { me: MeResponse }) {
  const entries = Object.entries(me.completeness.sections);
  return (
    <Card>
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <ProgressRing percent={me.completeness.percent} size={112} label="Profile completeness" />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">Profile completeness</h2>
          <p className="mt-1 text-sm text-muted">The more complete your profile, the better every module works.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {entries.map(([key, done]) => (
              <li key={key}>
                <Badge tone={done ? "ok" : "neutral"}>
                  {done ? "✓" : "○"} {key.replace("_", " ")}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function BasicsCard({ me, onSaved }: { me: MeResponse; onSaved: () => Promise<void> }) {
  const p = me.profile;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (k: string) => String(data.get(k) ?? "").trim() || null;
    const year = String(data.get("graduation_year") ?? "").trim();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateProfile({
        expected_version: p.version,
        display_name: text("display_name"),
        headline: text("headline"),
        location_pref: text("location_pref"),
        summary: text("summary"),
        graduation_year: year ? Number(year) : null,
        target_roles: String(data.get("target_roles") ?? "")
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
      });
      setSaved(true);
      await onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "VERSION_CONFLICT"
          ? "Your profile changed in another tab. Reloaded the latest — please re-apply your edit."
          : describe(err),
      );
      if (err instanceof ApiError && err.code === "VERSION_CONFLICT") await onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    // The key remounts the uncontrolled form when the saved version changes.
    <Card key={p.version} title="Basics" description="Shown on your resume and portfolio only after you approve them.">
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Full name" id="display_name">
          <input id="display_name" name="display_name" defaultValue={p.display_name ?? ""} maxLength={120} className={inputClass} />
        </Labeled>
        <Labeled label="Headline" id="headline">
          <input id="headline" name="headline" defaultValue={p.headline ?? ""} maxLength={200} placeholder="B.Tech CSE student interested in backend" className={inputClass} />
        </Labeled>
        <Labeled label="Target roles" id="target_roles" hint="Comma separated, up to 10.">
          <input id="target_roles" name="target_roles" defaultValue={p.target_roles.join(", ")} className={inputClass} />
        </Labeled>
        <Labeled label="Graduation year" id="graduation_year">
          <input id="graduation_year" name="graduation_year" type="number" min={1990} max={2100} defaultValue={p.graduation_year ?? ""} className={inputClass} />
        </Labeled>
        <Labeled label="Preferred location" id="location_pref">
          <input id="location_pref" name="location_pref" defaultValue={p.location_pref ?? ""} maxLength={120} className={inputClass} />
        </Labeled>
        <div className="sm:col-span-2">
          <Labeled label="Summary" id="summary">
            <textarea id="summary" name="summary" rows={3} defaultValue={p.summary ?? ""} maxLength={2000} className={inputClass} />
          </Labeled>
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={busy}>Save basics</Button>
          {saved && <span role="status" className="text-sm text-ok">Saved</span>}
          {error && <span role="alert" className="text-sm text-err">{error}</span>}
        </div>
      </form>
    </Card>
  );
}

function Labeled({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

function SectionCard({
  def,
  items,
  onChanged,
}: {
  def: SectionDef;
  items: SectionItem[];
  onChanged: () => Promise<void>;
}) {
  // "new" = adding, an id = editing that item, null = nothing open.
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(item: SectionItem) {
    if (!window.confirm(`Delete this ${def.singular}?`)) return;
    try {
      await api.deleteItem(def.name, item.id);
      await onChanged();
    } catch (err) {
      setError(describe(err));
    }
  }

  return (
    <Card
      title={def.title}
      action={
        editing === null && (
          <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </Button>
        )
      }
    >
      {error && <p role="alert" className="mb-3 text-sm text-err">{error}</p>}

      {editing === "new" && (
        <ItemForm
          def={def}
          onCancel={() => setEditing(null)}
          onDone={async () => { setEditing(null); await onChanged(); }}
        />
      )}

      {items.length === 0 && editing !== "new" ? (
        <EmptyState
          title={`No ${def.title.toLowerCase()} yet`}
          description="Only add what is true. Everything you add is private to you."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) =>
            editing === item.id ? (
              <li key={item.id}>
                <ItemForm
                  def={def}
                  item={item}
                  onCancel={() => setEditing(null)}
                  onDone={async () => { setEditing(null); await onChanged(); }}
                />
              </li>
            ) : (
              <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-edge p-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium">{String(item[def.heading] ?? "")}</p>
                  <p className="text-sm text-muted">
                    {(def.sub ?? [])
                      .map((k) => item[k])
                      .flat()
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <ProvenanceChip kind={provenanceOf(item)} />
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" aria-label={`Edit ${String(item[def.heading])}`} onClick={() => setEditing(item.id)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg">
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Delete ${String(item[def.heading])}`} onClick={() => remove(item)} className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-err">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </Card>
  );
}

function ItemForm({
  def,
  item,
  onCancel,
  onDone,
}: {
  def: SectionDef;
  item?: SectionItem;
  onCancel: () => void;
  onDone: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {};
    for (const f of def.fields) {
      const value = toApiValue(f, String(data.get(f.name) ?? ""));
      // Create: skip empty optional fields so API defaults apply. Edit: send nulls to clear.
      if (item || value !== null) body[f.name] = value;
    }
    setBusy(true);
    setError(null);
    try {
      if (item) await api.updateItem(def.name, item.id, body);
      else await api.createItem(def.name, body);
      await onDone();
    } catch (err) {
      setError(describe(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mb-3 space-y-3 rounded-xl border border-primary/40 bg-app p-4">
      {item && item.source_type !== "USER_ENTERED" && (
        <Badge tone="warn">Editing marks this as your own, unverified entry.</Badge>
      )}
      {def.fields.map((f) => {
        const id = `${def.name}-${f.name}`;
        const value = toFormValue(f, item?.[f.name]);
        return (
          <Labeled key={f.name} label={f.label} id={id} hint={f.hint}>
            {f.kind === "textarea" || f.kind === "list" ? (
              <textarea id={id} name={f.name} rows={f.kind === "list" ? 3 : 4} defaultValue={value} required={f.required} className={inputClass} />
            ) : f.kind === "select" ? (
              <select id={id} name={f.name} defaultValue={value} className={inputClass}>
                <option value="">Not set</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>{o.charAt(0) + o.slice(1).toLowerCase()}</option>
                ))}
              </select>
            ) : (
              <input id={id} name={f.name} type={f.kind === "date" ? "date" : "text"} defaultValue={value} required={f.required} className={inputClass} />
            )}
          </Labeled>
        );
      })}
      {error && <p role="alert" className="text-sm text-err">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" loading={busy}><Check className="h-4 w-4" aria-hidden="true" /> Save</Button>
        <Button type="button" variant="ghost" onClick={onCancel}><X className="h-4 w-4" aria-hidden="true" /> Cancel</Button>
      </div>
    </form>
  );
}

function ProposalsPanel({
  proposals,
  onChanged,
}: {
  proposals: Proposal[];
  onChanged: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);

  async function decide(p: Proposal, decision: "approve" | "reject") {
    setError(null);
    try {
      await api.decideProposal(p.id, decision);
    } catch (err) {
      setError(describe(err));
    }
    await onChanged();
  }

  return (
    <Card
      title="Suggested changes"
      description="Nothing below is applied until you approve it."
    >
      {error && <p role="alert" className="mb-3 text-sm text-err">{error}</p>}
      <ul className="space-y-3">
        {proposals.map((p) => (
          <li key={p.id} className="rounded-xl border border-ai/40 p-3">
            <p className="text-sm font-medium">
              {p.action} · {p.section}
            </p>
            <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs text-muted">
              {JSON.stringify(p.payload, null, 2)}
            </pre>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => decide(p, "approve")}>Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => decide(p, "reject")}>Reject</Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
