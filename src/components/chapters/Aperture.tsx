"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/scroll/gsap";
import {
  shouldUseStaticLayout,
  useStaticLayout,
} from "@/lib/hooks/useStaticLayout";
import { landscape, pick } from "@/lib/media/photos";
import { Frame } from "@/components/photo/Frame";
import { Sparkles } from "@/components/chrome/Sparkles";
import { LightRig } from "@/components/three/LightRig";
import { LensCore } from "@/components/three/LensCore";
import { studio } from "@/lib/studio";

/** The frame the iris opens onto. Swap the offset to choose a different one. */
const OPENING = pick(landscape, 1, 0)[0];

/**
 * Beat 1–3 of the concept: the camera in the dark, the push toward the glass,
 * and the iris opening onto the studio's first photograph.
 */
export function Aperture() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const markRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLSpanElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const isStatic = useStaticLayout();

  useEffect(() => {
    if (isStatic || shouldUseStaticLayout()) return;
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (!section || !pin) return;

    const ctx = gsap.context(() => {
      const plate = plateRef.current;

      /*
       * The iris has to open from the lens, not from the middle of the screen.
       * The ring sits above centre — the wordmark under it pushes the whole
       * stack up — so a circle at 50% 50% blooms out of empty space below the
       * glass. Measured from layout offsets rather than a bounding rect, since
       * the ring is being tweened away at the same time and a rect would come
       * back with that transform already applied.
       */
      const origin = { x: 50, y: 50 };
      const measure = () => {
        const ring = ringRef.current;
        const mark = markRef.current;
        if (!ring || !mark || !mark.offsetWidth || !mark.offsetHeight) return;
        origin.x =
          ((ring.offsetLeft + ring.offsetWidth / 2) / mark.offsetWidth) * 100;
        origin.y =
          ((ring.offsetTop + ring.offsetHeight / 2) / mark.offsetHeight) * 100;
      };

      /*
       * `blend` walks the centre from the lens to the middle of the frame as
       * the blades open, so the shot starts inside the glass and settles on the
       * photograph. Driven through a proxy and written by hand — interpolating
       * two `circle()` strings leaves the centre to the CSS plugin, and this
       * needs the centre to move on a curve of its own.
       */
      const iris = { r: 0, blend: 0 };
      const applyIris = () => {
        if (!plate) return;
        const x = origin.x + (50 - origin.x) * iris.blend;
        const y = origin.y + (50 - origin.y) * iris.blend;
        plate.style.clipPath = `circle(${iris.r}% at ${x}% ${y}%)`;
      };

      measure();
      applyIris();

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          pin,
          pinSpacing: false,
          scrub: 0.4,
          invalidateOnRefresh: true,
          // the ring moves with the type, so re-find it whenever layout changes
          onRefresh: () => {
            measure();
            applyIris();
          },
        },
      });

      /*
       * Every beat is placed against the full 0–1 range on purpose.
       *
       * These used to start at 0.09 and finish at 0.72, which over a 2150px
       * trigger meant ~250px of scrolling before the iris moved at all and
       * ~600px of nothing after the title landed. The opening now answers the
       * first pixel of scroll, and the hold at the end is what is left over,
       * not most of the section.
       */
      tl.to(markRef.current, { opacity: 0, y: -16, duration: 0.09 }, 0)
        .to(cueRef.current, { opacity: 0, duration: 0.06 }, 0)
        // the aperture blades swing open, centred on the lens
        .to(iris, { r: 42, duration: 0.2, ease: "power2.out", onUpdate: applyIris }, 0.01)
        .fromTo(plate, { scale: 1.22 }, { scale: 1.1, duration: 0.2, ease: "power2.out" }, 0.01)
        // ...then widen, drifting onto the centre of the frame
        .to(
          iris,
          { r: 85, blend: 1, duration: 0.34, ease: "power1.inOut", onUpdate: applyIris },
          0.26,
        )
        .to(plate, { scale: 1, duration: 0.34, ease: "power1.inOut" }, 0.26)
        .fromTo(
          titleRef.current?.children ?? [],
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.18, stagger: 0.05 },
          0.56,
        );
    }, section);

    return () => ctx.revert();
  }, [isStatic]);

  const title = (
    <div ref={titleRef} className="max-w-[34ch]">
      <p className="eyebrow mb-5">Frame 01 — {studio.locationLine}</p>
      <h1 className="display-type text-ink">
        Every frame a reason{" "}
        <span className="italic text-accent">to remember the day.</span>
      </h1>
      <p className="lede mt-6 max-w-[42ch]">{studio.tagline}</p>
    </div>
  );

  /* ─── short viewport / reduced motion: no pinning, no iris ─── */
  if (isStatic) {
    return (
      <section id="opening" className="relative w-full">
        <Frame
          photo={OPENING}
          cover
          priority
          sizes="100vw"
          className="h-[70vh] w-full"
          alt={`Photograph by ${studio.name}`}
        />
        <div data-measure
            className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)] py-14">
          {title}
        </div>
      </section>
    );
  }

  return (
    <section
      id="opening"
      ref={sectionRef}
      aria-label="The opening frame"
      style={{ height: "330vh" }}
      className="relative w-full"
    >
      <div
        ref={pinRef}
        className="relative flex h-screen w-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: "var(--bg)" }}
      >
        {/* the frame the iris opens onto */}
        <div
          ref={plateRef}
          className="absolute inset-0"
          style={{ clipPath: "circle(0% at 50% 50%)", willChange: "transform, clip-path" }}
        >
          <Frame
            photo={OPENING}
            cover
            priority
            sizes="100vw"
            className="h-full w-full"
            alt={`Photograph by ${studio.name}`}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, color-mix(in srgb, var(--bg) 82%, transparent), transparent 55%)",
            }}
          />
        </div>

        {/* the lighting rig swings in from the wings */}
        <LightRig className="z-[10]" />

        {/* dust in the dark, lit by the cursor */}
        <Sparkles className="z-[5]" />

        {/* the lens at rest */}
        <div
          ref={markRef}
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center px-[var(--pad)] text-center"
        >
          {/*
            Sized up from a flat 7rem: the ring is no longer an empty mark but
            a mount, and a lens barrel with a nine-bladed iris in it is not
            legible at 112px. Clamped so it still fits a phone.
          */}
          <span
            ref={ringRef}
            aria-hidden
            className="mb-9 block aspect-square w-[clamp(7rem,15vw,11rem)] rounded-full border"
            style={{
              borderColor: "var(--accent)",
              boxShadow: "0 0 90px 10px var(--glow), inset 0 0 40px var(--glow)",
            }}
          >
            <LensCore />
          </span>
          {/*
            The studio's own wordmark, in place of the name set in a stand-in
            font. Masked, so it takes the theme's ink colour in both skins.
          */}
          <span
            aria-hidden
            className="wordmark w-[clamp(12rem,36vw,23rem)] text-ink"
          />
          <span className="sr-only">{studio.name}</span>
          <p className="mono-label mt-4">{studio.discipline}</p>
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex items-end">
          <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)] pb-[clamp(2rem,7vh,5rem)] pt-24">
            {title}
          </div>
        </div>

        <div
          ref={cueRef}
          className="pointer-events-none absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2"
        >
          <span className="mono-label">Scroll</span>
          <span
            className="relative block h-9 w-px overflow-hidden"
            style={{ background: "var(--line)" }}
          >
            <span
              className="scroll-hint-line absolute inset-x-0 top-0 h-full"
              style={{ background: "var(--accent)" }}
            />
          </span>
        </div>
      </div>
    </section>
  );
}
