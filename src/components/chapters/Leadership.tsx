"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/scroll/gsap";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";
import { byId } from "@/lib/media/photos";
import { Frame } from "@/components/photo/Frame";
import { Reveal } from "@/components/ui/Reveal";
import { leadership, studio } from "@/lib/studio";

/**
 * The people behind the studio.
 *
 * Circular portraits, for two reasons. One is that they unify three pictures
 * that arrived in three different shapes — 410px square, 3100px square and an
 * 844x1016 portrait. The other is that the Chairman's photograph already has
 * a circular vignette burnt into it on white; cropped to anything with corners
 * that white shows against the warm page, and in a circle it simply does not
 * exist.
 *
 * Each portrait also turns slightly with the pointer — the same idea as the
 * camera in the opening, so the page feels of a piece.
 */
export function Leadership() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const root = rootRef.current;
    if (!root) return;

    let cleanup = () => {};
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".leader", root);
      if (!cards.length) return;

      /*
       * Set from JS so the section is simply visible if this never runs, and
       * opened outright for anything already past the fold on load.
       */
      gsap.set(cards, { opacity: 0, y: 54 });
      const past = cards.filter(
        (c) => c.getBoundingClientRect().top < window.innerHeight * 0.85,
      );
      if (past.length) gsap.set(past, { opacity: 1, y: 0 });

      const open = (batch: HTMLElement[], stagger: number) => {
        batch.forEach((c) => (c.dataset.shown = "1"));
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "power3.out",
          stagger,
          overwrite: true,
        });
      };

      ScrollTrigger.batch(cards, {
        start: "top 86%",
        once: true,
        onEnter: (batch) => open(batch as HTMLElement[], 0.14),
      });

      /*
       * A watchdog, for the same reason the galleries have one.
       *
       * A large photograph sits above this section and shifts the page as it
       * loads, which moves these cards out from under the start they were
       * measured against — the batch then never fires and they stay invisible
       * for good. Rather than trusting the measurement, this checks the
       * invariant directly and stops itself once every card is shown.
       */
      let guard = 0;
      const sweep = () => {
        const hidden = cards.filter((c) => c.dataset.shown !== "1");
        const late = hidden.filter(
          (c) => c.getBoundingClientRect().top < window.innerHeight * 0.78,
        );
        if (late.length) open(late, 0.1);
        if (hidden.length - late.length === 0) {
          window.clearInterval(guard);
          window.removeEventListener("scroll", sweep);
        }
      };
      guard = window.setInterval(sweep, 300);
      window.addEventListener("scroll", sweep, { passive: true });
      ScrollTrigger.addEventListener("refresh", sweep);

      cleanup = () => {
        window.clearInterval(guard);
        window.removeEventListener("scroll", sweep);
        ScrollTrigger.removeEventListener("refresh", sweep);
      };

      // the gold ring drifts round, slowly, so the row is never quite static
      gsap.utils.toArray<HTMLElement>(".leader-ring", root).forEach((ring, i) => {
        gsap.to(ring, {
          rotate: 360,
          duration: 46 + i * 7,
          repeat: -1,
          ease: "none",
        });
      });
    }, root);

    return () => {
      cleanup();
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="people"
      aria-label="The people behind the studio"
      className="w-full py-[clamp(4rem,12vh,8rem)]"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
        <Reveal>
          <p className="eyebrow">Behind the studio</p>
          <h2 className="title-type mt-3 max-w-[20ch] text-ink">
            The people{" "}
            <span className="italic text-accent">behind the camera.</span>
          </h2>
          <p className="lede mt-4 max-w-[46ch]">
            {studio.name} has been photographing families since{" "}
            {studio.established}. These are the people who run it.
          </p>
        </Reveal>

        <div
          ref={rootRef}
          className="mt-14 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3"
        >
          {leadership.map((person, i) => {
            const portrait = byId.get(person.photo);
            if (!portrait) return null;
            return (
              <figure
                key={person.photo}
                /* the middle one is nudged down so the row is a rhythm, not a line */
                className={`leader group flex flex-col items-center text-center ${
                  i === 1 ? "lg:mt-14" : ""
                }`}
              >
                <div className="relative">
                  <span
                    aria-hidden
                    className="leader-ring pointer-events-none absolute -inset-3 rounded-full border border-dashed"
                    style={{ borderColor: "color-mix(in srgb, var(--accent) 55%, transparent)" }}
                  />
                  <div
                    className="relative aspect-square w-[clamp(11rem,22vw,15rem)] overflow-hidden rounded-full transition-transform duration-700 ease-[var(--ease-gate)] group-hover:scale-[1.04]"
                    style={{
                      boxShadow: "0 18px 50px rgba(0,0,0,0.16)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div
                      className="h-full w-full"
                      style={
                        person.zoom ? { transform: `scale(${person.zoom})` } : undefined
                      }
                    >
                      <Frame
                        photo={portrait}
                        cover
                        sizes="(max-width: 640px) 60vw, 15rem"
                        className="h-full w-full"
                        alt={`${person.role} of ${studio.name}`}
                      />
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 font-mono text-[0.75rem] tracking-[0.3em]"
                    style={{ color: "var(--accent-ink)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <figcaption className="mt-7">
                  {/*
                    The role is what the studio gave us, so it leads. A name
                    appears here only once there is a real one to print.
                  */}
                  <p
                    className="font-mono text-[0.75rem] uppercase tracking-[0.28em]"
                    style={{ color: "var(--accent-ink)" }}
                  >
                    {person.role}
                  </p>
                  {person.name && (
                    <p className="title-type mt-2 text-[1.5rem] text-ink">
                      {person.name}
                    </p>
                  )}
                  {person.note && (
                    <p className="lede mt-3 max-w-[30ch] text-[0.95rem]">
                      {person.note}
                    </p>
                  )}
                  <span
                    aria-hidden
                    className="mx-auto mt-5 block h-px w-10 origin-center scale-x-50 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ background: "var(--accent)" }}
                  />
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
