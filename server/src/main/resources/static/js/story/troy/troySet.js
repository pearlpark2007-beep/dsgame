// troySet.js — the set for the opening film: Troy on its hill, the walls and the great gate, the houses,
// the stair to the wall walk with Poseidon's trident cut in the parapet, the plain, the beach with twelve
// ships, and the sea. Two moods: "night" (the city burning) and "dawn" (grey light, smoke).
// ROUGH PROTOTYPE (narrative Phase 6): blocking, materials and light only — for a look review.
// Units: metres. The city stands at C, the gate faces the sea (+z).
import * as THREE from "three";
import { stoneTexture, plankTexture } from "../../engine/textures.js";
import { Sea } from "../../engine/sea.js";
import { Fire } from "../../engine/weather.js";
import { buildTrireme } from "../../islands/harbour/trireme.js";
import { bakeByMaterial } from "./bake.js";

export const C = new THREE.Vector3(0, 0, -150);      // city centre
export const WALL_R = 78;                              // wall radius
export const PLATEAU = 16;                             // ground level inside the walls
const WALL_TOP = PLATEAU + 9;                          // wall walk
const GATE_W = 9, GATE_H = 9.5;
const GATE_A = Math.PI / 2;                            // angle (from +x, toward +z) where the gate stands
export const GATE = new THREE.Vector3(C.x, PLATEAU, C.z + WALL_R);
export const SHORE_Z = 150;                            // the waterline

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// ground height anywhere
export function groundAt(x, z) {
  const d = Math.hypot(x - C.x, z - C.z);
  const plain = THREE.MathUtils.lerp(4, 1.2, smooth(-60, 130, z)) - 4.2 * smooth(SHORE_Z - 14, SHORE_Z + 25, z);
  const hill = PLATEAU + 3.5 * (1 - smooth(0, 40, d));                          // citadel rise in the middle
  const k = 1 - smooth(WALL_R + 2, WALL_R + 70, d);                             // the hill falls away outside the wall
  const n = Math.sin(x * 0.05) * Math.cos(z * 0.043) * 0.8 + Math.sin(x * 0.13 + z * 0.09) * 0.3;
  return THREE.MathUtils.lerp(plain + n, hill, d < WALL_R + 2 ? 1 : k);
}

// a ring piece of wall: a battered (sloping) stone face outside, straight inside, walk on top
function wallLathe(mat, phiStart, phiLength, seg) {
  const base = 3;                                      // foot of the wall, below the plateau (the hill falls away)
  const pts = [
    new THREE.Vector2(WALL_R - 3.2, WALL_TOP), new THREE.Vector2(WALL_R - 3.2, base),        // inner face (lathe runs from inside to outside)
  ];
  const prof = [
    new THREE.Vector2(WALL_R - 3.4, base), new THREE.Vector2(WALL_R - 3.4, WALL_TOP),        // inner face up
    new THREE.Vector2(WALL_R + 0.6, WALL_TOP),                                              // the walk
    new THREE.Vector2(WALL_R + 0.6, PLATEAU + 2), new THREE.Vector2(WALL_R + 4.2, base)     // outer: upright, then the battered skirt
  ];
  void pts;
  const g = new THREE.LatheGeometry(prof, seg, phiStart, phiLength);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * phiLength * WALL_R / 7, uv.getY(i) * 4);
  const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true;
  return m;
}

