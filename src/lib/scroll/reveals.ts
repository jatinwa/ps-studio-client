"use client";

import { gsap, ScrollTrigger } from "@/lib/scroll/gsap";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";

/** The element inside each plate that carries the photograph. */
export const PLATE_MEDIA = "plate-media";
/** Optional light sweep, animated after the plate opens. */
export const PLATE_SHEEN = "plate-sheen";

interface Variant {
  name: string;
  /** The frame itself: how it is cut open. */
  cell: { from: gsap.TweenVars; to: gsap.TweenVars };
  /** The photograph inside it: how it settles. */
  media: { from: gsap.TweenVars; to: gsap.TweenVars };
  cellDur: number;
  mediaDur: number;
  ease: string;
}

/*
 * Every variant moves the frame AND the photograph inside it, on different
 * curves and different durations — the frame opens, and the photograph comes
 * to rest a beat later. That counter-motion is what stops a reveal reading as
 * a single flat fade.
 *
 * The shapes are kept type-consistent within a variant (inset to inset, circle
 * to circle, four points to four points) because that is the only way the
 * interpolation is defined; mixing shape functions makes a clip-path jump
 * rather than animate.
 */
const VARIANTS: Variant[] = [
  {
    // the shutter travelling up the gate
    name: "shutter",
    cell: {
      from: { clipPath: "inset(100% 0% 0% 0%)" },
      to: { clipPath: "inset(0% 0% 0% 0%)" },
    },
    media: {
      from: { scale: 1.3, yPercent: -6 },
      to: { scale: 1, yPercent: 0 },
    },
    cellDur: 1.1,
    mediaDur: 1.5,
    ease: "power3.out",
  },
  {
    // the aperture, echoing the hero
    name: "iris",
    cell: {
      from: { clipPath: "circle(0% at 50% 50%)" },
      to: { clipPath: "circle(75% at 50% 50%)" },
    },
    media: {
      from: { scale: 1.42, rotate: 3 },
      to: { scale: 1, rotate: 0 },
    },
    cellDur: 1.25,
    mediaDur: 1.6,
    ease: "power3.out",
  },
  {
    // curtains parting from the centre
    name: "curtain",
    cell: {
      from: { clipPath: "inset(0% 50% 0% 50%)" },
      to: { clipPath: "inset(0% 0% 0% 0%)" },
    },
    media: {
      from: { scaleX: 1.32, scaleY: 1.12 },
      to: { scaleX: 1, scaleY: 1 },
    },
    cellDur: 1.15,
    mediaDur: 1.55,
    ease: "expo.out",
  },
  {
    // dropping in from the top edge
    name: "blinds",
    cell: {
      from: { clipPath: "inset(0% 0% 100% 0%)" },
      to: { clipPath: "inset(0% 0% 0% 0%)" },
    },
    media: {
      from: { scale: 1.26, yPercent: 9 },
      to: { scale: 1, yPercent: 0 },
    },
    cellDur: 1.1,
    mediaDur: 1.5,
    ease: "power3.out",
  },
  {
    // the print coming up in the tray
    name: "develop",
    cell: {
      from: { opacity: 0, scale: 1.05 },
      to: { opacity: 1, scale: 1 },
    },
    media: {
      from: { filter: "blur(16px) saturate(0.35)", scale: 1.3 },
      to: { filter: "blur(0px) saturate(1)", scale: 1 },
    },
    cellDur: 1,
    mediaDur: 1.7,
    ease: "power2.out",
  },
  {
    // a blade sweeping across the corner
    name: "diagonal",
    cell: {
      from: {
        clipPath: "polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)",
      },
      to: {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
      },
    },
    media: {
      from: { scale: 1.3, rotate: -2.5 },
      to: { scale: 1, rotate: 0 },
    },
    cellDur: 1.3,
    mediaDur: 1.6,
    ease: "power3.out",
  },
  {
    // the frame growing outward from the middle of the picture
    name: "grow",
    cell: {
      from: { clipPath: "inset(16% 16% 16% 16%)" },
      to: { clipPath: "inset(0% 0% 0% 0%)" },
    },
    media: {
      from: { scale: 1.38 },
      to: { scale: 1 },
    },
    cellDur: 1.2,
    mediaDur: 1.65,
    ease: "expo.out",
  },
];

