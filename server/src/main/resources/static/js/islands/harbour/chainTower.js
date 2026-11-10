// chainTower.js — the finale's set pieces.
//  * The Chain Tower: Antiphates' own stack, five giant crates standing in the harbour, painted
//    [0]..[4] with TOP on the last one. On top sits the winch that holds the harbour chain.
//  * The harbour chain: a line of bronze links from the winch down across the water to an anchor
//    on the east cliff, right across the ship's way out. snap() cuts it at the winch.
//  * A boulder (for the giant to throw) and the bronze axe (for Odysseus).
import * as THREE from "three";
import { makeStackCrate } from "./harbourScene.js";
import { FONTS, sprayText } from "./dsProps.js";

const bronze = () => new THREE.MeshStandardMaterial({ color: 0xa8743a, metalness: 0.85, roughness: 0.38 });

function paintedPlane(text, sub, w, h, color = "#f0c33c") {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  sprayText(g, text, 256, sub ? 100 : 128, `170px ${FONTS.stencil}`, color, { passes: 5, scatter: 3 });
  if (sub) sprayText(g, sub, 256, 214, `52px ${FONTS.stencil}`, "#e8d7b0", { passes: 3 });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 }));
}

export class ChainTower {
  // x, z: where it stands in the water; anchor: the far end of the chain on the cliff
  constructor(world, crateModel, { x = -6, z = -52, base = -1.2, levels = 5, anchor = new THREE.Vector3(44, 6, -52), facing = 0 } = {}) {
    this.world = world;
    const g = this.group = new THREE.Group();
    g.position.set(x, base, z); g.rotation.y = facing;
    const S = 10;                                     // a stack crate is 0.6 x 0.5 x 0.45 m; these are ten times that
    const H = 0.5 * S;
    this.crates = [];
    for (let i = 0; i < levels; i++) {
      const c = makeStackCrate(crateModel, 0);
      c.traverse(o => { if (o.isMesh && o.geometry.type === "PlaneGeometry") o.visible = false; });   // its own small label goes
      c.scale.multiplyScalar(S);
      c.position.set((i % 2 ? 0.3 : -0.25), i * H, 0);
      c.rotation.y = (i % 3 - 1) * 0.05;
      c.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.add(c); this.crates.push(c);
      const top = i === levels - 1;
      const lab = paintedPlane("[" + i + "]", top ? "TOP" : null, 3.2, 1.6, top ? "#f0c33c" : "#efe1c2");
      lab.position.set(c.position.x, i * H + H * 0.5, 0.45 * S / 2 + 0.06);
      g.add(lab);
    }
    // a rock footing in the water
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(6, 1), new THREE.MeshStandardMaterial({ color: 0x2f302e, roughness: 1, flatShading: true }));
    rock.scale.set(1.2, 0.35, 1.0); rock.position.y = -0.8; g.add(rock);
    this.topY = base + levels * H;                    // the flat top he lands on
    // ---- the winch: a bronze drum on two wooden frames, chain wound round it
    const wood = new THREE.MeshStandardMaterial({ color: 0x4b3424, roughness: 0.9 });
    const winch = this.winch = new THREE.Group();
    winch.position.set(0.6, levels * H, -0.4);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.6, 24), bronze());
    drum.rotation.z = Math.PI / 2; drum.position.y = 1.5; winch.add(drum);
    for (let k = -4; k <= 4; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.1, 6, 20), bronze()); ring.rotation.y = Math.PI / 2; ring.position.set(k * 0.28, 1.5, 0); winch.add(ring); }
    for (const sx of [-1.55, 1.55]) {
      for (const sz of [-0.7, 0.7]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.9, 0.22), wood); leg.position.set(sx, 0.85, sz * 0.6); leg.rotation.x = sz * 0.35; winch.add(leg); }
    }
    const crank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), wood); crank.position.set(-1.85, 1.0, 0); winch.add(crank);
    winch.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.add(winch);
    world.scene.add(g);
    g.updateMatrixWorld(true);
    // where the chain leaves the drum, and where he stands to strike it
    // the chain comes off the front of the drum, runs taut across the top at knee height to the edge, then down
    this.chainStart = new THREE.Vector3(1.0, 0.55, 0.95).add(winch.position).applyMatrix4(g.matrixWorld);
    this.chainEdge = new THREE.Vector3(3.1, levels * H + 0.5, 0.55 + winch.position.z + 0.4).applyMatrix4(g.matrixWorld);
    // the stretch across the top is where the axe can reach it
    this.cutPoint = new THREE.Vector3().lerpVectors(this.chainStart, this.chainEdge, 0.5);
    this.strikeSpot = new THREE.Vector3(0.6, levels * H, 2.6).applyMatrix4(g.matrixWorld);
    this.landSpot = new THREE.Vector3(-1.0, levels * H, 3.2).applyMatrix4(g.matrixWorld);
    this.anchor = anchor.clone();
    // ---- the anchor ring on the cliff
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 3, 10), new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 1, flatShading: true }));
    post.position.copy(anchor).add(new THREE.Vector3(0.8, -1, 0)); world.scene.add(post);
    // ---- the chain itself
    this.linkCount = 56;
    const geo = new THREE.TorusGeometry(0.6, 0.18, 6, 12);
    this.links = new THREE.InstancedMesh(geo, bronze(), this.linkCount);
    this.links.castShadow = true; this.links.frustumCulled = false;
    world.scene.add(this.links);
    this.a = this.chainStart.clone();                 // the winch end (moves when the chain is cut)
    this.sag = 13.5;
    this.layChain();
    this.snapped = false; this.pieces = [];
    world.add(this);
  }
  // a point along the chain, u from 0 (winch) to 1 (anchor): a straight line pulled down into a curve
  // (until it is cut, the first few links run straight across the top of the tower to its edge)
  point(u, out = new THREE.Vector3()) {
    const U0 = 0.06;
    if (!this.snapped && u < U0) return out.lerpVectors(this.a, this.chainEdge, u / U0);
    const from = this.snapped ? this.a : this.chainEdge, v = this.snapped ? u : (u - U0) / (1 - U0);
    out.lerpVectors(from, this.anchor, v);
    out.y -= this.sag * 4 * v * (1 - v);
    return out;
  }
  layChain() {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), p2 = new THREE.Vector3(), t = new THREE.Vector3();
    const twist = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), one = new THREE.Vector3(1, 1, 1);
    for (let i = 0; i < this.linkCount; i++) {
      const u = i / (this.linkCount - 1);
      this.point(u, p); this.point(Math.min(1, u + 0.01), p2);
      t.subVectors(p2, p).normalize();
      q.setFromUnitVectors(X, t);
      twist.setFromAxisAngle(X, i % 2 ? Math.PI / 2 : 0);   // every other link turned a quarter, like a real chain
      q.multiply(twist);
      m.compose(p, q, one);
      this.links.setMatrixAt(i, m);
    }
    this.links.instanceMatrix.needsUpdate = true;
  }
  // the opening: the chain lies slack under the water, then the winch hauls it up taut
  lower() { this.sag = 34; this.a.copy(this.chainStart); this.layChain(); this.snapped = false; this.fall = null; }
  raise(seconds = 2.4) { this.lift = { t: 0, d: seconds, from: this.sag }; }
  // the second boulder: the winch is smashed to pieces
  smash() {
    const parts = [...this.winch.children];
    this.winch.updateMatrixWorld(true);
    for (const p of parts) {
      const wp = new THREE.Vector3(); p.getWorldPosition(wp);
      const wq = new THREE.Quaternion(); p.getWorldQuaternion(wq);
      this.winch.remove(p); this.world.scene.add(p); p.position.copy(wp); p.quaternion.copy(wq);
      p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 16, 6 + Math.random() * 10, (Math.random() - 0.3) * 14);
      p.userData.w = new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      this.pieces.push(p);
    }
    // the top crate is knocked askew
    const top = this.crates[this.crates.length - 1];
    this.tilt = { t: 0, c: top };
  }
  // cut at the winch: the loose end whips down into the water; a few broken links fly off
  // `at`: where the blade bit (the broken links fly from there)
  snap(at = this.chainStart) {
    if (this.snapped) return;
    this.snapped = true;
    this.a.copy(at);
    this.fall = { t: 0, from: this.a.clone() };
    for (let k = 0; k < 8; k++) {
      const piece = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 6, 12), bronze());
      piece.position.copy(at);
      piece.userData.v = new THREE.Vector3((Math.random() - 0.3) * 10, 6 + Math.random() * 8, (Math.random() - 0.2) * 10);
      piece.userData.w = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      this.world.scene.add(piece); this.pieces.push(piece);
    }
  }
  update(dt) {
    if (this.lift) {
      const L = this.lift; L.t += dt;
      const k = Math.min(1, L.t / L.d), e = 1 - Math.pow(1 - k, 3);
      this.sag = L.from + (13.5 - L.from) * e + Math.sin(k * 30) * (1 - k) * 0.6;   // it shudders as it comes up
      this.layChain();
      if (k >= 1) { this.sag = 13.5; this.layChain(); this.lift = null; }
    }
    if (this.tilt) {
      const T = this.tilt; T.t += dt; const k = Math.min(1, T.t / 0.6);
      T.c.rotation.z = -0.22 * Math.sin(k * Math.PI / 2); T.c.position.x = 0.3 + 1.2 * k;
      if (k >= 1) this.tilt = null;
    }
    if (this.fall) {
      const f = this.fall; f.t += dt;
      const k = Math.min(1, f.t / 1.6), e = k * k;
      // the loose end swings out over the water and drops in; the chain goes slack
      this.a.set(f.from.x + 14 * Math.sin(k * Math.PI / 2), f.from.y - (f.from.y + 3) * e, f.from.z + 2 * k);
      this.sag = 13.5 * (1 - k) + 9 * k;                  // slack: it sinks under the water, out of the ship's way
      this.layChain();
      if (k >= 1) this.fall = null;
    }
    for (const p of this.pieces) {
      if (p.position.y < -3) continue;
      p.userData.v.y -= 22 * dt;
      p.position.addScaledVector(p.userData.v, dt);
      p.rotation.x += p.userData.w.x * dt; p.rotation.y += p.userData.w.y * dt;
    }
  }
}

