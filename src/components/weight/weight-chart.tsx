"use client";

import { WeightEntry, WeightMovingAverage } from "@/lib/api/weight";

interface WeightChartProps {
  entries: WeightEntry[];
  movingAverages?: WeightMovingAverage[];
  height?: number;
}

export function WeightChart({ entries, movingAverages = [], height = 140 }: WeightChartProps) {
  if (entries.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No entries in this range
      </div>
    );
  }

  const W = 320;
  const padB = 22;
  const padL = 34;
  const padR = 8;
  const chartW = W - padL - padR;
  const chartH = height - padB;
  const color = "oklch(0.62 0.22 258)";

  const weights = entries.map((e) => e.weight);
  const minVal = Math.min(...weights) - 0.5;
  const maxVal = Math.max(...weights) + 0.5;
  const range = maxVal - minVal || 1;

  const sorted = [...entries].sort((a, b) => a.day.localeCompare(b.day));
  const firstDay = new Date(sorted[0].day).getTime();
  const lastDay = new Date(sorted[sorted.length - 1].day).getTime();
  const totalMs = Math.max(lastDay - firstDay, 1);

  function xOf(day: string) {
    return padL + ((new Date(day).getTime() - firstDay) / totalMs) * chartW;
  }
  function yOf(val: number) {
    return chartH - ((val - minVal) / range) * chartH;
  }

  const pts = sorted.map((e) => ({ x: xOf(e.day), y: yOf(e.weight), e }));

  const linePath = pts.length > 1 ? `M ${pts.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";
  const areaPath =
    pts.length > 1
      ? `M ${padL},${chartH} L ${pts.map((p) => `${p.x},${p.y}`).join(" L ")} L ${pts[pts.length - 1].x},${chartH} Z`
      : "";

  const maFiltered = movingAverages
    .filter((m) => m.seven_day_moving_average !== null)
    .sort((a, b) => a.day.localeCompare(b.day));
  const maPath =
    maFiltered.length > 1
      ? `M ${maFiltered.map((m) => `${xOf(m.day)},${yOf(m.seven_day_moving_average!)}`).join(" L ")}`
      : "";

  // Pick ~4-5 x-axis label entries evenly
  const labelStep = Math.max(1, Math.ceil(sorted.length / 4));
  const labelEntries = sorted.filter((_, i) => i % labelStep === 0 || i === sorted.length - 1);

  // Y-axis ticks
  const yTicks = [0.25, 0.5, 0.75].map((r) => minVal + r * range);

  function fmtDay(day: string) {
    const d = new Date(day);
    return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
  }

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${height}`} fill="none">
      <defs>
        <linearGradient id="wc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={padL}
          y1={chartH * r}
          x2={W - padR}
          y2={chartH * r}
          stroke="oklch(1 0 0 / 6%)"
          strokeWidth="1"
        />
      ))}

      {yTicks.map((tick, i) => (
        <text key={i} x={padL - 3} y={yOf(tick) + 3} textAnchor="end" fontSize="9" fill="oklch(0.55 0 0)">
          {tick.toFixed(1)}
        </text>
      ))}

      {areaPath && <path d={areaPath} fill="url(#wc-area)" />}
      {linePath && (
        <path d={linePath} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {maPath && (
        <path
          d={maPath}
          stroke={`oklch(0.62 0.22 258 / 50%)`}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 3"
        />
      )}

      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}

      {labelEntries.map((e, i) => (
        <text key={i} x={xOf(e.day)} y={height - 4} textAnchor="middle" fontSize="9" fill="oklch(0.55 0 0)">
          {fmtDay(e.day)}
        </text>
      ))}
    </svg>
  );
}