/*
 * Plates are dealt their reveals in shuffled blocks: each run of seven uses
 * all seven exactly once, in an order that differs from block to block.
 *
 * A modular stride was the obvious approach and it is subtly wrong — any
 * `i * k` pattern makes index i and i + n land on the same variant for some
 * small n, which showed up on the page as ABAB: grow, curtain, grow. Dealing
 * from a shuffled deck cannot produce that, and guarantees the eye sees every
 * variant before any of them comes round again.
 *
 * Deterministic rather than actually random, so a photograph gets the same
 * reveal on every load and nothing changes under the visitor between renders.
 */
const deck = new Map<number, number[]>();

function blockOrder(block: number): number[] {
  const cached = deck.get(block);
  if (cached) return cached;

  const order = VARIANTS.map((_, i) => i);
  // a small deterministic PRNG — the block number is the whole seed
  let seed = (block * 2654435761 + 1) >>> 0;
  const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  // a shuffle can still butt the same variant against the previous block's
  // last card, which is the one adjacency the deck cannot rule out by itself
  if (block > 0) {
    const previous = blockOrder(block - 1);
    if (order[0] === previous[previous.length - 1]) {
      [order[0], order[1]] = [order[1], order[0]];
    }
  }

  deck.set(block, order);
  return order;
}

export function variantFor(index: number): Variant {
  const size = VARIANTS.length;
  const i = Math.max(0, Math.floor(index));
  return VARIANTS[blockOrder(Math.floor(i / size))[i % size]];
}

export const variantNames = VARIANTS.map((v) => v.name);

interface RevealOptions {
  /** Delay between plates that cross the line together. */
  stagger?: number;
  start?: string;
  /** Index of the first plate, so variants keep varying across sections. */
  offset?: number;
}

const mediaOf = (cell: Element) =>
  cell.querySelector<HTMLElement>(`.${PLATE_MEDIA}`);

/** The light sweep that crosses a plate just after it opens. */
function playSheen(cell: HTMLElement, delay: number) {
  const sheen = cell.querySelector<HTMLElement>(`.${PLATE_SHEEN}`);
  if (!sheen) return;
  const tl = gsap.timeline({ delay: delay + 0.3 });
  tl.fromTo(sheen, { xPercent: -140, opacity: 0 }, { opacity: 0.5, duration: 0.22 })
    .to(sheen, { xPercent: 140, duration: 0.9, ease: "power2.inOut" }, 0)
    .to(sheen, { opacity: 0, duration: 0.34 }, 0.56);
}

/**
 * Give each plate its own entrance, played when it reaches the fold.
 *
 * Call inside a `gsap.context` so the caller's cleanup reverts it.
 */
