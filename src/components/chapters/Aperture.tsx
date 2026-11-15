"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "@/lib/scroll/gsap";
import {
  shouldUseStaticLayout,
  useStaticLayout,
} from "@/lib/hooks/useStaticLayout";
import { landscape, photos, pick } from "@/lib/media/photos";
import { Frame } from "@/components/photo/Frame";
import { Sparkles } from "@/components/chrome/Sparkles";
import { LightRig } from "@/components/three/LightRig";
import { LensCore, type LensApi } from "@/components/three/LensCore";
import { studio } from "@/lib/studio";

/**
 * The frame the iris opens onto. Set it by id; the fallback keeps the opening
 * working if that photograph is ever removed from the catalogue.
 */
const OPENING_ID = "scroll";
const OPENING =
  photos.find((p) => p.id === OPENING_ID) ?? pick(landscape, 1, 0)[0];

/**
 * Beat 1–3 of the concept: the camera in the dark, the push toward the glass,
 * and the iris opening onto the studio's first photograph.
 */
export function Aperture() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const markRef = useRef<HTMLDivElement | null>(null);
  const wordmarkRef = useRef<HTMLDivElement | null>(null);
  const lensApi = useRef<LensApi | null>(null);
  const lensBoxRef = useRef<HTMLSpanElement | null>(null);
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
        const shape = `circle(${iris.r}% at ${x}% ${y}%)`;
        plate.style.clipPath = shape;
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
      /*
       * The section is 210vh, not 330. The whole sequence used to need nearly
       * three screens of scrolling before the photograph and its headline
       * settled, which is a long time to ask of someone deciding whether to
       * stay. The beat positions below are fractions of the section, so
       * shortening it speeds every step in proportion.
       *
       * The push, then the picture.
       *
       * The camera is dollied toward its own front element while it is still
       * on screen, so the first thing scrolling does is take you *into* the
       * glass. Only once you are at the element does the iris open, and the
       * photograph arrives through the lens rather than instead of it.
       *
       * The dolly is driven through the 3D camera, not a CSS scale — see the
       * note in LensCore. The wordmark beneath goes early, because it has no
       * business being readable once the lens fills the frame.
       */
      const push = { d: 0 };
      const driveDolly = () => lensApi.current?.setDolly(push.d);

      tl.to(wordmarkRef.current, { opacity: 0, y: -14, duration: 0.1 }, 0)
        .to(cueRef.current, { opacity: 0, duration: 0.06 }, 0)
        // 1. ride in to the front element
        .to(push, { d: 1, duration: 0.34, ease: "power1.inOut", onUpdate: driveDolly }, 0)
        /*
         * The canvas has to grow as well as the camera move in.
         * Dollying alone magnifies the lens *inside* a 175px box, which reads
         * as a tiny screen playing a zoom rather than as flying into glass.
         * Width is animated rather than scaled: the renderer's own
         * ResizeObserver follows it, so the canvas is re-rendered at the new
         * size instead of a small buffer being stretched.
         */
        .to(
          lensBoxRef.current,
          {
            width: () => window.innerWidth * 1.6,
            duration: 0.34,
            /*
             * Front-loaded. The canvas is transparent but finite, so until it
             * is bigger than the screen its edge clips the barrel and a
             * rectangle shows against the page — growing fast gets that
             * boundary off-screen before anyone can notice it.
             */
            ease: "power2.out",
          },
          0,
        )
        // the gold ring frames the lens at rest; once the approach starts it
        // is a hoop around something much larger than itself
        .to(ringRef.current, { opacity: 0, duration: 0.16, ease: "power2.in" }, 0.06)
        /*
         * 2. The glass opens — in ONE move, not two.
         *
         * This used to be a pair of tweens: out to 42% on a `power2.out`, then
         * on to 85% on a `power1.inOut`. The first decelerates to a stop and
         * the second accelerates from one, so the iris sat almost still around
         * 42% for a stretch of scroll — between 38% and 45% of the section it
         * moved two percent. That stall was the pause people felt between
         * arriving at the lens and the photograph showing up.
         *
         * A single tween cannot have a seam in the middle. It starts while the
         * camera is still travelling, so the glass is already half open at the
         * moment the push lands.
         */
        .to(
          iris,
          { r: 85, blend: 1, duration: 0.34, ease: "power2.out", onUpdate: applyIris },
          0.22,
        )
        .fromTo(
          plate,
          { scale: 1.22 },
          { scale: 1, duration: 0.34, ease: "power2.out" },
          0.22,
        )
        /*
         * 3. The camera dissolves — and this is what actually gated the
         * photograph.
         *
         * By the end of the push the canvas is ~2300px across and opaque, so
         * it covers the whole screen. The iris can be wide open underneath and
         * nothing shows until this fades: the picture was not late, it was
         * hidden behind the lens. The fade now runs *during* the approach and
         * is finished as the push lands, so arriving at the glass and seeing
         * through it are the same moment.
         */
        .to(markRef.current, { opacity: 0, duration: 0.16, ease: "power1.in" }, 0.2)
        .fromTo(
          titleRef.current?.children ?? [],
          { opacity: 0, y: 26 },
          { opacity: 1, y: 0, duration: 0.18, stagger: 0.05 },
          0.56,
        );
    }, section);

    return () => ctx.revert();
  }, [isStatic]);

  /*
   * Each child is a stagger step in the opening timeline, so the order here
   * is the order they arrive: label, headline, line, then the two ways out.
   */
  /*
   * Two treatments, because the type sits in two different places.
   *
   * Over the photograph it is white on a dark wash — a cream scrim strong
   * enough to carry dark text turns a night photograph milky, and this one is
   * shot after dark. Below the photograph, in the unpinned fallback, it sits
   * on the page and takes the theme's ink.
   *
   * White on a dark scrim also survives a change of opening frame: it reads
   * over a bright photograph as well as a dark one, which the reverse does not.
   */
  const titleBlock = (onPhoto: boolean) => (
    <div ref={titleRef} className="max-w-[34ch]">
      <p
        className="eyebrow mb-5"
        style={onPhoto ? { color: "rgba(255,255,255,0.74)" } : undefined}
      >
        {studio.discipline} · Since {studio.established}
      </p>
      <h1
        className={`display-type ${onPhoto ? "" : "text-ink"}`}
        style={onPhoto ? { color: "#fff" } : undefined}
      >
        Every frame a reason{" "}
        <span
          className={onPhoto ? "italic" : "italic text-accent"}
          style={onPhoto ? { color: "var(--accent-lift)" } : undefined}
        >
          to remember the day.
        </span>
      </h1>
      <p
        className="lede mt-6 max-w-[42ch]"
        style={onPhoto ? { color: "rgba(255,255,255,0.84)" } : undefined}
      >
        {studio.tagline}
      </p>
      {/*
        The opening had nowhere to go from it. Someone arrives convinced by
        the photograph and then has to hunt the menu for a way to enquire —
        these are the two things they actually want next.
      */}
      <div className="pointer-events-auto mt-8 flex flex-wrap items-center gap-4">
        <Link
          href="/work"
          className={`focus-frame mono-label border px-6 py-3.5 transition-colors duration-300 hover:border-accent hover:text-accent ${
            onPhoto ? "" : "border-[var(--line)] text-ink"
          }`}
          style={
            onPhoto
              ? { borderColor: "rgba(255,255,255,0.5)", color: "#fff" }
              : undefined
          }
        >
          See the work
        </Link>
        <Link
          href="/contact"
          className={`focus-frame mono-label px-2 py-3.5 transition-colors duration-300 hover:text-accent ${
            onPhoto ? "" : "text-ink-dim"
          }`}
          style={onPhoto ? { color: "rgba(255,255,255,0.8)" } : undefined}
        >
          Check your date &rarr;
        </Link>
      </div>
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
          {titleBlock(false)}
        </div>
      </section>
    );
  }

  return (
    <section
      id="opening"
      ref={sectionRef}
      aria-label="The opening frame"
      style={{ height: "210vh" }}
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
          {/*
            One full-bleed layer.

            This used to be two — a blurred backdrop with the picture
            contained on top — because the opening frame was a portrait only
            853px wide, which `cover` had to magnify 1.69x while discarding
            more than half the picture. This photograph is landscape and 7952px
            wide, so it fills the screen with no crop worth the name and plenty
            of resolution to spare.
          */}
          <Frame
            photo={OPENING}
            cover
            priority
            sizes="100vw"
            className="h-full w-full"
            alt={`Photograph by ${studio.name}`}
          />
          {/*
            Two gradients, not one. The bottom wash alone left the eyebrow and
            headline sitting on bright grass — these photographs are pale and
            high-key, so the type needs cover on the left where it actually
            sits, not only along the bottom edge.
          */}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(10,8,6,0.78) 0%, rgba(10,8,6,0.34) 36%, rgba(10,8,6,0) 66%), linear-gradient(to right, rgba(10,8,6,0.62) 0%, rgba(10,8,6,0.22) 38%, rgba(10,8,6,0) 62%)",
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
            /*
             * No ring, no border. This element survives because the iris
             * origin is measured from it and the canvas is positioned against
             * it — it is now purely a position, with a soft glow behind the
             * camera and nothing drawn around it.
             */
            className="relative mb-9 block aspect-square w-[clamp(7rem,15vw,11rem)]"
            style={{
              boxShadow: "0 0 110px 26px var(--glow)",
              borderRadius: "9999px",
            }}
          >
            {/*
              The camera overflows the ring rather than being clipped inside
              it. Masked to the circle, a rectangular body was sliced into
              wedges and read as a dark cog; here the ring stays as the glowing
              backdrop it always was and the camera sits in front of it.
            */}
            <span
              ref={lensBoxRef}
              className="absolute left-1/2 top-1/2 block w-[180%] -translate-x-1/2 -translate-y-1/2"
              style={{ aspectRatio: "4 / 3" }}
            >
              <LensCore apiRef={lensApi} />
            </span>
          </span>
          {/*
            The studio's own wordmark, in place of the name set in a stand-in
            font. Masked, so it takes the theme's ink colour in both skins.

            Grouped so it can leave on its own, ahead of the camera: once the
            push begins the lens fills the frame and type underneath it is
            just something to read through.
          */}
          <div ref={wordmarkRef} className="flex flex-col items-center">
            <span
              aria-hidden
              className="wordmark w-[clamp(12rem,36vw,23rem)] text-ink"
            />
            <span className="sr-only">{studio.name}</span>
            <p className="mono-label mt-4">{studio.discipline}</p>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 z-20 flex items-end">
          <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)] pb-[clamp(2rem,7vh,5rem)] pt-24">
            {titleBlock(true)}
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
