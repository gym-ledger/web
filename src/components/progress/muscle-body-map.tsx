"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { BodyChart, ViewSide, INTENSITY_COLORS, type BodyState, type MuscleId } from "body-muscles";
import { fetchMuscleSignals, type MuscleSignal } from "@/lib/api/muscleSignals";
import { buildBodyState, findPercentForLibraryId, type SignalMode } from "@/lib/muscle-body-map-adapter";
import "@/lib/muscle-body-map-labels";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

function BodyChartView({
  view,
  bodyState,
  onMuscleClick,
}: {
  view: ViewSide;
  bodyState: BodyState;
  onMuscleClick: (id: MuscleId, name: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<BodyChart | null>(null);
  const onMuscleClickRef = useRef(onMuscleClick);
  useEffect(() => {
    onMuscleClickRef.current = onMuscleClick;
  }, [onMuscleClick]);

  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = new BodyChart(containerRef.current, {
      view,
      bodyState,
      onMuscleClick: (id, name) => onMuscleClickRef.current(id, name),
    });
    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // Constructed once on mount; `view` never changes for a given instance
    // (front/back are two separate BodyChartView usages) and state updates
    // flow through the `.update()` effect below instead of a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartRef.current?.update({ bodyState });
  }, [bodyState]);

  return <div ref={containerRef} />;
}

const MODES: { value: SignalMode; label: string }[] = [
  { value: "training", label: "Training" },
  { value: "fatigue", label: "Fatigue" },
];

export function MuscleBodyMap() {
  const [signals, setSignals] = useState<MuscleSignal[]>([]);
  const [mode, setMode] = useState<SignalMode>("training");
  const [selected, setSelected] = useState<{ name: string; percent: number } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const res = await fetchMuscleSignals();
        if (cancelled) return;
        setSignals(res);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load muscle signals");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const bodyState = useMemo(() => buildBodyState(signals, mode), [signals, mode]);
  const hasAnySignal = Object.values(bodyState).some((s) => (s?.intensity ?? 0) > 0);

  function handleMuscleClick(id: MuscleId) {
    setSelected(findPercentForLibraryId(signals, mode, id));
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-card p-4 border border-border">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="label-caps">Muscle map</h3>
        <div className="flex items-center rounded-full border border-input bg-background p-1">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => {
                setMode(m.value);
                setSelected(null);
              }}
              className={cn(
                "min-h-8 rounded-full px-3 text-xs font-bold transition-colors",
                mode === m.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {isPending && signals.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1">
            <BodyChartView view={ViewSide.FRONT} bodyState={bodyState} onMuscleClick={handleMuscleClick} />
            <BodyChartView view={ViewSide.BACK} bodyState={bodyState} onMuscleClick={handleMuscleClick} />
          </div>

          <div className="mt-2 flex min-h-9 items-center justify-center rounded-xl bg-background px-3 text-center text-[13px] text-muted-foreground">
            {selected
              ? `${selected.name} — ${Math.round(selected.percent)}% ${mode}`
              : hasAnySignal
                ? "Tap a muscle for its exact %"
                : "No sets logged yet — log a workout to light this up"}
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {Object.values(INTENSITY_COLORS).map((color, i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: color }} />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Low</span>
            <span>High</span>
          </div>
        </>
      )}
    </div>
  );
}