export function plateReveal(
  cells: HTMLElement[],
  { stagger = 0.08, start = "top 88%", offset = 0 }: RevealOptions = {},
): (() => void) | void {
  if (prefersReducedMotion() || !cells.length) return;

  const variants = cells.map((_, i) => variantFor(i + offset));

  /*
   * The closed state is set from here, never from CSS or the server. If this
   * never runs — it is skipped outright under reduced motion, and would not
   * run at all if the bundle failed — the photographs must still be on the
   * page, not clipped to nothing waiting for an animation that never comes.
   */
  cells.forEach((cell, i) => {
    cell.dataset.reveal = variants[i].name;
    gsap.set(cell, variants[i].cell.from);
    const media = mediaOf(cell);
    if (media) gsap.set(media, variants[i].media.from);
  });

  /*
   * Anything already level with or above the fold is opened outright. A batch
   * only fires on crossing its start, so a restored scroll position or a link
   * straight into a section lands with the entrance already in the past — and
   * those plates would sit clipped to nothing, permanently.
   */
  const settle = (cell: HTMLElement, i: number) => {
    cell.dataset.revealed = "1";
    gsap.set(cell, variants[i].cell.to);
    const media = mediaOf(cell);
    if (media) gsap.set(media, variants[i].media.to);
  };

  cells.forEach((cell, i) => {
    if (cell.getBoundingClientRect().top >= window.innerHeight * 0.88) return;
    settle(cell, i);
  });

  const play = (cell: HTMLElement, i: number, delay: number) => {
    cell.dataset.revealed = "1";
    const v = variants[i];
    gsap.to(cell, {
      ...v.cell.to,
      duration: v.cellDur,
      ease: v.ease,
      delay,
      overwrite: true,
    });
    const media = mediaOf(cell);
    if (media) {
      gsap.to(media, {
        ...v.media.to,
        duration: v.mediaDur,
        ease: v.ease,
        delay,
        overwrite: true,
        // the blur variant is the only one that needs it, and leaving a filter
        // layer behind on every plate costs memory for nothing
        onComplete: () => media.style.removeProperty("will-change"),
      });
    }
    playSheen(cell, delay);
  };

  const indexOf = new Map(cells.map((c, i) => [c, i]));

  /*
   * The stagger is capped, not merely small.
   *
   * A batch is as large as the number of plates that crossed the line
   * together, and on the 61-frame work page a fast scroll hands it twenty at
   * once — at a flat `n * stagger` the last of them waits over a second
   * before it even begins, on top of its own duration, and sits visibly blank
   * meanwhile. Capping the spread keeps the sweep across a row while putting
   * a ceiling on how long any one plate can be left empty.
   */
  const MAX_SPREAD = 0.6;

  ScrollTrigger.batch(cells, {
    start,
    once: true,
    onEnter: (batch) =>
      batch.forEach((el, n) => {
        const cell = el as HTMLElement;
        play(cell, indexOf.get(cell) ?? 0, Math.min(n * stagger, MAX_SPREAD));
      }),
  });

  /*
   * A watchdog, because the batch's measured start positions can go stale.
   *
   * A masonry wall of lazily-loaded photographs reflows as the images arrive
   * and the columns rebalance, which moves plates out from under the start
   * they were measured against — on the 61-frame work page that left three
   * of them clipped shut while fully on screen. Rather than trusting the
   * bookkeeping, this asserts the invariant directly: anything on screen and
   * still closed gets opened. It stops itself once every plate is open, so it
   * costs nothing for the rest of the visit.
   */
  /*
   * Two details matter here.
   *
   * It plays the reveal rather than snapping the plate open, so a plate the
   * batch missed still animates instead of appearing fully formed.
   *
   * And it waits until the plate is clearly past the line the batch triggers
   * on. Sweeping at a looser threshold would fire *before* the batch got its
   * turn, and the watchdog would quietly become the thing that reveals every
   * plate — stagger and all — instead of the safety net it is meant to be.
   */
  const LATE = 0.78;

  const sweep = () => {
    let remaining = 0;
    cells.forEach((cell, i) => {
      if (cell.dataset.revealed === "1") return;
      const r = cell.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight * LATE) {
        play(cell, indexOf.get(cell) ?? i, 0);
      } else {
        remaining += 1;
      }
    });
    return remaining;
  };

  let guard = 0;
  let queued = false;
  const stop = () => {
    window.clearInterval(guard);
    window.removeEventListener("scroll", onScroll);
    ScrollTrigger.removeEventListener("refresh", sweep);
  };
  const run = () => {
    if (sweep() === 0) stop();
  };
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      run();
    });
  }

  guard = window.setInterval(run, 300);
  window.addEventListener("scroll", onScroll, { passive: true });
  ScrollTrigger.addEventListener("refresh", sweep);

  // the interval and the listeners live outside gsap's context, so the caller
  // disposes them with this
  return stop;
}
