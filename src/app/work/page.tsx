import type { Metadata } from "next";
import { photos } from "@/lib/media/photos";
import { PhotoWall } from "@/components/photo/PhotoWall";
import { PageHeader } from "@/components/chrome/PageHeader";
import { studio } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Work",
  description: `Selected photography by ${studio.name} — ${studio.discipline.toLowerCase()} across ${studio.coverage.toLowerCase()}.`,
};

/** Everything, rather than the homepage's selection. */
export default function WorkPage() {
  return (
    <>
      <PageHeader
        eyebrow="Work"
        title={
          <>
            Every frame we&rsquo;d{" "}
            <span className="italic text-accent">show you twice.</span>
          </>
        }
        lede={`${photos.length} frames from recent weddings, celebrations and portrait sessions. Shown uncropped, in the shape each was taken.`}
      />

      <section
        aria-label="All work"
        className="w-full pb-[clamp(4rem,12vh,8rem)]"
      >
        <div className="mx-auto w-full max-w-[var(--wide)] px-[var(--pad)]">
          <PhotoWall photos={photos} seedOffset={3} />
        </div>
      </section>
    </>
  );
}
