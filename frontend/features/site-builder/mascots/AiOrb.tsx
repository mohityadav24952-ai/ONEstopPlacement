"use client";

import { useId } from "react";
import { look } from "./shared";
import type { CharProps } from "./shared";

/** Sentient neural core: a rotating holographic gyroscope around a pulsing plasma core with a tracking pupil. Hover: the widget shows a telemetry HUD. */
export function AiOrb({ accent, size = 112, active, svgRef }: CharProps) {
  const uid = useId().replace(/:/g, "");
  const a = accent.base;
  const origin = { transformOrigin: "60px 60px" } as const;
  return (
    <svg ref={svgRef} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${uid}-core`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor={a} />
          <stop offset="1" stopColor={a} stopOpacity="0.15" />
        </radialGradient>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0" stopColor={a} stopOpacity="0.45" />
          <stop offset="1" stopColor={a} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="60" cy="60" r="56" fill={`url(#${uid}-halo)`} className="sbm-a-pulse" style={{ opacity: 1 }} />

      {/* gyroscope rings */}
      <g className="sbm-a-spin" style={{ ...origin, animationDuration: "18s" }}>
        <circle cx="60" cy="60" r="46" fill="none" stroke={a} strokeWidth="1.6" strokeDasharray="6 5" opacity="0.8" />
      </g>
      <g className="sbm-a-spin" style={{ ...origin, animationDuration: "9s", animationDirection: "reverse" }}>
        <g className="sbm-a-flip" style={origin}>
          <ellipse cx="60" cy="60" rx="40" ry="40" fill="none" stroke={a} strokeWidth="1.4" opacity="0.7" />
        </g>
      </g>
      <g className="sbm-a-spin" style={{ ...origin, animationDuration: "12s" }}>
        <g className="sbm-a-flip" style={{ ...origin, animationDelay: "-3s" }}>
          <ellipse cx="60" cy="60" rx="34" ry="34" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.2" />
        </g>
      </g>

      {/* orbiting data nodes */}
      {[
        { r: 46, d: "7s", rev: false, s: 3.2 },
        { r: 34, d: "5s", rev: true, s: 2.6 },
        { r: 40, d: "10s", rev: false, s: 2.2 },
      ].map((n, i) => (
        <g key={i} className="sbm-a-spin" style={{ ...origin, animationDuration: active ? "1.6s" : n.d, animationDirection: n.rev ? "reverse" : "normal", animationDelay: `${-i * 1.3}s` }}>
          <circle cx={60 + n.r} cy="60" r={n.s} fill="#ffffff" />
          <circle cx={60 + n.r} cy="60" r={n.s * 2.2} fill={a} opacity="0.25" />
        </g>
      ))}

      {/* plasma core with a pupil that follows the cursor */}
      <g className="sbm-a-core" style={origin}>
        <circle cx="60" cy="60" r="17" fill={`url(#${uid}-core)`} />
        <circle cx="60" cy="60" r="11" fill="#ffffff" opacity="0.9" />
        <g style={look(3.4)}>
          <circle cx="60" cy="60" r="5.4" fill={a} />
          <circle cx="60" cy="60" r="2.6" fill="#050816" />
          <circle cx="58.8" cy="58.6" r="0.9" fill="#ffffff" />
        </g>
      </g>
    </svg>
  );
}
