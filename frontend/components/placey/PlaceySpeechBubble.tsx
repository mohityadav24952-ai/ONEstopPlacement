"use client";

import { X } from "lucide-react";
import type { PlaceyMode } from "@/components/placey/accessories";
import { moodFor } from "@/components/placey/quotes";
import type { QuoteMood } from "@/components/placey/quotes";

type Look = {
  badge: string;
  bg: string;
  tail: string;
  border: string;
  text: string;
  font?: string;
  weight: number;
  anim: "pop" | "bounce" | "soft";
  shadow: string;
};

/**
 * One bubble shape, seven moods. Colours are fixed (not theme tokens) because the bubble is part
 * of the character: it should look like Placey in every app theme.
 */
const LOOK: Record<QuoteMood, Look> = {
  classic: { badge: "✨", bg: "linear-gradient(160deg,#ffffff,#f1eeff)", tail: "#f1eeff", border: "#d3cfff", text: "#2b2a5c", weight: 600, anim: "pop", shadow: "rgba(110,95,220,0.40)" },
  study: { badge: "📚", bg: "linear-gradient(160deg,#ffffff,#e9f8ee)", tail: "#e9f8ee", border: "#b5e3c3", text: "#1f4d34", weight: 600, anim: "pop", shadow: "rgba(50,150,90,0.35)" },
  techExplorer: { badge: "💻", bg: "linear-gradient(160deg,#ffffff,#fff0e1)", tail: "#fff0e1", border: "#ffcf9f", text: "#5a2d0c", weight: 600, anim: "pop", shadow: "rgba(230,130,40,0.35)" },
  motivated: { badge: "🔥", bg: "linear-gradient(160deg,#fff7f8,#ffe1e8)", tail: "#ffe1e8", border: "#ff8fa6", text: "#86102d", weight: 800, anim: "bounce", shadow: "rgba(230,50,90,0.40)" },
  hacker: { badge: "😎", bg: "linear-gradient(160deg,#1a1d4a,#10122f)", tail: "#10122f", border: "#5b5fd6", text: "#b6f5c8", font: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", weight: 600, anim: "pop", shadow: "rgba(30,30,120,0.55)" },
  chill: { badge: "☁️", bg: "linear-gradient(160deg,#ffffff,#e6efff)", tail: "#e6efff", border: "#c7d8ff", text: "#38487f", weight: 500, anim: "soft", shadow: "rgba(90,120,220,0.30)" },
  victory: { badge: "👑", bg: "linear-gradient(160deg,#fffbe6,#ffe8b0)", tail: "#ffe8b0", border: "#eeb02a", text: "#6a4300", weight: 800, anim: "bounce", shadow: "rgba(220,150,20,0.45)" },
};

type Props = {
  text: string;
  mode?: PlaceyMode;
  onDismiss?: () => void;
  /** Extra control shown under the text, e.g. "Skip intro". */
  footer?: React.ReactNode;
  /** Render in normal flow (previews), instead of anchored under Placey. */
  inline?: boolean;
};

/**
 * Placey's speech bubble. It opens to the UPPER-RIGHT of the character (Placey rests at the top-left of the bar). `key` the component on the text to replay the pop-in.
 */
export function PlaceySpeechBubble({ text, mode = "classic", onDismiss, footer, inline = false }: Props) {
  const look = LOOK[moodFor(mode)];
  const anim = look.anim === "bounce" ? "placey-bubble-bounce" : look.anim === "soft" ? "placey-bubble-soft" : "placey-bubble";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${anim} pointer-events-auto ${inline ? "relative inline-block" : "absolute left-[calc(100%+0.5rem)] top-0 z-10"} w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-2xl border px-4 py-2.5 pl-5 text-[13.5px] leading-snug sm:text-sm`}
      style={{
        background: look.bg,
        borderColor: look.border,
        color: look.text,
        fontFamily: look.font,
        fontWeight: look.weight,
        boxShadow: `0 12px 28px -12px ${look.shadow}`,
      }}
    >
      <span
        aria-hidden="true"
        className="absolute -left-2.5 -top-2.5 flex h-6 w-6 items-center justify-center rounded-full border bg-white text-[13px] shadow-sm"
        style={{ borderColor: look.border }}
      >
        {look.badge}
      </span>
      {text}
      {footer && <div className="mt-1.5">{footer}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border bg-white text-[#6a68b8] hover:bg-[#f1f0ff]"
          style={{ borderColor: look.border }}
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
      {!inline && (
        <span
          aria-hidden="true"
          className="absolute -left-[7px] top-5 h-3.5 w-3.5 -rotate-45 border-b border-l"
          style={{ background: look.tail, borderColor: look.border }}
        />
      )}
    </div>
  );
}
