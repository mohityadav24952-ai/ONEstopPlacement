"use client";

import { PlaceyCharacter } from "@/components/placey/PlaceyCharacter";
import type { FaceName, PlaceyTint } from "@/components/placey/PlaceyCharacter";
import type { PlaceyMode } from "@/components/placey/accessories";
import type { PlaceyMotion } from "@/components/placey/motion";

type Props = {
  mode: PlaceyMode;
  /** Body colour variant (visual only). */
  tint?: PlaceyTint;
  motion: PlaceyMotion;
  face?: FaceName;
  /** Park below the viewport edge (before the entrance). */
  offscreen?: boolean;
  /** Stop all ambient animation (hidden, or tab inactive). */
  paused?: boolean;
  className?: string;
  label?: string;
  /** Rendered in the position layer (follows left/right movement, not squashed). */
  children?: React.ReactNode;
};

/**
 * Wraps the character with the motion layers, outermost first:
 *   position (run left/right)  >  motion (enter, hop, jump... with squash and stretch)  >  mirror  >  character
 * Each layer owns one transform so they never fight each other.
 */
export function PlaceyActor({ mode, tint, motion, face, offscreen = false, paused = false, className, label, children }: Props) {
  return (
    <div
      className={`relative ${className ?? ""}`}
      style={{
        transform: `translateX(${motion.x}px)`,
        transition: motion.running ? `transform ${motion.runMs}ms ease-in-out` : "transform 0.3s ease",
      }}
    >
      {children}
      <div
        className={`placey-motion ${offscreen ? "pm-offscreen" : ""} ${motion.motion ? `pm-${motion.motion}` : ""} ${motion.running ? "pm-run" : ""}`}
        style={{ transformOrigin: "50% 100%" }}
      >
        <div style={{ transform: motion.flip ? "scaleX(-1)" : undefined }}>
          <PlaceyCharacter
            mode={mode}
            tint={tint}
            face={face}
            look={motion.look}
            waving={motion.waving}
            animated={!paused && !motion.reduced}
            label={label}
            className="block w-full"
          />
        </div>
      </div>
    </div>
  );
}
