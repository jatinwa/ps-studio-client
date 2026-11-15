"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap, ScrollTrigger } from "@/lib/scroll/gsap";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";
import { byId, type Photo } from "@/lib/media/photos";
import { Frame } from "@/components/photo/Frame";
import { Reveal } from "@/components/ui/Reveal";
import { useLightbox } from "@/components/photo/Lightbox";
import { albums, studio } from "@/lib/studio";

/**
 * The work, grouped into shoots rather than scattered as frames.
 *
 * A wall of disconnected photographs shows that the studio can take a nice
 * picture. A couple deciding who to book wants to see one whole wedding —
 * what the day looked like from end to end — so the work is presented as
 * albums and the gallery of loose frames sits beneath it.
 *
 * Rows alternate which side the cover sits on, so a long page of albums does
 * not become a column of identical cards.
 *
 * Only the featured shoots are on screen to begin with. Thirteen full-width
 * rows is a scroll nobody finishes, and the ones at the top happened to be
 * six pre-weddings running. The short list is picked in `studio.ts` to cover
 * the whole arc of a wedding, and the rest are one button away:
 *
 *   <Albums moreHref="/work" />   the button goes to the page that has them all
 *   <Albums />                    the button opens the rest where you stand
 */
export function Albums({ moreHref }: { moreHref?: string } = {}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const firstRun = useRef(true);
  const [expanded, setExpanded] = useState(false);
  const lightbox = useLightbox();

  /*
   * Closing the list takes eight full-height rows out of the page under the
   * visitor, which leaves them somewhere far below with the button they just
   * pressed scrolled off the top. Put it back under their eyes. Instant, not
   * smooth: Lenis owns the smoothing and the two fight over the same scroll.
   */
  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (!next) {
      requestAnimationFrame(() =>
        moreRef.current?.scrollIntoView({ block: "center" }),
      );
    }
  };

  /* featured only until asked; the filter falling empty must not blank the
     section, so an unmarked catalogue simply leads with its first five */
  const featured = albums.filter((a) => a.featured);
  const lead = featured.length ? featured : albums.slice(0, 5);
  const visible = expanded ? albums : lead;
  const hidden = albums.length - visible.length;

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const root = rootRef.current;
    if (!root) return;

    // scoped per instance, not module-level: a shared binding would have the
    // last mounted section tearing down the previous one's listeners
    let cleanup = () => {};

    const ctx = gsap.context(() => {
      /*
       * Rows already revealed keep their state. Opening the rest re-runs this
       * effect with more rows in the DOM, and hiding the ones the visitor has
       * already read would make the page blink.
       */
      const rows = gsap.utils
        .toArray<HTMLElement>(".album", root)
        .filter((r) => r.dataset.shown !== "1");
      if (!rows.length) return;

      gsap.set(rows, { opacity: 0, y: 48 });
      const past = rows.filter(
        (r) => r.getBoundingClientRect().top < window.innerHeight * 0.85,
      );

      const open = (batch: HTMLElement[]) => {
        batch.forEach((r) => (r.dataset.shown = "1"));
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 1.05,
          ease: "power3.out",
          stagger: 0.1,
          overwrite: true,
        });
      };

      /*
       * On arrival anything already above the fold is simply there — animating
       * it would mean watching the page assemble itself. Rows uncovered by the
       * button are a different matter: they appear under the visitor's cursor
       * in response to a click, so those do get the reveal.
       */
      if (past.length) {
        if (firstRun.current) {
          past.forEach((r) => (r.dataset.shown = "1"));
          gsap.set(past, { opacity: 1, y: 0 });
        } else {
          open(past);
        }
      }
      firstRun.current = false;

      ScrollTrigger.batch(rows, {
        start: "top 86%",
        once: true,
        onEnter: (b) => open(b as HTMLElement[]),
      });

      /*
       * The same watchdog the galleries carry. Covers load above these rows
       * and shift the page, which moves them off the start their trigger was
       * measured against — without this they can stay invisible for good.
       */
      let guard = 0;
      const sweep = () => {
        const hidden = rows.filter((r) => r.dataset.shown !== "1");
        const late = hidden.filter(
          (r) => r.getBoundingClientRect().top < window.innerHeight * 0.78,
        );
        if (late.length) open(late);
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
    }, root);

    return () => {
      cleanup();
      ctx.revert();
    };
  }, [expanded]);

  return (
    <section
      id="albums"
      aria-label="Albums"
      className="w-full py-[clamp(4rem,12vh,8rem)]"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
        <Reveal>
          <p className="eyebrow">Selected albums</p>
          <h2 className="title-type mt-3 max-w-[20ch] text-ink">
            Whole days,{" "}
            <span className="italic text-accent">not single frames.</span>
          </h2>
          <p className="lede mt-4 max-w-[46ch]">
            {albums.length} shoots from recent work — pre-weddings, wedding days
            and receptions, each kept in the order it happened.
          </p>
        </Reveal>

        <div
          id="album-list"
          ref={rootRef}
          className="mt-16 flex flex-col gap-[clamp(3rem,8vh,5.5rem)]"
        >
          {visible.map((album, i) => {
            const frames = album.photos
              .map((id) => byId.get(id))
              .filter((p): p is Photo => Boolean(p));
            if (!frames.length) return null;
            const [cover, ...rest] = frames;
            const flipped = i % 2 === 1;

            return (
              <article
                key={album.id}
                className={`album grid items-center gap-8 lg:grid-cols-2 lg:gap-12 ${
                  flipped ? "lg:[&>*:first-child]:order-2" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => lightbox.open(frames, 0, e.currentTarget)}
                  aria-label={`Open the album ${album.title}, ${frames.length} photographs`}
                  className="focus-frame group block w-full cursor-zoom-in overflow-hidden"
                >
                  <Frame
                    photo={cover}
                    cover
                    sizes="(max-width: 1024px) 92vw, 46vw"
                    className="aspect-[4/5] w-full transition-transform duration-[900ms] ease-[var(--ease-gate)] group-hover:scale-[1.03] lg:aspect-[5/6]"
                    alt={`${album.kind} — ${album.title}`}
                  />
                </button>

                <div>
                  <p className="mono-label flex items-center gap-3">
                    <span style={{ color: "var(--accent-ink)" }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden
                      className="h-px w-8"
                      style={{ background: "var(--line)" }}
                    />
                    <span>
                      {album.kind}
                      {album.place ? ` · ${album.place}` : ""}
                    </span>
                  </p>

                  <h3 className="title-type mt-4 max-w-[16ch] text-ink">
                    {album.title}
                  </h3>
                  <p className="lede mt-4 max-w-[38ch]">{album.note}</p>

                  {/* the rest of the shoot, as a row of small frames */}
                  {rest.length > 0 && (
                    <ul className="mt-7 flex flex-wrap gap-2.5">
                      {rest.slice(0, 5).map((p, n) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={(e) =>
                              lightbox.open(frames, n + 1, e.currentTarget)
                            }
                            aria-label={`Open photograph ${n + 2} of ${album.title}`}
                            className="focus-frame block h-16 w-16 cursor-zoom-in overflow-hidden"
                          >
                            <Frame
                              photo={p}
                              cover
                              sizes="4rem"
                              className="h-full w-full transition-transform duration-500 hover:scale-110"
                              alt=""
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    onClick={(e) => lightbox.open(frames, 0, e.currentTarget)}
                    className="focus-frame mono-label mt-7 inline-flex items-center gap-2 border border-[var(--line)] px-5 py-3 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
                  >
                    View album
                    <span aria-hidden>&rarr;</span>
                    <span className="sr-only">
                      — {frames.length} photographs by {studio.name}
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/*
          Never a button that leads nowhere: with a page to send them to it is
          a plain link to that page, and without one it opens the rest in
          place. The disclosure stays on screen once opened so it can be shut
          again and so the keyboard focus has somewhere to be.
        */}
        {(hidden > 0 || expanded) && (
          <Reveal className="mt-14">
            {moreHref ? (
              <Link
                href={moreHref}
                className="focus-frame mono-label inline-flex items-center gap-2 border border-[var(--line)] px-5 py-3 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                See all {albums.length} albums
                <span aria-hidden>&rarr;</span>
              </Link>
            ) : (
              <button
                ref={moreRef}
                type="button"
                onClick={toggle}
                aria-expanded={expanded}
                aria-controls="album-list"
                className="focus-frame mono-label inline-flex items-center gap-2 border border-[var(--line)] px-5 py-3 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
              >
                {expanded
                  ? "Show fewer albums"
                  : `Show ${hidden} more album${hidden === 1 ? "" : "s"}`}
                <span aria-hidden>{expanded ? "↑" : "↓"}</span>
              </button>
            )}
          </Reveal>
        )}
      </div>
    </section>
  );
}
