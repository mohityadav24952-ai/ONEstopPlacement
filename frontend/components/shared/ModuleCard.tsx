import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type ModuleCardProps = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  statusLabel: string;
  className?: string;
  index?: number;
};

/** Each module has its own colour and its own little illustration so the grid never repeats. */
const LOOK: Record<string, { tile: string; ink: string; chip: string; art: "code" | "paper" | "path" | "browser" }> = {
  "/coding": { tile: "bg-cobalt text-white", ink: "text-white", chip: "bg-white/15 text-white", art: "code" },
  "/resume": { tile: "bg-coral/15", ink: "text-ink", chip: "bg-coral text-white", art: "paper" },
  "/prep": { tile: "bg-lavender/20", ink: "text-ink", chip: "bg-lavender text-white", art: "path" },
  "/portfolio": { tile: "bg-mint/20", ink: "text-ink", chip: "bg-mint text-white", art: "browser" },
};

function Art({ kind }: { kind: "code" | "paper" | "path" | "browser" }) {
  if (kind === "code")
    return (
      <div aria-hidden="true" className="pointer-events-none absolute -right-3 bottom-3 hidden w-44 rotate-3 rounded-xl border-2 border-white/30 bg-white/10 p-3 font-mono text-[10px] leading-relaxed text-white/80 sm:block">
        <p><span className="text-orange">const</span> repos = <span className="text-white">await</span> sync();</p>
        <p>repos.<span className="text-orange">map</span>(r =&gt; r.name)</p>
        <p className="text-white/50">{"// every repo, listed"}</p>
      </div>
    );
  if (kind === "paper")
    return (
      <div aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-2 w-24">
        <div className="absolute inset-0 -rotate-6 rounded-md border-2 border-ink bg-surface" />
        <div className="relative rotate-3 rounded-md border-2 border-ink bg-white p-2 shadow-[3px_3px_0_var(--ink)]">
          <div className="mb-1.5 h-2 w-10 rounded-sm bg-ink" />
          {[14, 18, 12, 16].map((w, i) => (
            <div key={i} className="mb-1 h-1 rounded-sm bg-ink/25" style={{ width: `${w * 4}%` }} />
          ))}
          <div className="mt-2 h-4 w-8 rounded-sm bg-coral" />
        </div>
      </div>
    );
  if (kind === "path")
    return (
      <svg aria-hidden="true" viewBox="0 0 120 70" className="pointer-events-none absolute -right-1 bottom-2 w-32">
        <path d="M6 58 C30 58 28 18 54 20 S86 52 112 14" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeDasharray="1 7" strokeLinecap="round" />
        {[[6, 58], [54, 20], [112, 14]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="6" fill={["var(--mint)", "var(--orange)", "var(--coral)"][i]} stroke="var(--ink)" strokeWidth="2.5" />
        ))}
      </svg>
    );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -right-2 bottom-2 w-32 rounded-lg border-2 border-ink bg-white shadow-[3px_3px_0_var(--ink)]">
      <div className="flex gap-1 border-b-2 border-ink px-2 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-coral" />
        <span className="h-1.5 w-1.5 rounded-full bg-orange" />
        <span className="h-1.5 w-1.5 rounded-full bg-mint" />
      </div>
      <div className="space-y-1 p-2">
        <div className="h-2 w-14 rounded-sm bg-ink" />
        <div className="h-1 w-20 rounded-sm bg-ink/25" />
        <div className="grid grid-cols-2 gap-1 pt-1">
          <div className="h-5 rounded-sm bg-cobalt/70" />
          <div className="h-5 rounded-sm bg-orange/70" />
        </div>
      </div>
    </div>
  );
}

export function ModuleCard({ href, title, description, icon: Icon, statusLabel, className, index = 0 }: ModuleCardProps) {
  const look = LOOK[href] ?? LOOK["/coding"];
  const dark = href === "/coding";
  return (
    <Link
      href={href}
      style={{ animationDelay: `${index * 70}ms` }}
      className={cn(
        "animate-in group relative flex min-h-[210px] flex-col overflow-hidden rounded-3xl border-2 border-ink p-6 transition-transform hover:-translate-y-1 hover:shadow-[5px_5px_0_var(--ink)]",
        look.tile,
        className,
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl border-2", dark ? "border-white/40 bg-white/10" : "border-ink bg-surface")}>
          <Icon className={cn("h-5 w-5", look.ink)} aria-hidden="true" />
        </span>
        <span className={cn("rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide", look.chip)}>{statusLabel}</span>
      </div>
      <h3 className={cn("font-display relative mt-6 text-2xl font-bold leading-tight", look.ink)}>{title}</h3>
      <p className={cn("relative mt-1.5 max-w-[16rem] text-sm leading-relaxed", dark ? "text-white/80" : "text-ink/70")}>{description}</p>
      <span className={cn("relative mt-auto inline-flex items-center gap-1 pt-5 text-sm font-bold", look.ink)}>
        Open
        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
      <Art kind={look.art} />
    </Link>
  );
}
