"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_EFFECTS, getEffects, subscribeEffects } from "@/lib/effects";
import type { EffectId, EffectsPrefs } from "@/lib/effects";

export function useEffectsPrefs(): EffectsPrefs {
  return useSyncExternalStore(subscribeEffects, getEffects, () => DEFAULT_EFFECTS);
}

/** True when this effect is running right now (master switch on and the effect itself on). */
export function useEffectActive(id: EffectId): boolean {
  const p = useEffectsPrefs();
  return p.enabled && p.items[id];
}
