// dsProps.js — the data structure, made into real harbour objects.
// Every pile of crates IS a stack, and the harbour shows its insides honestly:
//   • a CAPACITY GAUGE: a post behind the pile with one brass notch per slot, numbered [0] [1] [2] …
//   • a TOP POINTER: a bronze arrow with a red tag that slides to the current top (or to -1 when empty)
//   • a SPRAY STENCIL on the stones naming the stack
//   • the HARBOURMASTER'S MANIFEST: a chalkboard that writes the stack out exactly as the code sees it
import * as THREE from "three";

export const FONTS = {
  stencil: "'Allerta Stencil', 'Stardos Stencil', Impact, 'Inter Display Black', sans-serif",
  chalk: "'Cabin Sketch', 'Permanent Marker', 'Courier Prime', 'Courier 10 Pitch', monospace",
  type: "'Courier Prime', 'Courier 10 Pitch', monospace"
};
export async function loadFonts() {
  try { await Promise.all(["24px 'Allerta Stencil'", "24px 'Cabin Sketch'", "24px 'Courier Prime'"].map(f => document.fonts.load(f))); } catch { /* offline: fallbacks */ }
}

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// shrink a font until the text fits the width it has (long names like "tower" must not run off a board)
export function fitFont(g, text, font, maxWidth) {
  const m = /(\d+(?:\.\d+)?)px/.exec(font); if (!m) return font;
  g.font = font;
  const w = g.measureText(text).width;
  if (w <= maxWidth || w === 0) return font;
  return font.replace(m[0], Math.floor(parseFloat(m[1]) * maxWidth / w) + "px");
}

// paint-sprayed text: drawn several times with a slight scatter, then speckled at the edges
export function sprayText(g, text, x, y, font, color, { scatter = 1.6, passes = 6, maxWidth } = {}) {
  g.font = fitFont(g, text, font, maxWidth ?? (x > 0 && x < g.canvas.width ? 2 * Math.min(x, g.canvas.width - x) * 0.92 : Infinity));   // x <= 0: a transformed canvas, leave it
  g.textAlign = "center"; g.textBaseline = "middle";
  for (let i = 0; i < passes; i++) {
    g.globalAlpha = 0.22; g.fillStyle = color;
    g.fillText(text, x + (Math.random() - 0.5) * scatter * 2, y + (Math.random() - 0.5) * scatter * 2);
  }
  g.globalAlpha = 1;
  g.fillText(text, x, y);
  // overspray dots
  const m = g.measureText(text), w = m.width;
  g.fillStyle = color;
  for (let i = 0; i < w * 0.9; i++) {
    g.globalAlpha = Math.random() * 0.5;
    g.fillRect(x - w / 2 + Math.random() * w, y + (Math.random() - 0.5) * parseInt(font) * 1.3, 1.5, 1.5);
  }
  g.globalAlpha = 1;
}

// ---------- stencilled crate face: its value, and its type stamped like a customs mark.
// (The index and memory address belong to the SLOT, not the crate, so they are painted on the
//  gauge beside each slot: a value can move between stacks, a slot never moves.)
// Harbour cargo: in C the crates are plain ints, but some numbers mean something on this island
// (the same names Java uses in HarbourCargo.java)
export const CARGO = { 1: "WATER", 2: "BREAD", 3: "WINE", 8: "ROCKS", 77: "AXE" };
// in the Lab the numbers are just numbers: the cargo names are switched off
export const cargoNames = { on: true };
export function crateFaceTexture(value) {
  const gold = value === 99 && cargoNames.on, name = cargoNames.on ? CARGO[value] : null;
  return canvasTex(512, 256, (g, w, h) => {
    if (name) {
      const col = value === 77 ? "#f0a050" : value === 8 ? "#a9a49a" : "#efe3c6";
      sprayText(g, name, w / 2, h * 0.42, `${name.length > 4 ? 118 : 140}px ${FONTS.stencil}`, col);
      sprayText(g, "= " + value + "  \u00b7  INT", w / 2, h * 0.86, `34px ${FONTS.stencil}`, "#cdb88f", { scatter: 0.8, passes: 2 });
      return;
    }
    sprayText(g, String(value), w / 2, h * 0.45, `150px ${FONTS.stencil}`, gold ? "#2a1606" : "#efe3c6");
    sprayText(g, "INT \u00b7 4 BYTES", w / 2, h * 0.86, `30px ${FONTS.stencil}`, gold ? "#3d2208" : "#cdb88f", { scatter: 0.8, passes: 2 });
  });
}

