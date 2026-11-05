"use client";

import { useState } from "react";

type PipProps = {
  /** Text in the speech bubble. */
  greeting?: string;
  className?: string;
};

/**
 * Pip, the ONEstopPlacement mascot.
 * Animation layers (outer to inner), kept separate so transforms never clash:
 *   enter (pops up from below the habitat) > roam (wanders around) > bob (floats).
 * The right arm waves and a speech bubble says hello on load. Clicking Pip
 * makes it jump, wave and say hi again. All motion stops for users who prefer
 * reduced motion.
 */
export function Pip({ greeting = "Hey!", className = "" }: PipProps) {
  // 0 = first load (uses the delayed intro animations); >0 = replayed on click.
  const [plays, setPlays] = useState(0);
  const [jumping, setJumping] = useState(false);

  function sayHi() {
    setPlays((n) => n + 1);
    setJumping(true);
    window.setTimeout(() => setJumping(false), 650);
  }

  const again = plays > 0 ? "again" : "";

  return (
    <div className={`pip-enter ${className}`}>
      <div className="pip-roam">
        <div className="pip-bob">
          <button
            type="button"
            onClick={sayHi}
            aria-label="Pip the mascot. Press to say hi."
            className={`pointer-events-auto relative block w-[132px] cursor-pointer rounded-full focus-visible:outline-offset-4 ${jumping ? "pip-jump" : ""}`}
          >
            {/* speech bubble */}
            <span
              key={`bubble-${plays}`}
              aria-hidden="true"
              className={`pip-bubble ${again} absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border-2 border-ink bg-white px-3 py-1 font-display text-base font-bold text-ink shadow-[2px_2px_0_var(--ink)]`}
            >
              {greeting}
              <span className="absolute -bottom-[7px] left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-ink bg-white" />
            </span>

            <svg viewBox="0 0 160 176" role="img" aria-hidden="true" className="block h-auto w-full overflow-visible">
              {/* ground shadow */}
              <ellipse cx="80" cy="168" rx="38" ry="6" fill="#17150f" opacity="0.18" />

              {/* antenna */}
              <path d="M80 48 C80 34 84 26 90 18" fill="none" stroke="#17150f" strokeWidth="4" strokeLinecap="round" />
              <circle cx="92" cy="15" r="7" fill="#ffd23f" stroke="#17150f" strokeWidth="4" />

              {/* ears */}
              <path d="M40 62 L34 30 L64 50 Z" fill="#a897ff" stroke="#17150f" strokeWidth="4" strokeLinejoin="round" />
              <path d="M120 62 L126 30 L96 50 Z" fill="#a897ff" stroke="#17150f" strokeWidth="4" strokeLinejoin="round" />

              {/* feet */}
              <ellipse cx="60" cy="158" rx="17" ry="9" fill="#ff8a1f" stroke="#17150f" strokeWidth="4" />
              <ellipse cx="102" cy="158" rx="17" ry="9" fill="#ff8a1f" stroke="#17150f" strokeWidth="4" />

              {/* left arm (resting) */}
              <ellipse cx="29" cy="112" rx="11" ry="17" fill="#ff6b4a" stroke="#17150f" strokeWidth="4" transform="rotate(14 29 112)" />

              {/* body */}
              <ellipse cx="80" cy="104" rx="52" ry="55" fill="#ff6b4a" stroke="#17150f" strokeWidth="4" />
              <ellipse cx="80" cy="122" rx="30" ry="29" fill="#ffd9c7" />

              {/* right arm (waves) */}
              <g key={`arm-${plays}`} className={`pip-arm ${again}`}>
                <ellipse cx="136" cy="86" rx="11" ry="19" fill="#ff6b4a" stroke="#17150f" strokeWidth="4" transform="rotate(-28 136 86)" />
              </g>

              {/* eyes */}
              <g className="pip-eye">
                <ellipse cx="62" cy="88" rx="12" ry="14" fill="#fff" stroke="#17150f" strokeWidth="4" />
                <ellipse cx="98" cy="88" rx="12" ry="14" fill="#fff" stroke="#17150f" strokeWidth="4" />
                <circle cx="64" cy="90" r="6.5" fill="#17150f" />
                <circle cx="96" cy="90" r="6.5" fill="#17150f" />
                <circle cx="66.5" cy="87" r="2.2" fill="#fff" />
                <circle cx="98.5" cy="87" r="2.2" fill="#fff" />
              </g>

              {/* cheeks and smile */}
              <ellipse cx="48" cy="108" rx="8" ry="5" fill="#ff4f6d" opacity="0.55" />
              <ellipse cx="112" cy="108" rx="8" ry="5" fill="#ff4f6d" opacity="0.55" />
              <path d="M69 110 Q80 123 91 110" fill="#7a1f12" stroke="#17150f" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
