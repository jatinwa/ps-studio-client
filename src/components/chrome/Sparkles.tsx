"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";

/**
 * Drifting dust motes over the opening frame, lit by the cursor.
 *
 * The opening is deliberately almost empty — black, a wordmark, a scroll hint —
 * which left nothing to react to before the first scroll. These are the specks
 * you see hanging in a lit studio: they drift on their own, and brighten and
 * lean toward the pointer as it passes.
 *
 * One canvas, no DOM churn. The loop only runs while the element is on screen
 * and the tab is visible, and it does not run at all under reduced motion.
 */

interface Mote {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  base: number;
  phase: number;
}

const COUNT = 46;
/** Pointer influence radius, in px. */
const REACH = 190;

export function Sparkles({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let motes: Mote[] = [];
    let raf = 0;
    let visible = false;
    const pointer = { x: -9999, y: -9999, active: false };

    const seed = () => {
      motes = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.6 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.05 - Math.random() * 0.14, // drift gently upward, like real dust
        base: 0.18 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (!cw || !ch) return;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = cw;
      h = ch;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!motes.length) seed();
    };

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -8) m.y = h + 8;
        if (m.x < -8) m.x = w + 8;
        if (m.x > w + 8) m.x = -8;

        let alpha = m.base * (0.65 + 0.35 * Math.sin(t / 900 + m.phase));
        let radius = m.r;

        if (pointer.active) {
          const dx = pointer.x - m.x;
          const dy = pointer.y - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist < REACH) {
            const pull = 1 - dist / REACH;
            alpha = Math.min(1, alpha + pull * 0.85);
            radius = m.r * (1 + pull * 1.5);
            // lean toward the cursor without ever reaching it
            m.x += (dx / (dist || 1)) * pull * 0.5;
            m.y += (dy / (dist || 1)) * pull * 0.5;
          }
        }

        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, radius * 4);
        g.addColorStop(0, `rgba(201, 169, 106, ${alpha})`);
        g.addColorStop(0.4, `rgba(201, 169, 106, ${alpha * 0.35})`);
        g.addColorStop(1, "rgba(201, 169, 106, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, radius * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(
      ([entry]) => {
        const next = entry.isIntersecting && !document.hidden;
        if (next === visible) return;
        visible = next;
        if (visible) raf = requestAnimationFrame(draw);
        else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
