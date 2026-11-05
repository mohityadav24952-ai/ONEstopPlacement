type LogoProps = {
  /** Use light text, for the dark sidebar. */
  onDark?: boolean;
  compact?: boolean;
};

export function Logo({ onDark = false, compact = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        aria-hidden="true"
        className="font-display relative flex h-9 w-9 items-center justify-center rounded-[0.7rem] bg-cobalt text-[22px] font-bold leading-none text-white shadow-[2px_2px_0_var(--orange)]"
      >
        1
        <span className="absolute bottom-[7px] right-[7px] h-1.5 w-1.5 rounded-full bg-orange" />
      </div>
      {!compact && (
        <span className={`font-display text-[19px] leading-none tracking-tight ${onDark ? "text-rail-fg" : "text-ink"}`}>
          <span className="font-bold">ONEstop</span>
          <span className="font-normal italic">Placement</span>
        </span>
      )}
    </div>
  );
}
