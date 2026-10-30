# PAYAL STUDIO

A cinematic scroll site for a fictional premium photography and creative
production studio. Nine chapters, scroll-scrubbed frame sequences on pinned
canvases, and a working inquiry pipeline.

Next.js 16 · React 19 · TypeScript · Tailwind v4 · GSAP ScrollTrigger · Lenis

```bash
npm install
npm run dev          # http://localhost:3000
```

---

## Current state: the site is built, the photography is not

The build is complete and runs. **No imagery has been generated yet** — both
connected generation accounts reported `credits: 0` (Higgsfield on a `free` plan
with free-trial `unlim` unavailable; Everygen at zero), so none of the 25 stills
or 8 films could be submitted. Nothing was charged.

So that the design can actually be judged, the site currently ships **abstract
preview plates** generated locally by `npm run media:preview`. They are tonal
light studies in the studio palette — deliberately not imitation photographs,
with no people or products in them — and they exist only so the typography,
spacing, chapter rhythm and frame-sequence scrubbing can be reviewed. They are
overwritten by the real plates automatically, because they use the same
filenames and derivative widths.

```bash
npm run media:preview         # abstract placeholders, ~5.7MB, a few seconds
npm run media:preview:clean   # remove them and fall back to labelled slates
```

With no assets at all, every plate instead renders a labelled slate naming the
frame, its art direction and its manifest id — a missing photograph reads as
*missing* rather than being papered over with stock.

To fill the site in for real, follow
**[scripts/GENERATION.md](scripts/GENERATION.md)**. Nothing about the site needs
to change — it is entirely manifest-driven.

---

## How the media layer works

[`src/lib/media/manifest.json`](src/lib/media/manifest.json) is the single
source of truth for both the website and the generation scripts. It holds every
prompt, every plate's reference parent, the camera metadata shown in the UI, and
each film's frame budget. Edit prompts there, never in the scripts.

```
manifest.json
   ├── stills      25 plates; `reference` names the plate whose job id is
   │               passed as the image reference, which is what keeps model
   │               identity, lighting and grade consistent across the site
   ├── films       8 sequences, each with a start and end plate
   └── collections fashion / wedding / product groupings
```

| Command | What it does |
|---|---|
| `npm run media:stills` | Downloads generated stills, builds 640/1280/1920/2560 WebP derivatives plus a blurred LQIP |
| `npm run media:films` | Extracts frames, **trims the static frames Kling holds at the head of a clip**, resamples to the desktop/mobile budgets, encodes WebP, writes `meta.json` |
| `npm run media:all` | Both, in order |
| `npm run media:preview` | Abstract stand-in plates and sequences for design review (no account needed) |

Film slicing needs `ffmpeg` on `PATH` (or `FFMPEG_PATH`). Fill in result URLs by
copying `scripts/jobs.example.json` → `scripts/jobs.json`; partial fills are
fine, anything blank is skipped.

### Degradation ladder

Every cinematic chapter falls back in this order, and each step is reachable:

```
sequence frames  →  start still  →  labelled "NOT GENERATED" slate
```

Under `prefers-reduced-motion` the chapter is a plain, unpinned, single-viewport
still — no canvas, no pinning, and **no frame requests at all**.

---

## Architecture notes

**Scroll.** Lenis is pumped from `gsap.ticker` (one rAF loop, not two) and
ScrollTrigger is updated from Lenis's scroll event *and* a native `scroll`
listener — Lenis doesn't intercept the keyboard, so without the native listener
arrow keys, Space, PageDown and find-in-page would leave every animation frozen.

**Frame sequences.** `FrameSequenceLoader` keeps only a window of frames
resident around the playhead and releases the rest, so eight chapters don't hold
~1,700 decoded bitmaps. `nearest()` always returns the closest decoded frame, so
scrubbing faster than the network degrades temporal resolution instead of
flashing black. Scroll progress is fed in imperatively — routing it through
React state would re-render the chapter on every scroll tick.

**Motion preference.** `useReducedMotion` corrects the SSR assumption in a mount
effect rather than via `useSyncExternalStore`. With a `getServerSnapshot` that
disagrees with the client, the post-hydration correction only lands if the store
notifies — and an already-matching media query never fires `change`, which meant
reduced-motion users were being served the full animated site.

**`MotionBoundary`** keys the page on that preference. The animated tree hands
nodes to GSAP (ScrollTrigger's `pin` physically wraps the element in a
pin-spacer); if the preference flips while mounted, React swaps that subtree
while GSAP still owns those nodes and the two fight over the same DOM, which
took the renderer down outright. Keying makes the swap a clean unmount/mount.

