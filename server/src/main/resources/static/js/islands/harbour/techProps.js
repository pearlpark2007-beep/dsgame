// techProps.js — data structures and computing, built into the whole harbour (not just the trial area).
// Everything here is a physical object a real harbour could have, painted or built by the giants:
//   • the giant cargo towers are stacks: every colossal crate has its index painted on it, a red TOP banner on top
//   • the King's law board: the rules of a stack, posted like a harbour bylaw
//   • an overflow wreck: a tower that took one crate too many, its crates floating in the sea
//   • the pier is an array: its planks are numbered [0] [1] [2] ...
//   • mooring posts carry memory addresses
//   • a queue of ships waits at the harbour mouth (first in, first out: the next island's lesson)
import * as THREE from "three";
import { QUAY_TOP } from "./harbourScene.js";
import { FONTS, sprayText } from "./dsProps.js";
import { buildTrireme } from "./trireme.js";
import { copyOf, centreOnGround } from "../../engine/assets.js";

const texCache = new Map();
function paint(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}
function decal(tex, w, h, { emissive = 0 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
  if (emissive) { mat.emissiveMap = tex; mat.emissive = new THREE.Color(0xffffff); mat.emissiveIntensity = emissive; }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
}

export function buildTechProps(world, harbour) {
  const { scene } = world;

  // ---------- 1. the giant towers are stacks: indexes on every crate, TOP banner on top
  const { levels, size } = harbour.towers;
  levels.forEach(tower => {
    tower.forEach((lv, i) => {
      const isTop = i === tower.length - 1;
      const tex = paint("tower" + i + (isTop ? "t" : ""), 512, 256, (g, w, h) =>
        sprayText(g, isTop ? "[" + i + "] TOP" : "[" + i + "]", w / 2, h / 2, `150px ${FONTS.stencil}`, isTop ? "#2a1606" : "#e9dcc0", { scatter: 3, passes: 5 }));
      const d = decal(tex, size.w * 0.6, size.h * 0.6, { emissive: isTop ? 0 : 0.25 });
      const fwd = new THREE.Vector3(Math.sin(lv.yaw), 0, Math.cos(lv.yaw));
      d.position.copy(lv.p).add(new THREE.Vector3(0, size.h * 0.5, 0)).addScaledVector(fwd, size.front + 0.3);
      d.rotation.y = lv.yaw;
      scene.add(d);
    });
    // a red cloth banner hanging from the top crate
    const topLv = tower[tower.length - 1];
    const banner = decal(paint("banner", 128, 512, (g, w, h) => {
      g.fillStyle = "#8e1b12"; g.fillRect(0, 0, w, h);
      g.save(); g.translate(w / 2, h / 2); g.rotate(-Math.PI / 2);
      sprayText(g, "TOP", 0, 0, `96px ${FONTS.stencil}`, "#f3e2c0", { passes: 3 }); g.restore();
    }), 5, 22);
    banner.material.side = THREE.DoubleSide; banner.material.depthWrite = true; banner.material.polygonOffset = false;
    const fwd = new THREE.Vector3(Math.sin(topLv.yaw), 0, Math.cos(topLv.yaw));
    banner.position.copy(topLv.p).add(new THREE.Vector3(size.w * 0.32, -8, 0)).addScaledVector(fwd, size.front + 0.6);
    banner.rotation.y = topLv.yaw;
    scene.add(banner);
    const seed = Math.random() * 10;
    world.add({ update: (dt, t) => { banner.rotation.z = Math.sin(t * 0.9 + seed) * 0.04; } });
  });

  // ---------- 2. the King's law board, posted at the head of the quay
  const law = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x3e2a1c, roughness: 0.9 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 0.08), new THREE.MeshStandardMaterial({
    map: paint("law", 1024, 640, (g, w, h) => {
      g.fillStyle = "#c9b48a"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(70,45,20,${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 60, 1 + Math.random() * 2); }
      g.strokeStyle = "#5a3a1e"; g.lineWidth = 14; g.strokeRect(16, 16, w - 32, h - 32);
      sprayText(g, "BY ORDER OF KING ANTIPHATES", w / 2, 84, `52px ${FONTS.stencil}`, "#7e1a0f", { passes: 4 });
      const lines = ["THIS HARBOUR IS A STACK.", "ONLY THE TOP CRATE MAY BE TAKEN.", "LAST IN, FIRST OUT.", "NO REACHING. NO PEEKING BELOW TOP."];
      lines.forEach((l, i) => sprayText(g, l, w / 2, 200 + i * 78, `50px ${FONTS.stencil}`, "#2a1a0e", { passes: 3, scatter: 1 }));
      sprayText(g, "VIOLATORS WILL BE EATEN.", w / 2, 560, `40px ${FONTS.stencil}`, "#7e1a0f", { passes: 3 });
    }), roughness: 0.9 }));
  board.position.y = 2.6;
  law.add(board);
  for (const x of [-1.4, 1.4]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.6, 0.16), wood); post.position.set(x, 1.8, -0.1); law.add(post); }
  law.position.set(-9.6, QUAY_TOP, 4.6);
  law.rotation.y = 0.55;
  law.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(law);

  // ---------- 3. the overflow wreck: a tower that took one crate too many
  const wreck = new THREE.Group();
  const bob = [];
  const crateM = harbour.models.crate;
  for (let i = 0; i < 6; i++) {
    const c = centreOnGround(copyOf(crateM));
    c.scale.set(1.1, 1.9, 1.5);
    c.position.set(-16 + i * 1.6 + Math.random(), -0.35, -9 - Math.random() * 4);
    c.rotation.set(Math.random() * 0.5, Math.random() * 3, Math.random() * 0.6 - 0.3);
    wreck.add(c); bob.push({ c, y: c.position.y, s: Math.random() * 6 });
  }
  // the broken gauge post, snapped and leaning, still holding its sign
  const snapped = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 0.2), wood);
  snapped.position.set(-13.2, 0.9, -7.2); snapped.rotation.z = 0.5; snapped.rotation.x = -0.2;
  wreck.add(snapped);
  const sign = decal(paint("overflow", 512, 192, (g, w, h) => {
    g.fillStyle = "#2b1d14"; g.fillRect(0, 0, w, h);
    sprayText(g, "STACK OVERFLOW", w / 2, h * 0.42, `64px ${FONTS.stencil}`, "#e0644a", { passes: 4 });
    sprayText(g, "CAP 6 · PUSHED 7", w / 2, h * 0.8, `34px ${FONTS.stencil}`, "#e8d7b0", { passes: 2 });
  }), 1.9, 0.72);
  sign.material.depthWrite = true; sign.material.polygonOffset = false; sign.material.side = THREE.DoubleSide;
  sign.position.set(-12.55, 2.15, -7.0); sign.rotation.set(-0.15, 0.25, 0.42);
  wreck.add(sign);
  wreck.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(wreck);
  world.add({ update: (dt, t) => bob.forEach(b => { b.c.position.y = b.y + Math.sin(t * 0.9 + b.s) * 0.12; b.c.rotation.z += Math.sin(t * 0.7 + b.s) * 0.0006; }) });

  // ---------- 4. the pier is an array: numbered planks
  for (let i = 0; i < 9; i++) {
    const d = decal(paint("pier" + i, 256, 128, (g, w, h) => sprayText(g, "[" + i + "]", w / 2, h / 2, `78px ${FONTS.stencil}`, "#f0c33c", { passes: 4, scatter: 2 })), 0.9, 0.45);
    d.rotation.x = -Math.PI / 2; d.rotation.z = Math.PI;
    d.position.set(14.55, QUAY_TOP + 0.02, -5.5 - i * 2.0);
    scene.add(d);
  }

  // ---------- 5. mooring posts carry memory addresses
  for (let x = -42, i = 0; x <= 42; x += 7) {
    if (Math.abs(x) < 4) continue;
    const addr = "0x" + (0x100 + i * 8).toString(16).toUpperCase(); i++;
    const d = decal(paint("post" + addr, 256, 96, (g, w, h) => sprayText(g, addr, w / 2, h / 2, `48px ${FONTS.type}`, "#efe1c2", { passes: 2, scatter: 0.8 })), 0.62, 0.23);
    d.position.set(x + 0.5, QUAY_TOP + 0.05 + 0.02, -3.55 + 0.42); d.rotation.x = -Math.PI / 2;
    scene.add(d);
  }

  // ---------- 6. a queue of ships at the harbour mouth: first in, first out
  for (let i = 0; i < 4; i++) {
    const sh = buildTrireme({ length: 30 });
    sh.rotation.y = Math.PI / 2 + 0.06;
    sh.position.set(4 + i * 2, -1.0, -330 - i * 42);
    scene.add(sh);
    world.add({ update: (dt, t) => { sh.position.y = -1.0 + Math.sin(t * 0.7 + i) * 0.1; } });
  }
}
