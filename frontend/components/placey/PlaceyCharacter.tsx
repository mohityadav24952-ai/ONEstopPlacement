import { memo, useId } from "react";
import { Behind, Front } from "@/components/placey/accessories";
import type { PlaceyMode } from "@/components/placey/accessories";

/**
 * Placey, the base character (2D layered SVG, no raster images).
 *
 * Structure, back to front:
 *   sparkles/orbit  >  body (jelly + cloud skirt)  >  arms  >  face  >  accessories (added in phase 3)
 *
 * The body, face placement, blush and palette are shared by every mode so Placey always reads
 * as the same character. A mode only changes the `face`, the optional accessory layer and effects.
 * A GLB renderer could later replace this file without touching the rest of the system.
 */

export type EyeStyle = "open" | "happy" | "closed" | "sleepy" | "focus" | "wink" | "sparkle";
export type MouthStyle = "smile" | "grin" | "open" | "small" | "flat" | "sleep";

export type Face = { eyes: EyeStyle; mouth: MouthStyle };

export const FACES = {
  neutral: { eyes: "open", mouth: "smile" },
  happy: { eyes: "happy", mouth: "grin" },
  excited: { eyes: "sparkle", mouth: "open" },
  focus: { eyes: "focus", mouth: "small" },
  sleepy: { eyes: "sleepy", mouth: "sleep" },
  wink: { eyes: "wink", mouth: "grin" },
  cheer: { eyes: "happy", mouth: "open" },
  thrill: { eyes: "focus", mouth: "open" },
  smirk: { eyes: "open", mouth: "grin" },
} as const satisfies Record<string, Face>;

export type FaceName = keyof typeof FACES;

/** The expression each mode wears unless a face is passed explicitly. */
export const MODE_FACE: Record<PlaceyMode, FaceName> = {
  classic: "neutral",
  study: "neutral",
  tech: "thrill",
  motivated: "thrill",
  hacker: "smirk",
  chill: "sleepy",
  victory: "happy",
  resume: "focus",
  portfolio: "excited",
};

/**
 * Body colour. "lavender" is the original look; the others only swap the body palette below.
 * Face, outfit and behaviour are identical. Colours are written straight onto the SVG (not through
 * inherited CSS variables) because browsers do not reliably repaint a gradient when only an
 * ancestor's CSS variable changes; that is why the picker used to have no visible effect.
 */
export type PlaceyTint = "lavender" | "yellowish" | "pinkish";
export const PLACEY_TINTS: PlaceyTint[] = ["lavender", "yellowish", "pinkish"];
export const TINT_LABEL: Record<PlaceyTint, string> = { lavender: "Lavender (classic)", yellowish: "Sunny yellow", pinkish: "Bubblegum pink" };

type Palette = { body: [string, string, string]; skirt: [string, string]; glow: string; shadow: string; arm: string; antenna: string };

export const TINT_PALETTE: Record<PlaceyTint, Palette> = {
  lavender: { body: ["#e9e6ff", "#bcb8fb", "#7f86ec"], skirt: ["#d9d6ff", "#9a9df2"], glow: "#b9c4ff", shadow: "#5b5fb0", arm: "#aeb0f6", antenna: "#9aa3f5" },
  yellowish: { body: ["#fff8dc", "#ffe28f", "#f2b544"], skirt: ["#fff1c2", "#f6c85c"], glow: "#ffe08a", shadow: "#a8741f", arm: "#f8d272", antenna: "#eeb54d" },
  pinkish: { body: ["#ffeaf4", "#ffb9da", "#f079b4"], skirt: ["#ffd8eb", "#f49bc8"], glow: "#ffb3d9", shadow: "#a8467c", arm: "#f8a9d0", antenna: "#ec8cbd" },
};

type Props = {
  /** Which outfit Placey wears. The body and face placement never change. */
  mode?: PlaceyMode;
  /** Body colour variant. Purely visual. */
  tint?: PlaceyTint;
  face?: FaceName;
  /** Where the pupils look, -1 (left) to 1 (right). */
  look?: number;
  /** Show the glowing ring and sparkles of the default Classic look. */
  halo?: boolean;
  /** Wave the right arm. */
  waving?: boolean;
  /** Animate blinking, floating etc. Off for static previews and reduced motion. */
  animated?: boolean;
  className?: string;
  /** Accessibility: Placey is decorative unless a label is given. */
  label?: string;
};

