"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./useReducedMotion";

/**
 * A pinned chapter locks its content into exactly one viewport height, so on a
 * short viewport — a landscape phone, a small laptop with heavy browser chrome
 * — anything that does not fit is simply unreachable. Measured at 667×375 the
 * lighting lab lost 556px of its control panel, including every lighting mode.
 *
 * Below this height the chapters fall back to their ordinary flow layout, which
 * is the same branch reduced motion uses: nothing pins, everything scrolls.
 */
export const MIN_PINNED_HEIGHT = 560;

export function supportsPinnedChapters(): boolean {
  if (typeof window === "undefined") return true;
  return window.innerHeight >= MIN_PINNED_HEIGHT;
}

/** Live check, for use inside effects that set up pinning. */
export function shouldUseStaticLayout(): boolean {
  if (typeof window === "undefined") return false;
  return prefersReducedMotion() || !supportsPinnedChapters();
}

/**
 * True when chapters should render unpinned. Tracks both the motion preference
 * and viewport height, so rotating a phone moves between the two layouts.
 */
export function useStaticLayout(): boolean {
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    const update = () => setIsStatic(shouldUseStaticLayout());
    const settle = setTimeout(update, 0);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);

    return () => {
      clearTimeout(settle);
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isStatic;
}
