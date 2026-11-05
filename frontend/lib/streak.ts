"use client";

import { useSyncExternalStore } from "react";

/**
 * Study streak: consecutive local calendar days on which the user did something real.
 * "Something real" = a meaningful action (a question marked done, a resume or portfolio
 * approved, a coding platform action) or at least ACTIVE_MINUTES of genuine input in the app.
 * Merely having a tab open never counts.
 *
 * Stored per browser in localStorage (there is no backend table for this yet), as a list of
 * YYYY-MM-DD strings. Nothing is invented: a brand-new browser starts at zero.
 */
export const ACTIVE_MINUTES_FOR_A_DAY = 10;

const KEY = "streak:v1";
const MAX_DAYS = 400;

export type Streak = {
  /** Consecutive active days ending today, or ending yesterday if today is not active yet. */
  current: number;
  longest: number;
  activeToday: boolean;
  /** Streak is alive but needs something today to continue. */
  atRisk: boolean;
  totalDays: number;
};

export const EMPTY_STREAK: Streak = { current: 0, longest: 0, activeToday: false, atRisk: false, totalDays: 0 };

/** Local calendar day, not UTC, so "today" matches the user's clock. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shift(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

/** Pure: works out the streak from a list of active days. */
export function computeStreak(days: readonly string[], today: string): Streak {
  const set = new Set(days);
  const activeToday = set.has(today);

  let anchor = activeToday ? today : shift(today, -1);
  let current = 0;
  while (set.has(anchor)) {
    current++;
    anchor = shift(anchor, -1);
  }

  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && shift(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, activeToday, atRisk: current > 0 && !activeToday, totalDays: set.size };
}

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x)) : [];
  } catch {
    return [];
  }
}

const listeners = new Set<() => void>();
let snapshotRaw: string | null | undefined;
let snapshot: Streak = EMPTY_STREAK;

function getSnapshot(): Streak {
  if (typeof window === "undefined") return EMPTY_STREAK;
  const days = read();
  const today = dayKey(new Date());
  const raw = `${today}|${days.join(",")}`;
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = computeStreak(days, today);
  }
  return snapshot;
}

/** Mark today as an active day. Safe to call as often as you like. */
export function recordActivity(now: Date = new Date()): void {
  const today = dayKey(now);
  const days = read();
  if (days.includes(today)) return;
  try {
    localStorage.setItem(KEY, JSON.stringify([...days, today].slice(-MAX_DAYS)));
  } catch {
    return; // storage blocked: nothing to persist, streak simply stays as it was
  }
  listeners.forEach((l) => l());
}

export function useStreak(): Streak {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnapshot,
    () => EMPTY_STREAK,
  );
}
