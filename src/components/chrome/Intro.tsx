"use client";

import { useEffect } from "react";

/**
 * Drives the first-open sequence. Renders nothing.
 *
 * The strip itself is server-rendered by the root layout (`IntroOverlay`), and
 * whether it shows at all is decided by `introScript` before the body is
 * parsed. This component only moves it through its states and hands the page
 * back — it must never be the thing that puts the overlay on screen, because
 * anything mounted from an effect arrives after the page has already painted.
 *
 * Three rules it still has to obey, because an intro is the one piece of a
 * site that can hold a visitor hostage:
 *
 *  - It can never outlast the page. There are two ceilings: this one, and a
 *    blunter one in the head script for the case where React never hydrates.
 *  - It plays once per session, not on every navigation. A beautiful animation
 *    on the fourth page view is an obstacle. (The head script owns that call.)
 *  - Reduced motion skips it entirely.
 */

/** Film strip runs, mark settles onto it, strip is pulled away. */
const SETTLE_AT = 760;
const PULL_AT = 1700;
const DONE_AT = 2500;

declare global {
  interface Window {
    /** Set by the head script at first paint. */
    __introStart?: number;
  }
}

export function Intro() {
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== "on") return;

    const node = document.getElementById("intro");
    if (!node) {
      root.dataset.intro = "done";
      return;
    }

    /*
     * Timings run from FIRST PAINT, not from this effect.
     *
     * The strip's CSS animation starts the moment the overlay is painted,
     * which on a cold load is well before React hydrates. Scheduling from
     * here would drift the mark out of step with the strip by however long
     * hydration happened to take — on a slow phone, badly. Measuring from the
     * stamp the head script left means a late hydration simply finds some of
     * these already due and fires them at once.
     */
    const started = window.__introStart ?? Date.now();
    const after = (ms: number) => Math.max(0, started + ms - Date.now());

    const settle = window.setTimeout(() => {
      node.dataset.state = "settle";
    }, after(SETTLE_AT));

    const pull = window.setTimeout(() => {
      node.dataset.state = "pull";
    }, after(PULL_AT));

    const finish = window.setTimeout(() => {
      root.dataset.intro = "done";
    }, after(DONE_AT));

    return () => {
      window.clearTimeout(settle);
      window.clearTimeout(pull);
      window.clearTimeout(finish);
      // whatever happens, the visitor gets the page and its scrollbar back
      root.dataset.intro = "done";
    };
  }, []);

  return null;
}

/**
 * The strip, rendered on the server so it is in the first paint.
 *
 * The sprockets are a repeating gradient rather than elements: a strip wide
 * enough to cross a desktop needs well over a hundred perforations, and that
 * many nodes animating is a real cost for something on screen for two seconds.
 */
export function IntroOverlay() {
  return (
    <div
      id="intro"
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

/**
 * Runs synchronously as the first thing in the body, before the browser has
 * parsed — let alone painted — anything below it. It decides whether the
 * overlay is shown at all, so the decision costs no frames.
 *
 * It reads sessionStorage, which a server render cannot do without disagreeing
 * with the client and tripping hydration. Doing it here instead of in an
 * effect is the whole point: by the time an effect could run, the page has
 * been on screen for a while.
 *
 * The 4s timer is a backstop for the case React never hydrates at all — a
 * chunk that 404s, a browser that chokes. Without it a failed hydration would
 * leave the visitor staring at a film strip with the page locked behind it.
 */
export const introScript = `(function(){var d=document.documentElement,K="payal-intro-seen";try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(sessionStorage.getItem(K)==="1")return;sessionStorage.setItem(K,"1")}catch(e){}d.dataset.intro="on";window.__introStart=Date.now();setTimeout(function(){if(d.dataset.intro==="on")d.dataset.intro="done"},4000)})();`;
