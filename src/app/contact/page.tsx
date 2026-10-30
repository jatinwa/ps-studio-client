import type { Metadata } from "next";
import { Booking } from "@/components/chapters/Booking";
import { PageHeader } from "@/components/chrome/PageHeader";
import { studio } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Contact",
  description: `Enquire about a date with ${studio.name}.`,
};

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title={
          <>
            Tell us about{" "}
            <span className="italic text-accent">the day.</span>
          </>
        }
        lede="Dates, the places you have in mind, and anything that matters to you about how it is photographed."
      />

      <section aria-label="Phone" className="w-full">
        <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
          <ul className="flex flex-wrap gap-x-10 gap-y-3 border-y py-6"
              style={{ borderColor: "var(--line)" }}>
            {studio.contact.phones.map((p) => (
              <li key={p.tel}>
                <a
                  href={`tel:${p.tel}`}
                  className="focus-frame font-mono text-[1.05rem] tracking-[0.06em] text-ink transition-colors hover:text-accent"
                >
                  {p.display}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Booking standalone />
    </>
  );
}
