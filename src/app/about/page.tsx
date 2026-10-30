import type { Metadata } from "next";
import { StudioNote } from "@/components/chapters/StudioNote";
import { PageHeader } from "@/components/chrome/PageHeader";
import { PhotoWall } from "@/components/photo/PhotoWall";
import { landscape, pick } from "@/lib/media/photos";
import { studio } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Studio",
  description: `${studio.name} — ${studio.discipline}, covering ${studio.coverage.toLowerCase()}.`,
};

const WIDES = pick(landscape, 6, 1);

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="The studio"
        title={
          <>
            We shoot the day{" "}
            <span className="italic text-accent">as it actually goes.</span>
          </>
        }
        lede={studio.tagline}
      />

      <StudioNote standalone />

      <section
        aria-label="From the studio"
        className="w-full py-[clamp(3.5rem,10vh,7rem)]"
      >
        <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
          <p className="eyebrow">Wide frames</p>
          <h2 className="title-type mt-3 max-w-[20ch] text-ink">
            Room, light, and the people in it.
          </h2>
          <PhotoWall
            photos={WIDES}
            seedOffset={17}
            columns="columns-1 lg:columns-2"
            className="mt-10"
          />
        </div>
      </section>
    </>
  );
}
