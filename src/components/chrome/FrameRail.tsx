"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { homeSections } from "@/lib/studio";

/**
 * The frame counter from the concept: a fixed rail on the left showing which
 * frame of the reel you are on, with ticks for the rest.
 *
 * It yields to content. A viewport-width check alone is not enough — the rail
 * is fixed while the page moves underneath it, and sections differ: the reel
 * runs edge to edge, so a rail that sat happily in the margin of one section
 * lands on top of a photograph in the next. So it hit-tests what is actually
 * beneath it on every scroll and gets out of the way, smoothly, whenever it
 * would cover something.
 */

/** Rail width plus the breathing room it needs beside the measure. */
const RAIL_SPACE = 128;

/** What counts as "something I must not cover". */
const CONTENT =
  "img, figure, picture, canvas, video, h1, h2, h3, h4, p, li, button, a, input, textarea, select, dl, blockquote";

export function FrameRail() {
  const railRef = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const pathname = usePathname();
  const onHome = pathname === "/";

  /* ─── get out of the way of whatever is underneath ─── */
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !onHome) return;

    const roomInMargin = () => {
      const root = getComputedStyle(document.documentElement);
      const rem = parseFloat(root.fontSize) || 16;
      const raw = root.getPropertyValue("--wide").trim();
      const wide = raw.endsWith("rem")
        ? parseFloat(raw) * rem
        : parseFloat(raw) || 69 * rem;
      const content = Math.min(window.innerWidth, wide);
      return (window.innerWidth - content) / 2 >= RAIL_SPACE;
    };

    const collides = () => {
      const r = rail.getBoundingClientRect();
      if (r.width === 0) return true;
      const x = r.left + r.width / 2;
      // sample down the rail's own height — a single point misses a photograph
      // whose top edge sits between the counter and the label
      for (let i = 0; i <= 4; i += 1) {
        const y = r.top + (r.height * i) / 4;
        if (y < 0 || y > window.innerHeight) continue;
        const stack = document.elementsFromPoint(x, y);
        for (const node of stack) {
          if (node === rail || rail.contains(node)) continue;
          // the fixed top bar is chrome, not content; ignore it
          if (node.closest("header")) continue;
          if (node instanceof Element && node.matches(CONTENT)) return true;
        }
      }
      return false;
    };

    /*
     * Written straight to the node rather than held in React state.
     *
     * This updates at scroll frequency, so a state round-trip would re-render
     * the rail on every tick for a purely visual change. It also keeps working
     * where React defers timer-driven updates — a hidden or background tab
     * never commits them, which left the rail frozen on its mount-time verdict.
     */
    let shown: boolean | null = null;
    let pending: boolean | null = null;
    let pendingAt = 0;

    const commit = (next: boolean) => {
      shown = next;
      rail.style.opacity = next ? "1" : "0";
      rail.style.transform = `translateY(-50%) translateX(${next ? 0 : -18}px)`;
    };

    /*
     * Held for a beat before acting on it. Scrolling quickly past a single
     * photograph would otherwise flick the rail off and straight back on, which
     * reads as a glitch rather than as the rail stepping aside. Requiring the
     * verdict to hold still briefly turns those into one smooth move — except
     * for the very first one, which lands immediately so the rail doesn't
     * linger over content on load.
     */
    const SETTLE_MS = 90;

    const evaluate = () => {
      const next = roomInMargin() && !collides();
      if (next === shown) {
        pending = null;
        return;
      }
      if (shown === null) {
        commit(next);
        return;
      }
      const now = performance.now();
      if (next !== pending) {
        pending = next;
        pendingAt = now;
        return;
      }
      if (now - pendingAt >= SETTLE_MS) {
        pending = null;
        commit(next);
      }
    };

    /**
     * Watch the scroll position directly rather than trusting `scroll` events.
     * Lenis drives scrolling from its own loop, and a smooth-scroll library or
     * a programmatic jump can move the page without a `scroll` event ever
     * reaching this listener — which left the rail stuck on whatever verdict it
     * reached on mount. Polling the position in rAF costs nothing while the
     * page is still and can never miss a move.
     */
    let lastY = -1;
    let lastW = -1;
    let loop = 0;

    const check = () => {
      const y = window.scrollY;
      const w = window.innerWidth;
      // skip the hit-test while nothing has moved — unless a verdict is waiting
      // out its settle time, which needs another look to be committed
      if (y === lastY && w === lastW && pending === null) return;
      lastY = y;
      lastW = w;
      evaluate();
    };

    const tick = () => {
      check();
      loop = requestAnimationFrame(tick);
    };

    /*
     * Three ways in, because any one of them can go quiet: `scroll` never
     * fires for some programmatic and smooth-scroll moves, and rAF is frozen
     * outright in a background or non-compositing tab — measured at zero ticks
     * here. The interval is the floor: slower, but it always runs.
     */
    const settle = setTimeout(evaluate, 0);
    loop = requestAnimationFrame(tick);
    /*
     * The interval hit-tests unconditionally rather than going through the
     * position gate: content can move under a stationary rail without the page
     * scrolling at all — the reel is its own horizontal scroller, and images
     * settle as they decode — and none of that changes `scrollY`.
     */
    const poll = setInterval(evaluate, 200);
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);

    return () => {
      clearTimeout(settle);
      clearInterval(poll);
      cancelAnimationFrame(loop);
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [onHome]);

  /* ─── which frame are we on? ─── */
  useEffect(() => {
    if (!onHome) return;
    const ids = homeSections.map((sec) => sec.id);
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!hit) return;
        const i = ids.indexOf(hit.target.id);
        if (i >= 0) setIndex(i);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.6] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [onHome]);

  const label = homeSections[index]?.label ?? "";

  /*
   * Only the homepage has the sequence this counter counts. Returned after the
   * hooks rather than before them, so the hook order stays identical on every
   * route — bailing out earlier would change it as you navigate.
   */
  if (!onHome) return null;

  return (
    <aside
      ref={railRef}
      aria-hidden
      className="pointer-events-none fixed top-1/2 z-[80] hidden flex-col items-center gap-3 lg:flex"
      style={{
        left: `max(1rem, calc((100vw - var(--wide)) / 2 - 4.5rem))`,
        opacity: 0,
        transform: "translateY(-50%) translateX(-18px)",
        transition:
          "opacity .4s var(--ease-gate), transform .4s var(--ease-gate)",
      }}
    >
      <span
        className="font-mono text-[1.6rem] font-bold tabular-nums"
        style={{ color: "var(--accent-ink)" }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span
        className="font-mono text-[0.75rem]"
        style={{ color: "var(--text-dim)" }}
      >
        / {String(homeSections.length).padStart(2, "0")}
      </span>

      <span className="mt-1 flex flex-col gap-1.5">
        {homeSections.map((sec, i) => (
          <span
            key={sec.id}
            className="h-0.5"
            style={{
              width: i === index ? 22 : 14,
              background: i === index ? "var(--accent)" : "var(--line)",
              transition: "width .3s var(--ease-gate), background .3s",
            }}
          />
        ))}
      </span>

      <span
        className="mt-2 flex h-32 items-start font-mono text-[0.75rem] uppercase tracking-[0.22em]"
        style={{ writingMode: "vertical-rl", color: "var(--text-dim)" }}
      >
        {label}
      </span>
    </aside>
  );
}
