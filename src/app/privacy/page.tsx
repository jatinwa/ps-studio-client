import type { Metadata } from "next";
import Link from "next/link";
import { studio } from "@/lib/studio";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Payal Studios collects when you send an enquiry, and what happens to it.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8 sm:pt-36">
      <p className="mono-label text-accent">{studio.name}</p>
      <h1 className="title-type mt-5 text-ink">Privacy</h1>

      <div className="mt-12 space-y-10">
        <Section title="What this page is">
          <p>
            This page describes how the site as built actually behaves, so that
            nothing here overstates what happens to your data.
          </p>
        </Section>

        <Section title="What the inquiry form collects">
          <p>
            The form asks for your name, email address, session type, preferred
            date, budget range and a project brief. Those fields are sent to the
            site’s own <code className="text-ink">/api/inquiry</code> endpoint
            when you submit.
          </p>
        </Section>

        <Section title="Where it goes">
          <p>
            The endpoint forwards submissions to whatever destination is set in
            the <code className="text-ink">INQUIRY_WEBHOOK_URL</code>{" "}
            environment variable. If that variable is not configured, the
            submission is <strong className="text-ink">not delivered
            anywhere</strong> — the endpoint logs it to the server console and
            returns an error, and the form tells you plainly that your inquiry
            was not sent. It will never show you a success message for a
            submission that went nowhere.
          </p>
        </Section>

        <Section title="Analytics and cookies">
          <p>
            This site sets no cookies, runs no analytics, loads no tracking
            pixels and embeds no third-party scripts. Fonts are served by Next.js
            from the same origin. The only outbound request the site makes with
            your data is the inquiry forward described above.
          </p>
        </Section>

        <Section title="Retention and removal">
          <p>
            Retention depends entirely on the configured destination, which the
            studio operator controls. To ask for an inquiry to be deleted,
            contact the studio
            {studio.contact.email ? (
              <>
                {" "}at{" "}
                <a
                  href={`mailto:${studio.contact.email}`}
                  className="focus-frame underline decoration-[var(--accent)]/40 underline-offset-4 hover:text-accent"
                >
                  {studio.contact.email}
                </a>
              </>
            ) : (
              <>
                {" "}— note that no contact address is configured yet
              </>
            )}
            .
          </p>
        </Section>
      </div>

      <Link
        href="/"
        className="focus-frame mono-label mt-16 inline-block border border-[var(--line)] px-6 py-3.5 text-ink transition-colors hover:border-accent hover:text-accent"
      >
        ← BACK TO THE STUDIO
      </Link>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mono-label border-b border-[var(--line)] pb-2.5 text-ink-dim">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-dim">
        {children}
      </div>
    </section>
  );
}
