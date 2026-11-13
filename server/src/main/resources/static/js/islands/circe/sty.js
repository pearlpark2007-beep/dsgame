// sty.js — the sty on Circe's island (the island itself is helios.js): the crew turned into pigs. Each pig IS a node of a linked list, seen from above:
//   • its back is the node's box: the tag (data) painted big, its address small under it,
//   • the little crate on its rump is the node's next field: the rope to the NEXT pig leaves from
//     there and ends in an arrow at that pig's nose; a loose rope end is NULL,
//   • in front of every pig stands its plaque, [ address | data | next ], so every field of every node
//     is readable at all times (next shows the address it holds, or NULL),
//   • the pigs stand in the order of the rope, left to right, like the board under the picture:
//     row 0 is the rope from the gate (head); row 1, nearer the camera, is anything off that rope.
//     Arrows on row 0 only ever point right, so they never cross. When the rope changes, the pigs
//     walk to their new places.
// The sty gate is the head pointer: a gold rope from the gate to the first pig. Every other pointer
// (p, prev, cur, found...) is a coloured banner over the pig it points at, or over the NULL stone.
//
// The scene draws FRAMES (the same ones the list board draws, see listBoard.js): show(frame) jumps to
// one, act(step, frame) animates the change to it. So stepping back is free.
import * as THREE from "three";
import { NULL, hex, walkFrom, lostNodes, layoutFrame, HEAD_COLOR } from "../../learn/listBoard.js";

// the grid the pigs stand on
const X0 = -7.5, SP = 3.4, ROW0 = -1.0, ROW1 = 3.2;
export const GATE = new THREE.Vector3(X0 - 2.7, 0, ROW0);
export const PIT = new THREE.Vector3(X0 + 9 * SP, 0, ROW0);      // where the NULL stone rests when the rope is long
const cell = (c, r) => new THREE.Vector3(X0 + c * SP, 0, r ? ROW1 : ROW0);

