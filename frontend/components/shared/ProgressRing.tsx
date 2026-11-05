type ProgressRingProps = {
  percent: number;
  size?: number;
  label?: string;
  /** CSS colour for the progress arc. */
  color?: string;
};

/** A circular progress indicator with the value in the middle. */
export function ProgressRing({ percent, size = 96, label = "Progress", color = "var(--primary)" }: ProgressRingProps) {
  const stroke = Math.max(8, Math.round(size / 10));
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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink)" strokeOpacity="0.1" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <span
        className="font-num absolute inset-0 flex items-center justify-center font-bold"
        style={{ fontSize: Math.round(size / 4) }}
      >
        {value}
        <span className="text-[0.55em] font-semibold text-muted">%</span>
      </span>
    </div>
  );
}
