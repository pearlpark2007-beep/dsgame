// caveDetails.js — the small things that make the cave a lived-in place (the redesign's world-building
// pass). Every detail does a job: it shows who lives here, what happened here, where the way out is,
// or it repeats the array idea. All of it is cheap: canvas decals laid on the real floor, a handful of
// simple meshes, two shafts of moonlight with no real light behind them (a soft glow on the floor instead).
//
//   THE THRESHOLD   the boulder's scrape path, giant handprints in the dust, a broken oar from an earlier
//                   visitor, a coil of rope, rope grooves worn into the door posts
//   THE PEN WALL    a chalk count diagram (ten boxes, eight ticked), a worn hoof path, repair patches
//   HIS CORNER      a drinking cup the size of a barrel, a sleeping mat of hides, a stone hammer
//   THE DEEP CAVE   old offerings on a flat stone by the pool, abandoned baskets, a water channel
//   MOONLIGHT       two cold shafts from cracks in the roof: one over the pool, one inside the door
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DOOR_AT, GIANT_AT, roofAt, moonBeam } from "./caveScene.js";
import { POOL_AT } from "./caveLights.js";
import { PEN_W } from "./penRow.js";

const rand = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(91);
const between = (a, b) => a + rand() * (b - a);

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// a decal that lies ON the floor: a grid whose every point is dropped onto the real ground below it
function groundDecal(scene, floor, tex, { x, z, w, d, rot = 0, opacity = 1, additive = false }) {
  const g = new THREE.PlaneGeometry(w, d, Math.max(2, Math.round(w * 2)), Math.max(2, Math.round(d * 2)));
  g.rotateX(-Math.PI / 2); g.rotateY(rot); g.translate(x, 0, z);
  const p = g.attributes.position, ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), from = new THREE.Vector3();
  floor.updateMatrixWorld(true);
  for (let i = 0; i < p.count; i++) {
    from.set(p.getX(i), 6, p.getZ(i)); ray.set(from, down);
    const h = ray.intersectObject(floor, false)[0];
    p.setY(i, (h ? h.point.y : 0) + 0.025);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, transparent: true, opacity, depthWrite: false, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -2, ...(additive ? { blending: THREE.AdditiveBlending, toneMapped: false } : {}) }));
  m.receiveShadow = true; scene.add(m);
  return m;
}

// ---------- the drawings (canvas)
const scrapeTex = () => canvasTex(128, 512, (c, w, h) => {
  // a long band where the boulder grinds back and forth: pale scratched stone, darker at the edges
  const g = c.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, "rgba(20,14,10,0)"); g.addColorStop(0.15, "rgba(30,22,16,0.55)"); g.addColorStop(0.5, "rgba(150,132,108,0.38)");
  g.addColorStop(0.85, "rgba(30,22,16,0.55)"); g.addColorStop(1, "rgba(20,14,10,0)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(205,190,160,0.35)"; c.lineWidth = 1.5;
  for (let k = 0; k < 40; k++) { const x = 20 + Math.random() * (w - 40); c.beginPath(); c.moveTo(x, 10 + Math.random() * 40); c.lineTo(x + (Math.random() - 0.5) * 8, h - 10 - Math.random() * 40); c.stroke(); }
  const f = c.createLinearGradient(0, 0, 0, h); f.addColorStop(0, "rgba(0,0,0,1)"); f.addColorStop(0.12, "rgba(0,0,0,0)"); f.addColorStop(0.88, "rgba(0,0,0,0)"); f.addColorStop(1, "rgba(0,0,0,1)");
  c.globalCompositeOperation = "destination-out"; c.fillStyle = f; c.fillRect(0, 0, w, h);
});
const handTex = () => canvasTex(256, 256, (c, w, h) => {
  // one huge hand pressed in the dust: a dark palm and five fingers, the dust pushed up pale round it
  const hand = (col, grow) => {
    c.fillStyle = col;
    c.beginPath(); c.ellipse(128, 160, 52 + grow, 62 + grow, 0, 0, Math.PI * 2); c.fill();
    [[-58, -40, -0.6, 18, 46], [-30, -86, -0.18, 17, 58], [2, -98, 0, 17, 62], [32, -88, 0.18, 16, 56], [56, -58, 0.45, 14, 44]].forEach(([dx, dy, r, rx, ry]) => {
      c.beginPath(); c.ellipse(128 + dx, 160 + dy, rx + grow * 0.5, ry + grow * 0.5, r, 0, Math.PI * 2); c.fill();
    });
  };
  hand("rgba(170,150,120,0.28)", 7); hand("rgba(18,12,8,0.6)", 0);
});
const pathTex = () => canvasTex(512, 64, (c, w, h) => {
  // the floor trodden dark and smooth where the flock goes in and out, every night, in order
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(10,7,5,0)"); g.addColorStop(0.5, "rgba(10,7,5,0.42)"); g.addColorStop(1, "rgba(10,7,5,0)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.fillStyle = "rgba(8,5,3,0.35)";
  for (let k = 0; k < 160; k++) { c.beginPath(); c.ellipse(Math.random() * w, 18 + Math.random() * 28, 2.4, 3.2, Math.random(), 0, Math.PI * 2); c.fill(); }   // hoof marks
});
const countTex = () => canvasTex(1024, 256, (c, w, h) => {
  // the giant's own chalk diagram of his pens: ten boxes, eight ticked, an arrow at the first empty one
  c.strokeStyle = "rgba(226,214,186,0.85)"; c.fillStyle = "rgba(226,214,186,0.85)"; c.lineWidth = 7; c.lineCap = "round"; c.lineJoin = "round";
  const bw = 84, gap = 10, x0 = 40, y0 = 70;
  for (let i = 0; i < 10; i++) {
    const x = x0 + i * (bw + gap) + Math.sin(i * 3.1) * 3;
    c.strokeRect(x, y0 + Math.sin(i * 1.7) * 3, bw, 92);
    if (i < 8) { c.beginPath(); c.moveTo(x + 18, y0 + 50); c.lineTo(x + 36, y0 + 72); c.lineTo(x + 66, y0 + 22); c.stroke(); }
  }
  const ax = x0 + 8 * (bw + gap) + bw / 2;
  c.beginPath(); c.moveTo(ax, 245); c.lineTo(ax, 180); c.moveTo(ax - 16, 196); c.lineTo(ax, 176); c.lineTo(ax + 16, 196); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.moveTo(x0, 30); c.lineTo(x0 + 8 * (bw + gap) - gap, 30); c.stroke();              // the eight he has
  c.beginPath(); c.moveTo(x0, 18); c.lineTo(x0, 42); c.moveTo(x0 + 8 * (bw + gap) - gap, 18); c.lineTo(x0 + 8 * (bw + gap) - gap, 42); c.stroke();
});
const glowTex = () => canvasTex(128, 128, (c, w, h) => {
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(143,166,200,0.55)"); g.addColorStop(0.5, "rgba(143,166,200,0.18)"); g.addColorStop(1, "rgba(143,166,200,0)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
});
const channelTex = () => canvasTex(64, 512, (c, w, h) => {
  const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "rgba(2,4,6,0)"); g.addColorStop(0.35, "rgba(2,4,6,0.85)"); g.addColorStop(0.65, "rgba(2,4,6,0.85)"); g.addColorStop(1, "rgba(2,4,6,0)");
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = "rgba(160,180,200,0.25)"; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2, 0); for (let y = 0; y <= h; y += 16) c.lineTo(w / 2 + Math.sin(y * 0.05) * 3, y); c.stroke();
});

