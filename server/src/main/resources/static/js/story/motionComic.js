// motionComic.js — a comic-book cutscene engine. Flat inked art drawn as SVG, cut like a film.
// Everything is code: figures are posed skeletons drawn as thick ink limbs with a gold rim of light,
// backgrounds are layered shapes, the lettering is real text. Time runs on the director's clock,
// so it slows, skips and screenshots exactly like the rest of the game.
//
//   const mc = new MotionComic(director);
//   mc.shot(svg)                 – cut to a new panel (an SVG string, 1600 x 900)
//   await mc.run(s, k => ...)    – animate for s seconds, k goes 0 → 1
//   mc.sfx("KRAK!", {...})       – slam a sound effect
//   await mc.card(name, sub)     – a freeze-frame name card
//   await mc.prompt("SWING!")    – wait for the player
export const W = 1600, H = 900;
export const C = {
  ink: "#0b0b0d", paper: "#efe6d2", storm: "#10282f", storm2: "#1d4651", sea: "#0a2129",
  gold: "#f2c230", red: "#d22a1e", blood: "#8f1610", skin: "#b9784a", iron: "#5d6266", wood: "#4a2c16", dawn: "#f59a2c",
};
const R = Math.PI / 180;
const dir = a => [Math.sin(a * R), Math.cos(a * R)];          // 0 = down, 90 = right, 180 = up, -90 = left
const P = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
export const lerp = (a, b, k) => a + (b - a) * k;
export const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
export const easeOut = k => 1 - Math.pow(1 - k, 3);
export const easeIn = k => k * k * k;
let seed = 11; export const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

