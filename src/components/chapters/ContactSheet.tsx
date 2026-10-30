"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/scroll/gsap";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";
import { plateReveal, PLATE_MEDIA, PLATE_SHEEN } from "@/lib/scroll/reveals";
import { portrait, pick } from "@/lib/media/photos";
import { Frame } from "@/components/photo/Frame";
import { Reveal } from "@/components/ui/Reveal";

const SHEET = pick(portrait, 12, 0);

/**
 * Beat 4 of the concept: the contact sheet.
 *
 * This replaced a horizontal scroller. A sideways reel reads well in a concept
 * document but asks the visitor to change how they scroll halfway down a page,
 * and on a trackpad it fights the vertical scroll it sits inside. A real
 * contact sheet is a grid anyway — equal frames, numbered, in the order they
 * were shot — so the grid is both the more honest object and the easier one to
 * read.
 *
 * The motion carries the film idea instead: each frame is cut open by one of
 * the site's reveals — no two neighbours get the same one — the photograph
 * inside settles out of an over-scale, a light sweep crosses it, and the rows
 * drift at slightly different rates as the sheet passes the viewport.
 */
export function ContactSheet() {
  const gridRef = useRef<HTMLUListElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const grid = gridRef.current;
    const section = sectionRef.current;
    if (!grid || !section) return;

    let stopGuard: (() => void) | void;
    const ctx = gsap.context(() => {
      const cells = gsap.utils.toArray<HTMLElement>(".sheet-cell", grid);
      if (!cells.length) return;

      /*
       * Batched, so a row that crosses the line together opens together with
       * the stagger running across it. Triggering each frame on its own would
       * give twelve unrelated animations instead of one sweep across the row.
       */
      stopGuard = plateReveal(cells);

      /*
       * Drift. Four depths cycled across the grid, so neighbouring frames
       * never travel at quite the same rate and the sheet reads as layered
       * rather than as one flat block. Kept small — enough to feel alive,
       * not enough to open visible gaps between the rows.
       */
      const DEPTHS = [0, 26, 11, 34];
      cells.forEach((cell, i) => {
        const depth = DEPTHS[i % DEPTHS.length];
        if (!depth) return;
        gsap.fromTo(
          cell,
          { y: depth },
          {
            y: -depth,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.9,
              invalidateOnRefresh: true,
            },
          },
        );
      });
    }, section);

    return () => {
      stopGuard?.();
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="reel"
      ref={sectionRef}
      aria-label="Contact sheet"
      className="w-full overflow-hidden py-[clamp(3rem,9vh,6rem)]"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <Reveal className="mx-auto mb-10 w-full max-w-[var(--wide)] px-[var(--pad)]">
        <p className="eyebrow">Frame 02 — The contact sheet</p>
        <h2 className="title-type mt-3 max-w-[20ch] text-ink">
          The day, in the order it happened.
        </h2>
        <p className="lede mt-3 max-w-[48ch]">
          Twelve frames off the sheet, uncropped and unreordered.
        </p>
      </Reveal>

      <div
        aria-hidden
        className="sprocket-edge h-5 w-full"
        style={{ borderTop: "1px solid var(--line)" }}
      />

      <ul
        ref={gridRef}
        className="mx-auto grid w-full max-w-[var(--wide)] grid-cols-2 gap-3 px-[var(--pad)] py-10 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
      >
        {SHEET.map((p, i) => (
          <li
            key={p.id}
            className="sheet-cell group relative aspect-[4/5] overflow-hidden will-change-transform"
            style={{ background: "var(--bg)" }}
          >
            {/*
              Two wrappers on purpose. GSAP writes an inline transform on the
              media element for the settle, and an inline transform beats any
              hover class — so the hover push lives on its own element where
              the two can't overwrite each other.
            */}
            <div className={`${PLATE_MEDIA} h-full w-full`}>
              <div className="h-full w-full transition-transform duration-700 ease-[var(--ease-gate)] group-hover:scale-[1.05]">
                <Frame
                  photo={p}
                  cover
                  sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 17rem"
                  className="h-full w-full"
                />
              </div>
            </div>

            {/* the frame number, the way it is notched on a real sheet */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-2 top-2 font-mono text-[0.58rem] tracking-[0.18em]"
              style={{
                color: "var(--bg)",
                textShadow: "0 1px 6px rgba(0,0,0,0.55)",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <span
              aria-hidden
              className={`${PLATE_SHEEN} pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0`}
              style={{
                background:
                  "linear-gradient(100deg, transparent, color-mix(in srgb, var(--bg) 70%, transparent), transparent)",
              }}
            />

            {/* a held frame lifts out of the sheet */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                boxShadow: "inset 0 0 0 1px var(--accent)",
              }}
            />
          </li>
        ))}
      </ul>

      <div
        aria-hidden
        className="sprocket-edge h-5 w-full"
        style={{ borderBottom: "1px solid var(--line)" }}
      />
    </section>
  );
}
