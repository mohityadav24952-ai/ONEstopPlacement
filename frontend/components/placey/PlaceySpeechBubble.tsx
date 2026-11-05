"use client";

import { X } from "lucide-react";

type Props = {
  text: string;
  onDismiss?: () => void;
  /** Extra control shown under the text, e.g. "Skip intro". */
  footer?: React.ReactNode;
};

/**
 * Placey's speech bubble. Always opens to the LEFT of the character (Placey rests bottom-right),
 * so it stays inside the viewport. `key` the component on the text to replay the pop-in.
 * Uses fixed pastel colours (not theme tokens) because it is part of the character, not the UI chrome.
 */
export function PlaceySpeechBubble({ text, onDismiss, footer }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="placey-bubble pointer-events-auto absolute right-2 top-[96%] z-10 w-max max-w-[min(15rem,calc(100vw-2rem))] rounded-2xl border border-[#d8d6ff] bg-white px-4 py-2.5 text-[13px] font-semibold leading-snug text-[#2b2a5c] shadow-[0_10px_28px_-10px_rgba(70,60,160,0.45)]"
    >
      {text}
      {footer && <div className="mt-1.5">{footer}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss message"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-[#d8d6ff] bg-white text-[#6a68b8] hover:bg-[#f1f0ff]"
        >
          <X className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
      <span aria-hidden="true" className="absolute -top-[7px] right-9 h-3.5 w-3.5 rotate-45 border-l border-t border-[#d8d6ff] bg-white" />
    </div>
  );
}