// ---------- small canvas helpers
function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function labelSprite(draw, w, h, scale) {
  const tex = canvasTexture(w, h, draw);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
  s.scale.set(scale * w / h, scale, 1); s.renderOrder = 10;
  return s;
}
// the node's box, painted on the pig's back: the data big, the address small; a coloured rim when it is read or written
function backTexture(value, address, rim = null) {
  return canvasTexture(256, 192, (g, w, h) => {
    g.fillStyle = "#f3e6cf"; g.fillRect(0, 0, w, h);
    g.strokeStyle = rim || "#5a3a22"; g.lineWidth = rim ? 22 : 10; g.strokeRect(0, 0, w, h);
    g.fillStyle = "#2a160c"; g.font = "bold 104px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(String(value), w / 2, h * 0.44);
    g.fillStyle = "#7a5a3a"; g.font = "bold 30px 'Courier Prime', monospace"; g.fillText(hex(address), w / 2, h * 0.84);
  });
}
// the node's plaque, standing in front of the pig so nothing about the node is ever hidden:
//   [ address | data | next ]  — next shows the address it holds, or NULL.
// rim: a colour while the node is read/written; hot: "next" lit while that rope is being re-tied;
// dangling: next holds an address that is no longer a node; lost: nothing can reach this pig.
function plaqueTexture({ address, data, next, rim = null, hot = false, dangling = false, lost = false }) {
  return canvasTexture(600, 200, (g, w, h) => {
    const A = 176, D = 360;
    g.fillStyle = lost ? "#d9d4cc" : "#fbf5e6"; g.fillRect(0, 0, w, h);
    // address cell: black, brass text
    g.fillStyle = "#141008"; g.fillRect(0, 0, A, h);
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#e0b83a"; g.font = "bold 28px 'Courier Prime', 'Courier New', monospace"; g.fillText("address", A / 2, 34);
    g.fillStyle = "#ffd21a"; g.strokeStyle = "#ffd21a"; g.lineWidth = 3; g.font = "bold 62px 'Courier Prime', 'Courier New', monospace"; g.fillText(hex(address), A / 2, 126, A - 12); g.strokeText(hex(address), A / 2, 126, A - 12);
    // data cell
    g.fillStyle = "#4a3c2a"; g.font = "bold 28px 'Courier Prime', 'Courier New', monospace"; g.fillText("data", (A + D) / 2, 34);
    g.fillStyle = "#141008"; g.font = "bold 124px Anton, Impact, 'Arial Black', sans-serif"; g.fillText(String(data), (A + D) / 2, 130, D - A - 14);
    // next cell
    if (hot) { g.fillStyle = "#ffb070"; g.fillRect(D, 0, w - D, h); }
    g.fillStyle = "#4a3c2a"; g.font = "bold 28px 'Courier Prime', 'Courier New', monospace"; g.fillText("next", (D + w) / 2, 34);
    const isNull = next === NULL;
    g.fillStyle = g.strokeStyle = isNull || dangling ? "#b0140c" : "#0a1a8c"; g.lineWidth = 4; g.font = "bold 76px 'Courier Prime', 'Courier New', monospace";
    const nt = isNull ? "NULL" : hex(next) + (dangling ? "✗" : "");
    g.fillText(nt, (D + w) / 2, 126, w - D - 14); g.strokeText(nt, (D + w) / 2, 126, w - D - 14);
    // cell walls and the rim
    g.fillStyle = "#141008"; g.fillRect(D - 3, 0, 6, h);
    g.strokeStyle = rim || "#141008"; g.lineWidth = rim ? 20 : 8; g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, w - g.lineWidth, h - g.lineWidth);
    if (lost) {
      // the labels row becomes a red band: every value stays readable underneath
      g.fillStyle = "#c8261e"; g.fillRect(0, 0, w, 66);
      g.fillStyle = "#fff4cf"; g.font = "bold 40px 'Courier Prime', 'Courier New', monospace"; g.fillText("UNREACHABLE · LOST", w / 2, 36);
      g.strokeStyle = "#c8261e"; g.lineWidth = 12; g.setLineDash([26, 14]); g.strokeRect(6, 6, w - 12, h - 12); g.setLineDash([]);
    }
  });
}
const PLAQUE_H = 1.08, PLAQUE_AT = new THREE.Vector3(0, 0.66, 1.35);

// the next field's crate lid: a dot (it points somewhere) or NULL
const lidTex = {};
function lidTexture(isNull) {
  return (lidTex[isNull] ||= canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = "#3a2614"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c9a227"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = isNull ? "#cfc6cc" : "#f2c230"; g.textAlign = "center"; g.textBaseline = "middle";
    if (isNull) { g.font = "bold 34px 'Courier Prime', monospace"; g.fillText("NULL", w / 2, h / 2 + 2); }
    else { g.beginPath(); g.arc(w / 2, h / 2, 18, 0, Math.PI * 2); g.fill(); }
  }));
}
function bannerSprite(names, colors) {
  const w = 128 + names.join("").length * 30;
  return labelSprite((g, W, H) => {
    let x = 8; g.font = "bold 58px 'Courier Prime', monospace"; g.textBaseline = "middle";
    names.forEach((n, i) => {
      const tw = g.measureText(n).width + 30;
      g.fillStyle = colors[i]; g.beginPath(); g.roundRect(x, 8, tw, H - 40, 12); g.fill();
      g.fillStyle = "#120c06"; g.fillText(n, x + 15, 8 + (H - 40) / 2 + 2);
      x += tw + 10;
    });
    g.fillStyle = colors[0]; g.beginPath(); g.moveTo(W / 2 - 18, H - 32); g.lineTo(W / 2 + 18, H - 32); g.lineTo(W / 2, H - 4); g.fill();
  }, w, 120, 0.7);
}

