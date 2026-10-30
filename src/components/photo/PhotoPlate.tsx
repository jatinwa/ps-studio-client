"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/scroll/gsap";
import { plateReveal, PLATE_MEDIA, PLATE_SHEEN } from "@/lib/scroll/reveals";
import { Frame } from "@/components/photo/Frame";
import type { Photo } from "@/lib/media/photos";

interface PhotoPlateProps {
  photo: Photo;
  sizes?: string;
  className?: string;
  /** Fill the container and crop, instead of keeping the photo's own shape. */
  cover?: boolean;
  priority?: boolean;
  alt?: string;
  /** Picks which reveal this plate gets. Vary it to vary the motion. */
  seed?: number;
  /** Push the photograph in slightly while the pointer is over it. */
  hover?: boolean;
  /**
   * Leave false when a parent reveals a whole group of plates at once. A grid
   * wants one batch so a row opens together with the stagger running across
   * it; a plate that triggers itself would animate alone.
   */
  selfReveal?: boolean;
}

/**
 * A single photograph with one of the site's reveals — the same set the
 * contact sheet draws from, for photographs that stand on their own rather
 * than in a grid. The motion lives entirely in `plateReveal`; this supplies
 * the elements it animates.
 */
export function PhotoPlate({
  photo,
  sizes,
  className = "",
  cover = false,
  priority = false,
  alt,
  seed = 0,
  hover = false,
  selfReveal = true,
}: PhotoPlateProps) {
  const cellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cell = cellRef.current;
    if (!cell || !selfReveal) return;
    let stopGuard: (() => void) | void;
    const ctx = gsap.context(() => {
      stopGuard = plateReveal([cell], { offset: seed });
    }, cell);
    return () => {
      stopGuard?.();
      ctx.revert();
    };
  }, [seed, selfReveal]);

  /*
   * `h-full` only resolves against a definite height. A cropping plate is
   * given one by its container (`h-56` on a card), so the chain works; an
   * uncropped one is sized by the photograph's own aspect ratio, and forcing
   * `h-full` down that chain collapses it. So the fill classes follow `cover`.
   */
  const fill = cover ? "h-full w-full" : "w-full";

  return (
    <div
      ref={cellRef}
      className={`group relative overflow-hidden ${className}`}
    >
      {/*
        Two wrappers on purpose. GSAP writes an inline transform on the media
        element for the settle, and an inline transform beats any hover class
        — so the hover push lives on its own element where the two cannot
        overwrite each other.
      */}
      <div className={`${PLATE_MEDIA} ${fill}`}>
        <div
          className={`${fill} ${
            hover
              ? "transition-transform duration-700 ease-[var(--ease-gate)] group-hover:scale-[1.05]"
              : ""
          }`}
        >
          <Frame
            photo={photo}
            sizes={sizes}
            cover={cover}
            priority={priority}
            alt={alt}
            className={fill}
          />
        </div>
      </div>

      <span
        aria-hidden
        className={`${PLATE_SHEEN} pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0`}
        style={{
          background:
            "linear-gradient(100deg, transparent, color-mix(in srgb, var(--bg) 70%, transparent), transparent)",
        }}
      />
    </div>
  );
}
