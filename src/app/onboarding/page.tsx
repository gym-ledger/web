"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/shared/segmented";
import { useAuthStore } from "@/auth/authStore";
import { ApiError } from "@/lib/api-client";
import {
  completeOnboarding,
  fetchPreferences,
  skipOnboarding,
  type Equipment,
  type ExperienceLevel,
  type HeightUnits,
  type TrainingGoal,
  type WeightUnits,
} from "@/lib/api/profile";
import { fetchPublicWorkoutPlans, selectWorkoutPlan, type PublicWorkoutPlan } from "@/lib/api/workout";
import { cn } from "@/lib/utils";

const QUESTION_STEPS = 5;
const MAX_SUGGESTIONS = 3;

const goals: { id: TrainingGoal; label: string; desc: string }[] = [
  { id: "build_muscle", label: "Build muscle", desc: "Maximise hypertrophy" },
  { id: "get_stronger", label: "Get stronger", desc: "Push your strength PRs" },
  { id: "lose_fat", label: "Lose fat", desc: "Body recomposition" },
  { id: "general_fitness", label: "General fitness", desc: "Stay healthy and fit" },
];

const levels: { id: ExperienceLevel; label: string; desc: string }[] = [
  { id: "beginner", label: "Beginner", desc: "Under 1 year of consistent training" },
  { id: "intermediate", label: "Intermediate", desc: "1–3 years, know the basics" },
  { id: "advanced", label: "Advanced", desc: "3+ years, solid technique" },
];

const trainingDayOptions = [3, 4, 5, 6];

const equipmentOptions: { id: Equipment; label: string; desc: string }[] = [
  { id: "full_gym", label: "Full gym", desc: "Barbells, machines, cables" },
  { id: "home_dumbbells", label: "Home + dumbbells", desc: "Adjustable dumbbells and a bench" },
  { id: "bodyweight", label: "Bodyweight", desc: "No equipment" },
];

function deviceTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

/** Plans matching the chosen days per week; failing that, the ones closest to it. */
function suggestPlans(plans: PublicWorkoutPlan[], days: number) {
  if (plans.length === 0) return [];
  const distance = (p: PublicWorkoutPlan) => Math.abs(p.training_days - days);
  const best = Math.min(...plans.map(distance));
  return plans.filter((p) => distance(p) === best).slice(0, MAX_SUGGESTIONS);
}

