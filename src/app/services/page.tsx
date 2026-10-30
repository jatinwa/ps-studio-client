import type { Metadata } from "next";
import Link from "next/link";
import { Services } from "@/components/chapters/Services";
import { PageHeader } from "@/components/chrome/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { studio } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Services",
  description: `Coverage from ${studio.name}: pre-wedding, wedding day and events.`,
};

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Services"
        title={
          <>
            Three ways we{" "}
            <span className="italic text-accent">cover a day.</span>
          </>
        }
        lede="Every booking is quoted against the day itself — hours, locations and how many of us you need there."
      />

      <Services standalone />

      <section className="w-full pb-[clamp(4rem,12vh,8rem)]">
        <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
          <Reveal>
            <Link
              href="/contact"
              className="focus-frame mono-label inline-block border border-accent px-6 py-4 text-accent transition-colors duration-300 hover:bg-accent hover:text-[var(--bg)]"
            >
              Request a quote
            </Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}
