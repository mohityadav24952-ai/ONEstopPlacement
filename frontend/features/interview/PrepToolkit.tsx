import { ExternalLink, Lightbulb, PenTool, Puzzle, Timer, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { title: string; description: string; url: string; icon: LucideIcon };

const GROUPS: { heading: string; items: Item[] }[] = [
  {
    heading: "Mock OA and interview practice",
    items: [{ title: "InterviewBit Practice and Mock", description: "Timed practice problems and mock interviews.", url: "https://www.interviewbit.com/practice/", icon: Timer }],
  },
  {
    heading: "Top DSA sheets",
    items: [
      { title: "Striver's A2Z DSA Sheet", description: "A topic-ordered DSA path from basics to advanced.", url: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/", icon: Puzzle },
      { title: "NeetCode 150", description: "A curated 150-problem list grouped by pattern.", url: "https://neetcode.io/practice", icon: Puzzle },
    ],
  },
  {
    heading: "System design practice",
    items: [{ title: "Excalidraw", description: "A free whiteboard for sketching architecture diagrams.", url: "https://excalidraw.com", icon: PenTool }],
  },
  {
    heading: "Company and salary research",
    items: [{ title: "Levels.fyi", description: "Compensation data and levels by company and role.", url: "https://www.levels.fyi", icon: TrendingUp }],
  },
];

const TIPS = [
  "No LeetCode Premium? Install the 'CrackTheTag' browser extension to unlock company-wise tagged questions for free!",
  "Always research the target company's core values, recent announcements, tech stack, and your specific role expectations before the interview!",
];

/** Static curated links and two pro tips, shown at the very end of an open plan. */
export function PrepToolkit() {
  return (
    <section id="prep-toolkit" aria-labelledby="toolkit-title" className="panel animate-in scroll-mt-24 rounded-2xl p-5 sm:p-6">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-lavender">Sheets, mocks and pro-tips</p>
      <h2 id="toolkit-title" className="font-display text-xl font-semibold leading-snug">Keep practising beyond your plan</h2>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {GROUPS.map((g) => (
          <div key={g.heading}>
            <h3 className="mb-2 text-sm font-bold">{g.heading}</h3>
            <ul className="space-y-2">
              {g.items.map((it) => (
                <li key={it.url}>
                  <a href={it.url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 rounded-xl border border-edge p-3 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/5">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><it.icon className="h-4 w-4" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug">{it.title}</span>
                      <span className="block text-xs leading-snug text-muted">{it.description}</span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted group-hover:text-primary" aria-label="Opens in a new tab" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {TIPS.map((t, i) => (
          <li key={i} className="flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm leading-snug">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden="true" />
            <span><span className="font-bold">Pro-tip {i + 1}: </span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
