import { packages, formatPrice, studio } from "@/lib/studio";
import { portrait, pick } from "@/lib/media/photos";
import { PhotoPlate } from "@/components/photo/PhotoPlate";
import { Reveal } from "@/components/ui/Reveal";

const SHOWS = pick(portrait, 3, 30);

/** What the studio actually sells, one card per package. */
/**
 * `standalone` suppresses this chapter's own masthead. On the homepage it is
 * one numbered beat in a sequence and needs its heading; on its own page the
 * page supplies the heading, and leaving both in prints the same sentence
 * twice and carries homepage chapter numbering onto a page that has none.
 */
export function Services({ standalone = false }: { standalone?: boolean }) {
  return (
    <section
      id="services"
      aria-label="Services"
      className="w-full py-[clamp(3.5rem,10vh,7rem)]"
    >
      <div data-measure
            className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
        {!standalone && (
          <Reveal>
            <p className="eyebrow">Services</p>
            <h2 className="title-type mt-3 max-w-[22ch] text-ink">
              Three ways we cover a day.
            </h2>
          </Reveal>
        )}

        <Reveal as="ul" stagger className={`${standalone ? "" : "mt-12"} grid gap-6 lg:grid-cols-3`}>
          {packages.map((pkg, i) => (
            <li
              key={pkg.id}
              className="flex flex-col border"
              style={{ borderColor: "var(--line)", background: "var(--surface)" }}
            >
              <PhotoPlate
                photo={SHOWS[i % SHOWS.length]}
                seed={27 + i}
                sizes="(max-width: 1024px) 92vw, 30vw"
                cover
                hover
                className="h-56 w-full"
              />
              <div className="flex flex-1 flex-col p-6">
                <h3 className="mono-label" style={{ color: "var(--accent-ink)" }}>
                  {pkg.name}
                </h3>
                <p className="lede mt-3">{pkg.summary}</p>

                <ul className="mt-5 space-y-2">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-dim">
                      <span aria-hidden className="mt-2 h-px w-2.5 flex-none" style={{ background: "var(--accent)" }} />
                      {item}
                    </li>
                  ))}
                </ul>

                <dl className="mt-6 border-t pt-4" style={{ borderColor: "var(--line)" }}>
                  <dt className="mono-label">Deliverables</dt>
                  <dd className="mt-1.5 text-sm text-ink">{pkg.deliverables}</dd>
                  <dt className="mono-label mt-4">Turnaround</dt>
                  <dd className="mt-1.5 text-sm text-ink">{pkg.turnaround}</dd>
                </dl>

                <p className="mt-6 font-mono text-sm tracking-wider" style={{ color: "var(--accent-ink)" }}>
                  {formatPrice(pkg)}
                </p>
                <a
                  href="#book"
                  className="mono-label mt-5 block border px-4 py-3.5 text-center transition-colors hover:border-accent hover:text-accent"
                  style={{ borderColor: "var(--line)", color: "var(--text)" }}
                >
                  Enquire
                </a>
              </div>
            </li>
          ))}
        </Reveal>

        <p className="mt-6 max-w-prose text-xs leading-relaxed text-ink-dim">
          {studio.bookingNotice}
        </p>
      </div>
    </section>
  );
}
