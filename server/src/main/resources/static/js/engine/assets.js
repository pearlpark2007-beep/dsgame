// assets.js — loads .glb models once and hands out copies.
// Used by every island, so a model is only downloaded one time.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export const manager = new THREE.LoadingManager();
const draco = new DRACOLoader(manager).setDecoderPath("./vendor/three/examples/jsm/libs/draco/gltf/");
const loader = new GLTFLoader(manager).setDRACOLoader(draco);
const cache = new Map();

// Load several models at once: await loadModels({ crate: "assets/harbour/crate.glb", ... })
export async function loadModels(map) {
  const entries = await Promise.all(Object.entries(map).map(async ([key, url]) => {
    if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
    const gltf = await cache.get(url);
    return [key, gltf.scene];
  }));
  return Object.fromEntries(entries);
}

// Keep only the most detailed version (LOD0) of scanned rocks and cliffs.
export function keepBestLod(root) {
  const drop = [];
  root.traverse(o => { if (/LOD[1-9]$/.test(o.name)) drop.push(o); });
  drop.forEach(o => o.parent.remove(o));
  return root;
}

// A copy of a model that can be moved, scaled and shadowed independently.
export function copyOf(model, { castShadow = true, receiveShadow = true } = {}) {
  const c = model.clone(true);
  c.traverse(o => { if (o.isMesh) { o.castShadow = castShadow; o.receiveShadow = receiveShadow; } });
  return c;
}

// Moves a model so its base sits at y = 0 and its centre is at x = 0, z = 0.
export function centreOnGround(model) {
  const box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  const holder = new THREE.Group();
  model.position.sub(new THREE.Vector3(c.x, box.min.y, c.z));
  holder.add(model);
  return holder;
}

// One merged geometry + material from a model (for InstancedMesh: thousands of copies, one draw call).
export function firstMeshParts(model) {
  let mesh = null;
  model.traverse(o => { if (!mesh && o.isMesh) mesh = o; });
  return mesh;
}
