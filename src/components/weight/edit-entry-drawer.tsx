"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { WeightEntry, updateWeightEntry } from "@/lib/api/weight";

interface EditEntryDrawerProps {
  entry: WeightEntry | null;
  onClose: () => void;
  onSuccess: () => void;
}

function fmtDay(day: string) {
  const d = new Date(day);
  return d.toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function EditEntryDrawer({ entry, onClose, onSuccess }: EditEntryDrawerProps) {
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry) setWeight(String(entry.weight));
  }, [entry]);

  async function handleSave() {
    if (!entry) return;
    const w = parseFloat(weight);
    if (!w || w <= 0 || w > 500) {
      toast.error("Enter a valid weight");
      return;
    }
    setLoading(true);
    try {
      await updateWeightEntry(entry.id, w);
      toast.success("Entry updated");
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to update entry");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={!!entry} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit entry</DrawerTitle>
          {entry && (
            <p className="text-sm text-muted-foreground">{fmtDay(entry.day)}</p>
          )}
        </DrawerHeader>

        <div className="px-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <label className="label-caps">Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="500"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="num h-16 rounded-xl border border-input bg-background px-4 text-center text-[34px] text-foreground outline-none placeholder:text-subtle focus:border-primary"
            />
          </div>
        </div>

        <DrawerFooter>
          <button
            onClick={handleSave}
            disabled={loading}
            className="h-13 rounded-xl bg-primary font-display text-lg font-bold tracking-[0.08em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save changes"}
          </button>
          <button
            onClick={onClose}
            className="h-10 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
