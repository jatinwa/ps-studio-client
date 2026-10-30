"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";

/**
 * The lens sitting inside the opening ring: barrel, coated front element and a
 * working iris whose blades breathe open and stopped down.
 *
 * It renders into its own small canvas inside the ring rather than into the
 * lighting rig's full-screen one. Aligning a mesh to a 160px ring through the
 * big scene's projection would have to be re-derived on every resize and every
 * reflow of the type above it; a canvas that *is* the ring is positioned by
 * layout and cannot drift.
 */
export function LensCore({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let teardown = () => {};

    (async () => {
      const THREE = await import("three");
      if (disposed || !host.isConnected) return;

      const size = () => Math.max(host.clientWidth || 1, 1);

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        // a browser that is out of WebGL contexts still gets the ring, empty
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(size(), size(), false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.borderRadius = "9999px";
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0, 4.2);

      const lens = new THREE.Group();
      scene.add(lens);

      /* ─── barrel ─── */
      const barrelGeo = new THREE.CylinderGeometry(1, 1, 1.1, 48, 1, true);
      const barrelMat = new THREE.MeshStandardMaterial({
        color: 0x17130f,
        roughness: 0.62,
        metalness: 0.55,
        side: THREE.DoubleSide,
      });
      const barrel = new THREE.Mesh(barrelGeo, barrelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.55;
      lens.add(barrel);

      /* ─── front rim ─── */
      const rimGeo = new THREE.TorusGeometry(0.98, 0.075, 14, 56);
      const rimMat = new THREE.MeshStandardMaterial({
        color: 0x6b5c4a,
        roughness: 0.28,
        metalness: 0.92,
      });
      lens.add(new THREE.Mesh(rimGeo, rimMat));

      /* ─── the front element, and the coating that gives it its colour ─── */
      const glassGeo = new THREE.SphereGeometry(0.9, 48, 32);
      /*
       * Transparent, and drawn last. Left opaque — which is the default, with
       * no transmission set — this cap is simply a lid over the barrel: the
       * iris and the coating rings are all behind it and none of them reach
       * the screen, which renders the lens as a dark disc with a highlight.
       */
      const glassMat = new THREE.MeshPhysicalMaterial({
        color: 0x1d4455,
        roughness: 0.08,
        metalness: 0.2,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      });
      const glass = new THREE.Mesh(glassGeo, glassMat);
      // flattened into a shallow cap rather than a ball sticking out of the barrel
      glass.scale.set(1, 1, 0.34);
      glass.position.z = 0.02;
      glass.renderOrder = 3;
      lens.add(glass);

      const coatGeo = new THREE.TorusGeometry(0.70, 0.042, 10, 56);
      const coatWarm = new THREE.MeshBasicMaterial({
        color: 0xd8a84e,
        transparent: true,
        opacity: 0.85,
      });
      const coatCool = new THREE.MeshBasicMaterial({
        color: 0x4fb3a8,
        transparent: true,
        opacity: 0.55,
      });
      const ringWarm = new THREE.Mesh(coatGeo, coatWarm);
      ringWarm.position.z = 0.19;
      ringWarm.renderOrder = 4;
      lens.add(ringWarm);
      const ringCool = new THREE.Mesh(coatGeo, coatCool);
      ringCool.position.z = 0.15;
      ringCool.renderOrder = 4;
      ringCool.scale.setScalar(0.66);
      lens.add(ringCool);

      /*
       * A dark disc closing off the back of the barrel. Without it the lit
       * inner wall shows through the open iris and the pupil reads mid-grey,
       * where the inside of a lens should go to black.
       */
      const wellGeo = new THREE.CircleGeometry(0.92, 48);
      const wellMat = new THREE.MeshBasicMaterial({ color: 0x070605 });
      const well = new THREE.Mesh(wellGeo, wellMat);
      well.position.z = -0.42;
      lens.add(well);

      /*
       * The iris. Each blade pivots about a point on the rim, which is how a
       * real one works — swinging them inward overlaps their curved edges into
       * the polygon you see. Scaling a ring's inner radius would be far less
       * code and would read as a hole shrinking, not as blades closing.
       */
      const BLADES = 9;
      const bladeGeo = new THREE.PlaneGeometry(1.15, 0.95);
      const bladeMat = new THREE.MeshStandardMaterial({
        color: 0x0d0b09,
        roughness: 0.78,
        metalness: 0.35,
        side: THREE.DoubleSide,
      });
      const blades: InstanceType<typeof THREE.Mesh>[] = [];
      for (let i = 0; i < BLADES; i += 1) {
        const pivot = new THREE.Group();
        pivot.rotation.z = (i / BLADES) * Math.PI * 2;
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(0.8, 0, -0.06);
        pivot.add(blade);
        lens.add(pivot);
        blades.push(blade);
      }

      /* ─── a single bright specular, so the glass reads as glass ─── */
      const specGeo = new THREE.SphereGeometry(0.075, 16, 16);
      const specMat = new THREE.MeshBasicMaterial({ color: 0xfff6e2 });
      const spec = new THREE.Mesh(specGeo, specMat);
      spec.position.set(-0.34, 0.34, 0.38);
      spec.renderOrder = 5;
      lens.add(spec);

      scene.add(new THREE.AmbientLight(0xfff1dd, 1.15));
      const key = new THREE.DirectionalLight(0xffffff, 3.1);
      key.position.set(-2, 2.4, 3);
      scene.add(key);
      const fill = new THREE.PointLight(0xd8a84e, 11, 9, 2);
      fill.position.set(1.6, -1.2, 1.8);
      scene.add(fill);

      /* ─── the lens follows the pointer, a little ─── */
      let pointerX = 0;
      let pointerY = 0;
      const onPointer = (e: PointerEvent) => {
        pointerX = (e.clientX / window.innerWidth) * 2 - 1;
        pointerY = (e.clientY / window.innerHeight) * 2 - 1;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      let onScreen = true;
      const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), {
        threshold: 0,
      });
      io.observe(host);

      const ro = new ResizeObserver(() => {
        renderer.setSize(size(), size(), false);
      });
      ro.observe(host);

      const clock = new THREE.Clock();
      let raf = 0;

      const draw = () => {
        const t = clock.getElapsedTime();

        // breathe between wide open and stopped down
        const open = 0.5 + Math.sin(t * 0.55) * 0.5;
        const angle = -0.52 + (1 - open) * 1.02;
        for (const blade of blades) blade.rotation.z = angle;

        lens.rotation.y = pointerX * 0.17 + Math.sin(t * 0.3) * 0.02;
        lens.rotation.x = pointerY * 0.13 + Math.cos(t * 0.26) * 0.02;
        lens.rotation.z = t * 0.05;

        ringWarm.scale.setScalar(1 + Math.sin(t * 0.8) * 0.03);
        renderer.render(scene, camera);
      };

      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (onScreen) draw();
      };
      loop();

      if (process.env.NODE_ENV !== "production") {
        Object.assign(window, {
          __lensCore: { draw, renderer, lens, blades },
        });
      }

      teardown = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        ro.disconnect();
        window.removeEventListener("pointermove", onPointer);
        [barrelGeo, rimGeo, glassGeo, coatGeo, bladeGeo, specGeo, wellGeo].forEach((gm) =>
          gm.dispose(),
        );
        [
          barrelMat,
          rimMat,
          glassMat,
          coatWarm,
          coatCool,
          bladeMat,
          specMat,
          wellMat,
        ].forEach((m) => m.dispose());
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
    <span
      ref={hostRef}
      aria-hidden
      className={`block h-full w-full overflow-hidden rounded-full ${className}`}
    />
  );
}
