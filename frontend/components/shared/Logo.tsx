import { Sparkles } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-on-primary shadow-lg shadow-primary/40"
      >
        <Sparkles className="h-[18px] w-[18px]" />
        <span className="absolute inset-0 rounded-xl ring-1 ring-white/25" />
      </div>
      {!compact && (
        <span className="font-display text-[17px] font-bold tracking-tight">
          ONEstop<span className="text-gradient">Placement</span>
        </span>
      )}
    </div>
  );
}
