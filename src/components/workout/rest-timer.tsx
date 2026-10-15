"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface RestTimerProps {
  initialSeconds: number;
  onSkip: () => void;
  onFinish: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Short buzz when rest is over — the phone is usually face-down on a bench.
const REST_DONE_VIBRATION_MS = [180, 90, 180];

/**
 * Mount this only while a rest period is active (e.g. `{visible && <RestTimer .../>}`
 * inside an `AnimatePresence`). A fresh mount is how the countdown resets —
 * there's no `isVisible` prop to toggle internally.
 */
export function RestTimer({ initialSeconds, onSkip, onFinish }: RestTimerProps) {
  const [remaining, setRemaining] = useState(initialSeconds);

  // The parent re-renders every second (its own elapsed-time counter), which
  // gives `onFinish` a new identity each time. Reading it via a ref (kept
  // current in its own effect) means the ticking interval below can mount
  // exactly once instead of being torn down and recreated before it ever
  // fires — which is what was making the countdown look stuck.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Fixed end-timestamp computed once at mount, not a per-tick decrement —
  // so backgrounding the tab/locking the phone (which throttles or pauses
  // setInterval) can't leave this showing stale time. Every tick recomputes
  // from the real clock, and a visibilitychange listener forces an
  // immediate recompute the moment the app comes back to the foreground
  // instead of waiting for the next scheduled tick.
  // Lazy initializer (not a plain `useRef(Date.now() + ...)`) so the impure
  // `Date.now()` call runs only once, during initialization, not on every render.
  const [endAtMs] = useState(() => Date.now() + initialSeconds * 1000);

  useEffect(() => {
    let firedFinish = false;
    function tick() {
      const secsLeft = Math.max(0, Math.round((endAtMs - Date.now()) / 1000));
      setRemaining(secsLeft);
      if (secsLeft <= 0 && !firedFinish) {
        firedFinish = true;
        navigator.vibrate?.(REST_DONE_VIBRATION_MS);
        onFinishRef.current();
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    function handleVisibility() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [endAtMs]);

  const progress = initialSeconds > 0 ? 1 - remaining / initialSeconds : 1;
  const elapsedSeconds = initialSeconds - remaining;

  // Bar fills left → right as the rest elapses. The label row is drawn twice —
  // light text on the empty track, dark text inside the fill — and the fill
  // layer is clipped to the progress, so the text stays readable wherever the
  // fill edge happens to be.
  const label = (tone: "light" | "dark") => (
    <div className="flex h-full items-center gap-3 pr-2 pl-4">
      <span
        className={
          tone === "light"
            ? "font-display text-base font-bold tracking-[0.1em] text-muted-foreground"
            : "font-display text-base font-bold tracking-[0.1em] text-primary-foreground"
        }
      >
        REST
      </span>
      <span className="num text-[34px]">{formatTime(remaining)}</span>
      <span
        className={
          tone === "light" ? "text-[13px] font-semibold text-muted-foreground" : "text-[13px] font-semibold"
        }
      >
        {formatTime(elapsedSeconds)} / {formatTime(initialSeconds)}
      </span>
    </div>
  );

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 60, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative overflow-hidden border-b border-line bg-card"
      role="timer"
      aria-label={`Rest, ${formatTime(remaining)} left`}
    >
      <div className="absolute inset-0 text-foreground" aria-hidden="true">
        {label("light")}
      </div>
      <div
        className="absolute inset-0 bg-primary text-primary-foreground transition-[clip-path] duration-1000 ease-linear"
        style={{ clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)` }}
        aria-hidden="true"
      >
        {label("dark")}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="absolute top-1/2 right-2 h-11 -translate-y-1/2 rounded-lg bg-background px-4 font-display text-[15px] font-bold tracking-[0.08em] text-foreground uppercase transition-colors hover:bg-secondary"
      >
        Skip
      </button>
    </motion.div>
  );
}
