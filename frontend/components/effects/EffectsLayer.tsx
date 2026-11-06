"use client";

import { useEffect, useRef } from "react";
import { useEffectActive } from "@/components/effects/useEffects";

/**
 * The fixed background layer behind every page: two slow ambient lights and the cursor spotlight.
 * Colours come from the active theme's tokens (app/effects.css), so it follows all four themes
 * without any JavaScript on theme change. CSS shows each part only when its effect is on.
 *
 * Performance (built for low-end laptops): the lights are plain radial gradients (no blur filter,
 * no canvas) moved with transform only. The spotlight listens to pointer moves only while it is
 * enabled, on a fine pointer, without reduced motion, and writes one transform per animation frame
 * straight to the DOM, never React state.
 */
export function EffectsLayer() {
  const spot = useRef<HTMLDivElement>(null);
  const spotlightOn = useEffectActive("spotlight");

  useEffect(() => {
    const el = spot.current;
    if (!el || !spotlightOn) return;
    const mq = window.matchMedia("(hover: none), (pointer: coarse), (prefers-reduced-motion: reduce)");
    if (mq.matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = "1";
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
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
      el.style.opacity = "0";
    };
  }, [spotlightOn]);

  return (
    <div aria-hidden="true" className="fx-layer">
      <div className="fx-orb fx-orb-a" />
      <div className="fx-orb fx-orb-b" />
      <div ref={spot} className="fx-spot" />
    </div>
  );
}