// ---------------------------------------------------------------- figures
// A pose: hip at (x, y); every limb angle is absolute (0 down, 90 right, 180 up).
//   lean: the torso's tilt (+ leans right).  arms/legs: [upper, lower].  face: 1 looks right, -1 left.
const MAN = { torso: 62, up: 32, fore: 30, thigh: 44, shin: 44, head: 13, sh: 19, hp: 13, arm: 13, leg: 17 };
const BRUTE = { torso: 70, up: 40, fore: 38, thigh: 46, shin: 46, head: 15, sh: 34, hp: 18, arm: 24, leg: 26 };
function skel(p, b) {
  const add = (a, ang, len) => { const d = dir(ang); return [a[0] + d[0] * len, a[1] + d[1] * len]; };
  const face = p.face || 1, hip = [0, 0], td = dir(180 - (p.lean || 0)), sh = [td[0] * b.torso, td[1] * b.torso];
  const perp = [-td[1], td[0]];
  const nk = add(sh, 180 - (p.lean || 0), 7), hd = add(nk, 180 - (p.lean || 0) - (p.head || 0) * face, b.head * 0.9);
  const limb = (from, [u, l], lu, ll) => { const m = add(from, u, lu); return [from, m, add(m, l, ll)]; };
  return { face, hip, sh, perp, hd, aB: limb(sh, p.aB || [10, 20], b.up, b.fore), aF: limb(sh, p.aF || [-10, -20], b.up, b.fore),
    lB: limb(hip, p.lB || [8, 0], b.thigh, b.shin), lF: limb(hip, p.lF || [-8, 0], b.thigh, b.shin) };
}
// where a figure's joints land on the panel (to put a boulder in his hands, a foot on a rock…)
export function joints(p, o = {}) {
  const k = skel(p, o.brute ? BRUTE : MAN), s = o.scale || 1, T = q => [p.x + q[0] * s, p.y + q[1] * s];
  return { head: T(k.hd), shoulder: T(k.sh), handF: T(k.aF[2]), handB: T(k.aB[2]), footF: T(k.lF[2]), footB: T(k.lB[2]) };
}
export function figure(p, o = {}) {
  const b = o.brute ? BRUTE : MAN, s = o.scale || 1;
  const { face, sh, perp, hd, aB, aF, lB, lF } = skel(p, b);
  const line = (pts, w) => `<polyline points="${pts.map(q => P(q[0], q[1])).join(" ")}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const torso = `<polygon points="${[[sh[0] + perp[0] * b.sh, sh[1] + perp[1] * b.sh], [sh[0] - perp[0] * b.sh, sh[1] - perp[1] * b.sh], [-perp[0] * b.hp, -perp[1] * b.hp], [perp[0] * b.hp, perp[1] * b.hp]].map(q => P(q[0], q[1])).join(" ")}"/>`;
  // the head: a skull, a beard or a heavy brow; drawn in the body colour, the eyes added on top
  const hx = hd[0], hy = hd[1], r = b.head;
  const head = o.brute
    ? `<ellipse cx="${hx}" cy="${hy}" rx="${r * 1.15}" ry="${r}"/><polygon points="${P(hx - r * 1.3, hy - r * 0.15)} ${P(hx + r * 1.3, hy - r * 0.15)} ${P(hx + r * 0.9 * face, hy + r * 1.1)} ${P(hx - r * 0.7 * face, hy + r * 1.0)}"/><polygon points="${P(hx - r * 1.35, hy - r * 0.35)} ${P(hx + r * 1.35, hy - r * 0.35)} ${P(hx + r * 1.2, hy + r * 0.05)} ${P(hx - r * 1.2, hy + r * 0.05)}"/>`
    : `<circle cx="${hx}" cy="${hy}" r="${r}"/><polygon points="${P(hx - r * 0.2 * face, hy + r * 0.2)} ${P(hx + r * 1.05 * face, hy + r * 0.25)} ${P(hx + r * 0.55 * face, hy + r * 1.75)} ${P(hx - r * 0.3 * face, hy + r * 1.1)}"/><path d="M${P(hx - r * 1.05 * face, hy - r * 0.2)} Q${P(hx - r * 0.2 * face, hy - r * 1.7)} ${P(hx + r * 0.95 * face, hy - r * 0.5)} Z"/>`;
  // fists, and for the brute a hunch of muscle between head and shoulders and a heavy belt
  const fist = a => `<circle cx="${a[2][0]}" cy="${a[2][1]}" r="${b.arm * (o.brute ? 0.85 : 0.7)}"/>`;
  const hunch = o.brute ? `<polygon points="${P(sh[0] + perp[0] * b.sh * 0.95, sh[1] + perp[1] * b.sh * 0.95)} ${P(hx, hy + r * 0.2)} ${P(sh[0] - perp[0] * b.sh * 0.95, sh[1] - perp[1] * b.sh * 0.95)}"/>` : "";
  const belt = o.brute ? `<polygon points="${P(perp[0] * b.hp * 1.25, perp[1] * b.hp * 1.25)} ${P(-perp[0] * b.hp * 1.25, -perp[1] * b.hp * 1.25)} ${P(-perp[0] * b.hp * 1.3 + perp[1] * 14, -perp[1] * b.hp * 1.3 + 14)} ${P(perp[0] * b.hp * 1.3 + perp[1] * 14, perp[1] * b.hp * 1.3 + 14)}"/>` : "";
  const body = c => `<g fill="${c}" stroke="${c}">${line(aB, b.arm)}${fist(aB)}${line(lB, b.leg)}${torso}${hunch}${belt}${line(lF, b.leg)}${line(aF, b.arm)}${fist(aF)}${head}</g>`;
  // the cape, flowing from the shoulders toward capeA
  let cape = "";
  if (o.cape != null) {
    const cd = dir(o.cape), w2 = o.capeLen || 95, l1 = [sh[0] + perp[0] * b.sh, sh[1] + perp[1] * b.sh], l2 = [sh[0] - perp[0] * b.sh, sh[1] - perp[1] * b.sh];
    const e1 = [l1[0] + cd[0] * w2 + 18, l1[1] + cd[1] * w2], e2 = [l2[0] + cd[0] * w2 * 1.15 - 10, l2[1] + cd[1] * w2 * 1.15 + 14];
    cape = `<path d="M${P(...l1)} Q${P((l1[0] + e1[0]) / 2 + 14, (l1[1] + e1[1]) / 2 - 10)} ${P(...e1)} L${P(...e2)} Q${P((l2[0] + e2[0]) / 2 - 10, (l2[1] + e2[1]) / 2 + 8)} ${P(...l2)} Z" fill="${C.blood}" stroke="${C.ink}" stroke-width="3"/>`;
  }
  // the axe, in the front hand
  let axe = "";
  if (o.axe != null) {                                  // handle along local -y from the fist, a crescent blade on one side
    const hand = aF[2], th = 180 - o.axe, bs = o.axeSide || 1;
    axe = `<g transform="translate(${P(hand[0], hand[1])}) rotate(${th.toFixed(1)}) scale(${bs},1)">`
      + `<line x1="0" y1="12" x2="0" y2="-66" stroke="${C.ink}" stroke-width="8" stroke-linecap="round"/>`
      + `<path d="M0,-44 L8,-50 Q30,-74 42,-58 Q50,-38 42,-18 Q30,-4 8,-26 L0,-32 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="3.5" stroke-linejoin="round"/>`
      + `<path d="M0,-42 L-14,-38 L0,-34 Z" fill="${C.ink}"/></g>`;
  }
  const eyes = o.brute ? `<g fill="${C.red}" filter="url(#glow)"><ellipse cx="${hx + r * 0.15 * face - r * 0.45}" cy="${hy - r * 0.08}" rx="${r * 0.28}" ry="${r * (o.eyesWide ? 0.22 : 0.1)}"/><ellipse cx="${hx + r * 0.15 * face + r * 0.45}" cy="${hy - r * 0.08}" rx="${r * 0.28}" ry="${r * (o.eyesWide ? 0.22 : 0.1)}"/></g>` : "";
  const rim = o.rim === false ? "" : `<g transform="translate(${-(o.rimX ?? 3)},${-(o.rimY ?? 2)})">${body(o.rimColor || C.gold)}</g>`;
  return `<g transform="translate(${p.x},${p.y}) scale(${s})">${cape}${rim}${body(o.color || C.ink)}${eyes}${axe}</g>`;
}
// blend two poses
export function mix(a, b, k) {
  const o = {};
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const u = a[key] ?? b[key], v = b[key] ?? a[key];
    o[key] = Array.isArray(u) ? u.map((x, i) => lerp(x, v[i], k)) : (typeof u === "number" ? lerp(u, v, k) : v);
  }
  return o;
}

