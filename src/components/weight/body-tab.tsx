"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Minus,
  SlidersHorizontal,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useCachedQuery } from "@/lib/offline/useCachedQuery";
import { WeightChart } from "@/components/weight/weight-chart";
import { NewEntryDrawer } from "@/components/weight/new-entry-drawer";
import { EditEntryDrawer } from "@/components/weight/edit-entry-drawer";
import { WeightGoalCard } from "@/components/weight/weight-goal-card";
import {
  WeightEntry,
  WeightMovingAverage,
  WeightView,
  fetchWeightForDate,
  fetchWeightRange,
} from "@/lib/api/weight";

// ── localStorage helpers ──────────────────────────────────────────────────────
const VIEWS_KEY = "weight_views_v1";

function loadViews(): WeightView[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(VIEWS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveViews(views: WeightView[]) {
  localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function fmtDay(day: string) {
  const d = new Date(day);
  return d.toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric" });
}

function fmtWeight(w: number) {
  return w % 1 === 0 ? `${w}` : w.toFixed(1);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const abs = Math.abs(delta).toFixed(1);
  if (Math.abs(delta) < 0.05) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium bg-secondary text-muted-foreground rounded-md px-1.5 py-0.5">
        <Minus className="size-3" /> 0 kg
      </span>
    );
  }
  if (delta < 0)
    return (
      <span className="flex items-center gap-0.5 text-xs font-medium bg-success-surface text-success rounded-md px-1.5 py-0.5">
        <TrendingDown className="size-3" /> {abs} kg
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium bg-warning-surface text-warning rounded-md px-1.5 py-0.5">
      <TrendingUp className="size-3" /> {abs} kg
    </span>
  );
}

// ── Save view drawer ──────────────────────────────────────────────────────────
interface SaveViewDrawerProps {
  defaultFrom: string;
  defaultTo: string;
  onSave: (view: WeightView) => void;
  onClose: () => void;
}

function SaveViewForm({ defaultFrom, defaultTo, onSave, onClose }: SaveViewDrawerProps) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [toType, setToType] = useState<"date" | "now">("now");
  const [toDate, setToDate] = useState(defaultTo);

  function handleSave() {
    if (!name.trim()) {
      toast.error("Enter a name for this view");
      return;
    }
    const view: WeightView = {
      id: `v_${Date.now()}`,
      name: name.trim(),
      from,
      to: toType === "now" ? "now" : toDate,
    };
    onSave(view);
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-2">
      <div className="flex flex-col gap-1.5">
        <label className="label-caps">View name</label>
        <input
          type="text"
          placeholder="e.g. Cut phase"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label-caps">From</label>
        <input
          type="date"
          value={from}
          max={todayISO()}
          onChange={(e) => setFrom(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="label-caps">To</label>
        <div className="flex gap-2">
          <button
            onClick={() => setToType("now")}
            className={`flex-1 h-11 rounded-xl border text-sm font-medium transition-colors ${
              toType === "now"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background text-muted-foreground"
            }`}
          >
            Now
          </button>
          <button
            onClick={() => setToType("date")}
            className={`flex-1 h-11 rounded-xl border text-sm font-medium transition-colors ${
              toType === "date"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background text-muted-foreground"
            }`}
          >
            Pick date
          </button>
        </div>
        {toType === "date" && (
          <input
            type="date"
            value={toDate}
            min={from}
            max={todayISO()}
            onChange={(e) => setToDate(e.target.value)}
            className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
          />
        )}
      </div>

      <div className="flex gap-2 pb-2">
        <button
          onClick={onClose}
          className="flex-1 h-11 rounded-xl border border-input text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 h-11 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Save view
        </button>
      </div>
    </div>
  );
}

// ── Main body tab ─────────────────────────────────────────────────────────────
type ActiveView =
  | { type: "default" }
  | { type: "custom"; from: string; to: string }
  | { type: "saved"; view: WeightView };

export function BodyTab() {
  const [activeView, setActiveView] = useState<ActiveView>({ type: "default" });
  const [savedViews, setSavedViews] = useState<WeightView[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [customFrom, setCustomFrom] = useState(daysAgoISO(30));
  const [customTo, setCustomTo] = useState(todayISO());


  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  // Bumped after a weigh-in changes, so the goal card reloads too.
  const [entriesVersion, setEntriesVersion] = useState(0);

  function handleEntriesChanged() {
    void weightQuery.refresh();
    setEntriesVersion((v) => v + 1);
  }

  useEffect(() => {
    setSavedViews(loadViews());
  }, []);

  // Each view resolves to a date range; that range is the saved key, so
  // switching back to a view already seen shows instantly.
  const range =
    activeView.type === "default"
      ? { kind: "day" as const, date: todayISO() }
      : activeView.type === "custom"
        ? { kind: "range" as const, from: activeView.from, to: activeView.to }
        : {
            kind: "range" as const,
            from: activeView.view.from,
            to: activeView.view.to === "now" ? todayISO() : activeView.view.to,
          };
  const weightQuery = useCachedQuery<{ entries: WeightEntry[]; averages: WeightMovingAverage[] }>(
    range.kind === "day" ? `body/day/${range.date}` : `body/range/${range.from}/${range.to}`,
    async () => {
      try {
        const data =
          range.kind === "day" ? await fetchWeightForDate(range.date) : await fetchWeightRange(range.from, range.to);
        return {
          entries: [...(data?.weight_entries ?? [])].sort((a, b) => a.day.localeCompare(b.day)),
          averages: data?.weight_moving_averages ?? [],
        };
      } catch (err) {
        toast.error("Failed to load weight data");
        throw err;
      }
    },
  );
  const entries = weightQuery.data?.entries ?? [];
  const averages = weightQuery.data?.averages ?? [];
  const loading = weightQuery.loading;

  function handleSaveView(view: WeightView) {
    const updated = [...savedViews, view];
    setSavedViews(updated);
    saveViews(updated);
    setShowSaveForm(false);
    setActiveView({ type: "saved", view });
    toast.success(`View "${view.name}" saved`);
  }

  function handleDeleteView(id: string) {
    const updated = savedViews.filter((v) => v.id !== id);
    setSavedViews(updated);
    saveViews(updated);
    if (activeView.type === "saved" && activeView.view.id === id) {
      setActiveView({ type: "default" });
    }
  }

  function applyCustom() {
    if (!customFrom || !customTo || customFrom > customTo) {
      toast.error("Select a valid date range");
      return;
    }
    setActiveView({ type: "custom", from: customFrom, to: customTo });
    setShowCustom(false);
  }

  const latest = entries[entries.length - 1] ?? null;
  const oldest = entries[0] ?? null;
  const totalDelta = latest && oldest && latest.id !== oldest.id
    ? latest.weight - oldest.weight
    : null;

  // Visible range label
  function rangeLabel(): string {
    if (activeView.type === "default") return "Last 30 days";
    if (activeView.type === "custom") return `${activeView.from} → ${activeView.to}`;
    const v = activeView.view;
    return `${v.from} → ${v.to === "now" ? "now" : v.to}`;
  }

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="label-caps">{rangeLabel()}</p>
          <h2 className="font-display text-2xl leading-tight font-bold">Body weight</h2>
        </div>
        <button
          onClick={() => setShowNewEntry(true)}
          className="flex h-10 items-center gap-1.5 rounded-full bg-foreground px-4 text-[13px] font-bold text-background transition-colors hover:bg-foreground/90"
        >
          <Plus className="size-3.5" /> Log entry
        </button>
      </div>

      <WeightGoalCard refreshKey={entriesVersion} />

      {/* View selector */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 scrollbar-none">
        {/* Default chip */}
        <button
          onClick={() => { setActiveView({ type: "default" }); setShowCustom(false); }}
          className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold transition-colors ${
            activeView.type === "default"
              ? "border-foreground bg-foreground text-background"
              : "border-input bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          Last 30 days
        </button>

        {/* Saved view chips */}
        {savedViews.map((v) => (
          <div key={v.id} className="relative shrink-0 flex items-center">
            <button
              onClick={() => { setActiveView({ type: "saved", view: v }); setShowCustom(false); }}
              className={`min-h-9 rounded-full border pr-8 pl-3 text-xs font-semibold transition-colors ${
                activeView.type === "saved" && activeView.view.id === v.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-input bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.name}
            </button>
            <button
              onClick={() => handleDeleteView(v.id)}
              aria-label={`Delete view ${v.name}`}
              className="absolute right-1 flex size-7 items-center justify-center rounded-full opacity-60 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {/* Custom chip */}
        <button
          onClick={() => setShowCustom((s) => !s)}
          className={`flex min-h-9 shrink-0 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-colors ${
            showCustom || activeView.type === "custom"
              ? "border-foreground bg-card text-foreground"
              : "border-input bg-card text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="size-3" /> Custom
        </button>

        {/* Save view */}
        <button
          onClick={() => setShowSaveForm((s) => !s)}
          className="flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-dashed border-input px-3 text-xs font-semibold text-primary transition-colors"
        >
          <Plus className="size-3" /> Save view
        </button>
      </div>

      {/* Custom range picker */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card p-4 border border-border flex flex-col gap-3"
        >
          <p className="text-sm font-semibold text-foreground">Custom range</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="label-caps">From</label>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label-caps">To</label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayISO()}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>
          <button
            onClick={applyCustom}
            className="h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Apply
          </button>
        </motion.div>
      )}

      {/* Save view form */}
      {showSaveForm && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card p-4 border border-border"
        >
          <p className="text-sm font-semibold text-foreground mb-3">Save current view</p>
          <SaveViewForm
            defaultFrom={
              activeView.type === "default"
                ? daysAgoISO(30)
                : activeView.type === "custom"
                ? activeView.from
                : activeView.view.from
            }
            defaultTo={
              activeView.type === "default"
                ? todayISO()
                : activeView.type === "custom"
                ? activeView.to
                : activeView.view.to === "now"
                ? todayISO()
                : activeView.view.to
            }
            onSave={handleSaveView}
            onClose={() => setShowSaveForm(false)}
          />
        </motion.div>
      )}

      {/* Stats + chart */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-card p-4 border border-border"
      >
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-4">
              <div>
                {latest ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="num text-[40px]">
                        {fmtWeight(latest.weight)}
                      </span>
                      <span className="text-sm text-muted-foreground">kg</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{fmtDay(latest.day)}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No entries</p>
                )}
              </div>
              {totalDelta !== null && (
                <div className="text-right">
                  <p className="label-caps mb-1 text-[10px]">Change</p>
                  <DeltaChip delta={totalDelta} />
                </div>
              )}
            </div>
            <WeightChart entries={entries} movingAverages={averages} height={150} />
            {averages.some((a) => a.seven_day_moving_average !== null) && (
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5 bg-primary rounded" />
                  <span className="text-[10px] text-muted-foreground">Weight</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="24" height="2">
                    <line
                      x1="0" y1="1" x2="24" y2="1"
                      stroke="rgb(59 140 255 / 50%)"
                      strokeWidth="1.5"
                      strokeDasharray="4 3"
                    />
                  </svg>
                  <span className="text-[10px] text-muted-foreground">7-day avg</span>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Entries list */}
      {!loading && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="label-caps">
              All entries{entries.length > 0 ? ` (${entries.length})` : ""}
            </h3>
          </div>

          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-input p-6 text-center"
            >
              <p className="text-sm font-semibold text-foreground">No entries yet</p>
              <p className="text-xs text-muted-foreground">
                Tap &ldquo;Log entry&rdquo; to record your first weight
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-col border-t border-line">
              {[...entries].reverse().map((entry, i, arr) => {
                const prev = arr[i + 1] ?? null;
                const delta = prev ? entry.weight - prev.weight : null;
                return (
                  <motion.button
                    key={entry.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.2) }}
                    onClick={() => setEditingEntry(entry)}
                    className="flex w-full items-center justify-between border-b border-line py-3 text-left transition-colors hover:bg-card"
                  >
                    <div>
                      <p className="num text-xl">
                        {fmtWeight(entry.weight)}
                        <span className="text-[13px] text-muted-foreground"> kg</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmtDay(entry.day)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {delta !== null && <DeltaChip delta={delta} />}
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Drawers */}
      <NewEntryDrawer
        open={showNewEntry}
        onClose={() => setShowNewEntry(false)}
        onSuccess={handleEntriesChanged}
      />
      <EditEntryDrawer
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSuccess={handleEntriesChanged}
      />
    </div>
  );
}
