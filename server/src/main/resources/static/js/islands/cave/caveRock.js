// caveRock.js — the shape of the cave. The dome alone looked like the inside of an egg; a real cave is
// made of masses: layered rock (strata) bulging out of the walls, overhangs, ledges, columns where a
// stalactite met a stalagmite, and a passage running back into the dark. These are those masses.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { stoneTexture } from "../../engine/textures.js";
import { HALL, roofAt, DOOR_AT, GIANT_AT } from "./caveScene.js";

// layered noise: big lumps, smaller knobs, fine grit (each term a different direction and frequency)
function noise(x, y, z, s) {
  return Math.sin(x * 0.9 + s) * Math.cos(z * 0.8 - s * 0.7) * 0.5
    + Math.sin(y * 1.9 + x * 0.7 + s * 1.3) * Math.cos(z * 1.6 + s) * 0.28
    + Math.sin(x * 4.1 + y * 3.3 - z * 3.7 + s * 2.1) * 0.12
    + Math.sin(x * 9.3 - y * 7.7 + z * 8.1 + s) * 0.05;
}

// one mass of rock: a lumpy blob with horizontal strata ridges, darker in its hollows
export function crag(seed, { sx = 1, sy = 1, sz = 1, strata = 1, detail = 4 } = {}) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position, v = new THREE.Vector3();
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise(v.x * 2, v.y * 2, v.z * 2, seed);
    // strata: shelves along the height, so the rock reads as layered limestone
    const band = Math.sin(v.y * 9 * strata + noise(v.x, 0, v.z, seed) * 2) * 0.05 * strata;
    const k = 1 + n * 0.32 + band;
    p.setXYZ(i, v.x * k * sx, v.y * k * sy, v.z * k * sz);
    const shade = THREE.MathUtils.clamp(0.55 + n * 0.7 + band * 3, 0.25, 1.15);
    col.set([shade, shade * 0.95, shade * 0.88], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// a column: a tapered, knotted pillar from the floor to the roof, wider at both ends
function column(x, z, seed) {
  const top = roofAt(x, z) + 0.5;
  const g = new THREE.CylinderGeometry(1, 1, 1, 18, 24, true);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i)), h = p.getY(i) + 0.5;      // 0 at the floor, 1 at the roof
    const waist = 0.7 + 1.6 * Math.pow(Math.abs(h - 0.45) * 2, 2.2);        // thin in the middle, flared at the ends
    const n = noise(Math.cos(a) * 2, h * 8, Math.sin(a) * 2, seed);
    const r = waist * (1 + n * 0.35) + Math.sin(h * 40 + a * 2) * 0.05;     // drip ridges
    p.setXYZ(i, x + Math.cos(a) * r, h * top - 0.3, z + Math.sin(a) * r);
    const shade = THREE.MathUtils.clamp(0.6 + n, 0.3, 1.1); col.set([shade, shade * 0.95, shade * 0.88], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

export function buildRock(world) {
  const { scene } = world;
  const rand = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(91);
  const between = (a, b) => a + rand() * (b - a);
  const st = stoneTexture({ seed: 33, base: [150, 132, 110], dark: [60, 50, 40], moss: [92, 86, 64], repeat: 3 });
  const rock = new THREE.MeshStandardMaterial({ ...st, vertexColors: true, roughness: 0.95, normalScale: new THREE.Vector2(1.2, 1.2) });
  const parts = [], cols = [];

  // where the wall is, going round the hall at a given height
  const wallAt = (a, y) => {
    const ry = Math.sqrt(Math.max(0.05, 1 - Math.pow((y + 1.2) / HALL.ry, 2)));
    return new THREE.Vector3(HALL.x + Math.cos(a) * HALL.rx * ry, y, HALL.z + Math.sin(a) * HALL.rz * ry);
  };
  const doorA = Math.atan2((DOOR_AT.z - HALL.z) / HALL.rz, (DOOR_AT.x - HALL.x) / HALL.rx);
  const tunnelA = Math.atan2((-25 - HALL.z) / HALL.rz, (2 - HALL.x) / HALL.rx);
  // the space round Polyphemus stays clear of hanging rock, so he can always be seen whole
  const byGiant = (x, z) => Math.hypot(x - GIANT_AT.x, z - GIANT_AT.z) < 10;
  // and the doorway stays open: nothing stands in the way of the light (or the camera) coming through it
  const byDoor = (x, z, r = 9) => Math.hypot(x - DOOR_AT.x, z - DOOR_AT.z) < r;
  const near = (a, b, w) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < w;

  // 1. the lower wall: big bulging masses all the way round (gaps for the door and the tunnel; the camera side stays open)
  for (let a = 0; a < Math.PI * 2; a += 0.17) {
    if (near(a, doorA, 0.2) || near(a, tunnelA, 0.1)) continue;
    const p = wallAt(a, between(1.5, 4));
    if (p.z > 11) continue;
    if (byDoor(p.x, p.z, 10)) continue;
    const s = between(3.5, 6.5);
    const g = crag(rand() * 100, { sx: s * between(0.9, 1.4), sy: s * between(0.7, 1.1), sz: s * between(0.9, 1.3) });
    g.rotateY(rand() * 6.28); g.translate(p.x * 0.97 + HALL.x * 0.03, p.y, p.z * 0.97 + HALL.z * 0.03); parts.push(g);
  }
  // 2. the upper wall: overhangs, pushed further in, so the roof hangs over the edges of the hall
  for (let a = 0.05; a < Math.PI * 2; a += 0.26) {
    if (near(a, doorA, 0.15)) continue;
    const y = between(7, 11), p = wallAt(a, y);
    if (p.z > 10 || byGiant(p.x * 0.9 + HALL.x * 0.1, p.z * 0.9 + HALL.z * 0.1) || byDoor(p.x, p.z, 8)) continue;
    const s = between(3, 5.5);
    const g = crag(rand() * 100, { sx: s * 1.4, sy: s * 0.55, sz: s * 1.2, strata: 1.5 });
    g.rotateY(rand() * 6.28); g.translate(p.x * 0.9 + HALL.x * 0.1, p.y, p.z * 0.9 + HALL.z * 0.1); parts.push(g);
  }
  // 3. the roof: heavy rock hanging down, so it isn't one smooth vault
  for (let k = 0; k < 22; k++) {
    const x = between(HALL.x - HALL.rx * 0.7, HALL.x + HALL.rx * 0.7), z = between(HALL.z - HALL.rz * 0.7, HALL.z + HALL.rz * 0.4);
    const top = roofAt(x, z); if (top < 8 || byGiant(x, z) || byDoor(x, z, 8)) continue;
    const s = between(2.5, 5);
    const g = crag(rand() * 100, { sx: s * 1.3, sy: s * 0.6, sz: s * 1.2, strata: 1.2 }); g.translate(x, top - s * 0.25, z); parts.push(g);
  }
  // 4. a great overhang above the pens: the flock lives under a lip of rock
  { const g = crag(7.7, { sx: 10, sy: 2.6, sz: 6, strata: 2 }); g.translate(6, 9.5, -9); parts.push(g); }
  // 5. ledges on the left wall (lamps stand on them)
  for (const [x, y, z, s] of [[-17, 4.2, -12, 3.2], [-20, 6.5, 2, 2.6], [30, 5.5, -14, 3]]) {
    const g = crag(x * 3.1, { sx: s * 1.4, sy: s * 0.35, sz: s, strata: 0.5 }); g.translate(x, y, z); parts.push(g);
  }
  // 6. boulders on the floor, round the edges of the open ground
  for (let k = 0; k < 18; k++) {
    const a = rand() * Math.PI * 2, p = wallAt(a, 0);
    if (near(a, doorA, 0.18) || p.z > 9) continue;
    const pp = p.clone().lerp(new THREE.Vector3(HALL.x, 0, HALL.z), between(0.12, 0.3));
    if (pp.x > -3 && pp.x < 19 && pp.z > -3 && pp.z < 9) continue;
    if (byDoor(pp.x, pp.z, 9)) continue;                      // never in front of the pens
    const s = between(0.8, 2.2);
    const g = crag(rand() * 100, { sx: s * 1.2, sy: s * 0.7, sz: s }); g.translate(pp.x, s * 0.35, pp.z); parts.push(g);
  }
  // 7. columns: two framing the pool, one by the door, two at the giant's end
  for (const [x, z] of [[-12, -15], [-3, -18], [-16, 8], [33, -2], [17, -18]]) cols.push(column(x, z, x * 1.7 + z));

  const mesh = new THREE.Mesh(mergeGeometries([...parts, ...cols].map(g => g.index ? g.toNonIndexed() : g)), rock);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);

  // 8. the passage at the back: a rough tube running off into the mountain, with a glow far down it
  const tube = new THREE.CylinderGeometry(3.4, 2.6, 22, 20, 16, true);
  const tp = tube.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i), n = noise(x, y * 0.6, z, 5.5);
    tp.setXYZ(i, x * (1 + n * 0.3), y, z * (1 + n * 0.3) * 1.25);
  }
  tube.computeVertexNormals();
  const passage = new THREE.Mesh(tube, new THREE.MeshStandardMaterial({ ...st, roughness: 1, side: THREE.BackSide }));
  passage.rotation.x = Math.PI / 2; passage.rotation.z = 0.25;
  passage.position.set(2, 3.2, -33); scene.add(passage);
  return { mesh, passage, passageEnd: new THREE.Vector3(4.5, 2, -42) };
}
