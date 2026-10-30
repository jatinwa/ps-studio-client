import { Aperture } from "@/components/chapters/Aperture";
import { ContactSheet } from "@/components/chapters/ContactSheet";
import { WorkGallery } from "@/components/chapters/WorkGallery";
import { StudioNote } from "@/components/chapters/StudioNote";
import { Services } from "@/components/chapters/Services";
import { Booking } from "@/components/chapters/Booking";
import { studio } from "@/lib/studio";

/**
 * The homepage reads as one continuous shot: the lens in the dark, the iris
 * opening onto the first photograph, then the studio's work advancing frame by
 * frame like film running through the gate.
 */
export default function Home() {
  return (
    <>
      <Aperture />
      <ContactSheet />
      <WorkGallery />
      <StudioNote />
      <Services />
      <Booking />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ProfessionalService",
            name: studio.name,
            description: studio.tagline,
            url: studio.siteUrl,
            ...(studio.contact.email && { email: studio.contact.email }),
            ...(studio.contact.phone && { telephone: studio.contact.phone }),
            foundingDate: String(studio.established),
            logo: `${studio.siteUrl}/brand/icon.png`,
            ...(studio.contact.locality && {
              address: {
                "@type": "PostalAddress",
                addressLocality: studio.contact.locality,
              },
            }),
          }),
        }}
      />
    </>
  );
}
