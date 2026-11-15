import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SmoothScroll } from "@/lib/scroll/SmoothScroll";
import { MotionBoundary } from "@/lib/scroll/MotionBoundary";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";
import { GrainOverlay } from "@/components/chrome/GrainOverlay";
import { FrameRail } from "@/components/chrome/FrameRail";
import { Intro, IntroOverlay, introScript } from "@/components/chrome/Intro";
import { LightboxProvider } from "@/components/photo/Lightbox";
import { studio } from "@/lib/studio";

/*
 * The typefaces are served by this site, not fetched from Google at build time.
 *
 * `next/font/google` downloads them during `next build`, which made every
 * deploy depend on Google's servers being reachable from the build machine —
 * Netlify's could not reach them and the build died resolving the font module.
 * Self-hosted there is no build-time network call at all, and no third-party
 * request from the visitor's browser either.
 *
 * Fraunces and Archivo are variable fonts, so one file covers the whole weight
 * range each; Space Mono is not, so its two weights are separate files.
 * Run `node scripts/fetch-fonts.mjs` to refresh them.
 */
const fraunces = localFont({
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: "Times New Roman",
  src: [
    {
      path: "./fonts/fraunces-roman-var-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "./fonts/fraunces-italic-var-latin.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
});

const archivo = localFont({
  variable: "--font-archivo",
  display: "swap",
  adjustFontFallback: "Arial",
  src: [
    {
      path: "./fonts/archivo-var-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
});

const spaceMono = localFont({
  variable: "--font-space-mono",
  display: "swap",
  adjustFontFallback: "Arial",
  src: [
    { path: "./fonts/space-mono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/space-mono-700-latin.woff2", weight: "700", style: "normal" },
  ],
});

const title = `${studio.name} — Photography & Creative Production`;
const description = `${studio.tagline} ${studio.coverage}, photographed by ${studio.name} since ${studio.established}.`;

export const metadata: Metadata = {
  metadataBase: new URL(studio.siteUrl),
  title: {
    default: title,
    template: `%s — ${studio.name}`,
  },
  description,
  applicationName: studio.name,
  keywords: [
    "wedding photography",
    "event photography",
    "pre-wedding shoot",
    "reception photography",
    "photography studio",
    studio.name,
  ],
  openGraph: {
    type: "website",
    siteName: studio.name,
    title,
    description,
    url: studio.siteUrl,
    images: [
      {
        url: "/brand/og.jpg",
        width: 1200,
        height: 630,
        alt: `A photograph by ${studio.name}.`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/brand/og.jpg"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f3eee4",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${archivo.variable} ${spaceMono.variable} antialiased`}
    >
      <body className="bg-bg text-ink">
        {/*
          First thing in the body, and deliberately so: it runs while the
          parser is still here, so the overlay below is either shown or not
          shown in the very first paint. Anything later means a frame of the
          un-hydrated page on screen.
        */}
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <IntroOverlay />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:border focus:border-accent focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:text-xs focus:tracking-widest focus:uppercase"
        >
          Skip to content
        </a>
        <Intro />
        <SmoothScroll>
          <Nav />
          <FrameRail />
          <main id="main">
            <LightboxProvider>
              <MotionBoundary>{children}</MotionBoundary>
            </LightboxProvider>
          </main>
          <Footer />
        </SmoothScroll>
        <GrainOverlay />
      </body>
    </html>
  );
}
