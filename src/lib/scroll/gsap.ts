"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point. Importing ScrollTrigger from here guarantees the
 * plugin is registered exactly once, no matter which chapter mounts first.
 */
if (typeof window !== "undefined") {
  // registerPlugin is idempotent, and module evaluation only happens once.
  gsap.registerPlugin(ScrollTrigger);

  if (process.env.NODE_ENV !== "production") {
    Object.assign(window, { __gsap: gsap, __ScrollTrigger: ScrollTrigger });
  }
}

export { gsap, ScrollTrigger };
