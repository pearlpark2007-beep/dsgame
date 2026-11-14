// helios.js — Aeaea at noon. "HELIOS NOON": the Sun's daughter runs her island like a solar-powered
// labour camp dressed up as a holiday resort.
//   • a white-marble plaza laid out like a sundial, a gold sun inlaid under the sty, a red meander border,
//     stencilled camp lettering, hazard stripes at the gate;
//   • the palace terrace behind it: columns, red sun banners, steps, two lions on chains;
//   • the sun machine over the roof: a huge gold disc, mirrors round it, a ring of red warning lamps;
//   • Circe always a cobalt silhouette (Kill Bill "pure theatre"): tall, a sun-staff in one hand, the cup in the other;
//   • loudspeakers on poles, braziers, a ration board, poppy fields on the yellow grass outside.
// It is the brightest place in the game; red is kept for danger (the NULL pit, a lost pig, the warning lamps).
import * as THREE from "three";
import { GATE, PIT } from "./sty.js";
import { HEAD_COLOR } from "../../learn/listBoard.js";
import { drawCirce, SIL_W, SIL_H } from "./circeSilhouette.js";
import { buildRuins } from "./ruins.js";

const DISPLAY = "Anton, Impact, 'Arial Narrow', sans-serif", MONO = "'Courier Prime', 'Courier New', monospace";
export const COBALT = 0x1d3fd1, GOLD = 0xffd21a, BLOOD = 0xd7261e;

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function labelSprite(draw, w, h, scale) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(w, h, draw), transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
  s.scale.set(scale * w / h, scale, 1); s.renderOrder = 10;
  return s;
}
const rnd = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

// the plaza: x -16..26, z -9..9
const PX0 = -16, PX1 = 32, PZ0 = -9, PZ1 = 9;
const SUN_C = [-1.5, 0.9];            // the inlaid sun sits under the middle of the sty

