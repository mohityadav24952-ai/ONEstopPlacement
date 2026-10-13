export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-ai font-display text-sm font-bold text-app"
      >
        1
      </div>
      <span className="font-display text-base font-semibold tracking-tight">
        ONEstop<span className="text-data">Placement</span>
      </span>
    </div>
  );
}