// ---------------------------------------------------------------- scenery helpers
export function speedLines(cx, cy, n = 60, r1 = 260, r2 = 1500, color = C.paper, w = [2, 9]) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2, q1 = r1 + rnd() * 160, ww = w[0] + rnd() * (w[1] - w[0]);
    const p1 = [cx + Math.cos(a) * q1, cy + Math.sin(a) * q1], p2 = [cx + Math.cos(a - 0.008) * r2, cy + Math.sin(a - 0.008) * r2], p3 = [cx + Math.cos(a + 0.008) * r2, cy + Math.sin(a + 0.008) * r2];
    s += `<polygon points="${P(...p1)} ${P(...p2)} ${P(...p3)}" fill="${color}" opacity="${0.35 + rnd() * 0.5}" stroke="${color}" stroke-width="${ww * 0.2}"/>`;
  }
  return `<g>${s}</g>`;
}
export function streaks(angle, n = 40, color = C.paper, opacity = 0.5, len = [200, 700]) {   // parallel motion lines
  let s = ""; const d = dir(angle);
  for (let i = 0; i < n; i++) {
    const x = rnd() * W * 1.4 - W * 0.2, y = rnd() * H * 1.4 - H * 0.2, l = len[0] + rnd() * (len[1] - len[0]);
    s += `<line x1="${x}" y1="${y}" x2="${x + d[0] * l}" y2="${y + d[1] * l}" stroke="${color}" stroke-width="${1.5 + rnd() * 5}" opacity="${opacity * (0.4 + rnd() * 0.6)}" stroke-linecap="round"/>`;
  }
  return s;
}
export function rain(id, n = 140, color = "#9fc4cc", opacity = 0.45) {
  let s = "";
  for (let i = 0; i < n; i++) { const x = rnd() * (W + 400) - 200, y = rnd() * H * 2 - H, l = 30 + rnd() * 60; s += `<line x1="${x}" y1="${y}" x2="${x - l * 0.28}" y2="${y + l}" />`; }
  return `<g id="${id}" stroke="${color}" stroke-width="2" opacity="${opacity}">${s}</g>`;
}
export function bolt(x, y, len = 520, w = 7) {
  let pts = [[x, y]], cx = x, cy = y;
  while (cy < y + len) { cx += (rnd() - 0.5) * 90; cy += 30 + rnd() * 50; pts.push([cx, cy]); }
  const d = pts.map((q, i) => (i ? "L" : "M") + P(...q)).join(" ");
  return `<path d="${d}" stroke="#ffffff" stroke-width="${w}" fill="none" filter="url(#glow)" stroke-linejoin="bevel"/><path d="${d}" stroke="#dff6ff" stroke-width="${w * 0.35}" fill="none"/>`;
}
export function boulder(x, y, r, rot = 0, rim = true) {
  let pts = []; for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2, rr = r * (0.82 + rnd() * 0.28); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  const poly = pts.map(q => P(...q)).join(" ");
  const cracks = `<polyline points="${P(-r * 0.4, -r * 0.2)} ${P(-r * 0.05, r * 0.05)} ${P(r * 0.1, r * 0.45)}" stroke="${C.ink}" stroke-width="${r * 0.04}" fill="none"/><polyline points="${P(r * 0.15, -r * 0.55)} ${P(r * 0.3, -r * 0.2)}" stroke="${C.ink}" stroke-width="${r * 0.035}" fill="none"/>`;
  return `<g transform="translate(${x},${y}) rotate(${rot})">${rim ? `<polygon points="${poly}" fill="${C.gold}" transform="translate(${-r * 0.05},${-r * 0.05})"/>` : ""}<polygon points="${poly}" fill="#4d4640" stroke="${C.ink}" stroke-width="${r * 0.05}"/><polygon points="${poly}" fill="url(#halftone)" opacity="0.5"/>${cracks}</g>`;
}
export function crate(x, y, w, label, gold = false, sub = "") {
  return `<g transform="translate(${x},${y})"><rect x="${-w / 2}" y="${-w}" width="${w}" height="${w}" fill="${gold ? C.gold : C.wood}" stroke="${C.ink}" stroke-width="${w * 0.06}"/>`
    + `<line x1="${-w / 2}" y1="${-w}" x2="${w / 2}" y2="0" stroke="${C.ink}" stroke-width="${w * 0.04}" opacity="0.6"/>`
    + `<text x="0" y="${-w * 0.36}" font-family="Anton, Impact, sans-serif" font-size="${w * 0.42}" text-anchor="middle" fill="${gold ? C.ink : C.gold}">${label}</text>`
    + (sub ? `<text x="0" y="${-w * 0.1}" font-family="'Courier Prime', monospace" font-weight="700" font-size="${w * 0.16}" text-anchor="middle" fill="${gold ? C.ink : C.paper}">${sub}</text>` : "") + `</g>`;
}
export function chainLinks(x1, y1, x2, y2, size = 26, color = C.iron, sag = 0) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / (size * 1.25)));
  let s = "";
  for (let i = 0; i <= n; i++) {
    const k = i / n, x = lerp(x1, x2, k), y = lerp(y1, y2, k) + Math.sin(k * Math.PI) * sag, a = Math.atan2(y2 - y1, x2 - x1) / R;
    s += i % 2
      ? `<rect x="${x - size * 0.8}" y="${y - size * 0.2}" width="${size * 1.6}" height="${size * 0.4}" rx="${size * 0.2}" fill="${color}" stroke="${C.ink}" stroke-width="${size * 0.12}" transform="rotate(${a},${x},${y})"/>`
      : `<rect x="${x - size * 0.8}" y="${y - size * 0.5}" width="${size * 1.6}" height="${size}" rx="${size * 0.5}" fill="none" stroke="${C.ink}" stroke-width="${size * 0.42}" transform="rotate(${a},${x},${y})"/><rect x="${x - size * 0.8}" y="${y - size * 0.5}" width="${size * 1.6}" height="${size}" rx="${size * 0.5}" fill="none" stroke="${color}" stroke-width="${size * 0.22}" transform="rotate(${a},${x},${y})"/>`;
  }
  return s;
}
export function trireme(x, y, s = 1, oarPhase = 0) {
  let oars = "";
  for (let i = 0; i < 9; i++) { const ox = -150 + i * 34, sw = Math.sin(oarPhase + i * 0.3) * 14; oars += `<line x1="${ox}" y1="10" x2="${ox - 22 + sw}" y2="62" stroke="${C.ink}" stroke-width="5"/>`; }
  return `<g transform="translate(${x},${y}) scale(${s})">${oars}`
    + `<path d="M-200,-8 L170,-8 Q215,-10 238,-44 L246,-40 Q232,8 190,22 L-170,22 Q-205,16 -226,-30 L-216,-34 Q-210,-12 -200,-8 Z" fill="${C.ink}"/>`
    + `<path d="M-200,-8 L170,-8" stroke="${C.gold}" stroke-width="3"/>`
    + `<circle cx="196" cy="4" r="7" fill="${C.paper}"/><circle cx="198" cy="4" r="3.5" fill="${C.red}"/>`
    + `<line x1="-10" y1="-8" x2="-10" y2="-190" stroke="${C.ink}" stroke-width="7"/>`
    + `<path d="M-95,-182 L75,-182 Q86,-110 75,-44 L-95,-44 Q-106,-110 -95,-182 Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="4"/>`
    + `<rect x="-95" y="-128" width="170" height="20" fill="${C.red}"/></g>`;
}

