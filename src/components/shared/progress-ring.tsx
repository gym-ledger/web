import { cn } from "@/lib/utils";

type RingTone = "primary" | "success" | "warning" | "neutral";

const TONES: Record<RingTone, { track: string; bar: string }> = {
  primary: { track: "var(--track-primary)", bar: "var(--primary)" },
  success: { track: "var(--track-success)", bar: "var(--success)" },
  warning: { track: "var(--track-warning)", bar: "var(--warning)" },
  neutral: { track: "var(--secondary)", bar: "var(--muted-foreground)" },
};

interface ProgressRingProps {
  /** 0–1; clamped. */
  value: number;
  size?: number;
  stroke?: number;
  tone?: RingTone;
  /** Accessible description, e.g. "3 of 5 sessions done". Omit when a parent control already labels it. */
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

/** Circular gauge — the core data shape of the Performance Dark system. Content sits centred inside. */
export function ProgressRing({
  value,
  size = 96,
  stroke = 7,
  tone = "primary",
  label,
  className,
  children,
}: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));
  const colors = TONES[tone];

  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colors.track} strokeWidth={stroke} />
        {clamped > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors.bar}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${circumference * clamped} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-[stroke-dasharray] duration-700 ease-out"
          />
        )}
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      )}
    </div>
  );
}
