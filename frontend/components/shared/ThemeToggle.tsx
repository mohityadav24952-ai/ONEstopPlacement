"use client";

import { SunMoon } from "lucide-react";

export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const systemIsLight = window.matchMedia(
      "(prefers-color-scheme: light)",
    ).matches;
    const current = root.dataset.theme ?? (systemIsLight ? "light" : "dark");
    const next = current === "light" ? "dark" : "light";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Storage can be blocked (private mode). The toggle still works for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
    >
      <SunMoon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}