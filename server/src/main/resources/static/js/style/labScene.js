// labScene.js — one small harbour moment, built entirely from blocks, to test the new look.
import * as THREE from "three";
import { Blocks, pixelLabel } from "./blocks.js";

const R = (a, b) => a + Math.random() * (b - a);
const PAL = {
  stone: 0x8d7f6c, stoneDark: 0x5e5246, wood: 0x7a4a2a, woodDark: 0x4a2c18, band: 0x2b1d14, gold: 0xe0a92e,
  marble: 0xe9e1d2, vein: 0xd9a33a, cloak: 0xa3221a, ochre: 0xb4622e, ochreDark: 0x7a3a1e, rust: 0x8e3b22,
  sea: 0x123642, seaLight: 0x2f6470, foam: 0xe7dcc4, sky: 0xf0a24a
};

export function buildLab(scene) {
  const updaters = [];
  scene.fog = new THREE.Fog(0x8a5a48, 50, 300);

  // ---------- sky: a quantised sunset with a huge low sun and hard-edged clouds
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { time: { value: 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float time; varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
      void main(){
        float y = max(vD.y, 0.0);
        float band = floor(pow(y, 0.6) * 9.0) / 9.0;                      // stepped colour bands
        vec3 col = mix(vec3(1.5, 0.78, 0.36), vec3(0.06, 0.07, 0.17), pow(band, 0.7));
        vec3 sunDir = normalize(vec3(0.25, 0.09, -1.0));
        float s = dot(vD, sunDir);
        col = mix(col, vec3(2.4, 1.5, 0.7), step(0.9985, s));              // the sun disc
        col += vec3(1.0, 0.45, 0.15) * pow(max(s, 0.0), 30.0) * 0.6;
        vec2 uv = vD.xz / (vD.y + 0.15);
        float c = n(uv * vec2(1.2, 3.0) + vec2(time * 0.01, 0.0)) * 0.7 + n(uv * 4.0) * 0.3;
        float cloud = step(0.62, c) * smoothstep(0.02, 0.2, vD.y);
        col = mix(col, mix(vec3(0.12, 0.08, 0.16), vec3(0.6, 0.22, 0.12), smoothstep(0.35, 0.0, vD.y)) + vec3(0.9, 0.4, 0.12) * step(0.7, c) * 0.35 * smoothstep(0.3, 0.0, vD.y), cloud * 0.9);
        gl_FragColor = vec4(col, 1.0);
      }`
  }));
  scene.add(sky);

  // ---------- light: low golden sun, long hard shadows
  scene.add(new THREE.HemisphereLight(0x6a7488, 0x3a2416, 1.2));    // cool sky fill = blue-ish shadows
  const sun = new THREE.DirectionalLight(0xffb870, 2.8);
  sun.position.set(18, 14, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xd8c6b0, 1.1);   // cool fill from the land side so faces read
  fill.position.set(-14, 6, 16);
  scene.add(fill);

  // ---------- quay of chunky stone slabs
  const quay = new Blocks({ jitter: 0.1 });
  for (let x = -16; x < 16; x += 1) for (let z = -3; z < 10; z += 1) {
    const h = 0.5 + (Math.random() < 0.08 ? R(-0.08, 0.06) : 0);
    quay.put(x + 0.5, 1.0 - 0.5 + (h - 0.5), z + 0.5, 0.97, h, 0.97, Math.random() < 0.15 ? PAL.stoneDark : PAL.stone);
  }
  for (let x = -16; x < 16; x += 2) for (let c = 0; c < 3; c++) quay.put(x + 1 + (c % 2) * 0.5, -1.2 + c * 0.75, -3.2, 1.96, 0.72, 0.6, c === 0 ? 0x3b3027 : PAL.stoneDark);
  quay.put(0, -2, 3, 32, 2.5, 12.5, 0x3a3029);
  // bollards
  for (let x = -14; x <= 14; x += 4) if (Math.abs(x) > 2) { quay.put(x, 1, -2.6, 0.45, 0.6, 0.45, PAL.stoneDark); quay.put(x, 1.6, -2.6, 0.6, 0.12, 0.6, PAL.stoneDark); }
  quay.build(scene);

  // ---------- the voxel sea: a grid of blocks that rise and fall
  const N = 70, M = 50, seaGeo = new THREE.BoxGeometry(1, 1, 1);
  const sea = new THREE.InstancedMesh(seaGeo, new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1, flatShading: true }), N * M);
  sea.receiveShadow = true;
  const seaCol = new THREE.Color(), seaM = new THREE.Matrix4();
  scene.add(sea);
  const farSea = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ color: PAL.sea, roughness: 0.4 }));
  farSea.rotation.x = -Math.PI / 2; farSea.position.y = -0.35;
  scene.add(farSea);
  updaters.push(t => {
    let i = 0;
    for (let a = 0; a < N; a++) for (let b = 0; b < M; b++) {
      const x = a - N / 2 + 0.5, z = -3.5 - b;
      const hgt = Math.round((Math.sin(x * 0.35 + t * 1.3) * 0.5 + Math.sin(z * 0.5 - t * 1.7 + x * 0.1) * 0.4 + Math.sin((x + z) * 0.9 + t * 2.3) * 0.15) * 3) / 3 * 0.4;
      seaM.makeScale(1, 1.2, 1).setPosition(x, hgt - 0.6, z);
      sea.setMatrixAt(i, seaM);
      const crest = hgt > 0.25 ? 1 : 0, nearWall = b === 0 && Math.sin(x * 1.3 + t * 3) > 0.2;
      sea.setColorAt(i, seaCol.set(nearWall ? PAL.foam : crest ? PAL.seaLight : PAL.sea));
      i++;
    }
    sea.instanceMatrix.needsUpdate = true; sea.instanceColor.needsUpdate = true;
  });

  // ---------- ochre cliffs made of stacked boulders, closing the harbour on both sides
  const cliffs = new Blocks({ jitter: 0.18, roughness: 1 });
  for (const side of [-1, 1]) for (let z = -10; z > -260; z -= R(6, 12)) {
    const base = 26 + (-z) * 0.06 - (side > 0 ? 2 : 0);
    let y = -2, x = side * (base + R(-3, 3));
    const levels = Math.floor(R(5, 12) + (-z) * 0.02);
    for (let k = 0; k < levels; k++) {
      const w = R(6, 14), h = R(4, 9);
      cliffs.put(x + side * R(-1, 4), y, z + R(-3, 3), w, h, R(7, 13), k % 3 === 2 ? PAL.ochreDark : k % 2 ? PAL.rust : PAL.ochre, R(-0.2, 0.2));
      y += h * 0.92; x += side * R(-0.5, 2.5);
    }
  }
  cliffs.build(scene, { castShadow: false });

  // ---------- giant cargo towers: stacked block crates, gold on top
  const towers = new Blocks({ jitter: 0.12 }), towerTops = new Blocks({ emissive: true });
  for (const [x, z, n] of [[-12, -90, 14], [9, -125, 19], [-2, -190, 24], [22, -80, 10], [-24, -150, 17]]) {
    let lean = 0;
    for (let i = 0; i < n; i++) {
      lean += R(-0.4, 0.4);
      const y = -1 + i * 4.2, ry = R(-0.08, 0.08);
      if (i === n - 1) { towerTops.put(x + lean, y, z, 9, 4, 5, 0xffc23a, ry); continue; }
      towers.put(x + lean, y, z, 9, 4, 5, i % 2 ? PAL.wood : PAL.woodDark, ry);
      towers.put(x + lean, y + 0.3, z, 9.2, 0.35, 5.2, PAL.band, ry);
      towers.put(x + lean, y + 3.4, z, 9.2, 0.35, 5.2, PAL.band, ry);
    }
  }
  towers.build(scene, { castShadow: false }); towerTops.build(scene, { castShadow: false });

  // ---------- the trial's crate piles, numbered with their index
  const crates = new Blocks({ jitter: 0.05 });
  const labels = [];
  const pile = (x, values) => values.forEach((v, i) => {
    const y = 1 + i * 0.86, gold = v === 99;
    crates.put(x, y, -1.4, 1.5, 0.82, 0.95, gold ? PAL.gold : PAL.wood);
    crates.put(x, y + 0.04, -1.4, 1.56, 0.12, 1.0, gold ? 0x9b6a16 : PAL.band);
    crates.put(x, y + 0.66, -1.4, 1.56, 0.12, 1.0, gold ? 0x9b6a16 : PAL.band);
    for (const sx of [-0.72, 0.72]) crates.put(x + sx, y, -1.4, 0.12, 0.82, 1.0, gold ? 0x9b6a16 : PAL.band);
    const lab = pixelLabel(String(v), 0.34, { fg: gold ? "#2a1606" : "#f3e2b8" });
    lab.position.set(x, y + 0.45, -1.4 + 0.505); labels.push(lab); scene.add(lab);
    const idx = pixelLabel("[" + i + "]", 0.13, { fg: gold ? "#3a2208" : "#d9c39a" });
    idx.position.set(x + 0.55, y + 0.2, -1.4 + 0.505); scene.add(idx);
  });
  pile(-2.6, [4, 7, 99]); pile(0, [3]);
  crates.build(scene);
  // pile name plates painted on the ground
  for (const [x, n] of [[-2.6, "S"], [0, "T"], [2.6, "U"]]) {
    const p = pixelLabel(n, 0.4, { fg: "#e8c766" }); p.rotation.x = -Math.PI / 2; p.position.set(x, 1.01, -0.5); scene.add(p);
  }

  // ---------- golden amphora: chunky low-poly lathe, 8 sides
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.1 + Math.sin(t * Math.PI) * 0.22 + (t > 0.85 ? 0.06 : 0), t * 0.7)); }
  const amph = new THREE.Mesh(new THREE.LatheGeometry(pts, 8), new THREE.MeshStandardMaterial({ color: 0xffc23a, metalness: 0.9, roughness: 0.25, flatShading: true, emissive: 0x6b3a05, emissiveIntensity: 0.6 }));
  amph.position.set(-2.6, 1 + 3 * 0.86, -1.4); amph.castShadow = true;
  scene.add(amph);

  // ---------- ODYSSEUS: a blocky marble hero with gold veins, a red cloak and a sailor's felt cap
  const hero = new THREE.Group();
  const hb = new Blocks({ jitter: 0.03, roughness: 0.55 });
  hb.put(-0.2, 0, 0, 0.36, 0.9, 0.38, PAL.marble); hb.put(0.2, 0, 0, 0.36, 0.9, 0.38, PAL.marble);       // legs
  hb.put(-0.2, 0, 0.04, 0.4, 0.14, 0.46, 0x6b4a2a); hb.put(0.2, 0, 0.04, 0.4, 0.14, 0.46, 0x6b4a2a);     // sandals
  hb.put(0, 0.9, 0, 0.84, 0.95, 0.46, PAL.marble);                                                        // torso
  hb.put(0, 0.9, 0, 0.88, 0.22, 0.5, 0x8a5a2a);                                                          // belt
  hb.put(-0.58, 1.0, 0, 0.3, 0.85, 0.32, PAL.marble); hb.put(0.58, 1.0, 0, 0.3, 0.85, 0.32, PAL.marble); // arms
  hb.put(0, 1.86, 0, 0.62, 0.62, 0.6, PAL.marble);                                                        // head
  hb.put(0, 1.84, 0.27, 0.58, 0.3, 0.12, 0xcfc6b5);                                                       // beard
  hb.put(-0.13, 2.2, 0.31, 0.1, 0.08, 0.02, 0x2a1d14); hb.put(0.13, 2.2, 0.31, 0.1, 0.08, 0.02, 0x2a1d14); // eyes
  hb.put(0, 2.47, 0, 0.66, 0.16, 0.64, 0x5d4a35); hb.put(0, 2.63, 0, 0.46, 0.16, 0.44, 0x5d4a35); hb.put(0, 2.79, 0, 0.24, 0.12, 0.22, 0x5d4a35); // pilos cap
  hb.put(0, 0.75, -0.27, 0.8, 1.15, 0.06, PAL.cloak); hb.put(0, 1.78, -0.2, 0.9, 0.12, 0.2, PAL.cloak);  // cloak
  for (const [x, y, z, w, h] of [[0.12, 1.2, 0.235, 0.05, 0.4], [-0.2, 1.4, 0.235, 0.18, 0.04], [0.58, 0.8, 0.165, 0.04, 0.3], [-0.2, 0.3, 0.195, 0.04, 0.35], [0.25, 2.05, 0.305, 0.04, 0.18]])
    hb.put(x, y, z, w, h, 0.02, PAL.vein);                                                                // gold veins in the marble
  hb.build(hero);
  hero.position.set(-5, 1, -0.6);
  hero.rotation.y = -0.2;
  scene.add(hero);
  updaters.push(t => { hero.scale.y = 1 + Math.sin(t * 2) * 0.008; });

  // ---------- broken columns: chunky 8-sided marble
  const colMat = new THREE.MeshStandardMaterial({ color: 0xe2d6c0, roughness: 0.7, flatShading: true });
  for (const [x, z, h] of [[-11, 5, 6.5], [-8, 5, 3.2], [-14.5, 5, 6.5], [11, 6, 6.5], [13.5, 6, 2.2]]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, h, 8), colMat); c.position.set(x, 1 + h / 2, z); c.castShadow = c.receiveShadow = true; scene.add(c);
    if (h > 6) { const cap = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 1.6), colMat); cap.position.set(x, 1 + h + 0.17, z); cap.castShadow = true; scene.add(cap); }
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.7, 1.4), colMat); beam.position.set(-12.75, 1 + 6.5 + 0.7, 5); beam.castShadow = true; scene.add(beam);

  // ---------- braziers with block fire
  const fireCubes = [];
  for (const [x, z] of [[-6.5, -2.2], [6.5, -2.2]]) {
    const b = new Blocks({ metalness: 0.7, roughness: 0.4 });
    b.put(x, 1, z, 0.18, 1.0, 0.18, 0x5a3b1c); b.put(x, 2.0, z, 0.9, 0.25, 0.9, 0x7a5426); b.put(x, 2.25, z, 1.0, 0.1, 1.0, 0x8a6430);
    b.build(scene);
    const light = new THREE.PointLight(0xff7a2a, 14, 12, 1.6); light.position.set(x, 3, z); scene.add(light);
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffb23a, toneMapped: false }));
      m.userData = { x, z, o: Math.random() * 2, light };
      scene.add(m); fireCubes.push(m);
    }
  }
  updaters.push(t => {
    for (const m of fireCubes) {
      const u = m.userData, k = ((t * 1.4 + u.o) % 1);
      m.position.set(u.x + Math.sin(u.o * 9 + t) * 0.18 * (1 - k), 2.35 + k * 1.3, u.z + Math.cos(u.o * 7) * 0.18 * (1 - k));
      m.scale.setScalar(0.28 * (1 - k) + 0.04);
      m.material.color.setRGB(1.6, 0.4 + 0.8 * (1 - k), 0.08 * (1 - k));
      u.light.intensity = 14 + Math.sin(t * 13 + u.x) * 2;
    }
  });

  // ---------- goofy, grounded details
  // a seagull on a bollard that only ever says NULL
  const gull = new Blocks({ jitter: 0.02 });
  gull.put(6, 1.72, -2.6, 0.22, 0.2, 0.42, 0xf1ece2); gull.put(6, 1.88, -2.43, 0.16, 0.16, 0.16, 0xf1ece2); gull.put(6, 1.9, -2.32, 0.06, 0.05, 0.14, 0xe8a21e);
  gull.put(6, 1.75, -2.7, 0.3, 0.06, 0.28, 0x9aa0a4);
  gull.build(scene);
  const bubble = pixelLabel("NULL", 0.2, { fg: "#1a1210", bg: "#f3e8cf" }); bubble.position.set(6.25, 2.35, -2.4); scene.add(bubble);
  // a sign post
  const sign = new Blocks(); sign.put(9, 1, -0.5, 0.15, 1.8, 0.15, PAL.woodDark); sign.put(9, 2.4, -0.5, 1.9, 0.6, 0.1, 0xd8c39a); sign.build(scene);
  const signText = pixelLabel("DOCK 0x2A", 0.26, { fg: "#3a1a10" }); signText.position.set(9, 2.7, -0.44); scene.add(signText);
  // a giant's sandal washed up on the quay, for scale
  const sandal = new Blocks({ jitter: 0.08 });
  sandal.put(12, 1, 2, 3.4, 0.45, 7.5, 0x6b4426, 0.3); sandal.put(12, 1.45, 2, 0.5, 1.2, 0.5, 0x4a2c18, 0.3); sandal.put(12, 1.9, 2, 3.0, 0.2, 0.5, 0x4a2c18, 0.3);
  sandal.build(scene);
  // amphorae and barrels
  const props = new Blocks({ jitter: 0.1 });
  for (let i = 0; i < 5; i++) { const x = 3.5 + R(-0.8, 0.8), z = 3 + R(-0.6, 0.6); props.put(x, 1, z, 0.4, 0.55, 0.4, 0xb4552a); props.put(x, 1.55, z, 0.18, 0.2, 0.18, 0x9a4522); }
  for (const [x, z] of [[-8.5, 1.5], [-9.3, 2.1], [-8.9, 2.9]]) { props.put(x, 1, z, 0.75, 1.0, 0.75, 0x6b4426); props.put(x, 1.2, z, 0.8, 0.08, 0.8, PAL.band); props.put(x, 1.75, z, 0.8, 0.08, 0.8, PAL.band); }
  props.build(scene);

  return { sun, hero, update: t => { sky.material.uniforms.time.value = t; updaters.forEach(u => u(t)); } };
}