function OptionRow({
  label,
  desc,
  selected,
  onSelect,
}: {
  label: string;
  desc: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex min-h-16 items-center justify-between gap-4 rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors",
        selected ? "border-primary" : "border-border hover:border-input",
      )}
    >
      <div className="min-w-0">
        <p className="text-[15px] font-semibold">{label}</p>
        <p className="text-[13px] text-muted-foreground">{desc}</p>
      </div>
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
        )}
      >
        {selected && <Check className="size-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

function StepHeading({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h1 className="font-display text-[32px] leading-none font-bold">{title}</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">{sub}</p>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const _hasHydrated = useAuthStore((s) => s._hasHydrated);
  const status = useAuthStore((s) => s.status);
  const setUser = useAuthStore((s) => s.setUser);

  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<TrainingGoal | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [trainingDays, setTrainingDays] = useState<number | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [weightUnits, setWeightUnits] = useState<WeightUnits>("kg");
  const [heightUnits, setHeightUnits] = useState<HeightUnits>("cm");
  const [heightInput, setHeightInput] = useState("");
  const [timezone, setTimezone] = useState(deviceTimezone);

  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [suggestions, setSuggestions] = useState<PublicWorkoutPlan[] | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [_hasHydrated, status, router]);

  // Users who already saved settings keep their units, height and timezone.
  useEffect(() => {
    if (status !== "authenticated") return;
    fetchPreferences()
      .then((prefs) => {
        if (!prefs) return;
        setWeightUnits(prefs.weight_units);
        setHeightUnits(prefs.height_units);
        setHeightInput(String(prefs.height));
        setTimezone(prefs.timezone);
        if (prefs.training_goal) setGoal(prefs.training_goal);
        if (prefs.experience_level) setExperience(prefs.experience_level);
        if (prefs.training_days_per_week) setTrainingDays(prefs.training_days_per_week);
        if (prefs.equipment) setEquipment(prefs.equipment);
      })
      .catch(() => {});
  }, [status]);

  if (!_hasHydrated || status !== "authenticated") {
    return null;
  }

  const parsedHeight = heightInput.trim() ? parseFloat(heightInput) : NaN;
  const heightValid = !Number.isNaN(parsedHeight) && parsedHeight > 0;
  const showingPlans = suggestions !== null;

  const canContinue =
    (step === 1 && !!goal) ||
    (step === 2 && !!experience) ||
    (step === 3 && !!trainingDays) ||
    (step === 4 && !!equipment) ||
    (step === 5 && heightValid);

  async function handleSkip() {
    setSkipping(true);
    try {
      const user = await skipOnboarding();
      setUser({ id: user.id, onboarded_at: user.onboarded_at });
      router.replace("/home");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't skip right now. Try again.");
      setSkipping(false);
    }
  }

  async function handleFinish() {
    if (!goal || !experience || !trainingDays || !equipment || !heightValid) return;
    setSaving(true);
    try {
      const { user } = await completeOnboarding({
        timezone,
        weight_units: weightUnits,
        height_units: heightUnits,
        height: parsedHeight,
        training_goal: goal,
        experience_level: experience,
        training_days_per_week: trainingDays,
        equipment,
      });
      setUser({ id: user.id, onboarded_at: user.onboarded_at });
      // The answers are saved; a failed plan fetch just means no suggestions.
      const plans = await fetchPublicWorkoutPlans().catch(() => []);
      setSuggestions(suggestPlans(plans, trainingDays));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't save your answers. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleContinue() {
    if (step < QUESTION_STEPS) {
      setStep(step + 1);
    } else {
      void handleFinish();
    }
  }

  async function handleAddPlan(plan: PublicWorkoutPlan) {
    setAddingId(plan.workout_program_id);
    try {
      await selectWorkoutPlan(plan.workout_program_id);
      toast.success("Plan added to your list");
      router.replace("/workout");
    } catch {
      toast.error("Failed to add plan");
      setAddingId(null);
    }
  }

  const stepMotion = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: { duration: 0.2 },
    className: "flex flex-1 flex-col gap-6",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 pt-4 pb-6">
      {!showingPlans && (
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                aria-label="Previous question"
                onClick={() => setStep(step - 1)}
                className="flex size-11 items-center justify-center rounded-full border border-input bg-card transition-colors hover:bg-secondary"
              >
                <ArrowLeft className="size-5" />
              </button>
            ) : (
              <span className="size-11" />
            )}
            <span className="label-caps">
              Step {step} of {QUESTION_STEPS}
            </span>
            <button
              type="button"
              onClick={handleSkip}
              disabled={skipping || saving}
              className="flex min-h-11 items-center px-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Skip
            </button>
          </div>
          <div className="mt-4 h-1 w-full rounded-full bg-track-primary">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${(step / QUESTION_STEPS) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {!showingPlans && step === 1 && (
          <motion.div key="goal" {...stepMotion}>
            <StepHeading title="Main goal" sub="What are you training for?" />
            <div role="radiogroup" aria-label="Main goal" className="flex flex-col gap-3">
              {goals.map((g) => (
                <OptionRow key={g.id} {...g} selected={goal === g.id} onSelect={() => setGoal(g.id)} />
              ))}
            </div>
          </motion.div>
        )}

        {!showingPlans && step === 2 && (
          <motion.div key="experience" {...stepMotion}>
            <StepHeading title="Experience" sub="How long have you trained consistently?" />
            <div role="radiogroup" aria-label="Experience" className="flex flex-col gap-3">
              {levels.map((l) => (
                <OptionRow
                  key={l.id}
                  {...l}
                  selected={experience === l.id}
                  onSelect={() => setExperience(l.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {!showingPlans && step === 3 && (
          <motion.div key="days" {...stepMotion}>
            <StepHeading title="Days per week" sub="How many days can you train? We'll match plans to it." />
            <div role="radiogroup" aria-label="Days per week" className="grid grid-cols-2 gap-3">
              {trainingDayOptions.map((days) => (
                <button
                  key={days}
                  type="button"
                  role="radio"
                  aria-checked={trainingDays === days}
                  onClick={() => setTrainingDays(days)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border bg-card py-6 transition-colors",
                    trainingDays === days ? "border-primary" : "border-border hover:border-input",
                  )}
                >
                  <span className={cn("num text-[56px]", trainingDays === days && "text-primary")}>{days}</span>
                  <span className="label-caps text-[10px]">Days / week</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {!showingPlans && step === 4 && (
          <motion.div key="equipment" {...stepMotion}>
            <StepHeading title="Equipment" sub="What do you usually train with?" />
            <div role="radiogroup" aria-label="Equipment" className="flex flex-col gap-3">
              {equipmentOptions.map((e) => (
                <OptionRow
                  key={e.id}
                  {...e}
                  selected={equipment === e.id}
                  onSelect={() => setEquipment(e.id)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {!showingPlans && step === 5 && (
          <motion.div key="body" {...stepMotion}>
            <StepHeading title="Units & height" sub="Used for your stats, volume and body-weight tracking." />
            <div className="flex flex-col">
              <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
                <p className="text-[15px] font-semibold">Weight units</p>
                <Segmented<WeightUnits>
                  label="Weight units"
                  options={[
                    { value: "kg", label: "kg" },
                    { value: "lbs", label: "lbs" },
                  ]}
                  value={weightUnits}
                  onChange={setWeightUnits}
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
                <p className="text-[15px] font-semibold">Height units</p>
                <Segmented<HeightUnits>
                  label="Height units"
                  options={[
                    { value: "cm", label: "cm" },
                    { value: "ft", label: "ft" },
                  ]}
                  value={heightUnits}
                  onChange={setHeightUnits}
                />
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-line py-3.5">
                <p className="text-[15px] font-semibold">Height</p>
                <label className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    aria-label={`Height in ${heightUnits}`}
                    placeholder="—"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    className="num h-11 w-24 rounded-xl border border-input bg-background text-center text-xl outline-none placeholder:text-subtle focus:border-primary"
                  />
                  <span className="text-sm text-muted-foreground">{heightUnits}</span>
                </label>
              </div>
              <p className="pt-3 text-[13px] text-subtle">Timezone: {timezone}. You can change it in Settings.</p>
            </div>
          </motion.div>
        )}

        {showingPlans && (
          <motion.div key="plans" {...stepMotion}>
            <div className="pt-8">
              <span className="label-caps text-success">All set</span>
              <h1 className="mt-2 font-display text-[34px] leading-none font-bold">
                {suggestions.length > 0 ? "Plans for you" : "You're ready"}
              </h1>
              <p className="mt-2 text-[15px] text-muted-foreground">
                {suggestions.length > 0
                  ? suggestions[0].training_days === trainingDays
                    ? `These fit ${trainingDays} training days a week.`
                    : `No plan runs ${trainingDays} days a week yet. These are the closest.`
                  : "There are no plans to suggest yet. You can browse them any time under Workout."}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {suggestions.map((plan) => (
                <div key={plan.workout_program_id} className="rounded-2xl border border-border bg-card p-[18px]">
                  <div className="grid grid-cols-3 border-b border-line pb-3">
                    <div className="flex flex-col">
                      <span className="num text-[26px]">{plan.training_days}×</span>
                      <span className="label-caps text-[10px]">Per week</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="num text-[26px]">{plan.duration_weeks}</span>
                      <span className="label-caps text-[10px]">Weeks</span>
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-display text-[26px] leading-none font-bold text-primary">
                        {plan.split_type}
                      </span>
                      <span className="label-caps text-[10px]">Split</span>
                    </div>
                  </div>
                  <h2 className="mt-3 font-display text-[26px] leading-tight font-bold">{plan.name}</h2>
                  {plan.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p>
                  )}
                  <Button
                    size="xl"
                    className="mt-4 w-full"
                    disabled={addingId !== null}
                    onClick={() => handleAddPlan(plan)}
                  >
                    {addingId === plan.workout_program_id && <Loader2 className="animate-spin" />}
                    Add to my plans
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto pt-6">
        {showingPlans ? (
          <Button
            size="xl"
            variant="light"
            className="w-full"
            disabled={addingId !== null}
            onClick={() => router.replace("/home")}
          >
            {suggestions.length > 0 ? "Skip for now" : "Go to Home"}
          </Button>
        ) : (
          <Button size="xl" className="w-full" disabled={!canContinue || saving || skipping} onClick={handleContinue}>
            {saving && <Loader2 className="animate-spin" />}
            {step === QUESTION_STEPS ? "Finish" : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}