// ---------- a pig that is a node: nose to the left (where the rope comes in), next-crate on its rump
const PINK = new THREE.Color(0xe7a39b), GREY = new THREE.Color(0x6d6460);
function makePig(value, address) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: PINK.clone(), roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x5a2f2a, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 0.86), mat); body.position.y = 0.62; body.castShadow = true; g.add(body);
  // the node's box on its back
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.06, 0.76), new THREE.MeshStandardMaterial({ map: backTexture(value, address), roughness: 0.9 }));
  back.rotation.x = -Math.PI / 2; back.position.set(0, 0.935, 0); g.add(back);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.52), mat); head.position.set(-0.8, 0.74, 0); head.castShadow = true; g.add(head);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.12, 12), mat); snout.rotation.z = Math.PI / 2; snout.position.set(-1.08, 0.68, 0); g.add(snout);
  for (const z of [-0.05, 0.05]) { const n = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), dark); n.position.set(-1.14, 0.68, z); g.add(n); }
  for (const z of [-0.16, 0.16]) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), mat); ear.position.set(-0.74, 1.03, z); ear.rotation.z = 0.4; g.add(ear);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), dark); eye.position.set(-1.04, 0.84, z * 0.9); g.add(eye);
  }
  const legs = [];
  for (const [x, z] of [[0.42, 0.26], [0.42, -0.26], [-0.42, 0.26], [-0.42, -0.26]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.36, 0.17), mat); leg.position.set(x, 0.18, z); leg.castShadow = true; g.add(leg); legs.push(leg);
  }
  // the next field: a little crate on the rump, its lid a dot or NULL
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.5), new THREE.MeshStandardMaterial({ color: 0x5a3c22, roughness: 0.85 }));
  crate.position.set(0.86, 0.72, 0); crate.castShadow = true; g.add(crate);
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.48), new THREE.MeshStandardMaterial({ map: lidTexture(false), roughness: 0.9 }));
  lid.rotation.x = -Math.PI / 2; lid.rotation.z = Math.PI / 2; lid.position.set(0.86, 0.895, 0); g.add(lid);
  g.userData = { mat, legs, back, lid };
  g.scale.setScalar(1.18);              // a touch bigger, so the numbers read from above
  return g;
}
// a man again (the finale): a plain figure in a tunic
// a crewman, freed: rounded limbs, a flared tunic with a belt, hair and a beard. Each one a little different.
const MEN = [0, 0];
function makeMan() {
  const n = MEN[0]++;
  const g = new THREE.Group();
  const tunicC = [0x9a3a22, 0x2f4f7a, 0x6a5a2a, 0x7a2a4a, 0x3a6a4a][n % 5], hairC = [0x2a1a10, 0x4a2a14, 0x1a1410, 0x6a4a2a][n % 4];
  const skin = new THREE.MeshStandardMaterial({ color: [0xc89a78, 0xb07a58, 0xd8ad88, 0x9a6a4a][n % 4], roughness: 0.75 });
  const tunic = new THREE.MeshStandardMaterial({ color: tunicC, roughness: 0.9 });
  const hair = new THREE.MeshStandardMaterial({ color: hairC, roughness: 1 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3a2414, roughness: 0.8 });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
  // legs and sandals
  for (const x of [-0.11, 0.11]) { add(new THREE.CapsuleGeometry(0.075, 0.5, 4, 8), skin, x, 0.36, 0); add(new THREE.BoxGeometry(0.13, 0.05, 0.24), leather, x, 0.025, 0.04); }
  // the tunic: wider at the hem, a belt at the waist
  const pts = [[0.0, 0.62], [0.30, 0.62], [0.25, 0.9], [0.22, 1.05], [0.27, 1.3], [0.29, 1.42], [0.12, 1.5], [0.0, 1.5]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(pts, 14), tunic, 0, 0, 0);
  add(new THREE.CylinderGeometry(0.235, 0.235, 0.07, 14), leather, 0, 1.0, 0);
  // arms, a little away from the body, hands
  for (const sx of [-1, 1]) { add(new THREE.CapsuleGeometry(0.065, 0.48, 4, 8), skin, sx * 0.34, 1.12, 0, 0, sx * 0.12); add(new THREE.SphereGeometry(0.075, 8, 6), skin, sx * 0.38, 0.8, 0); }
  // neck, head, hair, beard
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 8), skin, 0, 1.56, 0);
  add(new THREE.SphereGeometry(0.16, 14, 12), skin, 0, 1.74, 0).scale.set(0.95, 1.1, 1);
  add(new THREE.SphereGeometry(0.168, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 1.76, -0.015);
  add(new THREE.ConeGeometry(0.11, 0.2, 10), hair, 0, 1.6, 0.07, Math.PI, 0).scale.set(1, 1, 0.7);
  add(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0x120c08 }), -0.055, 1.77, 0.145);
  add(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0x120c08 }), 0.055, 1.77, 0.145);
  g.scale.setScalar(1.15);
  return g;
}

