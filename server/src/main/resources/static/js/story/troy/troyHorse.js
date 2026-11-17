// troyHorse.js — the wooden horse, built in code (no model file).
// About 11 m to the ears, on a wheeled sledge. Plank body, square-cut legs, rope mane and tail, bronze bands.
// The belly hatch is a separate piece (horse.hatch) that swings on its hinge for the film.
// Units: metres. The horse faces +x; its feet stand on y = 0.
import * as THREE from "three";
import { plankTexture } from "../../engine/textures.js";
import { bakeByMaterial } from "./bake.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// a box stretched between two points (a leg, a beam), thickness w × d
function strut(a, b, w, d, mat, taper = 1) {
  const len = a.distanceTo(b);
  const g = new THREE.BoxGeometry(w, len, d);
  if (taper !== 1) {                                 // narrower at b
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) if (p.getY(i) > 0) { p.setX(i, p.getX(i) * taper); p.setZ(i, p.getZ(i) * taper); }
    g.computeVertexNormals();
  }
  const m = new THREE.Mesh(g, mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  return m;
}

export function buildHorse({ quality = "high" } = {}) {
  const g = new THREE.Group(); g.name = "horse:procedural";
  const T = (o) => { const t = plankTexture(o); for (const k of ["map", "normalMap", "roughnessMap"]) { t[k].wrapS = t[k].wrapT = THREE.RepeatWrapping; } return t; };
  const pk = T({ boards: 9, base: [92, 64, 40], light: [150, 112, 72], seed: 11 });
  const plank = new THREE.MeshStandardMaterial({ ...pk, roughness: 0.9 });
  for (const k of ["map", "normalMap", "roughnessMap"]) pk[k].repeat.set(3, 4);
  const pk2 = T({ boards: 5, base: [70, 48, 32], light: [118, 86, 56], seed: 23 });
  const timber = new THREE.MeshStandardMaterial({ ...pk2, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 1 });
  const rope = new THREE.MeshStandardMaterial({ color: 0x8c7650, roughness: 1 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8a6a35, metalness: 0.8, roughness: 0.4 });
  const seg = quality === "high" ? 28 : 18;

  // --- sledge on wheels
  const deck = new THREE.Mesh(new THREE.BoxGeometry(11, 0.7, 4.6), timber); deck.position.set(0, 1.45, 0); g.add(deck);
  for (const x of [-4.4, 0, 4.4]) for (const z of [-2.55, 2.55]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.45, seg), timber); w.rotation.x = Math.PI / 2; w.position.set(x, 1.0, z); g.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 10), bronze); hub.rotation.x = Math.PI / 2; hub.position.set(x, 1.0, z); g.add(hub);
  }
  for (const x of [-4.4, 0, 4.4]) { const ax = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 5.6, 8), dark); ax.rotation.x = Math.PI / 2; ax.position.set(x, 1.0, 0); g.add(ax); }
  const top = 1.8;                                     // deck top

  // --- legs: thigh + shin + hoof, square-cut timber
  const legs = [[3.1, 1.15], [3.1, -1.15], [-3.0, 1.15], [-3.0, -1.15]];
  for (const [x, z] of legs) {
    const hip = V(x, 6.3, z), knee = V(x + (x > 0 ? 0.25 : -0.35), 3.9, z), hoof = V(x + (x > 0 ? 0.05 : -0.1), top + 0.55, z);
    g.add(strut(hip, knee, 1.25, 1.1, timber, 0.75));
    g.add(strut(knee, hoof, 0.8, 0.75, timber, 0.85));
    const kn = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.95), timber); kn.position.copy(knee); g.add(kn);
    const h = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.95), dark); h.position.set(hoof.x, top + 0.28, z); g.add(h);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.14, 0.83), bronze); band.position.set(hoof.x, top + 0.7, z); g.add(band);
  }

  // --- body: a barrel of planks along x, a little taller than wide, with domed chest and rump
  const R = 2.35, L = 6.6, cy = 7.2;
  const bodyGeo = new THREE.CylinderGeometry(R, R, L, seg, 4, true);
  const body = new THREE.Mesh(bodyGeo, plank); body.rotation.z = Math.PI / 2; body.scale.set(1.12, 1, 1); body.position.set(0, cy, 0); g.add(body);
  for (const s of [1, -1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R, seg, 10, 0, Math.PI * 2, 0, Math.PI / 2), plank);
    cap.rotation.z = -s * Math.PI / 2; cap.scale.set(1.12, s > 0 ? 0.55 : 0.45, 1); cap.position.set(s * L / 2, cy, 0); g.add(cap);
  }
  // bronze bands round the barrel, and a row of nail heads along each
  for (const x of [-2.4, 0, 2.4]) {
    const b = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.09, 6, seg), bronze); b.rotation.y = Math.PI / 2; b.scale.set(1, 1.12, 1); b.position.set(x, cy, 0); g.add(b);
  }
  // a spine beam on top
  g.add(strut(V(-L / 2 - 0.6, cy + R * 1.12 - 0.05, 0), V(L / 2 + 0.3, cy + R * 1.12 - 0.05, 0), 0.5, 0.6, timber));

  // --- neck: rises from the chest at about 55°, tapering
  const n0 = V(L / 2 - 0.4, cy + 0.9, 0), n1 = V(L / 2 + 2.2, cy + 4.6, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.7, n0.distanceTo(n1), seg, 3), plank);
  neck.scale.set(1, 1, 0.82);
  neck.position.copy(n0).add(n1).multiplyScalar(0.5); neck.quaternion.setFromUnitVectors(V(0, 1, 0), n1.clone().sub(n0).normalize()); g.add(neck);
  // mane: a row of short planks standing on the back of the neck
  for (let i = 0; i < 9; i++) {
    const k = i / 8, p = n0.clone().lerp(n1, 0.05 + k * 0.95).add(V(-0.95 + k * 0.3, 0.55 - k * 0.2, 0));
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1 - k * 0.3, 0.16), rope); f.position.copy(p); f.rotation.z = 0.6; g.add(f);
  }

  // --- head: a long box, nose down, with a narrower muzzle, ears and eyes
  const head = new THREE.Group(); head.position.set(n1.x + 0.5, n1.y + 0.35, 0); head.rotation.z = -0.55; g.add(head);
  const skull = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 1.35), plank); skull.position.set(0.6, 0, 0); head.add(skull);
  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.05, 1.05), plank); muzzle.position.set(2.3, -0.2, 0); head.add(muzzle);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.95), dark); nose.position.set(3.08, -0.2, 0); head.add(nose);
  for (const s of [1, -1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.95, 4), plank); ear.position.set(-0.35, 1.05, s * 0.42); ear.rotation.z = 0.35; head.add(ear);
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12), dark); eye.rotation.x = Math.PI / 2; eye.position.set(0.9, 0.25, s * 0.69); head.add(eye);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.05, 6, 14), bronze); ring.position.set(0.9, 0.25, s * 0.71); head.add(ring);
  }
  // bridle: bronze straps round the muzzle and over the head
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.12, 1.12), bronze); strap.position.set(2.0, -0.2, 0); head.add(strap);
  const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.56, 1.41), bronze); strap2.position.set(-0.2, 0, 0); head.add(strap2);

  // --- tail: rope strands from the rump
  for (let i = 0; i < 6; i++) {
    const a = V(-L / 2 - 1.0, cy + 0.8 - i * 0.05, (i - 2.5) * 0.14), b = V(-L / 2 - 1.9 - (i % 2) * 0.3, cy - 3.2 + (i % 3) * 0.4, (i - 2.5) * 0.3);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, a.distanceTo(b), 6), rope);
    t.position.copy(a).add(b).multiplyScalar(0.5); t.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); g.add(t);
  }

  // --- the belly hatch: dark seam round it, the door itself kept separate so it can swing open
  const hy = cy - R * 1.12 + 0.12;
  for (const [x, z, w, d] of [[0, 0.95, 2.4, 0.12], [0, -0.95, 2.4, 0.12], [1.2, 0, 0.12, 2.0], [-1.2, 0, 0.12, 2.0]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), dark); s.position.set(x, hy - 0.06, z); g.add(s);
  }
  const hinge = new THREE.Group(); hinge.position.set(-1.15, hy - 0.1, 0); g.add(hinge);
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.14, 1.8), timber); door.position.set(1.15, -0.02, 0); hinge.add(door);
  const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.18), bronze); bolt.position.set(2.1, -0.1, 0); hinge.add(bolt);
  hinge.name = "hatch";

  // one mesh per material, except the hatch
  const baked = bakeByMaterial(g, { keep: [hinge] });
  baked.name = "horse:procedural";
  baked.userData.hatch = baked.getObjectByName("hatch");
  baked.userData.height = 11.4;
  baked.userData.materials = [plank, timber, dark, rope, bronze];
  return baked;
}
