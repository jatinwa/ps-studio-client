"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { alt as altFor, src, srcSet, thumb, type Photo } from "@/lib/media/photos";

interface LightboxState {
  /**
   * Open the viewer on `list`, starting at `index`.
   *
   * `opener` is the control that triggered it, and focus returns there on
   * close. It is passed explicitly rather than read from `document.activeElement`
   * because clicking a button does not reliably focus it in every browser —
   * relying on that sent keyboard users back to the top of the document.
   */
  open(list: Photo[], index: number, opener?: HTMLElement | null): void;
}

const Ctx = createContext<LightboxState | null>(null);

/** Photos call this to open themselves. A no-op if the provider is absent. */
export function useLightbox(): LightboxState {
  return useContext(Ctx) ?? { open: () => {} };
}

/**
 * A viewer for the studio's photographs.
 *
 * The galleries show every frame at a few hundred pixels, which is the right
 * size for browsing and the wrong size for looking. This opens the large
 * derivative over the page, and moves between the frames of whichever gallery
 * was clicked.
 *
 * It is a modal, so it behaves like one: the page behind it cannot be
 * scrolled or tabbed into, Escape closes it, and focus returns to the
 * photograph that opened it rather than being dumped at the top of the page.
 */
export function LightboxProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Photo[] | null>(null);
  const [index, setIndex] = useState(0);
  const openerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const open = useCallback(
    (next: Photo[], at: number, opener?: HTMLElement | null) => {
      openerRef.current =
        opener ?? (document.activeElement as HTMLElement | null);
      setList(next);
      setIndex(at);
    },
    [],
  );

  const close = useCallback(() => {
    setList(null);
    // hand focus back to the frame that was clicked, not the top of the page
    openerRef.current?.focus?.();
    openerRef.current = null;
  }, []);

  const step = useCallback(
    (by: number) => {
      setIndex((i) => {
        if (!list) return i;
        return (i + by + list.length) % list.length;
      });
    },
    [list],
  );

  useEffect(() => {
    if (!list) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        /*
         * Tab is kept inside the panel. Without this the visitor tabs
         * invisibly through the whole gallery behind the overlay, which for
         * anyone navigating by keyboard is the same as the viewer not
         * existing.
         */
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
          "button, [href]",
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    // focus the panel so the first Tab lands inside it
    const settle = window.setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(settle);
    };
  }, [list, close, step]);

  const current = list?.[index];

  return (
    <Ctx.Provider value={{ open }}>
      {children}

      {current && list && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photograph ${index + 1} of ${list.length}`}
          className="fixed inset-0 z-[190] flex items-center justify-center"
          style={{ background: "rgba(8,6,5,0.93)" }}
          onClick={close}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            className="relative flex h-full w-full items-center justify-center outline-none"
            /* the panel swallows clicks so only the backdrop closes */
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- derivatives are pre-built by scripts/ingest-photos.mjs */}
            <img
              key={current.id}
              src={src(current, 1600)}
              srcSet={srcSet(current)}
              sizes="92vw"
              alt={altFor(current)}
              width={current.width}
              height={current.height}
              decoding="async"
              className="max-h-[88vh] max-w-[92vw] object-contain"
              style={{ backgroundImage: `url(${thumb(current)})`, backgroundSize: "cover" }}
            />

            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="focus-frame absolute right-4 top-4 flex h-11 w-11 items-center justify-center border text-[1.1rem]"
              style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
            >
              <span aria-hidden>&times;</span>
            </button>

            {list.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photograph"
                  className="focus-frame absolute left-4 flex h-12 w-12 items-center justify-center border"
                  style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
                >
                  <span aria-hidden>&larr;</span>
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photograph"
                  className="focus-frame absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center border"
                  style={{ borderColor: "rgba(255,255,255,0.3)", color: "#fff" }}
                >
                  <span aria-hidden>&rarr;</span>
                </button>
              </>
            )}

            <p
              className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[0.75rem] tracking-[0.3em]"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              {String(index + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
            </p>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
