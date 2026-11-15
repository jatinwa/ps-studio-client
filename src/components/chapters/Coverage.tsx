"use client";

import { byId, type Photo } from "@/lib/media/photos";
import { Frame } from "@/components/photo/Frame";
import { Reveal } from "@/components/ui/Reveal";
import { useLightbox } from "@/components/photo/Lightbox";
import { albums } from "@/lib/studio";

/**
 * What a wedding actually consists of, as a band across the page.
 *
 * This replaced a block of abstract copy set against an unrelated photograph.
 * A couple scanning the site is asking a concrete question — do you cover the
 * mehndi, do you stay for the reception — and this answers it with the
 * studio's own frames from each function, every tile opening that album.
 *
 * The functions are read from the albums rather than listed again here, so
 * the band can never claim a function the studio has no work to show for.
 */
export function Coverage() {
  const lightbox = useLightbox();

  // one representative album per function, in the order a wedding happens
  const ORDER = ["Pre-Wedding", "Mehndi", "Wedding Day", "Reception"];
  const bands = ORDER.map((kind) => {
    const matching = albums.filter((a) => a.kind === kind);
    /*
     * The tile takes its cover from a featured album when there is one. Left
     * to array order this band put the printed, named album cover on the
     * front page — the one shoot held back from the featured list precisely
     * so those names are not what greets a stranger. Still a `find` over the
     * list rather than a single lookup, so a missing file falls through to
     * the next shoot instead of leaving a gap.
     */
    const ordered = [...matching].sort(
      (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
    );
    const cover = ordered
      .map((a) => byId.get(a.photos[0]))
      .find((p): p is Photo => Boolean(p));
    const frames = matching
      .flatMap((a) => a.photos)
      .map((id) => byId.get(id))
      .filter((p): p is Photo => Boolean(p));
    return { kind, cover, frames, shoots: matching.length };
  }).filter((b) => b.cover);

  if (!bands.length) return null;

  return (
    <section
      id="coverage"
      aria-label="What we cover"
      className="w-full py-[clamp(4rem,12vh,8rem)]"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
        <Reveal>
          <p className="eyebrow">What we cover</p>
          <h2 className="title-type mt-3 max-w-[22ch] text-ink">
            From the first function{" "}
            <span className="italic text-accent">to the last song.</span>
          </h2>
        </Reveal>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {bands.map((band, i) => (
            <li key={band.kind}>
              <button
                type="button"
                onClick={(e) => lightbox.open(band.frames, 0, e.currentTarget)}
                aria-label={`${band.kind} — ${band.frames.length} photographs`}
                className="focus-frame group relative block w-full cursor-zoom-in overflow-hidden"
              >
                <Frame
                  photo={band.cover!}
                  cover
                  sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 23vw"
                  className="aspect-[3/4] w-full transition-transform duration-[900ms] ease-[var(--ease-gate)] group-hover:scale-[1.05]"
                  alt={band.kind}
                />
                {/* a wash, so the label holds whatever the photograph does */}
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(10,8,6,0.74) 0%, rgba(10,8,6,0.2) 42%, rgba(10,8,6,0) 70%)",
                  }}
                />
                <span className="absolute inset-x-0 bottom-0 p-5 text-left">
                  <span
                    className="block font-mono text-[0.75rem] tracking-[0.3em]"
                    style={{ color: "rgba(255,255,255,0.68)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="mt-1.5 block font-serif text-[1.45rem] leading-tight"
                    style={{ color: "#fff" }}
                  >
                    {band.kind}
                  </span>
                  <span
                    className="mt-1 block font-mono text-[0.75rem] tracking-[0.22em]"
                    /* the lifted gold: this label sits on the photograph,
                       under a dark wash, where the theme's ink gold sinks */
                    style={{ color: "var(--accent-lift)" }}
                  >
                    {band.frames.length} frames
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
