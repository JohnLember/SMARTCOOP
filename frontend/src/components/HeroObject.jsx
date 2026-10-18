// The latex cup floating beside the landing headline. A photo is flat, so it is
// drawn unlit (MeshBasicMaterial): a lit physical material or an environment map
// would tint and wash the photograph instead of adding depth. Depth comes from
// the perspective tilt toward the pointer and a contact shadow that shrinks as it floats.
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import cupImage from "../assets/hero-image.png";

const ASPECT = 1513 / 1039; // hero-image.png
const LERP = 0.06;

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, "rgba(4,6,4,0.85)");
  grad.addColorStop(1, "rgba(6,9,6,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function HeroObject() {
  const box = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = box.current;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 0, 7);

    const w = 4;
    const cupGeo = new THREE.PlaneGeometry(w, w / ASPECT);
    const cupTex = new THREE.TextureLoader().load(cupImage, () => {
      if (disposed) return;
      setReady(true);
      renderer.render(scene, camera);
    });
    cupTex.colorSpace = THREE.SRGBColorSpace;
    cupTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const cupMat = new THREE.MeshBasicMaterial({ map: cupTex, transparent: true, toneMapped: false });
    const cup = new THREE.Mesh(cupGeo, cupMat);
    scene.add(cup);

    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadowTex = shadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    const h = w / ASPECT;
    // The cup's base sits ~7% above the PNG's bottom edge (transparent margin); shadow goes just under it.
    const shadowY = -h / 2 + h * 0.07 - 0.12;
    shadow.position.set(0, shadowY, -0.2);
    scene.add(shadow);

    // Pointer position in -1..1, eased toward every frame.
    const target = { x: 0, y: 0 };
    const onPointer = (e) => {
      target.x = (e.clientX / innerWidth) * 2 - 1;
      target.y = (e.clientY / innerHeight) * 2 - 1;
    };

    const clock = new THREE.Clock();
    let raf = 0;
    const frame = () => {
      const t = clock.getElapsedTime();
      const float = Math.sin(t * 1.1) * 0.08;
      cup.position.y = float;
      // Slow yaw sway stands in for "spin": a full turn would show the photo's flat edge.
      cup.rotation.y += (target.x * 0.35 + Math.sin(t * 0.4) * 0.1 - cup.rotation.y) * LERP;
      cup.rotation.x += (target.y * 0.22 - cup.rotation.x) * LERP;
      // Higher float, smaller and fainter shadow.
      const s = 1 - float * 1.5;
      shadow.scale.set(w * 0.6 * s, 0.5 * s, 1);
      shadowMat.opacity = 0.9 * s;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && !still) { clock.start(); raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    shadow.scale.set(w * 0.6, 0.5, 1);

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
    ro.observe(el);

    // Only animate while the hero is on screen.
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(el);
    if (!still) addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      disposed = true;
      stop();
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointermove", onPointer);
      cupGeo.dispose(); cupMat.dispose(); cupTex.dispose();
      shadowGeo.dispose(); shadowMat.dispose(); shadowTex.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={box}
      aria-hidden="true"
      className="h-full w-full transition-opacity duration-700 ease-[var(--ease-out)] [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
      style={{ opacity: ready ? 1 : 0 }}
    />
  );
}