// a rough boulder the size of a cart
export function makeBoulder(radius = 2.0) {
  const geo = new THREE.IcosahedronGeometry(radius, 2), pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 1.7) * Math.sin(v.y * 2.1) * Math.sin(v.z * 1.3);
    v.multiplyScalar(1 + n * 0.18 + (Math.sin(i * 12.9898) * 0.5) * 0.06);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4d4943, roughness: 1, flatShading: true }));
  m.castShadow = true;
  return m;
}

// the bronze axe: an ash handle and a crescent blade (built in metres; attach with attachToHand)
export function makeAxe() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.95, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.8 }));
  handle.position.y = 0.3; g.add(handle);
  const s = new THREE.Shape();
  s.moveTo(0, -0.07); s.quadraticCurveTo(0.16, -0.16, 0.24, -0.2); s.quadraticCurveTo(0.3, 0, 0.24, 0.2); s.quadraticCurveTo(0.16, 0.16, 0, 0.07); s.lineTo(0, -0.07);
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 1 }), bronze());
  blade.position.set(0.02, 0.68, -0.0125); g.add(blade);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.36, 0.03), new THREE.MeshStandardMaterial({ color: 0xffe2a8, metalness: 1, roughness: 0.15, emissive: 0x6a4010, emissiveIntensity: 0.4 }));
  edge.position.set(0.26, 0.68, 0); g.add(edge);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
