"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks, studio } from "@/lib/studio";
import { ThemeToggle } from "./ThemeToggle";

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);

  /* Solid backdrop once we leave the opening frame. */
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Mobile panel: escape to close, restore focus, lock background scroll. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const firstLink = panelRef.current?.querySelector<HTMLElement>("a, button");
    firstLink?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /** A link is current when it is this page, or the section of it you are in. */
  const isCurrent = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] transition-colors duration-500 ${
        lifted
          ? "border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-[1800px] items-center justify-between px-5 sm:h-16 sm:px-8">
        <Link
          href="/"
          aria-label={`${studio.name} — home`}
          className="focus-frame group flex items-center gap-2 text-ink transition-colors duration-300 hover:text-accent"
        >
          {/*
            The mask is filled with currentColor, so it follows the theme and
            the hover. Sized generously for a bar: the mark is an ornate
            script, and below roughly 30px its flourishes collapse into an
            unreadable smudge — it needs the height far more than a plain
            lettermark would.
          */}
          <span aria-hidden className="wordmark h-[32px] sm:h-[38px]" />
          <span className="sr-only">{studio.name}</span>
        </Link>

        {/* Desktop */}
        <nav aria-label="Chapters" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {navLinks.map((link) => {
              const current = isCurrent(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={`focus-frame mono-label transition-colors duration-300 hover:text-ink ${
                      current ? "text-accent" : "text-ink-dim"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/contact"
            className="focus-frame mono-label hidden border border-[var(--line)] px-4 py-2.5 text-ink transition-colors duration-300 hover:border-accent hover:text-accent sm:block"
          >
            START A PROJECT
          </Link>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="focus-frame flex h-10 w-10 items-center justify-center lg:hidden"
          >
            <span className="sr-only">
              {open ? "Close menu" : "Open menu"}
            </span>
            <span aria-hidden className="relative block h-3 w-5">
              <span
                className={`absolute left-0 h-px w-5 bg-ink transition-all duration-300 ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 h-px w-5 bg-ink transition-all duration-300 ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      <div
        id="mobile-nav"
        ref={panelRef}
        hidden={!open}
        className="border-t border-[var(--line)] bg-[var(--bg)]/97 backdrop-blur-md lg:hidden"
      >
        <nav aria-label="Chapters">
          <ul className="px-5 py-3">
            {navLinks.map((link, i) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className="focus-frame flex items-baseline justify-between border-b border-[var(--line)] py-4"
                >
                  <span className="font-serif text-2xl italic text-ink">
                    {link.label}
                  </span>
                  <span className="mono-label text-ink-dim">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="px-5 pb-6 pt-2">
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="focus-frame mono-label block border border-accent px-4 py-4 text-center text-accent"
            >
              START A PROJECT
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
