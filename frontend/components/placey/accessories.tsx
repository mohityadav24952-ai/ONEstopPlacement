/**
 * Placey's wardrobe. Each mode is a small set of SVG layers drawn on top of the SAME base body,
 * so the silhouette, face placement and colours stay recognisable in every mode.
 *
 * `Behind` is drawn before the body (hood back, cloud pillow, glow); `Front` after the face.
 * Coordinates share the 200x200 viewBox of PlaceyCharacter. Head top is y~34, eyes y~92.
 */

export type PlaceyMode =
  | "classic"
  | "study"
  | "tech"
  | "motivated"
  | "hacker"
  | "chill"
  | "victory"
  | "resume"
  | "portfolio";

export const MODE_LABEL: Record<PlaceyMode, string> = {
  classic: "Classic Dreamy",
  study: "Study Mode",
  tech: "Tech Explorer",
  motivated: "Motivated Blob",
  hacker: "Hacker Spirit",
  chill: "Chill Mode",
  victory: "Victory Mode",
  resume: "Resume (focused)",
  portfolio: "Portfolio (creative)",
};

/** The seven official modes, in priority order (highest first). */
export const OFFICIAL_MODES: PlaceyMode[] = ["victory", "motivated", "study", "hacker", "tech", "chill", "classic"];

const NAVY = "#25295c";
const NAVY_SOFT = "#3a3f86";
const GOLD = "#ffc83d";
const GOLD_DARK = "#e19a12";

function CodePanel({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} className="placey-drift" opacity="0.9">
      <rect width="34" height="26" rx="4" fill="#cfe2ff" stroke="#8fb4f5" strokeWidth="1.5" />
      <rect x="5" y="6" width="14" height="2.5" rx="1.2" fill="#6f8fe0" />
      <rect x="5" y="12" width="22" height="2.5" rx="1.2" fill="#9db6ec" />
      <rect x="5" y="18" width="10" height="2.5" rx="1.2" fill="#6f8fe0" />
    </g>
  );
}

function Headphones({ glow = "#7de7ff" }: { glow?: string }) {
  return (
    <g>
      <path d="M32 96 Q30 34 100 32 Q170 34 168 96" fill="none" stroke={NAVY} strokeWidth="8" strokeLinecap="round" />
      <rect x="20" y="82" width="20" height="36" rx="10" fill={NAVY} />
      <rect x="160" y="82" width="20" height="36" rx="10" fill={NAVY} />
      <circle cx="30" cy="100" r="5" fill={glow} />
      <circle cx="170" cy="100" r="5" fill={glow} />
    </g>
  );
}

function Laptop({ rocket = false }: { rocket?: boolean }) {
  return (
    <g>
      <path d="M58 150 L66 112 Q67 108 72 108 H128 Q133 108 134 112 L142 150Z" fill={NAVY} stroke="#4c52a8" strokeWidth="2" />
      <path d="M66 146 L72 116 H128 L134 146Z" fill="#161a42" />
      {rocket ? (
        <path d="M100 118 q10 8 6 24 l-6 -5 -6 5 q-4 -16 6 -24z M100 126 a3 3 0 1 0 0.1 0z" fill="#7de7ff" />
      ) : (
        <text x="100" y="138" textAnchor="middle" fontSize="17" fontWeight="700" fill="#7de7ff" fontFamily="monospace">{"</>"}</text>
      )}
      <path d="M50 150 H150 Q152 150 150 154 Q146 160 140 160 H60 Q54 160 50 154 Q48 150 50 150Z" fill="#4c52a8" />
    </g>
  );
}

function Crown() {
  return (
    <g>
      <path d="M66 46 L70 18 L88 34 L100 10 L112 34 L130 18 L134 46Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="66" y="42" width="68" height="9" rx="3" fill={GOLD_DARK} />
      <circle cx="70" cy="18" r="3.5" fill="#ff7aa8" />
      <circle cx="100" cy="10" r="3.5" fill="#7de7ff" />
      <circle cx="130" cy="18" r="3.5" fill="#ff7aa8" />
    </g>
  );
}

function Trophy() {
  return (
    <g transform="translate(150 84)">
      <path d="M6 0 H38 V16 Q38 32 22 34 Q6 32 6 16Z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" />
      <path d="M6 4 Q-6 4 -2 16 Q2 24 8 24 M38 4 Q50 4 46 16 Q42 24 36 24" fill="none" stroke={GOLD_DARK} strokeWidth="3" strokeLinecap="round" />
      <rect x="18" y="34" width="8" height="8" fill={GOLD_DARK} />
      <rect x="10" y="42" width="24" height="7" rx="2" fill="#7a4a12" />
      <path d="M22 8 l2.5 5.5 6 .8 -4.4 4.1 1.1 6 -5.2 -2.9 -5.2 2.9 1.1 -6 -4.4 -4.1 6 -.8z" fill="#fff6c9" />
    </g>
  );
}

