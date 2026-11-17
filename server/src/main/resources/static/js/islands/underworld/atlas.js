// atlas.js — THE ATLAS OF LAST VOYAGES. Beneath the world is not an office but a celestial navigation archive
// built by the old gods. Every life is a route; every dead traveller arrives with a numbered medallion; the archive
// guides them on in the order they came. (It replaces hall.js, the black-and-white waiting office, behind the
// same two interfaces: buildHall(world) for the room, Hall for the queue. Lessons, trials and films don't change.)
//
// The room is finite and clear: a round basalt chamber with an engraved route map on the floor, four limestone
// piers, a star aperture overhead, a suspended brass astrolabe over the route console where the Archive Keeper
// sits, the Meridian Gate (the way out) and the Descent stair (the way in).
// CLARITY FIRST (the redesign's rule): no fog, no bloom, no grade wash, opaque figures, every number and name
// written on the screen in fixed-size labels, never as tiny text inside the 3D world.
//
// The queue's array in one of four fittings, chosen by the program being run:
//   row   — the Linear Gallery: a straight waist-high rail, numbered brass stations, a one-way arrow (linear queue)
//   ring  — the Orbit Gallery: a round brass track, numbered stations, arrows round it, the occupied arc lit cyan
//           (circular queue, the trials, the Lab; the deque is the same ring with its two gates, FRONT and REAR)
//   pq    — the Priority Index: an ordered table with a comparison lamp at every index (priority queue)
// The hall draws FRAMES (queueBoard.js builds them from Java's steps): show(frame) jumps, act(step, frame) animates.
import { sound } from "../../engine/sound.js";
import * as THREE from "three";
import { liveCells, shade, FRONT_COLOR, REAR_COLOR } from "../../learn/queueBoard.js";

