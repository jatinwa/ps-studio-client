"use client";

import { useCallback, useState } from "react";
import { alt as altFor, src, srcSet, thumb, type Photo } from "@/lib/media/photos";

interface FrameProps {
  photo: Photo;
  /** Responsive `sizes`. Default suits a single column of a 3-up grid. */
  sizes?: string;
  className?: string;
  priority?: boolean;
  alt?: string;
  /** Fill the container and crop, instead of keeping the photo's own shape. */
  cover?: boolean;
}

/**
 * One photograph.
 *
 * By default it keeps its own aspect ratio rather than being forced into a box
 * — 53 of these frames are portrait, and cropping them into landscape slots is
 * what mangles the subject. `cover` is opt-in, for the few full-bleed moments.
 */
export function Frame({
  photo,
  sizes = "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw",
  className = "",
  priority = false,
  alt,
  cover = false,
}: FrameProps) {
  const [loaded, setLoaded] = useState(false);

  // SSR images often settle before hydration; read the element's own state.
  const settle = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <div
      className={`relative overflow-hidden bg-surface ${className}`}
      style={cover ? undefined : { aspectRatio: String(photo.ratio) }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{
          backgroundImage: `url(${thumb(photo)})`,
          opacity: loaded ? 0 : 1,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- derivatives are pre-built by scripts/ingest-photos.mjs; the Next optimiser would re-encode already-optimal WebP. */}
      <img
        ref={settle}
        src={src(photo, 1200)}
        srcSet={srcSet(photo)}
        sizes={sizes}
        alt={alt ?? altFor(photo)}
        width={photo.width}
        height={photo.height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full ${cover ? "object-cover" : "object-contain"} transition-opacity duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={cover ? { objectPosition: "center 30%" } : undefined}
      />
    </div>
  );
}