const CONFETTI = [
  { x: 24, y: 30, c: "#ff7aa8", r: 20 }, { x: 170, y: 26, c: "#7de7ff", r: -30 }, { x: 48, y: 12, c: "#ffd45e", r: 40 },
  { x: 150, y: 8, c: "#a78bfa", r: 10 }, { x: 186, y: 64, c: "#ff7aa8", r: -20 }, { x: 10, y: 70, c: "#7de7ff", r: 55 },
  { x: 120, y: 2, c: "#ffd45e", r: -45 }, { x: 80, y: 6, c: "#ff9f5a", r: 25 },
];

export function Behind({ mode }: { mode: PlaceyMode }) {
  switch (mode) {
    case "hacker":
      // the hood, behind the head
      return <path d="M100 22 C160 22 192 62 190 112 L190 160 H10 L10 112 C8 62 40 22 100 22Z" fill={NAVY} />;
    case "chill":
      return (
        <g fill="#fdfdff" stroke="#d9dcff" strokeWidth="2">
          <ellipse cx="50" cy="168" rx="38" ry="20" />
          <ellipse cx="100" cy="160" rx="52" ry="26" />
          <ellipse cx="152" cy="168" rx="38" ry="20" />
          <ellipse cx="100" cy="180" rx="84" ry="14" />
        </g>
      );
    case "tech":
      return (
        <g>
          <CodePanel x={150} y={46} rot={8} />
          <CodePanel x={6} y={62} rot={-8} />
        </g>
      );
    default:
      return null;
  }
}