// Poseidon's trident, cut into a stone block: a canvas used as colour and as a bump map
function tridentTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 512; const x = c.getContext("2d");
  x.fillStyle = "#8a8578"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2500; i++) { const v = 100 + rnd() * 70; x.fillStyle = `rgba(${v},${v - 4},${v - 12},0.35)`; x.fillRect(rnd() * 512, rnd() * 512, 2 + rnd() * 6, 2 + rnd() * 6); }
  const cut = (w, col) => {
    x.strokeStyle = col; x.lineWidth = w; x.lineCap = "round";
    x.beginPath(); x.moveTo(256, 470); x.lineTo(256, 150); x.stroke();                       // shaft
    x.beginPath(); x.moveTo(160, 120); x.quadraticCurveTo(170, 230, 256, 235); x.quadraticCurveTo(342, 230, 352, 120); x.stroke();   // the fork
    x.beginPath(); x.moveTo(256, 235); x.lineTo(256, 90); x.stroke();                         // middle prong
    for (const [px, py] of [[160, 120], [256, 90], [352, 120]]) { x.beginPath(); x.moveTo(px - 18, py + 26); x.lineTo(px, py - 4); x.lineTo(px + 18, py + 26); x.stroke(); }
  };
  cut(30, "#3a3630"); cut(18, "#24211d");
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(140,136,124,${0.25 + rnd() * 0.3})`; x.fillRect(rnd() * 512, rnd() * 512, 3 + rnd() * 10, 2 + rnd() * 5); }  // centuries of wear over the cut
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// a soft grey smoke column (big round dots drifting up)
class Smoke {
  constructor(world, at, { count = 40, size = 60, height = 120, color = 0x3a3634, opacity = 0.22 } = {}) {
    this.at = at.clone(); this.h = height; this.count = count;
    const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.6, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const geo = new THREE.BufferGeometry(); this.p = new Float32Array(count * 3); this.seed = [];
    for (let i = 0; i < count; i++) this.seed.push(rnd());
    geo.setAttribute("position", new THREE.BufferAttribute(this.p, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: new THREE.CanvasTexture(c), color, transparent: true, opacity, depthWrite: false, fog: true }));
    this.points.frustumCulled = false; world.scene.add(this.points);
  }
  update(dt, time) {
    for (let i = 0; i < this.count; i++) {
      const k = (this.seed[i] + time * 0.012) % 1;                // 0 at the roofs → 1 high above
      this.p[i * 3] = this.at.x + k * k * 90 + Math.sin(i * 1.7 + time * 0.1) * (4 + k * 18);    // the wind leans it inland
      this.p[i * 3 + 1] = this.at.y + k * this.h;
      this.p[i * 3 + 2] = this.at.z - k * 30 + Math.cos(i * 2.3) * (4 + k * 14);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

// a sky dome: night (stars, the glow of the burning city low in the north) or a grey dawn
function skyDome() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { night: { value: 1 }, glow: { value: 1 }, glowDir: { value: new THREE.Vector3(0, 0.1, -1).normalize() } },
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position.z = gl_Position.w; }",
    fragmentShader: `uniform float night, glow; uniform vec3 glowDir; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      void main(){
        float y = max(vD.y, 0.0);
        vec3 nTop = vec3(0.010,0.014,0.030), nHor = vec3(0.035,0.040,0.060);
        vec3 dTop = vec3(0.20,0.23,0.27), dHor = vec3(0.37,0.36,0.37);
        vec3 c = mix(mix(dHor, dTop, pow(y, 0.5)), mix(nHor, nTop, pow(y, 0.45)), night);
        float g = pow(max(dot(vD, glowDir), 0.0), 6.0) * (1.0 - smoothstep(0.0, 0.35, y));
        c += night * glow * g * vec3(0.55,0.20,0.06);                                     // the fire's glow on the sky
        float dawn = pow(max(dot(vD, normalize(vec3(-1.0,0.08,0.2))), 0.0), 8.0) * (1.0 - smoothstep(0.0, 0.25, y));
        c += (1.0 - night) * dawn * vec3(0.35,0.22,0.12);                         // a low dawn in the east
        vec3 q = floor(vD * 420.0); float s = step(0.9985, h(q)) * smoothstep(0.05, 0.4, y);
        c += night * s * vec3(0.8);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), mat); m.renderOrder = -1;
  return m;
}