// ---------- the sty: draws frames
export class Sty {
  constructor(world, island, { headVar = "head", colorOf = () => "#5fd1e8" } = {}) {
    this.world = world; this.island = island; this.headVar = headVar; this.colorOf = colorOf;
    this.group = new THREE.Group(); world.scene.add(this.group);
    this.pigs = {};            // address -> { pig, value }
    this.ropes = {};           // address -> rope mesh (to its next)
    this.banners = {};         // "key:names" -> banner sprite
    this.tweens = [];
    this.headRope = null;
    this.layout = { at: {}, chain: { seen: [] } };
    world.add(this);
  }

  // where a node stands in the current frame
  spot(a) { const p = this.layout.at[a]; return p ? cell(p.c, p.r) : new THREE.Vector3(X0, 0, ROW1 + 2); }
  // where NULL is: right after the last pig of the rope from head
  nullSpot() { return cell(Math.max(0, this.layout.chain.seen.length) - 0.15, 0).add(new THREE.Vector3(0.6, 0, 0)); }
  // every point the camera should keep in view
  points() {
    // (a little past the gate sign on the left and the NULL stone on the right, so neither is cut off)
    const pts = [GATE.clone().add(new THREE.Vector3(-1.5, 0, 0)), GATE.clone().add(new THREE.Vector3(0, 0, 1.8)), this.nullSpot().add(new THREE.Vector3(1.4, 0, 0))];
    for (const a of Object.keys(this.layout.at)) { const c = this.spot(a); pts.push(c.clone().add(new THREE.Vector3(-1.7, 0, -0.6)), c.clone().add(new THREE.Vector3(1.7, 0, 2.0))); }   // the whole pig, nose to crate, and its plaque
    return pts;
  }

  // ---------- jump straight to a frame (stepping back, or setting a trial up)
  show(f) {
    for (const m of this.men || []) this.group.remove(m);      // a new picture: the men of an earlier finale go
    this.men = [];
    for (const p of Object.values(this.pigs)) p.pig.visible = true;
    this.frame = f; this.layout = layoutFrame(f, this.headVar);
    const live = new Set(f.order.filter(a => !f.nodes[a].freed).map(String));
    for (const a of Object.keys(this.pigs)) if (!live.has(a)) this._dropPig(a);
    for (const a of live) { const p = this._pig(a, f.nodes[a].data); p.pig.position.copy(this.spot(a)); p.pig.rotation.set(0, 0, 0); }
    this._ropesAll();
    for (const p of Object.values(this.pigs)) { p.pig.rotation.y = p.turn || 0; p.pig.userData.back.rotation.z = -p.pig.rotation.y; }   // no turning animation on a jump
    this._banners();
    this._lostTint();
    this._placeNull(true);
    this.island.pitGlow.intensity = 0;
  }

