"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { createWeightEntry } from "@/lib/api/weight";

interface NewEntryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export function NewEntryDrawer({ open, onClose, onSuccess }: NewEntryDrawerProps) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayISO());
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const w = parseFloat(weight);
    if (!w || w <= 0 || w > 500) {
      toast.error("Enter a valid weight (0–500 kg)");
      return;
    }
    if (!date) {
      toast.error("Select a date");
      return;
    }
    setLoading(true);
    try {
      await createWeightEntry(w, date);
      toast.success("Weight logged");
      setWeight("");
      setDate(todayISO());
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to log weight");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Log weight</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-4 pb-2">
          <div className="flex flex-col gap-1.5">
            <label className="label-caps">Weight (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="500"
              placeholder="e.g. 78.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="num h-16 rounded-xl border border-input bg-background px-4 text-center text-[34px] text-foreground outline-none placeholder:text-subtle focus:border-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label-caps">Date</label>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl border border-input bg-background px-4 text-base text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        <DrawerFooter>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-13 rounded-xl bg-primary font-display text-lg font-bold tracking-[0.08em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save entry"}
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
