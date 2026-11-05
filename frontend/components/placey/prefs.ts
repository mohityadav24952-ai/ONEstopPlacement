"use client";

import { useSyncExternalStore } from "react";
import type { PlaceyMode } from "@/components/placey/accessories";

/**
 * Placey's user preferences. Stored per browser in localStorage, like the theme.
 * (The backend has no preferences table; this can move to the account later without
 * changing any caller.)
 */
export type PlaceyPrefs = {
  /** The first-visit introduction has been seen or skipped. */
  introDone: boolean;
  hidden: boolean;
  /** No speech bubbles. */
  muted: boolean;
  /** Allow tiny runs and hops while idle. */
  movement: boolean;
  /** "auto" follows the page and activity; anything else is the user's manual choice. */
  mode: PlaceyMode | "auto";
};

export const DEFAULT_PREFS: PlaceyPrefs = { introDone: false, hidden: false, muted: false, movement: true, mode: "auto" };

const KEY = "placey:v1";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cached: PlaceyPrefs = DEFAULT_PREFS;

function parse(raw: string | null): PlaceyPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const v = JSON.parse(raw) as Partial<PlaceyPrefs>;
    return {
      introDone: v.introDone === true,
      hidden: v.hidden === true,
      muted: v.muted === true,
      movement: v.movement !== false,
      mode: typeof v.mode === "string" ? (v.mode as PlaceyPrefs["mode"]) : "auto",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function getPrefs(): PlaceyPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    // storage blocked: fall back to in-memory values below
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = parse(raw);
  }
  return cached;
}

export function setPrefs(patch: Partial<PlaceyPrefs>): void {
  const next = { ...getPrefs(), ...patch };
  cached = next;
  try {
    const raw = JSON.stringify(next);
    localStorage.setItem(KEY, raw);
    cachedRaw = raw;
  } catch {
    // Not persisted (private mode), still applied for this visit.
  }
  listeners.forEach((l) => l());
}

export function resetPrefs(): void {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem("placey:greeted");
  } catch {
    // ignore
  }
  cachedRaw = undefined;
  cached = DEFAULT_PREFS;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function usePlaceyPrefs(): PlaceyPrefs {
  return useSyncExternalStore(subscribe, getPrefs, () => DEFAULT_PREFS);
}
