"use client";

import { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useEffectActive } from "@/components/effects/useEffects";

/**
 * A short fade of the page content when the route changes. It renders nothing and does not wrap or
 * remount the page (so no page state is reset and routing is untouched): it only plays an opacity
 * animation on the existing <main> element after the new page has committed, before it is painted.
 * Opacity only, so fixed-position children inside the page are never shifted.
 */
export function RouteFade({ targetId = "main" }: { targetId?: string }) {
  const pathname = usePathname();
  const on = useEffectActive("transitions");
  const first = useRef(true);

  useLayoutEffect(() => {
    if (first.current) {
      first.current = false; // the first page already has its own entrance animation
      return;
    }
    if (!on) return;
    const el = document.getElementById(targetId);
    if (!el || typeof el.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const anim = el.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 220, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
    return () => anim.cancel();
  }, [pathname, on, targetId]);

  return null;
}
