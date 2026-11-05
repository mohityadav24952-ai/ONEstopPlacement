"use client";

import { useId } from "react";
import type { CSSProperties } from "react";
import { look } from "./shared";
import type { CharProps } from "./shared";

const BITS = [
  { x: 36, t: "0101", d: 0 },
  { x: 52, t: "1", d: 0.35 },
  { x: 66, t: "10", d: 0.7 },
  { x: 80, t: "0101", d: 0.15 },
  { x: 46, t: "0", d: 0.9 },
  { x: 74, t: "1", d: 1.1 },
];

/** Galactic 10x engineer: an alien in a glass UFO dome. Click: tractor beam and floating binary. */
export function CyberAlien({ accent, size = 112, active, svgRef }: CharProps) {
  const uid = useId().replace(/:/g, "");
  const a = accent.base;
  return (
    <svg ref={svgRef} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id={`${uid}-dome`} cx="50%" cy="25%" r="85%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.38" />
          <stop offset="1" stopColor={a} stopOpacity="0.08" />
        </radialGradient>
        <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={a} stopOpacity="0.6" />
          <stop offset="1" stopColor={a} stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {active && <polygon className="sbm-a-beam" points="42,96 78,96 106,120 14,120" fill={`url(#${uid}-beam)`} />}

      <g className="sbm-a-bob">
        {/* antenna */}
        <g>
          <line x1="60" y1="58" x2="60" y2="38" stroke={a} strokeWidth="2" strokeLinecap="round" />
          <circle cx="60" cy="35" r="3.6" fill={a} className="sbm-a-pulse" style={{ opacity: 1 }} />
          <circle cx="60" cy="35" r="6.5" fill={a} opacity="0.18" />
        </g>

        {/* alien */}
        <ellipse cx="60" cy="74" rx="15" ry="14.5" fill={a} />
        <ellipse cx="60" cy="70" rx="11" ry="7" fill="#ffffff" opacity="0.12" />
        <ellipse cx="51" cy="73" rx="6.5" ry="8.5" fill="#04100c" transform="rotate(-12 51 73)" />
        <ellipse cx="69" cy="73" rx="6.5" ry="8.5" fill="#04100c" transform="rotate(12 69 73)" />
        <g style={look(2.6)}>
          <circle cx="51" cy="73" r="3.1" fill="#bffff0" />
          <circle cx="69" cy="73" r="3.1" fill="#bffff0" />
          <circle cx="50" cy="71.8" r="1" fill="#ffffff" />
          <circle cx="68" cy="71.8" r="1" fill="#ffffff" />
        </g>
        <path d="M55 83 Q60 86 65 83" stroke="#04100c" strokeWidth="1.4" fill="none" strokeLinecap="round" />

        {/* glass dome */}
        <path d="M28 88 A32 32 0 0 1 92 88 Z" fill={`url(#${uid}-dome)`} stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1.2" />
        <path d="M38 70 Q42 60 52 57" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" fill="none" strokeLinecap="round" />

        {/* saucer */}
        <ellipse cx="60" cy="89" rx="40" ry="9" fill="#1e293b" stroke={a} strokeWidth="1.4" />
        {[34, 47, 60, 73, 86].map((x, i) => (
          <circle key={x} cx={x} cy="90" r="2.1" fill={a} className="sbm-a-pulse" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}

        {/* thruster rings */}
        <ellipse cx="60" cy="101" rx="26" ry="5" fill="none" stroke={a} strokeWidth="1.6" className="sbm-a-pulse" />
        <ellipse cx="60" cy="108" rx="17" ry="3.5" fill="none" stroke={a} strokeWidth="1.4" className="sbm-a-pulse" style={{ animationDelay: "0.5s" }} />
      </g>

      {active &&
        BITS.map((b) => (
          <text
            key={`${b.x}-${b.t}`}
            x={b.x}
            y="112"
            textAnchor="middle"
            fontSize="9"
            fontFamily="ui-monospace, Menlo, Consolas, monospace"
            fill={a}
            className="sbm-a-rise"
            style={{ animationDelay: `${b.d}s` } as CSSProperties}
          >
            {b.t}
          </text>
        ))}
    </svg>
  );
}
