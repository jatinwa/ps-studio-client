import type { Metadata, Viewport } from "next";
import { Fraunces, Archivo, Space_Mono } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/lib/scroll/SmoothScroll";
import { MotionBoundary } from "@/lib/scroll/MotionBoundary";
import { Nav } from "@/components/chrome/Nav";
import { Footer } from "@/components/chrome/Footer";
import { GrainOverlay } from "@/components/chrome/GrainOverlay";
import { FrameRail } from "@/components/chrome/FrameRail";
import { studio } from "@/lib/studio";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
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
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:border focus:border-accent focus:bg-[var(--surface)] focus:px-4 focus:py-2 focus:text-xs focus:tracking-widest focus:uppercase"
        >
          Skip to content
        </a>
        <SmoothScroll>
          <Nav />
          <FrameRail />
          <main id="main">
            <MotionBoundary>{children}</MotionBoundary>
          </main>
          <Footer />
        </SmoothScroll>
        <GrainOverlay />
      </body>
    </html>
  );
}
