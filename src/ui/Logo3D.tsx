import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { MARK_PATH } from "./logo-path";

/*
  The Seer mark as a solid object: the brand's two interlocking forms extruded,
  bevelled and finished in glossy electric violet, like the brandbook's app icon.
  It drifts slowly and leans toward the pointer; it stays still for reduced motion.
*/
export default function Logo3D({ className }: { className?: string }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 11.5);

    // Mark geometry, centred and flipped into a y-up world.
    const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill-rule="evenodd" d="${MARK_PATH}"/></svg>`);
    const shapes = svg.paths.flatMap((p) => SVGLoader.createShapes(p));
    // Thin slab with a fine bevel, so the gap between the two forms stays open.
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: 2.2, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.16, bevelOffset: -0.08, bevelSegments: 6, curveSegments: 24 });
    geo.center();
    geo.scale(0.17, -0.17, 0.17);
    geo.computeVertexNormals();

    // Caps carry the logo and stay light; the sides are a deeper violet so the outline reads.
    const face = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#8A4CFA"), metalness: 0.2, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.25, iridescenceIOR: 1.35 });
    const side = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#4A17B8"), metalness: 0.45, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const mat = [face, side];
    const mark = new THREE.Mesh(geo, mat);
    const pivot = new THREE.Group();
    pivot.add(mark);
    pivot.rotation.set(-0.12, -0.3, 0.05);
    scene.add(pivot);

    const key = new THREE.DirectionalLight("#ffffff", 2.6);
    key.position.set(3, 4, 8);
    const rim = new THREE.DirectionalLight("#BFBFE6", 3);
    rim.position.set(-6, -2, -4);
    const fill = new THREE.PointLight("#9C6FF2", 30, 30);
    fill.position.set(-3, 3, 5);
    scene.add(key, rim, fill, new THREE.AmbientLight("#ffffff", 0.25));

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const target = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
      target.y = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible) return;
      const t = clock.getElapsedTime();
      pivot.rotation.y += (-0.3 + Math.sin(t * 0.35) * 0.28 + target.x * 0.6 - pivot.rotation.y) * 0.04;
      pivot.rotation.x += (-0.12 + Math.cos(t * 0.3) * 0.08 + target.y * 0.5 - pivot.rotation.x) * 0.04;
      pivot.position.y = Math.sin(t * 0.8) * 0.12;
      renderer.render(scene, camera);
    };
    if (still) renderer.render(scene, camera);
    else tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      ro.disconnect();
      io.disconnect();
      geo.dispose();
      face.dispose();
      side.dispose();
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className={className} aria-hidden />;
}
