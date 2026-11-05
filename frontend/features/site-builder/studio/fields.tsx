"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function Field({ label, value, onChange, placeholder, type = "text", maxLength = 200, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; maxLength?: number; hint?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <input id={id} type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field" />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, value, onChange, rows = 3, maxLength = 2000, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number; maxLength?: number; placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <textarea id={id} rows={rows} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field resize-y" />
    </div>
  );
}

/** Chips with add/remove. Enter or comma adds; backspace on an empty box removes the last. */
export function TagInput({ label, values, onChange, placeholder = "Type and press Enter" }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const id = useId();
  const [text, setText] = useState("");
  function add(raw: string) {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    onChange([...values, ...parts.filter((p) => !values.includes(p))].slice(0, 40));
    setText("");
  }
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <div className="field flex min-h-10 flex-wrap items-center gap-1.5 !py-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full border border-edge-strong bg-surface-2 px-2.5 py-0.5 text-xs font-semibold">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="text-muted hover:text-coral">
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          placeholder={values.length ? "" : placeholder}
          maxLength={60}
          onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); add(text); }
            else if (e.key === "Backspace" && !text && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={() => add(text)}
          className="min-w-24 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

export function Toggle({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-xl border border-edge p-3 text-left transition-colors hover:border-primary/50">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <span aria-hidden="true" className={cn("relative h-6 w-11 shrink-0 rounded-full border transition-colors", checked ? "border-primary bg-primary" : "border-edge-strong bg-surface-2")}>
        <span className={cn("absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} style={{ height: 18, width: 18 }} />
      </span>
    </button>
  );
}

/** A removable, re-orderable list of editable items. */
export function ItemList<T extends { id: string }>({ items, onChange, render, title, onAdd, addLabel, empty }: {
  items: T[]; onChange: (items: T[]) => void; render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  title: (item: T, index: number) => string; onAdd: () => T; addLabel: string; empty: string;
}) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-4">
      {items.length === 0 && <p className="rounded-xl border border-dashed border-edge-strong p-4 text-sm text-muted">{empty}</p>}
      {items.map((item, i) => (
        <section key={item.id} aria-label={title(item, i)} className="rounded-2xl border border-edge-strong p-4">
          <header className="mb-3 flex items-center gap-2">
            <h4 className="min-w-0 flex-1 truncate text-sm font-bold">{title(item, i)}</h4>
            <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 text-muted hover:bg-surface-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
            <button type="button" aria-label="Delete" onClick={() => onChange(items.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-muted hover:bg-coral/15 hover:text-coral"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
          </header>
          <div className="space-y-3">{render(item, (patch) => onChange(items.map((x, k) => (k === i ? { ...x, ...patch } : x))))}</div>
        </section>
      ))}
      <button type="button" onClick={() => onChange([...items, onAdd()])} className="inline-flex items-center gap-2 rounded-full border border-edge-strong px-4 py-2 text-sm font-bold hover:border-primary hover:text-primary">
        <Plus className="h-4 w-4" aria-hidden="true" /> {addLabel}
      </button>
    </div>
  );
}

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
