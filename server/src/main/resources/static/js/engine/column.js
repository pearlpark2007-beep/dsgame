// column.js — a Greek Doric column built in code: a fluted shaft that swells slightly
// in the middle (entasis), a cushion-shaped capital and a square slab on top.
// broken = 0..1 cuts the shaft at that height with a jagged top.
import * as THREE from "three";

export function doricColumn({ height = 7.5, radius = 0.62, flutes = 20, broken = 0, material }) {
  const g = new THREE.Group();
  const capH = 0.55;
  const shaftH = broken ? height * broken : height - capH;
  const radial = flutes * 6, rows = Math.max(8, Math.round(shaftH * 5));
  const geo = new THREE.CylinderGeometry(1, 1, shaftH, radial, rows, !!broken);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + shaftH / 2) / height;                       // 0 at base .. 1 at the very top
    const taper = radius * (1 - 0.2 * t + 0.035 * Math.sin(Math.PI * t));   // narrows upward, swells a little
    const a = Math.atan2(v.z, v.x);
    const flute = 1 - 0.055 * Math.pow(Math.abs(Math.cos(a * flutes / 2)), 0.6);  // the concave grooves
    let r = Math.hypot(v.x, v.z) > 0.001 ? taper * flute : 0;
    let y = v.y;
    if (broken && v.y > shaftH / 2 - 0.001) {                  // a jagged, weathered break
      y -= Math.abs(Math.sin(a * 3.1) * 0.25 + Math.sin(a * 7.7) * 0.12) + Math.random() * 0.05;
      if (r === 0) y = shaftH / 2 - 0.2;
    }
    pos.setXYZ(i, Math.cos(a) * r, y, Math.sin(a) * r);
  }
  geo.computeVertexNormals();
  const shaft = new THREE.Mesh(geo, material);
  shaft.position.y = shaftH / 2;
  g.add(shaft);

  if (!broken) {
    const topR = radius * 0.8;
    const pts = [new THREE.Vector2(topR, 0), new THREE.Vector2(topR * 1.02, 0.06), new THREE.Vector2(topR * 1.0, 0.1)];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(topR + (radius * 1.25 - topR) * Math.sin(t * Math.PI / 2), 0.1 + t * 0.22)); }
    const echinus = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), material);
    echinus.position.y = shaftH;
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.6, 0.24, radius * 2.6), material);
    abacus.position.y = shaftH + 0.32 + 0.12;
    g.add(echinus, abacus);
  }
  // a low stepped base block (stylobate piece)
  const base = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.9, 0.3, radius * 2.9), material);
  base.position.y = -0.12;
  g.add(base);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.userData.height = broken ? shaftH : height;
  return g;
}

// A single loose column drum lying on its side.
export function columnDrum({ radius = 0.6, length = 1.0, flutes = 20, material }) {
  const geo = new THREE.CylinderGeometry(1, 1, length, flutes * 6, 2);
  const pos = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z) > 0.001 ? radius * (1 - 0.055 * Math.pow(Math.abs(Math.cos(a * flutes / 2)), 0.6)) : 0;
    pos.setXYZ(i, Math.cos(a) * r, v.y, Math.sin(a) * r);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}
