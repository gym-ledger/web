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

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          onFinishRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, []);

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
      <div className="flex items-center justify-between rounded-2xl bg-card px-4 py-3.5 ring-1 ring-foreground/10 shadow-2xl">
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
                stroke="oklch(1 0 0 / 7%)"
                strokeWidth="3"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="oklch(0.62 0.22 258)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className="transition-all duration-1000"
              />
            </svg>
            <span className="absolute text-xs font-bold text-foreground tabular-nums">
              {formatTime(remaining)}
            </span>
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Rest</p>
            <p className="text-base font-bold text-foreground tabular-nums">
              {formatTime(remaining)}
            </p>
          </div>
        </div>

        {/* Right: Skip button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSkip}
            className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors"
          >
            <ChevronDown className="size-4" />
            Skip rest
          </button>
          <button
            onClick={onSkip}
            className="flex size-8 items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
