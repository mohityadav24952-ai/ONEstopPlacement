"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Palette, Search, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { primaryNav, secondaryNav } from "@/lib/navigation";
import { THEMES, applyTheme } from "@/lib/theme";
import { getEffects, setEffectsEnabled } from "@/lib/effects";
import { cn } from "@/lib/cn";

/** Event other UI (the top bar button) dispatches to open the palette. */
export const OPEN_PALETTE_EVENT = "osp:open-command-palette";

type Command = { id: string; group: string; label: string; icon: LucideIcon; run: () => void };

function isEditable(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT";
}

/**
 * Ctrl/Cmd + K quick switcher. Every entry reuses something that already exists: the app's own
 * navigation list, the theme switcher and the effects setting. It adds no new data or backend calls.
 * The shortcut is ignored while typing in a field, so it never steals an editor's own Ctrl+K.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k" && !isEditable(e.target)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => {
      setQuery("");
      setIndex(0);
      restoreRef.current?.focus?.();
    };
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const close = () => setOpen(false);
    return [
      ...[...primaryNav, ...secondaryNav].map((n) => ({
        id: `nav:${n.href}`,
        group: "Go to",
        label: n.label,
        icon: n.icon,
        run: () => {
          close();
          router.push(n.href);
        },
      })),
      ...THEMES.map((t) => ({
        id: `theme:${t.id}`,
        group: "Theme",
        label: `Theme: ${t.label}`,
        icon: Palette,
        run: () => {
          applyTheme(t.id);
          close();
        },
      })),
      {
        id: "fx:toggle",
        group: "Appearance",
        label: "Turn visual effects on or off",
        icon: Sparkles,
        run: () => {
          setEffectsEnabled(!getEffects().enabled);
          close();
        },
      },
    ];
  }, [router]);

  const q = query.trim().toLowerCase();
  const results = q ? commands.filter((c) => `${c.group} ${c.label}`.toLowerCase().includes(q)) : commands;
  const active = Math.min(index, Math.max(0, results.length - 1));

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((active + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((active - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    } else if (e.key === "Tab") {
      e.preventDefault(); // keep focus inside the dialog; arrows move through the list
    }
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center px-4 pt-[12vh]" onKeyDown={onKeyDown}>
      <button type="button" aria-label="Close command palette" tabIndex={-1} onClick={() => setOpen(false)} className="fx-overlay absolute inset-0 cursor-default bg-ink/40" />
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="sticker fx-glass fx-float fx-palette relative w-full max-w-lg overflow-hidden rounded-2xl">
        <div className="flex items-center gap-3 border-b border-edge px-4 transition-colors focus-within:border-primary/60">
          <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdk-list"
            aria-activedescendant={results[active] ? `cmdk-${active}` : undefined}
            aria-label="Search pages and actions"
            placeholder="Go to a page, change theme..."
            autoComplete="off"
            spellCheck={false}
            className="fx-palette-input h-12 flex-1 bg-transparent text-sm placeholder:text-muted"
          />
          <kbd className="rounded-md border border-edge px-1.5 py-0.5 text-[10px] font-semibold text-muted">Esc</kbd>
        </div>
        <ul id="cmdk-list" role="listbox" aria-label="Results" className="max-h-[min(22rem,60vh)] overflow-y-auto p-1.5">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No matches.</li>}
          {results.map((c, i) => {
            const Icon = c.icon;
            const selected = i === active;
            return (
              <li
                key={c.id}
                id={`cmdk-${i}`}
                role="option"
                aria-selected={selected}
                onMouseMove={() => i !== active && setIndex(i)}
                onClick={() => c.run()}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  selected ? "bg-primary/12 text-fg" : "text-muted",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", selected ? "text-primary" : "")} aria-hidden="true" />
                <span className="flex-1">{c.label}</span>
                <span className="text-[11px] text-muted">{c.group}</span>
                {selected && <CornerDownLeft className="h-3.5 w-3.5 text-muted" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
