// harbourScene.js — builds the Laestrygonian Harbour: a storm-dark harbour of giants,
// closed in by cliffs, with cargo towers stacked hundreds of metres into the clouds.
//
// Layout (metres):   sea level y = 0,  quay top y = 1.4
//   +z  ── the camera side (land)
//   -z  ── out across the harbour to the narrow mouth (~ z = -520)
//   the gameplay piles stand near the quay edge around x = 0, z = -1.5
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { loadModels, keepBestLod, copyOf, centreOnGround } from "../../engine/assets.js";
import { stoneTexture, marbleTexture } from "../../engine/textures.js";
import { doricColumn, columnDrum } from "../../engine/column.js";
import { StormSky, Lightning } from "../../engine/sky.js";
import { Sea } from "../../engine/sea.js";
import { Rain, Fire } from "../../engine/weather.js";
import { buildTrireme } from "./trireme.js";
import { crateFaceTexture } from "./dsProps.js";
import { surf, flag, birds, cliffFires, giantess } from "./details.js";

export const QUAY_TOP = 1.4;
const QUAY_EDGE_Z = -4;                          // seaward edge of the quay
const rand = (a, b) => a + Math.random() * (b - a);

export async function buildHarbour(world) {
  const { scene } = world;
  const models = await loadModels({
    crate: "assets/harbour/crate.glb", pier: "assets/harbour/pier.glb", cliff: "assets/harbour/cliff.glb",
    rocks: "assets/harbour/rocks.glb", columns: "assets/harbour/columns.glb", statue: "assets/harbour/statue.glb",
    amphora: "assets/harbour/amphora.glb", barrels: "assets/harbour/barrels.glb", lantern: "assets/harbour/lantern.glb",
    bucket: "assets/harbour/bucket.glb"
  });
  keepBestLod(models.cliff);
  keepBestLod(models.rocks);

  // ---------- atmosphere
  scene.fog = new THREE.FogExp2(0x343f47, 0.0032);
  const sky = world.add(new StormSky(world, { glowDir: new THREE.Vector3(-0.15, 0.06, -1) }));
  const lightning = world.add(new Lightning(world, sky, { area: [[-260, 260], [-650, -180]] }));
  world.add(new Sea(world, { sunDir: new THREE.Vector3(-0.15, 0.25, -1) }));
  world.add(new Rain(world));
    useSkyAsReflections(world, sky);

  // ---------- light
  scene.add(new THREE.HemisphereLight(0x8a9cad, 0x2a231d, 1.7));
  const key = new THREE.DirectionalLight(0xb9c8d6, 1.9);       // cold storm light, from high on the left
  key.position.set(-45, 80, 55);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  Object.assign(key.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 10, far: 260 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.04;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xff9d5c, 1.4);       // the dying sunset behind the storm: outlines everything
  rim.position.set(-20, 25, -120);
  scene.add(rim);
  const shadowSize = q => { key.shadow.mapSize.setScalar(q === "high" ? 2048 : 1024); key.shadow.map?.dispose(); key.shadow.map = null; };
  shadowSize(world.quality);
  world.add({ onQuality: shadowSize });

  // ---------- the quay
  buildQuay(scene);

  // ---------- wooden pier running out into the water
  const pier = copyOf(models.pier);
  pier.position.set(13.5, QUAY_TOP - 2.67, -10.8);
  scene.add(pier);

  // ---------- Odysseus' ship, moored beside the pier, bow to the sea
  const ship = buildTrireme();
  ship.rotation.y = Math.PI / 2;
  ship.position.set(20.5, -1.0, -17);
  scene.add(ship);
  const farShip = buildTrireme({ length: 30 });
  farShip.rotation.y = 2.2;
  farShip.position.set(-48, -1.0, -95);
  scene.add(farShip);
  world.add({ update: (dt, t) => {
    for (const s of [ship, farShip]) { s.rotation.z = Math.sin(t * 0.6 + s.userData.sway) * 0.012; s.position.y = -1.0 + Math.sin(t * 0.8 + s.userData.sway) * 0.08; }
  } });

  // ---------- cliffs on both sides, narrowing to the harbour mouth
  const cliffMat = darken(models.cliff, 0.9);
  const cliffs = [
    // x, z, rotationY, scaleX, scaleY, scaleZ
    [-62, -60, Math.PI / 2 + 0.06, 2.4, 7.5, 3.5], [-58, -300, Math.PI / 2 - 0.08, 3.0, 9.5, 4], [-44, -540, Math.PI / 2 - 0.4, 2.2, 8, 3.5],
    [62, -70, -Math.PI / 2 - 0.05, 2.4, 8, 3.5], [56, -310, -Math.PI / 2 + 0.07, 3.0, 10, 4], [46, -545, -Math.PI / 2 + 0.38, 2.2, 8.5, 3.5],
    [-120, -20, Math.PI / 2, 3, 12, 4], [125, -30, -Math.PI / 2, 3, 12, 4],                  // taller ridges behind
    [0, 85, Math.PI, 3.2, 8, 4], [-110, 70, Math.PI * 0.75, 2.5, 9, 4], [110, 70, -Math.PI * 0.75, 2.5, 9, 4]
  ];
  for (const [x, z, ry, sx, sy, sz] of cliffs) {
    const c = centreOnGround(copyOf(models.cliff, { castShadow: false }));
    c.position.set(x, -3, z);
    c.rotation.y = ry;
    c.scale.set(sx, sy, sz);
    scene.add(c);
  }
  if (cliffMat) cliffMat.needsUpdate = true;

  // ---------- rocks at the waterline
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const r = centreOnGround(copyOf(models.rocks, { castShadow: false }));
    const z = rand(-520, -30);
    r.position.set(side * (rand(38, 52) - Math.max(0, (-z - 380) * 0.08)), -0.6, z);
    r.rotation.y = rand(0, 6.28);
    r.scale.setScalar(rand(3, 8));
    scene.add(r);
  }
  for (const [x, z, s] of [[-17, -6.5, 1.6], [-23, -5.6, 1.2], [26, -6, 1.3], [-4, -6.2, 0.9]]) {        // near the quay
    const r = centreOnGround(copyOf(models.rocks));
    r.position.set(x, -0.5, z); r.rotation.y = rand(0, 6.28); r.scale.setScalar(s);
    scene.add(r);
  }

  // ---------- the giants' cargo towers (stacks of colossal crates)
  const towers = buildTowers(scene, models);

  // ---------- a colossal, broken goddess on a rock in the harbour
  const statue = centreOnGround(copyOf(models.statue));
  statue.traverse(o => {
    if (o.isMesh) o.material = new THREE.MeshStandardMaterial({ color: 0x8c877d, normalMap: o.material.normalMap, roughness: 0.82 });
  });
  statue.scale.setScalar(0.0135);
  statue.position.set(-30, 4.5, -70);
  statue.rotation.y = 0.55;
  scene.add(statue);
  const island = centreOnGround(copyOf(models.rocks));
  island.scale.set(7, 5, 7);
  island.position.set(-30, -1.2, -70);
  scene.add(island);

  // ---------- ruined colonnade along the left of the quay
  buildColonnade(scene);

  // ---------- braziers, lanterns and props
  const braziers = [[-6.5, -2.6], [6.5, -2.6], [13.5, -21.5]];
  braziers.forEach(([x, z], i) => {
    const y = i === 2 ? QUAY_TOP + 0.0 : QUAY_TOP;
    scene.add(brazier(x, y, z));
    world.add(new Fire(world, new THREE.Vector3(x, y + 1.25, z), { size: 1, light: true }));
  });
  placeLanterns(world, models.lantern);
  placeProps(scene, models);
  ropes(scene, ship);

  // ---------- living details
  surf(world);
  flag(world, new THREE.Vector3(11.9, QUAY_TOP + 2.45, -15), { rotationY: Math.PI });
  flag(world, new THREE.Vector3(15.1, QUAY_TOP + 2.45, -8), { rotationY: Math.PI });
  flag(world, new THREE.Vector3(20.5, 12.4, -18.5), { w: 2.4, h: 1.0, rotationY: Math.PI * 0.9 });
  birds(world, towers.towers.map(([x, z, n]) => new THREE.Vector3(x, n * towers.crateHeight * 16 - 10, z)));
  cliffFires(world, [[-60, 72, -250], [-52, 70, -420], [58, 76, -230], [50, 74, -380], [-118, 110, -40]]);
  const queen = giantess(world, models.statue, lightning);

  return { sky, lightning, ship, towers, key, models, queen };
}

