// sail.js — a ship's square sail let down for the voyage, for the films: it can fill (1), go slack (0),
// and fill from the other side (-1). The same sail as the Troy film's shot 9 (the screenplay's repeated image).
import * as THREE from "three";

export function buildSail() {
  const geo = new THREE.PlaneGeometry(11, 7.2, 16, 10); geo.rotateY(Math.PI / 2);          // spans the ship's z (beam), faces along its x
  const base = geo.attributes.position.array.slice();
  const mat = new THREE.MeshStandardMaterial({ color: 0xcdbb98, roughness: 0.95, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  const sail = { mesh: m, fill: 1, flutter: 0, t: 0 };
  sail.update = dt => {
    sail.t += dt; const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = base[i * 3 + 2], y = base[i * 3 + 1];
      const u = z / 5.5, v = (y + 3.6) / 7.2;
      const belly = (1 - u * u) * Math.sin(Math.PI * Math.min(1, v * 1.05)) * 1.9;
      const flap = Math.sin(sail.t * 9 + u * 4 + v * 3) * 0.35 * sail.flutter * (1 - v * 0.5);
      p.setX(i, base[i * 3] + belly * sail.fill + flap);
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  sail.dispose = () => { geo.dispose(); mat.dispose(); };
  return sail;
}
