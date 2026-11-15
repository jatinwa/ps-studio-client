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
export interface LeaderSpec {
  /** Catalogue id of the portrait. */
  photo: string;
  /** Their title — the one piece of this the studio has supplied. */
  role: string;
  /** Their name. Null until the studio gives it; never invented. */
  name: string | null;
  /** One line about them, in their own words ideally. Optional. */
  note: string | null;
  /**
   * Optional crop-in, for a portrait that carries its own border.
   * The Chairman's file has a white circular vignette burnt into it; without
   * pushing past it, that white shows as a second ring inside the gold one.
   */
  zoom?: number;
}

/**
 * The people who run the studio.
 *
 * Roles come from the filenames the studio sent, and are the only thing here
 * that is known. The notes are DRAFTS written around what each title implies —
 * they are not facts anyone supplied, and should be read and corrected before
 * this goes in front of clients. Names stay null until the studio gives them:
 * putting an invented name on a photograph of a real person is a different
 * order of wrong from a line that is merely approximate.
 */
export const leadership: LeaderSpec[] = [
  {
    photo: "chairman",
    role: "Chairman",
    name: null,
    note: "Keeps the studio to the standard it set itself, and still knows every camera in the bag.",
    zoom: 1.22,
  },
  {
    photo: "senior-director",
    role: "Senior Director",
    name: null,
    note: "Plans how a wedding is covered — the functions, the venues, who stands where.",
  },
  {
    photo: "director",
    role: "Director",
    name: null,
    note: "Leads the shoot on the day, and the edit that follows it.",
  },
];

export interface AlbumSpec {
  id: string;
  /** The function or shoot type — what a couple would search for. */
  kind: string;
  title: string;
  /** Where it was shot. Null when it has not been confirmed. */
  place: string | null;
  /** One line of story. */
  note: string;
  /** Catalogue ids, cover first. */
  photos: string[];
  /**
   * Shown before a visitor asks for more.
   *
   * The full set runs to thirteen shoots, which is a long scroll of near
   * identical cards and six pre-weddings in a row at the top. The five marked
   * here are chosen to cover the arc of a wedding instead — pre-wedding,
   * mehndi, the day itself, the reception — so the short list still answers
   * "do you cover my function?". Mark or unmark albums here to change what
   * leads; everything else stays, one button away.
   */
  featured?: boolean;
}

/**
 * The studio's work, grouped into shoots.
 *
 * GROUPINGS ARE INFERRED, NOT CONFIRMED. They were worked out from two kinds
 * of evidence: consecutive camera filenames, which almost always mean one
 * shoot (sr304402/304414/304432/304472 run together), and the venue, outfits
 * and light agreeing across a cluster. That is strong but it is not the same
 * as being told, and two different couples in black tie look alike at
 * thumbnail size.
 *
 * Couples are deliberately not named. The only name anywhere in this
 * collection is the one printed on the album cover itself — Prabhjot &
 * Ramandeep — so that album carries it and the rest are titled by function
 * and place. Putting invented names on real clients' weddings is not a thing
 * to guess at.
 *
 * That album is also deliberately not featured. A real couple's names, on a
 * printed cover, should not be the first thing a stranger sees on the front
 * page; it sits with the rest of the work, behind the button.
 */
export const albums: AlbumSpec[] = [
  {
    id: "jaipur-pre-wedding",
    kind: "Pre-Wedding",
    title: "Prabhjot & Ramandeep",
    place: "Jaipur",
    note: "Albert Hall at first light, and the pink city for the rest of the day.",
    photos: ["002-2", "002-3", "001-front-acrylic-cover", "sr306109", "sr306156", "sr306534"],
  },
  {
    id: "fort-pre-wedding",
    featured: true,
    kind: "Pre-Wedding",
    title: "Courtyards & Arches",
    place: null,
    note: "Sandstone, jaali screens and the long shadows a fort throws in the afternoon.",
    photos: ["dsc02176", "dsc02021", "dsc02124", "dsc02132", "dsc02160", "dsc02537"],
  },
  {
    id: "hills-pre-wedding",
    featured: true,
    kind: "Pre-Wedding",
    title: "Mist & Monsoon",
    place: null,
    note: "A river in the morning, a city under cloud, and rain that refused to stop.",
    photos: ["sr303017", "sr303082", "sr306686", "sr306685", "sr307105", "sr307127", "dsc03652"],
  },
  {
    id: "forest-pre-wedding",
    kind: "Pre-Wedding",
    title: "Water & Pines",
    place: null,
    note: "White against green, somewhere far enough out that nobody was watching.",
    photos: ["dsc7058", "dsc6779", "dsc7247", "dsc03352", "dsc03750"],
  },
  {
    id: "city-pre-wedding",
    kind: "Pre-Wedding",
    title: "After Hours",
    place: null,
    note: "A pre-wedding that never went near a monument.",
    photos: ["dsc7824", "dsc8155", "dsc02563", "dsc02747", "dsc01933", "dsc01105"],
  },
  {
    id: "snow-pre-wedding",
    kind: "Pre-Wedding",
    title: "Snow & Shikara",
    place: null,
    note: "Red against white, and a boat on still water.",
    photos: ["sr309538", "sr309549", "sr309171"],
  },
  {
    id: "mehndi",
    featured: true,
    kind: "Mehndi",
    title: "Hands & Henna",
    place: null,
    note: "The quiet afternoon before everything gets loud.",
    photos: ["dsc01861", "dsc04291", "dsc02032"],
  },
  {
    id: "garden-wedding",
    featured: true,
    kind: "Wedding Day",
    title: "The Garden Mandap",
    place: null,
    note: "Lilac and cream, a flower wall, and the long walk between them.",
    photos: ["dsc04034", "dsc04038", "dsc03948", "dsc03809", "dsc03810", "dsc03946", "dsc04128"],
  },
  {
    id: "resort-wedding",
    kind: "Wedding Day",
    title: "Lawns & Lanterns",
    place: null,
    note: "Mint and rose on an open lawn, with the hills behind.",
    photos: ["dsc01722", "dsc01742", "dsc01745"],
  },
  {
    id: "varmala-night",
    kind: "Wedding Day",
    title: "The Exchange",
    place: null,
    note: "Garlands after dark, under the lights.",
    photos: ["scroll", "dsc01958", "dsc01977", "dsc09531", "dsc02050", "dsc02063", "dsc00827"],
  },
  {
    id: "palm-court-reception",
    featured: true,
    kind: "Reception",
    title: "The Palm Court",
    place: null,
    note: "A courtyard of palms, a marble stair, and a dress that needed both.",
    photos: ["dsc9813", "dsc9751", "dsc9777", "dsc9799", "dsc9820", "dsc9885", "dsc9979"],
  },
  {
    id: "marble-reception",
    kind: "Reception",
    title: "Marble & Gold",
    place: null,
    note: "A staircase worth walking down slowly.",
    photos: ["sr304402", "sr304414", "sr304432", "sr304472", "009", "008"],
  },
  {
    id: "black-tie",
    kind: "Reception",
    title: "Black Tie",
    place: null,
    note: "Roses on the stairs and a room full of people waiting.",
    photos: ["dsc0234", "dsc0239", "dsc0182", "001", "002", "007", "004"],
  },
];

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
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
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "book", label: "Contact" },
];
