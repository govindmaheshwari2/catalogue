/* ═══════════════════════════════════════════════════════════
   Q-SEVEN — hero WebGL
   A door lever-on-rose built from primitives, PBR metal,
   environment-lit, finish-switchable, scroll & mouse reactive.
   ═══════════════════════════════════════════════════════════ */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const canvas = document.getElementById("gl");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
} catch (e) {
  canvas.style.display = "none";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 820 ? 1.5 : 1.8));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d0c0a, 0.055);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(0, 0.15, 8.2);

/* environment for metal reflections */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* key + rim lights for drama */
const rim = new THREE.SpotLight(0xffe6b0, 90, 30, Math.PI / 5, 0.5, 1.6);
rim.position.set(-6, 5, -3);
scene.add(rim);
const key = new THREE.DirectionalLight(0xfff2d8, 1.4);
key.position.set(4, 3, 6);
scene.add(key);
const under = new THREE.PointLight(0xc9741e, 14, 12, 1.8);
under.position.set(0, -3.4, 1.5);
scene.add(under);

/* ── finishes ── */
const FINISHES = {
  brass:    { color: 0xcfa14e, roughness: 0.24, clearcoat: 0.5 },
  rosegold: { color: 0xd99a7c, roughness: 0.22, clearcoat: 0.5 },
  antique:  { color: 0x8a6c3c, roughness: 0.46, clearcoat: 0.15 },
  chrome:   { color: 0xd6d9dd, roughness: 0.12, clearcoat: 0.7 },
  black:    { color: 0x1c1d20, roughness: 0.32, clearcoat: 0.6 }
};
const mat = new THREE.MeshPhysicalMaterial({
  color: FINISHES.brass.color,
  metalness: 1.0,
  roughness: FINISHES.brass.roughness,
  clearcoat: FINISHES.brass.clearcoat,
  clearcoatRoughness: 0.22,
  envMapIntensity: 1.35
});

/* ── build the lever-on-rose ── */
const handle = new THREE.Group();

// rose (base disc with stepped rim)
const rose = new THREE.Group();
const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.12, 0.16, 72), mat);
disc.rotation.x = Math.PI / 2;
rose.add(disc);
const rimTorus = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.055, 24, 72), mat);
rose.add(rimTorus);
const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.04, 0.1, 72), mat);
cap.rotation.x = Math.PI / 2;
cap.position.z = 0.12;
rose.add(cap);
handle.add(rose);

// neck (stepped collar → shaft)
const collar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.22, 48), mat);
collar1.rotation.x = Math.PI / 2; collar1.position.z = 0.28;
handle.add(collar1);
const collar2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.3, 48), mat);
collar2.rotation.x = Math.PI / 2; collar2.position.z = 0.52;
handle.add(collar2);
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.7, 48), mat);
shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.95;
handle.add(shaft);

// lever arm — swept curve out of the shaft, tapering capsule grip
class LeverCurve extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    // gentle S-sweep to the right with a drop at the tip
    const x = t * 3.35;
    const y = Math.sin(t * Math.PI * 0.42) * 0.16 - t * t * 0.5;
    const z = 0;
    return target.set(x, y, z);
  }
}
const leverGeo = new THREE.TubeGeometry(new LeverCurve(), 64, 0.21, 32, false);
// taper the tube towards the tip + slight vertical squash for an ergonomic profile
{
  const pos = leverGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = Math.min(Math.max(v.x / 3.35, 0), 1);
    const taper = 1.0 + 0.35 * Math.sin(t * Math.PI) - t * 0.28; // belly then taper
    const cy = Math.sin(t * Math.PI * 0.42) * 0.16 - t * t * 0.5;
    v.y = cy + (v.y - cy) * taper * 1.25;                        // squash → blade-like
    v.z = v.z * taper;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  leverGeo.computeVertexNormals();
}
// the arm pivots at the shaft so the whole lever can be "pressed"
const arm = new THREE.Group();
arm.position.set(-0.1, 0.02, 1.18);
const lever = new THREE.Mesh(leverGeo, mat);
arm.add(lever);
// rounded tip
const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 24), mat);
tip.scale.set(1.15, 0.8, 0.9);
tip.position.set(3.35, Math.sin(Math.PI * 0.42) * 0.16 - 0.5, 0);
arm.add(tip);
handle.add(arm);

handle.position.set(1.15, 0.1, 0);
handle.rotation.set(0.22, -0.62, -0.08);
scene.add(handle);

/* ── orbiting keyline ring (subtle set-dressing) ── */
const ringGeo = new THREE.TorusGeometry(2.6, 0.006, 8, 160);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xc9a24a, transparent: true, opacity: 0.28 });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2.15;
ring.position.copy(handle.position);
scene.add(ring);
const ring2 = ring.clone();
ring2.scale.setScalar(1.22);
ring2.material = ringMat.clone();
ring2.material.opacity = 0.12;
scene.add(ring2);

/* ── dust particles ── */
const N = 320;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(N * 3);
const pSeed = new Float32Array(N);
for (let i = 0; i < N; i++) {
  pPos[i * 3] = (Math.random() - 0.5) * 14;
  pPos[i * 3 + 1] = (Math.random() - 0.5) * 8;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
  pSeed[i] = Math.random() * Math.PI * 2;
}
pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ color: 0xd8b876, size: 0.02, transparent: true, opacity: 0.55, depthWrite: false });
const dust = new THREE.Points(pGeo, pMat);
scene.add(dust);