// ---------- the palette (the redesign's eight colours)
export const ATLAS = {
  indigo: 0x101a31, midnight: 0x24365e, gold: 0xd8a84e, ivory: 0xf1e8d2, cyan: 0x57b9d1, ember: 0xc64a36, green: 0x4f8a72, ink: 0x111522
};
const RING_R = 4.6, ROW_GAP = 2.3, ROOM_R = 21, CEIL = 26;   // tall enough that the queue's camera never rises through it
export const COUNTER = new THREE.Vector3(0, 0, -8.2);   // the route console (where the served are guided on)
const ENTRANCE = new THREE.Vector3(9.5, 0, 7.5);        // the foot of the Descent stair (where travellers arrive)
const GATE = new THREE.Vector3(5.2, 0, -12.4);          // the Meridian Gate (the way on)
const ASTRO = new THREE.Vector3(0, 9.6, -7.5);          // the suspended astrolabe, over the console
const REDUCED = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const DISPLAY = "Anton, Impact, 'Arial Narrow', sans-serif", MONO = "'Courier Prime', 'Courier New', monospace";

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const rnd = (() => { let s = 31; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const hex = n => "#" + n.toString(16).padStart(6, "0");

// shared materials: few, opaque, physical
const M = {
  basalt: new THREE.MeshStandardMaterial({ color: 0x1b2643, roughness: 0.55, metalness: 0.05 }),
  basaltDark: new THREE.MeshStandardMaterial({ color: 0x141c33, roughness: 0.6 }),
  lime: new THREE.MeshStandardMaterial({ color: 0xd6cdb6, roughness: 0.8 }),
  limeDark: new THREE.MeshStandardMaterial({ color: 0xb3a88e, roughness: 0.85 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x8c6a38, metalness: 0.85, roughness: 0.38 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a254, metalness: 0.9, roughness: 0.3 }),
  ivory: new THREE.MeshStandardMaterial({ color: ATLAS.ivory, roughness: 0.5 }),
  cloth: new THREE.MeshStandardMaterial({ color: ATLAS.midnight, roughness: 0.92, side: THREE.DoubleSide }),
  gold: new THREE.MeshStandardMaterial({ color: ATLAS.gold, metalness: 0.8, roughness: 0.35 }),
  cyan: new THREE.MeshStandardMaterial({ color: ATLAS.cyan, emissive: ATLAS.cyan, emissiveIntensity: 0.9, roughness: 0.4 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc670, emissiveIntensity: 1.2 })
};
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r0, r1, h, m, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m);
function shadow(o, cast = true, recv = true) { o.traverse(m => { if (m.isMesh) { m.castShadow = cast; m.receiveShadow = recv; } }); return o; }

// ---------- the chamber
export function buildHall(world) {
  const scene = world.scene;
  scene.background = new THREE.Color(ATLAS.indigo);
  scene.fog = null;                                     // the redesign's first rule: no fog, anywhere
  const root = new THREE.Group(); scene.add(root);

  // the floor: polished basalt with the route map engraved in gold
  const mapTex = canvasTexture(2048, 2048, (g, w, h) => {
    const c = w / 2, px = w / (ROOM_R * 2);           // pixels per metre
    g.fillStyle = "#1b2643"; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 9000; k++) { const v = 22 + rnd() * 16; g.fillStyle = `rgba(${v},${v + 8},${v + 30},0.55)`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }   // the stone's grain
    g.strokeStyle = "rgba(216,168,78,0.55)"; g.lineWidth = 3;
    for (const r of [7.2, 9.5, 13, 16.5, 19.6]) { g.beginPath(); g.arc(c, c, r * px, 0, Math.PI * 2); g.stroke(); }          // concentric rings
    g.lineWidth = 2; g.strokeStyle = "rgba(216,168,78,0.35)";
    for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, r0 = (k % 6 ? 18.8 : 17.2) * px; g.beginPath(); g.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); g.lineTo(c + Math.cos(a) * 19.6 * px, c + Math.sin(a) * 19.6 * px); g.stroke(); }   // degree ticks
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(c + Math.cos(a) * 9.5 * px, c + Math.sin(a) * 9.5 * px); g.lineTo(c + Math.cos(a) * 13 * px, c + Math.sin(a) * 13 * px); g.stroke(); }
    // routes: unfinished voyages etched round the rim, and one long route running from the stair to the gate
    g.setLineDash([18, 12]); g.lineWidth = 3; g.strokeStyle = "rgba(216,168,78,0.45)";
    const P = (x, z) => [c + x * px, c + z * px];
    for (const [a, b, cc] of [[[-17, 6], [-12, 14], [-6, 17]], [[-16, -8], [-18, 2], [-15, 10]], [[15, -12], [18, -4], [17, 4]]]) { g.beginPath(); g.moveTo(...P(...a)); g.quadraticCurveTo(...P(...b), ...P(...cc)); g.stroke(); }
    g.setLineDash([]); g.lineWidth = 4; g.strokeStyle = "rgba(216,168,78,0.6)";
    g.beginPath(); g.moveTo(...P(13, 13)); g.bezierCurveTo(...P(14, 2), ...P(9, -6), ...P(GATE.x, GATE.z + 1.5)); g.stroke();
    for (let k = 0; k < 26; k++) { const a = rnd() * Math.PI * 2, r = (10 + rnd() * 8.5) * px; g.fillStyle = "rgba(241,232,210,0.55)"; g.beginPath(); g.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, 4 + rnd() * 4, 0, Math.PI * 2); g.fill(); }   // engraved stars (few, crisp)
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(ROOM_R, 96), new THREE.MeshStandardMaterial({ map: mapTex, roughness: 0.32, metalness: 0.08 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);

  // the wall: limestone courses below, midnight-blue panels above, one gold band between
  const wallTex = canvasTexture(2048, 512, (g, w, h) => {
    g.fillStyle = "#24365e"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#cdc3aa"; g.fillRect(0, h * 0.62, w, h * 0.38);
    g.strokeStyle = "rgba(120,108,84,0.6)"; g.lineWidth = 3;
    for (let y = h * 0.62; y < h; y += h * 0.095) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    for (let x = 0, r = 0; x < w; x += 128, r++) for (let y = h * 0.62, k = 0; y < h; y += h * 0.095, k++) { g.beginPath(); g.moveTo(x + (k % 2) * 64, y); g.lineTo(x + (k % 2) * 64, y + h * 0.095); g.stroke(); }
    g.fillStyle = "#d8a84e"; g.fillRect(0, h * 0.585, w, h * 0.03);
    g.strokeStyle = "rgba(216,168,78,0.5)"; g.lineWidth = 2;
    for (let x = 64; x < w; x += 256) { g.strokeRect(x, h * 0.12, 128, h * 0.38); g.beginPath(); g.arc(x + 64, h * 0.31, 34, 0, Math.PI * 2); g.stroke(); }   // panels with a ring in each
  });
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(3, CEIL / 16); wallTex.offset.y = 1 - CEIL / 16;
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(ROOM_R, ROOM_R, CEIL, 96, 1, true), new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85, side: THREE.BackSide }));
  wall.position.y = CEIL / 2; wall.receiveShadow = true; root.add(wall);
  // the ceiling: deep indigo, with the star aperture over the middle (a few clear stars, no haze)
  const ceil = new THREE.Mesh(new THREE.RingGeometry(4.2, ROOM_R + 0.5, 96), new THREE.MeshStandardMaterial({ color: 0x0d1529, roughness: 0.9, side: THREE.BackSide }));
  ceil.rotation.x = -Math.PI / 2; ceil.position.y = CEIL; root.add(ceil);
  const sky = new THREE.Mesh(new THREE.CircleGeometry(4.2, 64), new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: canvasTexture(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); gr.addColorStop(0, "#2b4478"); gr.addColorStop(1, "#14234a");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let k = 0; k < 22; k++) { g.fillStyle = "#f1e8d2"; g.beginPath(); g.arc(rnd() * w, rnd() * h, 2 + rnd() * 3, 0, Math.PI * 2); g.fill(); }
  }) }));
  sky.rotation.x = -Math.PI / 2; sky.position.y = CEIL + 0.6; root.add(sky);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(4.25, 0.18, 10, 96), M.brass); lip.rotation.x = Math.PI / 2; lip.position.y = CEIL - 0.05; root.add(lip);

  // four limestone piers with bronze capitals and a practical lamp each (warm bounce, never haze)
  const lamps = [];
  for (const a of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
    const x = Math.cos(a) * 16.2, z = Math.sin(a) * 16.2;
    const pier = new THREE.Group(); pier.position.set(x, 0, z); root.add(pier);
    const base = box(2.6, 0.8, 2.6, M.limeDark); base.position.y = 0.4; pier.add(base);
    const shaft = box(2.0, 13, 2.0, M.lime); shaft.position.y = 7.3; pier.add(shaft);
    const cap = box(2.6, 0.7, 2.6, M.bronze); cap.position.y = 14.1; pier.add(cap);
    for (const y of [3, 9]) { const band = box(2.06, 0.18, 2.06, M.gold); band.position.y = y; pier.add(band); }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), M.lamp); lamp.position.set(-Math.cos(a) * 1.25, 4.2, -Math.sin(a) * 1.25); pier.add(lamp);
    const arm = box(0.08, 0.08, 0.9, M.bronze); arm.position.set(-Math.cos(a) * 0.95, 4.2, -Math.sin(a) * 0.95); arm.lookAt(pier.position.clone().setY(4.2)); pier.add(arm);
    const pl = new THREE.PointLight(0xffc27a, 9, 20, 1.6); pl.position.copy(lamp.position); pier.add(pl); lamps.push(pl);
    shadow(pier, true, true);
  }
  // deep-blue banners between the piers, each with a gold route glyph
  const bannerTex = canvasTexture(256, 768, (g, w, h) => {
    g.fillStyle = "#24365e"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#d8a84e"; g.lineWidth = 6; g.strokeRect(14, 14, w - 28, h - 60);
    g.lineWidth = 5; g.beginPath(); g.arc(w / 2, 230, 70, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(w / 2, 230, 36, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(w / 2, 300); g.bezierCurveTo(40, 420, 220, 520, w / 2, 640); g.stroke();
    g.fillStyle = "#d8a84e"; g.beginPath(); g.moveTo(14, h - 46); g.lineTo(w / 2, h - 4); g.lineTo(w - 14, h - 46); g.fill();
  });
  for (const a of [Math.PI * 0.5 + 0.35, Math.PI * 0.5 - 0.35, -Math.PI * 0.5 + 0.55, -Math.PI * 0.5 - 0.55, Math.PI + 0.4, Math.PI - 0.4, 0.4, -0.15]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 6.6), new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.95, side: THREE.DoubleSide }));
    b.position.set(Math.cos(a) * (ROOM_R - 0.25), 10.2, Math.sin(a) * (ROOM_R - 0.25)); b.lookAt(0, 10.2, 0); root.add(b);
  }
  // brass plates with the names of earlier travellers, at eye height round the wall
  const NAMES = ["ELPENOR", "ANTICLEIA", "ACHILLES", "AJAX", "AGAMEMNON", "PATROCLUS", "HERACLES", "ORION", "TYRO", "LEDA", "PHAEDRA", "MINOS"];
  NAMES.forEach((n, k) => {
    const a = Math.PI * 0.62 + k * 0.17 - (k > 5 ? 3.4 : 0);
    const t = canvasTexture(512, 128, (g, w, h) => { g.fillStyle = "#b8914a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#5c4420"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = "#2a1d0c"; g.font = `bold 54px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n, w / 2, h / 2 + 2); });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshStandardMaterial({ map: t, metalness: 0.6, roughness: 0.4 }));
    p.position.set(Math.cos(a) * (ROOM_R - 0.08), 2.2, Math.sin(a) * (ROOM_R - 0.08)); p.lookAt(0, 2.2, 0); root.add(p);
  });

  // ---------- the route console and the Archive Keeper (seated, bronze, solemn)
  const console_ = new THREE.Group(); console_.position.set(COUNTER.x, 0, COUNTER.z - 1.5); root.add(console_);
  const desk = box(6.4, 1.1, 1.3, M.basaltDark); desk.position.y = 0.55; console_.add(desk);
  const top = box(6.6, 0.1, 1.45, M.brass); top.position.y = 1.15; console_.add(top);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 0.7), new THREE.MeshStandardMaterial({ map: canvasTexture(1024, 128, (g, w, h) => {
    g.fillStyle = "#f1e8d2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d8a84e"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.strokeStyle = "#24365e"; g.lineWidth = 3; for (let x = 40; x < w - 40; x += 64) { g.beginPath(); g.arc(x + 32, h / 2, 18, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x + 14, h / 2); g.lineTo(x + 50, h / 2); g.stroke(); }
  }), roughness: 0.6 }));
  plate.position.set(0, 0.62, 0.66); console_.add(plate);
  const keeper = new THREE.Group(); keeper.position.set(COUNTER.x, 0, COUNTER.z - 3.6); root.add(keeper);
  const throne = box(3.0, 2.2, 1.6, M.limeDark); throne.position.set(0, 1.1, -0.4); keeper.add(throne);
  const back = box(3.0, 4.4, 0.5, M.lime); back.position.set(0, 2.9, -1.1); keeper.add(back);
  const kBody = cyl(0.9, 1.25, 2.6, M.bronze, 20); kBody.position.set(0, 3.4, -0.15); keeper.add(kBody);
  const kLap = box(2.2, 0.5, 1.6, M.bronze); kLap.position.set(0, 2.35, 0.4); keeper.add(kLap);
  const kHead = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), M.bronze); kHead.position.set(0, 5.1, -0.05); keeper.add(kHead);
  const kHood = new THREE.Mesh(new THREE.SphereGeometry(0.68, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), M.bronze); kHood.position.set(0, 5.18, -0.12); keeper.add(kHood);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.5, 4, 8), M.bronze); arm.position.set(sx * 1.0, 3.0, 0.65); arm.rotation.x = -1.2; keeper.add(arm); }
  const kStaff = cyl(0.06, 0.06, 4.6, M.gold, 8); kStaff.position.set(1.45, 2.3, 0.55); keeper.add(kStaff);
  shadow(console_); shadow(keeper);

  // ---------- the astrolabe: nested brass rings with degree marks, slowly turning over the console
  const astro = new THREE.Group(); astro.position.copy(ASTRO); root.add(astro);
  const rings = [];
  for (const [r, tube, tilt] of [[3.4, 0.11, 0], [2.85, 0.09, 0.55], [2.3, 0.08, -0.9]]) {
    const g = new THREE.Group(); g.rotation.x = tilt; astro.add(g); rings.push(g);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 12, 128), M.brass); g.add(ring);
    const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), M.gold, 36);
    const mm = new THREE.Matrix4();
    for (let k = 0; k < 36; k++) { const a = k / 36 * Math.PI * 2; mm.makeRotationZ(a - Math.PI / 2).setPosition(Math.cos(a) * (r - 0.18), Math.sin(a) * (r - 0.18), 0); ticks.setMatrixAt(k, mm); }
    g.add(ticks);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 18), M.bronze); astro.add(core);
  const pointer = new THREE.Group(); astro.add(pointer);
  const needle = box(0.12, 3.0, 0.06, M.gold); needle.position.y = 1.5; pointer.add(needle);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 12), M.gold); tip.position.y = 3.15; pointer.add(tip);
  for (const [x, z] of [[-2.6, -1.8], [2.6, -1.8], [-2.6, 1.8], [2.6, 1.8]]) {           // the rods it hangs from
    const rod = cyl(0.04, 0.04, CEIL - ASTRO.y, M.bronze, 6); rod.position.set(ASTRO.x + x * 0.5, (CEIL + ASTRO.y) / 2, ASTRO.z + z * 0.3); root.add(rod);
  }
  shadow(astro, true, false);
  // NOW SERVING: an ivory plate hung under the astrolabe; setServing(n) writes the number and the pointer swings
  const nsCanvas = document.createElement("canvas"); nsCanvas.width = 1024; nsCanvas.height = 400;
  const nsTex = new THREE.CanvasTexture(nsCanvas); nsTex.colorSpace = THREE.SRGBColorSpace; nsTex.anisotropy = 8;
  function paintServing(n) {
    const g = nsCanvas.getContext("2d"), w = 1024, h = 400;
    g.fillStyle = "#f1e8d2"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#d8a84e"; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
    g.strokeStyle = "#24365e"; g.lineWidth = 4; g.strokeRect(30, 30, w - 60, h - 60);
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#24365e"; g.font = `bold 70px ${MONO}`; g.fillText("NOW SERVING", w / 2, 108);
    g.fillStyle = "#111522"; g.font = `190px ${DISPLAY}`; g.fillText(n == null ? "--" : String(n).padStart(2, "0"), w / 2, 270);
    nsTex.needsUpdate = true;
  }
  paintServing(null);
  const nsMat = new THREE.MeshStandardMaterial({ map: nsTex, roughness: 0.55, emissive: 0xffffff, emissiveMap: nsTex, emissiveIntensity: 0.75 });   // lit from within: readable from anywhere on the floor
  const ns = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 1.48), nsMat); ns.position.set(ASTRO.x, ASTRO.y - 3.1, ASTRO.z + 0.8); root.add(ns);   // above the Keeper's head, never in front of it
  const nsFrame = box(4.0, 1.62, 0.12, M.brass); nsFrame.position.copy(ns.position).add(new THREE.Vector3(0, 0, -0.08)); root.add(nsFrame);
  for (const sx of [-1.6, 1.6]) { const ch = cyl(0.025, 0.025, 1.9, M.bronze, 6); ch.position.set(ASTRO.x + sx, ns.position.y + 1.7, ns.position.z - 0.05); root.add(ch); }

  // ---------- the Meridian Gate: tall limestone arch, the Aegean inlaid in its doors, a socket for a staff
  const gate = new THREE.Group(); gate.position.copy(GATE); root.add(gate);
  for (const sx of [-1.6, 1.6]) { const p = box(0.8, 6.2, 0.9, M.lime); p.position.set(sx, 3.1, 0); gate.add(p); const cap = box(1.0, 0.35, 1.1, M.bronze); cap.position.set(sx, 6.35, 0); gate.add(cap); }
  const lintel = box(4.4, 0.8, 1.0, M.lime); lintel.position.y = 6.9; gate.add(lintel);
  const band = box(4.45, 0.14, 1.05, M.gold); band.position.y = 6.45; gate.add(band);
  const mapDoor = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6.0), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTexture(512, 1280, (g, w, h) => {
    g.fillStyle = "#1d3a6a"; g.fillRect(0, 0, w, h);                                  // the Aegean
    g.strokeStyle = "rgba(87,185,209,0.35)"; g.lineWidth = 2; for (let y = 30; y < h; y += 46) { g.beginPath(); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x / 30) * 6); g.stroke(); }
    g.fillStyle = "#e9dfc6";                                                            // islands
    for (const [x, y, rx, ry] of [[120, 210, 70, 40], [380, 330, 60, 90], [250, 560, 46, 30], [90, 760, 80, 50], [400, 900, 50, 34], [300, 1120, 90, 60], [160, 1040, 30, 22]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = "#d8a84e"; g.lineWidth = 8; g.setLineDash([22, 14]);              // the route home, still unfinished
    g.beginPath(); g.moveTo(120, 210); g.bezierCurveTo(420, 420, 60, 640, 250, 560); g.bezierCurveTo(420, 700, 120, 900, 300, 1120); g.stroke(); g.setLineDash([]);
    g.strokeStyle = "#d8a84e"; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
  }) }));
  mapDoor.position.set(0, 3.05, 0.47); gate.add(mapDoor);
  const socket = cyl(0.22, 0.28, 0.5, M.bronze, 16); socket.position.set(2.4, 0.25, 0.9); gate.add(socket);
  shadow(gate);
  // the route home on the gate glows when the archive draws it (the finale)
  const routeHome = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6.0), new THREE.MeshBasicMaterial({ color: ATLAS.gold, transparent: true, opacity: 0, depthWrite: false }));
  routeHome.position.set(0, 3.05, 0.5); gate.add(routeHome);

  // ---------- the Descent: the stair the travellers come down, and the plinth where they are given a medallion
  const stair = new THREE.Group(); root.add(stair);
  const dir = new THREE.Vector3(ENTRANCE.x, 0, ENTRANCE.z).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x);
  for (let k = 0; k < 8; k++) {
    const st = box(4.2, 0.32 * (k + 1), 0.9, k % 2 ? M.lime : M.limeDark);
    const at = new THREE.Vector3(ENTRANCE.x, 0, ENTRANCE.z).addScaledVector(dir, 3.2 + k * 0.9);
    st.position.set(at.x, 0.16 * (k + 1), at.z); st.lookAt(at.clone().add(dir).setY(st.position.y)); stair.add(st);
  }
  const plinth = cyl(0.55, 0.65, 1.1, M.basaltDark, 20); plinth.position.copy(ENTRANCE).addScaledVector(side, 2.6).setY(0.55); stair.add(plinth);
  const med = cyl(0.42, 0.42, 0.08, M.brass, 24); med.position.copy(plinth.position).setY(1.15); stair.add(med);
  shadow(stair);

  // ---------- light: a crisp key through the aperture, a cool fill from the front, the warm pier lamps
  scene.add(new THREE.HemisphereLight(0xc8d3f0, 0x3a2c1a, 1.05));
  const key = new THREE.DirectionalLight(0xfff1d6, 2.6); key.position.set(3, 30, 6); key.target.position.set(0, 0, -2);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004;
  Object.assign(key.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 5, far: 50 }); key.shadow.camera.updateProjectionMatrix();
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.55); fill.position.set(0, 9, 24); scene.add(fill);

  // the fittings (built by setFitting)
  const fitting = new THREE.Group(); root.add(fitting);
  const arc = { mesh: null, key: "" };                  // the cyan occupied arc on the ring
  function setFitting(shape, n) {
    fitting.clear(); arc.mesh = null; arc.key = "";
    if (shape === "ring") {
      const plat = cyl(RING_R + 1.25, RING_R + 1.4, 0.3, M.basalt, 96); plat.position.y = 0.15; fitting.add(plat);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(RING_R + 1.3, 0.05, 8, 128), M.gold); edge.rotation.x = Math.PI / 2; edge.position.y = 0.3; fitting.add(edge);
      const track = new THREE.Mesh(new THREE.TorusGeometry(RING_R, 0.08, 10, 160), M.brass); track.rotation.x = Math.PI / 2; track.position.y = 0.34; fitting.add(track);
      const inner = new THREE.Mesh(new THREE.TorusGeometry(RING_R - 0.85, 0.04, 8, 128), M.gold); inner.rotation.x = Math.PI / 2; inner.position.y = 0.31; fitting.add(inner);
      const hub = cyl(1.5, 1.7, 0.7, M.bronze, 48); hub.position.y = 0.35; fitting.add(hub);
      const rose = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.4, map: canvasTexture(512, 512, (g, w, h) => {
        g.fillStyle = "#8c6a38"; g.fillRect(0, 0, w, h); g.fillStyle = "#d8a84e";
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, L = k % 2 ? 140 : 230; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.cos(a + 0.12) * 40, h / 2 + Math.sin(a + 0.12) * 40); g.lineTo(w / 2 + Math.cos(a) * L, h / 2 + Math.sin(a) * L); g.lineTo(w / 2 + Math.cos(a - 0.12) * 40, h / 2 + Math.sin(a - 0.12) * 40); g.fill(); }
      }) }));
      rose.rotation.x = -Math.PI / 2; rose.position.y = 0.705; fitting.add(rose);
      // gold chevrons between the stations, pointing the way the places are numbered: after the last comes [0]
      for (let i = 0; i < n; i++) {
        const a0 = Math.PI + (i / n) * Math.PI * 2, a1 = Math.PI + ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
        const p = new THREE.Vector3(Math.cos(am) * RING_R, 0.32, -Math.sin(am) * RING_R);
        const t = new THREE.Vector3(-Math.sin(am), 0, -Math.cos(am));                      // tangent, towards i+1
        const ch = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 3), M.gold); ch.position.copy(p).setY(0.42);
        ch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t); fitting.add(ch);
      }
    } else if (shape === "pq") {
      const len = (n - 1) * ROW_GAP + 2.4;
      const table = box(len, 0.85, 1.3, M.basaltDark); table.position.set(0, 0.42, -1.1); fitting.add(table);
      const tableTop = box(len + 0.2, 0.08, 1.45, M.ivory); tableTop.position.set(0, 0.88, -1.1); fitting.add(tableTop);
      const lampsRow = [];
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * ROW_GAP;
        const post = cyl(0.05, 0.05, 0.7, M.bronze, 8); post.position.set(x, 1.25, -1.1); fitting.add(post);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshStandardMaterial({ color: 0x6a5a3a, emissive: ATLAS.gold, emissiveIntensity: 0, roughness: 0.4 }));
        bulb.position.set(x, 1.68, -1.1); fitting.add(bulb); lampsRow.push(bulb);
        const st = cyl(0.55, 0.55, 0.04, M.brass, 32); st.position.set(x, 0.02, 0.15); fitting.add(st);
      }
      fitting.userData.lamps = lampsRow;
    } else {
      const len = (n - 1) * ROW_GAP + 2.2;
      const rail = box(len, 1.0, 0.45, M.basaltDark); rail.position.set(0, 0.5, -0.95); fitting.add(rail);
      const railTop = box(len + 0.1, 0.08, 0.55, M.brass); railTop.position.set(0, 1.04, -0.95); fitting.add(railTop);
      for (let i = 0; i < n; i++) { const st = cyl(0.55, 0.55, 0.04, M.brass, 32); st.position.set((i - (n - 1) / 2) * ROW_GAP, 0.02, 0.15); fitting.add(st); }
      // the one-way arrow, inlaid in gold: this gallery only goes one way, and its far end is a wall
      const shaft = box(len - 1.2, 0.03, 0.16, M.gold); shaft.position.set(-0.3, 0.02, 2.35); fitting.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.9, 3), M.gold); head.rotation.z = -Math.PI / 2; head.position.set(len / 2 - 0.45, 0.06, 2.35); head.scale.set(1, 1, 0.12); fitting.add(head);
      const stop = box(0.5, 1.8, 1.6, M.lime); stop.position.set(len / 2 + 0.55, 0.9, 0); fitting.add(stop);
      const stopBand = box(0.52, 0.14, 1.62, M.gold); stopBand.position.set(len / 2 + 0.55, 1.5, 0); fitting.add(stopBand);
    }
    shadow(fitting, true, true);
  }
  // the occupied arc: cyan along the track from FRONT round to REAR (only where the queue really is)
  function setArc(f) {
    const live = f && f.shape === "ring" ? liveCells(f) : new Set();
    const k = f ? `${f.cap}|${f.front}|${f.rear}|${live.size}` : "";
    if (k === arc.key) return; arc.key = k;
    if (arc.mesh) { fitting.remove(arc.mesh); arc.mesh.geometry.dispose(); arc.mesh = null; }
    if (!live.size || f.front < 0) return;
    const n = f.cap, a0 = Math.PI + (f.front / n) * Math.PI * 2;
    let span = ((f.rear - f.front + n) % n) / n * Math.PI * 2; if (live.size === n) span = Math.PI * 2 * (n - 1) / n;
    const pts = []; const steps = Math.max(2, Math.ceil(span / 0.05));
    for (let s = 0; s <= steps; s++) { const a = a0 + span * s / steps; pts.push(new THREE.Vector3(Math.cos(a) * RING_R, 0.37, -Math.sin(a) * RING_R)); }
    if (pts.length < 2 || span === 0) { pts.length = 0; for (let s = 0; s <= 6; s++) { const a = a0 - 0.12 + 0.24 * s / 6; pts.push(new THREE.Vector3(Math.cos(a) * RING_R, 0.37, -Math.sin(a) * RING_R)); } }
    arc.mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 0.1, 8, false), M.cyan);
    fitting.add(arc.mesh);
  }

  let swing = 0, pointerTo = 0;
  world.add({ update: (dt, t) => {
    if (!REDUCED()) { rings[0].rotation.z += dt * 0.05; rings[1].rotation.y += dt * 0.07; rings[2].rotation.y -= dt * 0.09; }
    pointer.rotation.z += (pointerTo - pointer.rotation.z) * Math.min(1, dt * 3);       // the pointer settles, it never snaps
    if (swing > 0) { swing = Math.max(0, swing - dt * 1.2); nsMat.emissiveIntensity = 0.75 + 0.25 * swing; }
  } });
  return {
    setFitting, setArc, COUNTER,
    setServing: n => { paintServing(n); swing = 1; pointerTo = -((n || 0) % 12) / 12 * Math.PI * 2; },
    clearServing: () => { paintServing(null); pointerTo = 0; },
    turnstile: GATE.clone().add(new THREE.Vector3(0, 0, 0.5)),
    routeHome, lamps: () => fitting.userData.lamps || []
  };
}

// ---------- a traveller: a solid, still figure in a limestone robe and a midnight mantle, holding an ivory medallion
function makeShade(tiresias = false) {
  const g = new THREE.Group();
  const robe = new THREE.MeshStandardMaterial({ color: tiresias ? ATLAS.ivory : 0xd3c9b1, roughness: 0.75 });
  const mantle = new THREE.MeshStandardMaterial({ color: tiresias ? 0xd8c9a4 : 0x2d4170, roughness: 0.85 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xbfa98a, roughness: 0.7 });
  const medal = new THREE.MeshStandardMaterial({ color: tiresias ? ATLAS.gold : ATLAS.ivory, emissive: tiresias ? ATLAS.gold : 0xf1e8d2, emissiveIntensity: 0.18, metalness: tiresias ? 0.7 : 0.1, roughness: 0.4 });
  const pts = [[0.0, 0.0], [0.42, 0.0], [0.36, 0.5], [0.27, 1.1], [0.22, 1.35], [0.27, 1.5], [0.12, 1.62], [0.0, 1.62]].map(([r, y]) => new THREE.Vector2(r, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 18), robe));
  const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.46, 1.1, 18, 1, true, Math.PI * 0.55, Math.PI * 0.9), mantle); cape.position.set(0, 1.0, -0.02); g.add(cape);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin); head.position.y = 1.8; g.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), mantle); hood.position.set(0, 1.83, -0.035); g.add(hood);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.48, 4, 8), robe); arm.position.set(sx * 0.25, 1.17, 0.14); arm.rotation.x = -0.75; arm.rotation.z = -sx * 0.25; g.add(arm); }
  const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 24), medal); medallion.rotation.x = Math.PI / 2 - 0.3; medallion.position.set(0, 1.08, 0.36); g.add(medallion);
  if (tiresias) { const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.3, 8), M.bronze); staff.position.set(0.45, 1.12, 0.12); g.add(staff); const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), M.gold); knob.position.set(0.45, 2.3, 0.12); g.add(knob); }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.mats = [robe, mantle, skin, medal];
  g.userData.robe = robe;
  return g;
}
export { makeShade };
// fade a whole figure (solid at 1; see-through only while it leaves or arrives)
function fade(fig, k) { for (const m of fig.userData.mats) { m.transparent = k < 0.999; m.opacity = k; m.depthWrite = k >= 0.999; } }

// ---------- labels: fixed-size, on the screen, with a backing (never tiny text inside the 3D world)
const LABEL_CSS = `
#atlas-labels { position: fixed; inset: 0; pointer-events: none; z-index: 4; overflow: hidden; }
body:not(.busy) #atlas-labels { display: none; }
#atlas-labels > div { position: absolute; left: 0; top: 0; will-change: transform; }
#atlas-labels .al-soul { transform: translate(-50%, -100%); background: #f1e8d2; color: #111522; border: 2px solid #d8a84e; border-radius: 6px;
  padding: 1px 8px 3px; text-align: center; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.45); white-space: nowrap; }
#atlas-labels .al-soul b { display: block; font: 400 22px/1.05 Anton, Impact, sans-serif; letter-spacing: 1px; }
#atlas-labels .al-soul i { display: block; font: 700 10px/1.1 'Courier Prime', monospace; font-style: normal; letter-spacing: 1px; text-transform: uppercase; }
#atlas-labels .al-soul.tiresias { border-color: #f1e8d2; background: #d8a84e; }
#atlas-labels .al-plate { transform: translate(-50%, 0); display: flex; flex-direction: column; align-items: center; gap: 2px; }
#atlas-labels .al-plate .tags { display: flex; gap: 3px; }
#atlas-labels .al-plate .tag { font: 700 11px/1 'Courier Prime', monospace; letter-spacing: 1px; padding: 3px 5px; border-radius: 3px; color: #111522; }
#atlas-labels .al-plate .card { min-width: 46px; padding: 2px 7px 3px; border-radius: 4px; background: #111522; border: 2px solid #8b7448; color: #f1e8d2;
  text-align: center; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.45); }
