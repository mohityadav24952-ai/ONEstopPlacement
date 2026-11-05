import { GraduationCap } from "lucide-react";

type LogoProps = {
  /** Kept for existing call sites; the sidebar now follows the theme, so it has no effect. */
  onDark?: boolean;
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shadow-card">
        <GraduationCap className="h-5 w-5" />
      </span>
      {!compact && (
        <span className="text-[16px] leading-none tracking-tight">
          <span className="font-bold">ONEstop</span>
          <span className="font-semibold text-primary">Placement</span>
        </span>
      )}
    </div>
  );
}
