// caveScene.js — builds the Cave of Polyphemus around the ten pens.
// Everything in here is giant-sized: the cave is a hall of rock 16 m high, the milk pails are as tall
// as a man, and the door is one boulder that twenty-two wagons could not shift (Odyssey, book 9).
//
// Layout (metres):  the pens run along x = 0 … 16.2 at z = 0, their wall at z ≈ -1
//   +z  the camera side;  the fire is front-left (x -5);  the boulder door is in the left wall (x ≈ -21)
//   Polyphemus stands at the back right, by his cheese racks and pails (x ≈ 25, z ≈ -11)
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { loadModels, keepBestLod, copyOf, centreOnGround } from "../../engine/assets.js";
import { stoneTexture, plankTexture } from "../../engine/textures.js";
import { Fire } from "../../engine/weather.js";
import { lightCave } from "./caveLights.js";
import { buildRock } from "./caveRock.js";

// the hall: a squashed dome, centre and radii
export const HALL = { x: 7, z: -3, rx: 34, ry: 16, rz: 23 };
export const FIRE_AT = new THREE.Vector3(-5, 0, 5);
export const DOOR_AT = new THREE.Vector3(-21.5, 0, -6);       // the middle of the doorway, on the floor
export const GIANT_AT = new THREE.Vector3(25, 0, -11);
export const STAKE_AT = new THREE.Vector3(-1.5, 0, 8.5);

// height of the roof above a point on the floor
export function roofAt(x, z) {
  const u = (x - HALL.x) / HALL.rx, v = (z - HALL.z) / HALL.rz;
  return HALL.ry * Math.sqrt(Math.max(0, 1 - u * u - v * v));
}

// smooth 3D noise from a few sines: cheap, and enough to make rock lumpy
const lump = (x, y, z) => Math.sin(x * 0.31 + Math.sin(z * 0.23)) * Math.cos(y * 0.37 + x * 0.11) * 0.6
  + Math.sin(z * 0.71 + y * 0.43) * Math.cos(x * 0.67) * 0.3 + Math.sin(x * 1.7 + y * 1.3 + z * 1.9) * 0.1;

const rand = (s => () => (s = (s * 9301 + 49297) % 233280) / 233280)(42);
const between = (a, b) => a + rand() * (b - a);

