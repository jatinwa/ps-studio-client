"use client";

import { useEffect, useRef, useState } from "react";

const SEEN_KEY = "payal-intro-seen";

/**
 * The first-open sequence: a strip of film runs across the screen, the studio's
 * mark rides in on it, and then the whole strip pulls away.
 *
 * Three rules it has to obey, because an intro is the one piece of a site that
 * can hold a visitor hostage:
 *
 *  - It can never outlast the page. A hard ceiling dismisses it whether or not
 *    anything finished loading.
 *  - It plays once per session, not on every navigation. A beautiful animation
 *    on the fourth page view is an obstacle.
 *  - Reduced motion skips it entirely, and it is removed from the DOM when
 *    done rather than left as an invisible layer over the site.
 *
 * The sprockets are a repeating gradient rather than elements: a strip wide
 * enough to cross a desktop needs well over a hundred perforations, and that
 * many nodes animating is a cost for something on screen for two seconds.
 */
export function Intro() {
  const [mounted, setMounted] = useState(false);
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  /*
   * Decided on the client, after mount. Reading sessionStorage during render
   * would disagree with the server-rendered HTML and trip hydration; this way
   * the server always renders nothing and the client decides.
   */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* private mode — treat as unseen, it is only a nicety */
    }
    if (seen) return;
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* not fatal */
    }
    // next tick, so showing the intro is an ordinary update rather than a
    // synchronous cascade out of the effect body
    const settle = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(settle);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = rootRef.current;
    if (!root) return;

    document.documentElement.style.overflow = "hidden";

    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      cancelled = true;
      document.documentElement.style.overflow = "";
      setGone(true);
    };

    /*
     * The strip runs, the mark settles on it, then the whole thing is pulled
     * off and the page is handed over. Sequential states rather than one blob
     * of transitions, so the mark is never on screen at the same time as the
     * page's own wordmark underneath.
     */
    const settle = window.setTimeout(() => {
      root.dataset.state = "settle";
    }, 760);
    const pull = window.setTimeout(() => {
      root.dataset.state = "pull";
    }, 1700);
    // the ceiling: whatever happens above, the visitor gets the site back
    const ceiling = window.setTimeout(finish, 2500);

    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(pull);
      window.clearTimeout(ceiling);
      document.documentElement.style.overflow = "";
    };
  }, [mounted]);

  if (!mounted || gone) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-state="run"
      className="intro-root pointer-events-none fixed inset-0 z-[200]"
    >
      <div className="intro-strip">
        <span className="intro-perfs intro-perfs-top" />
        <div className="intro-cells">
          {/* four cells, so something is always crossing the middle */}
          <span className="intro-cell" />
          <span className="intro-cell" />
          <span className="intro-cell" />
          <span className="intro-cell" />
        </div>
        <span className="intro-perfs intro-perfs-bottom" />
      </div>

      <span className="intro-mark" />
    </div>
  );
}
