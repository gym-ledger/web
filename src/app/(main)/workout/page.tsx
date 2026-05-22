"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Play, Calendar, ChevronRight, Zap, RotateCcw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { workoutPrograms, recentWorkouts } from "@/lib/data/workouts";
import { cn } from "@/lib/utils";

function ProgramCard({ program }: { program: typeof workoutPrograms[0] }) {
  const progressPercent = (program.currentWeek / program.totalWeeks) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card ring-1 ring-foreground/10 overflow-hidden"
    >
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider bg-primary/10 rounded-md px-1.5 py-0.5">
                {program.shortName}
              </span>
              <span className="text-xs text-muted-foreground">{program.daysPerWeek}× / week</span>
            </div>
            <h3 className="mt-1.5 text-base font-bold text-foreground">{program.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {program.description}
            </p>
          </div>
        </div>

        {/* Week progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">
              Week {program.currentWeek} of {program.totalWeeks}
            </span>
            <span className="text-xs font-medium text-primary">{program.currentPhase}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <Link href="/workout/active">
          <Button className="mt-4 w-full h-10 rounded-xl font-semibold gap-2" size="sm">
            <Play className="size-3.5 fill-current" />
            Continue Program
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}

function RecentWorkoutCard({
  session,
}: {
  session: typeof recentWorkouts[0];
}) {
  const date = new Date(session.date);
  const label = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-foreground/10">
      <div className="flex flex-col items-center justify-center size-12 rounded-xl bg-secondary shrink-0">
        <span className="text-xs font-medium text-muted-foreground">
          {date.toLocaleDateString("en-US", { weekday: "short" })}
        </span>
        <span className="text-base font-bold text-foreground">
          {date.getDate()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">
          {session.dayName}
        </p>
        <p className="text-xs text-muted-foreground">
          {session.programName} · {session.duration}min · {(session.totalVolume / 1000).toFixed(1)}t
        </p>
      </div>
      <Link href="/workout/active">
        <button className="flex size-8 items-center justify-center rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors">
          <RotateCcw className="size-3.5" />
        </button>
      </Link>
    </div>
  );
}

export default function WorkoutPage() {
  return (
    <div className="flex flex-col px-4 pt-4">
      <PageHeader title="Workouts" />

      <Tabs defaultValue="programs" className="flex-1">
        <TabsList className="w-full mb-5">
          <TabsTrigger value="programs" className="flex-1">
            My Programs
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex-1">
            Quick Start
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programs">
          <div className="flex flex-col gap-4">
            {workoutPrograms.map((program, i) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <ProgramCard program={program} />
              </motion.div>
            ))}

            <button className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-5 text-sm font-medium text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
              + Browse program templates
            </button>
          </div>
        </TabsContent>

        <TabsContent value="quick">
          <div className="flex flex-col gap-4">
            {/* Empty workout card */}
            <Link href="/workout/active">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-primary/10 ring-1 ring-primary/30 p-5 flex items-center gap-4"
              >
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/20">
                  <Zap className="size-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">Empty Workout</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Start fresh, add exercises as you go
                  </p>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </motion.div>
            </Link>

            {/* Recent workouts to repeat */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Repeat recent
              </h2>
              <div className="flex flex-col gap-3">
                {recentWorkouts.slice(0, 4).map((session, i) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <RecentWorkoutCard session={session} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