export async function buildCave(world) {
  const { scene } = world;
  const models = await loadModels({
    rocks: "assets/harbour/rocks.glb", bucket: "assets/harbour/bucket.glb", barrels: "assets/harbour/barrels.glb"
  });
  keepBestLod(models.rocks);

  // ---------- atmosphere: smoky dark, warm near the fire

  // ---------- the hall: one lumpy dome of rock, seen from inside
  const stone = stoneTexture({ seed: 21, base: [128, 114, 98], dark: [52, 44, 38], moss: [70, 72, 56], repeat: 6 });
  const rockMat = new THREE.MeshStandardMaterial({ ...stone, roughness: 1, side: THREE.BackSide, normalScale: new THREE.Vector2(0.7, 0.7) });
  const dome = new THREE.SphereGeometry(1, 96, 48, 0, Math.PI * 2, 0, Math.PI * 0.56);
  const p = dome.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const wx = v.x * HALL.rx, wy = v.y * HALL.ry, wz = v.z * HALL.rz;
    const k = 1 + lump(wx, wy, wz) * 0.09 + lump(wx * 3.1, wy * 3.1, wz * 3.1) * 0.025;
    p.setXYZ(i, wx * k, wy * k, wz * k);
  }
  dome.computeVertexNormals();
  // cut the mouth of the passage out of the back wall (the dome is drawn from inside, so nothing shows through)
  const domeCut = (() => {
    const g = dome.toNonIndexed(), pa = g.attributes.position, keep = [];
    const mouth = new THREE.Vector3(2 - HALL.x, 3.2 + 1.2, -26 - HALL.z);
    for (let i = 0; i < pa.count; i += 3) {
      let cx = 0, cy = 0, cz = 0; for (let j = 0; j < 3; j++) { cx += pa.getX(i + j) / 3; cy += pa.getY(i + j) / 3; cz += pa.getZ(i + j) / 3; }
      const inTunnel = Math.hypot((cx - mouth.x) / 1.2, cy - mouth.y, (cz - mouth.z) * 0.5) <= 3.4;
      // and the doorway: the hole behind the arch of sky (the rock lip round the arch hides the cut edge)
      const wx = cx + HALL.x, wy = cy - 1.2, wz = cz + HALL.z;
      const inDoor = wx < DOOR_AT.x + 1.5 && Math.abs(wz - DOOR_AT.z) < 4.0 && wy < 10.5;
      if (!inTunnel && !inDoor) keep.push(i);
    }
    const out = new THREE.BufferGeometry();
    for (const name of Object.keys(g.attributes)) {
      const src = g.attributes[name], arr = new Float32Array(keep.length * 3 * src.itemSize);
      keep.forEach((i, n) => { for (let j = 0; j < 3; j++) for (let c = 0; c < src.itemSize; c++) arr[(n * 3 + j) * src.itemSize + c] = src.array[(i + j) * src.itemSize + c]; });
      out.setAttribute(name, new THREE.BufferAttribute(arr, src.itemSize));
    }
    return out;
  })();
  const hall = new THREE.Mesh(domeCut, rockMat);
  hall.position.set(HALL.x, -1.2, HALL.z); hall.receiveShadow = true;
  scene.add(hall);

  // ---------- the floor: packed earth and rock, trodden flat in front of the pens
  const earth = stoneTexture({ seed: 8, base: [104, 88, 70], dark: [48, 40, 32], moss: [84, 74, 52], repeat: 10 });
  const fl = new THREE.PlaneGeometry(90, 70, 90, 70);
  const fp = fl.attributes.position;
  for (let i = 0; i < fp.count; i++) {
    const x = fp.getX(i), y = fp.getY(i);
    // dead flat over the whole pen strip (world x -2.5 to 19, z -1 to 4: the plates, the straw, the hoof path),
    // rougher further out. (The old flat spot was centred at world x 15 and buried the plates of pens 0 and 1.)
    const pz = -y + HALL.z, dxs = Math.max(0, Math.abs(x + HALL.x - 8.1) - 10.5) / 7, dzs = Math.max(0, Math.abs(pz - 1.5) - 2.5) / 6;
    const flat = Math.min(1, Math.hypot(dxs, dzs));
    // the pool (caveLights POOL_AT, world -8, -12) sits in a hollow
    const wx = x + HALL.x, wz = HALL.z - y, dp = Math.hypot((wx + 8) / 1.3, wz + 12);
    const hollow = THREE.MathUtils.smoothstep(dp, 4.2, 6.5);
    fp.setZ(i, (lump(x, 0, y) * 0.35 + 0.15) * flat * flat * hollow - (1 - hollow) * 0.25);
  }
  fl.computeVertexNormals();
  const floor = new THREE.Mesh(fl, new THREE.MeshStandardMaterial({ ...earth, roughness: 1, normalScale: new THREE.Vector2(0.25, 0.25) }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(HALL.x, -0.02, HALL.z); floor.receiveShadow = true;
  scene.add(floor);

  // the real shape of the cave: masses of layered rock, overhangs, ledges, columns, a passage (caveRock.js)
  const rockSet = buildRock(world);
  // a torch burning far down the passage: there is more cave beyond this one
  world.add(new Fire(world, rockSet.passageEnd.clone(), { size: 0.5, light: false, embers: false }));
  const deep = new THREE.PointLight(0xff7a30, 14, 18, 1.5); deep.position.copy(rockSet.passageEnd).add(new THREE.Vector3(0, 1, 2)); scene.add(deep);

  // stalactites hanging from the roof, and a few stalagmites
  const drip = new THREE.MeshStandardMaterial({ color: 0x4a423a, roughness: 0.9 });
  const tites = [];
  for (let k = 0; k < 70; k++) {
    const x = between(HALL.x - HALL.rx * 0.8, HALL.x + HALL.rx * 0.8), z = between(HALL.z - HALL.rz * 0.8, HALL.z + HALL.rz * 0.6);
    const top = roofAt(x, z) - 1.4; if (top < 6) continue;
    const len = between(0.8, 3.2), g = new THREE.ConeGeometry(between(0.15, 0.45), len, 6, 1);
    g.rotateX(Math.PI); g.translate(x, top - len / 2, z); tites.push(g);
  }
  for (let k = 0; k < 16; k++) {
    const x = between(-14, 34), z = between(-20, -6); if (x > 18 && x < 31 && z > -15) continue;
    const len = between(0.5, 1.8), g = new THREE.ConeGeometry(between(0.2, 0.5), len, 6, 1);
    g.translate(x, len / 2, z); tites.push(g);
  }
  scene.add(new THREE.Mesh(mergeGeometries(tites), drip));

  // ---------- the doorway and its boulder
  const door = buildDoor(scene);

  // ---------- the fire: a ring of stones, burning logs
  const fire = world.add(new Fire(world, FIRE_AT.clone().add(new THREE.Vector3(0, 0.15, 0)), { size: 1.25 }));
  fire.light.castShadow = true; fire.light.shadow.mapSize.set(1024, 1024); fire.light.shadow.bias = -0.004;
  const ringStone = new THREE.MeshStandardMaterial({ color: 0x3a332c, roughness: 1 });
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), ringStone);
    s.position.set(FIRE_AT.x + Math.cos(a) * 1.05, 0.15, FIRE_AT.z + Math.sin(a) * 1.05); s.rotation.set(rand() * 3, rand() * 3, 0); s.scale.y = 0.7;
    s.castShadow = true; scene.add(s);
  }
  const charred = new THREE.MeshStandardMaterial({ color: 0x1c130d, roughness: 1, emissive: 0x6a1c04, emissiveIntensity: 0.6 });
  for (const [a, tilt] of [[0.3, 0.35], [1.9, 0.3], [3.6, 0.4], [5.0, 0.32]]) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.5, 7), charred);
    log.position.set(FIRE_AT.x + Math.cos(a) * 0.35, 0.3, FIRE_AT.z + Math.sin(a) * 0.35);
    log.rotation.set(0, -a, Math.PI / 2 - tilt); log.rotation.order = "YXZ"; scene.add(log);
  }
  // a giant's woodpile beside the fire
  const bark = new THREE.MeshStandardMaterial({ ...plankTexture({ seed: 9, base: [52, 38, 26], light: [88, 66, 44], boards: 3 }), roughness: 1 });
  for (let k = 0; k < 7; k++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 5.5, 9), bark);
    log.rotation.set(0, 0.6, Math.PI / 2); log.position.set(-10 + (k % 4) * 0.4, 0.36 + Math.floor(k / 4) * 0.62, 9 + (k % 4) * 0.6 + Math.floor(k / 4) * 0.3);
    log.castShadow = log.receiveShadow = true; scene.add(log);
  }

  // ---------- the olive stake (Odysseus cuts it from the giant's club; it lies half hidden in the straw)
  const stake = buildStake();
  stake.position.copy(STAKE_AT).add(new THREE.Vector3(0, 0.2, 0)); stake.rotation.y = 0.3;
  scene.add(stake);

  // straw across the floor in front of the pens
  const straw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.015, 0.03), new THREE.MeshStandardMaterial({ color: 0x9a8550, roughness: 1 }), 900);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let k = 0; k < 900; k++) {
    const x = between(-2, 18.5), z = rand() < 0.45 ? between(-0.8, 0.45) : between(2.0, 4.2) + (rand() < 0.3 ? between(0, 4) : 0);   // not on the number plates
    q.setFromEuler(e.set(0, rand() * 6.28, (rand() - 0.5) * 0.3));
    m.compose(new THREE.Vector3(x, 0.03, z), q, new THREE.Vector3(1, 1, 1)); straw.setMatrixAt(k, m);
  }
  straw.receiveShadow = true; scene.add(straw);

  // ---------- the giant's dairy: racks of cheeses, pails and bowls of whey
  buildDairy(scene, models);

  // ---------- light: five zones, each lit by something in the cave (caveLights.js)
  const lights = lightCave(world, hall, rockSet.mesh);
  const setFires = lights.setFires;
  lights.setFires = k => { setFires(k); fire.level = k; };
  return { hall, floor, fire, door, stake, lights, rock: rockSet };
}