  // ---------- animate one step into frame `after`
  async act(step, after, speed = 1) {
    const before = this.layout;
    this.frame = after; this.layout = layoutFrame(after, this.headVar);
    const a = String(step.index), dur = 0.85 / speed;
    switch (step.action) {
      case "NEW": {
        const p = this._pig(a, step.value); const s = this.spot(a);
        p.pig.position.set(s.x, 5, s.z);
        await this._tween(dur * 1.2, k => { p.pig.position.y = 5 * (1 - k) * (1 - k); });
        p.pig.position.y = 0; this._puff(s);
        break;
      }
      case "READ": {
        const p = this.pigs[a]; if (!p) break;
        this._rim(p, a, "#f2c230");
        await this._tween(dur, k => { p.pig.position.y = Math.sin(Math.PI * k) * 0.35; });
        break;
      }
      case "WRITE": {
        const p = this.pigs[a]; if (!p) break;
        p.value = step.value; this._rim(p, a, "#3fae5a");
        await this._tween(dur, k => { p.pig.rotation.x = Math.sin(Math.PI * 2 * k) * 0.12; });
        p.pig.rotation.x = 0; break;
      }
      case "LINK": {
        // the re-tied rope grows from the crate, then everyone walks to their new places
        if (this.pigs[a]) this.pigs[a].hot = true;
        this._ropesAll(a);
        const r = this.ropes[a];
        if (r) await this._tween(dur * 1.2, k => r.geometry.setDrawRange(0, Math.floor(r.userData.count * k)));
        if (r) r.geometry.setDrawRange(0, Infinity);
        if (this.pigs[a]) { this.pigs[a].hot = false; }
        this._lostTint();
        break;
      }
      case "FREE": {
        const p = this.pigs[a]; if (!p) break;
        const mats = [p.plaque.material]; p.pig.traverse(o => o.material && mats.push(o.material));
        mats.forEach(m => (m.transparent = true));
        await this._tween(dur * 1.4, k => { p.pig.position.y = k * 2; mats.forEach(m => (m.opacity = 1 - k)); });
        this._dropPig(a); break;
      }
      case "NULL_DEREF": this.island.pitGlow.intensity = 30; break;
    }
    await this._walk(before, dur);
    this._ropesAll(); this._lostTint();
    this._banners(step.action === "PTR" ? step.target : null, dur);
    this._placeNull(false, dur);
    if (step.action === "PTR") await this._tween(dur * 0.8, () => {});
    else if (step.action === "VAR" || step.action === "DROP") await this._tween(0.05, () => {});
    else if (step.action === "CALL" || step.action === "RETURN") await this._tween(dur * 0.9, () => {});
    else if (step.action === "PRINT") await this._tween(dur * 0.6, () => {});
  }

  // pigs whose place in the layout changed walk there (legs going), ropes hidden while they move
  async _walk(before, dur) {
    const moves = [];
    for (const [a, p] of Object.entries(this.pigs)) {
      const to = this.spot(a), from = p.pig.position.clone().setY(0);
      if (from.distanceTo(to) > 0.05) moves.push({ p, from, to });
    }
    if (!moves.length) return;
    for (const r of Object.values(this.ropes)) r.visible = false;
    if (this.headRope) this.headRope.visible = false;
    for (const b of Object.values(this.banners)) b.visible = false;
    await this._tween(dur * 1.3, k => {
      const e = k * k * (3 - 2 * k);
      for (const m of moves) {
        m.p.pig.position.lerpVectors(m.from, m.to, e);
        m.p.pig.userData.legs.forEach((l, j) => (l.rotation.z = Math.sin(k * 28 + j * 1.6) * 0.45 * (1 - k)));
      }
    });
    for (const m of moves) { m.p.pig.position.copy(m.to); m.p.pig.userData.legs.forEach(l => (l.rotation.z = 0)); }
  }

