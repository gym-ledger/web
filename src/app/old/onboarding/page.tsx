"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Zap, Target, Flame, Activity, Dumbbell, BarChart2, Home } from "lucide-react";
import { Button } from "@/old-ui/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingData } from "@/types";

const TOTAL_STEPS = 4;

// Step 1: Goal
const goals = [
  { id: "build_muscle", label: "Build Muscle", icon: Dumbbell, desc: "Maximize hypertrophy" },
  { id: "get_stronger", label: "Get Stronger", icon: Zap, desc: "Increase strength PRs" },
  { id: "lose_fat", label: "Lose Fat", icon: Flame, desc: "Body recomposition" },
  { id: "general_fitness", label: "General Fitness", icon: Activity, desc: "Stay healthy & fit" },
] as const;

// Step 2: Experience
const levels = [
  { id: "beginner", label: "Beginner", desc: "Under 1 year of consistent training" },
  { id: "intermediate", label: "Intermediate", desc: "1–3 years, know the basics" },
  { id: "advanced", label: "Advanced", desc: "3+ years, solid technique" },
] as const;

// Step 3: Training days
const trainingDayOptions = [3, 4, 5, 6];

// Step 4: Equipment
const equipmentOptions = [
  { id: "full_gym", label: "Full Gym", icon: BarChart2, desc: "Barbells, machines, cables" },
  { id: "home_dumbbells", label: "Home + Dumbbells", icon: Dumbbell, desc: "Adjustable dumbbells & bench" },
  { id: "bodyweight", label: "Bodyweight", icon: Target, desc: "No equipment needed" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({});

  const progress = (step / TOTAL_STEPS) * 100;

  const canContinue = () => {
    if (step === 1) return !!data.goal;
    if (step === 2) return !!data.experience;
    if (step === 3) return !!data.trainingDays;
    if (step === 4) return !!data.equipment;
    return false;
  };

  const handleContinue = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      router.push("/old/home");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Step {step} of {TOTAL_STEPS}</span>
          <button
            onClick={() => router.push("/old/home")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Skip
          </button>
        </div>
        <div className="h-1 w-full rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col flex-1 gap-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">What&apos;s your main goal?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ll tailor your program to match your objective.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {goals.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setData({ ...data, goal: id })}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all",
                    data.goal === id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
                  )}
                >
                  <div className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    data.goal === id ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  )}>
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col flex-1 gap-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">Training experience</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Be honest — we&apos;ll set the right difficulty level.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {levels.map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setData({ ...data, experience: id })}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                    data.experience === id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
                  )}
                >
                  <div className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                    data.experience === id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground"
                  )}>
                    {data.experience === id && (
                      <div className="size-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col flex-1 gap-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">Training frequency</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                How many days per week can you train?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {trainingDayOptions.map((days) => (
                <button
                  key={days}
                  onClick={() => setData({ ...data, trainingDays: days })}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border py-6 transition-all",
                    data.trainingDays === days
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
                  )}
                >
                  <span className={cn(
                    "text-4xl font-black",
                    data.trainingDays === days ? "text-primary" : "text-foreground"
                  )}>
                    {days}
                  </span>
                  <span className="text-xs text-muted-foreground">days / week</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Most members train 4–5 days for optimal progress.
            </p>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col flex-1 gap-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">Available equipment</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ll select exercises you can actually do.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {equipmentOptions.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setData({ ...data, equipment: id })}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                    data.equipment === id
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
                  )}
                >
                  <div className={cn(
                    "flex size-12 shrink-0 items-center justify-center rounded-xl",
                    data.equipment === id ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
                  )}>
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom button */}
      <div className="mt-auto pt-6">
        <Button
          onClick={handleContinue}
          disabled={!canContinue()}
          className="w-full h-12 rounded-xl text-base font-semibold gap-2"
        >
          {step === TOTAL_STEPS ? "Get started" : "Continue"}
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
