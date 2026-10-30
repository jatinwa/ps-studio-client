"use client";

import { useEffect, useRef } from "react";
import { ScrollTrigger } from "@/lib/scroll/gsap";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";

/**
 * The lighting rig: two studio umbrellas that swing in from the edges of the
 * screen as the hero opens, with the modelling lamps firing every few seconds.
 *
 * This is the one place on the site where real 3D earns its place — a shot of
 * an umbrella would sit flat, where a lit mesh catches its rim differently as
 * it swings and as the lamp fires, which is the whole effect.
 *
 * Three.js is imported dynamically so it stays out of the initial bundle: the
 * page is readable long before the rig is, and nobody should wait on a
 * renderer to read a photographer's homepage. Under reduced motion it is
 * never loaded at all.
 */
export function LightRig({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const flashRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let teardown = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed || !host.isConnected) return;

      const width = () => host.clientWidth || 1;
      const height = () => host.clientHeight || 1;

      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "low-power",
      });
      // capped: past 2 the extra pixels cost real milliseconds and show nothing
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width(), height(), false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width() / height(), 0.1, 60);
      camera.position.set(0, 0, 7);

      /*
       * Ten radial segments, not a smooth sweep. A high-poly dish reads as a
       * bowl; ten flat panels read as the ribs of an umbrella, which is the
       * thing being drawn — and it is cheaper.
       */
      /*
       * Where they start and stop. At this camera the frame's half-width is
       * about 3.5 units, so a rig parked much beyond that spends its whole
       * travel out of sight and simply appears at the edge — these are set so
       * most of the swing happens where it can actually be seen.
       */
      const START_X = 5.0;
      const REST_X = 2.95;

      const PANELS = 10;
      const profile: InstanceType<typeof THREE.Vector2>[] = [];
      for (let i = 0; i <= 12; i += 1) {
        const r = (i / 12) * 0.95;
        profile.push(new THREE.Vector2(r, -0.52 * r * r));
      }

      const canopyGeo = new THREE.LatheGeometry(profile, PANELS);
      const shaftGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.9, 6);
      const poleGeo = new THREE.CylinderGeometry(0.045, 0.045, 7, 8);

      const canopyMat = new THREE.MeshStandardMaterial({
        color: 0xfbf3e4,
        side: THREE.DoubleSide,
        roughness: 0.82,
        metalness: 0.05,
        emissive: new THREE.Color(0xd8a84e),
        emissiveIntensity: 0.05,
        transparent: true,
        opacity: 0.66,
      });
      const metalMat = new THREE.MeshStandardMaterial({
        color: 0x2b2520,
        roughness: 0.55,
        metalness: 0.7,
      });

      interface Rig {
        group: InstanceType<typeof THREE.Group>;
        lamp: InstanceType<typeof THREE.PointLight>;
        side: number;
      }

      const makeRig = (side: number): Rig => {
        const group = new THREE.Group();

        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        /*
         * Turned on two axes, not one. Tipped only about Z the dish is seen
         * almost edge-on and reads as a flat leaf; the Y turn opens its mouth
         * toward the camera so the panels catch the light at different angles,
         * which is what makes it legible as an umbrella.
         */
        canopy.rotation.z = side * -Math.PI * 0.3;
        canopy.rotation.y = side * 0.4;
        canopy.rotation.x = Math.PI * 0.05;
        group.add(canopy);

        const shaft = new THREE.Mesh(shaftGeo, metalMat);
        shaft.rotation.z = side * -Math.PI * 0.3;
        shaft.position.set(side * 0.62, -0.5, -0.1);
        group.add(shaft);

        const pole = new THREE.Mesh(poleGeo, metalMat);
        pole.position.set(side * 1.28, -4.5, -0.35);
        group.add(pole);

        // the modelling lamp, sitting in the mouth of the umbrella
        const lamp = new THREE.PointLight(0xffd9a0, 2.2, 14, 2);
        lamp.position.set(side * -0.35, 0.05, 0.5);
        group.add(lamp);

        group.position.set(side * START_X, 0.35, 0);
        scene.add(group);
        return { group, lamp, side };
      };

      const rigs = [makeRig(-1), makeRig(1)];
      scene.add(new THREE.AmbientLight(0xfff0dd, 0.5));
      const key = new THREE.DirectionalLight(0xffffff, 0.45);
      key.position.set(0, 2, 5);
      scene.add(key);

      /* ─── scroll drives how far in they swing ─── */
      let entry = 0;
      /*
       * The section, not the parent. The parent here is the pinned element,
       * whose box stops moving the moment the pin engages — a trigger on it
       * collapses to almost no range and the rigs snap in within the first few
       * hundred pixels. The section behind it is what actually scrolls.
       */
      const triggerEl = host.closest("section") ?? host.parentElement ?? host;
      const trigger = ScrollTrigger.create({
        trigger: triggerEl,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          entry = self.progress;
        },
      });

      /* ─── only draw while the hero is actually on screen ─── */
      let onScreen = true;
      const io = new IntersectionObserver(
        ([e]) => {
          onScreen = e.isIntersecting;
        },
        { threshold: 0 },
      );
      io.observe(host);

      const resize = () => {
        renderer.setSize(width(), height(), false);
        camera.aspect = width() / height();
        camera.updateProjectionMatrix();
      };
      window.addEventListener("resize", resize);

      const clock = new THREE.Clock();
      let raf = 0;

      const draw = () => {
        const t = clock.getElapsedTime();

        /*
         * The lamps fire together on a 3.4s cycle, with a fast attack and a
         * slower fall — a flash tube dumping and the tube cooling, rather than
         * a symmetrical pulse, which reads as a blinking LED.
         */
        const phase = (t % 3.4) / 3.4;
        const fire =
          phase < 0.045
            ? phase / 0.045
            : phase < 0.26
              ? 1 - (phase - 0.045) / 0.215
              : 0;
        const burst = fire * fire;

        for (const rig of rigs) {
          // swing in from off-screen, easing as they arrive
          const eased = 1 - Math.pow(1 - Math.min(entry * 1.25, 1), 3);
          rig.group.position.x = rig.side * (START_X - eased * (START_X - REST_X));
          rig.group.position.y = 0.35 + Math.sin(t * 0.6 + rig.side) * 0.12;
          rig.group.rotation.z = Math.sin(t * 0.45 + rig.side) * 0.045;
          rig.lamp.intensity = 2.2 + burst * 26;
        }
        canopyMat.emissiveIntensity = 0.05 + burst * 1.5;

        if (flashRef.current) {
          flashRef.current.style.opacity = String(burst * 0.17 * entry);
        }

        renderer.render(scene, camera);
      };

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (onScreen) draw();
      };
      loop();

      if (process.env.NODE_ENV !== "production") {
        Object.assign(window, {
          __lightRig: {
            draw,
            renderer,
            rigs,
            state: () => ({ entry, onScreen, rigX: rigs.map((r) => r.group.position.x) }),
            setEntry: (v: number) => {
              entry = v;
            },
          },
        });
      }

      teardown = () => {
        cancelAnimationFrame(raf);
        trigger.kill();
        io.disconnect();
        window.removeEventListener("resize", resize);
        canopyGeo.dispose();
        shaftGeo.dispose();
        poleGeo.dispose();
        canopyMat.dispose();
        metalMat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  return (
    <>
      <div
        ref={hostRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${className}`}
      />
      <div
        ref={flashRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[11]"
        style={{ background: "var(--text)", opacity: 0, mixBlendMode: "overlay" }}
      />
    </>
  );
}
