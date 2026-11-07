// trireme.js — Odysseus' ship, built in code: a Greek war galley with a bronze ram,
// painted eyes, three rows of oars, a curled stern and a furled sail.
import * as THREE from "three";
import { plankTexture } from "../../engine/textures.js";

export function buildTrireme({ length = 34, beam = 4.8, depth = 2.6 } = {}) {
  const ship = new THREE.Group();
  const planks = plankTexture({ boards: 14, base: [34, 26, 22], light: [76, 56, 40] });
  const hullMat = new THREE.MeshStandardMaterial({ ...planks, side: THREE.DoubleSide, roughness: 0.85 });
  const bandMat = new THREE.MeshStandardMaterial({ color: 0x6b1e14, roughness: 0.7 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0x8a6a35, metalness: 0.85, roughness: 0.35 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.8 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xc9b99a, roughness: 0.95 });

  // ---- hull: a grid of points swept along the length (x), curved across (y, z)
  const segL = 60, segA = 18;
  const pos = [], uv = [], idx = [];
  const sheer = u => depth + 0.9 * Math.pow(Math.abs(2 * u - 1), 3) + (u > 0.5 ? 0.6 * Math.pow((u - 0.5) * 2, 4) : 0);
  const halfW = u => (beam / 2) * Math.pow(Math.sin(Math.PI * THREE.MathUtils.clamp(u * 1.02 - 0.01, 0, 1)), 0.55);
  const keel = u => 0.15 * Math.pow(Math.abs(2 * u - 1), 2);
  for (let i = 0; i <= segL; i++) {
    const u = i / segL;
    for (let j = 0; j <= segA; j++) {
      const t = -Math.PI / 2 + Math.PI * (j / segA);
      const x = (u - 0.5) * length;
      const y = sheer(u) - (sheer(u) - keel(u)) * Math.pow(Math.cos(t), 0.7);
      const z = halfW(u) * Math.sin(t) * (0.75 + 0.25 * Math.cos(t * 0.5));
      pos.push(x, y, z); uv.push(u * 4, j / segA);
    }
  }
  for (let i = 0; i < segL; i++) for (let j = 0; j < segA; j++) {
    const a = i * (segA + 1) + j, b = a + segA + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  hullGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  hullGeo.setIndex(idx);
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, hullMat);
  ship.add(hull);

  // ---- red band along the top edge (both sides)
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 2; i <= segL - 2; i++) { const u = i / segL; pts.push(new THREE.Vector3((u - 0.5) * length, sheer(u) - 0.25, side * halfW(u) * 1.01)); }
    ship.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.16, 6), bandMat));
  }

  // ---- deck
  const deckShape = new THREE.Shape();
  for (let i = 0; i <= 40; i++) { const u = 0.04 + 0.92 * i / 40; deckShape.lineTo((u - 0.5) * length, halfW(u) * 0.9); }
  for (let i = 40; i >= 0; i--) { const u = 0.04 + 0.92 * i / 40; deckShape.lineTo((u - 0.5) * length, -halfW(u) * 0.9); }
  const deck = new THREE.Mesh(new THREE.ShapeGeometry(deckShape), new THREE.MeshStandardMaterial({ ...plankTexture({ boards: 30, seed: 9 }), roughness: 0.9 }));
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = depth - 0.15;
  ship.add(deck);

  // ---- bronze ram at the bow (+x), at the waterline
  const ram = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 4), bronze);
  ram.rotation.z = -Math.PI / 2;
  ram.rotation.x = Math.PI / 4;
  ram.position.set(length / 2 + 0.9, 0.45, 0);
  ship.add(ram);
  const ramFins = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 1.3), bronze);
  ramFins.position.set(length / 2 + 0.3, 0.45, 0);
  ship.add(ramFins);

  // ---- painted eyes on the bow
  const eyeTex = (() => {
    const c = document.createElement("canvas"); c.width = 128; c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "#e9e1cf"; g.beginPath(); g.ellipse(64, 32, 58, 26, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#1a120c"; g.beginPath(); g.arc(70, 32, 18, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#6b1e14"; g.lineWidth = 6; g.beginPath(); g.ellipse(64, 32, 58, 26, 0, 0, Math.PI * 2); g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  for (const side of [-1, 1]) {
    const u = 0.93;
    const eye = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshStandardMaterial({ map: eyeTex, transparent: true, roughness: 0.6 }));
    eye.position.set((u - 0.5) * length, sheer(u) - 0.9, side * (halfW(u) + 0.05));
    eye.rotation.y = side > 0 ? 0.35 : Math.PI - 0.35;
    ship.add(eye);
  }

  // ---- curled stern (aphlaston) at -x: a tapering curve rising and folding forward
  const sternCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-length / 2 + 0.6, depth + 0.6, 0), new THREE.Vector3(-length / 2 - 1.2, depth + 1.8, 0),
    new THREE.Vector3(-length / 2 - 1.6, depth + 3.6, 0), new THREE.Vector3(-length / 2 - 0.6, depth + 4.9, 0),
    new THREE.Vector3(-length / 2 + 0.6, depth + 4.6, 0)
  ]);
  ship.add(new THREE.Mesh(new THREE.TubeGeometry(sternCurve, 40, 0.32, 8), hullMat));
  // bow post
  const bowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(length / 2 - 0.4, depth + 0.4, 0), new THREE.Vector3(length / 2 + 0.3, depth + 1.4, 0), new THREE.Vector3(length / 2 + 0.2, depth + 2.1, 0)
  ]);
  ship.add(new THREE.Mesh(new THREE.TubeGeometry(bowCurve, 16, 0.22, 8), hullMat));

  // ---- three rows of oars, resting angled into the water (one InstancedMesh = one draw call)
  const oarGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 5).translate(0, -0.5, 0);
  const bladeGeo = new THREE.BoxGeometry(0.06, 0.9, 0.24).translate(0, -0.45, 0);
  const rows = [{ h: 0.9, len: 5.0, n: 27 }, { h: 1.45, len: 6.0, n: 29 }, { h: 2.05, len: 7.2, n: 31 }];
  let total = 0; rows.forEach(r => total += r.n * 2);
  const oars = new THREE.InstancedMesh(oarGeo, wood, total), blades = new THREE.InstancedMesh(bladeGeo, wood, total);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let k = 0;
  for (const r of rows) for (const side of [-1, 1]) for (let i = 0; i < r.n; i++) {
    const u = 0.2 + 0.6 * (i + 0.5) / r.n;
    p.set((u - 0.5) * length, r.h, side * halfW(u) * (0.9 + r.h * 0.04));
    const drop = Math.atan2(r.h + 0.2, r.len * 0.85);
    e.set(side * (Math.PI / 2 - drop), 0, (Math.random() - 0.5) * 0.06);
    q.setFromEuler(e); s.set(1, r.len, 1);
    m.compose(p, q, s); oars.setMatrixAt(k, m);
    const tip = new THREE.Vector3(0, -r.len, 0).applyQuaternion(q).add(p);
    s.set(1, 1, 1); m.compose(tip, q, s); blades.setMatrixAt(k, m);
    k++;
  }
  ship.add(oars, blades);

  // ---- mast, yard and furled sail
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 11, 10), wood);
  mast.position.set(1.5, depth + 5.5, 0);
  ship.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 13, 8), wood);
  yard.rotation.x = Math.PI / 2;
  yard.position.set(1.5, depth + 10.2, 0);
  ship.add(yard);
  const sail = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12.2, 10), sailMat);
  sail.rotation.x = Math.PI / 2;
  sail.position.set(1.5, depth + 9.75, 0.1);
  ship.add(sail);
  // rigging lines from the mast top to the bow and stern
  const ropeMat = new THREE.LineBasicMaterial({ color: 0x2a221a });
  const top = new THREE.Vector3(1.5, depth + 10.9, 0);
  for (const end of [new THREE.Vector3(length / 2 - 1, depth + 0.3, 0), new THREE.Vector3(-length / 2 + 2, depth + 0.5, 0),
                     new THREE.Vector3(1.5, depth, beam / 2), new THREE.Vector3(1.5, depth, -beam / 2),
                     new THREE.Vector3(-4.5, depth + 10.2, 0), new THREE.Vector3(7.5, depth + 10.2, 0)]) {
    ship.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([top, end]), ropeMat));
  }
  // shields hung along the rail
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0x8a6a35, metalness: 0.7, roughness: 0.4 });
  const shieldGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 18).rotateX(Math.PI / 2);
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const u = 0.28 + i * 0.055;
    const sh = new THREE.Mesh(shieldGeo, shieldMat);
    sh.position.set((u - 0.5) * length, sheer(u) + 0.2, side * (halfW(u) + 0.08));
    ship.add(sh);
  }

  ship.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  ship.userData.sway = Math.random() * 10;
  return ship;
}
