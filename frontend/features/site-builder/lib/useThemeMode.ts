"use client";

import { useState } from "react";
import type { ThemeMode } from "@/types/portfolio";

/** Visitor-controlled light/dark that starts from (and follows) the owner's configured default. */
export function useThemeMode(initial: ThemeMode): [ThemeMode, (m: ThemeMode) => void, () => void] {
  const [mode, setMode] = useState<ThemeMode>(initial);
  const [seen, setSeen] = useState<ThemeMode>(initial);
  // When the owner changes the default (Customize tab), follow it. Done during render, not in an effect.
  if (seen !== initial) {
    setSeen(initial);
    setMode(initial);
  }
  return [mode, setMode, () => setMode((m) => (m === "dark" ? "light" : "dark"))];
}