// ---------- the gauge post + top pointer for one pile
export class StackGauge {
  constructor(scene, { x, y, z, capacity, crateHeight, name, side = -1, base = 0x2A0 }) {
    this.scene = scene; this.capacity = capacity; this.h = crateHeight; this.y0 = y;
    const g = this.group = new THREE.Group();
    g.position.set(x + side * 0.78, y, z - 0.05);
    const wood = new THREE.MeshStandardMaterial({ color: 0x4b3424, roughness: 0.9 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xb08a3e, metalness: 0.85, roughness: 0.35 });
    const postH = capacity * crateHeight + 0.75;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, postH, 0.16), wood);
    post.position.y = postH / 2;
    g.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), wood); foot.position.y = 0.04; g.add(foot);
    // one brass notch per slot, with its index painted beside it
    for (let i = 0; i < capacity; i++) {
      const cy = (i + 0.5) * crateHeight;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.2), brass.clone());
      plate.position.set(0, cy, 0);
      g.add(plate);
      (this.plates ||= []).push(plate);
      // the slot's index and its memory address (4 bytes per int, so addresses go up by 4)
      const addr = "0x" + (base + i * 4).toString(16).toUpperCase();
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({
        map: canvasTex(192, 96, (c, w, h) => { sprayText(c, "[" + i + "]", w / 2, h * 0.36, `40px ${FONTS.stencil}`, "#e8d7b0", { passes: 3 }); sprayText(c, addr, w / 2, h * 0.8, `24px ${FONTS.type}`, "#cdb88f", { passes: 2, scatter: 0.6 }); }),
        transparent: true, roughness: 0.9 }));
      label.position.set(side * 0.04, cy + 0.14, 0.085);
      g.add(label);
    }
    // the slot below [0]: where TOP points when the stack is empty
    const emptyLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), new THREE.MeshStandardMaterial({
      map: canvasTex(128, 64, (c, w, h) => sprayText(c, "-1", w / 2, h / 2, `36px ${FONTS.stencil}`, "#9e8a6a", { passes: 2 })), transparent: true }));
    emptyLabel.position.set(0, 0.16, 0.085);
    g.add(emptyLabel);
    // the name board on top: "STACK s  cap 3"
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 0.05), new THREE.MeshStandardMaterial({
      map: canvasTex(256, 112, (c, w, h) => {
        c.fillStyle = "#2b1d14"; c.fillRect(0, 0, w, h);
        sprayText(c, "STACK " + name, w / 2, h * 0.38, `46px ${FONTS.stencil}`, "#f0c33c", { passes: 4 });
        sprayText(c, "CAP " + capacity, w / 2, h * 0.78, `26px ${FONTS.stencil}`, "#e8d7b0", { passes: 2 });
      }), roughness: 0.85 }));
    board.position.set(0, postH + 0.18, 0.02);
    g.add(board);
    // the TOP pointer: a small cargo crane. Its arm reaches out over the pile, and the hook hangs just
    // above the top crate with a tag clipped to the rope: "TOP [2]". A crane can only grab the crate
    // on top, which is exactly the stack rule. The hook drops to the stones when the pile is empty.
    const over = -side * 0.78;                       // the pile's centre, seen from this post
    this.jibY = postH + 0.62; this.over = over;
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), wood); mast.position.set(0, postH + 0.3, -0.1); g.add(mast);       // behind the name board, so it never covers the name
    const jib = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(over) + 0.3, 0.09, 0.09), wood);
    jib.position.set(over / 2, this.jibY, 0); g.add(jib);
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.06), wood);
    brace.position.set(over * 0.3, this.jibY - 0.2, 0); brace.rotation.z = side * 0.75; g.add(brace);
    const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), brass);
    pulley.rotation.x = Math.PI / 2; pulley.position.set(over, this.jibY - 0.07, 0); g.add(pulley);
    const ropeGeo = new THREE.CylinderGeometry(0.011, 0.011, 1, 6); ropeGeo.translate(0, -0.5, 0);
    this.rope = new THREE.Mesh(ropeGeo, new THREE.MeshStandardMaterial({ color: 0xb59a6a, roughness: 1 }));
    this.rope.position.set(over, this.jibY - 0.07, 0); g.add(this.rope);
    const ptr = this.pointer = new THREE.Group();          // the hook and its tag; moves up and down
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 16, Math.PI * 1.4), brass);
    hook.rotation.z = Math.PI * 0.8; hook.position.y = -0.04;
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), brass); shank.position.y = 0.04;
    this.tagCanvas = document.createElement("canvas"); this.tagCanvas.width = 256; this.tagCanvas.height = 160;
    this.tagTex = new THREE.CanvasTexture(this.tagCanvas); this.tagTex.colorSpace = THREE.SRGBColorSpace;
    this.tagMat = new THREE.MeshStandardMaterial({ map: this.tagTex, roughness: 0.8, emissive: 0xffffff, emissiveMap: this.tagTex, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const tag = this.tag = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.35, 0.02), this.tagMat);
    tag.position.set(0, 0.32, 0.02);
    ptr.add(hook, shank, tag);
    ptr.position.x = over;
    g.add(ptr);
    this.side = side; this.swing = 0; this.stowed = false;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
    this.top = -1;
    this.setTop(-1, true);
  }
  // the hook rests just above the top crate (crates sit with their base on the slot)
  yFor(top) { return (top + 1) * this.h + 0.14; }
  // light a slot's brass notch: "check" (gold, a comparison is being made), "full" (red: overflow),
  // "empty" (red at the -1 mark: underflow). It fades by itself.
  flash(kind, index = this.top) {
    const red = kind !== "check";
    const i = kind === "full" ? this.capacity - 1 : Math.max(0, index);
    this.flashes = (this.flashes || []).concat({ plate: this.plates[i], t: 0, d: red ? 1.6 : 1.0, color: new THREE.Color(red ? 0xff3a1a : 0xffc23a) });
    if (red) this.shake = 0.5;
  }
  // move the pointer; returns a promise-friendly target so callers can animate it
  setTop(top, instant = false) {
    const moved = top !== this.top;
    this.top = top;
    this.target = this.yFor(top);
    this._drawTag();
    if (instant) this.pointer.position.y = this.target;
    else if (moved) this.swing = 0.35;                // the hook swings a little after it moves
  }
  // raise the hook out of the way (while he climbs the pile), or lower it back
  stow(on) { this.stowed = on; }
  // hoist the hook a little so a crate can go on, or come off, under it
  makeRoom(on) { this.room = on; }
  _drawTag() {
    const c = this.tagCanvas.getContext("2d"), w = c.canvas.width, h = c.canvas.height, empty = this.top < 0;
    c.fillStyle = "#2b1d14"; c.fillRect(0, 0, w, h);
    c.strokeStyle = empty ? "#c8261a" : "#f0c33c"; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    sprayText(c, "TOP", w / 2, h * 0.36, `66px ${FONTS.stencil}`, empty ? "#f2a07a" : "#f0c33c", { passes: 3 });
    sprayText(c, empty ? "-1  empty" : "[" + this.top + "]", w / 2, h * 0.76, `48px ${FONTS.type}`, empty ? "#f2a07a" : "#efe1c2", { passes: 2, maxWidth: w * 0.8 });
    this.tagTex.needsUpdate = true;
  }
  update(dt) {
    const want = this.stowed ? this.jibY - 0.45 : this.target + (this.room ? 0.62 : 0);   // hoisted while he works the pile
    this.pointer.position.y += (want - this.pointer.position.y) * Math.min(1, dt * 6);
    this.rope.scale.y = Math.max(0.02, this.jibY - 0.07 - (this.pointer.position.y + 0.09));
    if (this.swing > 0) this.swing = Math.max(0, this.swing - dt * 0.35);
    this.pointer.rotation.z = Math.sin(performance.now() * 0.006) * this.swing * 0.5;
    for (const f of this.flashes || []) {
      f.t += dt;
      const k = Math.max(0, 1 - f.t / f.d) * (0.6 + 0.4 * Math.sin(f.t * 22));
      f.plate.material.emissive.copy(f.color).multiplyScalar(k * 2.2);
    }
    this.flashes = (this.flashes || []).filter(f => f.t < f.d || (f.plate.material.emissive.setRGB(0, 0, 0), false));
    if (this.shake > 0) { this.shake -= dt; this.pointer.position.x = this.over + Math.sin(this.shake * 60) * 0.04 * this.shake; } else this.pointer.position.x = this.over;
    // a red tag while a check fails (overflow / underflow), gold otherwise
    const red = (this.flashes || []).some(f => f.color.r > 0.9 && f.color.g < 0.5);
    this.tagMat.emissive.setRGB(1, red ? 0.25 : 1, red ? 0.15 : 1); this.tagMat.emissiveIntensity = red ? 0.9 : 0.35;
  }
}