// Lights the scene's shiny surfaces (wet stone, bronze) with reflections of the storm sky.
function useSkyAsReflections(world, sky) {
  const pm = new THREE.PMREMGenerator(world.renderer);
  const envScene = new THREE.Scene();
  const dome = sky.mesh.clone();
  dome.position.set(0, 0, 0);
  envScene.add(dome);
  sky.uniforms.time.value = 3;
  world.scene.environment = pm.fromScene(envScene, 0.02).texture;
  world.scene.environmentIntensity = 0.55;
  pm.dispose();
}

function darken(model, k) {
  let mat = null;
  model.traverse(o => { if (o.isMesh) { mat = o.material; o.material.color.multiplyScalar(k); o.material.roughness = 0.95; } });
  return mat;
}

// The quay: hundreds of individual stone blocks (one InstancedMesh), each a slightly different shade.
function buildQuay(scene) {
  const stone = stoneTexture({ seed: 11, repeat: 1 });
  const mat = new THREE.MeshStandardMaterial({ ...stone, roughness: 1, envMapIntensity: 1.2 });
  const top = new RoundedBoxGeometry(1.98, 0.5, 1.23, 2, 0.06);
  const face = new RoundedBoxGeometry(1.78, 0.68, 1.0, 2, 0.07);
  const blocks = [];
  // top surface, rows across z, staggered like real paving
  for (let row = 0, z = QUAY_EDGE_Z + 0.62; z < 46; row++, z += 1.25) {
    const off = row % 2 ? 1 : 0;
    for (let x = -46 + off; x < 46; x += 2.0) blocks.push({ g: "top", x, y: QUAY_TOP - 0.25 + rand(-0.02, 0.02), z, ry: rand(-0.008, 0.008) });
  }
  // the sea wall, three courses down into the water
  for (let c = 0; c < 4; c++) {
    const y = QUAY_TOP - 0.5 - 0.35 - c * 0.7;
    for (let x = -46 + (c % 2) * 0.9; x < 46; x += 1.8) blocks.push({ g: "face", x, y, z: QUAY_EDGE_Z + 0.5 + rand(-0.06, 0.04), ry: rand(-0.02, 0.02) });
  }
  const make = (geo, list) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
    list.forEach((b, i) => {
      q.setFromEuler(new THREE.Euler(rand(-0.006, 0.006), b.ry, rand(-0.006, 0.006)));
      m.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(1, 1, 1));
      im.setMatrixAt(i, m);
      const v = rand(0.72, 1.08);
      im.setColorAt(i, col.setRGB(v, v * rand(0.97, 1.02), v * rand(0.95, 1.0)));
    });
    im.castShadow = true; im.receiveShadow = true;
    scene.add(im);
  };
  make(top, blocks.filter(b => b.g === "top"));
  make(face, blocks.filter(b => b.g === "face"));
  // solid core under the blocks so there are no gaps to see through
  const core = new THREE.Mesh(new THREE.BoxGeometry(92, 5, 50), new THREE.MeshStandardMaterial({ color: 0x1b1c1c, roughness: 1 }));
  core.position.set(0, QUAY_TOP - 0.5 - 2.5, QUAY_EDGE_Z + 25.6);
  scene.add(core);
  // stone mooring posts along the edge
  const postGeo = new THREE.CylinderGeometry(0.22, 0.3, 0.75, 14);
  const postMat = new THREE.MeshStandardMaterial({ ...stoneTexture({ seed: 4, size: 256 }), roughness: 0.9 });
  for (let x = -42; x <= 42; x += 7) {
    if (Math.abs(x) < 4) continue;
    const p = new THREE.Mesh(postGeo, postMat);
    p.position.set(x + 0.5, QUAY_TOP + 0.37, QUAY_EDGE_Z + 0.45);
    p.castShadow = true; p.receiveShadow = true;
    scene.add(p);
  }
  // stone steps down into the sea
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(new RoundedBoxGeometry(3.2, 0.32, 0.8, 2, 0.05), mat);
    s.position.set(-24, QUAY_TOP - 0.16 - i * 0.32, QUAY_EDGE_Z - 0.4 - i * 0.6);
    s.castShadow = true; s.receiveShadow = true;
    scene.add(s);
  }
}

