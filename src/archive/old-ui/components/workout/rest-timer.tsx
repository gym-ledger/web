"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, ChevronDown } from "lucide-react";

interface RestTimerProps {
  initialSeconds: number;
  onSkip: () => void;
  onFinish: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

  const progress = 1 - remaining / initialSeconds;
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference * (1 - progress);

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed bottom-24 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4"
    >
      <div
        className="flex items-center justify-between rounded-2xl px-4 py-3.5 shadow-2xl ring-1 ring-white/10"
        style={{ backgroundColor: "oklch(0.28 0.10 258)" }}
      >
        {/* Left: label + timer */}
        <div className="flex items-center gap-3">
          {/* Circular progress */}
          <div className="relative flex size-12 items-center justify-center">
            <svg className="size-full -rotate-90" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="oklch(1 0 0 / 15%)"
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="oklch(0.97 0 0)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute text-xs font-bold text-white tabular-nums">
              {formatTime(remaining)}
            </span>
          </div>

          <div>
            <p className="text-xs text-white/70 uppercase tracking-wider">Rest</p>
            <p className="text-base font-bold text-white tabular-nums">
              {formatTime(remaining)}
            </p>
          </div>
        </div>

        {/* Right: Skip button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            <ChevronDown className="size-4" />
            Skip rest
          </button>
          <button
            onClick={onSkip}
            className="flex size-8 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
