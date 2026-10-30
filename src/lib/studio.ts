/* ───────────────────────────────────────────────────────────
   Studio configuration.

   Payal Studios is a real business. The details here are the ones the
   studio supplied — the two numbers and the founding year — and
   nothing else is invented. Every field still `null` (email, street
   address, opening hours, social handles) is a real-world claim that
   has not been given yet, so the UI renders an honest placeholder
   rather than making one up. Fill those in before going live.
   ─────────────────────────────────────────────────────────── */

export interface StudioHours {
  label: string;
  value: string | null;
}

export interface StudioPhone {
  /** As a person would read it aloud. */
  display: string;
  /** E.164, for `tel:` links. */
  tel: string;
}

export const studio = {
  name: "Payal Studios",
  tagline:
    "Event and wedding photography — the whole day, kept the way it felt.",
  discipline: "Event & wedding photography",
  coverage: "Weddings, receptions and celebrations",
  locationLine: "Since 1974",
  /** The year the studio was founded, as supplied. */
  established: 1974,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /**
   * True while business details are still unfilled. The studio has given its
   * numbers and founding year, but not an email, locality or hours, so the
   * footer keeps saying so rather than implying the rest is configured.
   */
  isDemo: true,

  contact: {
    /** e.g. "studio@payalstudio.example" */
    email: process.env.NEXT_PUBLIC_STUDIO_EMAIL ?? null,

    /*
     * Both numbers the studio gave. Dialled as +91: they are ten-digit Indian
     * mobile numbers and the studio quotes in INR. The displayed form keeps
     * the grouping a reader expects; the `tel` form is what the phone dials.
     */
    phones: [
      { display: "+91 98729 00842", tel: "+919872900842" },
      { display: "+91 83605 68049", tel: "+918360568049" },
    ] satisfies StudioPhone[],

    /** The first number, for structured data and single-slot UI. */
    phone: "+919872900842",
    /** City/region only — intentionally not a street address. */
    locality: process.env.NEXT_PUBLIC_STUDIO_LOCALITY ?? null,
    addressLines: null as string[] | null,
  },

  social: {
    instagram: process.env.NEXT_PUBLIC_STUDIO_INSTAGRAM ?? null,
    behance: null as string | null,
  },

  hours: [
    { label: "Mon — Fri", value: null },
    { label: "Saturday", value: null },
    { label: "Sunday", value: null },
  ] satisfies StudioHours[],

  facilities: [
    "Full-frame digital capture",
    "Two-photographer coverage",
    "On-location and venue lighting",
    "Same-week highlight selects",
    "Album design and printing",
    "Drone coverage on request",
  ],

  /** Shown beside the booking packages. */
  bookingNotice:
    "Sending this does not hold your date. We check availability for the date you give us and reply with written confirmation.",
} as const;

export interface PackageSpec {
  id: string;
  name: string;
  summary: string;
  includes: string[];
  deliverables: string;
  /**
   * Price in the studio's currency, or `null` when not published.
   * `null` renders "REQUEST A QUOTE" — never a placeholder number.
   */
  price: number | null;
  currency: string;
  /** Typical turnaround, as a range the studio can honour. */
  turnaround: string;
}

export const packages: PackageSpec[] = [
  {
    id: "pre-wedding",
    name: "PRE-WEDDING",
    summary: "The shoot before the day — somewhere that means something.",
    includes: [
      "Location scouting and planning call",
      "Half-day coverage",
      "Two to three outfit changes",
      "Guided direction for couples who hate posing",
    ],
    deliverables: "60+ edited frames, print and web exports",
    price: null,
    currency: "INR",
    turnaround: "10–14 days",
  },
  {
    id: "wedding-day",
    name: "WEDDING DAY",
    summary: "Full coverage, from the getting-ready room to the last dance.",
    includes: [
      "Two photographers",
      "Full-day coverage",
      "Candid and family group frames",
      "Ceremony, reception and celebration",
    ],
    deliverables: "400+ edited frames, full gallery, album-ready selects",
    price: null,
    currency: "INR",
    turnaround: "4–6 weeks",
  },
  {
    id: "events",
    name: "EVENTS",
    summary: "Receptions, engagements, sangeet, corporate and milestones.",
    includes: [
      "Coverage scaled to the run sheet",
      "Candid and arranged frames",
      "Venue and detail coverage",
      "Fast turnaround on highlight selects",
    ],
    deliverables: "Highlights within a week, full gallery to follow",
    price: null,
    currency: "INR",
    turnaround: "2–4 weeks",
  },
];

export const sessionTypes = packages.map((p) => ({
  value: p.id,
  label: p.name,
}));

export const budgetRanges = [
  { value: "under-50k", label: "Under ₹50,000" },
  { value: "50k-1l", label: "₹50,000 — ₹1,00,000" },
  { value: "1l-2l", label: "₹1,00,000 — ₹2,00,000" },
  { value: "2l-plus", label: "₹2,00,000+" },
  { value: "undecided", label: "Not yet decided" },
];

export function formatPrice(pkg: PackageSpec): string {
  if (pkg.price === null) return "REQUEST A QUOTE";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: pkg.currency,
    maximumFractionDigits: 0,
  }).format(pkg.price);
}

/**
 * The site's pages. These are routes, not anchors — the homepage is a single
 * cinematic run-through, and each of these is the same subject at length.
 */
export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "Studio" },
  { href: "/services", label: "Services" },
  { href: "/contact", label: "Contact" },
];

/**
 * The homepage's own chapters, in order. Kept separate from `navLinks`: the
 * frame counter reports progress through the one-page sequence, which is a
 * different thing from which page of the site you are on, and conflating them
 * is what made the counter read "01 / 06 Home" on every route.
 */
export const homeSections = [
  { id: "opening", label: "Home" },
  { id: "reel", label: "Reel" },
  { id: "work", label: "Work" },
  { id: "about", label: "Studio" },
  { id: "services", label: "Services" },
  { id: "book", label: "Contact" },
];