// The doorway: an arch of daylight in the left wall, and the boulder that shuts it.
// door.set(k): 0 = shut (only thin cracks of light), 1 = rolled aside.
function buildDoor(scene) {
  const g = new THREE.Group(); g.position.copy(DOOR_AT); g.rotation.y = Math.PI / 2; scene.add(g);   // faces +x, into the hall
  // the hole: an arch of light set into the wall (daylight outside; at night it is moonlit grey-blue)
  const shape = new THREE.Shape();
  shape.moveTo(-3.8, 0); shape.lineTo(-3.7, 6); shape.quadraticCurveTo(0, 12.5, 3.7, 6); shape.lineTo(3.8, 0); shape.lineTo(-3.8, 0);
  const skyMat = new THREE.MeshBasicMaterial({ color: 0x9fb4d0, toneMapped: false, fog: false });
  const sky = new THREE.Mesh(new THREE.ShapeGeometry(shape), skyMat); sky.position.z = -1.6; g.add(sky);
  // the rock lip round the hole
  const lipMat = new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 1 });
  const lip = new THREE.Mesh(new THREE.TorusGeometry(4.3, 1.1, 8, 20, Math.PI), lipMat);
  lip.position.set(0, 4.2, -1.2); lip.scale.set(1.05, 1.55, 1); g.add(lip);
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), lipMat);
    post.position.set(sx * 4.4, 1.6, -1.1); post.scale.set(0.8, 2.2, 0.9); g.add(post);
  }
  // the boulder: a lumpy, flat-backed stone wheel, a little bigger than the hole
  const geo = new THREE.IcosahedronGeometry(4.6, 4);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + lump(v.x * 2, v.y * 2, v.z * 2) * 0.1; p.setXYZ(i, v.x * k, v.y * k, v.z * k * 0.42); }
  geo.computeVertexNormals();
  const st = stoneTexture({ seed: 5, base: [96, 90, 82], dark: [34, 30, 28], repeat: 2 });
  const boulder = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ ...st, roughness: 1 }));
  boulder.castShadow = boulder.receiveShadow = true; g.add(boulder);
  // when shut, a thin rim of moonlight shows round the edge of the boulder
  const rimMat = new THREE.MeshBasicMaterial({ color: 0x34445a, toneMapped: false, fog: false, transparent: true });
  const rim = new THREE.Mesh(new THREE.CircleGeometry(5.7, 40), rimMat); rim.position.set(0, 4.4, -0.55); g.add(rim);
  // the light that spills through: strong when open, a thin cold glow when shut
  // (set well back outside, so anything standing in the doorway falls inside its cone and throws a shadow in)
  const spill = new THREE.SpotLight(0xbcd0ec, 0, 70, 0.5, 0.7, 1.2);
  spill.position.set(0, 5.5, -9); spill.target.position.set(0, 0, 14); g.add(spill, spill.target);
  const door = {
    group: g, boulder, sky, spill, open: 0,
    set(k) {
      this.open = k;
      // rolls along the wall (local -x is toward the back of the hall) and turns as it rolls
      boulder.position.set(-k * 9.4, 4.4, 0.4);
      boulder.rotation.z = k * 9.4 / 4.6;
      spill.intensity = (30 + k * 900) * (this.power ?? 1);
      skyMat.color.copy(k > 0 ? (this.skyColor || new THREE.Color(0xdfe8f2)) : new THREE.Color(0x9fb4d0)).multiplyScalar(k > 0 ? 1 + 1.6 * k : 1);   // open sky is far brighter than anything inside
      rim.position.x = boulder.position.x; rimMat.opacity = Math.max(0, 1 - k * 4);
    }
  };
  door.set(0);
  return door;
}

