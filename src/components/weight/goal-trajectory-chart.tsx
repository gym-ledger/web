"use client";

import { useRef, useState } from "react";
import type { WeightEntry, WeightMovingAverage } from "@/lib/api/weight";
import type { WeightGoal } from "@/lib/api/profile";

const DAY_MS = 86_400_000;
const dayNum = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS;
const isoOf = (n: number) => new Date(Math.round(n) * DAY_MS).toISOString().slice(0, 10);

function fmt(w: number) {
  return w % 1 === 0 ? `${w}` : w.toFixed(1);
}

function fmtDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const PLAN = "var(--muted-foreground)";
const TREND = "var(--primary)";
const DOTS = "var(--subtle)";

/**
 * Plan vs reality for the active goal: the straight-line plan from the start
 * weight to the target (dashed), each weigh-in (dots), the 7-day trend
 * (solid), and where that trend is heading (dotted). One weight axis.
 */
export function GoalTrajectoryChart({
  goal,
  entries,
  averages,
  today,
  units,
  height = 180,
}: {
  goal: WeightGoal;
  entries: WeightEntry[];
  averages: WeightMovingAverage[];
  today: string;
  units: string;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  if (goal.start_weight == null) return null;
  const startWeight = goal.start_weight;

  const W = 320;
  const padL = 34;
  const padR = 40; // room for the end labels
  const padT = 10;
  const axisH = 20;
  const plotH = height - axisH - padT;
  const plotW = W - padL - padR;

  const x0 = dayNum(goal.start_date);
  const tToday = dayNum(today);
  const x1 = Math.max(goal.goal_date ? dayNum(goal.goal_date) : tToday, tToday, x0 + 14);

  // Plan weight on a given day (straight line; flat for maintain).
  const planAt = (d: number) => {
    if (goal.target_weight == null || !goal.goal_date) return startWeight;
    const end = dayNum(goal.goal_date);
    const t = Math.min(1, Math.max(0, (d - x0) / Math.max(1, end - x0)));
    return startWeight + (goal.target_weight - startWeight) * t;
  };

  const trend = averages
    .filter((a) => a.seven_day_moving_average != null && a.day >= goal.start_date)
    .map((a) => ({ d: dayNum(a.day), w: a.seven_day_moving_average as number }))
    .sort((a, b) => a.d - b.d);
  const dots = entries.filter((e) => e.day >= goal.start_date).map((e) => ({ d: dayNum(e.day), w: e.weight }));

  // Projection: from the latest trend point at the measured weekly rate,
  // stopping at the target if it gets there inside the chart.
  const slope = goal.trajectory.actual_weekly_change;
  const last = trend[trend.length - 1] ?? null;
  let projection: { d: number; w: number }[] = [];
  if (last && slope != null && slope !== 0 && last.d < x1) {
    let endD = x1;
    if (goal.trajectory.projected_date) endD = Math.min(endD, dayNum(goal.trajectory.projected_date));
    let endW = last.w + (slope / 7) * (endD - last.d);
    if (goal.target_weight != null && goal.trajectory.projected_date && endD === dayNum(goal.trajectory.projected_date)) {
      endW = goal.target_weight;
    }
    projection = [last, { d: endD, w: endW }];
  }

  const values = [
    startWeight,
    goal.target_weight ?? startWeight,
    ...dots.map((p) => p.w),
    ...trend.map((p) => p.w),
    ...projection.map((p) => p.w),
  ];
  let minV = Math.min(...values);
  let maxV = Math.max(...values);
  const pad = Math.max(0.5, (maxV - minV) * 0.08);
  minV -= pad;
  maxV += pad;
  const range = maxV - minV || 1;

  const xOf = (d: number) => padL + ((d - x0) / (x1 - x0)) * plotW;
  const yOf = (w: number) => padT + plotH - ((w - minV) / range) * plotH;
  const path = (pts: { d: number; w: number }[]) =>
    pts.length > 1 ? `M ${pts.map((p) => `${xOf(p.d).toFixed(1)},${yOf(p.w).toFixed(1)}`).join(" L ")}` : "";

  const planEnd = goal.goal_date ? dayNum(goal.goal_date) : x1;
  const planPts = [
    { d: x0, w: startWeight },
    { d: planEnd, w: planAt(planEnd) },
  ];

  const yTicks = [0.2, 0.5, 0.8].map((r) => minV + r * range);
  const xTicks = [x0, (x0 + x1) / 2, x1];

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const vx = ((e.clientX - rect.left) / rect.width) * W;
    const d = Math.round(x0 + ((vx - padL) / plotW) * (x1 - x0));
    setHoverDay(Math.min(x1, Math.max(x0, d)));
  }

  const hover = hoverDay == null
    ? null
    : {
        d: hoverDay,
        plan: planAt(hoverDay),
        weighIn: dots.find((p) => p.d === hoverDay)?.w ?? null,
        trend: trend.find((p) => p.d === hoverDay)?.w ?? null,
      };

  const lastPlanLabelY = yOf(planPts[1].w);
  const trendLabelY = last ? yOf(last.w) : null;
  // Keep the two end labels from sitting on top of each other.
  const labelsCollide = trendLabelY != null && Math.abs(trendLabelY - lastPlanLabelY) < 11 && last && xOf(last.d) > W - padR - 30;

  const summary = `Plan from ${fmt(startWeight)} ${units}${goal.target_weight != null ? ` to ${fmt(goal.target_weight)} ${units}` : ""}${
    last ? `; trend now ${fmt(Math.round(last.w * 10) / 10)} ${units}` : ""
  }.`;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${height}`}
        fill="none"
        role="img"
        aria-label={summary}
        className="touch-pan-y select-none"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHoverDay(null)}
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line x1={padL} x2={W - padR} y1={yOf(tick)} y2={yOf(tick)} stroke="var(--line)" strokeWidth="1" />
            <text x={padL - 4} y={yOf(tick) + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">
              {tick.toFixed(1)}
            </text>
          </g>
        ))}

        {xTicks.map((d, i) => (
          <text
            key={d}
            x={xOf(d)}
            y={height - 5}
            textAnchor={i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"}
            fontSize="9"
            fill="var(--muted-foreground)"
          >
            {fmtDay(isoOf(d))}
          </text>
        ))}

        {/* Today */}
        {tToday > x0 && tToday < x1 && (
          <g>
            <line x1={xOf(tToday)} x2={xOf(tToday)} y1={padT} y2={padT + plotH} stroke="var(--input)" strokeWidth="1" />
            <text x={xOf(tToday)} y={padT - 2} textAnchor="middle" fontSize="8" fill="var(--subtle)">
              TODAY
            </text>
          </g>
        )}

        <path d={path(planPts)} stroke={PLAN} strokeWidth="1.5" strokeDasharray="5 4" strokeLinecap="round" />

        {dots.map((p) => (
          <circle key={p.d} cx={xOf(p.d)} cy={yOf(p.w)} r="2.25" fill={DOTS} />
        ))}

        {projection.length > 1 && (
          <path d={path(projection)} stroke={TREND} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="1.5 3.5" strokeLinecap="round" />
        )}
        <path d={path(trend)} stroke={TREND} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {last && <circle cx={xOf(last.d)} cy={yOf(last.w)} r="3.5" fill={TREND} stroke="var(--card)" strokeWidth="2" />}

        {/* Direct labels at the line ends */}
        <text x={W - padR + 4} y={lastPlanLabelY + 3} fontSize="9" fontWeight="600" fill="var(--muted-foreground)">
          {goal.target_weight != null ? fmt(goal.target_weight) : "Plan"}
        </text>
        {last && trendLabelY != null && !labelsCollide && xOf(last.d) > W - padR - 30 && (
          <text x={W - padR + 4} y={trendLabelY + 3} fontSize="9" fontWeight="600" fill="var(--foreground)">
            {fmt(Math.round(last.w * 10) / 10)}
          </text>
        )}

        {hover && (
          <line x1={xOf(hover.d)} x2={xOf(hover.d)} y1={padT} y2={padT + plotH} stroke="var(--foreground)" strokeOpacity="0.35" strokeWidth="1" />
        )}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute top-0 z-10 min-w-[128px] rounded-xl border border-border bg-background/95 px-3 py-2 text-[12px] shadow-lg"
          style={{
            left: `${(xOf(hover.d) / W) * 100}%`,
            transform: xOf(hover.d) > W / 2 ? "translateX(calc(-100% - 8px))" : "translateX(8px)",
          }}
        >
          <p className="mb-1 text-[11px] text-muted-foreground">{fmtDay(isoOf(hover.d))}</p>
          {hover.weighIn != null && <TooltipRow kind="dot" label="Weigh-in" value={`${fmt(hover.weighIn)} ${units}`} />}
          {hover.trend != null && <TooltipRow kind="solid" label="Trend" value={`${fmt(Math.round(hover.trend * 10) / 10)} ${units}`} />}
          <TooltipRow kind="dashed" label="Plan" value={`${fmt(Math.round(hover.plan * 10) / 10)} ${units}`} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <LegendKey kind="dashed" label="Plan" />
        <LegendKey kind="solid" label="7-day trend" />
        <LegendKey kind="dot" label="Weigh-ins" />
        {projection.length > 1 && <LegendKey kind="dotted" label="Heading" />}
      </div>
    </div>
  );
}

type KeyKind = "solid" | "dashed" | "dotted" | "dot";

function Key({ kind }: { kind: KeyKind }) {
  if (kind === "dot") {
    return (
      <svg width="16" height="8" aria-hidden>
        <circle cx="8" cy="4" r="2.5" fill={DOTS} />
      </svg>
    );
  }
  return (
    <svg width="18" height="4" aria-hidden>
      <line
        x1="1"
        y1="2"
        x2="17"
        y2="2"
        stroke={kind === "dashed" ? PLAN : TREND}
        strokeOpacity={kind === "dotted" ? 0.6 : 1}
        strokeWidth={kind === "solid" ? 2 : 1.5}
        strokeDasharray={kind === "dashed" ? "5 4" : kind === "dotted" ? "1.5 3.5" : undefined}
        strokeLinecap="round"
      />
    </svg>
  );
}

function LegendKey({ kind, label }: { kind: KeyKind; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Key kind={kind} />
      {label}
    </span>
  );
}

function TooltipRow({ kind, label, value }: { kind: KeyKind; label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <Key kind={kind} />
        {label}
      </span>
      <span className="num text-[13px] text-foreground">{value}</span>
    </p>
  );
}
