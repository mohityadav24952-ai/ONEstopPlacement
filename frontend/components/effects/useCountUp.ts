"use client";

import { useEffect, useRef, useState } from "react";
import { useEffectActive } from "@/components/effects/useEffects";

/**
 * Presentation only: returns a number that eases from the previously shown value to `target`
 * (from 0 on first mount). The real value is never changed; callers keep using `target` for
 * anything meaningful (aria values, calculations). Returns `target` directly when entrance
 * animations are off or the user prefers reduced motion, and never animates the same value twice,
 * so ordinary re-renders cost nothing.
 */
export function useCountUp(target: number, duration = 700): number {
  const on = useEffectActive("entrance");
  // Start from 0 when the count-up will play, so the final value never flashes first.
  // (These components render only on the client, behind the auth gate.)
  const [shown, setShown] = useState(() =>
    on && typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : target,
  );
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    from.current = target;
    if (!on || start === target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(target);
      return;
    }
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (target - start) * eased));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, on, duration]);

  return on ? shown : target;
}
