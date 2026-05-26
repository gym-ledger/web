"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { WeightChart } from "@/components/weight/weight-chart";
import { NewEntryDrawer } from "@/components/weight/new-entry-drawer";
import { EditEntryDrawer } from "@/components/weight/edit-entry-drawer";
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
      <span className="flex items-center gap-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-500 rounded-md px-1.5 py-0.5">
        <TrendingDown className="size-3" /> {abs} kg
      </span>
    );
  return (
    <span className="flex items-center gap-0.5 text-xs font-medium bg-rose-400/10 text-rose-400 rounded-md px-1.5 py-0.5">
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
        <label className="text-sm font-medium text-foreground">View name</label>
        <input
          type="text"
          placeholder="e.g. Cut phase"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">From</label>
        <input
          type="date"
          value={from}
          max={todayISO()}
          onChange={(e) => setFrom(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">To</label>
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
            className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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

  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [averages, setAverages] = useState<WeightMovingAverage[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewEntry, setShowNewEntry] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);

  const loadKey = useRef(0);

  useEffect(() => {
    setSavedViews(loadViews());
  }, []);

  const loadData = useCallback(async (view: ActiveView) => {
    const key = ++loadKey.current;
    setLoading(true);
    try {
      let data;
      if (view.type === "default") {
        data = await fetchWeightForDate(todayISO());
      } else if (view.type === "custom") {
        data = await fetchWeightRange(view.from, view.to);
      } else {
        const to = view.view.to === "now" ? todayISO() : view.view.to;
        data = await fetchWeightRange(view.view.from, to);
      }
      if (key !== loadKey.current) return;
      const sorted = [...(data?.weight_entries ?? [])].sort((a, b) =>
        a.day.localeCompare(b.day)
      );
      setEntries(sorted);
      setAverages(data?.weight_moving_averages ?? []);
    } catch {
      if (key === loadKey.current) toast.error("Failed to load weight data");
    } finally {
      if (key === loadKey.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(activeView);
  }, [activeView, loadData]);

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
          <h2 className="text-base font-bold text-foreground">Body weight</h2>
          <p className="text-xs text-muted-foreground">{rangeLabel()}</p>
        </div>
        <button
          onClick={() => setShowNewEntry(true)}
          className="flex items-center gap-1.5 h-9 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-3.5" /> Log entry
        </button>
      </div>

      {/* View selector */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-4 px-4 scrollbar-none">
        {/* Default chip */}
        <button
          onClick={() => { setActiveView({ type: "default" }); setShowCustom(false); }}
          className={`shrink-0 h-8 rounded-full px-3 text-xs font-medium transition-colors ${
            activeView.type === "default"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          Last 30 days
        </button>

        {/* Saved view chips */}
        {savedViews.map((v) => (
          <div key={v.id} className="relative shrink-0 flex items-center">
            <button
              onClick={() => { setActiveView({ type: "saved", view: v }); setShowCustom(false); }}
              className={`h-8 rounded-full pl-3 pr-7 text-xs font-medium transition-colors ${
                activeView.type === "saved" && activeView.view.id === v.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {v.name}
            </button>
            <button
              onClick={() => handleDeleteView(v.id)}
              className="absolute right-1.5 flex size-4 items-center justify-center rounded-full opacity-60 hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {/* Custom chip */}
        <button
          onClick={() => setShowCustom((s) => !s)}
          className={`shrink-0 h-8 rounded-full px-3 text-xs font-medium flex items-center gap-1 transition-colors ${
            showCustom || activeView.type === "custom"
              ? "bg-secondary text-foreground ring-1 ring-foreground/20"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="size-3" /> Custom
        </button>

        {/* Save view */}
        <button
          onClick={() => setShowSaveForm((s) => !s)}
          className="shrink-0 h-8 rounded-full px-3 text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          <Plus className="size-3" /> Save view
        </button>
      </div>

      {/* Custom range picker */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10 flex flex-col gap-3"
        >
          <p className="text-sm font-semibold text-foreground">Custom range</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">From</label>
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">To</label>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={todayISO()}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
          className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
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
        className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10"
      >
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between mb-4">
              <div>
                {latest ? (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-foreground tabular-nums">
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
                  <p className="text-[10px] text-muted-foreground mb-1">Change</p>
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
                      stroke="oklch(0.62 0.22 258 / 50%)"
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
            <h3 className="text-sm font-bold text-foreground">
              All entries{entries.length > 0 ? ` (${entries.length})` : ""}
            </h3>
          </div>

          {entries.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 flex flex-col items-center gap-2 text-center"
            >
              <p className="text-sm font-semibold text-foreground">No entries yet</p>
              <p className="text-xs text-muted-foreground">
                Tap &ldquo;Log entry&rdquo; to record your first weight
              </p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2">
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
                    className="flex items-center justify-between rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 hover:bg-secondary/50 transition-colors text-left w-full"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {fmtWeight(entry.weight)} kg
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
        onSuccess={() => loadData(activeView)}
      />
      <EditEntryDrawer
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSuccess={() => loadData(activeView)}
      />
    </div>
  );
}
