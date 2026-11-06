"use client";

import { ChevronRight, FileUp, Info, LayoutTemplate, Palette, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type GuideTarget = "edit" | "customize" | "templates" | "deploy";

const STEPS: { target: GuideTarget; label: string; Icon: LucideIcon }[] = [
  { target: "edit", label: "Upload Resume & Edit Data", Icon: FileUp },
  { target: "customize", label: "Choose Mascots & Customize Themes", Icon: Palette },
  { target: "templates", label: "Pick a Template", Icon: LayoutTemplate },
  { target: "deploy", label: "Scroll to the bottom to 1-Click Deploy to Vercel", Icon: Rocket },
];

/** A short "how to publish" strip for the top of the studio dashboard. Each step jumps to where it is done. */
export function PublishGuide({ onStep }: { onStep: (target: GuideTarget) => void }) {
  return (
    <section aria-labelledby="publish-guide-h" className="rounded-2xl border border-edge-strong bg-surface-2/60 p-4">
      <h2 id="publish-guide-h" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-muted">
        <Info className="h-4 w-4 text-primary" aria-hidden="true" /> How to publish
      </h2>
      <ol className="mt-3 flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-1">
        {STEPS.map(({ target, label, Icon }, i) => (
          <li key={target} className="flex min-w-0 items-center gap-1 lg:flex-1">
            <button
              type="button"
              onClick={() => onStep(target)}
              className="group flex w-full items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left text-sm transition-colors hover:border-edge-strong hover:bg-primary/5 focus-visible:border-primary"
            >
              <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <Icon className="h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-primary" aria-hidden="true" />
              <span className="min-w-0 font-semibold leading-snug">
                <span className="sr-only">Step {i + 1}: </span>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted lg:block" aria-hidden="true" />}
          </li>
        ))}
      </ol>
    </section>
  );
}
