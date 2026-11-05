"use client";

import { Check, Moon, Sun } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { AccentColor, MascotId, PortfolioConfig, PortfolioData, ThemeMode } from "@/types/portfolio";
import { ACCENTS } from "@/features/site-builder/lib/accent";
import { MASCOTS, MascotPreview } from "@/features/site-builder/mascots/MascotWidget";
import { Toggle } from "@/features/site-builder/studio/fields";
import { cn } from "@/lib/cn";

type Props = { data: PortfolioData; onConfig: (partial: Partial<PortfolioConfig>) => Promise<void> };

function Choice({ selected, onClick, children, label }: { selected: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button type="button" aria-pressed={selected} aria-label={label} onClick={onClick}
      className={cn("relative flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all hover:-translate-y-0.5", selected ? "border-primary bg-primary/10 shadow-pop" : "border-edge-strong hover:border-primary/60")}>
      {children}
      {selected && <span aria-hidden="true" className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-on-primary"><Check className="h-3 w-3" /></span>}
    </button>
  );
}

export function CustomizeTab({ data, onConfig }: Props) {
  const c = data.config;
  return (
    <div className="space-y-6">
      <Card accent="cobalt" eyebrow="Default theme" title="Dark or light?" description="Visitors can still flip it themselves. This is what they see first.">
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          {([["dark", "Dark Mode", Moon], ["light", "Light Mode", Sun]] as [ThemeMode, string, typeof Sun][]).map(([id, label, Icon]) => (
            <Choice key={id} selected={c.themeMode === id} label={label} onClick={() => void onConfig({ themeMode: id })}>
              <span className={cn("flex h-14 w-full items-center justify-center rounded-xl border", id === "dark" ? "border-white/10 bg-[#0b0d14] text-white" : "border-black/10 bg-white text-black")}>
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold">{label}</span>
            </Choice>
          ))}
        </div>
      </Card>

      <Card accent="lavender" eyebrow="Interactive mascot" title="Pick a companion" description="A small animated character that follows the visitor's cursor and shares facts from your portfolio.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {MASCOTS.map((m) => (
            <Choice key={m.id} selected={c.mascotId === m.id} label={m.name} onClick={() => void onConfig({ mascotId: m.id as MascotId, showMascot: true })}>
              <MascotPreview id={m.id} size={72} accent={c.accentColor} />
              <span className="text-sm font-bold">{m.name}</span>
              <span className="text-[11px] leading-tight text-muted">{m.blurb}</span>
            </Choice>
          ))}
          <Choice selected={c.mascotId === "none"} label="No mascot" onClick={() => void onConfig({ mascotId: "none" })}>
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-dashed border-edge-strong text-xs text-muted">None</span>
            <span className="text-sm font-bold">No Mascot</span>
          </Choice>
        </div>
      </Card>

      <Card accent="mint" eyebrow="Accent colour" title="Your highlight colour">
        <div role="group" aria-label="Accent colour" className="flex flex-wrap gap-3">
          {(Object.keys(ACCENTS) as AccentColor[]).map((id) => (
            <button key={id} type="button" aria-pressed={c.accentColor === id} onClick={() => void onConfig({ accentColor: id })}
              className={cn("flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-sm font-bold transition-all hover:-translate-y-0.5", c.accentColor === id ? "border-primary bg-primary/10" : "border-edge-strong")}>
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: ACCENTS[id].base }}>
                {c.accentColor === id && <Check className="h-4 w-4" style={{ color: ACCENTS[id].onBase }} />}
              </span>
              {ACCENTS[id].name}
            </button>
          ))}
        </div>
      </Card>

      <Card accent="orange" eyebrow="Sections" title="What to show">
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Coding stats" description="LeetCode, CodeChef, Codeforces and GitHub numbers." checked={c.showCodingStats} onChange={(v) => void onConfig({ showCodingStats: v })} />
          <Toggle label="Mascot" description="Show the animated companion on your page." checked={c.showMascot && c.mascotId !== "none"} onChange={(v) => void onConfig({ showMascot: v, ...(v && c.mascotId === "none" ? { mascotId: "cyber-alien" as MascotId } : {}) })} />
        </div>
      </Card>
    </div>
  );
}
