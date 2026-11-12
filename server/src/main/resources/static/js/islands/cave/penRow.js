// penRow.js — the array, made into a row of pens in the Cyclops' cave.
//   • ten pens carved side by side: pen number [i] and address cut into the floor stone in front of each
//   • a sheep in each pen in use, its weight painted on its side (the VALUE; the pen number is the INDEX)
//   • a rope along the pens in use, 0 to n-1, with a sign "n = 8": the length, not the capacity
//   • pens past n hold whatever junk was left there; past pen 9 there is only the dark, and an eye
// Every change is animated, and a copy really is a copy: flock[i] = flock[i-1] leaves the sheep where it
// was and sends a second one, so a wrong-way shift shows a row of identical sheep.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { stoneTexture, plankTexture } from "../../engine/textures.js";

export const PEN_W = 1.8;          // centre to centre
export const BASE_ADDR = 0x2A0;    // the same address plates as the Harbour's crates

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const TYPE = "'Courier Prime', 'Courier 10 Pitch', monospace";
const HEAVY = "Anton, Impact, 'Inter Display Black', sans-serif";
const hex = a => "0x" + a.toString(16).toUpperCase();

// a flat label lying in the scene (a plate, a sign)
function plate(w, h, draw, pxPerM = 256) {
  const tex = canvasTex(Math.round(w * pxPerM), Math.round(h * pxPerM), draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, transparent: true }));
  return m;
}

