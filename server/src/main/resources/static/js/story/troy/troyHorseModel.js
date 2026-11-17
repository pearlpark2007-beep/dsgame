// troyHorseModel.js — the chosen wooden horse: the licensed model (assets/troy/horse.glb,
// "Low Poly Trojan Horse" by Tyler Lazzareschi, CC-BY-4.0 — see CREDITS.md), turned to face +x, scaled to
// `height`, feet on y = 0, centred, with a belly hatch added in code (horse.userData.hatch swings on z).
// If the file is missing, the horse built in code (troyHorse.js) stands in, so the film never breaks.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { buildHorse } from "./troyHorse.js";
import { stats } from "./bake.js";

export const HORSE_URL = "assets/troy/horse.glb";

export async function loadHorse({ height = 11.4, quality = "high", url = HORSE_URL } = {}) {
  const t = performance.now();
  try {
    const res = await fetch(url);
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const gltf = await new GLTFLoader().parseAsync(buf, url.replace(/[^/]*$/, ""));
      const m = gltf.scene;
      const turn = new THREE.Group(); turn.add(m);
      let size = new THREE.Box3().setFromObject(turn).getSize(new THREE.Vector3());
      if (size.z > size.x) turn.rotation.y = Math.PI / 2;               // long axis along x
      turn.updateMatrixWorld(true); size = new THREE.Box3().setFromObject(turn).getSize(new THREE.Vector3());
      turn.scale.setScalar(height / size.y); turn.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(turn), c = b.getCenter(new THREE.Vector3());
      turn.position.set(-c.x, -b.min.y, -c.z);
      const horse = new THREE.Group(); horse.name = "horse:licensed"; horse.add(turn); horse.updateMatrixWorld(true);
      m.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
      horse.userData.height = height;
      horse.userData.facing = Math.PI;                                    // this model's nose points to −x once turned
      addHatch(horse, m, height);
      return { horse, info: { kind: "licensed", bytes: buf.byteLength, ms: performance.now() - t, ...stats(horse) } };
    }
  } catch (e) { console.warn("horse model:", e.message); }
  const horse = buildHorse({ quality });
  horse.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  horse.userData.facing = 0;
  return { horse, info: { kind: "built in code (the model file was missing)", bytes: 0, ms: performance.now() - t, ...stats(horse) } };
}

// the belly hatch: a panel cut from the model's own wood, hinged on one long side, a dark frame and a dark opening
// behind it. The belly is found by casting rays down through the middle of the body.
function addHatch(horse, model, H) {
  let mat = null; model.traverse(o => { if (o.isMesh && !mat) mat = o.material; });
  const rc = new THREE.Raycaster();
  const bellyAt = x => { rc.set(new THREE.Vector3(x, H + 5, 0), new THREE.Vector3(0, -1, 0)); const ys = rc.intersectObject(model, true).map(i => i.point.y).filter(y => y > 0.35 * H); return ys.length ? Math.min(...ys) : null; };
  const ys = [-0.8, 0, 0.8].map(bellyAt).filter(y => y != null);
  if (!ys.length) return;
  const y = Math.min(...ys), W = 2.0, D = 1.2;
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: 0x050302 }));
  hole.rotation.x = Math.PI / 2; hole.position.set(0, y - 0.03, 0); horse.add(hole);
  const hinge = new THREE.Group(); hinge.position.set(-W / 2, y - 0.1, 0); hinge.name = "hatch"; horse.add(hinge);
  const door = new THREE.Mesh(new THREE.BoxGeometry(W, 0.12, D + 0.06), mat); door.position.set(W / 2, 0, 0); door.castShadow = true; hinge.add(door);
  const seamMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 1 });
  for (const [x, z, w, d] of [[0, D / 2 + 0.06, W + 0.24, 0.12], [0, -D / 2 - 0.06, W + 0.24, 0.12], [W / 2 + 0.06, 0, 0.12, D], [-W / 2 - 0.06, 0, 0.12, D]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), seamMat); s.position.set(x, y - 0.07, z); horse.add(s);
  }
  const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.14), new THREE.MeshStandardMaterial({ color: 0x7c6034, metalness: 0.8, roughness: 0.45 }));
  bolt.position.set(W - 0.15, -0.09, 0); hinge.add(bolt);
  horse.userData.hatch = hinge;
  horse.userData.bellyY = y;
}
