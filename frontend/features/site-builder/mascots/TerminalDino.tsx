"use client";

import { look } from "./shared";
import type { CharProps } from "./shared";

// 24 x 20 pixel map, facing right. # body, s sunglasses, w teeth.
const MAP = [
  "..............########..",
  ".............##########.",
  ".............#sssssssss#.",
  ".............#sssssssss#.",
  ".............##########.",
  ".............##########.",
  ".............########...",
  ".............#####wwww..",
  "..#..........######.....",
  "..##........#######..#..",
  "..###......########..##.",
  "...####...#########.....",
  "....##############......",
  ".....############.......",
  ".....###########........",
  "......##########........",
  ".......#########........",
  ".......###..###.........",
  ".......###..###.........",
  "......####.####.........",
].map((r) => r.padEnd(24, ".").slice(0, 24));

const PX = 4;
const OX = 12;
const OY = 22;

/** Retro compiler T-Rex in Matrix sunglasses. Click: jump (and play the 404-BUG cactus mini game in the widget). */
export function TerminalDino({ accent, size = 112, jumping, svgRef }: CharProps) {
  const fills: Record<string, string> = { "#": accent.base, s: "#04070a", w: "#f8fafc" };
  return (
    <svg ref={svgRef} viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" focusable="false" shapeRendering="crispEdges" style={{ overflow: "visible" }}>
      <g className={jumping ? "sbm-a-jump" : "sbm-a-bob"}>
        {MAP.flatMap((row, y) =>
          [...row].map((c, x) => (c === "." ? null : <rect key={`${x}-${y}`} x={OX + x * PX} y={OY + y * PX} width={PX} height={PX} fill={fills[c]} />)),
        )}
        {/* the lenses reflect a falling-code glint that follows the cursor */}
        <g style={look(1.6)}>
          <rect x={OX + 15 * PX} y={OY + 2 * PX + 1} width="5" height="2" fill="#5eff9a" />
          <rect x={OX + 19 * PX} y={OY + 3 * PX + 1} width="4" height="2" fill="#5eff9a" opacity="0.7" />
        </g>
      </g>
      <rect x="8" y={OY + 20 * PX + 1} width="104" height="2" fill={accent.base} opacity="0.6" />
    </svg>
  );
}