// ---------- a spray-painted stack name on the stones in front of a pile
export function floorStencil(scene, x, y, z, name) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshStandardMaterial({
    map: canvasTex(256, 128, (c, w, h) => {
      sprayText(c, name, w / 2, h * 0.55, `92px ${FONTS.stencil}`, "#f0c33c", { scatter: 2.5, maxWidth: w * 0.84 });
      c.strokeStyle = "rgba(240,195,60,0.85)"; c.lineWidth = 6; c.setLineDash([14, 10]);
      c.strokeRect(8, 8, w - 16, h - 16);
    }), transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.012, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}

// ---------- the harbourmaster's chalkboard, written as code would print the stacks
export class Manifest {
  constructor(scene, { x, y, z, rotationY = 0 }) {
    this.canvas = document.createElement("canvas"); this.canvas.width = 768; this.canvas.height = 512;
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 8;
    const g = this.group = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: 0x3e2a1c, roughness: 0.9 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.27, 0.05), new THREE.MeshStandardMaterial({ map: this.tex, roughness: 0.95 }));
    board.position.y = 1.55;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.02, 1.39, 0.04), wood); frame.position.set(0, 1.55, -0.02);
    g.add(board, frame);
    for (const [lx, rz] of [[-0.75, 0.25], [0.75, 0.25], [0, -0.45]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 2.3, 0.07), wood);
      leg.position.set(lx, 1.1, rz * 0.6 - 0.05); leg.rotation.x = rz * 0.5;
      g.add(leg);
    }
    g.position.set(x, y, z); g.rotation.y = rotationY;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(g);
  }
  // stacks: [{ name, capacity, items: [..] }]
  write(stacks, note = "") {
    const g = this.canvas.getContext("2d"), w = this.canvas.width, h = this.canvas.height;
    g.fillStyle = "#1f2622"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(220,220,210,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 30, 1 + Math.random() * 3); }  // old smudges
    const chalk = (t, x, y, size, col = "#ece6d6") => {
      g.font = `${size}px ${FONTS.chalk}`; g.textAlign = "left"; g.textBaseline = "alphabetic";
      for (let k = 0; k < 3; k++) { g.globalAlpha = 0.35; g.fillStyle = col; g.fillText(t, x + (Math.random() - 0.5) * 1.5, y + (Math.random() - 0.5) * 1.5); }
      g.globalAlpha = 1;
    };
    chalk("HARBOUR MANIFEST", 34, 66, 46, "#f0d27a");
    g.strokeStyle = "rgba(236,230,214,0.6)"; g.lineWidth = 3; g.beginPath(); g.moveTo(34, 82); g.lineTo(w - 34, 86); g.stroke();
    let y = 140;
    for (const s of stacks) {
      const top = s.items.length - 1;
      chalk(`${s.name} = [${s.items.join(", ")}]`, 40, y, 40);
      chalk(`top = ${top}`, 400, y, 38, top === s.capacity - 1 ? "#f2a07a" : "#a8d8c0");
      chalk(top < 0 ? "empty" : top === s.capacity - 1 ? "FULL" : `${s.capacity - top - 1} free`, 590, y, 30, "#c8c2b0");
      y += 72;
    }
    if (note) chalk(note, 40, h - 34, 32, "#f0d27a");
    // erase specks so it reads as chalk
    for (let i = 0; i < 9000; i++) { g.fillStyle = "rgba(31,38,34,0.55)"; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
    this.tex.needsUpdate = true;
  }
}