const INK = "#2b2a5c";

function Eyes({ style, look }: { style: EyeStyle; look: number }) {
  const dx = look * 3;
  const eye = (cx: number, key: string) => {
    switch (style) {
      case "happy":
        return <path key={key} d={`M${cx - 8} 96 Q${cx} 84 ${cx + 8} 96`} fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
      case "closed":
      case "sleepy":
        return <path key={key} d={`M${cx - 8} 90 Q${cx} 99 ${cx + 8} 90`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />;
      case "focus":
        return (
          <g key={key} className="placey-eye">
            <path d={`M${cx - 8} 86 L${cx + (cx < 100 ? 6 : -6)} 92 L${cx - 8} 98`} fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" transform={cx > 100 ? `translate(${2 * cx} 0) scale(-1 1)` : undefined} />
          </g>
        );
      case "wink":
        return cx > 100 ? (
          <path key={key} d={`M${cx - 8} 96 Q${cx} 84 ${cx + 8} 96`} fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        ) : (
          <g key={key} style={{ transform: `translateX(${dx}px)`, transition: "transform 0.25s ease" }}><g className="placey-eye">
            <ellipse cx={cx} cy="92" rx="8" ry="9.5" fill={INK} />
            <circle cx={cx - 2.5} cy="88" r="3.2" fill="#fff" />
            <circle cx={cx + 3} cy="96" r="1.6" fill="#fff" />
          </g></g>
        );
      case "sparkle":
        return (
          <g key={key} style={{ transform: `translateX(${dx}px)`, transition: "transform 0.25s ease" }}><g className="placey-eye">
            <ellipse cx={cx} cy="92" rx="9" ry="10.5" fill={INK} />
            <circle cx={cx - 3} cy="87.5" r="3.8" fill="#fff" />
            <circle cx={cx + 3.5} cy="96" r="2" fill="#fff" />
            <circle cx={cx + 3} cy="86" r="1.2" fill="#c9d4ff" />
          </g></g>
        );
      default:
        return (
          <g key={key} style={{ transform: `translateX(${dx}px)`, transition: "transform 0.25s ease" }}><g className="placey-eye">
            <ellipse cx={cx} cy="92" rx="8" ry="9.5" fill={INK} />
            <circle cx={cx - 2.5} cy="88" r="3.2" fill="#fff" />
            <circle cx={cx + 3} cy="96" r="1.6" fill="#fff" />
          </g></g>
        );
    }
  };
  return (
    <>
      {eye(78, "l")}
      {eye(122, "r")}
    </>
  );
}

function Mouth({ style }: { style: MouthStyle }) {
  switch (style) {
    case "grin":
      return <path d="M91 108 Q100 120 109 108 Z" fill="#c2415f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
    case "open":
      return (
        <g>
          <path d="M90 107 Q100 128 110 107 Z" fill="#c2415f" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M94 117 Q100 123 106 117 Q100 113 94 117Z" fill="#ff8aa8" />
        </g>
      );
    case "small":
      return <path d="M95 110 Q100 114 105 110" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
    case "flat":
      return <path d="M94 111 L106 111" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
    case "sleep":
      return <path d="M95 111 Q100 115 105 111" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />;
    default:
      return <path d="M92 107 Q100 117 108 107" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />;
  }
}

function PlaceyCharacterBase({ mode = "classic", tint = "lavender", face, look = 0, halo = mode === "classic", waving = false, animated = true, className, label }: Props) {
  const uid = `${useId().replace(/:/g, "")}${tint}`;
  const pal = TINT_PALETTE[tint] ?? TINT_PALETTE.lavender;
  const f = FACES[face ?? MODE_FACE[mode]];
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true as const };

  return (
    <svg viewBox="0 0 200 200" data-mode={mode} data-placey-tint={tint} className={`${animated ? "placey-anim " : ""}${className ?? ""}`} {...a11y}>
      <defs>
        <radialGradient id={`${uid}body`} cx="38%" cy="28%" r="85%">
          <stop offset="0%" stopColor={pal.body[0]} />
          <stop offset="45%" stopColor={pal.body[1]} />
          <stop offset="100%" stopColor={pal.body[2]} />
        </radialGradient>
        <radialGradient id={`${uid}skirt`} cx="50%" cy="20%" r="90%">
          <stop offset="0%" stopColor={pal.skirt[0]} />
          <stop offset="100%" stopColor={pal.skirt[1]} />
        </radialGradient>
        <radialGradient id={`${uid}glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopOpacity="0.5" stopColor={pal.glow} />
          <stop offset="100%" stopOpacity="0" stopColor={pal.glow} />
        </radialGradient>
        <radialGradient id={`${uid}blush`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff7fae" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ff7fae" stopOpacity="0.15" />
        </radialGradient>
      </defs>

      {/* soft ground glow and shadow */}
      <ellipse cx="100" cy="180" rx="62" ry="9" opacity="0.18" fill={pal.shadow} />
      <circle cx="100" cy="100" r="92" fill={`url(#${uid}glow)`} />

      <g className="placey-body">
        <Behind mode={mode} />
        {/* orbit ring (classic look) */}
        {halo && (
          <ellipse cx="100" cy="118" rx="88" ry="22" fill="none" stroke="#a9d8ff" strokeWidth="3.5" opacity="0.85" transform="rotate(-8 100 118)" />
        )}

        {/* antenna sprouts */}
        <g>
          <path d="M92 36 Q86 24 78 20" fill="none" strokeWidth="3" strokeLinecap="round" stroke={pal.antenna} />
          <circle cx="76" cy="19" r="5" fill="#bfe3ff" stroke="#8fb4f5" strokeWidth="1.5" />
          <path d="M108 36 Q114 22 122 18" fill="none" strokeWidth="3" strokeLinecap="round" stroke={pal.antenna} />
          <circle cx="124" cy="17" r="5" fill="#ffc2e0" stroke="#f08fc0" strokeWidth="1.5" />
        </g>

        {/* cloud skirt */}
        <path
          d="M34 138 Q28 160 52 166 Q60 178 80 172 Q100 182 120 172 Q142 178 150 166 Q174 160 166 138 Q150 150 100 150 Q50 150 34 138Z"
          fill={`url(#${uid}skirt)`}
        />

        {/* body */}
        <path
          d="M100 34 C150 34 176 66 176 104 C176 142 148 160 100 160 C52 160 24 142 24 104 C24 66 50 34 100 34Z"
          fill={`url(#${uid}body)`}
        />
        {/* glossy highlights */}
        <ellipse cx="66" cy="62" rx="22" ry="11" fill="#fff" opacity="0.5" transform="rotate(-28 66 62)" />
        <circle cx="48" cy="84" r="4.5" fill="#fff" opacity="0.55" />
        <path d="M60 148 Q100 158 140 148" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.28" />

        {/* arms */}
        {mode !== "motivated" && (
          <>
            <ellipse cx="30" cy="118" rx="13" ry="10" transform="rotate(20 30 118)" fill={pal.arm} />
            <g className={waving ? "placey-wave-arm" : undefined}>
              <ellipse cx="172" cy="116" rx="13" ry="10" fill={pal.arm} transform={waving ? "rotate(-50 172 116)" : "rotate(-20 172 116)"} />
            </g>
          </>
        )}

        {/* face */}
        <g className="placey-face">
          <Eyes style={f.eyes} look={look} />
          <ellipse cx="60" cy="108" rx="11" ry="7" fill={`url(#${uid}blush)`} />
          <ellipse cx="140" cy="108" rx="11" ry="7" fill={`url(#${uid}blush)`} />
          <Mouth style={f.mouth} />
        </g>

        <Front mode={mode} />
      </g>

      {/* sparkles */}
      {halo && (
        <g className="placey-sparkles">
          <path d="M26 44 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#ffd45e" />
          <path d="M176 150 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill="#ffd45e" />
          <path d="M170 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ff9ccc" />
        </g>
      )}
    </svg>
  );
}

export const PlaceyCharacter = memo(PlaceyCharacterBase);
