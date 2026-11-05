"use client";

import type { PortfolioData } from "@/types/portfolio";
import { TemplateRenderer } from "@/features/site-builder/templates";

/** The standalone public site: the chosen template, no dashboard chrome. Templates carry their own
 *  light/dark toggle, resume button and mascot. */
export function PublicPortfolio({ data, sample = false }: { data: PortfolioData; sample?: boolean }) {
  return (
    <div className="min-h-screen">
      {sample && (
        <p role="note" className="bg-amber-300 px-4 py-1.5 text-center text-xs font-semibold text-black">
          Sample portfolio with example data, not a real person&apos;s verified record.
        </p>
      )}
      <TemplateRenderer data={data} />
      <footer className="bg-black/90 px-4 py-3 text-center text-xs text-white/70">
        Powered by <span className="font-semibold text-white">ONEstopPlacement AI</span>
      </footer>
    </div>
  );
}