function buildTowers(scene, models) {
  // merge the crate's parts into one geometry so thousands of copies cost one draw call
  const geos = [];
  let material = null;
  models.crate.updateMatrixWorld(true);
  models.crate.traverse(o => { if (o.isMesh) { geos.push(o.geometry.clone().applyMatrix4(o.matrixWorld)); material = o.material; } });
  const crateGeo = mergeGeometries(geos);
  crateGeo.computeBoundingBox();
  const h = crateGeo.boundingBox.max.y - crateGeo.boundingBox.min.y;
  const giantMat = material.clone();
  giantMat.color = new THREE.Color(0xa59c92);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.6, roughness: 0.35, emissive: 0xd9a530, emissiveIntensity: 1.6 });

  const towers = [[-26, -150, 24], [22, -215, 31], [-6, -330, 36], [44, -120, 17], [-50, -270, 27], [8, -420, 30]];
  const S = 16;                              // a giant crate is 16× a normal one (~19 m wide)
  const count = towers.reduce((a, t) => a + t[2], 0);
  const im = new THREE.InstancedMesh(crateGeo, giantMat, count);
  const tops = new THREE.InstancedMesh(crateGeo, goldMat, towers.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion();
  let k = 0;
  towers.forEach(([x, z, n], t) => {
    let lean = 0;
    for (let i = 0; i < n; i++) {
      lean += rand(-0.25, 0.25);
      const yaw = rand(-0.06, 0.06) + (i % 2) * 0.03;
      q.setFromEuler(new THREE.Euler(0, yaw + t, 0));
      const p = new THREE.Vector3(x + lean + rand(-0.5, 0.5), -2 + i * h * S, z + rand(-0.5, 0.5));
      m.compose(p, q, new THREE.Vector3(S, S, S));
      if (i === n - 1) tops.setMatrixAt(t, m); else im.setMatrixAt(k++, m);
    }
  });
  im.count = k;
  scene.add(im, tops);
  // rocky footings where the towers stand in the water
  towers.forEach(([x, z]) => {
    const r = centreOnGround(copyOf(models.rocks, { castShadow: false }));
    r.scale.set(14, 4, 14); r.position.set(x, -1.5, z); r.rotation.y = rand(0, 6);
    scene.add(r);
  });
  return { towers, crateHeight: h };
}

