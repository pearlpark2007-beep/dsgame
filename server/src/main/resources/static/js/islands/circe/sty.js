// sty.js — Circe's island: a moonlit clearing in the oak woods, her house glowing behind, and the
// crew turned into pigs. Each pig IS a node of a linked list, seen from above:
//   • its back is the node's box: the tag (data) painted big, its address small under it,
//   • the little crate on its rump is the node's next field: the rope to the NEXT pig leaves from
//     there and ends in an arrow at that pig's nose; a loose rope end is NULL,
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
const X0 = -7.5, SP = 2.9, ROW0 = -1.0, ROW1 = 2.8;
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
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
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
function makeMan() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc89a78, roughness: 0.8 }), tunic = new THREE.MeshStandardMaterial({ color: 0x7a3a28, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.9, 10), tunic); body.position.y = 1.0; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin); head.position.y = 1.66; g.add(head);
  for (const x of [-0.12, 0.12]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.56, 0.14), skin); leg.position.set(x, 0.28, 0); g.add(leg); }
  for (const x of [-0.33, 0.33]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.6, 0.12), skin); arm.position.set(x, 1.05, 0); g.add(arm); }
  return g;
}

// ---------- the island around the sty
export function buildIsland(world) {
  const scene = world.scene;
  scene.background = new THREE.Color(0x07060c);
  scene.fog = new THREE.FogExp2(0x120c1c, 0.028);
  // ground: dark grass with lighter trodden earth in the clearing
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({
    map: canvasTexture(1024, 1024, (g, w, h) => {
      g.fillStyle = "#1b2414"; g.fillRect(0, 0, w, h);
      const rg = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.2);
      rg.addColorStop(0, "#4a3a28"); rg.addColorStop(0.8, "#3a3020"); rg.addColorStop(1, "rgba(27,36,20,0)");
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${40 + Math.random() * 40},${50 + Math.random() * 40},${25 + Math.random() * 20},0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2 + Math.random() * 4); }
    }), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // the oak wood around the clearing
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 1 }), leafM = new THREE.MeshStandardMaterial({ color: 0x18261a, roughness: 1 });
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = 18 + rnd() * 20;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.8 - 2;
    if (z > 7 && Math.abs(x) < 18) continue;          // keep the view from the camera side open
    const h = 4 + rnd() * 5, t = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, h, 7), trunkM);
    t.position.set(x, h / 2, z); t.castShadow = true; scene.add(t);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8 + rnd() * 1.6, 0), leafM);
    crown.position.set(x, h + 0.8, z); crown.scale.y = 0.8; crown.castShadow = true; scene.add(crown);
  }
  // Circe's house: stone walls, a lit doorway, smoke-purple light spilling out
  const stone = new THREE.MeshStandardMaterial({ color: 0x5a5560, roughness: 0.95 });
  const house = new THREE.Group(); house.position.set(1, 0, -14);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(10, 4.4, 6), stone); walls.position.y = 2.2; walls.castShadow = true; house.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 2.6, 4), new THREE.MeshStandardMaterial({ color: 0x2e2028, roughness: 1 })); roof.position.y = 5.7; roof.rotation.y = Math.PI / 4; roof.scale.z = 0.62; house.add(roof);
  const glow = new THREE.MeshBasicMaterial({ color: 0xffb070 });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.6), glow); door.position.set(0, 1.3, 3.01); house.add(door);
  for (const x of [-3.2, 3.2]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.9), glow); w.position.set(x, 2.6, 3.01); house.add(w); }
  // Circe herself, a dark figure standing in her lit doorway
  const robe = new THREE.MeshStandardMaterial({ color: 0x0a0610, roughness: 0.6, emissive: 0x2a0a40, emissiveIntensity: 0.4 });
  const circe = new THREE.Group(); circe.position.set(0, 0, 3.15);
  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.7, 14), robe); dress.position.y = 0.85; circe.add(dress);
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.5, 10), robe); torso.position.y = 1.85; circe.add(torso);
  const headC = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), robe); headC.position.y = 2.22; circe.add(headC);
  const hair = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 10), robe); hair.position.set(0, 1.95, -0.08); circe.add(hair);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), robe); staff.position.set(0.4, 1.2, 0); circe.add(staff);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), new THREE.MeshBasicMaterial({ color: 0xd08aff })); orb.position.set(0.4, 2.45, 0); circe.add(orb);
  house.add(circe);
  scene.add(house);
  // a warm lantern hung high over the sty, so the pigs (the nodes) read clearly from above
  const over = new THREE.PointLight(0xffd8a8, 70, 34, 1.3); over.position.set(2, 10, 1.5); scene.add(over);
  const doorLight = new THREE.PointLight(0xff9a50, 40, 18, 1.6); doorLight.position.set(1, 1.6, -10.4); scene.add(doorLight);
  const spell = new THREE.PointLight(0xb070ff, 30, 26, 1.4); spell.position.set(1, 6, -11); scene.add(spell);
  // moonlight and a low fill
  const moon = new THREE.DirectionalLight(0x9fb4ff, 1.1); moon.position.set(-14, 22, 12); moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048); Object.assign(moon.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 70 }); scene.add(moon);
  scene.add(new THREE.HemisphereLight(0x46405a, 0x1a140c, 0.65));
  // torches on stakes around the sty, flickering
  const torches = [];
  for (const [x, z] of [[-13, -5], [15, -5], [-13, 6.5], [15, 6.5], [3, -7.5]]) {
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 6), trunkM); stake.position.set(x, 0.9, z); scene.add(stake);
    const fire = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb050 })); fire.position.set(x, 1.9, z); scene.add(fire);
    const l = new THREE.PointLight(0xff8a3a, 14, 11, 1.7); l.position.set(x, 2.1, z); scene.add(l); torches.push(l);
  }
  // the gate (head): two posts and a crossbar, painted HEAD
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3420, roughness: 0.9 });
  const gate = new THREE.Group(); gate.position.copy(GATE);
  for (const z of [-0.9, 0.9]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.2, 0.22), wood); post.position.set(0, 1.1, z); post.castShadow = true; gate.add(post); }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 2.2), wood); bar.position.y = 2.1; gate.add(bar);
  const sign = labelSprite((g, w, h) => { g.fillStyle = "#2a1c10"; g.fillRect(0, 0, w, h); g.strokeStyle = HEAD_COLOR; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = HEAD_COLOR; g.font = "bold 80px Anton, Impact, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("HEAD", w / 2, h / 2 + 4); }, 256, 110, 0.6);
  sign.position.set(0, 2.62, 0); gate.add(sign);
  scene.add(gate);
  // the NULL pit: a black hole in the ground, a stone marked NULL
  const pit = new THREE.Group(); pit.position.copy(PIT);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({ color: 0x020102 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.02; pit.add(hole);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.09, 6, 24), stone); rim.rotation.x = Math.PI / 2; rim.position.y = 0.06; pit.add(rim);
  const nullSign = labelSprite((g, w, h) => { g.fillStyle = "#1a1418"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a7f88"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = "#cfc6cc"; g.font = "bold 78px 'Courier Prime', monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NULL", w / 2, h / 2 + 4); }, 256, 110, 0.55);
  nullSign.position.set(0, 0.95, -0.75); pit.add(nullSign);
  const pitGlow = new THREE.PointLight(0xff2a10, 0, 6, 1.5); pitGlow.position.set(0, 0.6, 0); pit.add(pitGlow);
  scene.add(pit);
  world.add({ update: (dt, t) => { torches.forEach((l, i) => (l.intensity = 12 + Math.sin(t * 9 + i * 2.1) * 2 + Math.sin(t * 23 + i) * 1.2)); spell.intensity = 26 + Math.sin(t * 1.3) * 6; } });
  return { house, gate, pit, pitGlow, doorAt: new THREE.Vector3(1, 0, -10.6) };
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
    for (const a of Object.keys(this.layout.at)) { const c = this.spot(a); pts.push(c.clone().add(new THREE.Vector3(-1.7, 0, 0)), c.clone().add(new THREE.Vector3(1.7, 0, 0.9))); }   // the whole pig, nose to crate
    return pts;
  }

  // ---------- jump straight to a frame (stepping back, or setting a trial up)
  show(f) {
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
        this._ropesAll(a);
        const r = this.ropes[a];
        if (r) await this._tween(dur * 1.2, k => r.geometry.setDrawRange(0, Math.floor(r.userData.count * k)));
        if (r) r.geometry.setDrawRange(0, Infinity);
        this._lostTint();
        break;
      }
      case "FREE": {
        const p = this.pigs[a]; if (!p) break;
        const mats = []; p.pig.traverse(o => o.material && mats.push(o.material));
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
    else if (step.action === "VAR") await this._tween(0.05, () => {});
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
      p = this.pigs[a] = { pig, value };
    }
    if (p.value !== value) { p.value = value; this._rim(p, a, null); }
    return p;
  }
  _dropPig(a) { const p = this.pigs[a]; if (!p) return; this.group.remove(p.pig); delete this.pigs[a]; }
  // repaint the node box on its back, with a coloured rim for a moment
  _rim(p, a, color) {
    const back = p.pig.userData.back;
    back.material.map = backTexture(p.value, +a, color); back.material.needsUpdate = true;
    if (color) { const v = p.value; setTimeout(() => { if (this.pigs[a] === p && p.value === v) { back.material.map = backTexture(p.value, +a); back.material.needsUpdate = true; } }, 900); }
  }

  // a rope across the ground, from one point to another, with an arrowhead at the far end.
  // bend > 0 swings it out sideways (towards the house), so ropes that go back never cross the row
  _rope(from, to, color = 0xc9b48a, radius = 0.05, bend = 0) {
    const mid = from.clone().lerp(to, 0.5); mid.y = Math.min(from.y, to.y) - 0.08; mid.z -= bend;
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geo = new THREE.TubeGeometry(curve, 36, radius, 6, false);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.8, emissive: color, emissiveIntensity: 0.18 }));
    m.userData.count = geo.index.count;
    const head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.6, radius * 9, 8), m.material);
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
      let to, bend = 0, color = 0xc9b48a;
      if (f.nodes[n.next] && !f.nodes[n.next].freed && this.layout.at[n.next]) {
        const t = this.spot(n.next), same = Math.abs(t.z - s.z) < 0.1, side = t.x >= s.x ? 1 : -1;
        if (same) {
          to = new THREE.Vector3(t.x - side * 1.25, 0.68, t.z);                  // the near end of the pig it points at
          if (Math.abs(t.x - s.x) > SP * 1.5) bend = (s.z > 0 ? -1 : 1) * (1.7 + Math.abs(t.x - s.x) * 0.14);   // past other pigs: swing round them
        } else {
          to = new THREE.Vector3(t.x + (t.x > s.x + 0.1 ? -0.5 : t.x < s.x - 0.1 ? 0.5 : dir * 0.35), 0.68, t.z + (s.z > t.z ? 0.66 : -0.66));   // the near flank
        }
      } else { to = start.clone().add(new THREE.Vector3(dir * 0.9, -0.5, 0)); color = 0xe0442a; }
      const r = this._rope(start, to, String(a) === String(growing) ? 0xff9a5c : color, 0.05, bend);
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
    this.headRope = this._rope(from, to, 0xf2c230, 0.065, Math.abs(to.z - from.z) < 0.1 && to.x > from.x + SP * 1.5 ? 0.9 : 0);
    this.group.add(this.headRope);
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
    for (const [a, p] of Object.entries(this.pigs)) p.pig.userData.mat.color.copy(lost.has(a) ? GREY : PINK);
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
      const man = makeMan(); man.position.set(s.x, 0, s.z); this.group.add(man);
      p.pig.visible = false; if (this.ropes[a]) this.group.remove(this.ropes[a]);
      await this._tween(0.55, k => man.scale.setScalar(0.4 + 0.6 * k));
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
    }
    for (const tw of [...this.tweens]) {
      tw.t += dt; const k = Math.min(1, tw.t / tw.d); tw.fn(k);
      if (k >= 1) { this.tweens.splice(this.tweens.indexOf(tw), 1); tw.res(); }
    }
  }
  wait(s) { return this._tween(s, () => {}); }
}