  // ---------- pieces
  _pig(a, value) {
    let p = this.pigs[a];
    if (!p) {
      const pig = makePig(value, +a);
      this.group.add(pig);
      const plaque = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false, fog: false }));
      plaque.scale.set(PLAQUE_H * 3, PLAQUE_H, 1); plaque.renderOrder = 6;
      this.group.add(plaque);
      p = this.pigs[a] = { pig, value, plaque, rim: null, hot: false, key: "" };
    }
    if (p.value !== value) { p.value = value; this._rim(p, a, null); }
    return p;
  }
  _dropPig(a) { const p = this.pigs[a]; if (!p) return; this.group.remove(p.pig); this.group.remove(p.plaque); p.plaque.material.map?.dispose(); delete this.pigs[a]; }
  // repaint the node box on its back and its plaque, with a coloured rim for a moment
  _rim(p, a, color) {
    const back = p.pig.userData.back;
    back.material.map = backTexture(p.value, +a, color); back.material.needsUpdate = true;
    p.rim = color; this._plaque(a);
    if (color) { const v = p.value; setTimeout(() => { if (this.pigs[a] === p && p.value === v) { back.material.map = backTexture(p.value, +a); back.material.needsUpdate = true; p.rim = null; this._plaque(a); } }, 900); }
  }
  // redraw a plaque from the frame (only when something on it changed)
  _plaque(a) {
    const p = this.pigs[a], f = this.frame; if (!p || !f || !f.nodes[a]) return;
    const n = f.nodes[a], t = f.nodes[n.next];
    const st = { address: +a, data: p.value, next: n.next, rim: p.rim, hot: p.hot, dangling: n.next !== NULL && (!t || t.freed), lost: !!p.lost };
    const key = JSON.stringify(st);
    if (key === p.key) return;
    p.key = key; p.plaque.material.map?.dispose(); p.plaque.material.map = plaqueTexture(st); p.plaque.material.needsUpdate = true;
  }
  _plaques() { for (const a of Object.keys(this.pigs)) this._plaque(a); }

  // a rope across the ground, from one point to another, with an arrowhead at the far end.
  // bend > 0 swings it out sideways (towards the house), so ropes that go back never cross the row
  _rope(from, to, color = 0x1a1208, radius = 0.07, bend = 0) {
    const mid = from.clone().lerp(to, 0.5); mid.y = Math.min(from.y, to.y) - 0.08; mid.z -= bend;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geo = new THREE.TubeGeometry(curve, 36, radius, 6, false);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.7, emissive: color, emissiveIntensity: 0.25 }));
    m.userData.count = geo.index.count;
    const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.4, radius * 7, 8), m.material);
    head.position.copy(curve.getPoint(0.96)); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangent(0.96)); m.add(head);
    return m;
  }
  // which way a pig faces: its next-crate towards the pig it points at (it turns round when the rope is turned)
  _flipped(a) {
    const f = this.frame, n = f.nodes[a], me = this.layout.at[a], t = n && this.layout.at[n.next];
    return !!(me && t && n.next !== NULL && t.c < me.c);
  }
  _ropesAll(growing = null) {
    for (const r of Object.values(this.ropes)) this.group.remove(r);
    this.ropes = {};
    const f = this.frame; if (!f) return;
    for (const a of f.order) {
      const n = f.nodes[a], p = this.pigs[a]; if (n.freed || !p) continue;
      const flip = this._flipped(a), dir = flip ? -1 : 1;
      p.turn = flip ? Math.PI : 0;                             // update() turns it there smoothly
      const s = this.spot(a), start = new THREE.Vector3(s.x + dir * 1.08, 0.72, s.z);
      const isNull = n.next === NULL;
      p.pig.userData.lid.material.map = lidTexture(isNull); p.pig.userData.lid.material.needsUpdate = true;
      if (isNull) continue;                                  // NULL: the lid says so; no rope
      let to, bend = 0, color = 0x1a1208;
      if (f.nodes[n.next] && !f.nodes[n.next].freed && this.layout.at[n.next]) {
        const t = this.spot(n.next), same = Math.abs(t.z - s.z) < 0.1, side = t.x >= s.x ? 1 : -1;
        if (String(n.next) === String(a)) {                                       // it points at itself: a loop round its own back
          to = new THREE.Vector3(s.x - dir * 1.25, 0.68, s.z); bend = 2.4;
        } else if (same) {
          to = new THREE.Vector3(t.x - side * 1.25, 0.68, t.z);                  // the near end of the pig it points at
          if (Math.abs(t.x - s.x) > SP * 1.5) bend = (s.z > 0 ? -1 : 1) * (1.7 + Math.abs(t.x - s.x) * 0.14);   // past other pigs: swing round them
        } else {
          to = new THREE.Vector3(t.x + (t.x > s.x + 0.1 ? -0.5 : t.x < s.x - 0.1 ? 0.5 : dir * 0.35), 0.68, t.z + (s.z > t.z ? 0.66 : -0.66));   // the near flank
        }
      } else { to = start.clone().add(new THREE.Vector3(dir * 0.9, -0.5, 0)); color = 0xe0442a; }
      const r = this._rope(start, to, String(a) === String(growing) ? 0xff7a2a : color, 0.07, bend);
      this.group.add(r); this.ropes[a] = r;
      if (String(a) === String(growing)) r.geometry.setDrawRange(0, 0);
    }
    // the gate rope: head
    if (this.headRope) this.group.remove(this.headRope);
    const h = f.ptrs[this.headVar];
    const from = GATE.clone().add(new THREE.Vector3(0.3, 1.0, 0));
    let to;
    if (h === NULL || h == null || !f.nodes[h] || f.nodes[h].freed) to = this.nullSpot().add(new THREE.Vector3(-0.5, 0.4, 0));
    else { const t = this.spot(h); to = new THREE.Vector3(t.x - 1.25, 0.7, t.z); }
    this.island.setHead?.(h === NULL || h == null ? "NULL" : hex(h));
    this.headRope = this._rope(from, to, 0xe0a800, 0.08, Math.abs(to.z - from.z) < 0.1 && to.x > from.x + SP * 1.5 ? 0.9 : 0);
    this.group.add(this.headRope);
    this._plaques();
  }

  // the NULL stone sits right after the last pig of the rope
  _placeNull(snap, dur = 0.4) {
    const pit = this.island.pit, to = this.nullSpot();
    if (snap) { pit.position.copy(to); return; }
    const from = pit.position.clone();
    if (from.distanceTo(to) > 0.05) this._tween(dur, k => pit.position.lerpVectors(from, to, k));
  }

  // banners: one per pig (or the NULL stone) carrying every pointer that points there (head is the gate rope)
  _banners(moved = null, dur = 0.4) {
    const f = this.frame; if (!f) return;
    const at = new Map();
    for (const [nm, a] of Object.entries(f.ptrs)) {
      if (nm === this.headVar) continue;
      const key = a === NULL || !f.nodes[a] || f.nodes[a].freed ? "NULL" : String(a);
      if (!at.has(key)) at.set(key, []);
      at.get(key).push(nm);
    }
    const keep = new Set();
    for (const [key, names] of at) {
      const sig = key + ":" + names.join(",");
      keep.add(sig);
      const target = key === "NULL" ? this.nullSpot().add(new THREE.Vector3(0, 1.9, 0)) : this.spot(key).add(new THREE.Vector3(0, 2.1, 0));
      if (this.banners[sig]) { this.banners[sig].visible = true; this.banners[sig].position.copy(target); continue; }
      const b = bannerSprite(names, names.map(n => this.colorOf(n)));
      const prev = Object.entries(this.banners).find(([s]) => moved && s.split(":")[1].split(",").includes(moved));
      b.position.copy(prev ? prev[1].position : target);
      this.group.add(b); this.banners[sig] = b;
      if (prev) { const p0 = b.position.clone(); this._tween(dur, k => b.position.lerpVectors(p0, target, k * k * (3 - 2 * k))); }
    }
    for (const [sig, b] of Object.entries(this.banners)) if (!keep.has(sig)) { this.group.remove(b); delete this.banners[sig]; }
  }

  // pigs nothing can reach turn grey: lost in the woods
  _lostTint() {
    const f = this.frame; if (!f) return;
    const lost = new Set(lostNodes(f).map(String));
    for (const [a, p] of Object.entries(this.pigs)) { p.lost = lost.has(a); p.pig.userData.mat.color.copy(p.lost ? GREY : PINK); }
    this._plaques();
  }

  _puff(at) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd9c8ff, transparent: true, opacity: 0.6 }));
    m.position.copy(at).setY(0.5); this.group.add(m);
    this._tween(0.6, k => { m.scale.setScalar(1 + k * 1.6); m.material.opacity = 0.6 * (1 - k); }).then(() => this.group.remove(m));
  }

  // the lost pigs wander off into the woods (a failed trial)
  async wanderOff(addresses) {
    const keys = addresses.map(String), ps = keys.filter(a => this.pigs[a]).map(a => this.pigs[a]);
    if (!ps.length) return;
    const from = ps.map(p => p.pig.position.clone());
    for (const [a, r] of Object.entries(this.ropes)) if (keys.includes(a)) r.visible = false;
    await this._tween(2.4, k => ps.forEach((p, i) => {
      p.turn = Math.PI * 0.5; p.pig.rotation.y = p.turn;   // nose to the woods behind the sty
      p.pig.position.copy(from[i]).add(new THREE.Vector3((i - ps.length / 2) * 0.6 * k, 0, -k * 10));
      p.pig.userData.legs.forEach((l, j) => (l.rotation.z = Math.sin(k * 40 + j * 1.6) * 0.5));
    }));
  }

  // the finale: every pig on the rope becomes a man again, in rope order
  async turnBack(comic) {
    const f = this.frame, order = walkFrom(f, f.ptrs[this.headVar]).seen;
    for (const a of order) {
      const p = this.pigs[a]; if (!p) continue;
      const s = this.spot(a); this._puff(s);
      if (comic && (a === order[0] || a === order[order.length - 1])) comic.sfx("POOF!", { x: 25 + Math.random() * 25, y: 28 + Math.random() * 14, size: 6, seconds: 0.8 });
      const man = makeMan(); man.position.set(s.x, 0, s.z); this.group.add(man); (this.men ||= []).push(man);
      p.pig.visible = false; if (this.ropes[a]) this.group.remove(this.ropes[a]);
      await this._tween(0.55, k => man.scale.setScalar((0.4 + 0.6 * k) * 1.15));
    }
    if (this.headRope) this.group.remove(this.headRope);
    for (const b of Object.values(this.banners)) this.group.remove(b);
    this.banners = {};
  }

  _tween(seconds, fn) { return new Promise(res => this.tweens.push({ t: 0, d: Math.max(seconds, 1e-3), fn, res })); }
  update(dt) {
    // pigs turn towards the way their rope now runs; the number on the back stays upright
    for (const p of Object.values(this.pigs)) {
      const y = p.pig.rotation.y, to = p.turn || 0;
      if (Math.abs(to - y) > 0.001) p.pig.rotation.y = Math.abs(to - y) < 0.02 ? to : y + (to - y) * Math.min(1, dt * 7);
      p.pig.userData.back.rotation.z = -p.pig.rotation.y;
      p.plaque.position.copy(p.pig.position).add(PLAQUE_AT);
      p.plaque.visible = p.pig.visible;
    }
    for (const tw of [...this.tweens]) {
      tw.t += dt; const k = Math.min(1, tw.t / tw.d); tw.fn(k);
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); }
    }
  }
  wait(s) { return this._tween(s, () => {}); }
}