#atlas-labels .al-plate .i { display: block; font: 700 12px/1.1 'Courier Prime', monospace; color: #d8a84e; }
#atlas-labels .al-plate .v { display: block; font: 400 17px/1.1 Anton, Impact, sans-serif; letter-spacing: 1px; }
#atlas-labels .al-plate .v.stale { color: #7d8597; text-decoration: line-through; }
#atlas-labels .al-plate .v.empty { font: 700 10px/1.6 'Courier Prime', monospace; color: #8a93a8; }
#atlas-labels .al-plate .note { display: block; font: 700 9px/1 'Courier Prime', monospace; color: #8a93a8; }
#atlas-labels .al-plate .card.r-out, #atlas-labels .al-plate .card.r-alarm { border-color: #c64a36; background: #3a1712; }
#atlas-labels .al-plate .card.r-read { border-color: #f1e8d2; }
#atlas-labels .al-plate .card.r-in { border-color: #57b9d1; }
`;
class Labels {
  constructor(world) {
    this.world = world;
    if (!document.getElementById("atlas-label-css")) { const s = document.createElement("style"); s.id = "atlas-label-css"; s.textContent = LABEL_CSS; document.head.appendChild(s); }
    this.el = document.getElementById("atlas-labels") || document.body.appendChild(Object.assign(document.createElement("div"), { id: "atlas-labels" }));
    this.items = new Set(); this.v = new THREE.Vector3();
  }
  add(cls, html, anchor) {                     // anchor: () => Vector3 (world position), read every frame
    const el = document.createElement("div"); el.className = cls; el.innerHTML = html; this.el.appendChild(el);
    const it = { el, anchor, opacity: 1 }; this.items.add(it); return it;
  }
  remove(it) { if (!it) return; it.el.remove(); this.items.delete(it); }
  update() {
    const cam = this.world.camera, W = innerWidth, H = innerHeight;
    for (const it of this.items) {
      const p = it.anchor(); if (!p) { it.el.style.display = "none"; continue; }
      this.v.copy(p).project(cam);
      if (this.v.z > 1 || this.v.z < -1 || Math.abs(this.v.x) > 1.3 || Math.abs(this.v.y) > 1.3) { it.el.style.display = "none"; continue; }
      it.el.style.display = "";
      const x = (this.v.x + 1) / 2 * W, y = (1 - this.v.y) / 2 * H;
      it.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      it.el.style.zIndex = String(1000 - Math.round(this.v.z * 1000));               // nearer on top
      it.el.style.opacity = String(it.opacity);
    }
  }
}

export class Hall {
  constructor(world, hall) {
    this.world = world; this.hall = hall;
    this.group = new THREE.Group(); world.scene.add(this.group);
    this.labels = new Labels(world);
    this.seats = [];          // { label, key }
    this.souls = {};          // seat i -> { fig, label, v }
    this.gates = null;        // the FRONT and REAR gates on the track
    this.tweens = [];
    this.n = 0; this.shape = "";
    this.pending = new Set();   // seats a pointer just moved onto: their real ticket is written next
    this.rims = {};
    world.add(this);
  }

  // where seat i is, and where its traveller stands
  seat(i) {
    if (this.shape === "ring") { const a = Math.PI + (i / this.n) * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * RING_R, 0.3, -Math.sin(a) * RING_R); }
    return new THREE.Vector3((i - (this.n - 1) / 2) * ROW_GAP, 0.0, 0.15);
  }
  plaqueAt(i) {
    if (this.shape === "ring") { const p = this.seat(i); return new THREE.Vector3(p.x * 1.3, 0.3, p.z * 1.3); }
    return new THREE.Vector3((i - (this.n - 1) / 2) * ROW_GAP, 0.0, 1.45);
  }
  points() {
    const pts = [];
    for (let i = 0; i < this.n; i++) { const p = this.plaqueAt(i), s = this.seat(i); pts.push(p.clone().setY(0), s.clone().setY(2.6), s.clone().setX(s.x - 1.0).setY(2.2), s.clone().setX(s.x + 1.0).setY(2.2)); }
    pts.push(new THREE.Vector3(0, 0.8, 0));
    return pts;
  }

  _fit(shape, n) {
    if (shape === this.shape && n === this.n) return;
    for (const s of this.seats) this.labels.remove(s.label);
    for (const k of Object.keys(this.souls)) this._drop(k);
    if (this.gates) { this.group.remove(this.gates.front, this.gates.rear); this.gates = null; }
    this.seats = []; this.shape = shape; this.n = n;
    this.hall.setFitting(shape === "ring" ? "ring" : shape === "pq" ? "pq" : "row", n);
    for (let i = 0; i < n; i++) { const at = this.plaqueAt(i); this.seats.push({ label: this.labels.add("al-plate", "", () => at), key: "" }); }
    if (shape !== "pq") this.gates = { front: this._gate(0xf1e8d2), rear: this._gate(ATLAS.gold) };
  }
  // a slim arch the queue's end walks under: FRONT in ivory, REAR in gold (the deque's two working gates)
  _gate(color) {
    const m = new THREE.MeshStandardMaterial({ color, metalness: 0.5, roughness: 0.4 }), g = new THREE.Group();
    for (const sx of [-0.62, 0.62]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.35, 0.09), m); p.position.set(sx, 1.18, 0); g.add(p); }
    const top = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 24, Math.PI), m); top.position.y = 2.35; g.add(top);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.visible = false; this.group.add(g); return g;
  }
  _placeGate(g, i) {
    if (i == null || i < 0) { g.visible = false; return; }
    const p = this.seat(i); g.visible = true; g.position.copy(p).setY(p.y);
    if (this.shape === "ring") g.lookAt(0, p.y, 0); else g.rotation.set(0, 0, 0);
    // pushed a little outward/back so it frames the traveller instead of cutting through them
    if (this.shape === "ring") g.position.add(p.clone().setY(0).normalize().multiplyScalar(-0.35)); else g.position.z -= 0.35;
  }
  _plaque(i, rim = null) {
    const f = this.frame, s = this.seats[i]; if (!s) return;
    const v = f.cells[i], live = liveCells(f).has(i), state = v == null ? "empty" : live ? "live" : "stale";
    const tags = [];
    if (live || liveCells(f).size) {
      if (f.shape === "pq") { if (i === 0 && liveCells(f).size) tags.push(["pq[0]", FRONT_COLOR]); }
      else if (liveCells(f).size) { if (i === f.front) tags.push(["FRONT", FRONT_COLOR]); if (i === f.rear) tags.push(["REAR", REAR_COLOR]); }
    }
    const key = `${v}|${state}|${rim}|${tags.map(t => t[0]).join(",")}`; if (key === s.key) return; s.key = key;
    const val = v == null ? `<span class="v empty">empty</span>` : state === "live" ? `<span class="v">${v}</span>` : `<span class="v stale">${v}</span><span class="note">not in queue</span>`;
    const tg = tags.length ? `<div class="tags">${tags.map(([n, c]) => `<span class="tag" style="background:${c}">${n}</span>`).join("")}</div>` : "";
    s.label.el.innerHTML = `${tg}<div class="card${rim ? " r-" + rim : ""}"><span class="i">[${i}]</span>${val}</div>`;
  }
  _soul(i, v) {
    let s = this.souls[i];
    if (s && s.v === v) return s;
    if (s) this._drop(i);
    const fig = makeShade(v === 99); this.group.add(fig);
    const label = this.labels.add("al-soul" + (v === 99 ? " tiresias" : ""), `<b>${v}</b><i>${shade(v)}</i>`, () => fig.visible ? fig.position.clone().setY(fig.position.y + 2.2 * fig.scale.y) : null);
    s = (this.souls[i] = { fig, label, v });
    this._place(fig, this.seat(i));
    return s;
  }
  _place(fig, p) {
    fig.position.copy(p);
    if (this.shape === "ring") { fig.lookAt(p.x * 2, p.y, p.z * 2); } else fig.rotation.set(0, 0, 0);   // on the ring they face outward, towards us
  }
  _drop(i) { const s = this.souls[i]; if (!s) return; this.group.remove(s.fig); this.labels.remove(s.label); delete this.souls[i]; }
  _markers() {
    const f = this.frame, live = liveCells(f);
    if (this.gates) { this._placeGate(this.gates.front, live.size ? f.front : null); this._placeGate(this.gates.rear, live.size ? f.rear : null); }
    this.hall.setArc(f.shape === "ring" ? f : null);
  }

  // ---------- jump straight to a frame
  show(f, { keepPending = false } = {}) {
    if (!keepPending) this.pending.clear();
    if (!keepPending && this.outside) { for (const o of Object.values(this.outside)) { this.group.remove(o.fig); this.labels.remove(o.label); } this.outside = {}; }
    this.frame = f; this._fit(f.shape, f.cap);
    const live = liveCells(f);
    for (let i = 0; i < f.cap; i++) {
      if (live.has(i) && f.cells[i] != null && !this.pending.has(i)) { const s = this._soul(i, f.cells[i]); fade(s.fig, 1); s.label.opacity = 1; s.fig.scale.set(1, 1, 1); s.fig.userData.robe.color.setHex(s.v === 99 ? ATLAS.ivory : 0xd3c9b1); this._place(s.fig, this.seat(i)); }
      else this._drop(i);
      this._plaque(i);
    }
    for (const b of this.hall.lamps()) b.material.emissiveIntensity = 0;
    this._markers();
  }

  // ---------- animate one step: whatever changed between the two frames walks, leaves or arrives
  async act(step, after, speed = 1, next = null) {
    const before = this.frame, dur = 0.9 / speed;
    sound.op({ ENQUEUE: "ticket", DEQUEUE: "bell", FULL: "buzz", EMPTY: "buzz" }[step.action] || null);   // the archive's own sounds
    if (!before || after.cap !== this.n || after.shape !== this.shape) { this.show(after); await this.wait(0.2 / speed); return; }
    this.frame = after;
    const L0 = liveCells(before), L1 = liveCells(after), hl = after.hl;
    const ptrMove = step.action === "VAR";
    if (!ptrMove) this.pending.clear();
    if (hl && hl.i >= 0) {
      this._plaque(hl.i, hl.kind === "out" ? "out" : hl.kind === "read" ? "read" : hl.kind === "in" ? "in" : null);
      const lamp = this.hall.lamps()[hl.i]; if (lamp && hl.kind === "read") { this.hall.lamps().forEach(b => (b.material.emissiveIntensity = 0)); lamp.material.emissiveIntensity = 1.3; }   // the comparison lamp
    }
    const jobs = [];
    let anything = false;
    for (let i = 0; i < after.cap; i++) {
      const v0 = L0.has(i) ? before.cells[i] : null, v1 = L1.has(i) ? after.cells[i] : null;
      if (v0 === v1) continue;
      anything = true;
      const s = v0 != null ? this.souls[i] : null;
      if (s) {
        delete this.souls[i];
        const elsewhere = [...L1].some(j => j !== i && after.cells[j] === v0);
        if (elsewhere) jobs.push(this._vanish(s, dur * 0.5));                          // only a copy: he stands at another station now
        else if (next && next.action === "ENQUEUE" && next.value === v0) jobs.push(this._stepOut(s, v0, dur));   // round to the back of the queue
        else if (after.cells[i] === v0 && (after.shape === "pq" || this._leftFrom(i, before, after))) jobs.push(this._serve(s, v0, dur));   // left from an end: guided on
        else if (after.cells[i] === v0) jobs.push(this._vanish(s, dur));               // front/rear jumped past him: he is just not in the queue any more
        else if (after.shape === "pq") jobs.push(this._serve(s, v0, dur));             // deleteMin: his place is closed up behind him
        else jobs.push(this._overwrite(s, dur));                                       // written over while waiting
      }
      if (v1 != null && ptrMove && after.cells[i] === before.cells[i]) { this.pending.add(i); continue; }   // front/rear moved first: the value comes next
      if (v1 != null) {
        const from = [...L0].find(j => j !== i && before.cells[j] === v1), out = this.outside && this.outside[v1];
        if (out) { delete this.outside[v1]; this.group.remove(out.fig); this.labels.remove(out.label); jobs.push(this._arrive(i, v1, out.fig.position.clone(), dur * 1.4, true)); }
        else jobs.push(this._arrive(i, v1, from != null ? this.seat(from) : ENTRANCE, dur, from != null));
      }
    }
    if (/^(FULL|OVERFLOW|EMPTY|UNDERFLOW|OUT_OF_BOUNDS)$/.test(step.action)) { anything = true; jobs.push(this._alarm(dur)); }
    if (step.action === "PEEK" || (step.action === "READ" && hl)) { const s = this.souls[step.index]; if (s) { anything = true; const y0 = this.seat(step.index).y; jobs.push(this._tween(dur, k => { s.fig.position.y = y0 + Math.sin(Math.PI * k) * 0.3; })); } }
    this._markers();
    await Promise.all(jobs);
    if (!anything) await this.wait(/^(VAR|DROP|CALL|RETURN)$/.test(step.action) ? 0.18 / speed : dur * 0.45);
    this.show(after, { keepPending: true });
  }
  async _serve(s, v, dur) {
    const from = s.fig.position.clone(), to = COUNTER.clone().setY(0);
    await this._tween(dur * 1.6, k => { s.fig.position.lerpVectors(from, to, k); s.fig.lookAt(to.x, s.fig.position.y, to.z - 1); });
    this.hall.setServing(v);
    const ts = this.hall.turnstile, at = s.fig.position.clone();
    await this._tween(dur * 1.2, k => { s.fig.position.lerpVectors(at, ts, k); s.fig.lookAt(ts.x, s.fig.position.y, ts.z - 1); fade(s.fig, 1 - k); s.label.opacity = 1 - k; });
    this.group.remove(s.fig); this.labels.remove(s.label);
  }
  async _overwrite(s, dur) {
    s.fig.userData.robe.color.setHex(ATLAS.ember);
    await this._tween(dur * 1.2, k => { s.fig.scale.setScalar(1 + k * 0.3); fade(s.fig, 1 - k); s.label.opacity = 1 - k; });
    this.group.remove(s.fig); this.labels.remove(s.label);
  }
  // guided on from the front (front moved on) or from the rear (rear stepped back: a deque's deleteRear)
  _leftFrom(i, b, a) {
    if (i === b.front && a.front !== b.front) return true;
    return i === b.rear && (a.rear === -1 || a.rear === (b.rear - 1 + b.cap) % b.cap);
  }
  // he steps off the track and waits beside it for his enqueue
  async _stepOut(s, v, dur) {
    (this.outside ||= {})[v] = s;
    const from = s.fig.position.clone(), to = this.shape === "ring" ? from.clone().setY(0).multiplyScalar(1.55) : from.clone().add(new THREE.Vector3(0, 0, 2.2));
    await this._tween(dur, k => { s.fig.position.lerpVectors(from, to, k); });
  }
  async _vanish(s, dur) {
    await this._tween(dur, k => { fade(s.fig, 1 - k); s.label.opacity = 1 - k; });
    this.group.remove(s.fig); this.labels.remove(s.label);
  }
  async _arrive(i, v, from, dur, slide) {
    const s = this._soul(i, v), end = this.seat(i), start = from.clone();
    s.fig.position.copy(start); fade(s.fig, slide ? 1 : 0); s.label.opacity = slide ? 1 : 0;
    await this._tween(dur * (slide ? 0.9 : 1.6), k => { s.fig.position.lerpVectors(start, end, k); if (!slide) { const o = Math.min(1, k * 1.5); fade(s.fig, o); s.label.opacity = o; } s.fig.lookAt(end.x, s.fig.position.y, end.z); });
    fade(s.fig, 1); s.label.opacity = 1;
    this._place(s.fig, end);
  }
  async _alarm(dur) {
    for (let k = 0; k < this.n; k++) this._plaque(k, "alarm");
    await this.wait(dur * 1.2);
    for (let k = 0; k < this.n; k++) this._plaque(k);
  }

  // the finale: the route home draws itself across the Meridian Gate's map, out of the Underworld and over open sea,
  // and STOPS: past that point the map is blank stone (the screenplay: the voyage is not over). Under the blank
  // stone, very faint, the sea's note. Then Tiresias walks out of the gate (at 1.5x the old pace) to the centre.
  async prophecy() {
    const W = 512, H = 1280, STOP = 0.78, cut = H * 0.66;      // STOP: where the route meets the edge of the blank stone
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const over = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 6.0), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    over.position.set(GATE.x, 3.05, GATE.z + 0.5); this.group.add(over); this.routeOver = over;
    // the route's own curve (the one painted on the gate), sampled; it is drawn up to STOP of its length
    const P = [[120, 210], [420, 420], [60, 640], [250, 560], [420, 700], [120, 900], [300, 1120]];
    const bez = (a, b, c2, d, t) => { const u = 1 - t; return [u*u*u*a[0] + 3*u*u*t*b[0] + 3*u*t*t*c2[0] + t*t*t*d[0], u*u*u*a[1] + 3*u*u*t*b[1] + 3*u*t*t*c2[1] + t*t*t*d[1]]; };
    const pts = []; for (let i = 0; i <= 120; i++) { const t = i / 120; pts.push(t < 0.5 ? bez(P[0], P[1], P[2], P[3], t * 2) : bez(P[3], P[4], P[5], P[6], t * 2 - 1)); }
    const draw = k => {
      g.clearRect(0, 0, W, H);
      // the blank stone: the lower part of the map, worn smooth, no sea, no islands
      g.fillStyle = "#8f8a80"; g.fillRect(0, cut, W, H - cut);
      for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${60 + (i * 37) % 60},${58 + (i * 23) % 50},${54 + (i * 13) % 40},0.18)`; g.fillRect((i * 97) % W, cut + (i * 53) % (H - cut), 3 + (i % 5), 2 + (i % 3)); }
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(0, cut - 3, W, 6);                              // the edge where the map ends
      // the route, solid gold, drawn as far as it goes
      const n = Math.max(2, Math.round(pts.length * STOP * k));
      g.strokeStyle = "#ffd36a"; g.lineWidth = 12; g.lineCap = "round"; g.shadowColor = "#ffcf5a"; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(...pts[0]); for (let i = 1; i < n; i++) g.lineTo(...pts[i]); g.stroke(); g.shadowBlur = 0;
      tex.needsUpdate = true;
    };
    draw(0);
    await this._tween(2.6, k => draw(k));
    sound.seaHeard({ level: 0.12, seconds: 6 });                                                      // under the blank stone, very faint
    await this.wait(0.6);
    const t = makeShade(true); t.scale.setScalar(1.5);
    const from = new THREE.Vector3(GATE.x, 0, GATE.z + 0.6), to = new THREE.Vector3(0, 0, -3.6);
    t.position.copy(from); fade(t, 0); this.group.add(t); this.prophet = t;
    await this._tween(2.0, k => { t.position.lerpVectors(from, to, k); t.lookAt(0, 0, 10); fade(t, Math.min(1, k * 2)); });
    fade(t, 1);
    return t;
  }
  // he turns his blind face to a station on the ring, then walks back out through the gate (the finale's last beat)
  async prophetLeaves(lookAt) {
    const t = this.prophet; if (!t) return;
    const at = t.position.clone();
    t.lookAt(lookAt.x, 0, lookAt.z); await this.wait(1.4);
    const to = new THREE.Vector3(GATE.x, 0, GATE.z + 0.6);
    await this._tween(2.4, k => { t.position.lerpVectors(at, to, k); t.lookAt(to.x, 0, to.z - 5); fade(t, Math.max(0, 1 - Math.max(0, k - 0.6) * 2.5)); });
    t.visible = false;
  }
  clearProphecy() {
    if (this.prophet) { this.group.remove(this.prophet); this.prophet = null; }
    if (this.routeOver) { this.group.remove(this.routeOver); this.routeOver.material.map.dispose(); this.routeOver.material.dispose(); this.routeOver.geometry.dispose(); this.routeOver = null; }
    if (this.hall.routeHome) this.hall.routeHome.material.opacity = 0;
  }

  _tween(seconds, fn) { return new Promise(res => this.tweens.push({ t: 0, d: Math.max(seconds, 1e-3), fn, res })); }
  update(dt) {
    for (const tw of [...this.tweens]) {
      tw.t += dt; const k = Math.min(1, tw.t / tw.d); tw.fn(k);
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); }
    }
    this.labels.update();
  }
  wait(s) { return this._tween(s, () => {}); }
}
