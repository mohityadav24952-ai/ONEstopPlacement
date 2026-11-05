"use client";

import { useEffect, useRef } from "react";
import { EyeOff } from "lucide-react";
import { MODE_LABEL } from "@/components/placey/accessories";
import type { PlaceyMode } from "@/components/placey/accessories";
import { setPrefs } from "@/components/placey/prefs";
import type { PlaceyPrefs } from "@/components/placey/prefs";

type Props = {
  prefs: PlaceyPrefs;
  mode: PlaceyMode;
  reason: "manual" | "activity" | null;
  activeMinutes: number;
  onClose: () => void;
  /** Hide Placey (the host also says a short goodbye). */
  onHide: () => void;
  /** The element that opened the panel, so clicking it does not count as "outside". */
  toggleRef: React.RefObject<HTMLElement | null>;
};

const MODE_OPTIONS = Object.keys(MODE_LABEL) as PlaceyMode[];

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-10 shrink-0 rounded-full bg-edge-strong transition-colors peer-checked:bg-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-primary after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  );
}

/** Placey's small companion panel: who it is, what it is wearing and why, and the controls. */
export function PlaceyPanel({ prefs, mode, reason, activeMinutes, onClose, onHide, toggleRef }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || toggleRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, toggleRef]);

  const why = reason === "manual" ? "You picked this outfit." : reason === "activity" ? "Reacting to what you just did." : "Matches this page.";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Placey settings"
      className="menu-in sticker pointer-events-auto absolute right-0 top-[104%] z-20 max-h-[70vh] w-[min(18rem,calc(100vw-1.25rem))] overflow-y-auto rounded-2xl p-4 text-fg"
    >
      <p className="text-base font-bold">Hey! I&apos;m Placey 💜</p>
      <p className="mt-0.5 text-xs text-muted">Your tiny buddy is here to help you stay motivated. Not a chatbot, just a cheerleader.</p>

      <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2 text-xs">
        <p><span className="font-semibold">Wearing:</span> {MODE_LABEL[mode]}</p>
        <p className="text-muted">{why}</p>
        {activeMinutes > 0 && <p className="mt-1 text-muted">You&apos;ve been active for about {activeMinutes} min this visit.</p>}
      </div>

      <div className="mt-3 divide-y divide-edge">
        <Switch label="Speech bubbles" hint="Turn off to keep Placey quiet" checked={!prefs.muted} onChange={(on) => setPrefs({ muted: !on })} />
        <Switch label="Movement" hint="Little hops and runs while idle" checked={prefs.movement} onChange={(on) => setPrefs({ movement: on })} />
      </div>

      <label className="mt-3 block text-sm font-semibold">
        Outfit
        <select
          className="field mt-1"
          value={prefs.mode}
          onChange={(e) => setPrefs({ mode: e.target.value as PlaceyPrefs["mode"] })}
        >
          <option value="auto">Automatic (follows the page)</option>
          {MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>{MODE_LABEL[m]}</option>
          ))}
        </select>
        {prefs.mode !== "auto" && <span className="mt-1 block text-xs font-normal text-muted">Stays until you switch back to Automatic.</span>}
      </label>

      <button
        type="button"
        onClick={onHide}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[0.65rem] border border-edge-strong px-3 py-2 text-sm font-semibold hover:border-primary hover:bg-surface-2"
      >
        <EyeOff className="h-4 w-4" aria-hidden="true" /> Hide Placey
      </button>
    </div>
  );
}
