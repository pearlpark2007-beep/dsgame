// seaChart.js — the voyage map as a real place: the wine-dark sea at night, seen from high above.
// Troy burning at the edge, the four islands of the voyage as sculpted land (each with its own landmark),
// the gold route laid on the water, Poseidon's maelstrom turning between them, and the sea past the
// Underworld lost in fog. It only READS the saved progress (progress.js); clicking an island voyages there.
// Its own small renderer: the title screen's sea is paused while the chart is open, so only one draws.
import * as THREE from "three";
import { CHAPTERS, status, continueTo } from "./progress.js";
import { buildTrireme } from "../islands/harbour/trireme.js";

// ---------- where things sit (world units; x east, z south). Same layout as the old paper chart.
const AT = { troy: [-84, -46], harbour: [-46, -18], cave: [-10, 22], circe: [24, -20], underworld: [58, 20] };
const R = { harbour: 11, cave: 12, circe: 11.5, underworld: 11 };
const MAEL = [24, 50];
const BEYOND_AT = [[86, 54, 6], [104, 74, 5], [126, 96, 7]];
const FOG = new THREE.Color(0x061015);

// ---------- a little deterministic noise (value noise + fbm), so every island is the same every time
function hash(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct = 5) { let f = 0, amp = 0.5, fr = 1; for (let i = 0; i < oct; i++) { f += amp * (vnoise(x * fr, y * fr, s + i * 17) * 2 - 1); amp *= 0.5; fr *= 2.03; } return f; }
const ridge = (x, y, s) => 1 - Math.abs(fbm(x, y, s, 4));

// a soft round glow, drawn once and shared by every lamp, fire and gate
let glowTex = null;
function glow(color, size, opacity = 1) {
  if (!glowTex) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,.45)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(size); return s;
}

// ---------- land: a height field shaped by a profile, coloured by height and steepness
function land(size, seg, heightAt, paint, seed) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) p.setY(i, heightAt(p.getX(i), p.getZ(i)));
  g.computeVertexNormals();
  const n = g.attributes.normal, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    paint(c, y, n.getY(i), fbm(x * 0.35, z * 0.35, seed + 5, 3), x, z);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.93, metalness: 0 }));
  m.castShadow = true; m.receiveShadow = true; return m;
}
const C = (h) => new THREE.Color(h);
const SAND = C(0xb19a72), WET = C(0x5e5444), ROCK = C(0x6e665c), DARK = C(0x45403a), GRASS = C(0x5a7346), FOREST = C(0x2f4a2c), BASALT = C(0x2c2a2d), ASH = C(0x625a54);
function mixTo(c, a, b, k) { c.copy(a).lerp(b, Math.min(1, Math.max(0, k))); }
// the shore is sand, the steep parts are bare rock, the rest is whatever the island is made of
function painter(top, steepRock = ROCK) {
  return (c, y, ny, n) => {
    if (y < 0.15) return mixTo(c, WET, SAND, (y + 0.6) / 0.75);
    if (y < 1.1) return mixTo(c, SAND, top, (y - 0.15) / 0.95 + n * 0.3);
    mixTo(c, top, steepRock, (1 - ny) * 2.4 - 0.35 + n * 0.25);
    c.multiplyScalar(0.9 + n * 0.2);
  };
}

