"use client";

import type { ReactNode } from "react";

export type DockItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  /** External link (already passed through safeHref by the caller). */
  href?: string;
  active?: boolean;
};

/**
 * macOS-style glassmorphic dock. Magnification is pure CSS (hover/focus scales the item and its two
 * neighbours). It is `sticky`, not `fixed`, so it also works inside the Studio's scrolling preview frame.
 */
export function DevOSDock({ items }: { items: DockItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="pointer-events-none sticky bottom-3 z-30 mt-8 flex justify-center px-2 pb-1">
      <nav aria-label="Dock" className="sdo-dock pointer-events-auto flex max-w-full items-end gap-1 rounded-2xl border px-2 pb-2 pt-6 sm:gap-1.5 sm:px-3 max-md:overflow-x-auto">
        {items.map((it) => {
          const inner = (
            <>
              <span className="sdo-tip" aria-hidden="true">{it.label}</span>
              <span className="flex h-5 w-5 items-center justify-center sm:h-6 sm:w-6" aria-hidden="true">{it.icon}</span>
              {it.active && <span className="sdo-dot" aria-hidden="true" />}
            </>
          );
          return it.href ? (
            <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer" aria-label={`${it.label} (opens in a new tab)`} className="sdo-di">
              {inner}
            </a>
          ) : (
            <button key={it.key} type="button" onClick={it.onClick} aria-label={it.label} aria-current={it.active ? "true" : undefined} className="sdo-di">
              {inner}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
