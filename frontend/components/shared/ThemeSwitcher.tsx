"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown } from "lucide-react";
import { DEFAULT_THEME, THEMES, applyTheme, readTheme, subscribeTheme } from "@/lib/theme";
import type { ThemeId } from "@/lib/theme";

function Swatch({ colors, size = 20 }: { colors: [string, string]; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block shrink-0 overflow-hidden rounded-full border border-edge-strong"
      style={{ width: size, height: size, background: colors[0] }}
    >
      <span className="absolute bottom-0 right-0 h-full w-1/2" style={{ background: colors[1] }} />
    </span>
  );
}

export function ThemeSwitcher() {
  // The server always renders the default; the real value is read after hydration.
  const theme = useSyncExternalStore<ThemeId>(subscribeTheme, readTheme, () => DEFAULT_THEME);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Theme: ${current.label}. Change theme`}
        className="flex h-9 items-center gap-2 rounded-lg border border-edge px-2.5 text-sm font-medium transition-colors hover:border-edge-strong hover:bg-surface-2"
      >
        <Swatch colors={current.swatch} />
        <span className="hidden md:inline">{current.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Theme"
          className="menu-in sticker absolute right-0 top-full z-50 mt-2 w-60 rounded-xl p-1.5"
        >
          {THEMES.map((t) => {
            const selected = t.id === theme;
            return (
              <li key={t.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    applyTheme(t.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-surface-2 ${selected ? "bg-primary/10" : ""}`}
                >
                  <Swatch colors={t.swatch} size={26} />
                  <span className="flex-1">{t.label}</span>
                  {selected && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