// ---------- a blocky sheep: white fleece, dark face, its weight painted on both sides
const WOOL = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 1 });
const FACE = new THREE.MeshStandardMaterial({ color: 0x2b211b, roughness: 0.8 });
// the fleece: a cluster of soft lumps the size of the old box (0.95 x 0.62 x 0.62), made once and shared
let FLEECE = null;
function fleece() {
  if (FLEECE) return FLEECE;
  const parts = [];
  for (let x = -0.36; x <= 0.37; x += 0.18) for (const [y, z] of [[0.12, -0.15], [0.12, 0.15], [-0.1, -0.17], [-0.1, 0.17], [0.2, 0]]) {
    const r = 0.17 + Math.abs(Math.sin(x * 13 + y * 7 + z * 5)) * 0.05;
    const b = new THREE.IcosahedronGeometry(r, 1); b.translate(x, y, z); parts.push(b);
  }
  const inner = new THREE.BoxGeometry(0.86, 0.5, 0.5); parts.push(inner.toNonIndexed());
  FLEECE = mergeGeometries(parts.map(p => p.index ? p.toNonIndexed() : p));
  FLEECE.computeVertexNormals();
  return FLEECE;
}
function makeSheep(weight) {
  const g = new THREE.Group();
  const s = 0.72 + Math.max(0, Math.min(weight, 100)) / 220;           // heavier sheep are a little bigger
  const body = new THREE.Mesh(fleece(), WOOL.clone());
  body.position.y = 0.62; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), FACE);
  head.position.set(0.58, 0.82, 0); g.add(head);
  for (const [x, z] of [[-0.3, -0.18], [-0.3, 0.18], [0.3, -0.18], [0.3, 0.18]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.12), FACE); leg.position.set(x, 0.17, z); g.add(leg);
  }
  // the weight, painted on the side facing the camera
  const tag = plate(0.62, 0.42, (c, w, h) => {
    c.fillStyle = "rgba(0,0,0,0)"; c.fillRect(0, 0, w, h);
    c.font = `700 ${h * 0.82}px ${HEAVY}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.lineWidth = h * 0.12; c.strokeStyle = "#f4efe2"; c.lineJoin = "round"; c.strokeText(String(weight), w / 2, h * 0.54);
    c.fillStyle = "#a3251a"; c.fillText(String(weight), w / 2, h * 0.54);
  });
  tag.position.set(-0.02, 0.6, 0.47); g.add(tag);
  g.scale.setScalar(s);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.userData = { weight, body };
  return g;
}

// ---------- junk: what an empty pen holds (an old bone, a broken pot), with the leftover number scratched on
function makeJunk(value) {
  const g = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 1, transparent: true, opacity: 0.85 }));
  stone.position.y = 0.22; stone.scale.set(1.3, 0.7, 1); g.add(stone);
  const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), new THREE.MeshStandardMaterial({ color: 0xcfc4a8, roughness: 1 }));
  bone.rotation.z = Math.PI / 2; bone.rotation.y = 0.5; bone.position.set(0.1, 0.08, 0.15); g.add(bone);
  const tag = plate(0.5, 0.3, (c, w, h) => {
    c.font = `700 ${h * 0.7}px ${TYPE}`; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#8c7c66"; c.fillText("?" + value, w / 2, h / 2);
  });
  tag.position.set(0, 0.5, 0.3); g.add(tag);
  g.userData = { junk: value, stone };
  return g;
}

export class PenRow {
  constructor(world, { pens = 10, x = 0, z = 0 } = {}) {
    this.world = world; this.cap = pens;
    this.group = new THREE.Group(); this.group.position.set(x, 0, z); world.scene.add(this.group);
    this.sheep = new Array(pens).fill(null);       // the sheep standing in each pen (or null)
    this.junk = new Array(pens).fill(null);
    this.values = new Array(pens).fill(0);
    this.markers = {};
    this.n = 0;
    // the back wall: dry stone, with rough capstones along the top; the pens are split by wattle hurdles
    const st = stoneTexture({ seed: 17, base: [120, 108, 94], dark: [50, 44, 38], moss: [70, 72, 56] });
    for (const t of [st.map, st.normalMap, st.roughnessMap]) t.repeat.set(7, 1.3);
    const stone = new THREE.MeshStandardMaterial({ ...st, roughness: 1 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(pens * PEN_W + 2.6, 3.2, 0.5), stone);
    wall.position.set(this.px((pens - 1) / 2) + 0.4, 1.6, -1.05); wall.receiveShadow = true; this.group.add(wall);
    const caps = [];
    for (let x = -1.2; x < pens * PEN_W + 1.4; x += 0.55) {
      const c = new THREE.DodecahedronGeometry(0.34, 0); c.scale(1.2, 0.55 + Math.abs(Math.sin(x * 7.1)) * 0.3, 0.95);
      c.rotateY(Math.sin(x * 3.3) * 0.6); c.translate(x, 3.25, -1.05); caps.push(c);
    }
    const capMesh = new THREE.Mesh(mergeGeometries(caps), new THREE.MeshStandardMaterial({ color: 0x6a5f54, roughness: 1, flatShading: true }));
    capMesh.castShadow = capMesh.receiveShadow = true; this.group.add(capMesh);
    const wood = new THREE.MeshStandardMaterial({ ...plankTexture({ seed: 3, base: [70, 52, 34], light: [118, 92, 62], boards: 5 }), roughness: 1 });
    for (let i = 0; i <= pens; i++) {
      const d = new THREE.Group(); d.position.set(this.px(i) - PEN_W / 2, 0, -0.1); this.group.add(d);
      for (const z of [-0.72, 0, 0.72]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 6), wood); post.position.set(0, 0.7, z); d.add(post); }
      for (let k = 0; k < 4; k++) {   // woven rods
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.6, 5), wood);
        rod.rotation.x = Math.PI / 2; rod.position.set((k % 2 ? 0.03 : -0.03), 0.22 + k * 0.22, 0); d.add(rod);
      }
      d.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    }
    // pen number and address, cut into the floor in front of each pen
    for (let i = 0; i < pens; i++) {
      const p = plate(1.5, 0.75, (c, w, h) => {
        c.fillStyle = "#3a322c"; c.fillRect(0, 0, w, h);
        c.strokeStyle = "#1f1a16"; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
        c.textAlign = "center"; c.textBaseline = "middle";
        c.fillStyle = "#f2c230"; c.font = `${h * 0.52}px ${HEAVY}`; c.fillText(`[${i}]`, w / 2, h * 0.4);
        c.fillStyle = "#b9a684"; c.font = `700 ${h * 0.2}px ${TYPE}`; c.fillText(hex(BASE_ADDR + 4 * i), w / 2, h * 0.8);
      });
      p.rotation.x = -Math.PI / 2; p.position.set(this.px(i), 0.012, 1.15); p.receiveShadow = true;
      this.group.add(p);
    }
    // the dark past the last pen: an opening in the rock, and (when you reach in) an eye
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.6), new THREE.MeshBasicMaterial({ color: 0x020101 }));
    dark.position.set(this.px(pens), 1.3, -0.78); this.group.add(dark);
    const beyond = plate(1.5, 0.75, (c, w, h) => {
      c.fillStyle = "#120d0b"; c.fillRect(0, 0, w, h);
      c.textAlign = "center"; c.textBaseline = "middle";
      c.fillStyle = "#5c2a20"; c.font = `${h * 0.52}px ${HEAVY}`; c.fillText(`[${pens}]`, w / 2, h * 0.4);
      c.fillStyle = "#5c4c3a"; c.font = `700 ${h * 0.18}px ${TYPE}`; c.fillText("no such pen", w / 2, h * 0.8);
    });
    beyond.rotation.x = -Math.PI / 2; beyond.position.set(this.px(pens), 0.012, 1.15); this.group.add(beyond);
    this.eye = this._makeEye(); this.eye.position.set(this.px(pens), 1.5, -0.7); this.group.add(this.eye);
    // the rope along the pens in use, and its sign
    this.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), new THREE.MeshStandardMaterial({ color: 0xc9a227, emissive: 0x5a3a08, roughness: 0.6 }));
    this.rope.rotation.z = Math.PI / 2; this.group.add(this.rope);
    this.sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.9 }));
    this.group.add(this.sign);
    this._tweens = [];
    world.add(this);
  }

  px(i) { return i * PEN_W; }
  // world position of pen i (standing spot of its sheep)
  spot(i) { return new THREE.Vector3(this.px(i), 0, 0).add(this.group.position); }
  address(i) { return hex(BASE_ADDR + 4 * i); }

  _makeEye() {
    const g = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, emissive: 0x3a2a1a, roughness: 0.4 }));
    // iris and pupil sit ON the eyeball's front (its radius is 0.55), a little proud of it
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 12), new THREE.MeshStandardMaterial({ color: 0xb8361c, emissive: 0x6a1406, roughness: 0.4 }));
    iris.position.z = 0.47; iris.scale.z = 0.4;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 10), new THREE.MeshBasicMaterial({ color: 0x050202 }));
    pupil.position.z = 0.565; pupil.scale.z = 0.3;
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a3f2e, roughness: 0.9, side: THREE.DoubleSide }));
    const lid2 = lid.clone(); lid2.rotation.x = Math.PI;
    g.add(white, iris, pupil, lid, lid2);
    g.userData = { lid, lid2 };
    g.visible = false;
    return g;
  }

  // ---------- time: every animation runs on the world clock (so slow motion and test capture both work)
  update(dt) {
    for (const t of [...this._tweens]) {
      t.t += dt; const k = Math.min(1, t.t / t.d);
      t.fn(k);
      if (k >= 1) { this._tweens.splice(this._tweens.indexOf(t), 1); t.res(); }
    }
  }
  over(seconds, fn) { return new Promise(res => this._tweens.push({ t: 0, d: Math.max(0.001, seconds), fn, res })); }
  wait(seconds) { return this.over(seconds, () => {}); }

  // ---------- state
  // fill the pens: values[0..] in use (n = values.length); the rest hold junk
  set(values, { junk = [] } = {}) {
    for (let i = 0; i < this.cap; i++) { this._remove(this.sheep[i]); this.sheep[i] = null; this._remove(this.junk[i]); this.junk[i] = null; }
    for (let i = 0; i < this.cap; i++) {
      if (i < values.length) this._put(i, makeSheep(values[i]));
      else { const j = junk[i - values.length] ?? (11 + ((i * 37) % 80)); this.values[i] = j; this.junk[i] = makeJunk(j); this.junk[i].position.copy(this.spot(i)).sub(this.group.position); this.group.add(this.junk[i]); }
    }
    this.setN(values.length);
  }
  _put(i, sheep) {
    sheep.position.set(this.px(i), 0, 0); sheep.rotation.y = 0;
    this.group.add(sheep); this.sheep[i] = sheep; this.values[i] = sheep.userData.weight;
    if (this.junk[i]) { this._remove(this.junk[i]); this.junk[i] = null; }
  }
  _remove(o) { if (o && o.parent) o.parent.remove(o); }

  // the rope runs along pens 0..n-1; the sign says n
  setN(n) {
    this.n = n;
    const len = Math.max(0.01, n * PEN_W - 0.3);
    this.rope.visible = n > 0;
    this.rope.scale.y = len; this.rope.position.set(this.px(0) - PEN_W / 2 + 0.15 + len / 2, 1.42, -0.68);
    const tex = canvasTex(384, 154, (c, w, h) => {
      c.fillStyle = "#1d140c"; c.fillRect(0, 0, w, h); c.strokeStyle = "#c9a227"; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = "#f2c230"; c.font = `${h * 0.56}px ${HEAVY}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(`n = ${n}`, w / 2, h * 0.52);
    });
    if (this.sign.material.map) this.sign.material.map.dispose();
    this.sign.material.map = tex; this.sign.material.needsUpdate = true;
    this.sign.position.set(this.px(0.5), 2.45, -0.78);      // on the wall above pens 0 and 1
  }

  // ---------- markers: a glowing ring on the floor under a pen, with the variable's name (i, l, r, big)
  marker(name, i, color = 0xf2c230) {
    let m = this.markers[name];
    if (!m) {
      m = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.68, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; m.add(ring);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(160, 96, (c, w, h) => {
        c.fillStyle = "#" + new THREE.Color(color).getHexString(); c.fillRect(0, 0, w, h);
        c.fillStyle = "#1d140c"; c.font = `${h * 0.7}px ${HEAVY}`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(name, w / 2, h * 0.55);
      }), toneMapped: false }));
      tag.scale.set(0.5, 0.3, 1); tag.position.set(0, 0.05, 1.75 + Object.keys(this.markers).length * 0.36);
      m.add(tag);
      this.group.add(m); this.markers[name] = m;
      m.position.set(this.px(i), 0, 0);
      return Promise.resolve();
    }
    m.visible = true;
    const from = m.position.x, to = this.px(i);
    return this.over(0.35, k => { m.position.x = from + (to - from) * (k * k * (3 - 2 * k)); });
  }
  hideMarker(name) { if (this.markers[name]) this.markers[name].visible = false; }
  clearMarkers() { for (const m of Object.values(this.markers)) this._remove(m); this.markers = {}; }

  // ---------- reading and writing pens
  // a read: the sheep in pen i lifts its head and glows for a moment
  async read(i) {
    const s = this.sheep[i] ?? this.junk[i];
    if (!s) return this.values[i];
    const mat = s.userData.body ? s.userData.body.material : s.userData.stone.material;
    const junk = !this.sheep[i];
    mat.emissive = new THREE.Color(junk ? 0x6a1a0a : 0x5a4310);
    await this.over(0.45, k => { const b = Math.sin(Math.PI * k); s.position.y = b * 0.18; mat.emissiveIntensity = b * 1.6; });
    mat.emissiveIntensity = 0;
    return this.values[i];
  }

  // flock[to] = flock[from]: a SECOND sheep like the one in `from` walks over; whatever was in `to` is gone
  async copy(from, to) {
    const src = this.sheep[from];
    const w = src ? src.userData.weight : this.values[from];
    const twin = makeSheep(w);
    twin.position.set(this.px(from), 0, 0.45); this.group.add(twin);
    twin.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.5; } });
    const old = this.sheep[to] ?? this.junk[to];
    await this.over(0.55, k => {
      const e = k * k * (3 - 2 * k);
      twin.position.x = this.px(from) + (this.px(to) - this.px(from)) * e;
      twin.position.y = Math.sin(Math.PI * k) * 0.25;
      if (old) old.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 1 - e; } });
    });
    if (old) { this._remove(old); if (old === this.junk[to]) this.junk[to] = null; }
    twin.traverse(o => { if (o.isMesh) o.material.opacity = 1; });
    twin.position.z = 0;
    this._put(to, twin);
  }

  // flock[i] = v: a sheep weighing v comes in from the front (a lamb, a value from a temp)
  async write(i, v) {
    const s = makeSheep(v);
    const old = this.sheep[i] ?? this.junk[i];
    s.position.set(this.px(i), 0, 2.4); this.group.add(s);
    await this.over(0.6, k => {
      const e = k * k * (3 - 2 * k);
      s.position.z = 2.4 * (1 - e); s.position.y = Math.sin(Math.PI * k) * 0.3;
      if (old) old.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 1 - e; } });
    });
    if (old) { this._remove(old); if (old === this.junk[i]) this.junk[i] = null; }
    this._put(i, s);
  }

  // a sheep taken out (into a temp, or for supper): it walks out to the front and waits there
  async lift(i, { to = 2.2 } = {}) {
    const s = this.sheep[i];
    if (!s) return null;
    this.sheep[i] = null;
    await this.over(0.5, k => { s.position.z = to * (k * k * (3 - 2 * k)); });
    return s;
  }
  async dropOff(s) {           // a lifted sheep leaves the scene
    await this.over(0.5, k => { s.position.z += 0.05; s.traverse(o => { if (o.isMesh) { o.material.transparent = true; o.material.opacity = 1 - k; } }); });
    this._remove(s);
  }

  // reaching past the last pen: the eye opens
  async wake() {
    const e = this.eye; e.visible = true;
    const { lid, lid2 } = e.userData;
    // the lids pull back from the middle: the top one up, the bottom one down, flattening as they go
    await this.over(0.9, k => { const o = Math.min(1, k * 1.4); this._lids(o); e.scale.setScalar(1 + Math.sin(k * 20) * 0.02); });
  }
  _lids(o) {
    const { lid, lid2 } = this.eye.userData;
    lid.scale.y = lid2.scale.y = 1 - 0.82 * o;
    lid.position.y = 0.36 * o; lid2.position.y = -0.36 * o;
  }
  async sleep() {
    await this.over(0.5, k => this._lids(1 - k));
    this.eye.visible = false;
  }
}