// ---------------------------------------------------------------- the engine
const CSS = `
#mcomic { position: fixed; inset: 0; z-index: 9000; background: #000; opacity: 0; transition: opacity .25s; }
#mcomic.on { opacity: 1; }
#mcomic svg { position: absolute; inset: 0; width: 100%; height: 100%; }
#mcomic .mc-skip { position: absolute; right: 18px; bottom: 14px; font: 700 12px 'Courier Prime', monospace; letter-spacing: 2px; color: #8a8270; background: none; border: 1px solid #3a352c; padding: 6px 10px; cursor: pointer; }
#mcomic .mc-skip:hover { color: #f2c230; border-color: #f2c230; }`;
export class MotionComic {
  constructor(director) {
    this.d = director; this.skipped = false;
    if (!document.getElementById("mcomic-css")) { const st = document.createElement("style"); st.id = "mcomic-css"; st.textContent = CSS; document.head.appendChild(st); }
    const el = this.el = document.createElement("div"); el.id = "mcomic";
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="halftone" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.9" fill="#000"/></pattern>
        <pattern id="halftoneL" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.6" fill="#fff"/></pattern>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="mono"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.35" intercept="-0.12"/><feFuncG type="linear" slope="1.35" intercept="-0.12"/><feFuncB type="linear" slope="1.35" intercept="-0.12"/></feComponentTransfer></filter>
        <filter id="neg"><feColorMatrix type="matrix" values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/></filter>
        <clipPath id="frame"><rect x="0" y="0" width="${W}" height="${H}"/></clipPath>
      </defs>
      <g clip-path="url(#frame)"><g id="mc-shake"><g id="mc-cam"></g></g></g>
      <g id="mc-letter"></g>
      <rect id="mc-flash" x="0" y="0" width="${W}" height="${H}" fill="#fff" opacity="0" pointer-events="none"/>
    </svg><button class="mc-skip">SKIP ▸▸ (Esc)</button>`;
    document.body.appendChild(el);
    this.svg = el.querySelector("svg"); this.cam = el.querySelector("#mc-cam"); this.shk = el.querySelector("#mc-shake");
    this.letter = el.querySelector("#mc-letter"); this.flashR = el.querySelector("#mc-flash");
    const skip = () => { this.skipped = true; };
    el.querySelector(".mc-skip").onclick = skip;
    this._key = e => { if (e.key === "Escape") skip(); };
    addEventListener("keydown", this._key);
    this._shake = 0;
    this._tick = director._move(1e9, () => {           // a per-frame heartbeat for the shake
      if (this._shake > 0.01) { const a = this._shake * 26; this.shk.setAttribute("transform", `translate(${(Math.random() - 0.5) * a},${(Math.random() - 0.5) * a})`); this._shake *= 0.86; }
      else if (this._shake) { this._shake = 0; this.shk.removeAttribute("transform"); }
    }, true);
    requestAnimationFrame(() => el.classList.add("on"));
  }
  get fast() { return this.skipped || this.d.skipping; }
  wait(s) { return this.fast ? Promise.resolve() : this.d._wait(s); }
  run(s, fn) { if (this.fast) { fn(1); return Promise.resolve(); } fn(0); return this.d._move(s, fn, true); }   // fn(0) now: no blank frame at a cut
  $(id) { return this.svg.querySelector("#" + id); }
  // cut: replace the panel; filters: "mono" | "neg" | ""
  shot(svg, { filter = "" } = {}) {
    this.cam.innerHTML = svg; this.letter.innerHTML = "";
    this.cam.parentNode.setAttribute("filter", filter ? `url(#${filter})` : "");
    if (!filter) this.cam.parentNode.removeAttribute("filter");
    this.cam.setAttribute("transform", "");
  }
  // push the camera: zoom about (cx, cy)
  zoom(z, cx = W / 2, cy = H / 2, dx = 0, dy = 0) { this.cam.setAttribute("transform", `translate(${cx + dx},${cy + dy}) scale(${z}) translate(${-cx},${-cy})`); }
  move(id, x, y, extra = "") { const n = this.$(id); if (n) n.setAttribute("transform", `translate(${x},${y}) ${extra}`); }
  shake(a = 1) { this._shake = Math.max(this._shake, a); }
  flash(peak = 1, s = 0.35, color = "#fff") {
    this.flashR.setAttribute("fill", color);
    return this.run(s, k => this.flashR.setAttribute("opacity", (peak * (1 - k)).toFixed(3)));
  }
  // lettering ------------------------------------------------------
  sfx(text, { x = 800, y = 300, r = -8, size = 150, fill = C.gold, stroke = C.ink, seconds = 1.2, font = "Anton, Impact, sans-serif", sw } = {}) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = `<text x="0" y="0" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-size="${size}" fill="${fill}" stroke="${stroke}" stroke-width="${sw ?? size * 0.09}" paint-order="stroke" stroke-linejoin="round" letter-spacing="${size * 0.02}">${text}</text>`;
    this.letter.appendChild(g);
    this.run(seconds, k => {
      const pop = k < 0.12 ? lerp(size > 160 ? 1.35 : 1.8, 1, easeOut(k / 0.12)) : 1 + (k - 0.12) * 0.12;
      g.setAttribute("transform", `translate(${x},${y}) rotate(${r}) scale(${pop})`);
      g.setAttribute("opacity", k > 0.82 ? (1 - (k - 0.82) / 0.18).toFixed(3) : 1);
    }).then(() => g.remove());
    return g;
  }
  // a caption box: yellow, typewritten
  async caption(text, { x = 60, y = 70, seconds = 2.4, w } = {}) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g"), fs = 30, bw = w || text.length * fs * 0.62 + 44;
    g.innerHTML = `<rect x="${x + 6}" y="${y + 6}" width="${bw}" height="${fs + 30}" fill="${C.ink}"/><rect x="${x}" y="${y}" width="${bw}" height="${fs + 30}" fill="${C.gold}" stroke="${C.ink}" stroke-width="4"/><text x="${x + 22}" y="${y + fs + 7}" font-family="'Courier Prime', monospace" font-weight="700" font-size="${fs}" fill="${C.ink}"></text>`;
    this.letter.appendChild(g);
    const t = g.querySelector("text");
    await this.run(Math.min(0.9, text.length * 0.035), k => { t.textContent = text.slice(0, Math.ceil(k * text.length)); });
    await this.wait(seconds);
    return g;
  }
  // a freeze-frame name card (Tarantino): the panel goes black-and-white, the name slams in red
  async card(name, sub, { seconds = 2.2, x = 90, y = 600, color = C.red, mono = true } = {}) {
    if (mono) this.cam.parentNode.setAttribute("filter", "url(#mono)");
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = `<text x="${x}" y="${y}" font-family="Anton, Impact, sans-serif" font-size="150" fill="${color}" stroke="${C.ink}" stroke-width="10" paint-order="stroke" letter-spacing="4">${name}</text>`
      + `<text x="${x + 8}" y="${y + 62}" font-family="'Courier Prime', monospace" font-weight="700" font-size="34" fill="${C.paper}" stroke="${C.ink}" stroke-width="6" paint-order="stroke"></text>`;
    this.letter.appendChild(g);
    const big = g.firstChild, small = g.lastChild;
    this.d.world && (this.d.world.timeScale = this.d.world.timeScale);
    await this.run(0.18, k => big.setAttribute("transform", `translate(${(1 - easeOut(k)) * -60},0)`));
    await this.run(Math.min(1.0, sub.length * 0.03), k => { small.textContent = sub.slice(0, Math.ceil(k * sub.length)); });
    await this.wait(seconds);
    g.remove(); this.cam.parentNode.removeAttribute("filter");
  }
  // a chapter card on black
  async chapterCard(small, big) {
    this.shot(`<rect width="${W}" height="${H}" fill="${C.ink}"/>`);
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = `<text x="${W / 2}" y="${H / 2 - 150}" text-anchor="middle" font-family="'Courier Prime', monospace" font-size="30" letter-spacing="12" fill="${C.paper}"></text>`
      + `<text x="${W / 2}" y="${H / 2 + 60}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="220" letter-spacing="10" fill="${C.gold}" opacity="0">${big}</text>`;
    this.letter.appendChild(g);
    const a = g.firstChild, b = g.lastChild;
    await this.run(0.9, k => { a.textContent = small.slice(0, Math.ceil(k * small.length)); });
    await this.wait(0.35);
    await this.run(0.16, k => { b.setAttribute("opacity", k); b.setAttribute("transform", `translate(${W / 2},${H / 2}) scale(${lerp(1.5, 1, easeOut(k))}) translate(${-W / 2},${-H / 2})`); });
    this.shake(0.5);
    await this.wait(1.5);
  }
  // wait for the player (Space or a click); window.__autoPress answers by itself (tests)
  prompt(word = "SWING!", label = "PRESS SPACE") {
    if (this.fast) return Promise.resolve();
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = `<text x="${W / 2}" y="${H * 0.78}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="140" fill="${C.red}" stroke="${C.ink}" stroke-width="12" paint-order="stroke">${word}</text>`
      + `<text x="${W / 2}" y="${H * 0.78 + 56}" text-anchor="middle" font-family="'Courier Prime', monospace" font-weight="700" font-size="30" letter-spacing="8" fill="${C.paper}" stroke="${C.ink}" stroke-width="6" paint-order="stroke">${label}</text>`;
    this.letter.appendChild(g);
    const pulse = this.d._move(1e9, () => { const s = 1 + Math.sin(performance.now() / 120) * 0.04; g.firstChild.setAttribute("transform", `translate(${W / 2},${H * 0.78}) scale(${s}) translate(${-W / 2},${-H * 0.78})`); }, true);
    return new Promise(res => {
      let done = false;
      const fin = () => { if (done) return; done = true; removeEventListener("keydown", onKey); this.svg.removeEventListener("pointerdown", fin); clearInterval(watch); g.remove(); res(); };
      const onKey = e => { if (e.code === "Space" || e.key === " " || e.key === "Enter") { e.preventDefault(); fin(); } };
      addEventListener("keydown", onKey); this.svg.addEventListener("pointerdown", fin);
      const watch = setInterval(() => { if (this.fast) fin(); }, 100);
      if (window.__autoPress) this.d._wait(window.__autoPress).then(fin);
    });
  }
  async close() {
    removeEventListener("keydown", this._key);
    this.el.classList.remove("on");
    await new Promise(r => setTimeout(r, 260));
    this.el.remove();
    const i = this.d.moves.findIndex(m => m.d === 1e9); if (i >= 0) this.d.moves.splice(i, 1);
    this.d.moves = this.d.moves.filter(m => m.d !== 1e9);
  }
}
