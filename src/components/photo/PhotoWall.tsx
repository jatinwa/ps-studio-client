"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/scroll/gsap";
import { plateReveal, PLATE_MEDIA } from "@/lib/scroll/reveals";
import { PhotoPlate } from "@/components/photo/PhotoPlate";
import type { Photo } from "@/lib/media/photos";

interface PhotoWallProps {
  photos: Photo[];
  /** Where this wall's reveals start in the deck, so sections keep varying. */
  seedOffset?: number;
  columns?: string;
  className?: string;
}

/**
 * A masonry wall of photographs, revealed together.
 *
 * The plates are revealed from here rather than each triggering itself, so a
 * row that crosses the fold together opens together with the stagger running
 * across it — a plate that triggered alone would animate out of step with its
 * neighbours.
 */
export function PhotoWall({
  photos,
  seedOffset = 0,
  columns = "columns-1 sm:columns-2 lg:columns-3",
  className = "",
}: PhotoWallProps) {
  const wallRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wall = wallRef.current;
    if (!wall) return;

    let stopGuard: (() => void) | void;
    const ctx = gsap.context(() => {
      const cells = gsap.utils
        .toArray<HTMLElement>(`.${PLATE_MEDIA}`, wall)
        .map((m) => m.parentElement)
        .filter((el): el is HTMLElement => el !== null);
      stopGuard = plateReveal(cells, { offset: seedOffset, stagger: 0.07 });
    }, wall);

    /*
     * Masonry columns rebalance as each lazily-loaded photograph arrives, so
     * every trigger measured before that is pointing at the wrong place.
     * Re-measuring once the images have settled is what keeps the reveals
     * firing where they should.
     */
    const imgs = Array.from(wall.querySelectorAll("img"));
    let pending = imgs.filter((i) => !i.complete).length;
    let settleTimer = 0;
    const remeasure = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => ScrollTrigger.refresh(), 160);
    };
    const onLoad = () => {
      pending -= 1;
      remeasure();
    };
    if (pending) {
      imgs.forEach((i) => {
        if (i.complete) return;
        i.addEventListener("load", onLoad, { once: true });
        i.addEventListener("error", onLoad, { once: true });
      });
    }

    return () => {
      window.clearTimeout(settleTimer);
      imgs.forEach((i) => {
        i.removeEventListener("load", onLoad);
        i.removeEventListener("error", onLoad);
      });
      stopGuard?.();
      ctx.revert();
    };
  }, [seedOffset, photos]);

  return (
    <div ref={wallRef} className={`${columns} gap-5 ${className}`}>
      {photos.map((p) => (
        <figure key={p.id} className="mb-5 break-inside-avoid">
          <PhotoPlate photo={p} selfReveal={false} hover className="w-full" />
        </figure>
      ))}
    </div>
  );
}
