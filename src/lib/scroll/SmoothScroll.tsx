"use client";

import Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { gsap, ScrollTrigger } from "./gsap";
import {
  prefersReducedMotion,
  useReducedMotion,
} from "@/lib/hooks/useReducedMotion";

interface SmoothScrollApi {
  /** Jump to an element or offset. Works with or without Lenis active. */
  scrollTo: (target: string | number | HTMLElement, offset?: number) => void;
  stop: () => void;
  start: () => void;
}

const SmoothScrollContext = createContext<SmoothScrollApi>({
  scrollTo: () => {},
  stop: () => {},
  start: () => {},
});

export const useSmoothScroll = () => useContext(SmoothScrollContext);

/**
 * Lenis driven by GSAP's ticker, with ScrollTrigger updated from Lenis's own
 * scroll event. Two rules matter here:
 *
 *  · ONE raf loop. Lenis must not run its own — `autoRaf: false` and we pump it
 *    from `gsap.ticker`, otherwise ScrollTrigger reads a scroll position that is
 *    a frame behind and pinned sequences visibly lag the cursor.
 *  · `lagSmoothing(0)`. GSAP's default lag smoothing skips time after a long
 *    frame, which desynchronises scrub position from scroll position.
 *
 * Under `prefers-reduced-motion` Lenis is never constructed: the page uses
 * native scrolling and ScrollTrigger falls back to its own listeners.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || prefersReducedMotion()) {
      ScrollTrigger.refresh();
      return;
    }

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch devices get native momentum; emulating it feels worse and
      // fights the browser's own overscroll behaviour.
      syncTouch: false,
      touchMultiplier: 1.6,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    const onScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onScroll);

    /**
     * Lenis only emits for scrolling it drives itself — wheel and touch. It does
     * not intercept the keyboard, so arrow keys, Space, PageDown, Home/End,
     * find-in-page and scrollbar drags all scroll natively and would otherwise
     * leave every ScrollTrigger frozen. This keeps keyboard users in sync.
     */
    window.addEventListener("scroll", onScroll, { passive: true });

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    /**
     * Re-measure whenever the page's height can still change.
     *
     * ScrollTrigger caches every pin's start/end offset the moment it is
     * created. Plates and sequence frames finish decoding *after* that, and
     * each one that lands shifts the document — measured at over 200px on this
     * page. The cached offsets then no longer match reality, so pins engage at
     * the wrong scroll position and the pinned chapter appears clipped off at
     * the top. Refreshing on every event that can move layout keeps them honest.
     */
    const refresh = () => ScrollTrigger.refresh();

    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh).catch(() => {});

    // Images decode over time; watch the document height instead of guessing.
    let lastHeight = document.body.scrollHeight;
    let settle: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      const h = document.body.scrollHeight;
      if (Math.abs(h - lastHeight) < 4) return;
      lastHeight = h;
      clearTimeout(settle);
      settle = setTimeout(refresh, 120);
    });
    ro.observe(document.body);

    ScrollTrigger.refresh();

    return () => {
      window.removeEventListener("load", refresh);
      ro.disconnect();
      clearTimeout(settle);
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.off("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reduced]);

  const scrollTo = useCallback(
    (target: string | number | HTMLElement, offset = 0) => {
      const lenis = lenisRef.current;
      if (lenis) {
        lenis.scrollTo(target, { offset, duration: 1.2 });
        return;
      }
      // Reduced-motion / pre-init path.
      const el =
        typeof target === "string" ? document.querySelector(target) : target;
      if (typeof target === "number") {
        window.scrollTo({ top: target + offset, behavior: "auto" });
      } else if (el instanceof HTMLElement) {
        window.scrollTo({ top: el.offsetTop + offset, behavior: "auto" });
      }
    },
    [],
  );

  const stop = useCallback(() => lenisRef.current?.stop(), []);
  const start = useCallback(() => lenisRef.current?.start(), []);

  return (
    <SmoothScrollContext.Provider value={{ scrollTo, stop, start }}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
