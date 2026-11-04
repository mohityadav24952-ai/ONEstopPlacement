type ProgressRingProps = {
  percent: number;
  size?: number;
  label?: string;
};

/** A circular progress indicator with the value in the middle. */
export function ProgressRing({ percent, size = 96, label = "Progress" }: ProgressRingProps) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--data)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--edge)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <span className="font-display absolute inset-0 flex items-center justify-center text-xl font-bold">
        {value}%
      </span>
    </div>
  );
}
