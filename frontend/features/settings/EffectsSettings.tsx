"use client";

import { EFFECTS, resetEffects, setEffect, setEffectsEnabled } from "@/lib/effects";
import { useEffectsPrefs } from "@/components/effects/useEffects";
import { cn } from "@/lib/cn";

function Switch({
  checked,
  onChange,
  disabled,
  labelledBy,
  describedBy,
  size = "md",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
  size?: "md" | "lg";
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        size === "lg" ? "h-7 w-12" : "h-6 w-10",
        checked ? "border-primary bg-primary" : "border-edge-strong bg-ink/15",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block rounded-full shadow-card transition-transform duration-200",
          size === "lg" ? "h-5 w-5" : "h-4 w-4",
          checked ? "bg-on-primary" : "bg-muted",
          checked ? (size === "lg" ? "translate-x-[1.4rem]" : "translate-x-[1.1rem]") : "translate-x-[0.2rem]",
        )}
      />
    </button>
  );
}

/**
 * Appearance controls: one master switch and a switch per effect. Stored in this browser only
 * (lib/effects.ts), kept across reloads, pages and theme changes. With the master switch off the
 * individual choices stay as they are (shown disabled) and come back when it is turned on again.
 */
export function EffectsSettings() {
  const prefs = useEffectsPrefs();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-edge bg-surface-2/60 p-4">
        <div className="min-w-0">
          <p id="fx-master" className="font-semibold">Visual effects</p>
          <p id="fx-master-desc" className="mt-0.5 text-sm text-muted">
            {prefs.enabled
              ? "On. Decorative light, glass and motion are shown, following your theme."
              : "Off. A clean, still interface. Everything still works exactly the same."}
          </p>
        </div>
        <Switch size="lg" checked={prefs.enabled} onChange={setEffectsEnabled} labelledBy="fx-master" describedBy="fx-master-desc" />
      </div>

      <fieldset>
        <legend className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Individual effects</legend>
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {EFFECTS.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 rounded-xl px-1 py-2.5">
              <span className="min-w-0">
                <span id={`fx-${e.id}`} className={cn("block text-sm font-semibold", !prefs.enabled && "text-muted")}>{e.label}</span>
                <span id={`fx-${e.id}-desc`} className="block text-xs leading-snug text-muted">{e.hint}</span>
              </span>
              <Switch
                checked={prefs.items[e.id]}
                onChange={(v) => setEffect(e.id, v)}
                disabled={!prefs.enabled}
                labelledBy={`fx-${e.id}`}
                describedBy={`fx-${e.id}-desc`}
              />
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <p>Saved in this browser. Motion is reduced automatically if your system asks for it.</p>
        <button type="button" onClick={resetEffects} className="font-semibold text-primary hover:underline">
          Restore defaults
        </button>
      </div>
    </div>
  );
}
