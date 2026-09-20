import { cx } from "@/utils/cx";

export function ProgressCircle({
  value,
  size = 44,
  stroke = 4,
  tone = "primary",
  label,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  tone?: "primary" | "success" | "danger";
  label?: string;
}) {
  const normalized = value === null ? 0 : Math.min(100, Math.max(0, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;
  const toneClass = {
    primary: "text-blue-600",
    success: "text-emerald-600",
    danger: "text-rose-700",
  }[tone];

  return (
    <div
      className={cx("relative shrink-0", toneClass)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : normalized}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.14"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[10px] font-semibold tabular-nums text-slate-700">
        {value === null ? "—" : `${Math.round(normalized)}%`}
      </span>
    </div>
  );
}
