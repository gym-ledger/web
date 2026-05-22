"use client";

import Link from "next/link";
import { Play, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TodayCardProps {
  programName: string;
  dayName: string;
  exercises: string[];
}

export function TodayCard({ programName, dayName, exercises }: TodayCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="relative overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10"
    >
      {/* Blue accent bar */}
      <div className="absolute left-0 top-0 h-full w-1 bg-primary" />

      <div className="p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-widest">
              Today&apos;s Workout
            </p>
            <h3 className="mt-1 text-xl font-bold text-foreground">{dayName}</h3>
            <p className="text-sm text-muted-foreground">{programName} Program</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <Play className="size-5 text-primary fill-primary" />
          </div>
        </div>

        {/* Exercises preview */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {exercises.slice(0, 4).map((ex) => (
            <span
              key={ex}
              className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {ex}
            </span>
          ))}
          {exercises.length > 4 && (
            <span className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
              +{exercises.length - 4} more
            </span>
          )}
        </div>

        {/* Start button */}
        <Link href="/workout/active" className="block mt-4">
          <Button className="w-full h-11 rounded-xl font-semibold gap-2">
            <Play className="size-4 fill-current" />
            Start Workout
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