// ---------- the four islands, each with the landmark the player will remember
function harbourIsle() {
  const g = new THREE.Group(), r = R.harbour, mouth = Math.atan2(-0.35, -1);      // the harbour mouth looks west, toward Troy
  const h = (x, z) => {
    const d = Math.hypot(x, z) / r, a = Math.atan2(z, x);
    let da = Math.abs(a - mouth); da = Math.min(da, Math.PI * 2 - da);
    const gap = 1 - Math.exp(-Math.pow(da / 0.32, 2));
    const ringH = 6.2 * Math.exp(-Math.pow((d - 0.66) / 0.2, 2)) * (0.25 + 0.75 * gap);
    return ringH + ridge(x * 0.22, z * 0.22, 11) * 2.0 * Math.max(0, 1 - Math.abs(d - 0.66) * 2.2) - (d < 0.42 ? 3 : 0) - Math.max(0, d - 0.9) * 9 - 1.2;
  };
  g.add(land(r * 2.5, 110, h, painter(C(0x7a6e5c), DARK), 11));
  // the two towers at the narrow mouth, each with its watch fire
  const stone = new THREE.MeshStandardMaterial({ color: 0x6d655a, roughness: 0.9 });
  for (const s of [-1, 1]) {
    const a = mouth + s * 0.42, x = Math.cos(a) * r * 0.7, z = Math.sin(a) * r * 0.7, y = Math.max(0, h(x, z)) - 0.5;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.15, 5.2, 10), stone); t.position.set(x, y + 2.6, z); t.castShadow = true; g.add(t);
    const f = glow(0xff9a48, 4.2, 0.95); f.position.set(x, y + 5.7, z); g.add(f);
  }
  const l = new THREE.PointLight(0xff9a48, 40, 30, 1.6); l.position.set(r * 0.6, 7, -r * 0.2); g.add(l);
  // three ships moored in the lagoon: what the giants are about to break
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.55), new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.8 }));
    s.position.set(-2.6 + i * 2.2, 0.1, -1 + i * 1.1); s.rotation.y = 0.4 - i * 0.25; g.add(s);
  }
  return g;
}
function caveIsle() {
  const g = new THREE.Group(), r = R.cave;
  const h = (x, z) => { const d = Math.hypot(x, z) / r; return 13 * Math.pow(Math.max(0, 1 - d), 1.5) + ridge(x * 0.18, z * 0.18, 23) * 3 * Math.max(0, 1 - d) - Math.max(0, d - 0.85) * 10 - 0.9; };
  g.add(land(r * 2.4, 120, h, painter(C(0x6b6650), C(0x55504a)), 23));
  // the cave mouth on the face toward the sea, with the fire inside it
  const mx = 1.2, mz = r * 0.5, my = h(mx, mz);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.6, 20), new THREE.MeshBasicMaterial({ color: 0xff7a2a, fog: false }));
  mouth.scale.y = 0.75; mouth.position.set(mx, my + 0.9, mz + 0.35); mouth.rotation.x = -0.35; g.add(mouth);
  const f = glow(0xff7a2a, 9, 0.9); f.position.set(mx, my + 1.2, mz + 1.2); g.add(f);
  const l = new THREE.PointLight(0xff7a2a, 60, 28, 1.5); l.position.set(mx, my + 1.5, mz + 2.5); g.add(l);
  return g;
}
function circeIsle() {
  const g = new THREE.Group(), r = R.circe;
  const h = (x, z) => { const d = Math.hypot(x, z) / r; return 5 * Math.pow(Math.max(0, 1 - d), 1.1) + fbm(x * 0.15, z * 0.15, 31) * 1.8 - Math.max(0, d - 0.82) * 9 - 0.8; };
  g.add(land(r * 2.4, 110, h, painter(GRASS, C(0x4d4a3f)), 31));
  // the dark wood that hides the hall
  const n = 230, trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 2.1, 6), new THREE.MeshStandardMaterial({ color: 0x2c4a2c, roughness: 1, flatShading: true }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < 900 && k < n; i++) {
    const a = hash(i, 1, 31) * Math.PI * 2, d = Math.sqrt(hash(i, 2, 31)) * r * 0.82, x = Math.cos(a) * d, z = Math.sin(a) * d, y = h(x, z);
    if (y < 1.3 || Math.hypot(x - 0.5, z + 0.5) < 3.2) continue;
    const sc = 0.7 + hash(i, 4, 31) * 0.7; s.set(sc, sc * (0.8 + hash(i, 5, 31) * 0.6), sc); p.set(x, y + 0.9 * s.y, z);
    trees.setMatrixAt(k++, m.compose(p, q, s));
  }
  trees.count = k; trees.castShadow = true; g.add(trees);
  // Circe's hall in the clearing: marble and gold, every window lit
  const top = h(0.5, -0.5);
  const hall = new THREE.Group(); hall.position.set(0.5, top, -0.5);
  const marble = new THREE.MeshStandardMaterial({ color: 0xd9d0bd, roughness: 0.6 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.4, 2.2), marble); base.position.y = 0.7; base.castShadow = true; hall.add(base);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0, 2.3, 1.1, 4, 1), new THREE.MeshStandardMaterial({ color: 0xc99a2e, metalness: 0.7, roughness: 0.35, emissive: 0x3a2800 }));
  roof.rotation.y = Math.PI / 4; roof.scale.set(1.05, 1, 0.68); roof.position.y = 1.95; hall.add(roof);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.5), new THREE.MeshBasicMaterial({ color: 0xffc35a, fog: false })); win.position.set(0, 0.75, 1.11); hall.add(win);
  const f = glow(0xffc35a, 7, 0.75); f.position.y = 1.4; hall.add(f);
  const l = new THREE.PointLight(0xffc35a, 30, 22, 1.6); l.position.y = 3; hall.add(l);
  g.add(hall);
  return g;
}
function underworldIsle() {
  const g = new THREE.Group(), r = R.underworld;
  const h = (x, z) => { const d = Math.hypot(x, z) / r; return 6.5 * Math.exp(-Math.pow((d - 0.62) / 0.26, 2)) + ridge(x * 0.25, z * 0.25, 47) * 2 * Math.max(0, 1 - d) + (d < 0.42 ? 1.2 : 0) - Math.max(0, d - 0.88) * 10 - 1.1; };
  g.add(land(r * 2.4, 110, h, (c, y, ny, n) => { if (y < 0.2) return mixTo(c, C(0x1c1a1a), ASH, (y + 0.6)); mixTo(c, ASH, BASALT, (1 - ny) * 2 + n * 0.3); c.multiplyScalar(0.85 + n * 0.2); }, 47));
  // the Meridian Gate standing in the crater: the only bright thing in the place
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8a84e, metalness: 0.9, roughness: 0.3, emissive: 0x6a4a10 });
  const gate = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.28, 10, 40, Math.PI), gold); gate.position.set(0, 1.2, 0); gate.castShadow = true; g.add(gate);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), gold); p.position.set(s * 2.2, 0.6 + 1.2 - 0.6, 0); g.add(p); }
  const inside = new THREE.Mesh(new THREE.CircleGeometry(2.0, 30, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, fog: false }));
  inside.position.set(0, 1.2, 0); g.add(inside);
  const f = glow(0xd8a84e, 11, 0.8); f.position.set(0, 2.4, 0); g.add(f);
  const l = new THREE.PointLight(0xe6b860, 45, 26, 1.5); l.position.set(0, 4, 1); g.add(l);
  // the mist that sits in the crater and drifts out over the rim
  const mists = [];
  for (let i = 0; i < 9; i++) { const m = glow(0x8fa3a8, 7 + hash(i, 1, 47) * 5, 0.09); m.material.blending = THREE.NormalBlending; m.position.set((hash(i, 2, 47) - 0.5) * r * 1.3, 1.6 + hash(i, 3, 47) * 2, (hash(i, 4, 47) - 0.5) * r * 1.3); g.add(m); mists.push(m); }
  g.userData.tick = t => mists.forEach((m, i) => { m.position.x += Math.sin(t * 0.2 + i) * 0.004; m.material.opacity = 0.07 + Math.sin(t * 0.4 + i * 1.7) * 0.03; });
  return g;
}
// Troy: the coast at the edge of the chart, its walls on the hill, still burning
function troyLand() {
  const g = new THREE.Group();
  const h = (x, z) => { const coast = -x * 0.55 + z * -0.3 + fbm(x * 0.06, z * 0.06, 61) * 9; return Math.min(9, coast * 0.55) + fbm(x * 0.12, z * 0.12, 62) * 2.2 - 0.6 + 6 * Math.exp(-(x * x + (z + 4) * (z + 4)) / 60); };
  g.add(land(64, 110, h, painter(C(0x7a6a52), DARK), 61));
  const wall = new THREE.MeshStandardMaterial({ color: 0x5e554a, roughness: 0.95 });
  const top = h(0, -4), fires = [], smoke = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2; if (i % 5 === 2) continue;                       // the breached walls
    const w = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 0.5), wall); w.position.set(Math.cos(a) * 6, top + 0.4, -4 + Math.sin(a) * 6); w.rotation.y = -a + Math.PI / 2; w.castShadow = true; g.add(w);
  }
  for (let i = 0; i < 6; i++) { const f = glow(0xff6a2a, 3 + hash(i, 1, 63) * 3, 0.9); f.position.set((hash(i, 2, 63) - 0.5) * 9, top + 0.8, -4 + (hash(i, 3, 63) - 0.5) * 9); g.add(f); fires.push(f); }
  for (let i = 0; i < 12; i++) { const s = glow(0x2a2420, 6, 0.0); s.material.blending = THREE.NormalBlending; s.userData.k = i / 12; g.add(s); smoke.push(s); }
  const l = new THREE.PointLight(0xff6a2a, 70, 40, 1.4); l.position.set(0, top + 4, -4); g.add(l);
  g.userData.tick = t => {
    fires.forEach((f, i) => { f.material.opacity = 0.7 + Math.sin(t * 6 + i * 2.1) * 0.2; });
    l.intensity = 62 + Math.sin(t * 5.3) * 8;
    smoke.forEach(s => { const k = (s.userData.k + t * 0.03) % 1; s.position.set(1 + k * 10, top + 2 + k * 18, -4 + k * 3); s.scale.setScalar(4 + k * 12); s.material.opacity = 0.32 * Math.sin(k * Math.PI); });
  };
  return g;
}

