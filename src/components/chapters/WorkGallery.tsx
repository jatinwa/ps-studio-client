import Link from "next/link";
import { photos, pick, portrait } from "@/lib/media/photos";
import { PhotoWall } from "@/components/photo/PhotoWall";
import { Reveal } from "@/components/ui/Reveal";

const WALL = pick(portrait, 15, 10);

/**
 * The work, as the homepage shows it: a selection, with the full set a click
 * away. A masonry column layout so every portrait frame keeps its own shape —
 * the whole point of rebuilding this around real photography rather than
 * forcing 53 portrait frames into landscape slots.
 */
export function WorkGallery() {
  return (
    <section
      id="work"
      aria-label="Selected work"
      className="w-full py-[clamp(3.5rem,10vh,7rem)]"
    >
      <div
        data-measure
        className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]"
      >
        <Reveal>
          <p className="eyebrow">Selected work</p>
          <h2 className="title-type mt-3 max-w-[20ch] text-ink">
            Weddings, celebrations, and the quiet bits in between.
          </h2>
          <p className="lede mt-3 max-w-[46ch]">
            {WALL.length} of {photos.length} frames from recent work.
          </p>
        </Reveal>

        {/* seeded past the contact sheet's twelve so the reveals keep varying */}
        <PhotoWall photos={WALL} seedOffset={12} className="mt-12" />

        <Reveal className="mt-10">
          <Link
            href="/work"
            className="focus-frame mono-label inline-block border border-[var(--line)] px-5 py-3 text-ink transition-colors duration-300 hover:border-accent hover:text-accent"
          >
            See all {photos.length} frames
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