function plazaTexture() {
  const W = 2048, H = Math.round(2048 * (PZ1 - PZ0) / (PX1 - PX0));
  const X = x => (x - PX0) / (PX1 - PX0) * W, Z = z => (z - PZ0) / (PZ1 - PZ0) * H, U = W / (PX1 - PX0);
  return canvasTexture(W, H, (g) => {
    // marble slabs, each a slightly different white, with faint veins
    g.fillStyle = "#efe6d2"; g.fillRect(0, 0, W, H);
    const tile = 1.5 * U;
    for (let x = 0; x < W; x += tile) for (let y = 0; y < H; y += tile) {
      const v = 228 + Math.floor(rnd() * 16);
      g.fillStyle = `rgb(${v + 6},${v},${v - 18})`; g.fillRect(x + 1, y + 1, tile - 2, tile - 2);
    }
    g.strokeStyle = "rgba(150,130,100,0.28)"; g.lineWidth = 1.5;
    for (let i = 0; i < 90; i++) {
      const x = rnd() * W, y = rnd() * H; g.beginPath(); g.moveTo(x, y);
      g.bezierCurveTo(x + rnd() * 120 - 60, y + rnd() * 60, x + rnd() * 160 - 80, y + rnd() * 90, x + rnd() * 200 - 100, y + rnd() * 120); g.stroke();
    }
    // the inlaid sun: gold rays round a disc, a dashed red ring (the warning lamps of the machine above)
    const cx = X(SUN_C[0]), cy = Z(SUN_C[1]);
    g.save(); g.globalAlpha = 0.38;
    for (let i = 0; i < 32; i++) {
      const a0 = i / 32 * Math.PI * 2, a1 = a0 + Math.PI / 32, r1 = (i % 2 ? 9.5 : 12.5) * U;
      g.fillStyle = i % 2 ? "#f2b705" : "#ffd21a";
      g.beginPath(); g.moveTo(cx + Math.cos(a0) * 5 * U, cy + Math.sin(a0) * 5 * U);
      g.lineTo(cx + Math.cos((a0 + a1) / 2) * r1, cy + Math.sin((a0 + a1) / 2) * r1);
      g.lineTo(cx + Math.cos(a1 + Math.PI / 32) * 5 * U, cy + Math.sin(a1 + Math.PI / 32) * 5 * U); g.fill();
    }
    g.fillStyle = "#ffd21a"; g.beginPath(); g.arc(cx, cy, 5 * U, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.65; g.strokeStyle = "#f2b705"; g.lineWidth = 0.18 * U; g.beginPath(); g.arc(cx, cy, 4.4 * U, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "#d7261e"; g.lineWidth = 0.14 * U; g.setLineDash([0.35 * U, 0.55 * U]); g.beginPath(); g.arc(cx, cy, 5.3 * U, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.restore();
    // the meander (Greek key) border, red on cream
    const band = 0.9 * U;
    g.fillStyle = "#f6efdf"; g.fillRect(0, 0, W, band); g.fillRect(0, H - band, W, band); g.fillRect(0, 0, band, H); g.fillRect(W - band, 0, band, H);
    g.strokeStyle = "#c8261e"; g.lineWidth = 0.09 * U; g.lineJoin = "miter";
    const key = (x0, y0, len, horiz) => {
      const s = band * 0.7, m = band * 0.15;
      g.beginPath();
      for (let p = 0; p < len; p += s) {
        const P = (a, b) => horiz ? [x0 + p + a * s, y0 + m + b * s] : [x0 + m + b * s, y0 + p + a * s];
        const pts = [[0, 1], [0, 0], [0.75, 0], [0.75, 0.75], [0.25, 0.75], [0.25, 0.4], [0.5, 0.4]];
        pts.forEach(([a, b], i) => { const [x, y] = P(a, b); i ? g.lineTo(x, y) : g.moveTo(x, y); });
        const [x, y] = P(1, 1); g.moveTo(...P(0, 1)); g.lineTo(x, y);
      }
      g.stroke();
    };
    key(0, 0, W, true); key(0, H - band, W, true); key(0, 0, H, false); key(W - band, 0, H, false);
    g.strokeStyle = "#1a120a"; g.lineWidth = 3;
    g.strokeRect(band, band, W - 2 * band, H - 2 * band);
    // stencilled camp lettering along the near edge
    g.fillStyle = "rgba(20,14,8,0.78)"; g.font = `${0.62 * U}px ${DISPLAY}`; g.textBaseline = "middle";
    g.textAlign = "left"; g.fillText("HELIOS SOLAR WORKS  ·  SWINE DIVISION  ·  KEEP TO THE ROPE", X(-7.5), Z(7.6));
    g.textAlign = "right"; g.fillText("PENS 0x1A0 — 0x290", X(24.5), Z(7.6));
    // hazard stripes where the gate is
    const gx = X(GATE.x), gz = Z(GATE.z);
    g.save(); g.beginPath(); g.rect(gx - 1.6 * U, gz - 1.6 * U, 3.2 * U, 3.2 * U); g.clip();
    for (let i = -10; i < 10; i++) { g.fillStyle = i % 2 ? "#ffd21a" : "#141008"; g.beginPath(); g.moveTo(gx + i * 0.4 * U, gz - 1.6 * U); g.lineTo(gx + (i + 1) * 0.4 * U, gz - 1.6 * U); g.lineTo(gx + (i - 7) * 0.4 * U, gz + 1.6 * U); g.lineTo(gx + (i - 8) * 0.4 * U, gz + 1.6 * U); g.fill(); }
    g.restore();
    g.fillStyle = "#141008"; g.fillRect(gx - 2.4 * U, gz + 1.65 * U, 4.8 * U, 0.6 * U);
    g.fillStyle = "#ffd21a"; g.font = `${0.42 * U}px ${DISPLAY}`; g.textAlign = "center"; g.fillText("ENTRANCE · HEAD", gx, gz + 1.96 * U);
  });
}

function sandTexture() {
  return canvasTexture(1024, 1024, (g, w, h) => {
    g.fillStyle = "#e3b964"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) { const v = rnd(); g.fillStyle = v < 0.5 ? "rgba(196,150,70,0.35)" : v < 0.8 ? "rgba(240,206,130,0.4)" : "rgba(150,140,60,0.3)"; g.fillRect(rnd() * w, rnd() * h, 2, 2 + rnd() * 6); }
  });
}

// a red banner with the sun on it
const bannerTex = () => canvasTexture(256, 640, (g, w, h) => {
  g.fillStyle = "#c8261e"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#ffd21a"; g.beginPath(); g.arc(w / 2, h * 0.34, 70, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(w / 2 + Math.cos(a) * 88 - 6, h * 0.34 + Math.sin(a) * 88 - 6, 12, 12); }
  g.fillStyle = "#141008"; g.fillRect(0, h - 120, w, 8); g.fillRect(0, 12, w, 8);
  g.fillStyle = "#ffd21a"; g.font = `64px ${DISPLAY}`; g.textAlign = "center"; g.fillText("ἥλιος", w / 2, h * 0.72);
});

// the ration board by the gate: yellow, black stencil, a list of men
const RATION = {
  noon: ["MEN RECEIVED ....... 23", "WALKED AWAY ........  1", "PIGS ON THE ROPE ... 22", "ESCAPES ............  0"],
  banquet: ["BANQUET GUESTS .....  7", "OF THE CREW ........  5", "OF THE HOUSE .......  2", "WINE ............. YES"],
  free: ["MEN RECEIVED ....... 23", "WALKED AWAY ........ 22", "PIGS ON THE ROPE ...  0", "ESCAPES ............ 22"]
};
const rationTex = (mode = "noon") => canvasTexture(1024, 600, (g, w, h) => {
  g.fillStyle = "#ffd21a"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#141008"; g.fillRect(0, 0, w, 120); g.fillRect(0, h - 18, w, 18);
  g.fillStyle = "#ffd21a"; g.font = `86px ${DISPLAY}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("RATION BOARD", w / 2, 64);
  g.fillStyle = "#141008"; g.font = `bold 46px ${MONO}`; g.textAlign = "left";
  RATION[mode].forEach((t, i) => g.fillText(t, 50, 190 + i * 74));
  g.fillStyle = "#c8261e"; g.font = `44px ${DISPLAY}`; g.textAlign = "center"; g.fillText("BY ORDER OF THE DAUGHTER OF THE SUN", w / 2, h - 66, w - 40);
});

// a lion lying like a sphinx, head up, gold collar and a chain to the steps
function makeLion(mat, mane) {
  const g = new THREE.Group(), dark = new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd21a, metalness: 0.8, roughness: 0.3 });
  const add = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; g.add(o); return o; };
  const torso = add(new THREE.CapsuleGeometry(0.44, 1.25, 6, 14), mat, 0.15, 0.5, 0, 1, 1, 0.95); torso.rotation.z = Math.PI / 2;
  add(new THREE.SphereGeometry(0.56, 16, 12), mat, 0.85, 0.55, 0, 1, 0.92, 1.05);            // haunch
  add(new THREE.SphereGeometry(0.5, 16, 12), mat, -0.62, 0.62, 0, 1, 1.1, 1);              // chest
  for (const z of [-0.27, 0.27]) {                                                         // forelegs stretched out, paws
    const leg = add(new THREE.CapsuleGeometry(0.13, 0.7, 4, 8), mat, -1.2, 0.15, z); leg.rotation.z = Math.PI / 2;
    add(new THREE.SphereGeometry(0.16, 10, 8), mat, -1.62, 0.13, z, 1.2, 0.8, 1);
  }
  add(new THREE.SphereGeometry(0.2, 10, 8), mat, 0.8, 0.14, 0.42, 1.6, 0.7, 0.8);           // a hind paw
  const head = new THREE.Group(); head.position.set(-0.98, 1.08, 0); g.add(head);
  const hadd = (geo, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.castShadow = true; head.add(o); return o; };
  const maneGeo = new THREE.IcosahedronGeometry(0.66, 1);
  hadd(maneGeo, mane, 0.12, 0, 0, 0.75, 1.05, 1.1);
  hadd(new THREE.SphereGeometry(0.36, 16, 12), mat, -0.24, -0.02, 0, 1.1, 0.95, 0.9);        // face
  hadd(new THREE.SphereGeometry(0.21, 12, 10), mat, -0.55, -0.14, 0, 1.15, 0.8, 1);          // muzzle
  hadd(new THREE.SphereGeometry(0.07, 8, 6), dark, -0.76, -0.08, 0, 1, 0.8, 1.3);            // nose
  for (const z of [-0.14, 0.14]) {
    hadd(new THREE.SphereGeometry(0.055, 8, 6), dark, -0.6, 0.1, z * 1.1);                      // eyes
    const ear = hadd(new THREE.ConeGeometry(0.09, 0.16, 8), mat, -0.12, 0.33, z * 1.9); ear.rotation.x = z > 0 ? 0.4 : -0.4;
  }
  // collar and chain down to a ring on the step
  const collar = add(new THREE.TorusGeometry(0.42, 0.06, 8, 20), gold, -0.72, 0.9, 0); collar.rotation.y = Math.PI / 2; collar.rotation.x = 0.35;
  for (let i = 0; i < 7; i++) {
    const k = i / 6, link = add(new THREE.TorusGeometry(0.07, 0.022, 6, 10), gold, -0.72 - k * 0.2, 0.55 - k * 0.5, 0.4 + k * 0.9);
    link.rotation.set(i % 2 ? Math.PI / 2 : 0, 0.6, 0);
  }
  add(new THREE.TorusGeometry(0.14, 0.035, 6, 14), gold, -0.95, 0.03, 1.35).rotation.x = Math.PI / 2;
  // the tail, curled round the haunch, a dark tuft at the end
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(1.35, 0.45, 0), new THREE.Vector3(1.6, 0.2, 0.35), new THREE.Vector3(1.2, 0.08, 0.75), new THREE.Vector3(0.6, 0.08, 0.8)]);
  add(new THREE.TubeGeometry(curve, 16, 0.05, 6, false), mat, 0, 0, 0);
  add(new THREE.SphereGeometry(0.11, 8, 6), mane, 0.55, 0.1, 0.8, 1.3, 0.9, 1);
  g.userData.head = head;
  return g;
}

// Circe: one flat cobalt cut-out drawn with curves (circeSilhouette.js), standing against her sun window.
// A flat figure is the point: Kill Bill's "pure theatre" silhouette, readable at any distance.
export function makeCirce() {
  const tex = canvasTexture(SIL_W, SIL_H, (g) => drawCirce(g));
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false, depthWrite: true });
  const H = 4.0, W = H * SIL_W / SIL_H;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(W, H), mat); plane.position.y = H / 2;
  const g = new THREE.Group(); g.add(plane);
  g.userData = { plane };
  return g;
}

export function buildIsland(world) {
  const scene = world.scene;
  // sky: white-hot at the horizon, deep gold above
  // noon, and (for the banquet) sunset: the sky is repainted between the two
  const NOON = ["#f2a900", "#ffd23a", "#fff1b0", "#fff8de"], DUSK = ["#3a0a2a", "#b0201a", "#ff6a1a", "#ffb04a"];
  const mix = (a, b, k) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
  const paintSky = k => (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    [0, 0.45, 0.75, 1].forEach((at, i) => gr.addColorStop(at, mix(NOON[i], DUSK[i], k)));
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  };
  const skyCanvas = document.createElement("canvas"); skyCanvas.width = 16; skyCanvas.height = 512;
  paintSky(0)(skyCanvas.getContext("2d"), 16, 512);
  scene.background = new THREE.CanvasTexture(skyCanvas); scene.background.colorSpace = THREE.SRGBColorSpace;
  scene.fog = new THREE.Fog(0xffe8a8, 90, 220);     // clear noon air: haze only at the far horizon

  // ground: dry yellow grass/sand, and the marble plaza on it
  const sand = sandTexture(); sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(10, 10);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshStandardMaterial({ map: sand, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(PX1 - PX0, PZ1 - PZ0), new THREE.MeshStandardMaterial({ map: plazaTexture(), roughness: 0.55, metalness: 0.0 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set((PX0 + PX1) / 2, 0.01, (PZ0 + PZ1) / 2); plaza.receiveShadow = true; scene.add(plaza);
  const curbM = new THREE.MeshStandardMaterial({ color: 0xe6dcc6, roughness: 0.7 });
  for (const [x, z, w, d] of [[(PX0 + PX1) / 2, PZ1 + 0.2, PX1 - PX0 + 0.8, 0.4], [PX0 - 0.2, 0, 0.4, PZ1 - PZ0], [PX1 + 0.2, 0, 0.4, PZ1 - PZ0]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), curbM); c.position.set(x, 0.09, z); c.receiveShadow = true; scene.add(c);
  }

  // poppies on the grass outside the plaza (instanced: cheap), and a few dark tufts
  // a poppy: a red cup on a green stem (flat discs read as spilled paint from low angles)
  const cupGeo = new THREE.ConeGeometry(0.17, 0.2, 6); cupGeo.rotateX(Math.PI); cupGeo.translate(0, 0.42, 0);
  const stemGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.34, 4); stemGeo.translate(0, 0.17, 0);
  const poppy = new THREE.InstancedMesh(cupGeo, new THREE.MeshStandardMaterial({ color: 0xd7261e, roughness: 0.7 }), 900);
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: 0x5a7a2a, roughness: 1 }), 900);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  let n = 0;
  while (n < 900) {
    // clumps: pick a centre, scatter round it
    const cx = -40 + rnd() * 90, cz = -30 + rnd() * 55;
    if (cx > PX0 - 1.5 && cx < PX1 + 1.5 && cz > PZ0 - 9 && cz < PZ1 + 1.5) continue;     // not on the plaza or the palace
    for (let k = 0; k < 18 && n < 900; k++) {
      const x = cx + (rnd() - 0.5) * 5, z = cz + (rnd() - 0.5) * 4, s = 0.6 + rnd() * 0.8;
      if (x > PX0 - 1 && x < PX1 + 1 && z > PZ0 - 9 && z < PZ1 + 1) continue;
      m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.8 + rnd() * 0.6), s)); poppy.setMatrixAt(n, m4); stems.setMatrixAt(n++, m4);
    }
  }
  scene.add(poppy, stems);

  // ---------- the palace terrace behind the plaza: platform, steps, columns, beam, pediment
  const marble = new THREE.MeshStandardMaterial({ color: 0xf4eee2, roughness: 0.5 });
  const shade = new THREE.MeshStandardMaterial({ color: 0xd8cdb6, roughness: 0.7 });
  const TZ = -14, TH = 2.2;
  const terrace = new THREE.Mesh(new THREE.BoxGeometry(44, TH, 9), marble); terrace.position.set(5, TH / 2, TZ); terrace.castShadow = terrace.receiveShadow = true; scene.add(terrace);
  for (let i = 0; i < 4; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(18 - i * 0.6, TH / 4 * (4 - i), 0.55), i % 2 ? shade : marble);
    st.position.set(2, TH / 8 * (4 - i), TZ + 4.5 + 0.55 * (i + 0.5)); st.castShadow = st.receiveShadow = true; scene.add(st);
  }
  const colGeo = new THREE.CylinderGeometry(0.42, 0.5, 7.5, 16), capGeo = new THREE.BoxGeometry(1.25, 0.35, 1.25);
  const columns = [];
  for (let x = -14; x <= 24; x += 4) {
    if (x === 2) continue;                 // the middle bay stays open: Circe stands in it, against her sun
    const c = new THREE.Mesh(colGeo, marble); c.position.set(x, TH + 3.75, TZ + 3.2); c.castShadow = true; scene.add(c); columns.push(c);
    const cap = new THREE.Mesh(capGeo, marble); cap.position.set(x, TH + 7.6, TZ + 3.2); scene.add(cap);
    const base = new THREE.Mesh(capGeo, shade); base.position.set(x, TH + 0.17, TZ + 3.2); scene.add(base);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(41, 1.1, 1.6), marble); beam.position.set(5, TH + 8.3, TZ + 3.2); beam.castShadow = true; scene.add(beam);
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(41, 0.22, 0.05), new THREE.MeshStandardMaterial({ color: BLOOD, roughness: 0.6 })); frieze.position.set(5, TH + 8.2, TZ + 4.03); scene.add(frieze);
  const tri = new THREE.Shape(); tri.moveTo(-8, 0); tri.lineTo(8, 0); tri.lineTo(0, 2.6); tri.closePath();   // the pediment: a triangle, extruded
  const ped = new THREE.Mesh(new THREE.ExtrudeGeometry(tri, { depth: 1.6, bevelEnabled: false }), marble);
  ped.position.set(2, TH + 8.85, TZ + 2.4); ped.castShadow = true; scene.add(ped);
  const tym = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), new THREE.MeshBasicMaterial({ color: GOLD })); tym.position.set(2, TH + 9.75, TZ + 4.02); scene.add(tym);
  // red banners between the columns
  const bTex = bannerTex();
  for (const x of [-12, -4, 8, 16]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 4.2), new THREE.MeshStandardMaterial({ map: bTex, roughness: 0.9, side: THREE.DoubleSide }));
    b.position.set(x, TH + 5.2, TZ + 3.0); scene.add(b);
  }
  // the dark doorway behind Circe
  // a round sun window behind Circe: she is always a cobalt silhouette against the sun
  const sunWin = new THREE.Mesh(new THREE.CircleGeometry(3.1, 48), new THREE.MeshBasicMaterial({ color: 0xfff3b0, toneMapped: false })); sunWin.position.set(2, TH + 4.0, TZ + 0.15); scene.add(sunWin);
  const sunRim = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.45, 48), new THREE.MeshBasicMaterial({ color: 0xffb800, toneMapped: false })); sunRim.position.set(2, TH + 4.0, TZ + 0.16); scene.add(sunRim);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(40, 7.5, 0.6), shade); wall.position.set(5, TH + 3.75, TZ - 0.2); wall.receiveShadow = true; scene.add(wall);

  // ---------- the sun machine over the roof
  const machine = new THREE.Group(); machine.position.set(2, 15.5, TZ - 9);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(8, 64), new THREE.MeshBasicMaterial({ color: 0xfff1a0 })); machine.add(disc);
  const discRim = new THREE.Mesh(new THREE.RingGeometry(8, 8.6, 64), new THREE.MeshBasicMaterial({ color: 0xffc400 })); discRim.position.z = 0.02; machine.add(discRim);
  const ring = new THREE.Group(); machine.add(ring);
  const steel = new THREE.MeshStandardMaterial({ color: 0xbfc4c8, metalness: 0.9, roughness: 0.25 });
  const rayM = new THREE.MeshBasicMaterial({ color: 0xffc400, toneMapped: false }), rayDark = new THREE.MeshBasicMaterial({ color: 0x141008, toneMapped: false });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, long = i % 2 === 0;
    const ray = new THREE.Mesh(new THREE.ConeGeometry(0.9, long ? 4.2 : 2.6, 3), long ? rayM : rayDark);
    ray.scale.z = 0.15; ray.position.set(Math.cos(a) * (long ? 11.0 : 10.2), Math.sin(a) * (long ? 11.0 : 10.2), 0.2); ray.rotation.z = a - Math.PI / 2; ring.add(ray);
  }
  const band = new THREE.Mesh(new THREE.TorusGeometry(9.25, 0.28, 8, 64), steel); band.position.z = 0.1; machine.add(band);
  const lamps = [];
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshBasicMaterial({ color: BLOOD })); l.position.set(Math.cos(a) * 8.9, Math.sin(a) * 8.9, 0.15); machine.add(l); lamps.push(l);
  }
  const truss = new THREE.Mesh(new THREE.BoxGeometry(1.2, 14, 1.2), new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.6, roughness: 0.5 })); truss.position.set(0, -10, -0.8); machine.add(truss);
  scene.add(machine);

  // ---------- Circe on the terrace in front of her door; two lions chained on the steps
  const circe = makeCirce(); circe.position.set(2, TH, TZ + 1.0); circe.scale.setScalar(1.75); scene.add(circe);
  const lionM = new THREE.MeshStandardMaterial({ color: 0xc8922a, roughness: 0.7 }), maneM = new THREE.MeshStandardMaterial({ color: 0x7a3c12, roughness: 0.9, flatShading: true });
  const lions = [];
  for (const [x, ry] of [[-8, Math.PI * 0.15], [12, Math.PI * 0.85]]) {
    const l = makeLion(lionM, maneM); l.position.set(x, 0, TZ + 6.3); l.rotation.y = ry; scene.add(l); lions.push(l);
    const chainTo = new THREE.Vector3(x + (x < 0 ? 3 : -3), TH, TZ + 4.4), from = l.position.clone().add(new THREE.Vector3(0, 1.0, 0));
    const curve = new THREE.QuadraticBezierCurve3(from, from.clone().lerp(chainTo, 0.5).setY(0.3), chainTo);
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.05, 5), steel));
  }

  // ---------- loudspeakers on poles at the plaza corners; braziers along the near edge
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, metalness: 0.5, roughness: 0.6 });
  for (const [x, z, ry] of [[PX0 + 1, PZ0 + 0.6, -0.6], [PX1 - 1, PZ0 + 0.6, 0.6], [PX0 + 1, PZ1 + 1.6, -2.4], [PX1 - 1, PZ1 + 1.6, 2.4]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 6), iron); pole.position.set(x, 3, z); pole.castShadow = true; scene.add(pole);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.08, 0.9, 10, 1, true), new THREE.MeshStandardMaterial({ color: 0x8a8a80, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
      horn.position.set(x + s * 0.35, 5.6, z); horn.rotation.set(Math.PI / 2 - 0.35, ry + s * 0.5, 0, "YXZ"); scene.add(horn);
    }
  }
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8a5a24, metalness: 0.7, roughness: 0.35 });
  const flames = [];
  for (const [x, z] of [[PX0 + 0.2, -4.5], [PX0 + 0.2, 5.5], [PX1 - 0.2, -4.5], [PX1 - 0.2, 5.5], [-4, PZ0 - 0.1], [8, PZ0 - 0.1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 1.4, 6), bronze); leg.position.set(x, 0.7, z); scene.add(leg);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.28, 0.35, 12), bronze); bowl.position.set(x, 1.55, z); bowl.castShadow = true; scene.add(bowl);
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 7), new THREE.MeshBasicMaterial({ color: 0xff7a1a })); f.position.set(x, 2.05, z); scene.add(f); flames.push(f);
  }
  // the ration board on legs, left of the gate
  const board = new THREE.Group(); board.position.set(PX0 - 4.5, 0, -3.5); board.rotation.y = 0.55;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.05), new THREE.MeshStandardMaterial({ map: rationTex(), roughness: 0.8 })); face.position.y = 3.2; board.add(face);
  let rationMode = "noon";
  const setRation = mode => { if (mode === rationMode || !RATION[mode]) return; rationMode = mode; face.material.map.dispose(); face.material.map = rationTex(mode); face.material.needsUpdate = true; };
  for (const x of [-2.1, 2.1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.6, 0.16), iron); leg.position.set(x, 1.8, -0.1); board.add(leg); }
  scene.add(board);

  // ---------- the gate (head) and the NULL pit
  const gate = new THREE.Group(); gate.position.copy(GATE);
  for (const z of [-0.9, 0.9]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.4, 0.28), marble); post.position.set(0, 1.2, z); post.castShadow = true; gate.add(post);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.7, roughness: 0.3 })); knob.position.set(0, 2.5, z); gate.add(knob);
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x141008, roughness: 0.6 })); bar.position.y = 2.2; gate.add(bar);
  scene.add(gate);
  // the head sign over the gate is a sprite redrawn whenever head changes: "head = 0x1A0"
  let headSign = null;
  function setHead(text) {
    if (headSign) { gate.remove(headSign); headSign.material.map.dispose(); }
    headSign = labelSprite((g, w, h) => {
      g.fillStyle = "#141008"; g.fillRect(0, 0, w, h); g.strokeStyle = HEAD_COLOR; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = HEAD_COLOR; g.textBaseline = "middle"; g.textAlign = "left";
      g.font = `bold 58px ${MONO}`; g.fillText("head", 22, h / 2 + 4);
      const x = 22 + g.measureText("head ").width;
      g.fillStyle = "#fff4cf"; g.fillText("= " + text, x, h / 2 + 4);
    }, 480, 100, 0.62);
    headSign.position.set(0, 3.05, 0); gate.add(headSign);
  }
  setHead("0x1A0");

  const pit = new THREE.Group(); pit.position.copy(PIT);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.66, 28), new THREE.MeshBasicMaterial({ color: 0x050302 })); hole.rotation.x = -Math.PI / 2; hole.position.y = 0.03; pit.add(hole);
  const hz = new THREE.Mesh(new THREE.RingGeometry(0.66, 0.95, 28), new THREE.MeshBasicMaterial({ map: canvasTexture(256, 32, (g, w, h) => { for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "#ffd21a" : "#141008"; g.fillRect(i * w / 16, 0, w / 16, h); } }) }));
  hz.rotation.x = -Math.PI / 2; hz.position.y = 0.035; pit.add(hz);
  const nullSign = labelSprite((g, w, h) => {
    g.fillStyle = "#141008"; g.fillRect(0, 0, w, h); g.strokeStyle = "#d7261e"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
    g.fillStyle = "#ff5a48"; g.font = `bold 66px ${MONO}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("NULL", w / 2, h * 0.4);
    g.fillStyle = "#cfc6cc"; g.font = `bold 34px ${MONO}`; g.fillText("(address 0)", w / 2, h * 0.78);
  }, 280, 150, 0.8);
  nullSign.position.set(0, 1.35, 0); pit.add(nullSign);
  const pitGlow = new THREE.PointLight(0xff2a10, 0, 6, 1.5); pitGlow.position.set(0, 0.6, 0); pit.add(pitGlow);
  scene.add(pit);

  // ---------- light: a high hard sun from behind the palace (shadows fall towards the camera, short),
  // a warm sky fill so the plaza is bright and every label reads
  const sun = new THREE.DirectionalLight(0xfff0cf, 2.1); sun.position.set(-10, 34, -16); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 90 }); sun.shadow.bias = -0.0004;
  sun.target.position.set(4, 0, 0); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xfff3d0, 0xd8a85a, 0.95); scene.add(hemi);
  const front = new THREE.DirectionalLight(0xffe6c0, 0.6); front.position.set(6, 18, 30); scene.add(front);   // so the side of the pigs facing us is not in shadow

  // sunset (0 = noon, 1 = the sun is down behind the palace): sky, light and the sun machine sink together.
  // Labels are sprites that ignore light, so every plaque stays readable at dusk.
  const L0 = { sun: new THREE.Color(0xfff0cf), hs: new THREE.Color(0xfff3d0), hg: new THREE.Color(0xd8a85a), fog: new THREE.Color(0xffe8a8), disc: new THREE.Color(0xfff1a0) };
  const L1 = { sun: new THREE.Color(0xff7a2a), hs: new THREE.Color(0xff9a5a), hg: new THREE.Color(0x5a1e2a), fog: new THREE.Color(0xc8502a), disc: new THREE.Color(0xff5a1a) };
  const machineY = machine.position.y;
  let dusk = 0;
  function setDusk(k) {
    k = Math.max(0, Math.min(1, k)); if (Math.abs(k - dusk) < 1e-4 && k !== 0) return; dusk = k;
    paintSky(k)(skyCanvas.getContext("2d"), 16, 512); scene.background.needsUpdate = true;
    sun.color.copy(L0.sun).lerp(L1.sun, k); sun.intensity = 2.1 - 0.9 * k; sun.position.set(-10 - 14 * k, 34 - 22 * k, -16);
    hemi.color.copy(L0.hs).lerp(L1.hs, k); hemi.groundColor.copy(L0.hg).lerp(L1.hg, k); hemi.intensity = 0.95 - 0.25 * k;
    scene.fog.color.copy(L0.fog).lerp(L1.fog, k);
    disc.material.color.copy(L0.disc).lerp(L1.disc, k);
    machine.position.y = machineY - 9 * k * k;
  }

  // ---------- the banquet table at the foot of the steps (only laid for the banquet): marble, cream cloth, gold
  const feast = new THREE.Group(); feast.position.set(2, 0, -6.2); feast.visible = false; scene.add(feast);
  {
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c230, metalness: 0.65, roughness: 0.32 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0xf4ead2, roughness: 0.9 });
    const wine = new THREE.MeshStandardMaterial({ color: 0x5a0e14, roughness: 0.3 });
    const grape = new THREE.MeshStandardMaterial({ color: 0x3a1a4a, roughness: 0.5 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(13, 0.2, 1.7), marble); top.position.y = 1.05; top.castShadow = top.receiveShadow = true; feast.add(top);
    const runner = new THREE.Mesh(new THREE.BoxGeometry(13.2, 0.04, 0.9), cloth); runner.position.y = 1.17; feast.add(runner);
    for (const x of [-5.6, -1.9, 1.9, 5.6]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.95, 1.1), shade); leg.position.set(x, 0.48, 0); leg.castShadow = true; feast.add(leg); }
    for (let i = 0; i < 7; i++) {                                  // seven places: five for the crew, two for the house
      const x = -5.4 + i * 1.8;
      const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.04, 20), gold); plate.position.set(x, 1.21, 0.42); feast.add(plate);
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.3, 12), gold); cup.position.set(x + 0.42, 1.34, 0.3); cup.castShadow = true; feast.add(cup);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.02, 12), wine); w.position.set(x + 0.42, 1.47, 0.3); feast.add(w);
    }
    for (const x of [-3.6, 0, 3.6]) {                              // bowls of grapes and a tall jug between the places
      const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), gold); bowl.position.set(x, 1.52, -0.25); feast.add(bowl);
      for (let k = 0; k < 9; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), grape); b.position.set(x + Math.cos(k * 2.4) * 0.17 * (k % 3 ? 1 : 0.4), 1.55 + (k % 3) * 0.05, -0.25 + Math.sin(k * 2.4) * 0.17 * (k % 3 ? 1 : 0.4)); feast.add(b); }
      const jug = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.16, 0.02], [0.2, 0.25], [0.12, 0.5], [0.09, 0.62], [0.12, 0.66]].map(([r, y]) => new THREE.Vector2(r, y)), 16), gold);
      jug.position.set(x + 0.9, 1.19, -0.35); jug.castShadow = true; feast.add(jug);
    }
  }
  const banquet = on => { feast.visible = !!on; setRation(on ? "banquet" : "noon"); };

  // how closely the island is watching (0 = asleep at noon, 1 = the banquet): lamps and lions follow it
  let tension = 0, lionLift = 0;
  const setTension = k => { tension = Math.max(0, Math.min(1, k)); };
  const ruins = buildRuins(scene, { TZ, TH, machine, PX0, PX1, PZ0, PZ1 });
  world.add({ update: (dt, t) => {
    ruins.update(dt, t);
    ring.rotation.z = t * 0.06;
    lamps.forEach((l, i) => l.material.color.setHex(((i + Math.floor(t * (2 + 7 * tension))) % 6 === 0) ? 0xff8a70 : BLOOD));   // the lamps run faster as Circe pays attention
    flames.forEach((f, i) => { const s = 1 + Math.sin(t * 11 + i * 2) * 0.12; f.scale.set(s, 1 + Math.sin(t * 7 + i) * 0.2, s); });
    lionLift += (tension - lionLift) * Math.min(1, dt * 1.5);
    lions.forEach((l, i) => l.userData.head.rotation.z = -0.32 * lionLift + Math.sin(t * 0.9 + i * 2) * 0.06);   // the heads breathe; they lift as the trials go on
  } });
  return { gate, pit, pitGlow, circe, lions, machine, setHead, setDusk, get dusk() { return dusk; }, doorAt: new THREE.Vector3(2, TH, TZ + 2.2),
    banquet, setRation, setTension, feastAt: feast.position, rationAt: new THREE.Vector3(PX0 - 4.5, 3.2, -3.5) };
}
