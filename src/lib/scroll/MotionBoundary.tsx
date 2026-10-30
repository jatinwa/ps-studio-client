"use client";

import { Fragment, type ReactNode } from "react";
import { useStaticLayout } from "@/lib/hooks/useStaticLayout";

/**
 * Remounts the page when the pinned/static layout decision flips —
 * either the motion preference changed or the viewport got too short to pin.
 *
 * The pinned and static trees are different markup, and the pinned one
 * hands nodes to GSAP — ScrollTrigger's `pin` physically wraps a pinned
 * element in a pin-spacer. If the decision flips while mounted, React swaps
 * that subtree during commit while GSAP still owns those nodes, and the two
 * fight over the same DOM; that reliably took the renderer down.
 *
 * Keying on the preference makes the swap a full unmount/mount instead: GSAP's
 * cleanup runs against the old, already-detached nodes and never touches the
 * fresh tree. This flips rarely — a rotation, or a window drag across the
 * threshold — so the cost of remounting is irrelevant, and strictly cheaper
 * than a crash.
 */
export function MotionBoundary({ children }: { children: ReactNode }) {
  const isStatic = useStaticLayout();
  return <Fragment key={isStatic ? "static" : "pinned"}>{children}</Fragment>;
}