function buildColonnade(scene) {
  const marble = marbleTexture({ seed: 21 });
  const mat = new THREE.MeshStandardMaterial({ ...marble, roughness: 0.7 });
  // a ruined portico on the left of the quay, and a second row on the right behind the ship
  const spots = [[-12, 3.5, 0], [-16.5, 3.5, 0.55], [-21, 3.5, 0], [-25.5, 3.5, 0.3], [-30, 3.5, 0], [-34.5, 3.5, 0.7],
                 [-12, 9.5, 0], [-21, 9.5, 0.45], [-30, 9.5, 0], [-39, 9.5, 0.6], [16, 7, 0], [22, 7, 0.5], [28, 7, 0]];
  for (const [x, z, broken] of spots) {
    const c = doricColumn({ height: 8.2, radius: 0.66, broken, material: mat });
    c.position.set(x, QUAY_TOP + 0.15, z);
    c.rotation.y = rand(0, 0.4);
    scene.add(c);
  }
  // fallen architrave beams resting across standing columns
  const beam = new THREE.Mesh(new THREE.BoxGeometry(9.6, 1.0, 1.4), mat);
  beam.position.set(-16.5 + 0.0, QUAY_TOP + 0.15 + 8.2 + 0.5, 3.5);
  beam.castShadow = beam.receiveShadow = true;
  const beam2 = beam.clone(); beam2.position.set(-12, QUAY_TOP + 0.15 + 8.2 + 0.5, 6.5); beam2.rotation.y = Math.PI / 2; beam2.scale.x = 0.66;
  scene.add(beam, beam2);
  // fallen drums scattered on the quay
  for (const [x, z, r, len] of [[-15, 0.4, 0.2, 1.1], [-28.5, 0.8, 1.1, 0.9], [-34.5, 5.6, 0.6, 1.2], [-19, 6.8, 0.4, 1.0], [-20.4, 6.9, 0.45, 1.0], [24.5, 4.2, 1.4, 1.0]]) {
    const d = columnDrum({ radius: 0.6, length: len, material: mat });
    d.rotation.set(Math.PI / 2, 0, r);
    d.position.set(x, QUAY_TOP + 0.6, z);
    scene.add(d);
  }
}

