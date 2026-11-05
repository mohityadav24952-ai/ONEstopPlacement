"use client";

import type { CSSProperties } from "react";
import { FACES, look } from "./shared";
import type { CharProps } from "./shared";

const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return { x: Math.cos(a) * (26 + (i % 4) * 8), y: Math.sin(a) * (22 + (i % 3) * 8) - 10, c: ["#fde047", "#f472b6", "#ffffff", "#38bdf8"][i % 4], d: (i % 5) * 0.05 };
});

/** Blocky isometric mecha-dev with studio headphones and an LED-matrix face. Click: next face, jetpack boost, pixel confetti. */
export function VoxelBot({ accent, size = 112, active, face = 0, svgRef }: CharProps) {
  const a = accent.base;
  const expression = FACES[face % FACES.length];
  return (
    <svg ref={svgRef} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false" style={{ overflow: "visible" }}>
      <g className={active ? "sbm-a-boost" : "sbm-a-bob"}>
        {/* jetpack + flames */}
        <rect x="30" y="68" width="9" height="22" fill="#334155" stroke="#0f172a" strokeWidth="1" />
        <rect x="41" y="70" width="5" height="18" fill="#1e293b" />
        {active && (
          <>
            <polygon className="sbm-a-flame" style={{ transformOrigin: "34.5px 90px" }} points="30,90 39,90 34.5,104" fill="#fb923c" />
            <polygon className="sbm-a-flame" style={{ transformOrigin: "34.5px 90px" }} points="32.5,90 36.5,90 34.5,99" fill="#fde047" />
          </>
        )}

        {/* legs */}
        <rect x="46" y="94" width="11" height="16" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
        <rect x="63" y="94" width="11" height="16" fill="#1e293b" stroke="#0f172a" strokeWidth="1" />
        <rect x="44" y="108" width="15" height="5" fill={a} />
        <rect x="61" y="108" width="15" height="5" fill={a} />

        {/* hoodie body: front, side, top */}
        <rect x="42" y="66" width="36" height="28" fill="#3b4268" stroke="#1e2440" strokeWidth="1" />
        <polygon points="78,66 86,60 86,88 78,94" fill="#2c3252" stroke="#1e2440" strokeWidth="1" />
        <polygon points="42,66 50,60 86,60 78,66" fill="#4a5282" stroke="#1e2440" strokeWidth="1" />
        <rect x="50" y="80" width="20" height="9" fill="#2c3252" />
        <line x1="56" y1="66" x2="56" y2="76" stroke="#cbd5e1" strokeWidth="1.4" />
        <line x1="64" y1="66" x2="64" y2="76" stroke="#cbd5e1" strokeWidth="1.4" />

        {/* head cube */}
        <rect x="38" y="28" width="44" height="34" rx="2" fill="#475569" stroke="#0f172a" strokeWidth="1.2" />
        <polygon points="82,28 90,20 90,54 82,62" fill="#334155" stroke="#0f172a" strokeWidth="1.2" />
        <polygon points="38,28 46,20 90,20 82,28" fill="#64748b" stroke="#0f172a" strokeWidth="1.2" />

        {/* LED matrix face */}
        <rect x="43" y="33" width="34" height="24" rx="2" fill="#04120d" stroke={a} strokeOpacity="0.5" strokeWidth="1" />
        <g style={look(2)}>
          <text x="60" y="48" textAnchor="middle" fontSize="7.6" fontWeight="700" fontFamily="ui-monospace, Menlo, Consolas, monospace" fill={a}>
            {expression}
          </text>
        </g>

        {/* studio headphones */}
        <path d="M36 36 Q36 12 62 12 Q88 12 90 30" fill="none" stroke={a} strokeWidth="3.4" strokeLinecap="round" />
        <rect x="31" y="34" width="8" height="18" rx="2" fill={a} stroke="#0f172a" strokeWidth="1" />
        <rect x="86" y="26" width="7" height="17" rx="2" fill={a} stroke="#0f172a" strokeWidth="1" />
      </g>

      {active &&
        CONFETTI.map((c, i) => (
          <rect
            key={i}
            className="sbm-a-conf"
            x="58"
            y="38"
            width="3.4"
            height="3.4"
            fill={c.c}
            style={{ "--x": `${c.x}px`, "--y": `${c.y}px`, animationDelay: `${c.d}s` } as CSSProperties}
          />
        ))}
    </svg>
  );
}