/* ── finish switching (hero dots) ── */
const tmp = new THREE.Color();
document.querySelectorAll(".fdot").forEach(dot => {
  dot.addEventListener("click", () => {
    document.querySelectorAll(".fdot").forEach(d => d.classList.remove("is-active"));
    dot.classList.add("is-active");
    const f = FINISHES[dot.dataset.finish] || FINISHES.brass;
    tmp.set(f.color);
    if (window.gsap) {
      gsap.to(mat.color, { r: tmp.r, g: tmp.g, b: tmp.b, duration: 0.8, ease: "power2.out" });
      gsap.to(mat, { roughness: f.roughness, clearcoat: f.clearcoat, duration: 0.8 });
      gsap.fromTo(handle.rotation, { y: handle.rotation.y }, { y: handle.rotation.y - Math.PI * 2, duration: 1.2, ease: "expo.out" });
    } else {
      mat.color.copy(tmp); mat.roughness = f.roughness; mat.clearcoat = f.clearcoat;
    }
  });
});

/* ── press the handle (raycast click) ── */
const raycaster = new THREE.Raycaster();
const clickV = new THREE.Vector2();
let pressing = false, hovering = false;
function pressHandle() {
  if (pressing) return;
  pressing = true;
  window.QS_SOUND?.thunk();
  const hint = document.getElementById("heroHint");
  if (hint) hint.style.opacity = 0;
  if (window.gsap) {
    gsap.timeline({ onComplete: () => pressing = false })
      .to(arm.rotation, { z: -0.55, duration: 0.16, ease: "power3.out" })
      .to(arm.rotation, { z: 0, duration: 1.1, ease: "elastic.out(1,0.32)" }, 0.22);
  } else {
    arm.rotation.z = 0; pressing = false;
  }
}
window.QS_PRESS = pressHandle;
function castAt(cx, cy) {
  clickV.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  raycaster.setFromCamera(clickV, camera);
  return raycaster.intersectObject(handle, true).length > 0;
}
canvas.addEventListener("pointerdown", e => {
  if (castAt(e.clientX, e.clientY)) pressHandle();
});
// pointer-cursor affordance, checked at low frequency
setInterval(() => {
  if (document.hidden) return;
  hovering = castAt(mouse.px ?? -1e4, mouse.py ?? -1e4);
  canvas.style.cursor = hovering ? "pointer" : "";
}, 160);

/* ── scroll: rotate + drift the handle as hero leaves ── */
let scrollP = 0;
const hero = document.getElementById("hero");
const onScroll = () => {
  const r = hero.getBoundingClientRect();
  scrollP = Math.min(Math.max(-r.top / (r.height || 1), 0), 1);
};
addEventListener("scroll", onScroll, { passive: true });

/* ── mouse parallax ── */
const mouse = { x: 0, y: 0, tx: 0, ty: 0, px: null, py: null };
addEventListener("pointermove", e => {
  mouse.tx = (e.clientX / innerWidth) * 2 - 1;
  mouse.ty = (e.clientY / innerHeight) * 2 - 1;
  mouse.px = e.clientX; mouse.py = e.clientY;
});

/* ── resize ── */
function resize() {
  const w = canvas.clientWidth || innerWidth;
  const h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const mobile = innerWidth < 820;
  handle.position.x = mobile ? 0.15 : 1.15;
  handle.scale.setScalar(mobile ? 0.72 : 1);
  ring.position.copy(handle.position);
  ring2.position.copy(handle.position);
}
addEventListener("resize", resize);
resize();

/* ── render loop ── */
const clock = new THREE.Clock();
let raf = null;
function frame() {
  const t = clock.getElapsedTime();
  mouse.x += (mouse.tx - mouse.x) * 0.045;
  mouse.y += (mouse.ty - mouse.y) * 0.045;

  const baseY = -0.62 + t * 0.12;
  handle.rotation.y = baseY + mouse.x * 0.35 + scrollP * 2.6;
  handle.rotation.x = 0.22 + Math.sin(t * 0.4) * 0.05 + mouse.y * 0.22;
  handle.position.y = 0.1 + Math.sin(t * 0.8) * 0.09 - scrollP * 1.6;

  ring.rotation.z = t * 0.1;
  ring2.rotation.z = -t * 0.07;
  ring.position.y = ring2.position.y = handle.position.y;

  dust.rotation.y = t * 0.016;
  const pp = pGeo.attributes.position;
  for (let i = 0; i < N; i += 3) { // update a third per frame is enough visually
    pp.array[i * 3 + 1] += Math.sin(t * 0.6 + pSeed[i]) * 0.0009;
  }
  pp.needsUpdate = true;

  camera.position.x = mouse.x * 0.28;
  camera.position.y = 0.15 - mouse.y * 0.2 - scrollP * 0.5;
  camera.lookAt(handle.position.x * 0.55, handle.position.y * 0.4, 0);

  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
}
if (reduced) {
  // one static frame
  handle.rotation.y = -0.62;
  renderer.render(scene, camera);
} else {
  frame();
  // pause when hero is far off-screen
  new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting && raf === null) { clock.start(); frame(); }
      else if (!en.isIntersecting && raf !== null) { cancelAnimationFrame(raf); raf = null; }
    });
  }, { rootMargin: "200px" }).observe(canvas);
}
