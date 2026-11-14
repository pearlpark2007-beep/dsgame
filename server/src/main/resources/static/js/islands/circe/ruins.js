// ruins.js — the island around the sty: what was here before Circe, and what holds her sun up.
//   (God of War) two colossi of Helios on the far headlands, each lifting a sun disc; a fallen
//     bronze-and-stone head of Helios, ray crown and all, half sunk in the sand by the plaza;
//     two giant chains that hold the sun machine down to iron anchors.
//   (Uncharted) the old temple broken on the east side: toppled columns, drums, a stump;
//     ivy hanging off the palace beam; timber scaffolding and a pulley hoisting a crate at the
//     machine; cargo (crates, amphorae, rope) by the plaza; the cliff edge, a blue sea, sea stacks.
// Only gold, sandstone, bronze, the blue sea and a little green. Nothing here sits on the plaza,
// so the nodes stay the clearest thing on screen.
import * as THREE from "three";

const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
function tex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// weathered stone: a base colour, speckle and a few cracks
function stoneTex(base, dark) {
  const t = tex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "255,240,210" : "60,40,20"},${0.05 + rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 5, 2 + rnd() * 5); }
    g.strokeStyle = dark; g.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) { g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - 0.5) * 50; y += rnd() * 30; g.lineTo(x, y); } g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const ivyTex = tex(64, 256, (g, w, h) => {
  for (let i = 0; i < 160; i++) {
    const y = rnd() * h, x = w / 2 + Math.sin(y * 0.05) * 8 + (rnd() - 0.5) * (14 + (h - y) * 0.06);
    g.fillStyle = ["#3f6a1e", "#557f22", "#2d5418", "#6b8f2a"][i % 4];
    g.beginPath(); g.ellipse(x, y, 5 + rnd() * 4, 3 + rnd() * 3, rnd() * 3, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = "#3a2a14"; g.lineWidth = 2; g.beginPath(); g.moveTo(w / 2, 0); for (let y = 0; y < h; y += 8) g.lineTo(w / 2 + Math.sin(y * 0.05) * 8, y); g.stroke();
});
const plankTex = tex(128, 128, (g, w, h) => {
  g.fillStyle = "#8a5a2e"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? "#7a4e26" : "#94643a"; g.fillRect(0, i * 32 + 2, w, 28); }
  g.strokeStyle = "#3a2410"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  g.beginPath(); g.moveTo(6, 6); g.lineTo(w - 6, h - 6); g.stroke();
  g.fillStyle = "#1d3fd1"; g.font = "bold 22px Anton, Impact, sans-serif"; g.textAlign = "center"; g.fillText("ΗΛΙΟΣ", w / 2, h / 2 + 30);
});

export function buildRuins(scene, { TZ, TH, machine, PX0, PX1, PZ0, PZ1 }) {
  const sandstone = new THREE.MeshStandardMaterial({ map: stoneTex("#d9b98a", "rgba(90,60,30,0.5)"), roughness: 0.95 });
  const marble = new THREE.MeshStandardMaterial({ map: stoneTex("#efe6d2", "rgba(110,90,60,0.45)"), roughness: 0.8 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x9a6a2a, metalness: 0.75, roughness: 0.35 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc81a, metalness: 0.6, roughness: 0.3, emissive: 0xb07a00, emissiveIntensity: 0.8 });   // glows a little even with the sun behind it
  const iron = new THREE.MeshStandardMaterial({ color: 0x34302c, metalness: 0.7, roughness: 0.45 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.9 });
  const rock = new THREE.MeshStandardMaterial({ color: 0xc9a26a, roughness: 1, flatShading: true });
  const add = (parent, geo, m, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
  const root = new THREE.Group(); scene.add(root);

  // ---------- the sea beyond the cliff, the cliff lip, sea stacks
  const CLIFF = -78;
  const seaTex = tex(512, 512, (g, w, h) => {
    g.fillStyle = "#1d4fd8"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${rnd() < 0.6 ? "120,190,255" : "255,240,180"},${0.15 + rnd() * 0.3})`; g.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 18, 1.5); }
  });
  seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(8, 4);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshStandardMaterial({ map: seaTex, roughness: 0.3, metalness: 0.2, emissive: 0x0a2a8a, emissiveIntensity: 0.35 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, 0.05, CLIFF - 150); root.add(sea);
  // the island's edge: a row of broken rock along the cliff, higher at the ends (headlands)
  for (let x = -130; x <= 130; x += 7) {
    const head = Math.max(0, Math.abs(x) - 30) * 0.12, s = 4 + rnd() * 3 + head;
    const r = add(root, new THREE.DodecahedronGeometry(1, 0), rock, x + rnd() * 3, Math.abs(x) < 34 ? 0 : s * 0.35, CLIFF + (rnd() - 0.5) * 3, rnd(), rnd() * 3, rnd());
    r.scale.set(s * 1.3, s * (Math.abs(x) < 34 ? 0.22 : 0.8), s);   // low in the middle: the sea shows over it
  }
  for (const [x, z, h] of [[-46, CLIFF - 40, 22], [-30, CLIFF - 70, 14], [38, CLIFF - 55, 26], [70, CLIFF - 30, 12]]) {      // sea stacks
    const st = add(root, new THREE.CylinderGeometry(h * 0.18, h * 0.32, h, 7, 3), rock, x, h / 2, z, 0, rnd() * 3, 0);
    const cap = add(root, new THREE.ConeGeometry(h * 0.2, h * 0.25, 7), new THREE.MeshStandardMaterial({ color: 0x5f7f2a, roughness: 1, flatShading: true }), x, h + h * 0.1, z);
    cap.scale.y = 0.5; st.receiveShadow = false;
  }

  // ---------- two colossi of Helios on the headlands, each holding a sun disc over his head
  function colossus(x, z, mirror) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = mirror * -0.35; root.add(g);
    add(g, new THREE.BoxGeometry(9, 4, 7), sandstone, 0, 2, 0);                                   // plinth
    add(g, new THREE.BoxGeometry(7.5, 0.8, 6), sandstone, 0, 4.4, 0);
    for (const s of [-1, 1]) {
      add(g, new THREE.CylinderGeometry(0.9, 1.2, 11, 10), bronze, s * 1.6, 10.3, 0, 0, 0, s * 0.06);        // legs
      add(g, new THREE.BoxGeometry(1.8, 0.8, 2.6), bronze, s * 1.7, 5.1, 0.4);                               // feet
    }
    add(g, new THREE.BoxGeometry(5.6, 2.6, 3), bronze, 0, 16.2, 0);                                // kilt / hips
    add(g, new THREE.CylinderGeometry(3.1, 2.4, 7.5, 12), bronze, 0, 21.3, 0);                      // chest
    add(g, new THREE.SphereGeometry(1.8, 14, 12), bronze, 0, 26.6, 0);                              // head
    const crown = new THREE.Group(); crown.position.set(0, 26.8, -0.3); g.add(crown);
    for (let i = 0; i < 11; i++) { const a = -Math.PI * 0.1 + i / 10 * Math.PI * 1.2; add(crown, new THREE.ConeGeometry(0.35, 2.6, 4), gold, Math.cos(a) * 2.4, Math.sin(a) * 2.4, 0, 0, 0, a - Math.PI / 2); }
    // the raised arm and the disc; the other arm down at the side
    const s = mirror;
    add(g, new THREE.CylinderGeometry(0.75, 0.9, 9, 8), bronze, s * 3.8, 28.2, 0, 0, 0, s * -0.32);
    add(g, new THREE.CylinderGeometry(0.75, 0.85, 8, 8), bronze, -s * 3.6, 20.2, 0, 0, 0, -s * 0.12);
    const disc = add(g, new THREE.CylinderGeometry(4.2, 4.2, 0.6, 32), gold, s * 5.4, 34.5, 0, Math.PI / 2, 0, 0);
    add(g, new THREE.TorusGeometry(4.4, 0.35, 8, 40), bronze, s * 5.4, 34.5, 0.05);
    disc.castShadow = false;
    // ivy up one leg, rubble at the foot
    const ivy = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 9), new THREE.MeshStandardMaterial({ map: ivyTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    ivy.position.set(s * 1.6, 9.5, 1.25); g.add(ivy);
    for (let i = 0; i < 6; i++) { const r = add(g, new THREE.DodecahedronGeometry(0.6 + rnd() * 0.8, 0), sandstone, (rnd() - 0.5) * 12, 0.4, 4 + rnd() * 3, rnd(), rnd(), rnd()); r.scale.y = 0.6; }
  }
  colossus(-58, CLIFF + 6, 1);
  colossus(64, CLIFF + 6, -1);

  // ---------- the fallen head of Helios, half sunk in the sand west of the plaza
  {
    const g = new THREE.Group(); g.position.set(PX0 - 15, 1.0, PZ0 - 3); g.rotation.set(-0.1, 0.55, 0.32); root.add(g);
    const face = add(g, new THREE.SphereGeometry(4, 24, 18), marble, 0, 1.6, 0); face.scale.set(0.9, 1.15, 1);
    add(g, new THREE.BoxGeometry(1.1, 2.2, 1.4), marble, 0, 1.6, 3.7, -0.25);                      // nose
    add(g, new THREE.BoxGeometry(5.6, 0.7, 1.4), marble, 0, 3.0, 3.1, 0.15);                         // brow
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 1 });
    for (const s of [-1, 1]) add(g, new THREE.SphereGeometry(0.6, 10, 8), eyeM, s * 1.4, 2.25, 3.3).scale.set(1.3, 0.55, 0.4);   // the empty eyes
    add(g, new THREE.BoxGeometry(2.0, 0.35, 0.6), eyeM, 0, -0.1, 3.55);                             // the mouth
    const crown = new THREE.Group(); crown.position.set(0, 1.6, -0.8); g.add(crown);
    for (let i = 0; i < 13; i++) {
      if (i === 3 || i === 9) continue;                                                              // two rays broken off…
      const a = i / 13 * Math.PI * 2, ray = add(crown, new THREE.ConeGeometry(0.7, 3.6, 4), gold, Math.cos(a) * 5.2, Math.sin(a) * 5.2, 0, 0, 0, a - Math.PI / 2);
      ray.scale.z = 0.35;
    }
    add(root, new THREE.ConeGeometry(0.7, 3.6, 4), gold, PX0 - 9, 0.35, PZ0 + 0.5, Math.PI / 2, 0.4, 0.2).scale.z = 0.35;   // …one lies here
    add(crown, new THREE.TorusGeometry(4.3, 0.4, 8, 40), bronze, 0, 0, 0);
    // the sand drift that buries the lower half (a flattened mound)
    const drift = add(root, new THREE.SphereGeometry(7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xe8c47a, roughness: 1 }), PX0 - 15, -0.2, PZ0 - 3);
    drift.scale.set(1.15, 0.28, 0.95);
    const ivy = new THREE.Mesh(new THREE.PlaneGeometry(2, 6), new THREE.MeshStandardMaterial({ map: ivyTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    ivy.position.set(-2.8, 2.6, 2.4); ivy.rotation.set(0, -0.6, 0.3); g.add(ivy);
  }

  // ---------- the broken temple on the east side: toppled columns, drums, a stump with its capital
  {
    const X = PX1 + 9, colGeo = new THREE.CylinderGeometry(0.75, 0.8, 1, 16);
    const lie = (x, z, len, ry) => { const c = add(root, colGeo, marble, x, 0.78, z, 0, ry, Math.PI / 2); c.scale.y = len; };
    lie(X, -6, 9, 0.35); lie(X + 4, 3, 6, -0.9);
    for (const [x, z, r] of [[X - 3, -1, 0.3], [X + 2.5, -1.5, 1.4], [X + 6.5, -3, 0.2], [X - 1.5, 6.5, 0.9]]) { const d = add(root, colGeo, marble, x, 0.6, z, Math.PI / 2, r, 0); d.scale.y = 1.2; }
    for (const [x, z, h] of [[X + 7, -9, 6.5], [X + 1, -11, 3.4], [X + 9, 2, 2.2]]) {
      const c = add(root, colGeo, marble, x, h / 2, z); c.scale.y = h;
      if (h > 6) add(root, new THREE.BoxGeometry(2.0, 0.6, 2.0), marble, x, h + 0.3, z);
      const iv = new THREE.Mesh(new THREE.PlaneGeometry(1.4, h * 0.9), new THREE.MeshStandardMaterial({ map: ivyTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide })); iv.position.set(x, h * 0.5, z + 0.82); root.add(iv);
    }
    // a fallen lintel across two drums, with a carved sun on its face
    const lintel = add(root, new THREE.BoxGeometry(6.5, 1.0, 1.4), marble, X + 1, 1.7, -10.5, 0, 0.1, 0.12);
    const carve = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), gold); carve.position.set(0, 0, 0.71); lintel.add(carve);
  }

  // ---------- ivy hanging from the palace beam and over the terrace edge
  const ivyM = new THREE.MeshStandardMaterial({ map: ivyTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
  for (const [x, len] of [[-15.5, 5.5], [-6.2, 3.2], [10.4, 4.4], [17.7, 2.6], [25.4, 6.0]]) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(1.3, len), ivyM); v.position.set(x, TH + 7.8 - len / 2, TZ + 4.1); root.add(v);
  }
  for (const [x, len] of [[-16, 2.2], [23, 2.0]]) { const v = new THREE.Mesh(new THREE.PlaneGeometry(2.4, len), ivyM); v.position.set(x, TH - len / 2 + 0.1, TZ + 4.55); root.add(v); }

  // ---------- timber scaffolding round the machine's truss, a pulley and a crate on its way up
  const M = machine.position, scaf = new THREE.Group(); scaf.position.set(M.x, 0, M.z - 0.8); root.add(scaf);
  const pole = new THREE.CylinderGeometry(0.16, 0.18, 1, 6);
  for (const sx of [-3.2, 3.2]) for (const sz of [-1.6, 1.6]) { const p = add(scaf, pole, wood, sx, 6.5, sz); p.scale.y = 13; }
  for (const y of [3, 6.5, 10]) {
    for (const sz of [-1.6, 1.6]) add(scaf, new THREE.BoxGeometry(6.8, 0.22, 0.22), wood, 0, y, sz);
    for (const sx of [-3.2, 3.2]) add(scaf, new THREE.BoxGeometry(0.22, 0.22, 3.4), wood, sx, y, 0);
    add(scaf, new THREE.BoxGeometry(6.6, 0.12, 3.0), wood, 0, y + 0.15, 0).material = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.9 });
  }
  for (const sz of [-1.6, 1.6]) { const d = add(scaf, new THREE.BoxGeometry(0.16, 8.6, 0.16), wood, 0, 6.5, sz, 0, 0, 0.84); d.scale.y = 1; }   // cross braces
  const boom = add(scaf, new THREE.BoxGeometry(5, 0.3, 0.3), wood, -5, 12.6, 0);
  const wheel = add(scaf, new THREE.TorusGeometry(0.5, 0.12, 6, 16), iron, -7.2, 12.1, 0);
  const hoist = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), new THREE.MeshStandardMaterial({ color: 0x3a2a14 })); scaf.add(hoist);
  const crate = add(scaf, new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.9 }), -7.7, 6, 0);
  boom.castShadow = wheel.castShadow = false;

  // ---------- two giant chains holding the sun machine down to iron anchors
  const linkGeo = new THREE.TorusGeometry(0.45, 0.16, 6, 12), N = 60;
  linkGeo.scale(1.35, 1, 1);                                              // oval links, long along x
  const chains = [-1, 1].map(s => {
    const anchor = new THREE.Vector3(M.x + s * 30, 0, M.z - 4);
    const block = add(root, new THREE.BoxGeometry(3, 2.2, 3), iron, anchor.x, 1.1, anchor.z);
    add(root, new THREE.TorusGeometry(0.9, 0.25, 8, 16), iron, anchor.x - s * 1.2, 2.1, anchor.z, 0, Math.PI / 2, 0);
    for (let i = 0; i < 4; i++) add(root, new THREE.BoxGeometry(0.4, 0.5, 0.4), gold, anchor.x + (i % 2 ? 1.2 : -1.2), 2.4, anchor.z + (i < 2 ? 1.2 : -1.2));   // bolt heads
    block.receiveShadow = true;
    const mesh = new THREE.InstancedMesh(linkGeo, iron, N); mesh.castShadow = true; mesh.frustumCulled = false; root.add(mesh);
    return { s, anchor: anchor.clone().setY(2.1).add(new THREE.Vector3(-s * 1.2, 0, 0)), mesh };
  });
  const tmp = new THREE.Object3D(), X1 = new THREE.Vector3(1, 0, 0);
  let lastY = null;
  function placeChains() {
    if (lastY === M.y) return; lastY = M.y;
    for (const c of chains) {
      const top = new THREE.Vector3(M.x + c.s * 7.2, M.y - 5.4, M.z), a = c.anchor;
      const mid = top.clone().lerp(a, 0.5); mid.y -= 2.2;                 // a little sag
      const curve = new THREE.QuadraticBezierCurve3(top, mid, a);
      const n = Math.min(N, Math.round(curve.getLength() / 0.95));        // one link per link-length
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n, p = curve.getPoint(k), t = curve.getTangent(k).normalize();
        tmp.position.copy(p); tmp.quaternion.setFromUnitVectors(X1, t);
        if (i % 2) tmp.rotateX(Math.PI / 2);                              // every other link turned a quarter
        tmp.updateMatrix(); c.mesh.setMatrixAt(i, tmp.matrix);
      }
      c.mesh.count = n; c.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  placeChains();

  // ---------- cargo: crates, amphorae, coiled rope at the plaza's outer corners (never on it)
  const amphoraGeo = new THREE.LatheGeometry([[0, 0], [0.18, 0.05], [0.42, 0.5], [0.5, 1.0], [0.38, 1.45], [0.16, 1.7], [0.14, 2.0], [0.24, 2.05]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  const clay = new THREE.MeshStandardMaterial({ color: 0xb5562c, roughness: 0.85 }), clayBlack = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.8 });
  const crateM = new THREE.MeshStandardMaterial({ map: plankTex, roughness: 0.9 });
  const ropeM = new THREE.MeshStandardMaterial({ color: 0xc9a26a, roughness: 1 });
  function cargo(x, z, ry) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; root.add(g);
    add(g, new THREE.BoxGeometry(1.5, 1.5, 1.5), crateM, 0, 0.75, 0);
    add(g, new THREE.BoxGeometry(1.2, 1.2, 1.2), crateM, 0.2, 2.1, 0.1, 0, 0.4, 0);
    add(g, new THREE.BoxGeometry(1.5, 1.5, 1.5), crateM, 1.7, 0.75, 0.3, 0, 0.2, 0);
    for (let i = 0; i < 4; i++) add(g, amphoraGeo, i % 2 ? clayBlack : clay, -1.3 - (i % 2) * 0.9, 0, 0.6 - Math.floor(i / 2) * 1.0, 0, rnd() * 3, 0);
    add(g, amphoraGeo, clay, 1.2, 0.35, 1.5, Math.PI / 2 - 0.2, 0.6, 0);                       // one on its side
    for (let i = 0; i < 3; i++) add(g, new THREE.TorusGeometry(0.45 - i * 0.04, 0.09, 6, 16), ropeM, 1.9, 1.6 + i * 0.16, 0.3, Math.PI / 2, 0, 0);
  }
  cargo(PX0 - 4, PZ1 + 4, 0.3);
  cargo(PX1 + 4, PZ1 + 3, -0.4);
  cargo(PX0 - 3, PZ0 - 4, 0.9);

  return {
    update(dt, t) {
      placeChains();
      seaTex.offset.x = t * 0.004; seaTex.offset.y = Math.sin(t * 0.2) * 0.01;
      const y = 6 + (Math.sin(t * 0.35) * 0.5 + 0.5) * 5;                // the crate goes up and down on the pulley
      crate.position.y = y; hoist.position.set(-7.7, (12.1 + y + 0.7) / 2, 0); hoist.scale.y = 12.1 - y - 0.7; crate.rotation.y = Math.sin(t * 0.7) * 0.2;
    },
  };
}