export function Front({ mode }: { mode: PlaceyMode }) {
  switch (mode) {
    case "study":
      return (
        <g>
          {/* graduation cap + tassel */}
          <path d="M72 50 V64 Q100 78 128 64 V50Z" fill={NAVY_SOFT} />
          <path d="M52 44 L100 22 L148 44 L100 66Z" fill={NAVY} stroke="#4c52a8" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="100" cy="44" r="3" fill={GOLD} />
          <path d="M100 44 L142 50 V72" fill="none" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
          <rect x="138" y="70" width="8" height="12" rx="3" fill={GOLD} />
          {/* open book */}
          <path d="M58 126 L100 134 L142 126 V160 L100 166 L58 160Z" fill={NAVY} stroke="#4c52a8" strokeWidth="2" strokeLinejoin="round" />
          <path d="M100 134 V166" stroke="#4c52a8" strokeWidth="2.5" />
          <path d="M66 132 L96 138 V158 L66 153Z M134 132 L104 138 V158 L134 153Z" fill="#eef1ff" />
          <path d="M72 140 L90 143 M72 146 L90 149 M110 143 L128 140 M110 149 L128 146" stroke="#b3bcf0" strokeWidth="2" strokeLinecap="round" />
          {/* idea bulb */}
          <g className="placey-twinkle">
            <circle cx="166" cy="32" r="10" fill="#ffe27a" stroke={GOLD_DARK} strokeWidth="2" />
            <rect x="162" y="41" width="8" height="5" rx="2" fill="#bfa24a" />
            <path d="M166 14 V8 M180 20 L185 15 M152 20 L147 15 M184 34 H190" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </g>
      );
    case "tech":
      return (
        <g>
          <Headphones />
          <Laptop />
        </g>
      );
    case "motivated":
      return (
        <g>
          {/* headband and tails */}
          <path d="M26 80 Q100 58 174 80" fill="none" stroke="#e5303f" strokeWidth="11" strokeLinecap="round" />
          <path d="M26 80 Q10 78 4 92 M26 80 Q12 88 10 102" fill="none" stroke="#e5303f" strokeWidth="7" strokeLinecap="round" />
          <circle cx="100" cy="68" r="3" fill="#fff" opacity="0.6" />
          {/* raised arms + star */}
          <ellipse cx="22" cy="86" rx="12" ry="9.5" fill="#aeb0f6" transform="rotate(-70 22 86)" />
          <ellipse cx="178" cy="86" rx="12" ry="9.5" fill="#aeb0f6" transform="rotate(70 178 86)" />
          <g className="placey-twinkle" transform="translate(184 56)">
            <path d="M0 -16 l4.5 10 11 1.2 -8.3 7.4 2.4 10.8 -9.6 -5.6 -9.6 5.6 2.4 -10.8 -8.3 -7.4 11 -1.2z" fill={GOLD} stroke={GOLD_DARK} strokeWidth="2" strokeLinejoin="round" />
          </g>
          <path d="M14 40 l8 14 M6 58 l12 6 M188 108 l10 6" stroke="#8d8bff" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case "hacker":
      return (
        <g>
          {/* hoodie body and pocket */}
          <path d="M26 142 Q100 128 174 142 L182 190 H18Z" fill={NAVY} />
          <path d="M70 168 H130 L124 186 H76Z" fill={NAVY_SOFT} />
          <path d="M82 138 V156 M118 138 V156" stroke="#c8caff" strokeWidth="3" strokeLinecap="round" />
          {/* hood rim */}
          <path d="M34 90 Q36 44 100 40 Q164 44 166 90" fill="none" stroke={NAVY_SOFT} strokeWidth="9" strokeLinecap="round" />
          {/* pixel sunglasses */}
          <g>
            <rect x="58" y="82" width="38" height="22" rx="3" fill="#11112b" />
            <rect x="104" y="82" width="38" height="22" rx="3" fill="#11112b" />
            <rect x="96" y="86" width="8" height="4" fill="#11112b" />
            <path d="M62 86 h8 v6 h-8z M78 92 h8 v6 h-8z M108 86 h8 v6 h-8z M124 92 h8 v6 h-8z" fill="#e8ebff" />
          </g>
          <g transform="translate(0 6) scale(0.82) translate(22 40)"><Laptop rocket /></g>
          <CodePanel x={152} y={34} rot={10} />
          <CodePanel x={6} y={40} rot={-10} />
        </g>
      );
    case "chill":
      return (
        <g>
          <Headphones glow="#a8b4ff" />
          {/* moon + stars + z */}
          <path d="M30 22 a14 14 0 1 0 14 18 a11 11 0 1 1 -14 -18z" fill="#ffe9a0" />
          <path d="M60 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z M170 24 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ffe9a0" className="placey-twinkle" />
          <g className="placey-zzz" fill="#7c86e8" fontFamily="sans-serif" fontWeight="800">
            <text x="150" y="58" fontSize="16">z</text>
            <text x="164" y="44" fontSize="12">z</text>
            <text x="174" y="32" fontSize="9">z</text>
          </g>
        </g>
      );
    case "victory":
      return (
        <g>
          <Crown />
          <Trophy />
          {CONFETTI.map((c, i) => (
            <rect key={i} x={c.x} y={c.y} width="7" height="12" rx="1.5" fill={c.c} transform={`rotate(${c.r} ${c.x} ${c.y})`} className="placey-confetti" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </g>
      );
    case "resume":
      return (
        <g>
          {/* round glasses */}
          <g fill="none" stroke={NAVY} strokeWidth="3.5">
            <circle cx="78" cy="92" r="15" />
            <circle cx="122" cy="92" r="15" />
            <path d="M93 90 Q100 86 107 90" strokeLinecap="round" />
          </g>
          {/* document held in front */}
          <g transform="rotate(-6 100 140)">
            <rect x="66" y="122" width="50" height="46" rx="4" fill="#fff" stroke="#c9cdfb" strokeWidth="2" />
            <rect x="73" y="130" width="22" height="4" rx="2" fill={NAVY_SOFT} />
            <path d="M73 140 H108 M73 147 H104 M73 154 H98" stroke="#c4c9f3" strokeWidth="3" strokeLinecap="round" />
            <path d="M104 156 l4 4 8 -9" fill="none" stroke="#2fb67e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      );
    case "portfolio":
      return (
        <g>
          {/* creative tablet + palette + star */}
          <g transform="rotate(8 150 130)">
            <rect x="124" y="108" width="50" height="38" rx="6" fill={NAVY} />
            <rect x="129" y="113" width="40" height="28" rx="3" fill="#eef1ff" />
            <circle cx="140" cy="124" r="5" fill="#ff7aa8" />
            <circle cx="152" cy="130" r="5" fill="#7de7ff" />
            <circle cx="160" cy="120" r="4" fill={GOLD} />
          </g>
          <path d="M40 28 q-14 4 -12 18 q2 12 16 12 q6 0 5 -6 q-1 -5 4 -6 q10 -1 8 -12 q-4 -12 -21 -6z" fill="#ffe1b8" stroke="#e1a85f" strokeWidth="2" />
          <circle cx="36" cy="34" r="3" fill="#ff7aa8" />
          <circle cx="46" cy="30" r="3" fill="#7de7ff" />
          <circle cx="54" cy="38" r="3" fill="#a78bfa" />
          <path d="M168 30 l3 7 7 .8 -5.2 4.8 1.4 7 -6.2 -3.6 -6.2 3.6 1.4 -7 -5.2 -4.8 7 -.8z" fill={GOLD} className="placey-twinkle" />
        </g>
      );
    default:
      return null;
  }
}