// A bronze fire bowl on three legs.
function brazier(x, y, z) {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: 0x6e5130, metalness: 0.9, roughness: 0.38 });
  const bowlPts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; bowlPts.push(new THREE.Vector2(0.12 + Math.sin(t * Math.PI / 2) * 0.48, t * 0.32)); }
  bowlPts.push(new THREE.Vector2(0.64, 0.34), new THREE.Vector2(0.58, 0.36));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPts, 28), bronze);
  bowl.position.y = 1.0;
  g.add(bowl);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 1.1, 8), bronze);
    leg.position.set(Math.cos(a) * 0.32, 0.52, Math.sin(a) * 0.32);
    leg.rotation.set(Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32);
    g.add(leg);
  }
  const coals = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0xff6a20, toneMapped: false }));
  coals.rotation.x = -Math.PI / 2; coals.position.y = 1.28;
  g.add(coals);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.position.set(x, y, z);
  return g;
}

function placeLanterns(world, lanternModel) {
  const glow = new THREE.MeshStandardMaterial({ color: 0xffb060, emissive: 0xff9a40, emissiveIntensity: 3, transparent: true, opacity: 0.9 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x3b2c20, roughness: 0.9 });
  const spots = [[11.9, -8], [15.1, -8], [11.9, -15], [15.1, -15], [-11, -3.2], [11, -3.2]];
  spots.forEach(([x, z], i) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 8), postMat);
    post.position.set(x, QUAY_TOP + 1.3, z);
    post.castShadow = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.07), postMat);
    arm.position.set(x + 0.28, QUAY_TOP + 2.55, z);
    const l = copyOf(lanternModel);
    l.traverse(o => { if (o.isMesh && /glass/i.test(o.material.name)) o.material = glow; });
    l.scale.setScalar(1.3);
    l.position.set(x + 0.52, QUAY_TOP + 1.82, z);
    world.scene.add(post, arm, l);
    if (i >= 4) {
      const pl = new THREE.PointLight(0xffa050, 6, 9, 1.8);
      pl.position.set(x + 0.52, QUAY_TOP + 2.1, z);
      world.scene.add(pl);
      const seed = Math.random() * 9;
      world.add({ update: (dt, t) => pl.intensity = 6 * (0.9 + 0.1 * Math.sin(t * 9 + seed)) });
    }
  });
}

