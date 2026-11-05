"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient layer for the Neon Eclipse theme: two slow-drifting blurred lights (pure CSS) and a soft
 * cursor spotlight. CSS hides the whole layer in every other theme, and the spotlight on touch
 * devices. The pointer handler only writes one transform per animation frame, never React state.
 */
export function NeonFx() {
  const spot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spot.current;
    if (!el) return;
    if (window.matchMedia("(hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = "1";
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden="true" className="neon-fx">
      <div className="neon-orb neon-orb-a" />
      <div className="neon-orb neon-orb-b" />
      <div ref={spot} className="neon-spot" />
    </div>
  );
}