**`Plate`** settles from the element's own state when the node attaches, not
only from `load`/`error` events. Server-rendered images routinely finish — or
404 — before React hydrates, and those events are gone by then; without this the
missing-plate fallback never appeared at all.

**Grain** is one small rasterised tile repeated by the compositor, not a
viewport-sized `feTurbulence` under `mix-blend-mode`. A full-page blend layer
forces the browser to rasterise everything beneath it into a single backdrop.

---

## Responsive behaviour

The layout is driven by width *and* height, because a pinned chapter is the one
thing that genuinely breaks on a short screen.

**Width.** Phone-first single column, two columns from `sm`, and the full
staggered twelve-column editorial grid from `lg`. The chapter nav collapses to a
full-height drawer below `lg`; plates request the smallest derivative that fits
via `srcSet`/`sizes`; frame sequences drop to a 640px, half-length variant below
768px or when the browser reports Save-Data.

**Height.** A pinned chapter gets exactly one viewport, so anything that does not
fit is unreachable — measured at 667×375 the lighting lab lost 556px of its
control panel, including every lighting mode. Two mechanisms handle that:

| Viewport height | Behaviour |
|---|---|
| `< 560px` | Chapters stop pinning entirely and render as ordinary scrolling sections (`useStaticLayout`) |
| `< 680px` | The rig-diagram caption note is dropped |
| `< 760px` | The rig diagram itself is dropped |
| `< 820px` | Dense readout rows tighten their vertical padding |

Crossing the pinning threshold remounts the page through `MotionBoundary`, for
the same reason a motion-preference change does: GSAP physically owns the pinned
nodes, and letting React swap that subtree underneath it crashes the renderer.

Verified with no clipping and no horizontal overflow at 375×812, 667×375 (landscape
phone), 768×1024, 1024×660 and 1280×800.

## The inquiry form

`POST /api/inquiry`, validated server-side with the same Zod schema the client
uses ([`src/lib/inquiry.ts`](src/lib/inquiry.ts)).

It **never reports success unless the submission was actually delivered.** Set
`INQUIRY_WEBHOOK_URL` to any JSON endpoint (Formspree, Zapier, a Slack webhook,
your CRM). With nothing configured it returns `503 NO_BACKEND`, logs the payload
server-side, and the form tells the visitor plainly that the inquiry was not
sent and to email instead.

| Case | Response |
|---|---|
| Delivered | `200 {ok:true, reference}` |
| Field errors | `422 {code:"VALIDATION", errors}` |
| No endpoint configured | `503 {code:"NO_BACKEND"}` |
| Endpoint unreachable / non-2xx | `502 {code:"FORWARD_FAILED"}` |
| More than 5/min from one IP | `429 {code:"RATE_LIMITED"}` |

Copy `.env.example` → `.env.local` to configure.

---

## What is deliberately not claimed

This is a portfolio demo for a studio that does not exist, so it does not invent
business facts. Address, phone, opening hours, email and Instagram are `null` in
[`src/lib/studio.ts`](src/lib/studio.ts) and render as `NOT SET`. Package prices
are `null` and render as `REQUEST A QUOTE` — a price appears only once the studio
sets one. There are no client logos, no testimonials and no named commissions;
the portfolio projects are presented as self-directed studio series. The
RAW-versus-graded slider is labelled as a browser-side simulation of a flat
profile, not a camera RAW file. Submitting a booking request explicitly does not
confirm availability.

Fill these in with real details before shipping. Don't make them up.

---

## Verification status

Verified: production build, `tsc --noEmit` and ESLint all clean; all 9 chapters
present with correct geometry and no horizontal overflow at 1280px and 375px;
ScrollTrigger setup correct (30 triggers, correct start/end, pins engage,
progress maps accurately when driven); missing-asset fallbacks render; mobile
nav opens, closes on Escape and on toggle; the full inquiry matrix above,
including a real webhook round-trip and the rate limiter; and an SSR audit
showing one `h1`, no image missing `alt`, no unlabeled form control, no dead
link and no broken anchor.

**Not verified here:** the automated browser pane ran hidden
(`visibilityState: "hidden"`), which freezes `requestAnimationFrame` and starves
React's scheduler, so animated scrolling, pinned-chapter scrubbing and the
reduced-motion tree could not be observed end-to-end. Those paths are correct by
construction and by the driven-progress tests, but **check them in a real
browser window** — slow, fast and backward scroll, pin release at chapter
boundaries, and the OS reduced-motion toggle.