// ---------- the sea: dark water with faint engraved swells, shallows and surf round every island, the maelstrom
function seaMaterial(isles) {
  const pts = isles.map(([x, z, r]) => new THREE.Vector3(x, z, r));
  while (pts.length < 10) pts.push(new THREE.Vector3(9999, 9999, 0));
  return new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 }, isles: { value: pts }, mael: { value: new THREE.Vector2(...MAEL) }, fogC: { value: FOG }, cam: { value: new THREE.Vector3() }, moon: { value: new THREE.Vector3(-0.45, 0.6, -0.65).normalize() } },
    vertexShader: `varying vec3 wp; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); wp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float t; uniform vec3 isles[10]; uniform vec2 mael; uniform vec3 fogC, cam, moon; varying vec3 wp;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec2 p = wp.xz;
        // swell normal from a few travelling waves
        vec2 g = vec2(0.0);
        g += vec2(0.8, 0.3) * cos(dot(p, vec2(0.21, 0.08)) + t * 0.9) * 0.35;
        g += vec2(-0.3, 0.9) * cos(dot(p, vec2(-0.09, 0.27)) + t * 1.1) * 0.25;
        g += vec2(0.6, -0.7) * cos(dot(p, vec2(0.5, -0.55)) + t * 1.7) * 0.12;
        g += (vec2(n(p * 0.9 + t * 0.4), n(p * 0.9 - t * 0.35 + 7.0)) - 0.5) * 0.35;
        vec3 N = normalize(vec3(-g.x * 0.09, 1.0, -g.y * 0.09));
        vec3 V = normalize(cam - wp);
        vec3 col = mix(vec3(0.010, 0.034, 0.046), vec3(0.020, 0.064, 0.080), n(p * 0.04) );
        // the faint engraved swell lines of an old chart, drawn on the water itself
        float v = fract(p.y / 7.0 + 0.18 * sin(p.x / 6.0 + t * 0.15));
        col += vec3(0.05, 0.12, 0.12) * smoothstep(0.035, 0.0, abs(v - 0.5)) * 0.55;
        // shallows and surf around every island
        float shal = 0.0, foam = 0.0;
        for (int i = 0; i < 10; i++) {
          float d = length(p - isles[i].xy) / max(isles[i].z, 0.001);
          shal = max(shal, smoothstep(1.35, 0.85, d));
          float edge = smoothstep(0.1, 0.0, abs(d - 0.93 - 0.03 * sin(atan(p.y - isles[i].y, p.x - isles[i].x) * 9.0 + t * 1.5)));
          foam = max(foam, edge * (0.6 + 0.4 * n(p * 2.5 + t)) * (i < 4 ? 1.0 : 0.35));
        }
        col = mix(col, vec3(0.05, 0.16, 0.165), shal * 0.6);
        // Poseidon's maelstrom: the water spirals down into the dark
        vec2 m = p - mael; float r = length(m), a = atan(m.y, m.x);
        float spin = sin(a * 3.0 + r * 0.55 - t * 1.4);
        float inR = smoothstep(26.0, 2.0, r);
        col = mix(col, vec3(0.10, 0.24, 0.25), inR * smoothstep(0.55, 1.0, spin) * 0.6);
        col *= 1.0 - smoothstep(9.0, 0.0, r) * 0.85;
        // moonlight on the swell, and a little sky in the reflection
        vec3 H = normalize(moon + V);
        float spec = pow(max(dot(N, H), 0.0), 260.0);
        float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
        col += vec3(0.75, 0.85, 1.0) * spec * 0.22 + vec3(0.05, 0.10, 0.14) * fres;
        col = mix(col, vec3(0.75, 0.82, 0.8), foam * 0.55);
        float fd = length(cam - wp);
        col = mix(col, fogC, 1.0 - exp(-pow(fd * 0.0021, 2.0)));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
}

// ---------- the chart itself
export class SeaChart {
  constructor(host, { onPick, avail } = {}) {
    this.host = host; this.onPick = onPick; this.avail = avail; this.hot = null; this.running = false; this.t = 0; this.lookX = 0; this.wide = 1;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    r.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.setAttribute("role", "img");
    r.domElement.setAttribute("aria-label", "The voyage map: Troy burning on the coast, then the four islands of the voyage across a dark sea, and fog beyond");
    host.appendChild(r.domElement);
    this.labels = document.createElement("div"); this.labels.className = "chart-labels"; host.appendChild(this.labels);

    const s = this.scene = new THREE.Scene();
    s.background = FOG; s.fog = new THREE.FogExp2(FOG, 0.0021);
    this.camera = new THREE.PerspectiveCamera(32, 1, 1, 900);
    s.add(new THREE.HemisphereLight(0x9fbccb, 0x1a2226, 1.5));
    const moon = new THREE.DirectionalLight(0xc6d8f0, 3.2); moon.position.set(-90, 120, 55);
    moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -130, right: 130, top: 100, bottom: -100, near: 10, far: 400 }); moon.shadow.bias = -0.0008;
    s.add(moon);

    // the islands
    this.isles = {};
    const build = { harbour: harbourIsle, cave: caveIsle, circe: circeIsle, underworld: underworldIsle };
    for (const c of CHAPTERS) {
      const g = build[c.id](); const [x, z] = AT[c.id]; g.position.set(x, 0, z); s.add(g);
      const ring = this.ring(R[c.id], c);
      ring.position.set(x, 0.12, z); s.add(ring);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(R[c.id] * 1.1, R[c.id] * 1.1, 26, 16), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(x, 8, z); hit.userData.id = c.id; s.add(hit);
      this.isles[c.id] = { c, g, ring, hit, lift: 0 };
    }
    this.troy = troyLand(); this.troy.position.set(AT.troy[0] - 14, 0, AT.troy[1] - 10); s.add(this.troy);
    // what lies beyond: low shapes going grey in the fog
    for (const [x, z, r] of BEYOND_AT) {
      const g = land(r * 2.6, 48, (a, b) => { const d = Math.hypot(a, b) / r; return 4 * Math.pow(Math.max(0, 1 - d), 1.3) + fbm(a * 0.3, b * 0.3, x | 0) - 0.6; }, painter(C(0x3e443d)), x | 0);
      g.position.set(x, 0, z); g.castShadow = false; g.material.color = new THREE.Color(0x6a7478); g.material.transparent = true; g.material.opacity = 0.55; s.add(g);
    }
    const all = [...CHAPTERS.map(c => [...AT[c.id], R[c.id]]), ...BEYOND_AT.map(([x, z, r]) => [x, z, r])];
    this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), seaMaterial(all));
    this.sea.rotation.x = -Math.PI / 2; this.sea.receiveShadow = false; s.add(this.sea);

    this.buildRoute();
    // the ship: where CONTINUE would take you
    this.ship = buildTrireme(); this.ship.scale.setScalar(0.17); this.ship.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); s.add(this.ship);
    this.makeLabels();

    this.ray = new THREE.Raycaster(); this.ptr = new THREE.Vector2(9, 9); this.par = new THREE.Vector2();
    const el = r.domElement;
    el.addEventListener("pointermove", e => { const b = el.getBoundingClientRect(); this.ptr.set(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1); this.par.copy(this.ptr); this.pick(); });
    el.addEventListener("pointerleave", () => { this.ptr.set(9, 9); this.par.set(0, 0); this.highlight(null); });
    el.addEventListener("click", () => { this.pick(); if (this.hot) this.onPick && this.onPick(this.hot); });
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this.refresh(); this.resize();
  }

  // a ring on the water round each island: dim all the way round, gold for the trials done
  ring(r, c) {
    const g = new THREE.Group(); g.rotation.x = -Math.PI / 2;
    const base = new THREE.Mesh(new THREE.RingGeometry(r * 1.22, r * 1.22 + 0.32, 96), new THREE.MeshBasicMaterial({ color: 0xd8b25a, transparent: true, opacity: 0.22, fog: false, depthWrite: false }));
    g.add(base); g.userData.base = base; g.userData.r = r; return g;
  }
  setProgress(id, pct) {
    const g = this.isles[id].ring, r = g.userData.r;
    if (g.userData.arc) { g.remove(g.userData.arc); g.userData.arc.geometry.dispose(); }
    if (pct <= 0) { g.userData.arc = null; return; }
    const arc = new THREE.Mesh(new THREE.RingGeometry(r * 1.22 - 0.08, r * 1.22 + 0.42, 96, 1, Math.PI / 2, -Math.PI * 2 * pct), new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.95, fog: false, depthWrite: false }));
    arc.position.z = 0.01; g.add(arc); g.userData.arc = arc;
  }

  // the route: Troy → the four islands → off into the fog. Gold dashes on the water, solid where sailed.
  buildRoute() {
    const P = [[AT.troy[0], AT.troy[1] + 2], ...CHAPTERS.map(c => AT[c.id]), [BEYOND_AT[0][0] + 4, BEYOND_AT[0][1] - 3]];
    const pts = []; this.legs = [];
    for (let i = 0; i < P.length - 1; i++) {
      const [x0, z0] = P[i], [x1, z1] = P[i + 1];
      const r0 = i === 0 ? 0 : R[CHAPTERS[i - 1].id] * 1.4, r1 = i < CHAPTERS.length ? R[CHAPTERS[i].id] * 1.4 : 0;
      const d = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / d, uz = (z1 - z0) / d;
      const a = new THREE.Vector3(x0 + ux * r0, 0.18, z0 + uz * r0), b = new THREE.Vector3(x1 - ux * r1, 0.18, z1 - uz * r1);
      const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(-uz, 0, ux).multiplyScalar(d * 0.12 * (i % 2 ? 1 : -1)));
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const len = curve.getLength(), n = Math.floor(len / 2.1);
      const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(1.15, 0.06, 0.32), new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 1, fog: false, depthWrite: false }), n);
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), X = new THREE.Vector3(1, 0, 0);
      for (let k = 0; k < n; k++) { const u = (k + 0.5) / n; q.setFromUnitVectors(X, curve.getTangentAt(u)); dash.setMatrixAt(k, m.compose(curve.getPointAt(u), q, one)); }
      this.scene.add(dash); this.legs.push({ curve, dash }); pts.push(curve);
    }
    this.pulse = glow(0xffe08a, 3.2, 0.9); this.scene.add(this.pulse);
  }

  // the words on the chart: DOM, so they stay sharp at any size and read like the rest of the game
  makeLabels() {
    const mk = (cls, html, id) => { const d = document.createElement("div"); d.className = "cl " + cls; d.innerHTML = html; if (id) d.dataset.id = id; this.labels.appendChild(d); return d; };
    this.tags = [];
    for (const c of CHAPTERS) {
      const d = mk("isle", `<span class="k"></span><b></b><span class="m"></span>`, c.id);
      d.style.setProperty("--c", c.id === "circe" ? "#8fa6ff" : c.accent);
      d.onclick = () => this.onPick && this.onPick(c.id);
      d.onpointerenter = () => this.highlight(c.id); d.onpointerleave = () => this.highlight(null);
      this.tags.push({ el: d, p: new THREE.Vector3(AT[c.id][0], 0, AT[c.id][1] + R[c.id] * 1.3), id: c.id });
    }
    this.tags.push({ el: mk("place", "TROY"), p: new THREE.Vector3(AT.troy[0] - 10, 9, AT.troy[1] - 4) });
    this.tags.push({ el: mk("place sea", "POSEIDON'S MAELSTROM"), p: new THREE.Vector3(MAEL[0], 0, MAEL[1] + 4) });
    this.tags.push({ el: mk("place", "NOT YET CHARTED"), p: new THREE.Vector3(BEYOND_AT[1][0] + 4, 0, BEYOND_AT[1][1] + 9) });
  }

  // read the saved voyage again (called each time the chart opens)
  refresh() {
    for (const c of CHAPTERS) {
      const st = status(c), tag = this.tags.find(t => t.id === c.id).el;
      this.setProgress(c.id, st.finished ? 1 : st.done / c.total);
      tag.querySelector(".k").textContent = `${c.word} · ${c.ds.toUpperCase()}`;
      tag.querySelector("b").textContent = c.title.toUpperCase();
      tag.querySelector(".m").textContent = st.finished ? "✓ DONE" : `${st.done} / ${c.total}`;
      tag.classList.toggle("done", st.finished);
    }
    // the route is solid gold up to the furthest island reached, faint after it
    const reached = CHAPTERS.reduce((n, c, i) => (status(c).started || status(c).finished ? i + 1 : n), 0);
    this.legs.forEach((l, i) => { l.dash.material.opacity = i < Math.max(1, reached) ? 0.95 : i === CHAPTERS.length ? 0.18 : 0.38; });
    this.reached = Math.max(1, reached);
    const at = continueTo(); this.shipAt = at.id;
  }

  highlight(id) {
    if (this.hot === id) return;
    this.hot = id;
    this.renderer.domElement.style.cursor = id ? "pointer" : "";
    this.tags.forEach(t => t.id && t.el.classList.toggle("hot", t.id === id));
    if (this.onHover) this.onHover(id);
  }
  pick() {
    if (Math.abs(this.ptr.x) > 1.5) return;
    this.ray.setFromCamera(this.ptr, this.camera);
    const hit = this.ray.intersectObjects(Object.values(this.isles).map(i => i.hit))[0];
    this.highlight(hit ? hit.object.userData.id : null);
  }

  resize() {
    const w = this.host.clientWidth || innerWidth, h = this.host.clientHeight || innerHeight;
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.w = w; this.h = h;
    // frame the voyage in the part of the screen the island list leaves free: shift the picture's centre
    // there, and pull back far enough that Troy and the Underworld both fit across it
    const box = this.avail ? this.avail() : { w, h };
    const fw = Math.max(320, Math.min(w, box.w)), fh = Math.max(240, Math.min(h, box.h));
    const ox = (w - fw) / 2, oy = (h - fh) / 2;
    if (ox > 1 || oy > 1) this.camera.setViewOffset(w, h, ox, oy, w, h); else this.camera.clearViewOffset();
    this.wide = Math.max(0.92, 1.42 * h / fw, 0.95 * h / fh);           // the voyage is about 1.42 screen-heights wide and 0.95 tall
  }

  start() { if (this.running) return; this.running = true; this.refresh(); this.clock = performance.now(); this.renderer.setAnimationLoop(() => { const now = performance.now(), dt = Math.min((now - this.clock) / 1000, 0.1); this.clock = now; this.step(dt); }); }
  stop() { this.running = false; this.renderer.setAnimationLoop(null); }

  step(dt) {
    const t = (this.t += dt), cam = this.camera, slow = this.reduced ? 0 : 1;
    // the camera: high over the sea, framing all four islands; it breathes and leans a little toward the pointer
    const wide = this.wide;
    const ox = 6 + Math.sin(t * 0.07) * 3 * slow + this.par.x * 5 * slow, oy = this.par.y * 3 * slow;
    cam.position.set(this.lookX + ox, (190 + oy) * wide, (150 + Math.cos(t * 0.05) * 2 * slow) * wide);
    cam.lookAt(this.lookX + this.par.x * 2 * slow, 0, 6);
    this.sea.material.uniforms.t.value = t * (this.reduced ? 0.3 : 1);
    this.sea.material.uniforms.cam.value.copy(cam.position);
    // islands rise a touch when pointed at
    for (const k in this.isles) {
      const i = this.isles[k], want = this.hot === k ? 1 : 0;
      i.lift += (want - i.lift) * Math.min(1, dt * 8);
      i.g.position.y = i.lift * 0.9;
      i.ring.userData.base.material.opacity = 0.22 + i.lift * 0.6;
      i.ring.scale.setScalar(1 + i.lift * 0.04);
      if (i.g.userData.tick) i.g.userData.tick(t);
    }
    this.troy.userData.tick(t);
    // a spark runs the sailed route; the ship rides at anchor off the island CONTINUE goes to
    const legs = this.legs.slice(0, this.reached), L = legs.length, u = ((t * 0.12) % 1) * L, leg = legs[Math.min(L - 1, Math.floor(u))];
    this.pulse.position.copy(leg.curve.getPointAt(u - Math.floor(u))).setY(0.6);
    this.pulse.material.opacity = 0.9 * Math.sin((u - Math.floor(u)) * Math.PI) * slow + 0.0;
    const [sx, sz] = AT[this.shipAt], sr = R[this.shipAt];
    this.ship.position.set(sx + sr * 1.05, Math.sin(t * 1.1) * 0.06 - 0.1, sz + sr * 0.95);
    this.ship.rotation.set(Math.sin(t * 0.8) * 0.03, -0.6, Math.sin(t * 0.9) * 0.025);
    this.renderer.render(this.scene, cam);
    this.place();
  }

  // pin every label to its spot on the sea
  place() {
    const v = new THREE.Vector3();
    for (const tg of this.tags) {
      v.copy(tg.p); if (tg.id) v.y += this.isles[tg.id].lift * 0.9;
      v.project(this.camera);
      const x = (v.x * 0.5 + 0.5) * this.w, y = (-v.y * 0.5 + 0.5) * this.h;
      tg.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0)`;
      tg.el.style.visibility = v.z < 1 ? "visible" : "hidden";
    }
  }
}
