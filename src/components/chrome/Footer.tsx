import Link from "next/link";
import { navLinks, studio } from "@/lib/studio";

export function Footer() {
  const year = new Date().getFullYear();
  const { phones, email } = studio.contact;

  return (
    <footer className="border-t border-[var(--line)] bg-bg px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-[var(--wide)]">
        <div className="grid gap-10 sm:grid-cols-[auto_1fr] sm:gap-14">
          {/*
            The monogram keeps its own gold rather than being masked like the
            nav wordmark — it is the mark as the studio had it made, and at
            this size the metal in it actually reads.
          */}
          <div className="flex flex-col gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size brand asset, already sized; the optimiser would only re-encode it */}
            <img
              src="/brand/monogram-480.webp"
              srcSet="/brand/monogram-480.webp 480w, /brand/monogram-960.webp 960w"
              sizes="152px"
              alt={`${studio.name} logo`}
              width={960}
              height={782}
              className="h-auto w-[152px]"
            />
            <p className="mono-label" style={{ color: "var(--accent-ink)" }}>
              Since {studio.established}
            </p>
          </div>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h2 className="mono-label mb-4 text-ink">Get in touch</h2>
              <ul className="space-y-2">
                {phones.map((p) => (
                  <li key={p.tel}>
                    <a
                      href={`tel:${p.tel}`}
                      className="focus-frame font-mono text-[0.95rem] tracking-[0.06em] text-ink transition-colors hover:text-accent"
                    >
                      {p.display}
                    </a>
                  </li>
                ))}
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="focus-frame font-mono text-[0.95rem] text-ink transition-colors hover:text-accent"
                    >
                      {email}
                    </a>
                  </li>
                )}
              </ul>
              <p className="lede mt-4 max-w-[28ch] text-[0.9rem]">
                {studio.discipline}. {studio.coverage}.
              </p>
            </div>

            <nav aria-label="Pages">
              <h2 className="mono-label mb-4 text-ink">Pages</h2>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="focus-frame text-[0.95rem] text-ink-dim transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--line)" }}
        >
          <div className="flex flex-col gap-2">
            <span className="mono-label text-ink-dim">
              © {year} {studio.name}
            </span>
            {studio.isDemo && (
              <span className="mono-label max-w-md leading-relaxed text-ink-dim">
                Email, address and opening hours are read from configuration
                and are not yet filled in.
              </span>
            )}
          </div>

          <nav aria-label="Legal">
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="focus-frame mono-label text-ink-dim transition-colors hover:text-accent"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
