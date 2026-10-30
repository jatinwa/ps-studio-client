"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "@/lib/scroll/gsap";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";

interface ParallaxProps {
  children: ReactNode;
  /** Travel as a percentage of the element's own height, each way. */
  amount?: number;
  className?: string;
}

/**
 * Drifts its contents against the page as the section passes.
 *
 * The travel is expressed as a share of the element's own height and paid for
 * out of a fixed over-scale, so there is no geometry to measure and nothing to
 * recompute on resize — at `scale: 1.1` there is 5% of headroom top and bottom,
 * and the drift stays inside it at any size. Translating by pixels instead
 * would need the height, which an aspect-ratio box only knows after layout.
 */
export function Parallax({
  children,
  amount = 4,
  className = "",
}: ParallaxProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const frame = frameRef.current;
    const inner = innerRef.current;
    if (!frame || !inner) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        inner,
        { yPercent: amount, scale: 1.1 },
        {
          yPercent: -amount,
          ease: "none",
          scrollTrigger: {
            trigger: frame,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.9,
            invalidateOnRefresh: true,
          },
        },
      );
    }, frame);

    return () => ctx.revert();
  }, [amount]);

  return (
    <div ref={frameRef} className={`overflow-hidden ${className}`}>
      <div ref={innerRef} className="h-full w-full will-change-transform">
        {children}
      </div>
    </div>
  );
}