// The stake: a fathom of green olive wood, sharpened to a point and hardened in the fire.
function buildStake() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ ...plankTexture({ seed: 4, base: [86, 72, 48], light: [128, 108, 74], boards: 2 }), roughness: 0.9 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 5.2, 9), wood);
  shaft.rotation.z = Math.PI / 2; g.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.8, 9), new THREE.MeshStandardMaterial({ color: 0x1e1510, roughness: 0.8 }));
  tip.rotation.z = -Math.PI / 2; tip.position.x = 3.0; g.add(tip);
  g.userData.tip = tip;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Racks along the back-right wall with wheels of cheese, and pails taller than a man
function buildDairy(scene, models) {
  const wood = new THREE.MeshStandardMaterial({ ...plankTexture({ seed: 12, base: [60, 44, 30], light: [104, 80, 56], boards: 6 }), roughness: 1 });
  const cheese = new THREE.MeshStandardMaterial({ color: 0xbfa060, roughness: 0.8 });
  const rind = new THREE.MeshStandardMaterial({ color: 0x8a6a34, roughness: 0.9 });
  for (const [x0, z0, ry] of [[21, -16.5, -0.15], [31, -14.5, -0.6]]) {
    const rack = new THREE.Group(); rack.position.set(x0, 0, z0); rack.rotation.y = ry; scene.add(rack);
    for (const sx of [-3.6, 3.6]) for (const sz of [-0.8, 0.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 6.4, 0.3), wood); post.position.set(sx, 3.2, sz); rack.add(post);
    }
    for (let lv = 0; lv < 3; lv++) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.18, 1.9), wood); shelf.position.y = 1.2 + lv * 2; shelf.receiveShadow = true; rack.add(shelf);
      for (let k = 0; k < 5; k++) {
        if (rand() < 0.2) continue;
        const r = between(0.55, 0.75), h = between(0.45, 0.6);
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), rand() < 0.5 ? cheese : rind);
        wheel.position.set(-3 + k * 1.5, 1.29 + lv * 2 + h / 2, between(-0.2, 0.2)); wheel.castShadow = true; rack.add(wheel);
      }
    }
  }
  // the pails (giant-sized buckets) and two barrels of whey
  for (const [x, z, s] of [[16.5, -9, 2.2], [19, -7.5, 2.6], [29, -7, 2.4], [33, -9.5, 2.0]]) {
    const b = centreOnGround(copyOf(models.bucket)); b.scale.setScalar(s); b.position.set(x, 0, z); b.rotation.y = rand() * 6; scene.add(b);
  }
  const bar = centreOnGround(copyOf(models.barrels)); bar.scale.setScalar(2.2); bar.position.set(35, 0, -3); bar.rotation.y = -1; scene.add(bar);
  // wicker crates where the young are kept apart (stacked low, by the right wall)
  const wicker = new THREE.MeshStandardMaterial({ color: 0x7a6440, roughness: 1 });
  for (const [x, z, y] of [[36, 2, 0], [36.4, 4.2, 0], [36.1, 3.1, 1.4]]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 2), wicker); c.position.set(x, 0.7 + y, z); c.castShadow = c.receiveShadow = true; scene.add(c);
  }
}

// A soft shaft of moonlight: an open cone, brightest at the top, faded at the edges
export function moonBeam(from, to, radius) {
  const len = from.distanceTo(to);
  const geo = new THREE.CylinderGeometry(radius * 0.25, radius, len, 32, 1, true);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color(0x8fa6c8) } },
    vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ vY = -position.y; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; varying float vY; varying vec3 vN; varying vec3 vV;
      void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float fall = clamp(1.0 - vY / ${len.toFixed(2)}, 0.0, 1.0);
        gl_FragColor = vec4(color * edge * (0.05 + 0.13 * fall), 1.0); }`
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.copy(from);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
  return m;
}
