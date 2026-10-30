import { landscape, pick } from "@/lib/media/photos";
import { PhotoPlate } from "@/components/photo/PhotoPlate";
import { studio } from "@/lib/studio";
import { Reveal } from "@/components/ui/Reveal";
import { Parallax } from "@/components/ui/Parallax";

const WIDE = pick(landscape, 1, 3)[0];

/** The studio's own voice, set against one of the wide frames. */
/**
 * `standalone` suppresses this chapter's own masthead. On the homepage it is
 * one numbered beat in a sequence and needs its heading; on its own page the
 * page supplies the heading, and leaving both in prints the same sentence
 * twice and carries homepage chapter numbering onto a page that has none.
 */
export function StudioNote({ standalone = false }: { standalone?: boolean }) {
  return (
    <section
      id="about"
      aria-label="About the studio"
      className="w-full py-[clamp(3.5rem,10vh,7rem)]"
      style={{ backgroundColor: "var(--surface)" }}
    >
      <div className="mx-auto grid w-full max-w-[var(--wide)] gap-10 px-[var(--pad)] lg:grid-cols-2 lg:items-center">
        <Parallax className="w-full">
          <PhotoPlate photo={WIDE} seed={30} sizes="(max-width: 1024px) 92vw, 46vw" className="w-full" />
        </Parallax>
        <Reveal>
          {!standalone && (
            <>
              <p className="eyebrow">Frame 04 — The studio</p>
              <h2 className="title-type mt-3 text-ink">
                Handed the camera at the end of the night.
              </h2>
            </>
          )}
          <p className="lede mt-5">
            That is the feeling we work toward — scrolling back through
            everything that just happened, and finding it all still there.
          </p>
          <dl className="mt-9 divide-y" style={{ borderColor: "var(--line)" }}>
            {[
              ["Discipline", studio.discipline],
              ["Based", studio.contact.locality ?? "Not set"],
              ["Covering", studio.coverage],
            ].map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 py-3"
                   style={{ borderTop: "1px solid var(--line)" }}>
                <dt className="mono-label">{k}</dt>
                <dd className="text-right text-[var(--text-step-0)] text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
