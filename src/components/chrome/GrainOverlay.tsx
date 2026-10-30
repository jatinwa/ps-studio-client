"use client";

/**
 * Film grain.
 *
 * Deliberately NOT `mix-blend-mode` over a viewport-sized `feTurbulence`: a
 * full-page blend layer forces the browser to rasterise everything beneath it
 * into a single composited backdrop, which is ruinous on a long page and was
 * enough to OOM the renderer outright when the chapters sit close together
 * (reduced-motion mode collapses the document to about a third of its height).
 *
 * Instead the noise is rasterised once as a small tile and repeated by the
 * compositor — one cheap texture, no backdrop readback.
 */

const TILE = 140;

/* One turbulence tile, inlined so there is no extra request. */
const GRAIN_TILE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}">
     <filter id="g">
       <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
       <feColorMatrix type="saturate" values="0"/>
     </filter>
     <rect width="100%" height="100%" filter="url(#g)" opacity="0.5"/>
   </svg>`,
)}`;

export function GrainOverlay() {
  return (
    <div
      aria-hidden
      /* Oversized so the drift animation never exposes an edge. */
      className="grain-layer pointer-events-none fixed -inset-[6%] z-[90]"
      style={{
        backgroundImage: `url("${GRAIN_TILE}")`,
        backgroundRepeat: "repeat",
        backgroundSize: `${TILE}px ${TILE}px`,
        opacity: 0.07,
      }}
    />
  );
}