export function addCaveDetails(world, cave) {
  const { scene } = world, floor = cave.floor;
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 });
  const paleWood = new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 0.95 });
  const clay = new THREE.MeshStandardMaterial({ color: 0x7a4a2c, roughness: 0.9 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 1, flatShading: true });
  const hide = new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1, side: THREE.DoubleSide });
  const wicker = new THREE.MeshStandardMaterial({ color: 0x6e5a3a, roughness: 1 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x8a7650, roughness: 1 });
  const shadowed = m => { m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
  const cast = o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; };        // for the parts of a group (they stay in it)

  // ---------- THE THRESHOLD
  groundDecal(scene, floor, scrapeTex(), { x: DOOR_AT.x + 1.1, z: DOOR_AT.z + 4.2, w: 2.6, d: 13 });
  groundDecal(scene, floor, handTex(), { x: DOOR_AT.x + 6.5, z: DOOR_AT.z + 2.6, w: 2.4, d: 2.4, rot: 2.2, opacity: 0.9 });
  groundDecal(scene, floor, handTex(), { x: DOOR_AT.x + 8.6, z: DOOR_AT.z - 1.8, w: 2.2, d: 2.2, rot: -0.6, opacity: 0.8 });
  // a broken oar from someone who came here before: half a shaft, the blade split
  const oar = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 7), paleWood); shaft.rotation.z = Math.PI / 2; oar.add(shaft);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.26), paleWood); blade.position.x = 1.7; blade.rotation.y = 0.12; oar.add(blade);
  const splinter = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 5), paleWood); splinter.rotation.z = Math.PI / 2; splinter.position.x = -1.45; oar.add(splinter);
  oar.position.set(DOOR_AT.x + 7.4, 0.12, DOOR_AT.z + 5.2); oar.rotation.y = 0.9; oar.traverse(cast); scene.add(oar);
  // a coil of rope by the door
  const coil = [];
  for (let k = 0; k < 4; k++) { const t = new THREE.TorusGeometry(0.42 - k * 0.04, 0.045, 6, 22); t.rotateX(Math.PI / 2); t.translate(0, 0.05 + k * 0.08, 0); coil.push(t); }
  const coilM = shadowed(new THREE.Mesh(mergeGeometries(coil), ropeMat)); coilM.position.set(DOOR_AT.x + 5.2, 0.05, DOOR_AT.z - 4.4);
  // grooves worn into the door posts by the ropes the giant hauls the boulder with
  const grooves = [];
  for (let k = 0; k < 5; k++) { const g = new THREE.TorusGeometry(0.9, 0.035, 4, 16, Math.PI * 0.6); g.rotateY(Math.PI / 2); g.rotateX(0.2); g.translate(DOOR_AT.x + 1.2, 1.1 + k * 0.35, DOOR_AT.z - 4.0); grooves.push(g); }
  scene.add(new THREE.Mesh(mergeGeometries(grooves), new THREE.MeshStandardMaterial({ color: 0x15100c, roughness: 1 })));

  // ---------- THE PEN WALL
  const diagram = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshStandardMaterial({ map: countTex(), transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  diagram.position.set(PEN_W * 7.2, 2.45, -0.78); scene.add(diagram);
  groundDecal(scene, floor, pathTex(), { x: PEN_W * 4.5, z: 2.9, w: 19, d: 1.6, opacity: 0.85 });
  // repair patches: a few new, paler rods woven into the old hurdles
  const patches = [];
  for (const i of [2, 5, 8]) for (let k = 0; k < 2; k++) { const r = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5); r.rotateX(Math.PI / 2); r.translate(i * PEN_W - PEN_W / 2 + 0.04, 0.33 + k * 0.22, -0.1 + between(-0.2, 0.2)); patches.push(r); }
  scene.add(new THREE.Mesh(mergeGeometries(patches), paleWood));

  // ---------- HIS CORNER: methodical, not just monstrous
  const cup = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.75, 1.5, 18, 1, true), wood)); cup.position.set(GIANT_AT.x + 4.6, 0.75, GIANT_AT.z - 3.2);          // behind his right shoulder: out of every film's way
  const cupBase = shadowed(new THREE.Mesh(new THREE.CircleGeometry(0.75, 18), wood)); cupBase.rotation.x = -Math.PI / 2; cupBase.position.set(cup.position.x, 0.04, cup.position.z);
  const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.06, 5, 20), paleWood)); rim.rotation.x = Math.PI / 2; rim.position.set(cup.position.x, 1.5, cup.position.z);
  const mat = new THREE.PlaneGeometry(6.2, 3.4, 8, 4), mp = mat.attributes.position;
  for (let i = 0; i < mp.count; i++) mp.setZ(i, Math.sin(mp.getX(i) * 1.7) * 0.06 + Math.sin(mp.getY(i) * 2.3) * 0.05);
  mat.computeVertexNormals();
  const bed = shadowed(new THREE.Mesh(mat, hide)); bed.rotation.set(-Math.PI / 2, 0, 0.5); bed.position.set(GIANT_AT.x + 6.5, 0.12, GIANT_AT.z + 0.5);
  const hammer = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.4, 7), wood); handle.rotation.z = Math.PI / 2; hammer.add(handle);
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), stone); head.scale.set(0.8, 1.3, 1); head.position.x = 1.8; hammer.add(head);
  hammer.position.set(GIANT_AT.x + 8.5, 0.3, GIANT_AT.z + 3.5); hammer.rotation.y = 1.1; hammer.traverse(cast); scene.add(hammer);

  // ---------- THE DEEP CAVE: someone came here before, and left offerings
  const altar = shadowed(new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.3), stone)); altar.position.set(POOL_AT.x - 6.5, 0.25, POOL_AT.z - 3.2); altar.rotation.y = 0.4;
  for (const [dx, dz, s] of [[-0.6, 0.1, 1], [0.1, -0.2, 0.8], [0.7, 0.2, 0.65]]) {
    const pot = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.8), clay));
    pot.position.set(altar.position.x + dx, 0.5 + 0.15 * s, altar.position.z + dz);
  }
  for (const [x, z, r] of [[-3.5, -15.5, 0.45], [-2.6, -16.2, 0.35]]) {
    const basket = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, r * 1.2, 12, 1, true), wicker)); basket.position.set(x, r * 0.6, z); basket.rotation.z = r > 0.4 ? 1.4 : 0;
  }
  groundDecal(scene, floor, channelTex(), { x: POOL_AT.x + 2.5, z: POOL_AT.z - 7.5, w: 0.7, d: 7, rot: -0.35, opacity: 0.9 });

  // ---------- MOONLIGHT: two cold shafts from cracks in the roof (no real light: a soft glow where they land)
  const beams = [];
  for (const [fx, fz, tx, tz, r] of [[POOL_AT.x + 1.5, POOL_AT.z - 1.5, POOL_AT.x, POOL_AT.z + 0.5, 2.0], [DOOR_AT.x + 6, DOOR_AT.z - 3, DOOR_AT.x + 5, DOOR_AT.z - 0.5, 1.6]]) {
    const from = new THREE.Vector3(fx, roofAt(fx, fz) - 0.4, fz), to = new THREE.Vector3(tx, 0, tz);
    const beam = moonBeam(from, to, r); scene.add(beam); beams.push(beam);
    beams.push(groundDecal(scene, floor, glowTex(), { x: tx, z: tz, w: r * 2.6, d: r * 2.6, additive: true }));
  }
  return { beams, diagram };
}
