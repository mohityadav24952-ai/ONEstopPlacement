"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { primaryNav, secondaryNav } from "@/lib/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [...primaryNav, ...secondaryNav];

/** A real jump-to-page palette: Ctrl/Cmd + K, type, Enter. It searches pages only. */
export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? ITEMS.filter((i) => i.label.toLowerCase().includes(t) || i.shortLabel.toLowerCase().includes(t)) : ITEMS;
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function show() {
    setQ("");
    setCursor(0);
    setOpen(true);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && results[cursor]) {
      go(results[cursor].href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label="Search pages (Ctrl+K)"
        className="flex h-9 w-9 items-center gap-2 rounded-lg border border-edge text-sm text-muted transition-colors hover:border-edge-strong hover:text-fg sm:w-72 sm:px-3 lg:w-80"
      >
        <Search className="mx-auto h-4 w-4 shrink-0 sm:mx-0" aria-hidden="true" />
        <span className="hidden flex-1 truncate text-left sm:inline">Jump to a page…</span>
        <kbd className="font-num hidden rounded border border-edge px-1.5 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Search pages" className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[14vh]">
          <button type="button" aria-label="Close search" tabIndex={-1} onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-black/50" style={{ animation: "fade-in 0.15s both" }} />
          <div className="sticker relative w-full max-w-lg overflow-hidden rounded-2xl" style={{ animation: "dialog-in 0.15s ease-out both" }}>
            <div className="flex items-center gap-3 border-b border-edge px-4">
              <Search className="h-4 w-4 text-muted" aria-hidden="true" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => { setQ(e.target.value); setCursor(0); }}
                onKeyDown={onInputKey}
                placeholder="Search pages: Coding, Resume, Prep…"
                aria-label="Search pages"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto p-2">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">No page matches “{q}”.</li>}
              {results.map((it, i) => {
                const Icon = it.icon;
                return (
                  <li key={it.href}>
                    <button
                      type="button"
                      onClick={() => go(it.href)}
                      onMouseEnter={() => setCursor(i)}
                      className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium", i === cursor ? "bg-primary/12 text-primary" : "")}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      <span className="flex-1">{it.label}</span>
                      {i === cursor && <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
