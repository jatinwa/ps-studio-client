"use client";

import { useEffect, useState } from "react";
import { studio } from "@/lib/studio";

/**
 * Opening curtain. Dismisses on `window.load` or after a hard 2.2s ceiling,
 * whichever comes first — a loading screen that can outlast the page is a bug,
 * not an effect. Skipped entirely under reduced motion.
 */
export function Preloader() {
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0.08);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Next tick, so the dismissal is a normal update rather than a
      // synchronous cascade out of the effect body.
      const immediate = window.setTimeout(() => setDone(true), 0);
      return () => window.clearTimeout(immediate);
    }

    let raf = 0;
    const started = performance.now();
    const CEILING = 2200;

    const tick = () => {
      const elapsed = performance.now() - started;
      // Ease toward 0.9; the last 10% is reserved for the actual load event.
      setProgress(0.08 + 0.82 * (1 - Math.exp(-elapsed / 650)));
      if (elapsed < CEILING) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const finish = () => {
      setProgress(1);
      window.setTimeout(() => setDone(true), 420);
    };

    const ceiling = window.setTimeout(finish, CEILING);
    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(ceiling);
      window.removeEventListener("load", finish);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[180] flex flex-col items-center justify-center bg-bg transition-opacity duration-500"
      style={{ opacity: progress >= 1 ? 0 : 1 }}
    >
      <p className="font-mono text-[10px] tracking-[0.5em] text-ink sm:text-xs">
        {studio.name}
      </p>
      <div className="mt-6 h-px w-40 bg-[var(--hairline)]">
        <div
          className="h-px origin-left bg-accent"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <p className="mono-label mt-4 tabular-nums text-ink-dim">
        {Math.round(progress * 100)}%
      </p>
    </div>
  );
}
