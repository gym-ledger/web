"use client";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 40,
  color = "var(--primary)",
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Area under the curve
  const areaD = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={areaD} fill={color} fillOpacity={0.08} />
      <path
        d={pathD}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last point dot */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
}

interface LineChartProps {
  data: { label: string; value: number }[];
  width?: number;
  height?: number;
  color?: string;
  showLabels?: boolean;
}

export function LineChart({
  data,
  width = 300,
  height = 100,
  color = "var(--primary)",
  showLabels = true,
}: LineChartProps) {
  const paddingBottom = showLabels ? 20 : 8;
  const chartHeight = height - paddingBottom;

  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.95;
  const max = Math.max(...values) * 1.02;
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = chartHeight - ((d.value - min) / range) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const areaD = `M 0,${chartHeight} L ${points
    .map((p) => `${p.x},${p.y}`)
    .join(" L ")} L ${width},${chartHeight} Z`;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((ratio) => (
        <line
          key={ratio}
          x1="0"
          y1={chartHeight * ratio}
          x2={width}
          y2={chartHeight * ratio}
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}

      <path d={areaD} fill={color} fillOpacity={0.08} />
      <path
        d={pathD}
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Data points — show first and last */}
      {points
        .filter((_, i) => i === 0 || i === points.length - 1)
        .map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill={color} />
        ))}

      {/* X-axis labels */}
      {showLabels &&
        points
          .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
          .map((p, i, shown) => (
            <text
              key={i}
              x={p.x}
              y={height - 2}
              // The end labels sit on the chart's edges; centred, half of them would be cut off.
              textAnchor={i === 0 ? "start" : i === shown.length - 1 ? "end" : "middle"}
              fontSize="10"
              fontWeight="600"
              fill="var(--muted-foreground)"
            >
              {p.label}
            </text>
          ))}
    </svg>
  );
}

interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export function BarChart({
  data,
  color = "var(--primary)",
  height = 80,
}: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => {
        const barH = (d.value / max) * (height - 20);
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-[4px] transition-all"
              style={{
                height: Math.max(barH, 4),
                background: isLast ? color : "var(--track-primary)",
              }}
            />
            <span className="text-[10px] font-semibold text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
