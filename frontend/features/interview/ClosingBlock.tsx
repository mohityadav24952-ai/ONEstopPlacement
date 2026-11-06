"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

type Quote = { text: string; by?: string };

// Attributions are the ones in wide circulation for each line; check one before you quote it anywhere formal.
const QUOTES: Quote[] = [
  { text: "Talk is cheap. Show me the code.", by: "Linus Torvalds" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", by: "Harold Abelson, SICP" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", by: "Martin Fowler" },
  { text: "Simplicity is prerequisite for reliability.", by: "Edsger W. Dijkstra" },
  { text: "Make it work, make it right, make it fast.", by: "Kent Beck" },
  { text: "The best way to predict the future is to invent it.", by: "Alan Kay" },
  { text: "Every solved problem is a pattern you will recognise faster next time." },
  { text: "A failing test case is not a verdict, it is the next hint." },
  { text: "Consistency beats intensity: one problem a day outruns ten the night before." },
];

/** The last thing on the Interview Prep page: a send-off and a quote that changes every visit. */
export function ClosingBlock() {
  // Picked once when the plan opens (this block only renders after the plan has loaded in the browser).
  const [i, setI] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const q = QUOTES[i];
  return (
    <div className="relative mt-8 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-lavender/15 to-primary/5 p-6 text-center sm:p-8">
      <div aria-hidden="true" className="dotgrid absolute inset-0 text-ink/10" />
      <div className="relative">
        <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" aria-hidden="true" />
        <p className="font-display text-3xl font-extrabold uppercase tracking-[0.12em] text-primary sm:text-4xl">ALL THE BEST!</p>
        <figure className="mx-auto mt-4 max-w-2xl" aria-live="polite">
          <blockquote className="text-base font-medium leading-relaxed sm:text-lg">&ldquo;{q.text}&rdquo;</blockquote>
          {q.by && <figcaption className="mt-1 text-sm text-muted">{q.by}</figcaption>}
        </figure>
        <button type="button" onClick={() => setI((n) => (n + 1) % QUOTES.length)} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-edge-strong px-3 py-1 text-xs font-bold text-muted transition-colors hover:border-primary hover:text-fg">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Another quote
        </button>
      </div>
    </div>
  );
}
