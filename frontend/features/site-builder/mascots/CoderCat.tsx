"use client";

import { useId } from "react";
import { look } from "./shared";
import type { CharProps } from "./shared";

/** Hoodie cat peeking over a glowing laptop, with a coffee mug and a hanging bulb. Paws type while the visitor scrolls or moves the mouse. Click: bulb warm glow <-> neon party. */
export function CoderCat({ accent, size = 112, typing, party, svgRef }: CharProps) {
  const uid = useId().replace(/:/g, "");
  const a = accent.base;
  const bulb = party ? "#f0abfc" : "#fde68a";
  return (
    <svg ref={svgRef} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor={bulb} stopOpacity="0.55" />
          <stop offset="1" stopColor={bulb} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* hanging filament bulb */}
      <g className={party ? "sbm-a-party" : undefined}>
        <circle cx="16" cy="26" r="17" fill={`url(#${uid}-glow)`} className="sbm-a-pulse" style={{ opacity: 1 }} />
        <line x1="16" y1="0" x2="16" y2="17" stroke="#94a3b8" strokeWidth="1.3" />
        <rect x="13" y="16" width="6" height="5" rx="1" fill="#64748b" />
        <circle cx="16" cy="26" r="6" fill={bulb} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1" />
        <path d="M14 27 L15.5 23 L16.5 27 L18 23" stroke="#f59e0b" strokeWidth="0.9" fill="none" />
      </g>

      {/* hood + cat head (drawn first: the laptop covers the lower part, so the cat peeks over it) */}
      <ellipse cx="62" cy="50" rx="27" ry="23" fill="#475569" />
      <path d="M43 36 L41 18 L56 29 Z" fill="#f59e4a" stroke="#c2410c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M81 36 L83 18 L68 29 Z" fill="#f59e4a" stroke="#c2410c" strokeWidth="1" strokeLinejoin="round" />
      <path d="M45 33 L44.5 24 L51 29 Z" fill="#fbcfe8" />
      <path d="M79 33 L79.5 24 L73 29 Z" fill="#fbcfe8" />
      <ellipse cx="62" cy="49" rx="20" ry="17" fill="#f59e4a" stroke="#c2410c" strokeWidth="1" />
      <path d="M62 33 L62 40 M55 35 L56 40 M69 35 L68 40" stroke="#c2410c" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="54" cy="48" rx="4.4" ry="5.2" fill="#ffffff" />
      <ellipse cx="70" cy="48" rx="4.4" ry="5.2" fill="#ffffff" />
      <g style={look(1.8)}>
        <circle cx="54" cy="48.5" r="2.7" fill="#111827" />
        <circle cx="70" cy="48.5" r="2.7" fill="#111827" />
        <circle cx="53.2" cy="47.4" r="0.8" fill="#ffffff" />
        <circle cx="69.2" cy="47.4" r="0.8" fill="#ffffff" />
      </g>
      <path d="M60 55 L64 55 L62 57.5 Z" fill="#f472b6" />
      <path d="M62 57.5 Q59 61 56 59 M62 57.5 Q65 61 68 59" stroke="#7c2d12" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M44 55 L35 53 M44 58 L35 59 M80 55 L89 53 M80 58 L89 59" stroke="#7c2d12" strokeWidth="0.8" strokeLinecap="round" />

      {/* laptop: lid (back, with glowing logo) and base */}
      <rect x="24" y="64" width="76" height="30" rx="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.2" />
      <circle cx="62" cy="79" r="5.2" fill={a} />
      <circle cx="62" cy="79" r="9" fill={a} opacity="0.2" className="sbm-a-pulse" />
      <path d="M16 94 H108 L102 102 H22 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.2" strokeLinejoin="round" />

      {/* typing paws */}
      <ellipse cx="52" cy="64" rx="6" ry="4" fill="#f59e4a" stroke="#c2410c" strokeWidth="1" className={typing ? "sbm-a-type" : undefined} />
      <ellipse cx="72" cy="64" rx="6" ry="4" fill="#f59e4a" stroke="#c2410c" strokeWidth="1" className={typing ? "sbm-a-type" : undefined} style={{ animationDelay: "0.08s" }} />

      {/* coffee mug + steam */}
      <rect x="100" y="84" width="12" height="13" rx="2" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
      <path d="M112 87 Q117 88 117 91 Q117 94 112 94" fill="none" stroke="#94a3b8" strokeWidth="1.4" />
      <rect x="100" y="84" width="12" height="3.5" rx="1.5" fill="#7c4a2a" />
      {[103.5, 108.5].map((x, i) => (
        <path key={x} d={`M${x} 82 q-2 -3 0 -5`} stroke="#cbd5e1" strokeWidth="1.2" fill="none" strokeLinecap="round" className="sbm-a-steam" style={{ animationDelay: `${i * 0.9}s` }} />
      ))}
    </svg>
  );
}
