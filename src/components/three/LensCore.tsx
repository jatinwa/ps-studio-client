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
/** What the opening sequence can drive from outside. */
export interface LensApi {
  /** 0 = resting, 1 = pushed right into the front element. */
  setDolly(v: number): void;
}

export function LensCore({
  className = "",
  apiRef,
}: {
  className?: string;
  apiRef?: React.MutableRefObject<LensApi | null>;
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
      /*
       * Two addons do most of the realism here. Hard box edges and flat
       * shading are what made the first body read as a prop: real cameras
       * have moulded corners, and metal and glass only look like metal and
       * glass when there is something for them to reflect.
       */
      const { RoundedBoxGeometry } = await import(
        "three/examples/jsm/geometries/RoundedBoxGeometry.js"
      );
      const { RoomEnvironment } = await import(
        "three/examples/jsm/environments/RoomEnvironment.js"
      );
      if (disposed || !host.isConnected) return;

      /*
       * Width and height read separately. They used to be one square value,
       * which was fine while the host was a circle — a camera body is wider
       * than it is tall, so the frame has to be too or the sides are cropped.
       */
      /*
       * The drawing buffer is a FIXED size, decided from the viewport — not
       * from the host element.
       *
       * The host grows from ~300px to wider than the screen during the push.
       * Following that with setSize meant reallocating the WebGL buffer on
       * every frame of the scroll, which is why the camera went blank while
       * moving and only reappeared once scrolling stopped. The buffer is now
       * allocated once and the canvas is simply scaled by CSS: at rest it is
       * displayed smaller than the buffer, at full push roughly 1:1, so it
       * stays sharp throughout without a single reallocation.
       *
       * The host keeps a constant 4:3 aspect, so scaling it never distorts.
       */
      const ASPECT = 4 / 3;
      const bufferWidth = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        return Math.round(Math.min(window.innerWidth * dpr, 2400));
      };
      const w = () => bufferWidth();
      const h = () => Math.round(bufferWidth() / ASPECT);

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

      // 1, deliberately: device pixel ratio is already folded into the fixed
      // buffer size above, and setting it here would square that factor
      renderer.setPixelRatio(1);
      renderer.setSize(w(), h(), false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      // filmic response, so highlights roll off instead of clipping to white
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();

      // a small studio box, blurred into an environment map; this is what the
      // barrel, the rim and the glass actually reflect
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(new RoomEnvironment(), 0.05);
      scene.environment = envRT.texture;
      const camera = new THREE.PerspectiveCamera(30, ASPECT, 0.1, 50);
      /*
       * Pulled back from 4.2 to make room for the body. The host is clipped to
       * a circle, so anything wider than the frame's inscribed circle is cut:
       * at this distance a 2.3-wide body sits at radius ~1.5, inside the ~1.9
       * the circle allows, and nothing important lands on the crop.
       */
      /*
       * The dolly moves this camera rather than scaling the element.
       * Scaling the canvas in CSS magnifies a fixed grid of pixels and the
       * whole thing turns to mush by about 2x; moving the camera is a real
       * approach and stays sharp however close it gets.
       */
      const REST_Z = 6.2;
      const NEAR_Z = 1.25;
      camera.position.set(0, 0, REST_Z);

      const lens = new THREE.Group();
      scene.add(lens);

      /* ─── the camera the lens is mounted on ─── */
      /*
       * Two body materials, because a camera is not one surface. The shell is
       * a near-matte moulding that mostly swallows light; the plates and
       * dials beside it are machined metal that catches it.
       */
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x171412,
        roughness: 0.86,
        metalness: 0.12,
      });
      const plateMat = new THREE.MeshStandardMaterial({
        color: 0x2c2823,
        roughness: 0.34,
        metalness: 0.9,
      });
      const accentMat = new THREE.MeshStandardMaterial({
        color: 0xd8a84e,
        roughness: 0.3,
        metalness: 0.85,
      });

      const bodyGeo = new RoundedBoxGeometry(3.1, 2.2, 1.0, 6, 0.16);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.position.z = -1.15;
      lens.add(bodyMesh);

      // the pentaprism hump — the silhouette that makes it read as a camera
      const prismGeo = new RoundedBoxGeometry(1.12, 0.52, 0.8, 4, 0.07);
      const prism = new THREE.Mesh(prismGeo, plateMat);
      prism.position.set(0, 1.34, -1.2);
      lens.add(prism);

      // hot shoe
      const shoeGeo = new RoundedBoxGeometry(0.4, 0.1, 0.32, 2, 0.02);
      const shoe = new THREE.Mesh(shoeGeo, plateMat);
      shoe.position.set(0, 1.64, -1.2);
      lens.add(shoe);

      // the grip, offset so the body is not symmetrical and reads as a shape
      const gripGeo = new RoundedBoxGeometry(0.62, 2.0, 1.08, 5, 0.22);
      const grip = new THREE.Mesh(gripGeo, bodyMat);
      grip.position.set(-1.56, -0.1, -1.15);
      lens.add(grip);

      // shutter release, in the studio's gold
      const buttonGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 16);
      const button = new THREE.Mesh(buttonGeo, accentMat);
      button.rotation.x = Math.PI / 2;
      button.position.set(-1.52, 1.02, -1.02);
      lens.add(button);


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

      /* ─── knurled focus ring around the barrel ─── */
      const focusGeo = new THREE.CylinderGeometry(1.04, 1.04, 0.34, 28, 1, true);
      const focusMat = new THREE.MeshStandardMaterial({
        color: 0x201c18,
        roughness: 0.55,
        metalness: 0.65,
        side: THREE.DoubleSide,
        flatShading: true, // 28 flat facets read as the ribbing on a focus ring
      });
      const focus = new THREE.Mesh(focusGeo, focusMat);
      focus.rotation.x = Math.PI / 2;
      focus.position.z = -0.42;
      lens.add(focus);

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
            /*
       * Sized to stay inside the barrel. At 1.15 wide on a 0.8 pivot the far
       * corner sat at radius ~1.45, well past the barrel's 1.04 — head-on the
       * barrel hid it, but the moment the camera turned the blades showed as
       * spikes around the lens.
       */
      const bladeGeo = new THREE.PlaneGeometry(0.78, 0.66);
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
        blade.position.set(0.58, 0, -0.1);
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

      scene.add(new THREE.AmbientLight(0xfff1dd, 0.55));
      const key = new THREE.DirectionalLight(0xffffff, 3.1);
      key.position.set(-2, 2.4, 3);
      scene.add(key);
      const fill = new THREE.PointLight(0xd8a84e, 11, 9, 2);
      fill.position.set(1.6, -1.2, 1.8);
      scene.add(fill);
      /*
       * A rim from behind. Without it the dark body sits on a light page as a
       * flat silhouette — this picks out the top and shoulder so the shape
       * reads as an object rather than a cut-out.
       */
      const rimLight = new THREE.DirectionalLight(0xfff4e2, 2.4);
      rimLight.position.set(2.4, 2.8, -3.2);
      scene.add(rimLight);

      /* ─── the lens follows the pointer, a little ─── */
      /*
       * Measured from the camera's own centre, not the window's, so it turns
       * to face wherever the cursor actually is rather than leaning on a
       * window-wide average. The rect is cached and refreshed on scroll and
       * resize — reading it on every pointer move would force layout
       * constantly.
       */
      let cx = 0;
      let cy = 0;
      const recentre = () => {
        const r = host.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
      };
      recentre();

      let pointerX = 0;
      let pointerY = 0;
      const onPointer = (e: PointerEvent) => {
        // normalised against roughly a third of the viewport, so the camera
        // reaches full turn while the cursor is still near it
        pointerX = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.32)));
        pointerY = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.32)));
      };
      window.addEventListener("scroll", recentre, { passive: true });
      window.addEventListener("resize", recentre);
      window.addEventListener("pointermove", onPointer, { passive: true });

      let onScreen = true;
      const io = new IntersectionObserver(([e]) => (onScreen = e.isIntersecting), {
        threshold: 0,
      });
      io.observe(host);

      /*
       * Only a real viewport change re-allocates, and even then on a debounce.
       * Observing the host would put us straight back to reallocating the
       * buffer on every frame of the push.
       */
      let resizeTimer = 0;
      const onViewportResize = () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          renderer.setSize(w(), h(), false);
          recentre();
        }, 180);
      };
      window.addEventListener("resize", onViewportResize);

      const clock = new THREE.Clock();
      let raf = 0;

      /*
       * Eased so the last stretch of the push slows as the glass fills the
       * frame — a linear dolly reads as a zoom, this reads as arriving.
       */
      let dolly = 0;
      const setDolly = (v: number) => {
        dolly = Math.max(0, Math.min(1, v));
        const eased = 1 - Math.pow(1 - dolly, 2.2);
        camera.position.z = REST_Z - (REST_Z - NEAR_Z) * eased;
      };
      if (apiRef) apiRef.current = { setDolly };

      const draw = () => {
        const t = clock.getElapsedTime();

        // breathe between wide open and stopped down
        const open = 0.5 + Math.sin(t * 0.55) * 0.5;
        const angle = -0.52 + (1 - open) * 1.02;
        for (const blade of blades) blade.rotation.z = angle;

        /*
         * Eased towards the cursor rather than snapped to it. The turn is
         * roughly three times what it was — it used to barely register — and
         * the lerp keeps a fast flick of the mouse from looking like a twitch.
         */
        const targetY = pointerX * 0.62 + Math.sin(t * 0.3) * 0.02;
        const targetX = pointerY * 0.46 + Math.cos(t * 0.26) * 0.02;
        lens.rotation.y += (targetY - lens.rotation.y) * 0.085;
        lens.rotation.x += (targetX - lens.rotation.x) * 0.085;
        /*
         * No roll. A slow spin on Z read as "alive" while this was a bare
         * lens, which is radially symmetric — on a body with a grip and a
         * prism it reads as the whole camera tumbling.
         */

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
          __lensCore: { draw, renderer, lens, blades, setDolly, camera },
        });
      }

      teardown = () => {
        if (apiRef) apiRef.current = null;
        cancelAnimationFrame(raf);
        io.disconnect();
        window.clearTimeout(resizeTimer);
        window.removeEventListener("resize", onViewportResize);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("scroll", recentre);
        window.removeEventListener("resize", recentre);
        envRT.texture.dispose();
        pmrem.dispose();
        [barrelGeo, rimGeo, glassGeo, coatGeo, bladeGeo, specGeo, wellGeo,
         bodyGeo, prismGeo, shoeGeo, gripGeo, buttonGeo, focusGeo].forEach((gm) =>
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
          bodyMat,
          plateMat,
          accentMat,
          focusMat,
        ].forEach((m) => m.dispose());
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, [apiRef]);

  return (
    <span
      ref={hostRef}
      aria-hidden
      className={`block h-full w-full ${className}`}
    />
  );
}
