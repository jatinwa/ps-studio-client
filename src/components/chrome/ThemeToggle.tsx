"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark";
const KEY = "payal-theme";

/**
 * The concept ships two complete skins — warm paper and warm black — so the
 * site offers both rather than picking one. The OS preference wins until the
 * visitor chooses, and the choice is remembered per browser.
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode | null>(null);

  useEffect(() => {
    const settle = setTimeout(() => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(KEY);
      } catch {
        /* private mode — fall through to the OS preference */
      }
      const next: Mode =
        stored === "light" || stored === "dark"
          ? stored
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      setMode(next);
      document.documentElement.dataset.theme = next;
    }, 0);
    return () => clearTimeout(settle);
  }, []);

  const flip = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* not fatal — the toggle still works for this visit */
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} theme`}
      className="flex h-9 w-9 items-center justify-center border transition-colors"
      style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}
    >
      <span aria-hidden className="font-mono text-[0.7rem]">
        {mode === "dark" ? "☾" : "☀"}
      </span>
    </button>
  );
}