function placeProps(scene, models) {
  const put = (model, x, z, { s = 1, ry = rand(0, 6.28), y = QUAY_TOP } = {}) => {
    const c = centreOnGround(copyOf(model)); c.scale.setScalar(s); c.position.set(x, y, z); c.rotation.y = ry; scene.add(c); return c;
  };
  // barrels and broken staves
  put(models.barrels, -9, 2.5, { s: 1 });
  put(models.barrels, 9.5, 4, { s: 1, ry: 2 });
  put(models.barrels, 17, -1.5, { s: 0.9 });
  // stacks of old chests (the same crate as the trial, scattered, with no numbers)
  for (const [x, z, r, lvl] of [[-8.2, -0.5, 0.3, 0], [-8.1, -0.45, 0.25, 1], [8.6, 1.2, -0.4, 0], [10.3, 1.0, 0.1, 0], [9.4, 1.05, -0.2, 1], [-36, 2, 0.8, 0]]) {
    const c = centreOnGround(copyOf(models.crate));
    c.scale.setScalar(1.5);
    c.position.set(x, QUAY_TOP + lvl * 0.7, z);
    c.rotation.y = r;
    scene.add(c);
  }
  // amphorae: clusters of real black-figure jars
  for (const [cx, cz] of [[4.5, 3.2], [-4.8, 4.5], [18.5, 2]]) {
    for (let i = 0; i < 6; i++) {
      const a = put(models.amphora, cx + rand(-0.9, 0.9), cz + rand(-0.7, 0.7), { s: 1.7 });
      a.traverse(o => { if (o.isMesh) { o.material.metalness = 0; o.material.roughness = 0.55; } });
      if (Math.random() < 0.3) a.rotation.z = 1.4;       // a few lying on their side
    }
  }
  for (const [x, z] of [[-5.5, 1.5], [6, -0.4], [12.5, 2.6]]) put(models.bucket, x, z, { s: 1.1 });
  // a coil of rope
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 8, 24), new THREE.MeshStandardMaterial({ color: 0x6b5a3e, roughness: 1 }));
  coil.rotation.x = Math.PI / 2; coil.position.set(3.2, QUAY_TOP + 0.09, 0.6);
  coil.castShadow = true;
  scene.add(coil);
}

// Mooring ropes from the quay posts to the ship: a sagging curve (catenary).
function ropes(scene, ship) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a4a33, roughness: 1 });
  const pairs = [[new THREE.Vector3(14.5, QUAY_TOP + 0.6, -6), new THREE.Vector3(18.6, 2.0, -8)],
                 [new THREE.Vector3(15, QUAY_TOP + 0.6, -20), new THREE.Vector3(18.6, 1.9, -25)],
                 [new THREE.Vector3(21.5, QUAY_TOP + 0.75, QUAY_EDGE_Z + 0.45), new THREE.Vector3(20.5, 2.6, -1.5)]];
  for (const [a, b] of pairs) {
    const pts = [];
    for (let i = 0; i <= 20; i++) { const t = i / 20; const p = a.clone().lerp(b, t); p.y -= Math.sin(Math.PI * t) * 0.9; pts.push(p); }
    const r = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 6), mat);
    r.castShadow = true;
    scene.add(r);
  }
}

// ---------- the trial's crates: a chest with its number and index painted on the front
export function makeStackCrate(crateModel, value, index, address = "") {
  const gold = value === 99;
  const crate = centreOnGround(copyOf(crateModel));
  crate.scale.setScalar(1.5);
  const box = new THREE.Box3().setFromObject(crate);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshStandardMaterial({
    map: crateFaceTexture(value, index, address), transparent: true, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -2 }));
  label.position.set(0, (box.max.y - box.min.y) * 0.5, box.max.z + 0.005);
  crate.add(label);
  crate.userData = { value, index, height: box.max.y - box.min.y };
  if (gold) crate.traverse(o => {
    if (o.isMesh && o !== label) {
      o.material = o.material.clone();
      Object.assign(o.material, { metalness: 0.8, roughness: 0.3, emissiveIntensity: 0.25 });
      o.material.color = new THREE.Color(0xf0c75e);
      o.material.emissive = new THREE.Color(0x6a4a10);
    }
  });
  return crate;
}

// The prize: a golden amphora (the real black-figure jar, cast in gold) with a soft glow.
export function goldenAmphora(amphoraModel) {
  const a = centreOnGround(copyOf(amphoraModel));
  a.traverse(o => {
    if (!o.isMesh) return;
    const src = o.material;
    o.material = new THREE.MeshStandardMaterial({ color: 0xe6bb55, metalness: 1, roughness: 0.28, normalMap: src.normalMap,
      emissive: 0x8a5f12, emissiveMap: src.map, emissiveIntensity: 0.7 });
  });
  a.scale.setScalar(1.9);
  const glow = new THREE.PointLight(0xffc870, 3, 5, 2);
  glow.position.y = 0.6;
  a.add(glow);
  return a;
}
