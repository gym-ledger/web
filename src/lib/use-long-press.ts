"use client";

import { useEffect, useRef } from "react";

const DEFAULT_HOLD_MS = 500;

/**
 * Press-and-hold on a button. Spread `handlers` onto it and call
 * `consumeClick()` at the top of its `onClick`: it returns true (skip the
 * normal action) for the click the browser fires on release after a hold.
 * Right-click / the touch context-menu gesture also count as a hold, and the
 * hold is cancelled if the press turns into a scroll (pointercancel) or
 * slides off the button.
 */
export function useLongPress(onLongPress: () => void, holdMs = DEFAULT_HOLD_MS) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const onLongPressRef = useRef(onLongPress);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);
  useEffect(() => () => clearTimer(), []);

  function clearTimer() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }

  function trigger() {
    clearTimer();
    fired.current = true;
    navigator.vibrate?.(15);
    onLongPressRef.current();
  }

  return {
    handlers: {
      onPointerDown: (e: React.PointerEvent) => {
        if (e.button !== 0) return;
        fired.current = false;
        clearTimer();
        timer.current = setTimeout(trigger, holdMs);
      },
      onPointerUp: clearTimer,
      onPointerLeave: clearTimer,
      onPointerCancel: clearTimer,
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault();
        if (!fired.current) trigger();
      },
    },
    consumeClick: () => {
      const wasHold = fired.current;
      fired.current = false;
      return wasHold;
    },
  };
}