export function buildTroy(world, { quality = world.quality } = {}) {
  const scene = world.scene, high = quality === "high";
  const root = new THREE.Group(); root.name = "troy"; scene.add(root);
  const T = (t, r) => { for (const k of ["map", "normalMap", "roughnessMap"]) { t[k].wrapS = t[k].wrapT = THREE.RepeatWrapping; if (r) t[k].repeat.set(...r); } return t; };

  // ---- ground
  const W = 1000, D = 760, sx = high ? 240 : 160, sz = high ? 180 : 120;
  const gg = new THREE.PlaneGeometry(W, D, sx, sz); gg.rotateX(-Math.PI / 2); gg.translate(0, 0, 40);
  const pos = gg.attributes.position, col = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0x9a8a6a), grass = new THREE.Color(0x4a4a32), dirt = new THREE.Color(0x5e4e3c), stone = new THREE.Color(0x6b655a), wet = new THREE.Color(0x4c4436);
  const cc = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = groundAt(x, z); pos.setY(i, y);
    const d = Math.hypot(x - C.x, z - C.z);
    cc.copy(grass).lerp(dirt, 0.35 + 0.35 * Math.sin(x * 0.07) * Math.cos(z * 0.05));
    cc.lerp(sand, smooth(SHORE_Z - 40, SHORE_Z - 15, z)); cc.lerp(wet, smooth(SHORE_Z - 6, SHORE_Z + 2, z));
    if (d < WALL_R + 2) cc.copy(stone).lerp(dirt, 0.4 + 0.3 * Math.sin(x * 0.3 + z * 0.2));
    col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
  }
  gg.setAttribute("color", new THREE.BufferAttribute(col, 3)); gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true; root.add(ground);

  // ---- materials
  const st = T(stoneTexture({ base: [128, 118, 100], dark: [62, 56, 48], moss: [80, 74, 60], seed: 4 }), null);
  const wallMat = new THREE.MeshStandardMaterial({ ...st, roughness: 0.95, side: THREE.DoubleSide });
  const st3 = T(stoneTexture({ base: [128, 118, 100], dark: [62, 56, 48], moss: [80, 74, 60], seed: 4 }), [3, 4]);
  const towerMat = new THREE.MeshStandardMaterial({ ...st3, roughness: 0.95 });
  const st2 = T(stoneTexture({ base: [150, 138, 116], dark: [80, 72, 60], moss: [96, 90, 74], seed: 9 }), [1, 1]);
  const blockMat = new THREE.MeshStandardMaterial({ ...st2, roughness: 0.95 });
  const pl = T(plankTexture({ boards: 8, base: [52, 36, 24], light: [92, 66, 44] }), [1, 1]);
  const doorMat = new THREE.MeshStandardMaterial({ ...pl, roughness: 0.9 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x7c6034, metalness: 0.8, roughness: 0.45 });

  // ---- the wall, with a gap for the gate
  const gapA = (GATE_W + 1) / WALL_R;                  // the opening, in radians
  // three.js lathe angles run from +z toward +x: the gate (toward +z from the centre) sits at phi = 0
  const wall = wallLathe(wallMat, gapA / 2, Math.PI * 2 - gapA, high ? 160 : 110);
  wall.position.copy(C); root.add(wall);
  // crenellations on the outer edge and towers every 30°
  const crenG = new THREE.BoxGeometry(1.6, 1.5, 1.0), nCren = 220;
  const cren = new THREE.InstancedMesh(crenG, blockMat, nCren); let ci = 0;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < nCren; i++) {
    const phi = gapA / 2 + 0.02 + (Math.PI * 2 - gapA - 0.04) * i / nCren;
    P.set(C.x + Math.sin(phi) * (WALL_R + 0.1), WALL_TOP + 0.75, C.z + Math.cos(phi) * (WALL_R + 0.1));
    Q.setFromAxisAngle(UP, phi); M.compose(P, Q, S); if (i % 2 === 0) cren.setMatrixAt(ci++, M);
  }
  cren.count = ci; cren.castShadow = true; root.add(cren);
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(11, WALL_TOP + 5 - 3, 9), towerMat, 12); let ti = 0;
  for (let i = 1; i < 12; i++) {
    const phi = i * Math.PI * 2 / 12;
    P.set(C.x + Math.sin(phi) * (WALL_R + 1.2), 3 + (WALL_TOP + 5 - 3) / 2, C.z + Math.cos(phi) * (WALL_R + 1.2));
    Q.setFromAxisAngle(UP, phi); M.compose(P, Q, S); towers.setMatrixAt(ti++, M);
  }
  towers.count = ti; towers.castShadow = towers.receiveShadow = true; root.add(towers);

  // ---- the gatehouse: two towers either side of the opening, a stone lintel, two wooden doors
  const gate = new THREE.Group(); gate.position.copy(GATE); root.add(gate);
  for (const s of [-1, 1]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(9, WALL_TOP + 7 - 3, 12), towerMat); t.position.set(s * (GATE_W / 2 + 4.5), (3 - PLATEAU) + (WALL_TOP + 7 - 3) / 2, 1); t.castShadow = t.receiveShadow = true; gate.add(t);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(GATE_W + 2, WALL_TOP + 7 - PLATEAU - GATE_H, 12), towerMat); lintel.position.set(0, GATE_H + (WALL_TOP + 7 - PLATEAU - GATE_H) / 2, 1); lintel.castShadow = true; gate.add(lintel);
  const doors = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(s * GATE_W / 2, 0, -1.5); gate.add(hinge);
    const d = new THREE.Mesh(new THREE.BoxGeometry(GATE_W / 2, GATE_H, 0.5), doorMat); d.position.set(-s * GATE_W / 4, GATE_H / 2, 0); d.castShadow = true; hinge.add(d);
    for (const y of [1.4, 4.6, 7.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(GATE_W / 2 - 0.2, 0.35, 0.62), bronze); b.position.set(-s * GATE_W / 4, y, 0); hinge.add(b); }
    doors.push(hinge);
  }
  // the inside of the gate: a paved court where the horse stands
  const court = new THREE.Mesh(new THREE.PlaneGeometry(26, 34), new THREE.MeshStandardMaterial({ ...T(stoneTexture({ base: [120, 112, 98], dark: [70, 64, 56], moss: [80, 76, 64], seed: 13 }), [4, 5]), roughness: 1 }));
  court.rotation.x = -Math.PI / 2; court.position.set(GATE.x, PLATEAU + 0.05, GATE.z - 20); court.receiveShadow = true; root.add(court);

  // ---- the stair up to the wall walk, west of the gate, along the inner face; the trident block at the top
  const stairs = new THREE.InstancedMesh(new THREE.BoxGeometry(2.6, 0.5, 2.0), blockMat, 20);
  const stairA0 = -0.25, stairD = -0.0055;              // angle where the stair starts (west of the gate), climbing away from it
  for (let i = 0; i < 18; i++) {
    const phi = stairA0 + i * stairD, r = WALL_R - 4.6, h = PLATEAU + (i + 1) * (WALL_TOP - PLATEAU) / 18;
    P.set(C.x + Math.sin(phi) * r, h - 0.25 - (h - PLATEAU) / 2 + (h - PLATEAU) / 2, C.z + Math.cos(phi) * r);
    Q.setFromAxisAngle(UP, phi); M.compose(P, Q, new THREE.Vector3(1, (h - PLATEAU) / 0.5, 1)); P.y = PLATEAU + (h - PLATEAU) / 2; M.compose(P, Q, new THREE.Vector3(1, (h - PLATEAU) / 0.5, 1));
    stairs.setMatrixAt(i, M);
  }
  stairs.count = 18; stairs.castShadow = stairs.receiveShadow = true; root.add(stairs);
  const stairTop = new THREE.Vector3(C.x + Math.sin(stairA0 + 17 * stairD) * (WALL_R - 4.6), WALL_TOP, C.z + Math.cos(stairA0 + 17 * stairD) * (WALL_R - 4.6));
  // the parapet block with the trident, on the outer edge of the walk, just beyond the top step
  const tPhi = stairA0 + 17 * stairD - 0.035;
  const tAt = new THREE.Vector3(C.x + Math.sin(tPhi) * (WALL_R + 0.1), WALL_TOP + 0.75, C.z + Math.cos(tPhi) * (WALL_R + 0.1));
  const tt = tridentTexture();
  const tBlock = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.0), [blockMat, blockMat, blockMat, blockMat, new THREE.MeshStandardMaterial({ map: tt, bumpMap: tt, bumpScale: 4, roughness: 0.95 }), blockMat]);
  tBlock.position.copy(tAt); tBlock.rotation.y = tPhi + Math.PI; tBlock.castShadow = true; root.add(tBlock);   // the carved face looks into the city (+z of the box faces the walk)

  // ---- houses: flat-roofed mud-brick and stone, packed on the hill; a clear street from the gate to the citadel
  const nH = high ? 420 : 300;
  const house = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ ...T(stoneTexture({ base: [150, 128, 100], dark: [96, 80, 62], moss: [120, 104, 84], seed: 21 }), [1, 1]), roughness: 1 }), nH);
  const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x6e5e4c, roughness: 1 }), nH);
  const hc = new THREE.Color(); const houseTops = [];
  let hi = 0;
  for (let tries = 0; hi < nH && tries < 6000; tries++) {
    const a = rnd() * Math.PI * 2, r = 12 + Math.sqrt(rnd()) * (WALL_R - 20);
    const x = C.x + Math.sin(a) * r, z = C.z + Math.cos(a) * r;
    if (Math.abs(x - C.x) < 7 && z > C.z) continue;                         // the main street
    if (Math.hypot(x - GATE.x, z - (GATE.z - 20)) < 22) continue;           // the court inside the gate
    if (Math.hypot(x - stairTop.x, z - stairTop.z) < 12) continue;          // the foot of the stair
    const w = 4 + rnd() * 5, d = 4 + rnd() * 5, h = 3 + rnd() * 4 + (r < 35 ? 2 : 0);
    const y = groundAt(x, z);
    Q.setFromAxisAngle(UP, a + (rnd() - 0.5) * 0.3);
    P.set(x, y + h / 2, z); M.compose(P, Q, new THREE.Vector3(w, h, d)); house.setMatrixAt(hi, M);
    hc.setHSL(0.09 + rnd() * 0.03, 0.08 + rnd() * 0.1, 0.5 + rnd() * 0.22); house.setColorAt(hi, hc);
    P.set(x, y + h + 0.15, z); M.compose(P, Q, new THREE.Vector3(w + 0.4, 0.3, d + 0.4)); roofs.setMatrixAt(hi, M);
    houseTops.push(new THREE.Vector3(x, y + h + 0.3, z));
    hi++;
  }
  house.count = roofs.count = hi; house.castShadow = house.receiveShadow = roofs.castShadow = roofs.receiveShadow = true;
  root.add(house, roofs);

  // ---- the citadel: a terrace, the palace (a long hall with a porch of columns) and a temple
  const cit = new THREE.Group(); root.add(cit);
  const terrace = new THREE.Mesh(new THREE.CylinderGeometry(24, 27, 4, 32), towerMat); terrace.position.set(C.x, PLATEAU + 3.5, C.z); terrace.castShadow = terrace.receiveShadow = true; cit.add(terrace);
  const hall = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 26), blockMat); hall.position.set(C.x - 6, PLATEAU + 9.5, C.z - 3); hall.castShadow = hall.receiveShadow = true; cit.add(hall);
  const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(15, 0.8, 27), new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 })); hallRoof.position.set(C.x - 6, PLATEAU + 13.9, C.z - 3); cit.add(hallRoof);
  const colG = new THREE.CylinderGeometry(0.55, 0.65, 7, 12);
  const cols = new THREE.InstancedMesh(colG, new THREE.MeshStandardMaterial({ color: 0x8c3a26, roughness: 0.8 }), 4);
  for (let i = 0; i < 4; i++) { P.set(C.x - 10.5 + i * 3, PLATEAU + 9, C.z + 11.6); M.compose(P, new THREE.Quaternion(), S); cols.setMatrixAt(i, M); }
  cols.castShadow = true; cit.add(cols);
  const temple = new THREE.Mesh(new THREE.BoxGeometry(10, 9, 14), blockMat); temple.position.set(C.x + 11, PLATEAU + 10, C.z + 2); temple.castShadow = true; cit.add(temple);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 6.5, 3, 4, 1), blockMat); ped.rotation.y = Math.PI / 4; ped.scale.set(1, 1, 1.45); ped.position.set(C.x + 11, PLATEAU + 16, C.z + 2); cit.add(ped);

  // ---- the beach: twelve ships drawn up on the sand, bows to the sea. One full ship (his), eleven baked copies.
  const ship0 = buildTrireme({ length: 30, beam: 4.4, depth: 2.4 });
  const fleetMeshes = bakeByMaterial(ship0);
  const ships = [];                                   // one empty Object3D per ship: move these, then call syncFleet()
  const fleet = new THREE.Group(); root.add(fleet);
  const shipXs = [-150, -118, -88, -60, -32, -6, 22, 50, 78, 106, 134, 162];
  shipXs.forEach((x, i) => {
    const s = new THREE.Object3D(); const z = SHORE_Z - 6 + (i % 2) * 3;
    s.position.set(x + 4, groundAt(x, z) + 1.5, z); s.rotation.y = -Math.PI / 2 + (rnd() - 0.5) * 0.08; s.rotation.z = 0.035;  // bow to the sea, a little heeled on the sand
    ships.push(s);
  });
  const fleetInst = fleetMeshes.children.map(m => { const im = new THREE.InstancedMesh(m.geometry, m.material, ships.length); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; fleet.add(im); return im; });
  const syncFleet = () => { ships.forEach((s, i) => { s.updateMatrix(); fleetInst.forEach(im => im.setMatrixAt(i, s.matrix)); }); fleetInst.forEach(im => { im.instanceMatrix.needsUpdate = true; }); };
  syncFleet();
  const hisShip = ships[5];

  // ---- the sea
  const sea = new Sea(world, { color: 0x0b1820, sunDir: new THREE.Vector3(0.2, 0.25, 1), sunColor: 0x8a6a50, size: 6000, distortion: 2.2 });
  sea.water.position.set(0, -0.3, 0);
  world.add(sea);

  // ---- sky, fog, light
  const sky = skyDome(); scene.add(sky);
  scene.fog = new THREE.FogExp2(0x0a0b10, 0.0028);
  const hemi = new THREE.HemisphereLight(0x8090b0, 0x20180e, 0.25); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8aa0d0, 0.6);
  moon.position.set(120, 160, 220); moon.target.position.set(0, 0, -60); moon.castShadow = true;
  moon.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
  Object.assign(moon.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 10, far: 700 }); moon.shadow.bias = -0.0005; moon.shadow.normalBias = 0.6;
  scene.add(moon, moon.target);

  // ---- fires: many small flames on the roofs (no lights of their own), a few big lights over the burning quarters
  const fires = [], fireLights = [], smokes = [];
  const pick = houseTops.filter((p, i) => i % 3 === 0 && p.z < GATE.z - 30).slice(0, high ? 34 : 22);
  for (const p of pick) { const f = new Fire(world, p, { size: 2.2 + rnd() * 2.5, count: high ? 60 : 36, light: false, embers: false }); world.add(f); fires.push(f); }
  for (const [dx, dz, s] of [[-30, -10, 1], [25, 15, 1], [-10, -45, 1.2], [35, -35, 0.9], [-45, 25, 0.9], [10, 40, 0.8]]) {
    const L = new THREE.PointLight(0xff7a30, 0, 75, 1.6); L.position.set(C.x + dx, PLATEAU + 14, C.z + dz); L.userData.k = s; L.userData.seed = rnd() * 50;
    scene.add(L); fireLights.push(L);
  }
  for (const [dx, dz] of [[-25, -20], [20, -30], [5, 20]]) { const s = new Smoke(world, new THREE.Vector3(C.x + dx, PLATEAU + 10, C.z + dz), { count: high ? 70 : 46 }); world.add(s); smokes.push(s); }

  // ---- torches: two on the gatehouse (inside), one on the wall walk at the head of the stair — the warm light the close shots need
  const torches = [];
  for (const at of [new THREE.Vector3(GATE.x - GATE_W / 2 - 1.2, PLATEAU + 5, GATE.z - 5.5), new THREE.Vector3(GATE.x + GATE_W / 2 + 1.2, PLATEAU + 5, GATE.z - 5.5),
                    new THREE.Vector3(C.x + Math.sin(tPhi + 0.05) * (WALL_R - 2.5), WALL_TOP + 1.6, C.z + Math.cos(tPhi + 0.05) * (WALL_R - 2.5))]) {
    const f = new Fire(world, at, { size: 0.55, count: 40, light: true, embers: true }); world.add(f); torches.push(f);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 6), doorMat); pole.position.copy(at).add(new THREE.Vector3(0, -0.8, 0)); root.add(pole);
  }

  // ---- mood: night (burning) ↔ dawn (grey, smoking, fires low)
  const set = {
    root, ground, wall, gate, doors, syncFleet, court, stairs, stairTop, trident: tBlock, houses: house, ships, hisShip, fleet, sea, sky, moon, hemi, fires, fireLights, smokes, torches, houseTops,
    // a point on the stair: k = 0 at its foot, 1 at the top (on the middle of the treads)
    // (each tread is 2.6 m wide along the wall but they sit only 0.4 m apart, so the surface underfoot is the top of the
    //  tread about 3 steps ahead — checked by raycasting the treads; walking at the nominal height sank him chest-deep)
    stairAt(k) { const phi = stairA0 + k * 17 * stairD, r = WALL_R - 4.6; return new THREE.Vector3(C.x + Math.sin(phi) * r, PLATEAU + Math.min(18, k * 17 + 3.6) * (WALL_TOP - PLATEAU) / 18, C.z + Math.cos(phi) * r); },
    tridentPhi: tPhi, WALL_R,
    // the angle of the open gap in the parapet (between two crenels) nearest to phi: a place to stand and be seen
    crenelGapNear(phi) {
      phi = ((phi % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);   // the crenels are laid out from 0 to 2π
      let best = null;
      for (let i = 1; i < nCren; i += 2) { const p = gapA / 2 + 0.02 + (Math.PI * 2 - gapA - 0.04) * i / nCren; if (best === null || Math.abs(p - phi) < Math.abs(best - phi)) best = p; }
      return best;
    },
    C, GATE, WALL_TOP, PLATEAU, SHORE_Z, groundAt,
    mood: "night", burn: 1,
    // open the great gate: 0 shut → 1 wide open (the doors swing inward, into the city)
    // open the great gate: 0 shut → 1 wide open. out = true swings the doors outward (pushed open from inside, toward the plain)
    openGate(k, out = false) { doors.forEach((h, i) => { h.rotation.y = (i === 0 ? 1 : -1) * (out ? -1 : 1) * k * 1.7; }); },
    // the city burning: 0 not yet → 1 all of it. The fire spreads outward from `from` (where the first torch landed)
    setBurn(k, from = this._burnFrom || C) {
      this._burnFrom = from; this.burn = k;
      const R = 125;
      fires.forEach(f => { const d = Math.hypot(f.origin.x - from.x, f.origin.z - from.z); f.level = THREE.MathUtils.clamp((k * R - d) / 14, 0, 1); });
      const glow = THREE.MathUtils.clamp(k * 1.2, 0, 1);
      sky.material.uniforms.glow.value = glow;
      const dawn = this.mood === "dawn";   // at dawn the fires are out but the city still smokes
      smokes.forEach(s => { s.points.visible = dawn || k > 0.02; s.points.material.opacity = dawn ? 0.3 : 0.22 * Math.min(1, k * 1.5 + 0.2); });
    },
    setMood(m, { burn } = {}) {
      this.mood = m; const night = m === "night";
      sky.material.uniforms.night.value = night ? 1 : 0;
      scene.fog.color.set(night ? 0x0a0b10 : 0x8a8a88); scene.fog.density = night ? 0.0017 : 0.0019;
      hemi.color.set(night ? 0x8090b0 : 0xb8c0c8); hemi.groundColor.set(night ? 0x20180e : 0x5a4e40); hemi.intensity = night ? 0.55 : 0.9;
      moon.color.set(night ? 0x8aa0d0 : 0xd8c8b0); moon.intensity = night ? 1.8 : 1.3;
      moon.position.set(night ? 120 : -260, night ? 160 : 90, night ? 220 : 60);
      sea.water.material.uniforms.sunColor.value.set(night ? 0x8a6a50 : 0x5a5450);
      sea.water.material.uniforms.waterColor.value.set(night ? 0x0b1820 : 0x1c262a);
      torches.forEach(f => f.level = night ? 1 : 0);
      smokes.forEach(s => s.points.material.color.set(night ? 0x3a3634 : 0x6a6662));
      this.setBurn(burn ?? (night ? 1 : 0));
      world.renderer.toneMappingExposure = night ? 1.35 : 1.05;
    },
    update(dt, time) {
      for (const L of fireLights) { const t = time + L.userData.seed; L.intensity = this.burn * 260 * L.userData.k * (0.8 + 0.12 * Math.sin(t * 7.1) + 0.08 * Math.sin(t * 17.3)); }
    },
    dispose() { scene.remove(root, sky, moon, moon.target, hemi, ...fireLights); }
  };
  world.add(set);
  set.setMood("night");
  return set;
}
