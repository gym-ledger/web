"use client";

import { useEffect } from "react";

/**
 * Puts the frozen pre-redesign theme (and its Geist font variables) on
 * <body> while any /old/* route is mounted, so portalled sheets/drawers/toasts
 * match the page instead of the new theme.
 */
export function OldThemeScope({ fontClassName }: { fontClassName: string }) {
  useEffect(() => {
    const classes = ["old-theme", ...fontClassName.split(" ").filter(Boolean)];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [fontClassName]);

  return null;
}
