"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * The single source of truth for the motion preference. Read it directly
 * inside effects that set up animation, so an effect can never disagree with
 * whichever tree the hook rendered.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(QUERY).matches;
}

/**
 * The server cannot know this preference, so SSR assumes motion is allowed and
 * the client corrects on mount.
 *
 * Deliberately NOT `useSyncExternalStore`: with a `getServerSnapshot` that
 * disagrees with the client snapshot, the post-hydration correction only lands
 * if the store happens to notify — and a media query that was *already*
 * matching never fires a `change` event. The measured result was that
 * reduced-motion users got served the full animated site. A mount effect
 * corrects unconditionally.
 *
 * The timeout defers the first `setState` out of the effect body (cascading
 * renders straight from an effect being what `react-hooks/set-state-in-effect`
 * guards against) while still guaranteeing it runs.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = () => setReduced(prefersReducedMotion());

    const settle = setTimeout(update, 0);
    mq.addEventListener("change", update);

    return () => {
      clearTimeout(settle);
      mq.removeEventListener("change", update);
    };
  }, []);

  return reduced;
}
