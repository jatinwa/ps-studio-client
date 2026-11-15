"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/hooks/useReducedMotion";

export type PropKind = "film" | "softbox";

/**
 * A piece of the studio's kit, modelled and turning slowly beside the text.
 *
 * Built on what the opening camera taught us:
 *
 *  - The drawing buffer is allocated ONCE from the element's size. Following
 *    the element with a ResizeObserver meant reallocating the WebGL buffer on
 *    every animated frame, which blanked the canvas while anything moved.
 *  - It only draws while it is on screen, so a prop three sections down costs
 *    nothing until it is reached.
 *  - Three.js is imported dynamically, and never at all under reduced motion.
 */
export function StudioProp({
  kind,
  className = "",
}: {
  kind: PropKind;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let teardown = () => {};

    (async () => {
      const THREE = await import("three");
      const { RoundedBoxGeometry } = await import(
        "three/examples/jsm/geometries/RoundedBoxGeometry.js"
      );
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      if (disposed || !host.isConnected) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.max(host.clientWidth, 1);
      const H = Math.max(host.clientHeight, 1);

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return; // out of WebGL contexts: the layout simply has a gap here
      }
      renderer.setPixelRatio(1);
      renderer.setSize(Math.round(W * dpr), Math.round(H * dpr), false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(new RoomEnvironment(), 0.05);
      scene.environment = envRT.texture;

      const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 50);
      camera.position.set(0, 0.2, 6);

      const rig = new THREE.Group();
      scene.add(rig);

      const geos: { dispose(): void }[] = [];
      const mats: { dispose(): void }[] = [];
      const track = <T extends { dispose(): void }>(x: T, into: typeof geos) => {
        into.push(x);
        return x;
      };

      const dark = track(
        new THREE.MeshStandardMaterial({
          color: 0x17130f,
          roughness: 0.74,
          metalness: 0.28,
        }),
        mats,
      );
      const metal = track(
        new THREE.MeshStandardMaterial({
          color: 0x6b5c4a,
          roughness: 0.28,
          metalness: 0.92,
        }),
        mats,
      );
      const gold = track(
        new THREE.MeshStandardMaterial({
          color: 0xd8a84e,
          roughness: 0.3,
          metalness: 0.88,
        }),
        mats,
      );

      if (kind === "film") {
        /* a 35mm canister with the leader pulled out */
        const body = track(new THREE.CylinderGeometry(1, 1, 1.5, 40), geos);
        const can = new THREE.Mesh(body, dark);
        can.rotation.z = Math.PI / 2;
        rig.add(can);

        const capGeo = track(new THREE.CylinderGeometry(1.04, 1.04, 0.14, 40), geos);
        for (const x of [-0.78, 0.78]) {
          const cap = new THREE.Mesh(capGeo, metal);
          cap.rotation.z = Math.PI / 2;
          cap.position.x = x;
          rig.add(cap);
        }

        const spoolGeo = track(new THREE.CylinderGeometry(0.2, 0.2, 2.1, 20), geos);
        const spool = new THREE.Mesh(spoolGeo, gold);
        spool.rotation.z = Math.PI / 2;
        rig.add(spool);

        // the leader, a curl of strip coming off the canister
        const leaderGeo = track(new THREE.PlaneGeometry(2.4, 0.95, 24, 1), geos);
        const pos = leaderGeo.attributes.position;
        for (let i = 0; i < pos.count; i += 1) {
          const x = pos.getX(i);
          pos.setZ(i, Math.sin((x + 1.2) * 1.15) * 0.52);
          pos.setY(i, pos.getY(i) + Math.cos((x + 1.2) * 0.8) * 0.18);
        }
        leaderGeo.computeVertexNormals();
        const leaderMat = track(
          new THREE.MeshStandardMaterial({
            color: 0x241d16,
            roughness: 0.62,
            metalness: 0.2,
            side: THREE.DoubleSide,
          }),
          mats,
        );
        const leader = new THREE.Mesh(leaderGeo, leaderMat);
        leader.position.set(1.9, -0.1, 0);
        rig.add(leader);
      } else {
        /* a softbox on a stand */
        const boxGeo = track(new RoundedBoxGeometry(2.3, 2.3, 0.5, 5, 0.12), geos);
        const face = track(
          new THREE.MeshStandardMaterial({
            color: 0xfdf6e8,
            roughness: 0.92,
            metalness: 0.02,
            emissive: new THREE.Color(0xfff3dd),
            emissiveIntensity: 0.42,
          }),
          mats,
        );
        const box = new THREE.Mesh(boxGeo, face);
        box.position.y = 0.7;
        box.rotation.y = -0.3;
        rig.add(box);

        const armGeo = track(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 10), geos);
        const arm = new THREE.Mesh(armGeo, dark);
        arm.position.set(0.1, -0.6, -0.4);
        rig.add(arm);

        const standGeo = track(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 12), geos);
        const stand = new THREE.Mesh(standGeo, metal);
        stand.position.set(0.1, -2.1, -0.4);
        rig.add(stand);

        const knobGeo = track(new THREE.SphereGeometry(0.17, 18, 14), geos);
        const knob = new THREE.Mesh(knobGeo, gold);
        knob.position.set(0.1, -1.35, -0.4);
        rig.add(knob);
      }

      scene.add(new THREE.AmbientLight(0xfff1dd, 0.7));
      const key = new THREE.DirectionalLight(0xffffff, 2.6);
      key.position.set(-2, 2.4, 3.4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xfff4e2, 1.9);
      rim.position.set(2.6, 2.4, -3);
      scene.add(rim);

      let onScreen = true;
      const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), {
        threshold: 0,
      });
      io.observe(host);

      let pointer = 0;
      const onPointer = (e: PointerEvent) => {
        pointer = (e.clientX / window.innerWidth) * 2 - 1;
      };
      window.addEventListener("pointermove", onPointer, { passive: true });

      const clock = new THREE.Clock();
      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        if (!onScreen) return;
        const t = clock.getElapsedTime();
        const target = t * 0.18 + pointer * 0.4;
        rig.rotation.y += (target - rig.rotation.y) * 0.06;
        rig.rotation.x = Math.sin(t * 0.4) * 0.07;
        rig.position.y = Math.sin(t * 0.55) * 0.1;
        renderer.render(scene, camera);
      };
      loop();

      teardown = () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        window.removeEventListener("pointermove", onPointer);
        geos.forEach((g) => g.dispose());
        mats.forEach((m) => m.dispose());
        envRT.texture.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, [kind]);

  return <div ref={hostRef} aria-hidden className={className} />;
}
